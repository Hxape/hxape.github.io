#!/usr/bin/env ruby
# frozen_string_literal: true

# Собирает сайт при изменении исходных .mjs и HTML, последовательно обновляя JS и список ресурсов.
require 'rbconfig'

abort 'Использование: ruby cli/watch-build.rb' unless ARGV.empty?
$stdout.sync = true
site = File.realpath(File.join(__dir__, '..'))

# Время, размер и inode обнаруживают сохранение и замену файла; новые и удалённые пути меняют состав.
def source_state(site)
  Dir.glob(['src/**/*.mjs', 'cli/build.mjs', 'public/html/**/*.html'], base: site).each_with_object({}) do |path, state|
    stat = File.stat(File.join(site, path))
    state[path] = [stat.mtime, stat.size, stat.ino]
  rescue Errno::ENOENT
    # Редактор мог удалить или заменить файл между поиском пути и чтением его состояния.
    next
  end
end

# Ошибка не завершает наблюдение; следующая правка снова запускает существующие команды выпуска.
def rebuild(site)
  puts 'Сборка сайта…'
  unless system('bun', 'cli/build.mjs', chdir: site)
    warn 'Сборка не выполнена; ожидание следующей правки.'
    return
  end
  unless system(RbConfig.ruby, 'cli/export-resources.rb', chdir: site)
    warn 'Список ресурсов не обновлён; ожидание следующей правки.'
  end
end

begin
  observed = source_state(site)
  rebuild(site)
  puts 'Наблюдение за src/**/*.mjs, cli/build.mjs и public/html/**/*.html. Остановка: Ctrl+C.'
  loop do
    sleep 0.2
    current = source_state(site)
    next if current == observed

    # Короткая пауза объединяет сохранения; состояние до сборки сохраняет правки во время её работы.
    sleep 0.2
    next unless current == source_state(site)

    observed = current
    rebuild(site)
  end
rescue Interrupt
  puts
  puts 'Наблюдение остановлено.'
  exit 130
end
