/**
 * Проверяет адрес материала без DOM, текста и доказательства доступа; строит его ключ и GitHub URL.
 */

/**
 * Идентичность источника для повторного разрешения адреса; не подтверждение доступа.
 * @typedef {Object} Origin
 * @property {'repository'|'haxelib'} kind Источник зарегистрированного репозитория либо установленной библиотеки .haxelib.
 * @property {string} id Ключ каталога: репозиторий Hxape либо имя установленной библиотеки; aliases продуктов сохраняются.
 * @property {string} url Канонический корень GitHub-репозитория без path/ref материала.
 */

/**
 * Сериализуемый адрес материала для истории, закладок и нижней панели.
 * @typedef {RepositoryTarget|DirectoryTarget|DocumentTarget|SourceTarget|DeclarationTarget} Target
 */

/**
 * Адресный договор Target; не содержит текста, DOM и загрузчиков.
 * @typedef {Target} MaterialTarget
 */

/**
 * Общий способ открытия ссылок, принадлежащий настройкам.
 * @typedef {'internal'|'vscode'|'github'} LinkMode
 */

/**
 * Отделяет объект внешней записи от null и массива.
 * @param {unknown} value Входное значение, форма которого проверяется этой функцией.
 * @returns {value is Record<string,unknown>} Значение допускает проверку полей адреса.
 */
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Нормализует местный абсолютный корень POSIX или Windows; пустая строка выключает VS Code.
 * @param {unknown} value Входное значение, форма которого проверяется этой функцией.
 * @returns {string|null} Корень, пустая строка для выключенного VS Code либо null при отказе.
 */
export function readOrganizationRoot(value) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.trim().startsWith('\\')) return null;
  const path = value.trim().replace(/\\/g, '/');
  if (!path) return '';
  if (!/^(?:\/(?!\/)|[a-z]:\/)/i.test(path) || path.split('/').some(part => part === '.' || part === '..')) return null;
  return /^[a-z]:\/$/i.test(path) ? path : path.replace(/\/+$/, '') || '/';
}

/**
 * Проверяет смысловой путь относительно Git-корня, а не закодированный URL.
 * @param {unknown} value Входное значение, форма которого проверяется этой функцией.
 * @param {boolean} [empty] Разрешить пустую строку именно для корневого каталога.
 * @returns {value is string} Допустимый путь; empty отдельно разрешает корневой каталог.
 */
export function materialPath(value, empty = false) {
  return typeof value === 'string' && value.length <= 1024 && (empty && value === '' || Boolean(value))
    && !/[\\\u0000-\u001f\u007f]/.test(value)
    && (value === '' || value.split('/').every(part => part && part !== '.' && part !== '..'));
}

/**
 * Проверяет ref до URL-кодирования, сохраняя / внутри имени ветки.
 * @param {unknown} value Входное значение, форма которого проверяется этой функцией.
 * @returns {value is string} Допустимый ref без неоднозначных сегментов.
 */
export function materialRef(value) {
  return typeof value === 'string' && /^[a-z\d][a-z\d._/-]{0,99}$/i.test(value)
    && !value.includes('..') && !value.includes('//') && !value.endsWith('/') && !value.endsWith('.')
    && !value.split('/').some(part => part.startsWith('.') || part.endsWith('.lock'));
}

/**
 * Принимает только корень GitHub-репозитория без параметров и учётных данных.
 * @param {unknown} value Внешнее значение, от которого требуется точный GitHub-корень без credentials/query/anchor.
 * @returns {string|null} Канонический URL либо null; внешние страницы не считаются репозиторием.
 */
export function repositoryUrl(value) {
  if (typeof value !== 'string' || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (
      url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash
      || !/^\/[a-z\d_.-]+\/[a-z\d_.-]+\/?$/i.test(url.pathname)
    ) return null;
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return null;
  }
}

/**
 * Проверяет вид, ключ и GitHub-корень источника.
 * @param {unknown} value Входное значение, форма которого проверяется этой функцией.
 * @returns {Origin|null} Новая копия полей источника либо null.
 */
export function readMaterialOrigin(value) {
  if (
    !record(value) || typeof value.kind !== 'string' || !['repository', 'haxelib'].includes(value.kind)
    || typeof value.id !== 'string' || !/^[a-z\d][a-z\d._-]{0,99}$/i.test(value.id)
  ) return null;
  const url = repositoryUrl(value.url);
  return url ? { kind: value.kind === 'haxelib' ? 'haxelib' : 'repository', id: value.id, url } : null;
}

/**
 * Проверяет внешнюю запись и возвращает только сериализуемые поля адреса; отказ — null.
 * @param {unknown} value Запись адреса из журнала или действия, до проверки допустимых полей.
 * @returns {Target|null} Новый сериализуемый адрес либо null при повреждённой форме.
 */
