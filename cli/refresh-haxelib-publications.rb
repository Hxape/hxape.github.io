#!/usr/bin/env ruby
# frozen_string_literal: true

require 'cgi'
require 'base64'
require 'json'
require 'net/http'
require 'pathname'
require 'tempfile'
require 'time'
require 'timeout'
require 'uri'

class PublicationRefresh
  class LookupFailure < StandardError; end
  Response = Struct.new(:status, :headers, :body, keyword_init: true)
  MAX_PAGES = 3
  MAX_CANDIDATES = 20
  PAGE_SIZE = 100
  MAX_BYTES = 262_144

  class Http
    def get(uri, limit:)
      request = Net::HTTP::Get.new(uri, 'Accept' => uri.host == 'api.github.com' ? 'application/vnd.github+json' : 'text/html',
                                        'User-Agent' => 'Hxape-site-publications')
      Timeout.timeout(20) do
        Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 8) do |http|
          http.request(request) do |response|
            body = +''
            response.read_body do |part|
              body << part
              raise LookupFailure, 'Ответ превышает ограничение' if body.bytesize > limit
            end
            Response.new(status: response.code.to_i, headers: response.to_hash, body: body)
          end
        end
      end
    end
  end

  class Version
    include Comparable
    attr_reader :text

    def initialize(tag)
      match = /\A[vV]?(\d+(?:\.\d+)*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?\z/.match(tag)
      raise ArgumentError, 'Неверная версия' unless match

      numbers = match[1].split('.')
      raise ArgumentError, 'Ведущий ноль' if numbers.any? { |part| part.length > 1 && part.start_with?('0') }
      numbers.pop while numbers.length > 3 && numbers.last == '0'
      raise ArgumentError, 'Слишком много частей версии' if numbers.length > 3

      @numbers = numbers.map(&:to_i).fill(0, numbers.length...3)
      @prerelease = match[2]&.split('.')
      raise ArgumentError, 'Ведущий ноль в предварительной версии' if @prerelease&.any? { |part| part.match?(/\A0\d+\z/) }
      @text = "#{@numbers.join('.')}#{match[2] ? "-#{match[2]}" : ''}#{match[3] ? "+#{match[3]}" : ''}"
    end

    def <=>(other)
      order = @numbers <=> other.numbers
      return order unless order.zero?

      right = other.prerelease
      return 0 if @prerelease.nil? && right.nil?
      return 1 if @prerelease.nil?
      return -1 if right.nil?

      @prerelease.zip(right).each do |left, value|
        return 1 if value.nil?
        left_number = left.match?(/\A\d+\z/)
        right_number = value.match?(/\A\d+\z/)
        order = if left_number && right_number
                  left.to_i <=> value.to_i
                elsif left_number != right_number
                  left_number ? -1 : 1
                else
                  left <=> value
                end
        return order unless order.zero?
      end
      @prerelease.length <=> right.length
    end

    protected

    attr_reader :numbers, :prerelease
  end

  def initialize(index_path:, output_path:, http: Http.new, now: -> { Time.now.utc })
    @index_path = Pathname.new(index_path)
    @output_path = Pathname.new(output_path)
    @http = http
    @now = now
  end

  def run
    index = JSON.parse(@index_path.read).fetch('libraries')
    raise 'Некорректный каталог библиотек' unless index.is_a?(Array)

    old = @output_path.file? ? JSON.parse(@output_path.read) : {}
    previous = Array(old['libraries']).to_h { |entry| [entry.fetch('name'), entry] }
    names = []
    failures = []
    libraries = index.map do |entry|
      name = entry.fetch('name')
      raise "Некорректная библиотека: #{name.inspect}" unless name.is_a?(String) && name.match?(/\A[A-Za-z0-9][A-Za-z0-9_.-]*\z/) && !names.include?(name)
      names << name
      source = entry.fetch('installation').fetch('source')
      raise "Неизвестный источник установки: #{name}" unless %w[haxelib github unknown].include?(source)
      next unless source == 'haxelib'

      installed = Version.new(entry.fetch('version'))
      owner, repository = github_repository(entry.fetch('url'))
      package_path = validate_package_path(entry.fetch('packagePath'))
      prior = previous[name]
      begin
        publication = latest(name, installed, owner, repository, package_path)
        { name: name, installedVersion: entry.fetch('version'), installationSource: source,
          repositoryUrl: entry.fetch('url'), packagePath: package_path, checkedAt: @now.call.utc.iso8601,
          status: publication ? (publication[:source] == 'github' ? 'github' : 'confirmed') : 'none',
          publication: publication }.compact
      rescue StandardError => error
        warn "#{name}: публикации не проверены: #{error.message}"
        failures << name
        if valid_prior?(prior, name, entry['version'], source, entry['url'], package_path, owner, repository)
          prior
        else
          { name: name, installedVersion: entry.fetch('version'), installationSource: source,
            repositoryUrl: entry.fetch('url'), packagePath: package_path, checkedAt: nil, status: 'unknown' }
        end
      end
    end.compact
    write_json(version: 1, libraries: libraries)
    raise LookupFailure, "Не проверены публикации: #{failures.join(', ')}" unless failures.empty?
  end

  private

  def github_repository(value)
    uri = URI(value)
    parts = uri.path.split('/').reject(&:empty?)
    unless uri.is_a?(URI::HTTPS) && uri.host == 'github.com' && uri.port == 443 &&
           uri.userinfo.nil? && uri.query.nil? && uri.fragment.nil? && parts.length == 2 &&
           parts.all? { |part| part.match?(/\A[A-Za-z0-9_.-]+\z/) && !%w[. ..].include?(part) }
      raise 'Некорректный адрес GitHub'
    end
    parts
  end

  def validate_package_path(value)
    raise 'Некорректный путь пакета' unless value.is_a?(String) &&
      (value.empty? || (value.split('/').all? { |part| part.match?(/\A[A-Za-z0-9_.-]+\z/) && !%w[. ..].include?(part) } &&
                        !value.start_with?('/') && !value.end_with?('/') && !value.include?('//')))
    value
  end

  def latest(name, installed, owner, repository, package_path)
    candidates = tags(owner, repository).map do |tag|
      begin
        version = Version.new(tag)
        [version, tag] if version > installed
      rescue ArgumentError
        nil
      end
    end.compact.sort_by { |version, tag| [version, tag] }.reverse.uniq { |version, _| version.text }
    return nil if candidates.empty?

    candidates.first(MAX_CANDIDATES).each do |version, _tag|
      page = URI("https://lib.haxe.org/p/#{name}/#{URI::DEFAULT_PARSER.escape(version.text)}/")
      response = @http.get(page, limit: MAX_BYTES)
      next if response.status == 404
      raise LookupFailure, "Haxelib: HTTP #{response.status}" unless response.status == 200
      raise LookupFailure, 'Haxelib: неожиданный тип ответа' unless content_type(response).start_with?('text/html')

      title = response.body[/<title\b[^>]*>(.*?)<\/title>/im, 1]
      title = CGI.unescapeHTML(title.to_s.gsub(/<[^>]*>/, '')).strip
      unless title.match?(/\A#{Regexp.escape(name)}\s*\(#{Regexp.escape(version.text)}\)(?:\s*[-|].*)?\z/i)
        raise LookupFailure, 'Haxelib: страница не подтверждает точную версию'
      end
      return { source: 'haxelib', version: version.text, url: page.to_s }
    end
    raise LookupFailure, 'Предел кандидатных версий достигнут' if candidates.length > MAX_CANDIDATES

    version, tag = candidates.first
    return nil unless tag_matches_package?(name, version, tag, owner, repository, package_path)

    { source: 'github', version: version.text, tag: tag,
      url: "https://github.com/#{owner}/#{repository}/tree/#{URI::DEFAULT_PARSER.escape(tag)}" }
  end

  def tag_matches_package?(name, version, tag, owner, repository, package_path)
    path = [package_path, 'haxelib.json'].reject(&:empty?).join('/')
    url = URI("https://api.github.com/repos/#{owner}/#{repository}/contents/#{path}?#{URI.encode_www_form(ref: tag)}")
    response = @http.get(url, limit: MAX_BYTES)
    return false if response.status == 404
    raise LookupFailure, "GitHub: HTTP #{response.status}" unless response.status == 200
    raise LookupFailure, 'GitHub: неожиданный тип ответа' unless content_type(response).include?('json')

    file = JSON.parse(response.body)
    unless file.is_a?(Hash) && file['type'] == 'file' && file['path'] == path &&
           file['encoding'] == 'base64' && file['content'].is_a?(String)
      raise LookupFailure, 'GitHub: неверные сведения о haxelib.json'
    end
    decoded = begin
      Base64.strict_decode64(file['content'].delete(" \t\r\n"))
    rescue ArgumentError
      raise LookupFailure, 'GitHub: неверная кодировка haxelib.json'
    end
    metadata = JSON.parse(decoded)
    return false unless metadata.is_a?(Hash) && metadata['name'] == name && metadata['version'].is_a?(String)

    begin
      Version.new(metadata['version']) == version
    rescue ArgumentError
      false
    end
  end

  def tags(owner, repository)
    path = "/repos/#{owner}/#{repository}/tags"
    url = URI("https://api.github.com#{path}?per_page=#{PAGE_SIZE}&page=1")
    result = []
    MAX_PAGES.times do |index|
      response = @http.get(url, limit: MAX_BYTES)
      raise LookupFailure, "GitHub: HTTP #{response.status}" unless response.status == 200
      raise LookupFailure, 'GitHub: неожиданный тип ответа' unless content_type(response).include?('json')
      values = JSON.parse(response.body)
      raise LookupFailure, 'GitHub: неверный список тегов' unless values.is_a?(Array) && values.all? { |item| item.is_a?(Hash) && item['name'].is_a?(String) }
      result.concat(values.map { |item| item.fetch('name') })
      link = header(response, 'link')
      next_url = link[/<([^>]+)>;\s*rel="next"/, 1]
      return result unless next_url
      raise LookupFailure, 'GitHub: предел страниц достигнут' if index + 1 == MAX_PAGES

      url = URI(next_url)
      query = URI.decode_www_form(url.query.to_s).to_h
      unless url.is_a?(URI::HTTPS) && url.host == 'api.github.com' && url.path == path && url.port == 443 &&
             url.userinfo.nil? && url.fragment.nil? && query == { 'per_page' => PAGE_SIZE.to_s, 'page' => (index + 2).to_s }
        raise LookupFailure, 'GitHub: неверный адрес следующей страницы'
      end
    end
    result
  end

  def header(response, name)
    value = response.headers[name] || response.headers[name.capitalize]
    Array(value).join(', ')
  end

  def content_type(response)
    header(response, 'content-type').downcase
  end

  def valid_prior?(entry, name, installed_version, source, repository_url, package_path, owner, repository)
    return false unless entry.is_a?(Hash) && entry['name'] == name && entry['installedVersion'] == installed_version &&
                        entry['installationSource'] == source && entry['repositoryUrl'] == repository_url &&
                        entry['packagePath'] == package_path &&
                        entry['checkedAt'].is_a?(String) && %w[confirmed github none].include?(entry['status'])
    Time.iso8601(entry['checkedAt'])
    publication = entry['publication']
    return publication.nil? if entry['status'] == 'none'
    return false unless publication.is_a?(Hash) && publication['version'].is_a?(String) &&
                        %w[haxelib github].include?(publication['source'])
    return false unless (entry['status'] == 'confirmed') == (publication['source'] == 'haxelib')

    version = Version.new(publication['version'])
    return false unless version.text == publication['version']
    expected = case publication['source']
               when 'haxelib'
                 "https://lib.haxe.org/p/#{name}/#{URI::DEFAULT_PARSER.escape(version.text)}/"
               when 'github'
                 tag = publication['tag']
                 return false unless tag.is_a?(String) && Version.new(tag) == version
                 "https://github.com/#{owner}/#{repository}/tree/#{URI::DEFAULT_PARSER.escape(tag)}"
               end
    publication['url'] == expected && (entry['status'] != 'github' || publication['source'] == 'github')
  rescue ArgumentError, TypeError
    false
  end

  def write_json(data)
    raise 'Выходной путь является ссылкой' if @output_path.symlink?
    @output_path.dirname.mkpath
    content = JSON.pretty_generate(data) + "\n"
    return if @output_path.file? && @output_path.read == content

    Tempfile.create(['.publications-', '.json'], @output_path.dirname.to_s) do |file|
      file.write(content)
      file.flush
      file.fsync
      File.rename(file.path, @output_path)
    end
  end
end

if $PROGRAM_NAME == __FILE__
  root = Pathname.new(__dir__).parent
  abort 'Использование: ruby cli/refresh-haxelib-publications.rb' unless ARGV.empty?
  PublicationRefresh.new(index_path: root / 'public/json/haxelib/index.json',
                         output_path: root / 'public/json/haxelib/publications.json').run
end
