/**
 * Связывает узлы каталога с готовыми строками, приписками, правами и адресами GitHub.
 */
import { cloneBranch } from '../../component/tree-branch/index.mjs';
import { captionElement } from '../../component/tree-caption/index.mjs';
import { createTreeRow, showTreeRow } from '../../component/tree-row/index.mjs';
import { createTreeList } from '../../component/tree/index.mjs';
import { nodeIcon } from './icons.mjs';
import rules from './json/rules.json' with { type: 'json' };
import { encodedPath, repositoryPath } from './model.mjs';

/**
 * Один допустимый вид узла ограниченного каталога.
 * @typedef {import('./index.mjs').CatalogNode} CatalogNode
 */
/**
 * Карты разрешённых приписок, которыми Catalog обогащает строки.
 * @typedef {import('./index.mjs').CatalogCaptions} CatalogCaptions
 */
/**
 * Ограниченный снимок, принимаемый каталогом после проверки источника и политики.
 * @typedef {import('./index.mjs').RepositorySnapshot} RepositorySnapshot
 */
/**
 * Нынешние флаги видимости SVG-групп, отдельные от доступа и состава дерева.
 * @typedef {import('./icons.mjs').IconSettings} IconSettings
 */
/**
 * Связь новой DOM-строки с её узлом, адресом и допуском HXDoc; хранит Catalog.
 * @typedef {Object} RowBinding
 * @property {HTMLElement} row Живая строка DOM, связанная с узлом нынешнего отображения.
 * @property {CatalogNode} node Узел снимка, которым создана строка.
 * @property {RowBindingLink} link Готовый GitHub адрес и семантические пути строки, сохраняемые Catalog.
 * @property {boolean} docs Уровень дерева допускает HXDoc этого файла/объявления, отдельно от raw-чтения.
 */

export const captionTemplateSelector = `template:is(${rules.captionAttributes.map((name) => `[${name}]`).join(', ')})`;

/**
 * Читает подписи из шаблонов репозитория, не меняя исходные шаблоны.
 * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
 * @returns {CatalogCaptions} Карты точных путей и общих имён каталогов.
 */
export function readCaptions(repository) {
  /**
   * @type {CatalogCaptions}
   */
  const captions = {
    directoryNames: new Map(),
    directoryPaths: new Map(),
    filePaths: new Map(),
    symbolPaths: new Map(),
  };
  repository.querySelectorAll(`:scope > ${captionTemplateSelector}`).forEach((node) => {
    const template = /** @type {HTMLTemplateElement} */ (node);
    const caption = captionElement(template, { tags: rules.captionTags, attributes: rules.captionLinkAttributes });
    if (template.dataset.directoryName) captions.directoryNames.set(template.dataset.directoryName, caption);
    if (template.dataset.directoryPath) captions.directoryPaths.set(template.dataset.directoryPath, caption);
    if (template.dataset.filePath) captions.filePaths.set(template.dataset.filePath, caption);
    if (template.dataset.symbolPath) captions.symbolPaths.set(template.dataset.symbolPath, caption);
  });
  return captions;
}

/**
 * Выбирает приписку по виду узла; точный путь каталога важнее общего имени.
 * @param {CatalogNode} node Узел дерева, чей вид и путь определяют действие.
 * @param {CatalogCaptions} captions Проверенные приписки, сопоставленные путям и именам дерева.
 * @param {string} filePath Файл-владелец объявления относительно корня подготовленного дерева.
 * @param {string} parentSymbolPath Полный путь родительского объявления внутри файла.
 * @returns {HTMLElement|undefined} Готовая приписка либо undefined при отсутствии совпадения.
 */
function nodeCaption(node, captions, filePath, parentSymbolPath) {
  if (node.type === 'directory') {
    return captions.directoryPaths.get(node.path) ?? captions.directoryNames.get(node.name);
  }
  if (node.type === 'file') return captions.filePaths.get(node.path);
  const path = parentSymbolPath ? `${parentSymbolPath}.${node.name}` : `${filePath}#${node.name}`;
  return captions.symbolPaths.get(path);
}

/**
 * Создаёт ветвь и возвращает соответствие новых строк данным без хранения этого соответствия.
 * @param {CatalogNode[]} nodes Узлы подготовленного дерева; полные исходные файлы сюда не входят.
 * @param {RepositorySnapshot} repository Проверенный снимок с GitHub URL, ref, корнем путей и разрешённым уровнем дерева.
 * @param {CatalogCaptions} captions Проверенные приписки, сопоставленные путям и именам дерева.
 * @param {IconSettings} settings Проверяемые настройки соответствующего владельца.
 * @param {Document} owner Документ, в котором создаётся отображаемый узел.
 * @returns {RenderNodesResult} Новая ветвь и bindings строк; выбор и кэш остаются у Catalog.
 */
