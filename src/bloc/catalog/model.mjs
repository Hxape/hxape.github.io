/**
 * Правила видимости каталога и проверка полученных настроек и снимков до построения дерева.
 */
import rules from './json/rules.json' with { type: 'json' };

/**
 * Четыре стандартных вида документов; адресный Markdown ими не ограничивается.
 * @typedef {import('./index.mjs').DocumentType} DocumentType
 */
/**
 * Отдельные разрешения публикации текстов стандартных документов.
 * @typedef {import('./index.mjs').DocumentPermissions} DocumentPermissions
 */
/**
 * Один допустимый вид узла ограниченного каталога.
 * @typedef {import('./index.mjs').CatalogNode} CatalogNode
 */
/**
 * Проверенные правила публикации и ветка зарегистрированного репозитория.
 * @typedef {import('./index.mjs').RepositoryPolicy} RepositoryPolicy
 */
/**
 * Внешние настройки поверх defaults, ещё не принятые как политика.
 * @typedef {import('./index.mjs').PolicySettings} PolicySettings
 */
/**
 * Ограниченный снимок, принимаемый каталогом после проверки источника и политики.
 * @typedef {import('./index.mjs').RepositorySnapshot} RepositorySnapshot
 */
/**
 * Проверенная установленная библиотека и независимые сведения о её происхождении.
 * @typedef {import('./index.mjs').LibrarySource} LibrarySource
 */
/**
 * Метаданные и разрешённый текст документа; договор определяется блоком просмотра.
 * @typedef {import('../document/index.mjs').RepositoryDocument} RepositoryDocument
 */

/**
 * Отделяет объект внешнего JSON от null и массива.
 * @param {unknown} value Внешние настройки или снимок до проверки именованных полей.
 * @returns {value is Record<string, unknown>} Значение можно проверять по именованным полям.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @type {ReadonlyArray<DocumentType>}
 */
export const documentTypes = Object.freeze(
  /**
   * @type {DocumentType[]}
   */ (/** @type {unknown} */ ([...rules.documentTypes])),
);
/**
 * @type {ReadonlyArray<DocumentType>}
 */
export const directoryDocumentTypes = Object.freeze(
  /**
   * @type {DocumentType[]}
   */ (/** @type {unknown} */ ([...rules.directoryDocumentTypes])),
);
/**
 * @type {DocumentPermissions}
 */
export const noDocuments =
  /**
   * @type {DocumentPermissions}
   */
  (Object.freeze(Object.fromEntries(documentTypes.map((type) => [type, false]))));
/**
 * @type {Readonly<Partial<Record<string, string>>>}
 */
export const navigationKeys = Object.freeze(rules.navigationKeys);

/**
 * Соединяет части пути без пустых сегментов; не проверяет безопасность пути.
 * @param {...string} paths Части относительного пути; функция соединяет их, не проверяя безопасность.
 * @returns {string} Смысловой путь с разделителями /.
 */
export function repositoryPath(...paths) {
  return paths.flatMap((path) => path.split('/')).filter((part) => part && part !== '.').join('/');
}

/**
 * Кодирует сегменты пути для URL GitHub, сохраняя разделители.
 * @param {string} path Путь внутри Git-корня, ещё не закодированный для URL.
 * @returns {string} Путь для GitHub URL без смешивания границ сегментов.
 */
export function encodedPath(path) {
  return repositoryPath(path).split('/').map(encodeURIComponent).join('/');
}

/**
 * Сохраняет метаданные существующих документов; content остаётся только при разрешении.
 * @param {unknown} documents Метаданные документов; тексты остаются только при разрешении.
 * @param {DocumentPermissions} permissions Разрешения на тексты четырёх документов репозитория.
 * @param {ReadonlyArray<DocumentType>} [types] Виды документов, которые участвуют в текущем просмотре.
 * @returns {Record<string, RepositoryDocument>} Документы для просмотра; повреждённая форма вызывает отказ.
 */
