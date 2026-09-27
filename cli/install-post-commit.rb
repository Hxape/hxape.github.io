#!/usr/bin/env ruby
# frozen_string_literal: true

require 'csv'
require 'fileutils'
require 'json'
require 'open3'
require 'pathname'
require 'tempfile'
require_relative '../../agents/lib/organization'

def install_post_commit(organization: Organization.new, check: false,
                        hook_path: File.join(__dir__, 'post-commit.rb'),
                        template_path: File.join(__dir__, 'hooks/post-commit.rb.in'))
  local_names, local_error, local_status = Open3.capture3('git', 'rev-parse', '--local-env-vars')
  raise "Git: #{local_error.strip}" unless local_status.success?
  saved = local_names.lines.map(&:strip).to_h { |name| [name, ENV.delete(name)] }
  org = organization
  hook = File.realpath(hook_path)
  template = File.binread(template_path)
  raise "Файл hook не исполняемый: #{hook}" unless File.executable?(hook)

  table = CSV.read(File.join(org.root, 'agents/skills/projects/projects.tsv'), headers: true, col_sep: "\t")
  projects = table.map do |row|
    path = row['# path']
    next unless row['lifecycle'] == 'active' && path != '.' && File.exist?(File.join(org.tree(path), '.git'))
    next unless path == 'hxape.github.io' || Dir.glob(File.join(org.tree(path), 'src/**/*.hx')).any?

    path
  end.compact

  skipped = 0
  projects.each do |project|
    node = org.node(project)
    _value, _error, configured = Open3.capture3('git', '-C', node, 'config', '--get', 'core.hooksPath')
    if configured.success?
      warn "ПРОПУЩЕНО\t#{project}\tcore.hooksPath уже задан"
      skipped += 1
      next
    end

    output, error, result = Open3.capture3('git', '-C', node, 'rev-parse', '--git-path', 'hooks/post-commit')
    raise "#{project}: #{error.strip}" unless result.success?

    destination = File.expand_path(output.strip, node)
    relative = Pathname.new(hook).relative_path_from(Pathname.new(File.dirname(destination))).to_s
    expected = template.sub('@SCRIPT@', relative.dump)
    if File.file?(destination) && !File.symlink?(destination) && File.binread(destination) == expected &&
       File.executable?(destination)
      puts "УЖЕ УСТАНОВЛЕН\t#{project}"
    elsif File.exist?(destination) || File.symlink?(destination)
      warn "ПРОПУЩЕНО\t#{project}\tpost-commit уже занят: #{destination}"
      skipped += 1
    elsif check
      puts "МОЖНО УСТАНОВИТЬ\t#{project}"
    else
      FileUtils.mkdir_p(File.dirname(destination))
      File.open(destination, File::WRONLY | File::CREAT | File::EXCL, 0o755) do |file|
        file.write(expected)
        file.flush
        file.fsync
      end
      File.chmod(0o755, destination)
      puts "УСТАНОВЛЕН\t#{project}"
    end

    next if check || !File.file?(destination) || !File.executable?(destination) ||
            File.binread(destination) != expected

    git_dir, error, result = Open3.capture3('git', '-C', node, 'rev-parse', '--absolute-git-dir')
    raise "#{project}: #{error.strip}" unless result.success?

    state = File.join(git_dir.strip, 'hxape-site-export-processed.json')
    next if File.exist?(state) || File.symlink?(state)

    values = %w[HEAD HEAD^{tree}].map do |revision|
      output, failure, status = Open3.capture3('git', '-C', node, 'rev-parse', revision)
      raise "#{project}: #{failure.strip}" unless status.success?

      output.strip
    end
    branch, _failure, branch_status = Open3.capture3('git', '-C', node, 'symbolic-ref', '--quiet', '--short', 'HEAD')
    config, failure, status = Open3.capture3('git', '-C', org.node('hxape.github.io'), 'rev-parse',
                                             'HEAD:public/json/site.json')
    raise "site.json: #{failure.strip}" unless status.success?

    baseline = { 'processed' => false, 'head' => values[0], 'tree' => values[1],
                 'config' => config.strip, 'branch' => branch_status.success? ? branch.strip : nil }
    Tempfile.create(['.hxape-site-export-', '.json'], git_dir.strip) do |file|
      file.write(JSON.generate(baseline) + "\n")
      file.flush
      file.fsync
      File.rename(file.path, state)
    end
  end
  skipped
ensure
  saved&.each { |name, value| value ? ENV[name] = value : ENV.delete(name) }
end

if $PROGRAM_NAME == __FILE__
  begin
    abort 'Использование: ruby cli/install-post-commit.rb [--check]' unless ARGV.empty? || ARGV == ['--check']
    exit 1 if install_post_commit(check: ARGV == ['--check']).positive?
  rescue StandardError => error
    warn "Установка post-commit: #{error.message}"
    exit 1
  end
end
