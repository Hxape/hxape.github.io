#!/usr/bin/env ruby
# frozen_string_literal: true

require 'digest'
require 'json'
require 'net/http'
require 'open3'
require 'stringio'
require 'uri'
require_relative 'export-repository'

ROOT = File.expand_path('../..', __dir__)
CATALOG = File.join(ROOT, 'agents/skills/projects/projects.tsv')

def public_repositories
  names = []
  page = 1
  loop do
    uri = URI("https://api.github.com/orgs/Hxape/repos?type=public&per_page=100&page=#{page}")
    request = Net::HTTP::Get.new(uri)
    request['Accept'] = 'application/vnd.github+json'
    request['User-Agent'] = 'Hxape-site-exporter'
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 20) do |http|
      http.request(request)
    end
    raise "GitHub не подтвердил видимость репозиториев: HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

    entries = JSON.parse(response.body)
    raise 'GitHub вернул неверный список репозиториев' unless entries.is_a?(Array)

    names.concat(entries.map { |entry| entry.fetch('name') })
    break if entries.length < 100

    page += 1
  end
  names
end

def public_repository?(name)
  uri = URI("https://api.github.com/repos/Hxape/#{URI.encode_www_form_component(name)}")
  request = Net::HTTP::Get.new(uri)
  request['Accept'] = 'application/vnd.github+json'
  request['User-Agent'] = 'Hxape-site-exporter'
  response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 10, read_timeout: 20) { |http| http.request(request) }
  return true if response.is_a?(Net::HTTPSuccess)
  return false if response.code == '404'

  raise "GitHub не подтвердил видимость #{name}: HTTP #{response.code}"
end

def github_origin(project)
  output, _error, status = Open3.capture3('git', '-C', project, 'remote', 'get-url', 'origin')
  return nil unless status.success?

  output.strip.match(%r{\A(?:https://github\.com/|git@github\.com:|ssh://git@github\.com/)(Hxape)/([^/]+?)(?:\.git)?/?\z}i)&.captures&.last
end

def digest_file(path)
  File.file?(path) ? Digest::SHA256.file(path).hexdigest : nil
end

def retained_tree(output, checksum, before)
  after = [digest_file(output), digest_file(checksum)]
  return 'дерева нет' if after == [nil, nil]
  return 'прежнее дерево сохранено' if before == after && before.first &&
                                      File.file?(checksum) && File.read(checksum).strip == before.first

  'пара JSON/SHA-256 требует проверки'
rescue StandardError
  'пара JSON/SHA-256 требует проверки'
end

def update(project, name)
  src = File.join(project, 'src')
  output = File.join(project, '.private', 'site.json')
  checksum = File.join(project, '.private', 'site.sha256')
  return [name, 'ОСТАЛОСЬ', 'каталог src отсутствует'] unless File.directory?(src)
  return [name, 'ОСТАЛОСЬ', 'в src нет файлов .hx'] if Dir.glob(File.join(src, '**', '*.hx')).empty?

  before = [digest_file(output), digest_file(checksum)]
  status, error, result = Open3.capture3('git', '-C', project, 'status', '--porcelain', '--untracked-files=all')
  return [name, 'ОСТАЛОСЬ', error] unless result.success?
  allowed = %w[.private/site.json .private/site.sha256]
  dirty = status.lines.any? { |line| !allowed.include?(line[3..].to_s.strip) || !['??', ' M'].include?(line[0, 2]) }
  return [name, 'ОСТАЛОСЬ', "исходники не зафиксированы; #{retained_tree(output, checksum, before)}"] if dirty

  log = StringIO.new
  original = $stdout
  begin
    return [name, 'ПРОПУЩЕНО', 'репозиторий открыт на GitHub'] if public_repository?(name)

    $stdout = log
    export_repository(src, private_output: true, verified_private: true)
    after = [digest_file(output), digest_file(checksum)]
    [name, before == after ? 'БЕЗ ИЗМЕНЕНИЙ' : 'ОБНОВЛЕНО', log.string.lines.last.to_s.strip]
  rescue SourceParseError => error
    [name, 'ОШИБКА РАЗБОРА', "#{error.message}; #{retained_tree(output, checksum, before)}"]
  rescue StandardError => error
    [name, 'ОСТАЛОСЬ', "#{error.message}; #{retained_tree(output, checksum, before)}"]
  ensure
    $stdout = original
  end
end

begin
  only = ARGV.shift(2).last if ARGV.first == '--only'
  abort 'Использование: ruby hxape.github.io/cli/update-private-trees.rb [--only <репозиторий>]' if ARGV.any? || only == '--only'
  public_names = public_repositories.map(&:downcase)
  rows = File.readlines(CATALOG, chomp: true).reject { |line| line.empty? || line.start_with?('#') }
  rows.select! { |line| line.split("\t", 2).first == only } if only
  raise "Проект #{only} не зарегистрирован" if only && rows.empty?
  results = rows.map do |line|
    path = line.split("\t", 2).first
    next if path == '.'

    project = File.join(ROOT, path)
    next [path, 'ПРОПУЩЕНО', 'нет локального Git-корня'] unless File.exist?(File.join(project, '.git'))

    name = github_origin(project)
    next [path, 'ПРОПУЩЕНО', 'origin не указывает на репозиторий Hxape'] unless name

    if public_names.include?(name.downcase)
      [name, 'ПРОПУЩЕНО', 'репозиторий открыт на GitHub']
    else
      update(project, name)
    end
  end.compact
  results.each { |name, state, detail| puts "#{state}\t#{name}\t#{detail}" }
  puts "Итого: обновлено #{results.count { |row| row[1] == 'ОБНОВЛЕНО' }}, без изменений #{results.count { |row| row[1] == 'БЕЗ ИЗМЕНЕНИЙ' }}, осталось #{results.count { |row| row[1] == 'ОСТАЛОСЬ' }}, пропущено #{results.count { |row| row[1] == 'ПРОПУЩЕНО' }}, ошибок разбора #{results.count { |row| row[1] == 'ОШИБКА РАЗБОРА' }}."
  exit 1 if results.any? { |row| %w[ОСТАЛОСЬ ОШИБКА\ РАЗБОРА].include?(row[1]) }
rescue StandardError => error
  warn "Обновление не начато: #{error.message}"
  exit 1
end