export function filterDocuments(documents, permissions, types = documentTypes) {
  if (!isRecord(documents)) throw new Error('Document metadata is missing');
  /**
   * @type {Record<string, RepositoryDocument>}
   */
  const result = {};
  for (const type of types) {
    if (!Object.hasOwn(documents, type)) continue;
    const document = documents[type];
    if (
      !isRecord(document) || typeof document.path !== 'string' || !document.path
      || typeof document.format !== 'string' || !['markdown', 'text'].includes(document.format)
    ) throw new Error('Invalid document metadata');
    result[type] = { path: document.path, format: /** @type {'markdown'|'text'} */ (document.format) };
    if (permissions[type] && typeof document.content === 'string') result[type].content = document.content;
  }
  return result;
}

/**
 * Проверяет дерево JSON и отсекает запрещённые уровни и поля до создания DOM.
 * @param {unknown} nodes Узлы подготовленного дерева; полные исходные файлы сюда не входят.
 * @param {RepositoryPolicy} policy Нынешние права публикации, уровень дерева и ветка репозитория.
 * @returns {CatalogNode[]} Новое ограниченное дерево; полный исходный текст сюда не включается.
 */
export function limitNodes(nodes, policy) {
  if (!Array.isArray(nodes)) throw new Error('Invalid outline nodes');
  const { level } = policy;
  const result = [];
  for (const node of nodes) {
    if (!isRecord(node) || typeof node.type !== 'string' || !['directory', 'file', 'symbol'].includes(node.type)) {
      throw new Error('Invalid node type');
    }
    if ((level === 1 && node.type !== 'directory') || (level === 2 && node.type === 'symbol')) continue;
    if (
      typeof node.name !== 'string' || !Array.isArray(node.children)
      || (node.type !== 'symbol' && typeof node.path !== 'string')
    ) throw new Error('Invalid outline node');
    /**
     * @type {CatalogNode}
     */
    const entry = node.type === 'symbol'
      ? { type: 'symbol', name: node.name, children: [] }
      : node.type === 'directory'
      ? {
        type: 'directory',
        name: node.name,
        path: /** @type {string} */ (node.path),
        children: [],
        documents: filterDocuments(node.documents, policy.documents, directoryDocumentTypes),
      }
      : { type: 'file', name: node.name, path: /** @type {string} */ (node.path), children: [] };
    if (node.type === 'directory' || level >= 3) entry.children = limitNodes(node.children, policy);
    if (level >= 3) {
      if (typeof node.doc === 'string') entry.doc = node.doc;
      if (typeof node.kind === 'string') entry.kind = node.kind;
      if (typeof node.line === 'number' && Number.isInteger(node.line) && node.line > 0) entry.line = node.line;
    }
    result.push(entry);
  }
  return result;
}

/**
 * Проверяет настройку уровня, ветки и разрешений до использования.
 * @param {RepositoryPolicy} defaults Действующие значения по умолчанию, поверх которых проверяется настройка.
 * @param {unknown} [entry] Переопределения политики репозитория поверх defaults до проверки формы и значений.
 * @returns {RepositoryPolicy} Нынешняя допустимая политика; неверная настройка вызывает отказ.
 */
