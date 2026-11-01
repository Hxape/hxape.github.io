#!/usr/bin/env bun

/** Проверяет граф Bun, даёт восьми выходам устойчивые имена и публикует их вместе с build.json. */
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Один выход Bun до проверки его пути, роли и содержимого; принадлежит нынешней сборке во временном каталоге.
 * @typedef {object} BuildArtifact
 * @property {string} path Путь созданного Bun файла.
 * @property {string} kind Роль выхода, например entry-point или chunk; допустимость проверяет collect.
 * @property {()=>Promise<string>} text Читает полный текст созданного выхода для проверки и переименования импортов.
 */
/**
 * Данные одного выхода графа Bun, нужные для именования частей и проверки ленивых входов.
 * @typedef {object} BuildOutputGraph
 * @property {string} [entryPoint] Исходная точка входа самостоятельной части; отсутствие обозначает общий чанк.
 * @property {Record<string,unknown>} [inputs] Исходные пути, вошедшие в данный выход; статистика значений не используется.
 */
/**
 * Граф нынешнего Bun-выпуска; проверка использует пути и точки входа, не статистику байтов.
 * @typedef {object} BuildMetafile
 * @property {Record<string,unknown>} inputs Все исходные пути сборки для проверки границ воркера и ленивых частей.
 * @property {Record<string,BuildOutputGraph>} outputs Выходные пути и их данные для устойчивых имён выпуска.
 */
/**
 * Диагностика Bun, используемая только для сообщения об отказе сборки.
 * @typedef {object} BuildLog
 * @property {string} [message] Готовое сообщение; отсутствие использует текстовое представление записи.
 */
/**
 * Ответ Bun для одной точки входа до принятия проверенного состава.
 * @typedef {object} BuildResult
 * @property {boolean} success Bun завершил компиляцию успешно.
 * @property {BuildLog[]} logs Диагностика, выводимая при success=false.
 * @property {BuildArtifact[]} outputs Созданные во временном каталоге выходы.
 * @property {BuildMetafile|null} metafile Граф проверки; null запрещает публикацию даже при success=true.
 */
/**
 * Непроверенная конфигурация Octocat из JSON; принимается только прежнее имя и закреплённый путь выхода.
 * @typedef {object} WorkerSettingsInput
 * @property {unknown} [name] Должно оказаться строкой octocat.
 * @property {unknown} [output] Должно оказаться public/js/octocat.mjs.
 * @property {unknown} [protocol] Должно оказаться положительным целым номером протокола.
 */
/**
 * Один файл подготовленной установки с его прежними байтами для восстановления.
 * @typedef {object} BuildChange
 * @property {string} target Нынешний файл живого выпуска или build.json.
 * @property {Uint8Array} bytes Проверенные новые байты.
 * @property {string} staged Подготовленный файл, синхронизированный до установки.
 * @property {string|null} backup Копия прежнего файла; null означает, что файла до установки не было.
 */
/**
 * Состав принятого выпуска после установки и удаления прежних хешированных частей.
 * @typedef {object} PublishedBuild
 * @property {string[]} manifests Относительные пути нынешних восьми JS для build.json.
 * @property {string[]} htmlPaths Проверенные исходные HTML-фрагменты, не выходы Bun.
 * @property {string[]} removed Обнаруженные прежние пути JS, отсутствующие в нынешнем составе.
 */

