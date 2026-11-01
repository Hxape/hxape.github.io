#!/usr/bin/env ruby
# Выполняет выбранную местную сборку или экспорт сайта; публикацию не запускает.
require 'json'

if ARGV.first == '--task-options'
  abort 'Для --task-options нужна одна JSON-строка' unless ARGV.length == 2
  begin
    options = JSON.parse(ARGV.fetch(1))
  rescue JSON::ParserError => error
    abort "Не прочитаны параметры задачи: #{error.message}"
  end
  keys = %w[configuration platform source]
  abort 'Ожидаются только строковые configuration, platform и source' unless options.is_a?(Hash) && options.keys.sort == keys.sort && options.values.all? { |value| value.is_a?(String) }
  ARGV.replace(keys.map { |key| options.fetch(key) })
end
configuration, platform, source = ARGV
abort 'Ожидаются конфигурация, browser и путь src' unless ARGV.length == 3 && %w[site code resources source private].include?(configuration) && platform == 'browser'
project = File.expand_path('..', __dir__)
Dir.chdir(project)
case configuration
when 'site'
  abort 'Сборка JS и HTML завершилась ошибкой' unless system('bun', 'cli/build.mjs')
  exec('ruby', 'cli/export-resources.rb')
when 'code' then exec('bun', 'cli/build.mjs')
when 'resources' then exec('ruby', 'cli/export-resources.rb')
when 'source'
  Dir.chdir(File.dirname(project))
  exec('ruby', File.join(project, 'cli/export-repository.rb'), source)
when 'private'
  Dir.chdir(File.dirname(project))
  exec('ruby', File.join(project, 'cli/update-private-trees.rb'))
end
