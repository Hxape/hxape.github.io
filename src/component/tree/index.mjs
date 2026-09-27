/** Создаёт списки дерева, сообщения и направляющие без выбора или состояния запросов. */
import { isDetails, isHTMLElement } from '../../common/ui/view-utils.mjs';
import { TreeLoader } from '../tree-loader/index.mjs';

/**
 * Создаёт пустой список ветви без предметных данных.
 * @param {Document} owner Документ дерева или PiP, создающий ul.
 * @returns {HTMLUListElement} Новый ul с общими классами дерева; потомков добавляет вызывающая сторона.
 */
export function createTreeList(owner) {
  const list = owner.createElement('ul');
  list.className = 'tree-list plain-list';
  return list;
}

/**
 * Находит текстовую область сообщения, сохраняя направляющую отдельным узлом.
 * @param {HTMLElement} status Прежний узел статуса или пояснения дерева.
 * @returns {Element} Дочерняя .description-text либо сам status, если обёртка ещё не создана.
 */
export function statusBody(status) {
  return status.querySelector(':scope > .description-text') || status;
}

/**
 * Снимает ожидание и заменяет текстовую область готовыми узлами или строками.
 * @param {HTMLElement} status Прежнее пояснение дерева, которое не пересоздаётся.
 * @param {...(Node|string)} content Готовые части сообщения; пустые строки не вставляются.
 * @returns {void} Убирает флаг загрузки и продолжение ветви; сохраняет отдельную направляющую.
 */
export function setStatus(status, ...content) {
  status.removeAttribute('data-loading');
  status.classList.remove('tree-content');
  statusBody(status).replaceChildren(...content.filter((item) => item !== ''));
}

/**
 * Вставляет зарегистрированный символьный индикатор в сообщение дерева.
 * @param {HTMLElement} status Узел статуса запроса, остающийся у владельца каталога.
 * @param {string} label Доступное пояснение выполняемой операции.
 * @param {boolean} [continueBranch] Продолжать ли вертикальную направляющую до индикатора.
 * @returns {void} Выставляет ожидание и создаёт индикатор; запросы и их готовность здесь не хранятся.
 */
export function setLoading(status, label, continueBranch = false) {
  const loader = new TreeLoader();
  loader.setAttribute('label', label);
  setStatus(status, loader);
  status.setAttribute('data-loading', '');
  status.classList.toggle('tree-content', continueBranch);
}

/**
 * Рисует непрерывные вертикальные участки префикса в фоне одной строки.
 * @param {HTMLElement} row Строка дерева, получающая --tree-guides.
 * @param {string} text Готовый префикс с │, ├ и └; остальные знаки не создают штрихи.
 * @returns {void} Заменяет фоновую геометрию направляющих; текст префикса не меняет.
 */
function drawGuides(row, text) {
  const lines = [];
  for (const [index, glyph] of [...text].entries()) {
    if (!'│├└'.includes(glyph)) continue;
    const height = glyph === '└' ? '50%' : '100%';
    lines.push(`linear-gradient(var(--muted) 0 0) calc(${index + .5}ch - .5px) 0 / 1px ${height} no-repeat`);
  }
  row.style.setProperty('--tree-guides', lines.join(', '));
}

/**
 * Пересчитывает префиксы и продолжения по порядку дочерних ветвей.
 * @param {HTMLUListElement} list Список ветви с существующими li и details.
 * @param {boolean[]} [ancestors] Флаги последних ветвей у предков; true прекращает вертикаль на соответствующем уровне.
 * @returns {void} Согласует префиксы, их ширины и области описаний рекурсивно; выбор и открытость не меняет.
 */