const root = await realpath(resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..')));
const publicRoot = join(root, 'public');
const outputRoot = join(publicRoot, 'js');
const htmlRoot = join(publicRoot, 'html');
const manifestPath = join(publicRoot, 'json', 'build.json');
const htmlNames = [
  'bookmarks',
  'catalog',
  'document-panel',
  'footer',
  'header',
  'history',
  'preferences',
  'search',
  'source-view',
  'token-manager',
];
/**
 * Устойчивые имена трёх ленивых входов главного графа; состояние модулей этим не переносится.
 */
const namedChunks = new Map([
  ['src/bloc/document/source-view.mjs', 'source-view.mjs'],
  ['src/bloc/catalog/releases.mjs', 'releases.mjs'],
  ['src/bloc/tokens/index.mjs', 'tokens.mjs'],
]);
/**
 * Полный допустимый набор восьми браузерных JS; иной состав останавливает выпуск.
 */
const outputNames = new Set([
  'theme-boot.mjs',
  'bootstrap.mjs',
  'main.mjs',
  'octocat.mjs',
  'shared.mjs',
  ...namedChunks.values(),
]);
const workerSettingsPath = join(root, 'src', 'auth', 'github', 'json', 'octocat.json');
await regular(workerSettingsPath);
const workerSettingsValue = /** @type {unknown} */ (JSON.parse(await readFile(workerSettingsPath, 'utf8')));
const workerSettings = /** @type {WorkerSettingsInput|null} */
  (workerSettingsValue && typeof workerSettingsValue === 'object' ? workerSettingsValue : null);
if (
  workerSettings?.name !== 'octocat' || workerSettings.output !== 'public/js/octocat.mjs'
  || !Number.isSafeInteger(workerSettings.protocol) || workerSettings.protocol < 1
) {
  throw new Error('Неверная конфигурация src/auth/github/json/octocat.json');
}
/**
 * Четыре самостоятельных входа браузера, фиксируемые в build.json после проверки.
 */
const entries = {
  theme: 'public/js/theme-boot.mjs',
  bootstrap: 'public/js/bootstrap.mjs',
  main: 'public/js/main.mjs',
  worker: workerSettings.output,
};
/**
 * Входы, которые должны присутствовать в графе и оставаться вне тела main.
 */
const lazyInputs = [
  'src/bloc/tokens/index.mjs',
  'src/bloc/document/source-view.mjs',
  'src/bloc/catalog/releases.mjs',
];
/**
 * Точный разрешённый состав автономного Octocat; новые зависимости принимаются только явным именем.
 */
const workerInputs = new Set([
  'src/auth/github/octocat.mjs',
  'src/auth/github/crypto.mjs',
  'src/auth/github/interceptor.mjs',
  'src/auth/github/json/octocat.json',
  'src/common/network/document-path.mjs',
  'src/common/network/json/source-limits.json',
]);
/**
 * Локальный анализатор JS-импортов/экспортов для проверки закрытости каждого выхода.
 */
const scanner = new Bun.Transpiler({ loader: 'js', target: 'browser' });
const licenseNotice = '/*! Third-party material in this build: Marked (MIT), DOMPurify (Apache-2.0), '
  + 'github-slugger (ISC), Bootstrap Icons (MIT), VS Code Codicons (CC BY 4.0), HTMX 2.0.11 (0BSD, adapted). '
  + 'Licenses and sources: vendor/SOURCES.md. */';
const fragmentLicenseNotice = '/*! Adapted from HTMX 2.0.11 (0BSD). Licenses and sources: vendor/SOURCES.md. */';

const bunVersion = Bun.version.split(/[.-]/).slice(0, 3).map(Number);
if (
  bunVersion.length !== 3 || bunVersion.some((part) => !Number.isInteger(part))
  || bunVersion[0] < 1 || (bunVersion[0] === 1 && (bunVersion[1] < 4 || (bunVersion[1] === 4 && bunVersion[2] < 2)))
) {
  throw new Error(`Нужен Bun версии 1.4.2 или новее, сейчас ${Bun.version}`);
}
if (process.argv.length > 3) throw new Error('Использование: bun cli/build.mjs [корень-снимка]');

/**
 * Требует обычный файл без символической ссылки перед чтением, проверкой или установкой.
 * @param {string} path Полный путь к входу, ресурсу либо прежнему выходу.
 * @returns {Promise<void>} Успех подтверждает нынешний обычный файл.
 * @throws {Error} Если файл отсутствует, является ссылкой или имеет другую роль.
 */
async function regular(path) {
  const entry = await lstat(path);
  if (!entry.isFile() || entry.isSymbolicLink()) throw new Error(`Ожидался обычный файл: ${path}`);
}

/**
 * Читает только обычный файл; отсутствие допускается для ещё не созданного выхода.
 * @param {string} path Полный путь будущего или прежнего файла.
 * @returns {Promise<import("node:buffer").Buffer|null>} Прежние точные байты; null только при ENOENT.
 * @throws {Error} Иной отказ чтения или проверки файла передаётся вызывающему.
 */
async function bytesOrNull(path) {
  try {
    await regular(path);
    return await readFile(path);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Подготавливает новые байты и синхронизирует файл до его будущего rename в живой выпуск.
 * @param {string} path Путь подготовленного файла в нынешнем временном каталоге.
 * @param {Uint8Array} bytes Полные новые байты проверенного выхода либо манифеста.
 * @returns {Promise<void>} Дескриптор закрывается также при отказе sync.
 * @throws {Error} При отказе записи, открытия, синхронизации или закрытия.
 */
async function durableWrite(path, bytes) {
  await writeFile(path, bytes);
  const handle = await open(path, 'r+');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/**
 * Собирает одну точку входа во временном каталоге и требует граф Bun до последующих проверок.
 * @param {string} input Исходный путь относительно root.
 * @param {string} expected Закреплённое имя главного выхода этой точки.
 * @param {string} outdir Отдельный временный каталог этой сборки.
 * @param {'iife'|'esm'} format Самостоятельный classic либо главный ES-граф.
 * @param {boolean} splitting Разрешить разделение только главного ES-графа.
 * @returns {Promise<BuildResult>} Успешные выходы и ненулевой граф, ещё не опубликованные.
 * @throws {Error} При отказе Bun, отсутствующем входе или отсутствии графа.
 */
async function build(input, expected, outdir, format, splitting) {
  const source = join(root, input);
  await regular(source);
  const result = /** @type {BuildResult} */ (await Bun.build({
    entrypoints: [source],
    root,
    outdir,
    target: 'browser',
    format,
    splitting,
    minify: false,
    modulePreload: false,
    sourcemap: 'none',
    metafile: true,
    external: format === 'esm' ? ['lit'] : [],
    banner: format === 'esm' ? licenseNotice : expected === 'bootstrap.mjs' ? fragmentLicenseNotice : '',
    naming: { entry: expected, chunk: 'chunk-[hash].mjs', asset: 'asset-[hash].[ext]' },
  }));
  if (!result.success) {
    throw new Error(`Bun не собрал ${input}: ${result.logs.map((item) => item.message || String(item)).join('\n')}`);
  }
  if (!result.metafile) throw new Error(`Bun не вернул граф сборки ${input}`);
  return result;
}

/**
 * Принимает только ожидаемую точку и части в её временном каталоге; classic запрещает ESM и разделение.
 * @param {BuildResult} result Успешный ответ одной сборки Bun.
 * @param {string} outdir Разрешённый временный каталог её файлов.
 * @param {string} entryName Ожидаемое имя единственной точки входа.
 * @param {boolean} classic Требовать один самостоятельный выход без import/export.
 * @returns {Promise<Map<string,Uint8Array>>} Проверенные прежние имена Bun и их точные байты.
 * @throws {Error} При неизвестном пути/роли, неверном составе, ESM classic или утраченном уведомлении о лицензиях.
 */
async function collect(result, outdir, entryName, classic) {
  /**
   * Проверенные выходы текущей операции до именования и установки; предыдущий живой выпуск сюда не входит.
   * @type {Map<string,Uint8Array>}
   */
  const files = new Map();
  let entryCount = 0;
  for (const artifact of result.outputs) {
    const path = resolve(artifact.path);
    const name = relative(outdir, path);
    if (
      !name || name.startsWith(`..${sep}`) || name === '..' || isAbsolute(name) || name.includes(sep)
      || !/^(?:theme-boot|bootstrap|main|octocat|chunk-[a-z0-9]{8,13})\.mjs$/.test(name)
    ) {
      throw new Error(`Неожиданный выход Bun: ${artifact.path}`);
    }
    if (artifact.kind === 'entry-point') {
      if (name !== entryName) throw new Error(`Неверная точка входа: ${name}`);
      entryCount++;
    } else if (classic || artifact.kind !== 'chunk' || !name.startsWith('chunk-')) {
      throw new Error(`Неверный вид выхода: ${name} (${artifact.kind})`);
    }
    const text = await artifact.text();
    const scanned = scanner.scan(text);
    if (classic && (scanned.exports.length || scanned.imports.length)) {
      throw new Error(`Самостоятельный выход содержит ESM import/export: ${name}`);
    }
    if (!classic && !text.includes('Third-party material in this build')) {
      throw new Error(`В выходе нет уведомления о зависимостях: ${name}`);
    }
    if (entryName === 'bootstrap.mjs' && !text.includes(fragmentLicenseNotice)) {
      throw new Error('В bootstrap нет уведомления об исходнике HTMX');
    }
    if (files.has(name)) throw new Error(`Повторный выход Bun: ${name}`);
    files.set(name, new TextEncoder().encode(text));
  }
  if (entryCount !== 1 || (classic && files.size !== 1)) throw new Error(`Неверный состав сборки ${entryName}`);
  return files;
}

/**
 * Проверяет наличие заданного исходного пути в полном графе с нормализацией разделителей Bun.
 * @param {BuildMetafile} metafile Граф нынешней сборки.
 * @param {string} name Проверяемый путь исходника относительно root.
 * @returns {boolean} true при точном пути или его полном суффиксе в абсолютном пути.
 */
function includesInput(metafile, name) {
  return Object.keys(metafile.inputs || {}).some((path) => {
    const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
    return normalized === name || normalized.endsWith(`/${name}`);
  });
}

/**
 * Проверяет, вошёл ли ленивый исходник прямо в тело выхода main.
 * @param {BuildMetafile} metafile Главный граф нынешней сборки.
 * @param {string} name Путь ленивой точки относительно root.
 * @returns {boolean} true запрещает публикацию: самостоятельная ленивая граница была потеряна.
 */
function entryIncludes(metafile, name) {
  return Object.entries(metafile.outputs || {}).some(([path, value]) => {
    const normalized = path.replaceAll('\\', '/');
    return (normalized === 'main.mjs' || normalized.endsWith('/main.mjs'))
      && Object.keys(value.inputs || {}).some((input) => {
        const included = input.replaceAll('\\', '/').replace(/^\.\//, '');
        return included === name || included.endsWith(`/${name}`);
      });
  });
}

/**
 * Сопоставляет части главного графа с закреплёнными именами по проверенным точкам входа.
 * @param {BuildMetafile} metafile Граф main с ожидаемыми тремя ленивыми точками и одной общей частью.
 * @returns {Map<string,string>} Имя Bun с хэшем либо main сопоставлено устойчивому имени выпуска.
 * @throws {Error} При изменённой форме графа, неизвестной точке или повторном имени.
 */
function chunkNames(metafile) {
  const names = new Map();
  for (const [path, value] of Object.entries(metafile.outputs || {})) {
    const oldName = path.replaceAll('\\', '/').replace(/^\.\//, '');
    if (!/^(?:main|chunk-[a-z0-9]{8,13})\.mjs$/.test(oldName) || names.has(oldName)) {
      throw new Error(`Неожиданный выход графа Bun: ${path}`);
    }
    const entry = value.entryPoint && relative(root, resolve(value.entryPoint)).replaceAll('\\', '/');
    const name = oldName === 'main.mjs' ? 'main.mjs' : entry ? namedChunks.get(entry) : 'shared.mjs';
    if (
      !name || (oldName === 'main.mjs' && entry !== 'src/app/main.mjs')
      || (oldName !== 'main.mjs' && entry === 'src/app/main.mjs') || [...names.values()].includes(name)
    ) {
      throw new Error(`Неизвестная форма разделённого графа: ${path} (${entry || 'общий'})`);
    }
    names.set(oldName, name);
  }
  if (
    names.size !== 5
    || !['main.mjs', 'shared.mjs', ...namedChunks.values()].every((name) => [...names.values()].includes(name))
  ) throw new Error('Bun изменил состав разделённого графа');
  return names;
}

/**
 * Меняет лишь распознанные относительные импорты между восьмью именованными файлами и проверяет полный набор.
 * @param {Map<string,Uint8Array>} files Проверенные байты четырёх сборок с прежними именами Bun.
 * @param {Map<string,string>} names Сопоставление частей главного графа с устойчивыми именами.
 * @returns {Map<string,Uint8Array>} Полный проверенный выпуск под устойчивыми именами.
 * @throws {Error} При неизвестном импорте, неполной замене, повторном имени или неверном наборе.
 */
function nameGraph(files, names) {
  const mapped = new Map();
  for (const [oldName, bytes] of files) {
    const name = names.get(oldName) || oldName;
    let source = new TextDecoder().decode(bytes);
    if (names.has(oldName)) {
      const imports = scanner.scan(source).imports.filter((item) =>
        ['import-statement', 'dynamic-import'].includes(item.kind) && item.path?.startsWith('./')
      );
      let replaced = 0;
      source = source.replace(
        /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(["'])(\.\/(?:chunk-[a-z0-9]{8,13}|main)\.mjs)\2/g,
        (match, prefix, quote, specifier) => {
          const target = names.get(specifier.slice(2));
          if (!target) throw new Error(`Неизвестный импорт Bun: ${specifier}`);
          replaced++;
          return `${prefix}${quote}./${target}${quote}`;
        },
      );
      if (replaced !== imports.length) throw new Error(`Не все импорты ${oldName} распознаны при именовании`);
    }
    if (mapped.has(name)) throw new Error(`Повторное имя выхода: ${name}`);
    mapped.set(name, new TextEncoder().encode(source));
  }
  if (mapped.size !== 8 || ![...outputNames].every((name) => mapped.has(name))) {
    throw new Error('Неверный набор именованных файлов');
  }
  return mapped;
}

/**
 * Подготавливает только изменённые байты JS и build.json с копиями для отката установки, затем убирает прежние хешированные части.
 * @param {Map<string,Uint8Array>} files Полный проверенный выпуск из восьми устойчивых файлов.
 * @param {string[]} htmlPaths Проверенные пути исходных HTML-фрагментов.
 * @param {string} stage Нынешний временный каталог новых файлов и резервных копий.
 * @returns {Promise<PublishedBuild>} Принятый состав файлов и обнаруженные прежние пути.
 * @throws {Error} При неверном прежнем манифесте или файловом отказе; AggregateError содержит также отказ восстановления.
 */
async function publish(files, htmlPaths, stage) {
  await mkdir(outputRoot, { recursive: true });
  await mkdir(dirname(manifestPath), { recursive: true });
  for (const directory of [publicRoot, outputRoot, dirname(manifestPath)]) {
    const entry = await lstat(directory);
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error(`Выход проходит через ссылку: ${directory}`);
  }
  const manifests = [...files.keys()].sort().map((name) => `public/js/${name}`);
  const manifest = new TextEncoder().encode(
    JSON.stringify({ version: 1, entries, outputs: manifests, html: htmlPaths }, null, 2) + '\n',
  );
  const oldManifest = await bytesOrNull(manifestPath);
  /**
   * Проверенные прежние пути JS, которых нет в нынешнем составе; удаляются после установки нового выпуска.
   * @type {Set<string>}
   */
  const obsolete = new Set();
  if (oldManifest) {
    const previous = /** @type {unknown} */ (JSON.parse(oldManifest.toString('utf8')));
    const previousOutputs = previous && typeof previous === 'object' && 'outputs' in previous ? previous.outputs : null;
    if (
      !Array.isArray(previousOutputs) || !previousOutputs.every((path) =>
        typeof path === 'string'
        && /^public\/js\/(?:theme-boot|bootstrap|main|octocat|chunk-[a-z0-9]{8,13}|shared|tokens|source-view|releases)\.mjs$/
          .test(path)
      )
    ) {
      throw new Error('Прежний build.json содержит неизвестные выходы');
    }
    for (const path of previousOutputs) if (!manifests.includes(path)) obsolete.add(path);
  }
  for (const name of await readdir(outputRoot)) {
    if (/^chunk-[a-z0-9]{8,13}\.mjs$/.test(name)) obsolete.add(`public/js/${name}`);
  }
  for (const path of obsolete) await bytesOrNull(join(root, path));
  /**
   * Файлы с изменёнными байтами, подготовленные и скопированные до первой установки.
   * @type {BuildChange[]}
   */
  const changes = [];
  // Главный вход устанавливается после частей графа, ранняя тема — последней.
  /**
   * Ставит главный модуль после его частей, а раннюю тему последней.
   * @param {string} name Устойчивое имя нынешнего выхода.
   * @returns {number} Приоритет установки; внутри приоритета применяется порядок имён.
   */
  const order = (name) => name === 'main.mjs' ? 1 : name === 'theme-boot.mjs' ? 2 : 0;
  for (
    const [name, bytes] of [...files].sort(([left], [right]) => order(left) - order(right) || left.localeCompare(right))
  ) {
    const target = join(outputRoot, name);
    const old = await bytesOrNull(target);
    if (old && Buffer.compare(old, bytes) === 0) continue;
    changes.push({
      target,
      bytes,
      staged: join(stage, `next-${name}`),
      backup: old ? join(stage, `old-${name}`) : null,
    });
  }
  if (!oldManifest || Buffer.compare(oldManifest, manifest) !== 0) {
    changes.push({
      target: manifestPath,
      bytes: manifest,
      staged: join(stage, 'next-build.json'),
      backup: oldManifest ? join(stage, 'old-build.json') : null,
    });
  }
  for (const change of changes) {
    await durableWrite(change.staged, change.bytes);
    if (change.backup) await copyFile(change.target, change.backup);
  }
  /**
   * Уже заменённые файлы нынешней попытки; обратный порядок используется для отката.
   * @type {typeof changes}
   */
  const installed = [];
  try {
    for (const change of changes) {
      await rename(change.staged, change.target);
      installed.push(change);
    }
  } catch (error) {
    /**
     * Исходный отказ установки и последующие отказы восстановления для одной AggregateError.
     * @type {unknown[]}
     */
    const failures = [error];
    for (const change of installed.reverse()) {
      try {
        if (change.backup) await rename(change.backup, change.target);
        else await rm(change.target);
      } catch (failure) {
        failures.push(failure);
      }
    }
    if (failures.length > 1) throw new AggregateError(failures, 'Не удалось восстановить прежний выпуск');
    throw error;
  }
  for (const path of obsolete) {
    const target = join(root, path);
    if (await bytesOrNull(target)) await rm(target);
  }
  return { manifests, htmlPaths, removed: [...obsolete].sort() };
}

await regular(join(root, 'public', 'json', 'site.json'));
for (
  const notice of [
    'vendor/SOURCES.md',
    'vendor/marked-18.0.14/LICENSE',
    'vendor/dompurify-3.4.16/LICENSE',
    'vendor/github-slugger-2.0.0/LICENSE',
    'vendor/bootstrap-icons-1.13.1/LICENSE',
    'vendor/lit-3.3.3/LICENSE',
    'vendor/htmx-2.0.11/LICENSE',
  ]
) await regular(join(root, notice));
await mkdir(publicRoot, { recursive: true });
const publicEntry = await lstat(publicRoot);
if (!publicEntry.isDirectory() || publicEntry.isSymbolicLink()) throw new Error('Каталог public проходит через ссылку');
const htmlEntry = await lstat(htmlRoot);
if (!htmlEntry.isDirectory() || htmlEntry.isSymbolicLink()) {
  throw new Error('Каталог public/html проходит через ссылку');
}
const expectedHtml = htmlNames.map((name) => `${name}.html`).sort();
for (const name of expectedHtml) await regular(join(htmlRoot, name));
const htmlPaths = expectedHtml.map((name) => `public/html/${name}`);
const stage = await mkdtemp(join(publicRoot, '.bun-build-'));
try {
  const themeDir = join(stage, 'theme');
  const bootstrapDir = join(stage, 'bootstrap');
  const mainDir = join(stage, 'main');
  const workerDir = join(stage, 'octocat');
  const theme = await build('src/app/theme-boot.mjs', 'theme-boot.mjs', themeDir, 'iife', false);
  const bootstrap = await build('src/app/bootstrap.mjs', 'bootstrap.mjs', bootstrapDir, 'iife', false);
  const main = await build('src/app/main.mjs', 'main.mjs', mainDir, 'esm', true);
  const worker = await build('src/auth/github/octocat.mjs', 'octocat.mjs', workerDir, 'iife', false);
  if (includesInput(bootstrap.metafile, 'src/app/main.mjs')) throw new Error('Bootstrap втянул основной модуль');
  if (includesInput(main.metafile, 'src/auth/github/octocat.mjs')) throw new Error('Основной граф втянул воркер');
  if (!includesInput(worker.metafile, 'src/auth/github/octocat.mjs')) {
    throw new Error('В выпуске воркера нет его входа');
  }
  for (const input of Object.keys(worker.metafile.inputs || {})) {
    const absolute = resolve(input);
    const normalized = relative(root, absolute).replaceAll('\\', '/');
    const actual = relative(root, await realpath(absolute)).replaceAll('\\', '/');
    await regular(absolute);
    if (normalized !== actual || !workerInputs.has(normalized)) {
      throw new Error(`Воркер втянул код вне разрешённого списка: ${input}`);
    }
  }
  for (const input of lazyInputs) {
    if (!includesInput(main.metafile, input) || entryIncludes(main.metafile, input)) {
      throw new Error(`Ленивая часть оказалась в главном выходе или потеряна: ${input}`);
    }
  }
  /**
   * Общие проверенные выходы четырёх сборок до устойчивого именования и публикации.
   * @type {Map<string,Uint8Array>}
   */
  const files = new Map();
  for (
    const [result, outdir, name, classic] of [
      [theme, themeDir, 'theme-boot.mjs', true],
      [bootstrap, bootstrapDir, 'bootstrap.mjs', true],
      [main, mainDir, 'main.mjs', false],
      [worker, workerDir, 'octocat.mjs', true],
    ]
  ) {
    for (const [path, bytes] of await collect(result, outdir, name, classic)) {
      if (files.has(path)) throw new Error(`Два входа выпустили один файл: ${path}`);
      files.set(path, bytes);
    }
  }
  const named = nameGraph(files, chunkNames(main.metafile));
  let dynamicImport = false;
  for (const [name, bytes] of named) {
    if (name === 'theme-boot.mjs' || name === 'bootstrap.mjs' || name === 'octocat.mjs') continue;
    for (const item of scanner.scan(new TextDecoder().decode(bytes)).imports) {
      if (!['import-statement', 'dynamic-import'].includes(item.kind) || !item.path) continue;
      if (item.kind === 'dynamic-import') dynamicImport = true;
      if (item.path === 'lit') continue;
      if (!item.path.startsWith('./') || item.path.slice(2).includes('/') || !named.has(item.path.slice(2))) {
        throw new Error(`Выход ${name} ссылается вне текущего JS-графа: ${item.path}`);
      }
    }
  }
  if (!dynamicImport) throw new Error('Bun устранил границу ленивого import()');
  const outputs = await publish(named, htmlPaths, stage);
  console.log(
    `Собрано ${outputs.manifests.length} JS, проверено ${outputs.htmlPaths.length} HTML: public/json/build.json`,
  );
  if (outputs.removed.length) console.log(`Удалены старые выходы: ${outputs.removed.join(', ')}`);
} finally {
  await rm(stage, { recursive: true, force: true });
}
