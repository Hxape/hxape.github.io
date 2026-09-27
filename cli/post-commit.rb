#!/usr/bin/env ruby
# frozen_string_literal: true

require 'csv'
require 'digest'
require 'fileutils'
require 'json'
require 'net/http'
require 'open3'
require 'pathname'
require 'rbconfig'
require 'shellwords'
require 'tempfile'
require 'tmpdir'
require 'uri'
require_relative '../../agents/lib/organization'
require_relative 'export-repository'
require_relative 'export-haxelib'

# Git запускает hook после создания исходного коммита. Все входы берутся из HEAD.
class SitePostCommit
  SITE = 'hxape.github.io'
  DOCUMENT = /\A(?:README|CONTRIBUTING|AGENTS|LICENSE)(?:\.(?:md|markdown|txt))?\z/i
  RESOURCE = %r{\A(?:index\.html|manifest\.json|cli/(?:build\.mjs|export-resources\.rb|export-haxelib\.rb)|(?:src|public/html|public/css|vendor|icons|public/icons)/|public/json/site\.json|public/json/haxelib/(?:index|publications)\.json)}

  def initialize(project, retry_requested: false, organization: Organization.new)
    @org = organization
    @project = project
    @retry_requested = retry_requested
    @site = @org.tree(SITE)
    @node = @org.node(project)
    @tree = @org.tree(project)
    @git_dir = git(project, 'rev-parse', '--absolute-git-dir').strip
    @head = git(project, 'rev-parse', 'HEAD').strip
    @site_head = git(SITE, 'rev-parse', 'HEAD').strip
    @config_oid = git(SITE, 'rev-parse', "#{@site_head}:public/json/site.json").strip
    @expected_heads = { SITE => @site_head, project => @head }
    @expected_branches = @expected_heads.keys.map { |name| [name, branch(name)] }.to_h
    @pending_path = File.join(@git_dir, 'hxape-site-export-pending.json')
    @processed_path = File.join(@git_dir, 'hxape-site-export-processed.json')
    @pending = read_state(@pending_path)
  end

  def run(skip_rewrite: false)
    assert_inputs!
    raise 'Незавершённый экспорт относится к другому коммиту; проверьте его перед повтором' if
      @pending && (@pending['head'] != @head || @pending['config'] != @config_oid)
    raise 'Есть незавершённый экспорт; проверьте его перед переписыванием истории' if skip_rewrite && @pending

    if skip_rewrite
      write_state(@processed_path, processed_state)
      puts "#{@project}: история переписана; экспорт пропущен"
      return
    end

    if !@retry_requested && !@pending && processed?
      puts "#{@project}: это дерево уже обработано"
      return
    end

    if @project == SITE
      update_site
    else
      update_source
    end
    assert_inputs!
    write_state(@processed_path, processed_state)
    File.delete(@pending_path) if File.file?(@pending_path)
  end

  private

  def git(project, *args)
    output, error, status = Open3.capture3('git', '-C', @org.node(project), *args)
    raise "Git #{project}: #{error.strip}" unless status.success?

    output
  end

  def git_optional(project, *args)
    output, _error, status = Open3.capture3('git', '-C', @org.node(project), *args)
    status.success? ? output : nil
  end

  def read_state(path)
    return nil unless File.file?(path) && !File.symlink?(path)

    JSON.parse(File.read(path))
  end

  def write_state(path, data)
    Tempfile.create(['.hxape-site-export-', '.json'], File.dirname(path)) do |file|
      file.write(JSON.generate(data) + "\n")
      file.flush
      file.fsync
      File.rename(file.path, path)
    end
  end

  def processed?
    state = read_state(@processed_path)
    state && state['processed'] && state['tree'] == git(@project, 'rev-parse', 'HEAD^{tree}').strip &&
      state['config'] == @config_oid && state['branch'] == branch(@project)
  end

  def processed_state
    { 'processed' => true, 'head' => git(@project, 'rev-parse', 'HEAD').strip,
      'tree' => git(@project, 'rev-parse', 'HEAD^{tree}').strip,
      'config' => @config_oid, 'branch' => branch(@project) }
  end

  def branch(project)
    git_optional(project, 'symbolic-ref', '--quiet', '--short', 'HEAD')&.strip
  end

  def track_project(project)
    return if @expected_heads.key?(project)

    @expected_heads[project] = git(project, 'rev-parse', 'HEAD').strip
    @expected_branches[project] = branch(project)
  end

  def assert_inputs!
    @expected_heads.each do |project, expected|
      actual = git(project, 'rev-parse', 'HEAD').strip
      raise "#{project}: HEAD изменился во время экспорта; повторите после проверки выходов" unless actual == expected
      raise "#{project}: ветка изменилась во время экспорта" unless branch(project) == @expected_branches[project]
    end
    actual_config = git(SITE, 'rev-parse', 'HEAD:public/json/site.json').strip
    raise 'site.json изменился во время экспорта' unless actual_config == @config_oid
  end

  def changed_paths(project)
    revision = project == @project ? @head : git(project, 'rev-parse', 'HEAD').strip
    parent = git_optional(project, 'rev-parse', '--verify', "#{revision}^")&.strip
    output = if parent
               git(project, 'diff', '--name-only', '-z', parent, revision, '--')
             else
               git(project, 'ls-tree', '-r', '--name-only', '-z', revision, '--')
             end
    output.split("\0")
  end

  def archive(project, destination, paths = [], revision: nil)
    revision ||= @expected_heads[project] || git(project, 'rev-parse', 'HEAD').strip
    listed = git(project, 'ls-tree', '-r', '-z', revision, '--', *paths)
    raise "#{project}: снимок содержит символическую ссылку" if listed.split("\0").any? { |entry| entry.start_with?('120000 ') }

    Tempfile.create(['hxape-site-', '.tar']) do |tar|
      command = ['git', '-C', @org.node(project), 'archive', '--format=tar', "--output=#{tar.path}", revision]
      command.concat(['--', *paths]) unless paths.empty?
      raise "#{project}: не удалось получить снимок HEAD" unless system(*command, out: File::NULL)
      raise "#{project}: не удалось раскрыть снимок HEAD" unless system('tar', '-xf', tar.path, '-C', destination, out: File::NULL)
    end
  end

  def snapshot_source(project)
    revision = @expected_heads[project] || git(project, 'rev-parse', 'HEAD').strip
    names = git(project, 'ls-tree', '--name-only', '-z', revision).split("\0")
    raise "#{project}: в HEAD нет src" unless names.include?('src')

    paths = ['src'] + names.grep(DOCUMENT)
    Dir.mktmpdir('hxape-source-') do |directory|
      archive(project, directory, paths, revision: revision)
      yield directory
    end
  end

  def config_snapshot
    Dir.mktmpdir('hxape-config-') do |directory|
      path = File.join(directory, 'site.json')
      File.binwrite(path, git(SITE, 'cat-file', 'blob', @config_oid))
      yield path, JSON.parse(File.binread(path))
    end
  end

  def haxe_source?(project)
    revision = @expected_heads[project] || git(project, 'rev-parse', 'HEAD').strip
    git(project, 'ls-tree', '-r', '--name-only', '-z', revision, '--', 'src').split("\0").any? { |path| path.end_with?('.hx') }
  end

  def source_project?(project)
    row = CSV.read(File.join(@org.root, 'agents/skills/projects/projects.tsv'), headers: true, col_sep: "\t")
             .find { |entry| entry['# path'] == project }
    row && row['lifecycle'] == 'active' && File.exist?(File.join(@org.tree(project), '.git')) && haxe_source?(project)
  end

  def repository_name(project)
    remote = git_optional(project, 'remote', 'get-url', 'origin')&.strip
    match = remote&.match(%r{\A(?:https://github\.com/|git@github\.com:|ssh://git@github\.com/)Hxape/([A-Za-z0-9_.-]+?)(?:\.git)?/?\z}i)
    match && match[1]
  end

  def selected_branch(config, name)
    defaults = config.fetch('defaults')
    settings = config.fetch('repositories').fetch(name, {})
    settings.fetch('branch', defaults.fetch('branch', 'main'))
  end

  def selected_head?(project, config, name)
    branch = branch(project)
    expected = selected_branch(config, name)
    if branch != expected
      puts "#{project}: ветка #{branch || 'detached HEAD'} не выбрана сайтом (#{expected}); экспорт пропущен"
      return false
    end
    true
  end

  def selected_head!(project, config, name)
    expected = selected_branch(config, name)
    actual = branch(project)
    return if actual == expected

    raise "#{project}: нужен HEAD ветки #{expected}, сейчас #{actual || 'detached HEAD'}; JSON не обновлён"
  end

  def private_repository?(project, name)
    uri = URI("https://api.github.com/repos/Hxape/#{URI.encode_www_form_component(name)}")
    request = Net::HTTP::Get.new(uri)
    request['Accept'] = 'application/vnd.github+json'
    request['User-Agent'] = 'Hxape-site-exporter'
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 20) { |http| http.request(request) }
    return false if response.is_a?(Net::HTTPSuccess)
    raise "GitHub не подтвердил видимость #{name}: HTTP #{response.code}" unless response.code == '404'

    output, error, status = Open3.capture3({ 'GIT_TERMINAL_PROMPT' => '0' }, 'git', '-C', @org.node(project),
                                            'ls-remote', '--exit-code', 'origin', 'HEAD')
    raise "Нет доступа к закрытому #{name}: #{error.strip}" unless status.success? && !output.empty?

    true
  end

  def output_key(project, path)
    "#{project}:#{path}"
  end

  def digest(path)
    File.file?(path) ? Digest::SHA256.file(path).hexdigest : nil
  end

  def output_status(project, path)
    git(project, 'status', '--porcelain=v1', '--untracked-files=all', '--', ":(literal)#{path}")
  end

  def safe_output!(project, path)
    assert_inputs!
    absolute = File.join(@org.tree(project), path)
    current = Pathname.new(absolute)
    until current.to_s == @org.tree(project)
      raise "Выход проходит через символическую ссылку: #{absolute}" if current.symlink?
      current = current.parent
    end
    status = output_status(project, path)
    return if status.empty?

    expected = @pending&.dig('outputs', output_key(project, path))
    known = @pending && @pending.fetch('outputs', {}).key?(output_key(project, path))
    raise "Не перезаписываю чужой изменённый выход #{absolute}" unless known && digest(absolute) == expected

    staged = status[0]
    return if staged == ' ' || staged == '?'

    index = git_optional(project, 'show', ":#{path}")
    index_digest = index && Digest::SHA256.hexdigest(index)
    raise "Индекс содержит чужое изменение #{absolute}" unless index_digest == expected
  end

  def safe_outputs!(project, paths)
    paths.each { |path| safe_output!(project, path) }
  end

  def remember_outputs(project, paths)
    assert_inputs!
    @pending ||= { 'head' => @head, 'config' => @config_oid, 'outputs' => {} }
    paths.each do |path|
      next if output_status(project, path).empty?

      @pending['outputs'][output_key(project, path)] = digest(File.join(@org.tree(project), path))
    end
    write_state(@pending_path, @pending)
  end

  def remember_expected_output(project, path, content)
    assert_inputs!
    @pending ||= { 'head' => @head, 'config' => @config_oid, 'outputs' => {} }
    @pending['outputs'][output_key(project, path)] = Digest::SHA256.hexdigest(content)
    write_state(@pending_path, @pending)
  end

  def commit_outputs(project, paths, message)
    assert_inputs!
    changed = paths.uniq.select { |path| !output_status(project, path).empty? }
    return if changed.empty?

    safe_outputs!(project, changed)
    remember_outputs(project, changed)
    specs = changed.map { |path| ":(literal)#{path}" }
    git(project, 'add', '-A', '--', *specs)
    assert_inputs!
    previous = ENV['HXAPE_SITE_EXPORT']
    ENV['HXAPE_SITE_EXPORT'] = 'generated'
    begin
      git(project, 'commit', '--only', '-m', message, '--', *specs)
    ensure
      previous ? ENV['HXAPE_SITE_EXPORT'] = previous : ENV.delete('HXAPE_SITE_EXPORT')
    end
    previous_head = @expected_heads.fetch(project)
    new_head = git(project, 'rev-parse', 'HEAD').strip
    raise "#{project}: коммит дерева создался поверх другого HEAD" unless git(project, 'rev-parse', 'HEAD^').strip == previous_head
    @expected_heads[project] = new_head
    assert_inputs!
    changed.each do |path|
      raise "После коммита выход снова изменён: #{project}/#{path}" unless output_status(project, path).empty?
    end
  end

  def public_output(name)
    "public/json/repositories/#{name}.json"
  end

  # Разбирает один зафиксированный HTML прежним правилом details; проверка URL и уникальности не меняется.
  # Возвращает пары repo/url без оформления; неверная регистрация останавливает экспорт до записи выходов.
  def catalog_repository_pairs(html)
    pairs = html.gsub(/<!--.*?-->/m, '').scan(/<details\b[^>]*>/m).map do |tag|
      name = tag[/\bdata-repository\s*=\s*"([^"]+)"/, 1]
      next unless name

      url = tag[/\bdata-url\s*=\s*"([^"]+)"/, 1]
      raise "Неверный каталоговый репозиторий: #{name}" unless
        name.match?(/\A[A-Za-z0-9][A-Za-z0-9_.-]*\z/) && url == "https://github.com/Hxape/#{name}"

      [name, url]
    end.compact
    names = pairs.map(&:first)
    raise 'Каталог сайта не содержит репозиториев' if names.empty?
    raise 'Каталог сайта содержит повтор имени репозитория' unless names.uniq.length == names.length

    pairs
  end

  # Нынешние имена каталога сохраняют прежнюю форму для сопоставления с origin и политикой site.json.
  def catalog_repositories
    @catalog_repositories ||= catalog_repository_pairs(
      git(SITE, 'show', "#{@site_head}:public/html/catalog.html")
    ).map(&:first).freeze
  end

  # Сравнивает только repo/url двух зафиксированных версий, без порядка строк, классов и регистра GitHub-имени.
  # Отсутствие предыдущего каталога означает новый состав; неверный HTML не подменяется пустым набором.
  def catalog_membership_changed?
    before = git_optional(SITE, 'show', "#{@head}^:public/html/catalog.html")
    current = git(SITE, 'show', "#{@site_head}:public/html/catalog.html")
    current_pairs = catalog_repository_pairs(current).map { |pair| pair.map(&:downcase) }.sort
    return true unless before

    previous_pairs = catalog_repository_pairs(before).map { |pair| pair.map(&:downcase) }.sort
    previous_pairs != current_pairs
  end

  def public_file_required?(name, config)
    defaults = config.fetch('defaults')
    settings = config.fetch('repositories').fetch(name, {})
    level = settings.fetch('level', defaults.fetch('level', 0))
    documents = defaults.fetch('documents', {}).merge(settings.fetch('documents', {}))
    raise "site.json: неверные права #{name}" unless level.is_a?(Integer) && (0..4).cover?(level) &&
      documents.is_a?(Hash) && documents.values.all? { |value| value == true || value == false }

    level.positive? || documents.values.any?
  end

  def public_export_allowed?(name, config)
    return false unless catalog_repositories.include?(name)

    public_file_required?(name, config) ||
      !git_optional(SITE, 'cat-file', '-e', "#{@site_head}:#{public_output(name)}").nil?
  end

  def export_public(project, name, config_path)
    assert_inputs!
    output = public_output(name)
    safe_outputs!(SITE, [output])
    snapshot_source(project) do |snapshot|
      export_repository(File.join(snapshot, 'src'), committed_project: @org.tree(project), config_path: config_path,
                        site_root: @site, before_write: method(:assert_inputs!))
    end
    remember_outputs(SITE, [output])
    output
  end

  def update_source
    paths = changed_paths(@project)
    relevant = paths.any? { |path| path.start_with?('src/') || path.match?(DOCUMENT) }
    return unless relevant || @retry_requested || @pending
    return unless source_project?(@project)

    name = repository_name(@project)
    raise "#{@project}: origin не указывает на репозиторий Hxape" unless name

    config_snapshot do |config_path, config|
      return unless selected_head?(@project, config, name)

      private_output = private_repository?(@project, name)
      assert_inputs!
      private_paths = %w[.private/site.json .private/site.sha256]
      safe_outputs!(@project, private_paths) if private_output
      if public_export_allowed?(name, config)
        output = export_public(@project, name, config_path)
        commit_outputs(SITE, [output], "Обновить публичное дерево #{name}")
      end
      next unless private_output

      snapshot_source(@project) do |snapshot|
        export_repository(File.join(snapshot, 'src'), private_output: true, verified_private: true,
                          committed_project: @tree, config_path: config_path, site_root: @site,
                          before_write: method(:assert_inputs!))
      end
      remember_outputs(@project, private_paths)
      commit_outputs(@project, private_paths, "Обновить закрытое дерево #{name}")
    end
  end

  def configured_sources(before, current)
    rows = CSV.read(File.join(@org.root, 'agents/skills/projects/projects.tsv'), headers: true, col_sep: "\t")
    projects = rows.map do |entry|
      path = entry['# path']
      path if path != SITE && path != '.' && entry['lifecycle'] == 'active' &&
              File.exist?(File.join(@org.tree(path), '.git'))
    end.compact
    return projects if before.nil? || before['defaults'] != current['defaults']

    old = before.fetch('repositories', {})
    new = current.fetch('repositories', {})
    changed_names = (old.keys | new.keys).select { |name| old[name] != new[name] }
    projects.select { |project| changed_names.include?(repository_name(project)) }
  end

  def haxelib_outputs
    committed = git(SITE, 'ls-tree', '-r', '--name-only', '-z', @expected_heads.fetch(SITE), '--', 'public/json/haxelib').split("\0")
    working = Dir.glob('public/json/haxelib/*.json', base: @site)
    (committed + working + ['public/json/haxelib/index.json']).uniq - ['public/json/haxelib/publications.json']
  end

  def resource_snapshot(index_changed)
    Dir.mktmpdir('hxape-site-') do |snapshot|
      archive(SITE, snapshot)
      if index_changed
        source = File.join(@site, 'public/json/haxelib/index.json')
        target = File.join(snapshot, 'public/json/haxelib/index.json')
        FileUtils.mkdir_p(File.dirname(target))
        FileUtils.cp(source, target)
      end
      yield snapshot
    end
  end

  def bun_command
    configured = ENV['BUN']
    return configured if configured && !configured.empty?

    return '/opt/homebrew/bin/bun' if File.executable?('/opt/homebrew/bin/bun')
    return '/usr/local/bin/bun' if File.executable?('/usr/local/bin/bun')

    'bun'
  end

  def update_resources(index_changed)
    manifest = 'public/json/resources.json'
    safe_outputs!(SITE, [manifest])
    build_paths = []
    obsolete = []
    resource_snapshot(index_changed) do |snapshot|
      output, error, status = Open3.capture3(bun_command, File.join(snapshot, 'cli/build.mjs'), snapshot, chdir: snapshot)
      raise "Сборка Bun: #{error.strip}\n#{output.strip}" unless status.success?

      output, error, status = Open3.capture3(RbConfig.ruby, File.join(snapshot, 'cli/export-resources.rb'))
      raise "Экспорт ресурсов: #{error.strip}\n#{output.strip}" unless status.success?

      build_data = JSON.parse(File.binread(File.join(snapshot, 'public/json/build.json')))
      expected_entries = { 'theme' => 'public/js/theme-boot.mjs',
                           'bootstrap' => 'public/js/bootstrap.mjs',
                           'main' => 'public/js/main.mjs',
                           'worker' => 'public/js/octocat.mjs' }
      expected_outputs = %w[bootstrap main octocat releases shared source-view theme-boot tokens]
                         .map { |name| "public/js/#{name}.mjs" }.sort
      expected_html = %w[bookmarks catalog document-panel footer header history preferences search source-view token-manager]
                      .map { |name| "public/html/#{name}.html" }.sort
      unless build_data['version'] == 1 && build_data['entries'] == expected_entries &&
             build_data['outputs'] == expected_outputs && build_data['html'] == expected_html
        raise 'Bun вернул неверный список выходов'
      end
      build_paths = build_data['outputs'] + ['public/json/build.json']
      previous_build = git_optional(SITE, 'show', "#{@expected_heads.fetch(SITE)}:public/json/build.json")
      previous_outputs = previous_build ? JSON.parse(previous_build).fetch('outputs', []) : []
      unless previous_outputs.is_a?(Array) && previous_outputs.all? { |path| path.is_a?(String) &&
        path.match?(%r{\Apublic/js/(?:theme-boot|bootstrap|main|octocat|chunk-[a-z0-9]{8,13}|shared|tokens|source-view|releases)\.mjs\z}) }
        raise 'Прежний build.json содержит неизвестные выходы'
      end
      old_chunks = git(SITE, 'ls-tree', '-r', '--name-only', '-z', @expected_heads.fetch(SITE), '--', 'public/js')
                   .split("\0").grep(%r{\Apublic/js/chunk-[a-z0-9]{8,13}\.mjs\z})
      obsolete = (previous_outputs + old_chunks).uniq - build_data['outputs']
      safe_outputs!(SITE, build_paths + obsolete)
      build_paths.each do |path|
        source = File.join(snapshot, path)
        destination = File.join(@site, path)
        content = File.binread(source)
        next if File.file?(destination) && File.binread(destination) == content

        assert_inputs!
        safe_output!(SITE, path)
        remember_expected_output(SITE, path, content)
        FileUtils.mkdir_p(File.dirname(destination))
        Tempfile.create(['.site-build-', '.tmp'], File.dirname(destination)) do |file|
          file.write(content)
          file.flush
          file.fsync
          File.rename(file.path, destination)
        end
      end
      remember_outputs(SITE, build_paths)

      obsolete.each do |path|
        destination = File.join(@site, path)
        next unless File.exist?(destination)

        assert_inputs!
        safe_output!(SITE, path)
        File.delete(destination)
      end
      remember_outputs(SITE, obsolete)

      source = File.join(snapshot, manifest)
      destination = File.join(@site, manifest)
      content = File.binread(source)
      next if File.file?(destination) && File.binread(destination) == content

      assert_inputs!
      safe_output!(SITE, manifest)
      remember_expected_output(SITE, manifest, content)
      Tempfile.create(['.resources-', '.json'], File.dirname(destination)) do |file|
        file.write(content)
        file.flush
        file.fsync
        File.rename(file.path, destination)
      end
      remember_outputs(SITE, [manifest])
    end
    build_paths + obsolete
  end

  def update_site
    changed = changed_paths(SITE)
    config_changed = changed.include?('public/json/site.json')
    catalog_changed = changed.include?('public/html/catalog.html') && catalog_membership_changed?
    resources_changed = changed.any? { |path| path.match?(RESOURCE) }
    return unless config_changed || catalog_changed || resources_changed || @retry_requested || @pending

    config_snapshot do |config_path, config|
      previous = git_optional(SITE, 'show', "#{@head}^:public/json/site.json")
      old_config = previous && JSON.parse(previous)
      public_projects = if catalog_changed
                          configured_sources(nil, config)
                        elsif config_changed
                          configured_sources(old_config, config)
                        else
                          []
                        end
      public_projects.select! do |project|
        name = repository_name(project)
        name && public_export_allowed?(name, config)
      end
      public_projects.each { |project| track_project(project) }
      public_projects.each { |project| selected_head!(project, config, repository_name(project)) }
      public_projects.each do |project|
        raise "#{project}: в выбранном HEAD нет файлов src/**/*.hx" unless haxe_source?(project)
      end
      assert_inputs!
      public_paths = public_projects.map do |project|
        name = repository_name(project)
        name && public_output(name)
      end.compact
      haxelib_changed = changed.include?('cli/export-haxelib.rb') ||
                        (config_changed && (!old_config || old_config['haxelib'] != config['haxelib']))
      haxelib_paths = haxelib_changed ? haxelib_outputs : []
      manifest = 'public/json/resources.json'
      safe_outputs!(SITE, public_paths + haxelib_paths + (resources_changed || haxelib_changed ? [manifest] : []))

      public_projects.each do |project|
        name = repository_name(project)
        export_public(project, name, config_path)
      end
      if haxelib_changed
        HaxelibExporter.new(File.join(@org.root, '.haxelib'), config_path: config_path,
                            site_root: @site, before_write: method(:assert_inputs!)).export
        haxelib_paths |= haxelib_outputs
        remember_outputs(SITE, haxelib_paths)
      end
      build_paths = (resources_changed || haxelib_changed || @retry_requested || @pending) ? update_resources(haxelib_changed) : []
      commit_outputs(SITE, public_paths + haxelib_paths + build_paths + (build_paths.empty? ? [] : [manifest]),
                     'Update site data')
    end
  end