export function refreshTree(list, ancestors = []) {
  const entries = [...list.children];
  entries.forEach((entry, index) => {
    const item = /** @type {HTMLElement} */ (entry.firstElementChild);
    const row = item.matches('details')
      ? /** @type {HTMLElement} */ (item.querySelector(':scope > summary'))
      : /** @type {HTMLElement} */ (item.querySelector(':scope > .tree-row')) || item;
    const content = row.querySelector(':scope > h2') || row;
    let prefix = /** @type {HTMLElement|null} */ (content.querySelector(':scope > .tree-prefix'));
    if (!prefix) {
      prefix = Object.assign(row.ownerDocument.createElement('span'), { className: 'tree-prefix muted' });
      prefix.setAttribute('aria-hidden', 'true');
      content.prepend(prefix);
    }
    const last = index === entries.length - 1;
    const first = ancestors.map((last) => last ? '   ' : '│  ').join('') + (last ? '└─' : '├─');
    const descendants = [...ancestors, last].map((last) => last ? '   ' : '│  ').join('');
    const continuation = descendants.slice(0, -1);
    prefix.dataset.first = first;
    prefix.dataset.continuation = continuation;
    prefix.textContent = first;
    drawGuides(row, first);
    item.style.setProperty('--prefix-width', `${first.length}ch`);
    const hasChildren = Boolean(item.querySelector(':scope > .tree-list:not([hidden]) > li:not([hidden])'));
    item.querySelectorAll(':scope > .description').forEach((description) => {
      let guide = /** @type {HTMLElement|null} */ (description.querySelector(':scope > .tree-prefix'));
      if (!guide) {
        guide = Object.assign(description.ownerDocument.createElement('span'), { className: 'tree-prefix muted' });
        guide.setAttribute('aria-hidden', 'true');
        description.prepend(guide);
      }
      if (!description.querySelector(':scope > .description-text')) {
        const text = Object.assign(description.ownerDocument.createElement('span'), { className: 'description-text' });
        text.append(...[...description.childNodes].filter((child) => child !== guide));
        description.append(text);
      }
      const contentGuide =
        description.classList.contains('tree-content') && (hasChildren || description.hasAttribute('data-loading'))
          ? `${descendants}│ `
          : continuation;
      if (isHTMLElement(description)) {
        if (description.classList.contains('tree-content')) {
          description.style.setProperty('--prefix-width', `${contentGuide.length}ch`);
        } else description.style.removeProperty('--prefix-width');
      }
      guide.dataset.first = guide.dataset.continuation = contentGuide;
      guide.textContent = contentGuide;
      drawGuides(/** @type {HTMLElement} */ (description), contentGuide);
    });
    const children = /** @type {HTMLUListElement|null} */ (item.querySelector(':scope > .tree-list'));
    if (children) refreshTree(children, [...ancestors, last]);
  });
}

/**
 * Обходит видимые строки и пояснения только раскрытых ветвей.
 * @param {HTMLUListElement|null} list Корень обхода; null или hidden не дают элементов.
 * @returns {Generator<HTMLElement>} Генератор HTMLElement в порядке отображения и клавиатурной навигации.
 */
export function* visibleTreeContent(list) {
  if (!list || list.hidden) return;
  for (const entry of /** @type {HTMLCollectionOf<HTMLElement>} */ (list.children)) {
    const item = /** @type {HTMLElement|null} */ (entry.firstElementChild);
    if (!item || entry.hidden || item.hidden) continue;
    const row = isDetails(item)
      ? /** @type {HTMLElement|null} */ (item.firstElementChild)
      : /** @type {HTMLElement|null} */ (item.querySelector(':scope > .tree-row')) || item;
    if (!row) continue;
    if (!row.hidden) yield row;
    if (!isDetails(item) || !item.open) continue;
    for (const child of /** @type {HTMLCollectionOf<HTMLElement>} */ (item.children)) {
      if (child.hidden) continue;
      if (child.classList.contains('description')) yield child;
      else if (child.classList.contains('tree-list')) {
        yield* visibleTreeContent(/** @type {HTMLUListElement} */ (child));
      }
    }
  }
}

/**
 * Сначала измеряет высоты видимых подписей, затем продлевает изменившиеся префиксы.
 * @param {HTMLUListElement|null} list Корень видимого дерева; null даёт пустой обход.
 * @param {Window} view Окно отображения, предоставляющее фактический line-height подписей.
 * @returns {void} Меняет только текст отличающихся префиксов; выбор, данные и раскрытие не затрагивает.
 */
export function updatePrefixes(list, view) {
  /** @type {Array<[HTMLElement,string]>} */
  const updates = [];
  for (const row of visibleTreeContent(list)) {
    const content = row.querySelector(':scope > h2') || row;
    const prefix = /** @type {HTMLElement|null} */ (content.querySelector(':scope > .tree-prefix'));
    const text = content.querySelector(':scope > .node-label, :scope > .description-text');
    if (!prefix || !text) continue;
    const { first, continuation } = prefix.dataset;
    if (first === undefined || continuation === undefined) continue;
    const lineHeight = parseFloat(view.getComputedStyle(text).lineHeight);
    const height = text.getBoundingClientRect().height;
    let lines = 1;
    if (Number.isFinite(lineHeight) && lineHeight > 0 && Number.isFinite(height)) {
      const count = Math.ceil(height / lineHeight - 0.01);
      if (Number.isFinite(count)) lines = Math.max(1, count);
    }
    updates.push([prefix, first + `\n${continuation}`.repeat(lines - 1)]);
  }
  for (const [prefix, text] of updates) if (prefix.textContent !== text) prefix.textContent = text;
}
