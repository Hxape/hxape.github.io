#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'
require 'digest'
require 'fileutils'
require 'net/http'
require 'open3'
require 'pathname'
require 'securerandom'
require 'strscan'
require 'tempfile'
require 'timeout'

# Обзор объявлений и начального комментария; тела и значения не экспортируются.
class SourceParseError < StandardError; end

class HaxeOutline
  Token = Struct.new(:kind, :text, :line)
  TYPES = %w[class interface enum abstract typedef].freeze
  MODIFIERS = %w[public private static inline extern override dynamic macro overload final].freeze
  PAIRS = { '(' => ')', '[' => ']', '{' => '}', '<' => '>' }.freeze

  attr_reader :header

  def initialize(source)
    @header = ''
    @scanner = StringScanner.new(source.delete_prefix("\uFEFF"))
    @tokens = expand_shared_blocks(remove_conditions(tokenize))
    @index = 0
  end

  def symbols(scope = nil, closing = nil)
    result = []
    doc = ''
    modifiers = []
    conditions = []
    until current.nil? || current == closing
      if token.kind == :doc
        doc = advance.text
        next
      end
      case current
      when '#if'
        conditions << doc
        advance
      when '#else', '#elseif'
        doc = conditions.last || ''
        advance
      when '#end'
        conditions.pop
        advance
      when '@'
        skip_metadata
      else
        if current == 'abstract' && (peek == 'function' || MODIFIERS.include?(peek))
          modifiers << advance.text
          next
        elsif TYPES.include?(current)
          result << declaration(doc)
        elsif current == 'function'
          result.concat(method_symbols(doc))
        elsif %w[var final].include?(current) && identifier?(@index + 1) && !TYPES.include?(peek) && peek != 'function'
          result.concat(fields(scope, doc, modifiers))
        elsif MODIFIERS.include?(current)
          modifiers << advance.text
          next
        elsif scope == 'enum' && identifier?(@index)
          name = advance
          skip_group if current == '('
          type_shape if take(':')
          result << symbol('enum-value', name, doc)
          take(';')
        elsif scope == 'typedef' && (current == '?' || (identifier?(@index) && peek == ':'))
          result.concat(fields(scope, doc, modifiers, shorthand: true))
        elsif scope == 'typedef' && take('>')
          type_shape
          take(',')
        elsif %w[package import using].include?(current)
          skip_value([';'])
          take(';')
        elsif PAIRS.key?(current)
          skip_group
        else
          advance
        end
        doc = ''
        modifiers = []
      end
    end
    raise "Не найдено #{closing}" if closing && !take(closing)

    result
  end

  private

  def tokenize
    tokens = []
    line = 1
    leading = true
    until @scanner.eos?
      start = @scanner.pos
      whitespace = @scanner.skip(/\s+/)
      if whitespace
        # Пробелы учитываются только в номере строки.
      elsif (raw = @scanner.scan(%r{//[^\r\n]*(?:\r?\n[ \t]*//[^\r\n]*)*}))
        @header = clean_lines(raw.lines.map { |part| part.sub(%r{\A[ \t]*/{2,3} ?}, '') }) if leading
      elsif @scanner.scan(%r{/\*})
        tail = @scanner.scan_until(%r{\*/}) or raise "Незакрытый комментарий, строка #{line}"
        raw = '/*' + tail
        doc = clean_doc(raw)
        @header = doc if leading
        tokens << Token.new(:doc, doc, line) if raw.start_with?('/**')
      elsif %w[" '].include?(@scanner.peek(1))
        skip_string
        tokens << Token.new(:literal, '', line)
      elsif @scanner.peek(2) == '~/'
        skip_regexp
        tokens << Token.new(:literal, '', line)
      elsif (word = @scanner.scan(/[[:alpha:]_$][[:alnum:]_$]*/))
        tokens << Token.new(:identifier, word, line)
      elsif @scanner.scan(/(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/)
        tokens << Token.new(:literal, '', line)
      else
        value = @scanner.scan(/&&|\|\||==|!=|<=|>=|->|=>/) || @scanner.getch
        tokens << Token.new(:punctuation, value, line)
      end
      line += @scanner.string.byteslice(start...@scanner.pos).count("\n")
      leading = false unless whitespace
    end
    tokens
  end

  def skip_string
    quote = @scanner.getch
    until @scanner.eos?
      char = @scanner.getch
      return if char == quote
      if char == '\\'
        @scanner.getch
      elsif quote == "'" && char == '$' && @scanner.peek(1) == '{'
        @scanner.getch
        depth = 1
        while depth.positive? && !@scanner.eos?
          if %w[" '].include?(@scanner.peek(1))
            skip_string
          elsif @scanner.scan(%r{/\*})
            @scanner.scan_until(%r{\*/}) or raise 'Незакрытый комментарий в строке'
          elsif @scanner.scan(%r{//[^\n]*})
            next
          elsif @scanner.peek(2) == '~/'
            skip_regexp
          else
            part = @scanner.getch
            depth += 1 if part == '{'
            depth -= 1 if part == '}'
          end
        end
      end
    end
    raise 'Незакрытая строка'
  end

  def skip_regexp
    @scanner.pos += 2
    until @scanner.eos?
      char = @scanner.getch
      if char == '\\'
        @scanner.getch
      elsif char == '/'
        @scanner.skip(/[a-z]*/)
        return
      end
    end
    raise 'Незакрытое регулярное выражение'
  end

  def clean_doc(raw)
    body = raw[2...-2].to_s
    body = body.delete_prefix('*') if raw.start_with?('/**')
    body = body.delete_suffix('*') if raw.end_with?('**/')
    clean_lines(body.lines.map { |line| line.sub(/\A[ \t]*\* ?/, '') })
  end

  def clean_lines(lines)
    lines = lines.map(&:rstrip)
    lines.shift while lines.first&.strip == ''
    lines.pop while lines.last&.strip == ''
    indent = lines.reject { |line| line.strip.empty? }.map { |line| line[/\A[ \t]*/].length }.min || 0
    lines.map { |line| line[indent..] || '' }.join("\n")
  end

  # Условие заканчивается по грамматике выражения, а не по концу строки:
  # #if audio final audio:ScopeConfig; #end сохраняет объявление поля.
  def remove_conditions(tokens)
    output = []
    index = 0
    while index < tokens.length
      if tokens[index].kind == :punctuation && tokens[index].text == '#'
        directive = tokens[index + 1]&.text
        marker = Token.new(:directive, "##{directive}", tokens[index].line)
        index += 2
        case directive
        when 'if', 'elseif'
          output << marker
          index = condition_end(tokens, index)
        when 'else', 'end'
          output << marker
        when 'error', 'line'
          index += 1
        else
          raise "Неизвестная директива #{marker.text}, строка #{marker.line}"
        end
      else
        output << tokens[index]
        index += 1
      end
    end
    output
  end

  def condition_end(tokens, index)
    index += 1 while %w[! + -].include?(tokens[index]&.text)
    if tokens[index]&.text == '('
      index = condition_end(tokens, index + 1)
      raise 'Не закрыто условие #if' unless tokens[index]&.text == ')'
    elsif !%i[identifier literal].include?(tokens[index]&.kind)
      raise 'Не разобрано условие #if'
    end
    index += 1
    while tokens[index]&.text == '.' && tokens[index + 1]&.kind == :identifier
      index += 2
    end
    if tokens[index]&.text == '('
      index = condition_end(tokens, index + 1)
      raise 'Не закрыт вызов в условии #if' unless tokens[index]&.text == ')'

      index += 1
    end
    if %w[&& || == != < > <= >=].include?(tokens[index]&.text)
      index = condition_end(tokens, index + 1)
    end
    index
  end

  # Альтернативные заголовки могут открывать один общий блок после #end.
  # Его объявления принадлежат каждому заголовку, с исходными номерами строк.
  def expand_shared_blocks(tokens)
    tokens.each_index do |start|
      next unless tokens[start].kind == :directive && tokens[start].text == '#if'

      boundaries = [start]
      depth = 1
      ending = start + 1
      while ending < tokens.length
        item = tokens[ending]
        if item.kind == :directive
          depth += 1 if item.text == '#if'
          depth -= 1 if item.text == '#end'
          break if depth.zero?

          boundaries << ending if depth == 1 && %w[#else #elseif].include?(item.text)
        end
        ending += 1
      end
      raise "Не закрыта директива #if, строка #{tokens[start].line}" if ending == tokens.length

      boundaries << ending
      branches = boundaries.each_cons(2).map { |left, right| tokens[(left + 1)...right] }
      balances = branches.map { |branch| brace_balance(branch).first }
      balances << 0 unless boundaries.any? { |index| tokens[index].text == '#else' }
      next unless balances.uniq.length == 1 && balances.first&.positive?

      balance, closing = brace_balance(tokens, ending + 1, balances.first)
      raise "Не найден общий блок после #end, строка #{tokens[start].line}" unless balance == 0

      shared = tokens[(ending + 1)..closing]
      replacement = branches.each_with_index.flat_map { |branch, index| [tokens[boundaries[index]]] + branch + shared }
      tokens[start..closing] = replacement + [tokens[ending]]
    end
    tokens
  end

  def brace_balance(tokens, start = 0, depth = 0)
    stop_at_zero = depth.positive?
    conditions = []
    (start...tokens.length).each do |index|
      item = tokens[index]
      case item.kind == :directive && item.text
      when '#if'
        conditions << [depth, [], false]
      when '#else', '#elseif'
        return [nil, index] if conditions.empty?

        branch = conditions.last
        branch[1] << depth
        depth = branch[0]
        branch[2] = true if item.text == '#else'
      when '#end'
        return [nil, index] if conditions.empty?

        initial, endings, has_else = conditions.pop
        endings << depth
        endings << initial unless has_else
        return [nil, index] unless endings.uniq.length == 1

        depth = endings.first
      else
        depth += brace_delta(item)
      end
      return [0, index] if stop_at_zero && depth.zero? && conditions.empty?
    end
    [conditions.empty? ? depth : nil, tokens.length - 1]
  end

  def brace_delta(token)
    return 0 unless token.kind == :punctuation

    token.text == '{' ? 1 : (token.text == '}' ? -1 : 0)
  end

  def declaration(doc)
    kind = advance.text
    kind = 'enum abstract' if kind == 'enum' && take('abstract')
    kind = 'class' if kind == 'abstract' && take('class')
    name = read_name
    skip_group if current == '<'
    if kind == 'typedef'
      raise "Нет = у typedef #{name.text}" unless take('=')
      children = type_shape
      boundary = current.nil? || current == ';' || current == '@' || TYPES.include?(current) || MODIFIERS.include?(current)
      skip_value([';']) unless boundary || %i[doc directive].include?(token.kind)
      take(';')
    else
      until current.nil? || current == '{'
        PAIRS.key?(current) ? skip_group : advance
      end
      raise "Нет тела у #{name.text}" unless take('{')
      children = symbols(kind, '}')
    end
    symbol(kind, name, doc, children)
  end

  def fields(scope, doc, modifiers, shorthand: false)
    advance unless shorthand
    result = []
    loop do
      take('?')
      name = read_name
      property = current == '('
      skip_group if property
      children = take(':') ? type_shape : []
      kind = property ? 'property' : 'field'
      kind = 'enum-value' if scope == 'enum abstract' && !modifiers.include?('static')
      result << symbol(kind, name, doc, children)
      skip_value([',', ';', '}']) if take('=')
      break unless take(',')
      break if current == '}' || %i[doc directive].include?(token&.kind) || %w[var final function @].include?(current)
    end
    take(';')
    result
  end

  def method_symbols(doc)
    advance
    names = conditional_names
    skip_group if current == '<'
    raise "Нет параметров у #{names.first.text}" unless current == '('
    skip_group
    type_shape if take(':')
    skip_statement unless take(';')
    names.map { |name| symbol(name.text == 'new' ? 'constructor' : 'method', name, doc) }
  end

  def conditional_names
    return [read_name] unless take('#if')

    names = []
    loop do
      names.concat(conditional_names)
      break if take('#end')
      raise "Не разобрано условное имя, строка #{token&.line}" unless take('#else') || take('#elseif')
    end
    names
  end

  def type_shape
    advance while token&.kind == :directive
    take('?')
    children = []
    if take('{')
      children = symbols('typedef', '}')
    elsif current == '('
      skip_group
    elsif token&.kind == :literal
      advance
    elsif identifier?(@index)
      advance
      read_name while take('.')
      if take('<')
        until current.nil? || take('>')
          children.concat(type_shape)
          break unless take(',') || current == '>'
        end
      end
    else
      raise "Не разобран тип, строка #{token&.line}"
    end
    children.concat(type_shape) if take('->') || take('&')
    children
  end

  def skip_statement
    case current
    when '{'
      skip_group
    when 'return', 'throw', 'untyped'
      advance
      skip_statement unless take(';')
    when 'if', 'for', 'while'
      keyword = advance.text
      skip_group if current == '('
      skip_statement
      skip_statement if keyword == 'if' && take('else')
    when 'try'
      advance
      skip_statement
      while take('catch')
        skip_group
        skip_statement
      end
    when 'do'
      advance
      skip_statement
      skip_group if take('while') && current == '('
    when 'switch'
      advance
      skip_value(['{'])
      skip_group if current == '{'
    else
      skip_value([';', '}'])
    end
    take(';')
  end

  def skip_value(stops)
    start = @index
    until current.nil? || stops.include?(current)
      break if @index > start && (token.kind == :doc || MODIFIERS.include?(current) ||
                                 TYPES.include?(current) || %w[var function].include?(current))

      if take('new')
        read_name
        read_name while take('.')
        skip_group if current == '<'
      else
        ['(', '[', '{'].include?(current) ? skip_group : advance
      end
    end
  end

  def skip_group
    opening = advance
    closing = PAIRS.fetch(opening.text)
    depth = 1
    until current.nil?
      item = advance
      next if item.kind == :doc

      depth += 1 if item.text == opening.text
      depth -= 1 if item.text == closing
      return if depth.zero?
    end
    raise "Не закрыто #{opening.text}, строка #{opening.line}"
  end

  def skip_metadata
    advance
    take(':')
    read_name
    read_name while take('.')
    skip_group if current == '('
  end

  def symbol(kind, name, doc, children = [])
    # Тот же начальный HXDoc остаётся у объявления, без второй копии у файла.
    @header = '' if doc.equal?(@header)
    { type: 'symbol', kind: kind, name: name.text, doc: doc, children: children, line: name.line }
  end

  def read_name
    raise "Ожидалось имя, строка #{token&.line}" unless identifier?(@index)

    advance
  end

  def identifier?(index)
    @tokens[index]&.kind == :identifier
  end

  def token
    @tokens[@index]
  end

  def current
    token&.kind == :doc ? :doc : token&.text
  end

  def peek
    @tokens[@index + 1]&.text
  end

  def advance
    value = token
    @index += 1
    value
  end

  def take(value)
    advance if current == value
  end
end

def export_repository(source, private_output: false, verified_private: false, committed_project: nil,
                      config_path: nil, site_root: nil, before_write: nil)
  source = Pathname.new(File.expand_path(source))
  content_project = committed_project ? source.parent : source.ascend.find { |directory| (directory / '.git').exist? }
  source.ascend do |directory|
    raise "Не читаю src через символическую ссылку #{directory}" if directory.symlink?
    break if directory == (content_project || source.parent)
  end
  root = source.realpath.to_s
  raise 'src должен быть каталогом' unless File.directory?(root)

  counts = { directories: 0, files: 0, documents: 0, locked_documents: 0 }
  content_project = (content_project || source.parent).realpath
  project = committed_project ? Pathname.new(committed_project).realpath : content_project
  remote = ref = nil
  if (project / '.git').exist?
    git_file = project / '.git'
    git_dir = git_file.directory? ? git_file.to_s : File.expand_path(git_file.read.sub(/\Agitdir:\s*/, '').strip, project)
    git = lambda do |*arguments, optional: false|
      output, error, status = Open3.capture3('git', '-C', File.dirname(git_dir), "--git-dir=#{git_dir}", *arguments)
      raise error unless status.success? || optional

      output.strip if status.success?
    end
    git.call('rev-parse', '--git-dir')
    remote = git.call('config', '--get', 'remote.origin.url', optional: true)
    ref = git.call('symbolic-ref', '--quiet', '--short', 'HEAD', optional: true) || git.call('rev-parse', 'HEAD')
  end
  github = remote&.match(%r{\A(?:https?://(?:[^/@]+@)?github\.com/|ssh://git@github\.com/|git@github\.com:|git://github\.com/)([\w.-]+)/([\w.-]+?)(?:\.git)?/?\z})
  repository = github ? github[2] : project.basename.to_s
  raise 'Не удалось определить имя репозитория' if ['', '.', '..', '/'].include?(repository)

  site_root = File.expand_path(site_root || '..', __dir__)
  config_path ||= File.join(site_root, 'public/json/site.json')
  config = JSON.parse(File.read(config_path))
  unless config.is_a?(Hash) && config['defaults'].is_a?(Hash) && config['repositories'].is_a?(Hash)
    raise 'site.json должен содержать объекты defaults и repositories'
  end
  entry = config['repositories'].fetch(repository, {})
  raise "site.json: repositories.#{repository} должен быть объектом" unless entry.is_a?(Hash)
  branch = entry.fetch('branch', config['defaults'].fetch('branch', 'main'))
  unless branch.is_a?(String) && branch.match?(/\A[a-z\d][a-z\d._\/-]{0,99}\z/i) &&
         !branch.include?('..') && !branch.include?('//') && !branch.end_with?('/', '.') &&
         branch.split('/').none? { |part| part.start_with?('.') || part.end_with?('.lock') }
    raise "site.json: ветка #{repository} задана неверно"
  end

  document_types = %w[README CONTRIBUTING AGENTS LICENSE]
  permissions = document_types.to_h { |kind| [kind, false] }
  if private_output
    raise 'Закрытый снимок требует GitHub origin организации Hxape' unless github && github[1].casecmp?('Hxape')
    raise 'Закрытый снимок нельзя записать в репозиторий сайта' if project.to_s == site_root
    raise "Закрытый снимок готовят из ветки #{branch}" unless ref == branch
    unless verified_private
      uri = URI("https://api.github.com/repos/Hxape/#{repository}")
      request = Net::HTTP::Get.new(uri)
      request['Accept'] = 'application/vnd.github+json'
      request['User-Agent'] = 'Hxape-site-exporter'
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 20) { |http| http.request(request) }
      raise "Не записываю закрытый снимок в открытый репозиторий #{repository}" if response.is_a?(Net::HTTPSuccess)
      raise "Не удалось проверить закрытость #{repository}: HTTP #{response.code}" unless response.code == '404'

      _output, error, result = Timeout.timeout(20) do
        Open3.capture3({ 'GIT_TERMINAL_PROMPT' => '0' }, 'git', '-C', project.to_s, 'ls-remote', '--exit-code', 'origin', 'HEAD')
      end
      raise "Не удалось подтвердить доступ к закрытому репозиторию #{repository}: #{error}" unless result.success?
    end
    unless committed_project
      status, error, result = Open3.capture3('git', '-C', project.to_s, 'status', '--porcelain', '--untracked-files=all')
      raise error unless result.success?
      own_outputs = %w[.private/site.json .private/site.sha256]
      dirty_source = status.lines.any? do |line|
        !own_outputs.include?(line[3..].to_s.strip) || !['??', ' M'].include?(line[0, 2])
      end
      raise 'Перед закрытым экспортом зафиксируйте изменения исходного репозитория' if dirty_source
    end
    ref = nil
    destination = (project / '.private' / 'site.json').to_s
    level = 3
  else
    destination = File.join(site_root, "public/json/repositories/#{repository}.json")
    level = config['defaults'].merge(entry).fetch('level', 0)
    raise 'site.json: level должен быть целым числом от 0 до 4' unless level.is_a?(Integer) && (0..4).cover?(level)

    [config['defaults'], entry].each do |settings|
      flags = settings.fetch('documents', {})
      unless flags.is_a?(Hash) && (flags.keys - document_types).empty? &&
             flags.values.all? { |value| value == true || value == false }
        raise 'site.json: documents должен содержать булевы флаги README, CONTRIBUTING, AGENTS и LICENSE'
      end

      permissions.merge!(flags)
    end
    if github && github[1].casecmp?('Hxape')
      raise "Публичный экспорт #{repository} готовят из ветки #{branch}" unless ref == branch
      ref = branch
    end
  end
  data = { repository: repository, root: Pathname.new(root).relative_path_from(content_project).to_s,
           namespace: github && github[1], url: github && "https://github.com/#{github[1]}/#{repository}", ref: ref }.compact
  raise "Не обращаюсь к экспорту через символическую ссылку #{destination}" if File.symlink?(destination) || File.symlink?(File.dirname(destination))

  read_documents = lambda do |directory, kinds|
    names = Dir.children(directory).sort
    kinds.each_with_object({}) do |kind, documents|
      extensions = kind == 'LICENSE' ? ['', '.md', '.markdown', '.txt'] : ['.md', '.markdown', '', '.txt']
      candidates = extensions.flat_map { |extension| names.select { |name| name.casecmp?(kind + extension) } }
      name = candidates.find { |candidate| File.lstat(File.join(directory, candidate)).file? }
      next unless name

      filename = File.join(directory, name)
      raise "Документ за пределами репозитория: #{filename}" unless File.realpath(filename).start_with?(content_project.to_s + '/')

      document = { path: Pathname.new(filename).relative_path_from(content_project).to_s,
                   format: %w[.md .markdown].include?(File.extname(name).downcase) ? 'markdown' : 'text' }
      if permissions.fetch(kind)
        document[:content] = File.open(filename, File::RDONLY | File::NOFOLLOW, encoding: 'UTF-8', &:read)
        counts[:documents] += 1
      else
        counts[:locked_documents] += 1
      end
      documents[kind] = document
    end
  end
  data[:documents] = read_documents.call(content_project.to_s, document_types)

  if level.zero? && data[:documents].empty?
    if File.exist?(destination)
      previous = JSON.parse(File.read(destination))
      identity = %w[repository root namespace url].all? { |key| previous.is_a?(Hash) && previous[key] == data[key.to_sym] }
      shape = previous.is_a?(Hash) && previous['children'].is_a?(Array) &&
              (previous.keys - %w[repository root namespace url ref level documents children]).empty? &&
              (!previous.key?('documents') || previous['documents'].is_a?(Hash))
      raise "Не удаляю #{destination}: файл не соответствует экспорту этого репозитория" unless identity && shape

      before_write&.call
      File.delete(destination)
      puts "Удалён прежний экспорт #{destination}"
    end
    puts "#{repository}: уровень 0, документы отсутствуют; экспорт закрыт."
    return
  end

  read_directory = lambda do |directory, relative|
    entries = Dir.children(directory).map do |name|
      filename = File.join(directory, name)
      next if filename == (project / '.private').to_s
      next if File.symlink?(filename)
      raise "Путь за пределами src: #{filename}" unless File.realpath(filename).start_with?(root + '/')

      path = relative.empty? ? name : "#{relative}/#{name}"
      if File.directory?(filename)
        counts[:directories] += 1
        { type: 'directory', name: name, path: path, documents: read_documents.call(filename, %w[README AGENTS]),
          children: read_directory.call(filename, path) }
      elsif level >= 2 && File.file?(filename) && File.extname(name) == '.hx'
        counts[:files] += 1
        begin
          outline = level >= 3 ? HaxeOutline.new(File.read(filename, encoding: 'UTF-8')) : nil
          children = outline ? outline.symbols : []
        rescue StandardError => error
          raise SourceParseError, "#{path}: #{error.message}"
        end
        file = { type: 'file', name: name, path: path, children: children }
        file[:doc] = outline.header if outline && !outline.header.empty?
        file
      end
    end
    entries.compact.sort_by { |entry| [entry[:type] == 'directory' ? 0 : 1, entry[:name]] }
  end
  data[:level] = level
  data[:children] = level.zero? ? [] : read_directory.call(root, '')
  raise "Не записываю через символическую ссылку #{destination}" if File.symlink?(destination) || File.symlink?(File.dirname(destination))

  output = JSON.generate(data) + "\n"
  if private_output
    checksum = (project / '.private' / 'site.sha256').to_s
    raise "Не читаю через символическую ссылку #{checksum}" if File.symlink?(checksum)
    if File.file?(destination) && File.file?(checksum) && File.binread(destination) == output &&
       File.binread(checksum) == "#{Digest::SHA256.hexdigest(output)}\n"
      puts "#{repository}: закрытая пара не изменилась"
      return
    end
  elsif File.file?(destination) && File.binread(destination) == output
    puts "#{repository}: публичный JSON не изменился"
    return
  end
  before_write&.call
  FileUtils.mkdir_p(File.dirname(destination))
  Tempfile.create(['.repository-', '.json'], File.dirname(destination)) do |file|
    file.write(output)
    file.flush
    file.fsync
    file.chmod(0o644)
    if private_output
      checksum = (project / '.private' / 'site.sha256').to_s
      raise "Не записываю через символическую ссылку #{checksum}" if File.symlink?(checksum)
      raise 'Пара .private/site.json и .private/site.sha256 неполна' if File.exist?(destination) != File.exist?(checksum)
      Tempfile.create(['.repository-', '.sha256'], File.dirname(checksum)) do |hash_file|
        hash_file.write("#{Digest::SHA256.hexdigest(output)}\n")
        hash_file.flush
        hash_file.fsync
        hash_file.chmod(0o644)
        paths = [destination, checksum]
        backups = {}
        installed = []
        begin
          paths.each do |path|
            next unless File.exist?(path)

            backup = "#{path}.backup-#{SecureRandom.hex(8)}"
            File.rename(path, backup)
            backups[path] = backup
          end
          [[file.path, destination], [hash_file.path, checksum]].each do |source_file, path|
            File.rename(source_file, path)
            installed << path
          end
        rescue StandardError => error
          installed.each { |path| File.delete(path) if File.exist?(path) }
          begin
            backups.each { |path, backup| File.rename(backup, path) }
          rescue StandardError => restore_error
            raise "Не удалось восстановить пару после #{error.message}: #{restore_error.message}; резервные файлы сохранены"
          end
          raise error
        else
          backups.each_value do |backup|
            File.delete(backup)
          rescue StandardError => cleanup_error
            warn "Не удалось удалить резервный файл #{backup}: #{cleanup_error.message}"
          end
        end
      end
    else
      File.rename(file.path, destination)
    end
  end
  puts "#{destination}: #{counts[:directories]} каталогов, #{counts[:files]} файлов .hx, " \
       "#{counts[:documents]} документов, #{counts[:locked_documents]} закрытых документов, #{output.bytesize} байт"
end

if $PROGRAM_NAME == __FILE__
  private_output = ARGV.first == '--private'
  ARGV.shift if private_output
  abort 'Использование: ruby hxape.github.io/cli/export-repository.rb [--private] <путь-к-src>' unless ARGV.length == 1
  export_repository(ARGV.fetch(0), private_output: private_output)
end