export function renderNodes(nodes, repository, captions, settings, owner) {
  /**
   * @type {RowBinding[]}
   */
  const rows = [];
  /**
   * Создаёт список одного уровня и рекурсивно связывает дочерние строки с исходным файлом и объявлением.
   * @param {CatalogNode[]} children Узлы нынешнего уровня ограниченного снимка.
   * @param {string} filePath Путь файла-владельца для вложенных объявлений, относительно repository.root.
   * @param {string} parentSymbolPath Полный путь родительского объявления либо пустая строка вне объявления.
   * @returns {HTMLUListElement} Новый список с готовыми строками; соответствия узлам дописываются в rows.
   */
  const renderList = (children, filePath = '', parentSymbolPath = '') => {
    const list = createTreeList(owner);
    const captioned = children.filter((node) => nodeCaption(node, captions, filePath, parentSymbolPath));
    if (captioned.length) {
      list.style.setProperty(
        '--catalog-caption-label-width',
        `${Math.max(...captioned.map((node) => node.name.length)) + 2}ch`,
      );
    }
    for (const node of children) {
      const branch = node.type === 'directory' || node.children.length > 0;
      const entry = branch ? cloneBranch(owner) : owner.createElement('li');
      const item = branch
        ? /** @type {HTMLElement} */ (entry.firstElementChild)
        : createTreeRow(owner);
      const row = branch ? /** @type {HTMLElement} */ (item.querySelector('summary')) : item;
      row.classList.add('outline-row');
      row.dataset.type = node.type;
      if (!branch) entry.append(row.parentElement || row);
      const caption = nodeCaption(node, captions, filePath, parentSymbolPath);
      const docs = repository.level >= 3 && (node.type === 'file' || node.type === 'symbol');
      showTreeRow(row, {
        name: node.name,
        icon: nodeIcon(node, settings),
        caption,
        accessibleName: node.type === 'symbol' && typeof node.kind === 'string'
          ? `${node.kind} ${node.name}${caption ? `; ${caption.textContent}` : ''}`
          : undefined,
        hasPopup: docs || node.type === 'directory',
      });
      const path = node.type === 'symbol' ? filePath : node.path;
      const kind = node.type === 'directory' ? 'tree' : 'blob';
      const sourcePath = encodedPath(repositoryPath(repository.root, path));
      let url = `${repository.url}/${kind}/${encodeURIComponent(repository.ref)}/${sourcePath}`;
      const line =
        node.type === 'symbol' && typeof node.line === 'number' && Number.isInteger(node.line) && node.line > 0
          ? `#L${node.line}`
          : '';
      url += line;
      rows.push({
        row,
        node,
        link: {
          url,
          path: path + line,
          filePath: node.type === 'file' || node.type === 'symbol' ? path : '',
          symbolPath: node.type === 'symbol'
            ? parentSymbolPath ? `${parentSymbolPath}.${node.name}` : `${filePath}#${node.name}`
            : '',
        },
        docs,
      });
      if (node.children.length) {
        const symbolPath = node.type === 'symbol'
          ? (parentSymbolPath ? `${parentSymbolPath}.${node.name}` : `${filePath}#${node.name}`)
          : '';
        item.append(renderList(node.children, node.type === 'file' ? node.path : filePath, symbolPath));
      }
      list.append(entry);
    }
    return list;
  };
  return { list: renderList(nodes), rows };
}

/**
 * Готовый GitHub URL строки и пути файла/объявления для хранения в Catalog.
 * @typedef {Object} RowBindingLink
 * @property {string} url Канонический GitHub URL источника, отдельно от местного VS Code пути.
 * @property {string} path Подпись пути строки относительно корня дерева с необязательным #L для объявления.
 * @property {string} filePath Относительный путь файла-владельца для file/symbol, пустая строка для каталога.
 * @property {string} symbolPath Полный путь объявления от файла в дереве, пустая строка для file/directory.
 */

/**
 * Новая DOM-ветвь и соответствие её строк узлам; выбор и кэши не входят в результат.
 * @typedef {Object} RenderNodesResult
 * @property {HTMLUListElement} list Новая ul-ветвь каталога; вызывающий решает, когда принять её в DOM.
 * @property {RowBinding[]} rows Связи новых строк с узлами, адресами и доступностью HXDoc.
 */
