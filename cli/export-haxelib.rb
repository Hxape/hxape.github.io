#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative 'export-repository'

class HaxelibVersion
  include Comparable

  def initialize(value)
    match = value.is_a?(String) && value.match(/\A(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?\z/)
    raise "Некорректная версия haxelib: #{value.inspect}" unless match

    @numbers = match.captures.take(3).map(&:to_i)
    @prerelease = match[4]&.split('.')
    raise "Ведущий ноль в версии haxelib: #{value}" if @prerelease&.any? { |part| part.match?(/\A0\d+\z/) }
  end

  def <=>(other)
    order = @numbers <=> other.numbers
    return order unless order.zero?
    return 0 if @prerelease.nil? && other.prerelease.nil?
    return 1 if @prerelease.nil?
    return -1 if other.prerelease.nil?

    @prerelease.zip(other.prerelease).each do |left, right|
      return 1 if right.nil?

      numeric_left = left.match?(/\A\d+\z/)
      numeric_right = right.match?(/\A\d+\z/)
      order = if numeric_left && numeric_right
                left.to_i <=> right.to_i
              elsif numeric_left != numeric_right
                numeric_left ? -1 : 1
              else
                left <=> right
              end
      return order unless order.zero?
    end
    @prerelease.length <=> other.prerelease.length
  end

  protected

  attr_reader :numbers, :prerelease
end

class HaxelibExporter
  def initialize(source, config_path: nil, site_root: nil, before_write: nil)
    @base = Pathname.new(source).realpath
    @site = Pathname.new(site_root || Pathname.new(__dir__).parent).realpath
    @before_write = before_write
    config = JSON.parse(File.read(config_path || @site / 'public/json/site.json'))
    @settings = config.fetch('haxelib')
    raise 'site.json: haxelib должен быть объектом' unless @settings.is_a?(Hash)

    @libraries = @settings.fetch('libraries', {})
    raise 'site.json: haxelib.libraries должен быть объектом' unless @libraries.is_a?(Hash)

    @global_ignore = ignore_rules(@settings)
    @catalog_path = output_path(@settings.fetch('catalog'))
    @errors = []
  end

  def export
    catalog = []
    outputs = {}
    @base.children.sort.each do |library|
      name = library.basename.to_s
      next if name.start_with?('.') || library.symlink? || !library.directory?
      raise "Некорректное имя библиотеки: #{name}" unless name.match?(/\A[A-Za-z0-9][A-Za-z0-9_.-]*\z/)

      settings = @libraries.fetch(name, {})
      unless settings.is_a?(Hash) && [true, false].include?(settings.fetch('visible', true))
        raise "site.json: haxelib.libraries.#{name}.visible должен быть булевым флагом"
      end
      unless [true, false].include?(settings.fetch('dev', false))
        raise "site.json: haxelib.libraries.#{name}.dev должен быть булевым флагом"
      end
      next if settings['visible'] == false

      begin
        selected = select_installation(library, settings.fetch('dev', false))
        metadata = selected.fetch(:metadata)
        installation = selected.fetch(:path)
        class_path = local_directory(installation, metadata.fetch('classPath', '.'))
        code_root = local_directory(installation, settings.fetch('sourceRoot', metadata.fetch('classPath', '.')))
        ignore = @global_ignore + ignore_rules(settings)
        all_files = source_files(class_path, installation, ignore)
        files = source_files(code_root, installation, ignore)
        omitted = all_files - files
        raise "sourceRoot исключает исходники: #{omitted.map { |path| path.relative_path_from(installation) }.join(', ')}" unless omitted.empty?

        git_root = installation.ascend.take_while { |path| inside?(path, @base) }.find { |path| (path / '.git').exist? }
        remote = git_root && git(git_root, 'config', '--get', 'remote.origin.url', optional: true)
        metadata_url, documents_path = github_address(metadata['url'])
        canonical_url = github_address(remote).first || github_address(settings['url']).first || metadata_url
        raise 'Не найден GitHub URL в origin, настройках или haxelib.json' unless canonical_url
        provenance = installation_source(selected, git_root, remote, settings)

        package_path = git_root ? relative(installation, git_root) : documents_path
        root = [package_path, relative(code_root, installation)].reject(&:empty?).join('/')
        local_path = relative(local_root(selected, git_root), @base.parent)
        entry = { name: name, version: metadata.fetch('version'), url: canonical_url,
                  ref: git_root ? git(git_root, 'rev-parse', 'HEAD') : 'HEAD', root: root, packagePath: package_path,
                  documentsPath: documents_path, localPath: local_path,
                  outline: "public/json/haxelib/#{name}.json", installation: provenance }
        entry[:dev] = true if selected[:dev]
        destination = output_path(entry[:outline])
        if ([@catalog_path] + outputs.keys).any? { |path| path.to_s.casecmp?(destination.to_s) }
          raise "Путь дерева совпадает с другим выходным JSON: #{destination}"
        end

        data = { repository: name, version: entry[:version], url: canonical_url, ref: entry[:ref], root: root,
                 level: 3, documents: {}, children: outline(code_root, code_root, installation, ignore, name) }
        catalog << entry
        outputs[destination] = data
        puts "#{name} #{entry[:version]}#{selected[:dev] ? ' (.dev)' : ''}: #{files.length} файлов .hx, корень #{root.empty? ? '.' : root}"
      rescue StandardError => error
        @errors << "#{name}: #{error.message}"
      end
    end
    raise @errors.join("\n") unless @errors.empty?

    stale = stale_outputs(catalog)
    outputs.each { |path, data| write_json(path, data) }
    write_json(@catalog_path, { libraries: catalog })
    stale.each do |path|
      @before_write&.call
      path.delete
    end
    puts "#{@catalog_path}: #{catalog.length} библиотек"
  end

  private

  def installation_source(selected, git_root, remote, settings)
    configured = settings['installation']
    return { source: 'unknown' } if configured.nil?

    raise 'site.json: installation должен быть объектом' unless configured.is_a?(Hash)
    if configured['source'] == 'haxelib'
      raise 'site.json: для Haxelib-установки нужен только source' unless configured.keys == ['source']
      raise 'Установка из Haxelib не подтверждена для .dev или Git-копии' if selected[:dev] || git_root

      return { source: 'haxelib' }
    end
    raise 'site.json: неизвестный источник установки' unless configured['source'] == 'github'
    raise 'Для GitHub-установки нужен Git-корень с GitHub origin' unless git_root && github_address(remote).first

    kind = configured['refKind']
    ref = configured['ref']
    raise "Некорректный GitHub ref: #{ref.inspect}" unless valid_ref?(ref)
    head = git(git_root, 'rev-parse', 'HEAD')
    case kind
    when 'branch'
      if configured.key?('environment')
        raise 'site.json: для ветки среды нужны source, refKind, ref и environment' unless configured.keys.sort == %w[environment ref refKind source]

        environment = configured['environment']
        raise 'Некорректный компонент среды' unless environment.is_a?(String) && environment.match?(/\A[a-z][a-z0-9-]*\z/)
        root, manifest = environment_manifest
        raise 'Git-корень не принадлежит выбранной среде cli-haxe' unless git_root.realpath == (root / environment).realpath
        raise 'Ветка не совпадает с манифестом cli-haxe' unless manifest.fetch('branches').fetch(environment) == ref
        sha = manifest.fetch('commits').fetch(environment)
      else
        raise 'site.json: для ветки GitHub нужны source, refKind, ref и sha' unless configured.keys.sort == %w[ref refKind sha source]

        sha = configured['sha']
        raise 'Некорректный SHA ветки' unless sha.is_a?(String) && sha.match?(/\A[0-9a-f]{40}\z/)
        branch = git(git_root, 'rev-parse', '--verify', "refs/remotes/origin/#{ref}^{commit}", optional: true)
        raise 'Ветка origin не совпадает с установкой и заданным SHA' unless branch == sha
      end
      raise 'Коммит ветки не совпадает с установкой' unless sha.is_a?(String) && sha.match?(/\A[0-9a-f]{40}\z/) && sha == head

      { source: 'github', refKind: 'branch', ref: ref, sha: sha }
    when 'tag'
      raise 'site.json: для тега нужны source, refKind, ref и sha' unless configured.keys.sort == %w[ref refKind sha source]

      sha = configured['sha']
      raise 'Некорректный SHA тега' unless sha.is_a?(String) && sha.match?(/\A[0-9a-f]{40}\z/)
      tag = git(git_root, 'rev-parse', '--verify', "refs/tags/#{ref}^{commit}", optional: true)
      raise 'GitHub-тег и установка не совпадают с заданным SHA' unless tag == sha && head == sha

      { source: 'github', refKind: 'tag', ref: ref, sha: sha }
    else
      raise "Неизвестный вид GitHub ref: #{kind.inspect}"
    end
  end

  def environment_manifest
    return @environment_manifest if @environment_manifest

    current = @base / '.hlc/current'
    raise 'Не найдено активное окружение cli-haxe' unless current.symlink?
    root = current.realpath
    path = root / 'manifest.json'
    raise 'Нет обычного манифеста cli-haxe' unless path.file? && !path.symlink?
    @environment_manifest = [root, JSON.parse(path.read)]
  end

  def valid_ref?(value)
    value.is_a?(String) && value.match?(/\A[A-Za-z0-9][A-Za-z0-9._\/-]*\z/) &&
      !value.include?('..') && !value.include?('//') && !value.end_with?('.', '/') &&
      value.split('/').none? { |part| part.start_with?('.') || part.end_with?('.lock') }
  end

  def select_installation(library, required_dev)
    candidates = []
    unless required_dev
      candidates = library.children.sort.map do |path|
        next if path.basename.to_s.start_with?('.') || path.symlink? || !path.directory?

        installation(path, false)
      end.compact
    end
    dev = library / '.dev'
    raise 'Обязательная .dev отсутствует' if required_dev && (!dev.file? || dev.symlink?)
    if (required_dev || candidates.empty?) && dev.file? && !dev.symlink?
      pointer = Pathname.new(dev.read.strip)
      pointer = library / pointer unless pointer.absolute?
      pointer = pointer.cleanpath
      resolved = pointer.realpath
      raise "Путь .dev за пределами #{@base}: #{resolved}" unless inside?(resolved, @base)
      raise "Местный путь .dev за пределами #{@base}: #{pointer}" unless inside?(pointer, @base)

      candidates << installation(pointer, true)
    end
    raise 'Нет установленных версий' if candidates.empty?

    candidates.max_by { |candidate| [candidate.fetch(:version), candidate[:dev] ? 1 : 0, candidate.fetch(:path).to_s] }
  end

  def installation(path, dev)
    metadata_path = path / 'haxelib.json'
    raise "Нет обычного haxelib.json: #{path}" unless metadata_path.file? && !metadata_path.symlink?

    metadata = JSON.parse(metadata_path.read)
    raise "haxelib.json должен быть объектом: #{path}" unless metadata.is_a?(Hash)

    { path: path.realpath, logical_path: path.cleanpath, metadata: metadata, dev: dev, version: HaxelibVersion.new(metadata.fetch('version')) }
  end

  # .dev сохраняет устойчивую ссылку current; Git, происхождение и границы проверяются по фактическому каталогу.
  def local_root(selected, git_root)
    logical = selected.fetch(:logical_path)
    if git_root
      selected.fetch(:path).relative_path_from(git_root).each_filename.reject { |part| part == '.' }.each { logical = logical.parent }
      raise 'Местный путь не соответствует проверенному Git-корню' unless logical.realpath == git_root
    end
    logical
  end

  def local_directory(installation, value)
    raise "Некорректный путь исходников: #{value.inspect}" unless value.is_a?(String) && !Pathname.new(value).absolute?

    path = (installation / value).cleanpath
    raise "Путь вне установки: #{path}" unless inside?(path, installation)

    path.ascend do |component|
      raise "Символическая ссылка внутри установки: #{component}" if component.symlink?
      break if component == installation
    end
    raise "Нет каталога исходников: #{path}" unless path.directory?

    path
  end

  def inside?(path, parent)
    path == parent || path.to_s.start_with?(parent.to_s + '/')
  end

  def relative(path, parent)
    result = path.relative_path_from(parent).to_s
    result == '.' ? '' : result
  end

  def ignore_rules(settings)
    rules = settings.fetch('ignore', [])
    raise 'site.json: haxelib ignore должен быть массивом непустых строк' unless rules.is_a?(Array) && rules.all? { |rule| rule.is_a?(String) && !rule.empty? }

    rules
  end

  def ignored?(path, installation, rules)
    relative_path = relative(path, installation)
    relative_path.split('/').any? { |part| part.start_with?('.') } || rules.any? do |rule|
      File.fnmatch?(rule, relative_path, File::FNM_PATHNAME) || File.fnmatch?("#{rule}/**", relative_path, File::FNM_PATHNAME)
    end
  end

  def entries(directory, installation, ignore)
    directory.children.sort.reject { |path| path.symlink? || ignored?(path, installation, ignore) }
  end

  def source_files(directory, installation, ignore)
    entries(directory, installation, ignore).flat_map do |path|
      path.directory? ? source_files(path, installation, ignore) : (path.file? && path.extname == '.hx' ? [path] : [])
    end
  end

  def outline(directory, root, installation, ignore, library)
    entries(directory, installation, ignore).map do |path|
      if path.directory?
        children = outline(path, root, installation, ignore, library)
        next if children.empty?

        { type: 'directory', name: path.basename.to_s, path: relative(path, root), documents: {}, children: children }
      elsif path.file? && path.extname == '.hx'
        begin
          parsed = HaxeOutline.new(path.read(encoding: 'UTF-8'))
          file = { type: 'file', name: path.basename.to_s, path: relative(path, root), children: parsed.symbols }
          file[:doc] = parsed.header unless parsed.header.empty?
          file
        rescue StandardError => error
          @errors << "#{library}/#{relative(path, installation)}: #{error.message}"
          nil
        end
      end
    end.compact.sort_by { |node| [node[:type] == 'directory' ? 0 : 1, node[:name]] }
  end

  def github_address(value)
    match = value.is_a?(String) && value.match(%r{\A(?:https?://github\.com/|ssh://git@github\.com/|git@github\.com:|git://github\.com/)([\w.-]+)/([\w.-]+?)(?:\.git)?(?:/tree/[^/]+/(.*))?/?\z})
    return [nil, ''] unless match

    path = (match[3] || '').sub(%r{/\z}, '')
    raise "Небезопасный путь GitHub: #{path}" if path.split('/').any? { |part| part.empty? || part == '.' || part == '..' }

    ["https://github.com/#{match[1]}/#{match[2]}", path]
  end

  def git(root, *arguments, optional: false)
    marker = root / '.git'
    git_dir = marker.directory? ? marker : (root / marker.read.sub(/\Agitdir:\s*/, '').strip).cleanpath
    output, error, status = Open3.capture3('git', '-C', git_dir.parent.to_s, "--git-dir=#{git_dir}", *arguments)
    raise error unless status.success? || optional

    status.success? ? output.strip : nil
  end

  def output_path(value)
    raise "Некорректный путь JSON: #{value.inspect}" unless value.is_a?(String) && !Pathname.new(value).absolute?

    path = (@site / value).cleanpath
    raise "JSON вне сайта: #{value}" unless inside?(path, @site) && path != @site

    path.ascend do |component|
      raise "JSON через символическую ссылку: #{component}" if component.symlink?
      break if component == @site
    end
    path
  end

  def stale_outputs(catalog)
    previous = @catalog_path.file? ? JSON.parse(@catalog_path.read).fetch('libraries') : []
    raise 'Прежний каталог .haxelib повреждён' unless previous.is_a?(Array)

    names = previous.map { |entry| entry.fetch('name') } | @libraries.select { |_, settings| settings['visible'] == false }.keys
    (names - catalog.map { |entry| entry[:name] }).map do |name|
      raise "Некорректное имя в прежнем каталоге: #{name}" unless name.is_a?(String) && name.match?(/\A[A-Za-z0-9][A-Za-z0-9_.-]*\z/)

      path = output_path("public/json/haxelib/#{name}.json")
      next unless path.exist?

      data = JSON.parse(path.read)
      shape = data.is_a?(Hash) && data['repository'] == name && data['level'] == 3 &&
              data['version'].is_a?(String) && data['children'].is_a?(Array) && data['documents'] == {} &&
              (data.keys - %w[repository version url ref root level documents children]).empty?
      raise "Не удаляю чужой JSON: #{path}" unless shape

      path
    end.compact
  end

  def write_json(path, data)
    output_path(relative(path, @site))
    output = JSON.generate(data) + "\n"
    return if path.file? && path.binread == output

    @before_write&.call
    path.parent.mkpath
    Tempfile.create(['.haxelib-', '.json'], path.parent.to_s) do |file|
      file.write(output)
      file.flush
      file.fsync
      file.chmod(0o644)
      File.rename(file.path, path)
    end
  end
end

if $PROGRAM_NAME == __FILE__
  abort 'Использование: ruby hxape.github.io/cli/export-haxelib.rb [путь-к-.haxelib]' if ARGV.length > 1
  HaxelibExporter.new(ARGV.fetch(0, File.expand_path('../../.haxelib', __dir__))).export
end