export function readMaterialTarget(value) {
  if (!record(value)) return null;
  const origin = readMaterialOrigin(value.origin);
  if (!origin) return null;
  if (value.kind === 'repository') return { kind: 'repository', origin };
  if (!materialRef(value.ref) || !materialPath(value.path, value.kind === 'directory')) return null;
  const base = { origin, ref: value.ref, path: value.path };
  if (value.kind === 'directory' && (value.readmePath === null || materialPath(value.readmePath))) {
    return { ...base, kind: 'directory', readmePath: value.readmePath };
  }
  if (
    value.kind === 'document' && typeof value.format === 'string' && ['markdown', 'text'].includes(value.format)
    && (value.anchor === null || typeof value.anchor === 'string' && value.anchor.length <= 1024
        && !/[\u0000-\u001f\u007f]/.test(value.anchor))
  ) {
    return { ...base, kind: 'document', format: value.format === 'text' ? 'text' : 'markdown', anchor: value.anchor };
  }
  const line = value.line;
  if (
    value.kind === 'source' && (line === null || typeof line === 'number' && Number.isSafeInteger(line) && line > 0)
  ) {
    return { ...base, kind: 'source', line };
  }
  if (
    value.kind === 'declaration' && typeof line === 'number' && Number.isSafeInteger(line) && line > 0
    && typeof value.symbolPath === 'string' && value.symbolPath.length > 0 && value.symbolPath.length <= 1024
    && typeof value.symbolKind === 'string' && value.symbolKind.length > 0 && value.symbolKind.length <= 100
    && !/[\u0000-\u001f\u007f]/.test(value.symbolPath + value.symbolKind)
  ) {
    return { ...base, kind: 'declaration', line, symbolPath: value.symbolPath, symbolKind: value.symbolKind };
  }
  return null;
}

/**
 * Один ключ для адреса нижней панели и закладки, независимо от подписи объявления.
 * @param {Target} target Проверенный смысловой адрес материала без DOM и доказательства доступа.
 * @returns {string} Стабильный ключ адреса; declaration и source одной строки равны.
 */
export function targetKey(target) {
  if (target.kind === 'repository') return JSON.stringify([target.origin.url.toLowerCase()]);
  const path = target.kind === 'directory' ? target.readmePath || target.path : target.path;
  const position = target.kind === 'source' || target.kind === 'declaration'
    ? target.line
    : target.kind === 'document'
    ? target.anchor || null
    : null;
  const route = target.kind === 'directory' && target.readmePath === null ? 'tree' : 'blob';
  return JSON.stringify([target.origin.url.toLowerCase(), target.ref, path, position, route]);
}

/**
 * Строит внешний адрес из уже проверенного смыслового адреса.
 * @param {Target} target Проверенный смысловой адрес материала без DOM и доказательства доступа.
 * @returns {string} Web URL нужного материала со строкой или исходным якорем.
 */
export function githubHref(target) {
  if (target.kind === 'repository') return target.origin.url;
  const path = target.kind === 'directory' ? target.readmePath || target.path : target.path;
  const route = target.kind === 'directory' && target.readmePath === null ? 'tree' : 'blob';
  const hash = target.kind === 'source' || target.kind === 'declaration'
    ? target.line === null ? '' : `#L${target.line}`
    : target.kind === 'document' && target.anchor
    ? `#${encodeURIComponent(target.anchor)}`
    : '';
  return `${target.origin.url}/${route}/${encodeURIComponent(target.ref)}/${
    path.split('/').map(encodeURIComponent).join('/')
  }${hash}`;
}

/**
 * Адрес зарегистрированного репозитория без выбранного файла или ветки.
 * @typedef {Object} RepositoryTarget
 * @property {'repository'} kind Назначение — корень зарегистрированного репозитория.
 * @property {Origin} origin Вид источника, ключ каталога и канонический GitHub URL.
 */

/**
 * Адрес каталога; readmePath указывает выбранный собственный README либо остаётся null.
 * @typedef {Object} DirectoryTarget
 * @property {'directory'} kind Назначение — каталог, который может иметь собственный README.
 * @property {Origin} origin Вид источника, ключ каталога и канонический GitHub URL.
 * @property {string} ref Ветка, тег или коммит, передаваемый отдельно от пути файла.
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 * @property {string|null} readmePath Полный путь собственного README либо null, если документ ещё не выбран или отсутствует.
 */

/**
 * Адрес Markdown или текстового документа с исходным якорем.
 * @typedef {Object} DocumentTarget
 * @property {'document'} kind Назначение — Markdown либо простой текст отдельного документа.
 * @property {Origin} origin Вид источника, ключ каталога и канонический GitHub URL.
 * @property {string} ref Ветка, тег или коммит, передаваемый отдельно от пути файла.
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 * @property {'markdown'|'text'} format Markdown либо простой текст; выбирает способ безопасного представления.
 * @property {string|null} anchor Исходный Markdown-якорь; порождённый DOM-id не сохраняется.
 */

/**
 * Адрес исходного файла и необязательной строки; текст в адрес не входит.
 * @typedef {Object} SourceTarget
 * @property {'source'} kind Назначение — исходный файл с необязательной строкой.
 * @property {Origin} origin Вид источника, ключ каталога и канонический GitHub URL.
 * @property {string} ref Ветка, тег или коммит, передаваемый отдельно от пути файла.
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 * @property {number|null} line Положительная строка исходника либо null для открытия с начала без выделения.
 */

/**
 * Адрес объявления Haxe с путём внутри дерева и строкой из снимка.
 * @typedef {Object} DeclarationTarget
 * @property {'declaration'} kind Назначение — объявление Haxe внутри конкретного файла.
 * @property {Origin} origin Вид источника, ключ каталога и канонический GitHub URL.
 * @property {string} ref Ветка, тег или коммит, передаваемый отдельно от пути файла.
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 * @property {string} symbolPath Путь объявления от файла в дереве, например File.hx#Class.method.
 * @property {string} symbolKind Вид объявления для подписи; фактический узел проверяется по снимку.
 * @property {number} line Строка объявления от 1 по снимку; не гарантирует совпадение изменившейся ветки GitHub.
 */