export function readPolicy(defaults, entry = {}) {
  if (!isRecord(entry)) throw new Error('Invalid repository settings');
  const policy = { ...defaults, ...entry };
  if (
    typeof policy.private !== 'boolean' || typeof policy.level !== 'number' || !Number.isInteger(policy.level)
    || policy.level < 0 || policy.level > 4
    || typeof policy.branch !== 'string' || !/^[a-z\d][a-z\d._/-]{0,99}$/i.test(policy.branch)
    || policy.branch.includes('..') || policy.branch.includes('//') || policy.branch.endsWith('/')
    || policy.branch.endsWith('.')
    || policy.branch.split('/').some((part) => part.startsWith('.') || part.endsWith('.lock'))
    || (entry.documents !== undefined && !isRecord(entry.documents))
  ) {
    throw new Error('Invalid access settings');
  }
  const documentSettings = isRecord(entry.documents) ? entry.documents : {};
  const documents = { ...noDocuments };
  for (const type of documentTypes) {
    const value = documentSettings[type];
    if (Object.hasOwn(documentSettings, type) && typeof value !== 'boolean') {
      throw new Error('Invalid document permissions');
    }
    documents[type] = typeof value === 'boolean' ? value : defaults.documents[type];
  }
  return { private: policy.private, branch: policy.branch, level: policy.level, documents };
}

/**
 * Принимает только адрес корня репозитория GitHub и строит адрес его API.
 * @param {string} value Входное значение, форма которого проверяется этой функцией.
 * @returns {GithubLocationResult} Канонический web/API адрес; путь материала не принимается как корень.
 */
export function githubLocation(value) {
  const url = new URL(value);
  const parts = url.pathname.split('/').filter(Boolean);
  if (url.origin !== 'https://github.com' || parts.length !== 2 || url.search || url.hash) {
    throw new Error('Invalid GitHub repository');
  }
  return {
    url: `${url.origin}/${parts.join('/')}`,
    api: `https://api.github.com/repos/${parts.map(encodeURIComponent).join('/')}`,
  };
}

/**
 * Проверяет имя, корень, версию библиотеки и разрешённые поля сырого снимка.
 * @param {string} name Имя зарегистрированного проекта или библиотеки; должно совпасть с repository снимка.
 * @param {string} fallbackUrl Адрес зарегистрированного репозитория при отсутствии URL в снимке.
 * @param {unknown} data Внешние данные до проверки формы и ограничения разрешённым уровнем.
 * @param {RepositoryPolicy} policy Нынешние права публикации, уровень дерева и ветка репозитория.
 * @param {LibrarySource|undefined} library Проверенные сведения об установке и источнике библиотеки.
 * @param {boolean} privateSource Снимок получен через GithubAccess, а не из опубликованного JSON.
 * @returns {RepositorySnapshot} Ограниченный снимок; несовпадение библиотеки или повреждённая форма вызывают отказ.
 */
export function readSnapshot(name, fallbackUrl, data, policy, library, privateSource) {
  if (!isRecord(data)) throw new Error('Invalid repository snapshot');
  const value = data;
  if (
    value.repository !== name || typeof value.root !== 'string' || (!library && !value.root)
    || !Array.isArray(value.children)
  ) {
    throw new Error('Invalid repository snapshot');
  }
  if (library && (value.version !== library.version || value.root !== library.root || value.ref !== library.ref)) {
    throw new Error('Library catalogue and outline do not match');
  }
  const visiblePolicy = privateSource
    ? { ...policy, level: 3, documents: { README: true, CONTRIBUTING: true, AGENTS: true, LICENSE: true } }
    : policy;
  return {
    url: library?.url
      || (typeof value.url === 'string' && value.url.startsWith('https://github.com/')
        ? value.url.replace(/\/+$/, '')
        : fallbackUrl),
    ref: library?.ref || policy.branch,
    root: library ? library.root : value.root,
    level: visiblePolicy.level,
    privateSource,
    documents: library ? {} : filterDocuments(value.documents, visiblePolicy.documents),
    children: visiblePolicy.level > 0
      ? limitNodes(value.children, library ? { ...policy, documents: noDocuments } : visiblePolicy)
      : [],
  };
}

/**
 * Два адреса одного проверенного GitHub-корня: web URL и API URL.
 * @typedef {Object} GithubLocationResult
 * @property {string} url Канонический GitHub URL источника, отдельно от местного VS Code пути.
 * @property {string} api Корень GitHub API, построенный из проверенного web URL.
 */