end

if $PROGRAM_NAME == __FILE__
begin
  mode = ENV['HXAPE_SITE_EXPORT']
  raise "Неизвестное HXAPE_SITE_EXPORT=#{mode}" if mode && !%w[skip generated].include?(mode)
  exit if mode

  # Git передаёт hook локальные пути репозитория; транспортные настройки доступа сохраняются.
  local_names, local_error, local_status = Open3.capture3('git', 'rev-parse', '--local-env-vars')
  raise "Git: #{local_error.strip}" unless local_status.success?
  local_names.lines.each { |name| ENV.delete(name.strip) }
  args = ARGV.dup
  retry_requested = args.shift == '--retry' if args.first == '--retry'
  raise 'Использование: ruby cli/post-commit.rb [--retry <проект>]' if args.length > 1

  org = Organization.new
  project = args.first || org.projects.keys.find do |name|
    tree = org.tree(name)
    File.directory?(tree) && File.realpath(tree) == File.realpath(Dir.pwd)
  end
  project = 'org' if project == '.'
  raise 'Текущий каталог не зарегистрирован как проект' unless project && org.projects.value?(project == 'org' ? '.' : project)

  node = org.node(project)
  git_dir = Open3.capture3('git', '-C', node, 'rev-parse', '--absolute-git-dir').first.strip
  rewriting = %w[rebase-merge rebase-apply].any? { |name| File.directory?(File.join(git_dir, name)) }
  reflog = Open3.capture3('git', '-C', node, 'reflog', '-1', '--format=%gs', 'HEAD').first.strip
  skip_rewrite = !retry_requested && (rewriting || reflog.start_with?('commit (amend):', 'rebase '))

  site_git_dir = Open3.capture3('git', '-C', org.node('hxape.github.io'),
                                'rev-parse', '--absolute-git-dir').first.strip
  File.open(File.join(site_git_dir, 'hxape-site-export.lock'), File::RDWR | File::CREAT, 0o644) do |lock|
    lock.flock(File::LOCK_EX)
    SitePostCommit.new(project, retry_requested: retry_requested).run(skip_rewrite: skip_rewrite)
  end
rescue StandardError => error
  warn "post-commit: #{error.message}"
  command = [RbConfig.ruby, File.expand_path(__FILE__), '--retry', project || '<проект>'].map { |part| Shellwords.escape(part) }.join(' ')
  warn "Исходный коммит сохранён. После устранения причины повторите: #{command}"
  exit 1
end
end
