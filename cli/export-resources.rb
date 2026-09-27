#!/usr/bin/env ruby
# frozen_string_literal: true

require 'digest'
require 'fileutils'
require 'json'
require 'pathname'
require 'tempfile'

abort 'Usage: ruby cli/export-resources.rb [snapshot-directory]' if ARGV.length > 1
site = Pathname.new(__dir__).parent.realpath
root = ARGV.empty? ? site : Pathname.new(ARGV.fetch(0)).realpath
abort 'Snapshot directory must differ from the live site' if !ARGV.empty? && root == site
abort 'Selected root is not a directory' unless root.directory?
manifest = root.join('public/json/resources.json')
build_path = root.join('public/json/build.json')
abort 'Missing public/json/build.json' unless build_path.file? && !build_path.symlink?
build = JSON.parse(build_path.read)
entries = { 'theme' => 'public/js/theme-boot.mjs', 'bootstrap' => 'public/js/bootstrap.mjs',
            'main' => 'public/js/main.mjs', 'worker' => 'public/js/octocat.mjs' }
outputs = build['outputs']
html = build['html']
expected_outputs = %w[bootstrap main octocat releases shared source-view theme-boot tokens].map { |name| "public/js/#{name}.mjs" }.sort
expected_html = %w[bookmarks catalog document-panel footer header history preferences search source-view token-manager].map { |name| "public/html/#{name}.html" }.sort
unless build['version'] == 1 && build['entries'] == entries && outputs.is_a?(Array) &&
       outputs == expected_outputs && html == expected_html
  abort 'Invalid public/json/build.json'
end
patterns = %w[public/css/**/*.css public/html/**/*.html vendor/brand-assets/*.svg public/icons/*]
paths = %w[index.html manifest.json public/json/site.json public/json/build.json public/json/haxelib/index.json
           public/json/haxelib/publications.json
           vendor/lit-3.3.3/lit-core.min.js]
patterns.each { |pattern| paths.concat(Dir.glob(pattern, base: root.to_s)) }
paths.concat(outputs)
paths.concat(html)
paths = paths.uniq.sort.select { |path| root.join(path).file? }
required = %w[index.html manifest.json public/json/site.json public/json/build.json public/json/haxelib/index.json
              public/json/haxelib/publications.json
              public/css/site.css public/css/atoms.css public/css/no-script.css public/css/icons.css public/css/tokens.css
              public/css/table-resize.css public/css/preferences.css public/css/source.css public/css/navigation.css
              vendor/lit-3.3.3/lit-core.min.js
              vendor/brand-assets/GitHub_Invertocat_Black.svg vendor/brand-assets/GitHub_Invertocat_White.svg
              public/icons/hxape.svg public/icons/hxape-192.png public/icons/hxape-512.png
              public/icons/apple-touch-icon.png] + outputs + html
raise 'Missing required site resource' unless required.all? { |path| paths.include?(path) }
resources = paths.map do |path|
  file = root.join(path)
  raise "Resource leaves the site: #{path}" if file.symlink? || !file.realpath.to_s.start_with?(root.to_s + '/')
  { path: path, sha256: Digest::SHA256.file(file).hexdigest }
end
output = JSON.pretty_generate({ version: 1, resources: resources }) + "\n"
abort 'Manifest directory is a symbolic link' if manifest.dirname.parent.symlink? || manifest.dirname.symlink?
FileUtils.mkdir_p(manifest.dirname)
abort 'Manifest directory leaves the selected root' unless manifest.dirname.realpath.to_s.start_with?(root.to_s + '/')
abort 'Manifest path is a symbolic link' if manifest.symlink?
if !manifest.file? || manifest.read != output
  Tempfile.create(['.resources-', '.json'], manifest.dirname.to_s) do |file|
    file.write(output)
    file.flush
    file.fsync
    File.rename(file.path, manifest)
  end
end
puts "#{manifest}: #{resources.length} resources"
