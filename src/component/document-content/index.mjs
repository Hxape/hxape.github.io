/** Преобразует текст документа в безопасный DOM и подключает управление таблицами. */

/**
 * Временная связь очищенных ссылок с исходными якорями одного вставленного документа.
 * @typedef {Object} DocumentLinkProjection
 * @property {HTMLElement} root Очищенная корневая разметка нынешней вставки.
 * @property {Map<string,Element>} anchors Исходные имена якорей и изолированные узлы; порождённые id наружу не выходят.
 * @property {ContentOptions} options Действия и оформление нынешнего владельца; при обновлении режима заменяются.
 */

/**
 * Успешно прочитанный текст и выбранный владельцем формат.
 * @typedef {Object} DocumentContent
 * @property {'markdown'|'text'} format Markdown допускает оформление; text показывается буквальным pre/code.
 * @property {string} content Полный текст нынешнего материала; компонент не сохраняет отдельный постоянный кэш.
 */
import DOMPurify from '../../../vendor/dompurify-3.4.16/purify.es.mjs';
import GithubSlugger from '../../../vendor/github-slugger-2.0.0/index.js';
import { Marked } from '../../../vendor/marked-18.0.14/marked.esm.js';
import { isElement } from '../../common/ui/view-utils.mjs';
import { resizeDocumentTables } from '../resizable-table/index.mjs';
import renderPolicy from './json/render-policy.json' with { type: 'json' };

/**
 * Действия живого переноса уже созданного управления таблицами документа.
 * @typedef {Object} PreparedMove
 * @property {()=>void} resume Перепривязывает таблицы к нынешнему документу, сохраняя ширины и DOM.
 * @property {()=>void} rollback Возвращает прежние привязки после частичного отказа.
 * @property {()=>void} commit Заканчивает временную паузу переноса.
 */
/**
 * Готовое представление текста и действия его ссылок, выбранные блоком документов.
 * @typedef {Object} ContentOptions
 * @property {'source'|'html'} [mode] Исходный текст или оформленный HTML; отсутствие означает исходный текст.
 * @property {(value:string)=>string|null} [resolveHref] Превращает очищенное исходное href в готовый адрес нынешнего режима либо null.
 * @property {(value:string,event:MouseEvent)=>boolean} [onLink] Обрабатывает обычный click по очищенной ссылке; true означает, что владелец перехватил её.
 * @property {boolean} [internalLinks] false оставляет якоря внешними; иначе существующие якоря связываются с изолированными DOM-id.
 * @property {string|null} [anchor] Исходное имя якоря для прокрутки после вставки; порождённый DOM-id не сохраняется.
 * @property {string} imageLabel Текст замены изображения, если у него нет подписи.
 * @property {string} htmlUnavailable Пояснение перехода к исходному тексту при отказе Markdown или очистки.
 * @property {(first:number,second:number)=>string} columnLabel Доступное имя ручки между двумя колонками таблицы; номера начинаются с 1.
 */

/**
 * Экранирует текст для построения безопасной строки вспомогательной разметки.
 * @param {unknown} value Значение подписи или атрибута Markdown, приводимое к строке.
 * @returns {string} Строка с экранированными &, <, > и кавычками; исходное значение не меняется.
 */
const escapeHtml = value =>
  String(value).replace(/[&<>"']/g, character =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character] || character);

/** Один синхронный Markdown renderer с общей политикой; не хранит текст просмотренных файлов. */
const markdown = new Marked({
  ...renderPolicy.markdown,
  renderer: {
    /**
     * Заменяет Markdown-изображение подписью с проверяемым исходным адресом, избегая автоматической загрузки.
     * @param {import('../../../vendor/marked-18.0.14/marked.esm.js').Tokens.Image} image Разобранный адрес, текст/inline tokens и необязательная подсказка изображения.
     * @returns {string} Вспомогательная строка span; дальнейшая санитаризация и политика адресов обязательны.
     */
    image({ href, text, tokens, title }) {
      const label = tokens ? this.parser.parseInline(tokens) : escapeHtml(text);
      return `<span
        data-document-image="${escapeHtml(href)}"
        title              = "${escapeHtml(title || '')}"
      >${label}</span>`;
    },
    /**
     * Показывает отметку списка буквальным текстом вместо нового интерактивного поля.
     * @param {import('../../../vendor/marked-18.0.14/marked.esm.js').Tokens.Checkbox} checkbox Принятая Markdown-отметка пункта.
     * @returns {string} [x] или [ ] с пробелом, без локального состояния checkbox.
     */
    checkbox({ checked }) {
      return checked ? '[x] ' : '[ ] ';
    },
  },
});

/**
 * Явная политика очистки вставляемой разметки; raw Markdown не может добавлять собственные служебные data-атрибуты.
 * @type {import('../../../vendor/dompurify-3.4.16/purify.es.mjs').Config}
 */
const sanitizeOptions = {
  IN_PLACE: renderPolicy.sanitizer.inPlace,
  ALLOWED_TAGS: renderPolicy.sanitizer.allowedTags,
  ALLOWED_ATTR: renderPolicy.sanitizer.allowedAttributes,
  ALLOW_ARIA_ATTR: renderPolicy.sanitizer.allowAriaAttributes,
  ALLOW_DATA_ATTR: renderPolicy.sanitizer.allowDataAttributes,
  SANITIZE_DOM: renderPolicy.sanitizer.sanitizeDom,
};

/** Счётчик изолированных DOM-id вставки; исходные якоря хранятся отдельно и не зависят от счётчика. */
let nextAnchorId = 0;
/**
 * Только живое управление таблицами нынешней вставки; dispose освобождает его перед сменой текста.
 * @type {WeakMap<HTMLElement,import('../resizable-table/index.mjs').DocumentTableControls>}
 */
const documentControls = new WeakMap();
/**
 * Производные связи ссылок и якорей текущего контейнера; снимаются при dispose, не являются кэшем материала.
 * @type {WeakMap<HTMLElement,DocumentLinkProjection>}
 */
const documentLinks = new WeakMap();

/**
 * Снимает управление таблицами и ссылками прежнего содержимого контейнера.
 * @param {HTMLElement} container Прежний article или иной контейнер документа.
 * @returns {void} Удаляет привязки из WeakMap даже при отказе очистки; сам DOM не удаляет.
 * @throws {Error} Ошибка освобождения управления таблицами передаётся владельцу.
 */
export function disposeDocumentContent(container) {
  try {
    documentControls.get(container)?.dispose();
  } finally {
    documentControls.delete(container);
    documentLinks.delete(container);
  }
}

/**
 * Задаёт элементу уникальный порождённый id, не совпадающий с id текущего документа.
 * @param {Element} element Корень либо узел исходного якоря очищенной разметки.
 * @param {Document} owner Документ получателя для проверки занятого id.
 * @returns {void} Меняет только id элемента; исходное имя сохраняется отдельно вызывающим кодом.
 */
function assignId(element, owner) {
  do {
    element.id = `repository-document-${++nextAnchorId}`;
  } while (owner.getElementById(element.id));
}

/**
 * Сопоставляет исходные имена и GitHub-slug заголовков с изолированными узлами.
 * @param {HTMLElement} root Очищенная разметка до вставки в страницу.
 * @param {Document} owner Документ вставки, где id должны оставаться уникальными.
 * @returns {Map<string,Element>} Карта исходных имён к узлам, включая пустое имя корня; прежние id/name заменены.
 */
function isolateAnchors(root, owner) {
  /** @type {Map<string,Element>} */
  const anchors = new Map([['', root]]);
  const slugger = new GithubSlugger();
  assignId(root, owner);
  for (const element of root.querySelectorAll('[id], [name], h1, h2, h3, h4, h5, h6')) {
    const names = ['id', 'name'].map(attribute => {
      const value = element.getAttribute(attribute);
      element.removeAttribute(attribute);
      return value || '';
    });
    if (/^H[1-6]$/.test(element.tagName)) names.push(slugger.slug(element.textContent || ''));
    assignId(element, owner);
    for (const name of names) {
      if (name && !anchors.has(name)) anchors.set(name, element);
    }
  }
  return anchors;
}

/**
 * Заменяет изображения безопасными текстовыми ссылками после очистки.
 * @param {HTMLElement} root Очищенная разметка с renderer-created data-document-image.
 * @param {string} imageLabel Подпись изображения без собственного текста.
 * @returns {void} Изображение внутри существующей ссылки становится текстом; остальные становятся a для дальнейшей проверки href.
 */
function replaceImages(root, imageLabel) {
  const images = /** @type {NodeListOf<HTMLElement>} */ (root.querySelectorAll('[data-document-image]'));
  for (const image of images) {
    const label = image.textContent || imageLabel;
    if (image.closest('a')) {
      image.replaceWith(root.ownerDocument.createTextNode(label));
      continue;
    }
    const link = root.ownerDocument.createElement('a');
    link.textContent = label;
    link.setAttribute('href', image.getAttribute('data-document-image') || '');
    if (image.title) link.title = image.title;
    image.replaceWith(link);
  }
}

/**
 * Проверяет готовый абсолютный адрес без учётных данных и управляющих символов.
 * @param {string} value Строка адреса ссылки после очистки разметки.
 * @returns {URL|null} URL HTTP(S) либо null для схемы, учётных данных, повреждения или запрещённых символов.
 */
function httpUrl(value) {
  if (!/^https?:\/\//i.test(value) || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return !url.username && !url.password && ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Согласует href и исходные значения очищенных ссылок с нынешними действиями владельца.
 * @param {HTMLElement} root Очищенная область с прежними ссылками и renderer-created data-original-href.
 * @param {Map<string,Element>} anchors Карта исходных имён к изолированным узлам этого документа.
 * @param {ContentOptions} options Готовое разрешение адресов и выбор внутреннего или внешнего режима.
 * @returns {void} Неверные адреса лишаются href; внешние получают target/rel, внутренние связываются с DOM-id.
 */
function setLinks(root, anchors, options) {
  const links = /** @type {NodeListOf<HTMLAnchorElement>} */ (root.querySelectorAll('a[href],a[data-original-href]'));
  for (const link of links) {
    const value = (link.getAttribute('data-original-href') || link.getAttribute('href') || '').trim();
    // Эти атрибуты создаются только после очистки; сырой Markdown не может задать их.
    link.setAttribute('data-original-href', value);
    let href = null;
    if (value.startsWith('#')) {
      let name = value.slice(1);
      try {
        name = decodeURIComponent(name);
      } catch { /* Сохраняем буквальный якорь. */ }
      const target = anchors.get(name);
      if (target && options.internalLinks !== false) href = `#${target.id}`;
      else href = options.resolveHref?.(value) || null;
    } else if (value && !/[\\\u0000-\u001f\u007f]/.test(value)) {
      const resolved = options.resolveHref?.(value) || httpUrl(value)?.href;
      href = resolved
          && (httpUrl(resolved) || /^vscode:\/\/file\//i.test(resolved) && !/[\u0000-\u001f\u007f]/.test(resolved))
        ? resolved
        : null;
    }
    if (
      href && !href.startsWith('#') && !httpUrl(href)
      && (!/^vscode:\/\/file\//i.test(href) || /[\u0000-\u001f\u007f]/.test(href))
    ) href = null;
    if (href) {
      link.setAttribute('href', href);
      link.classList.remove('document-unavailable-link', 'muted');
      if (href.startsWith('#')) {
        link.removeAttribute('target');
        link.removeAttribute('rel');
      } else {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    } else {
      link.removeAttribute('href');
      link.classList.add('document-unavailable-link', 'muted');
    }
  }
}

/**
 * Связывает единственный click-обработчик области ссылок с обновляемыми параметрами.
 * @param {{root:HTMLElement,anchors:Map<string,Element>,options:ContentOptions}} state Живой корень, карта якорей и нынешние действия; объект остаётся до замены содержимого.
 * @returns {void} Обычное нажатие передаётся onLink, затем локальному якорю; modified click оставляет нативное действие.
 */
function bindLinks(state) {
  const { root, anchors } = state;
  root.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = isElement(event.target) ? event.target.closest('a[href]') : null;
    if (!link || !root.contains(link)) return;
    const value = link.getAttribute('data-original-href') || '';
    if (state.options.onLink?.(value, event)) return;
    if (!(link.getAttribute('href') || '').startsWith('#')) return;
    const id = (link.getAttribute('href') || '').slice(1);
    const target = [...anchors.values()].find(element => element.id === id);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ block: 'start' });
    }
  });
}

/**
 * Переназначает готовые адреса без повторного Markdown и пересоздания таблиц.
 * @param {HTMLElement} container Прежний контейнер оформленного документа.
 * @param {ContentOptions} options Нынешние действия и режим ссылок; заменяют только параметры обработки.
 * @returns {void} Без сохранённого оформленного содержимого ничего не меняет; единственный обработчик продолжает использовать новый options.
 */
export function refreshDocumentLinks(container, options) {
  const state = documentLinks.get(container);
  if (!state) return;
  state.options = options;
  setLinks(state.root, state.anchors, options);
}

/**
 * Прокручивает к узлу по исходному имени, не по порождённому DOM-id.
 * @param {HTMLElement} container Контейнер уже оформленного документа с картой якорей.
 * @param {string} fragment Исходное имя или URL-кодированный фрагмент; повреждённое кодирование остаётся буквальным.
 * @returns {boolean} true при найденном и прокрученном узле; false, если карта или имя отсутствуют.
 */
export function scrollDocumentAnchor(container, fragment) {
  const state = documentLinks.get(container);
  let name = fragment;
  try {
    name = decodeURIComponent(fragment);
  } catch { /* Буквальный якорь остаётся допустимым. */ }
  const target = state?.anchors.get(name);
  if (!target) return false;
  target.scrollIntoView({ block: 'start' });
  return true;
}

/**
 * Оборачивает последовательные части в вложенные секции по уровням заголовков.
 * @param {Element} root Очищенный контейнер, чьи прежние дочерние узлы переставляются.
 * @returns {void} Сохраняет прежние узлы и их порядок, создавая только section-обёртки.
 */
function groupSections(root) {
  const stack = [{ level: 0, element: root }];
  for (const node of [...root.childNodes]) {
    const level = /^H[1-6]$/.test(node.nodeName) ? Number(node.nodeName.slice(1)) : 0;
    if (level) {
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
      const section = root.ownerDocument.createElement('section');
      section.className = 'document-section';
      section.dataset.level = String(level);
      stack[stack.length - 1].element.append(section);
      stack.push({ level, element: section });
    }
    stack[stack.length - 1].element.append(node);
  }
}

/**
 * Создаёт pre/code с буквальным текстом документа без разбора HTML.
 * @param {Document} owner Документ, создающий узлы исходного текста.
 * @param {string} content Буквальный текст материала.
 * @param {string} [className] Класс pre: исходный документ либо не-Markdown текст.
 * @returns {HTMLPreElement} Новый pre с code; textContent не исполняет разметку.
 */
function sourceView(owner, content, className = 'document-source primary') {
  const pre = owner.createElement('pre');
  pre.className = className;
  const code = owner.createElement('code');
  code.textContent = content;
  pre.append(code);
  return pre;
}

/**
 * Заменяет содержимое безопасным текстом или очищенным оформленным Markdown.
 * @param {HTMLElement} container Прежний контейнер одного документа; старое управление таблицами сначала снимается.
 * @param {DocumentContent} document Успешно прочитанные текст и формат.
 * @param {ContentOptions} options Готовый вид, действия ссылок, якорь, сообщения и подписи таблиц.
 * @returns {void} Вставляет DOM и подключает таблицы; при отказе преобразования сохраняет буквальный исходник с пояснением.
 * @throws {Error} Отсутствующий строковый content или ошибка освобождения старого управления передаются владельцу.
 */
export function renderDocumentContent(container, document, options) {
  if (typeof document?.content !== 'string') throw new TypeError('Не передано содержимое документа.');
  disposeDocumentContent(container);
  const owner = container.ownerDocument;
  if (options.mode !== 'html') {
    container.replaceChildren(sourceView(owner, document.content));
    return;
  }
  const root = owner.createElement('div');
  root.className = 'document-html primary';
  if (document.format !== 'markdown') {
    root.append(sourceView(owner, document.content, 'document-text'));
  } else {
    try {
      if (!DOMPurify.isSupported) throw new Error('HTML-очистка недоступна.');
      // Инертный документ template не загружает ресурсы из сырого HTML.
      // В документ страницы попадают только уже очищенные узлы.
      const template = owner.createElement('template');
      const staging = template.content.ownerDocument.createElement('div');
      const markup = markdown.parse(document.content, { async: false });
      staging.innerHTML = markup;
      DOMPurify.sanitize(staging, sanitizeOptions);
      replaceImages(staging, options.imageLabel);
      const anchors = isolateAnchors(staging, owner);
      setLinks(staging, anchors, options);
      const links = { root: staging, anchors, options };
      bindLinks(links);
      for (const parent of staging.querySelectorAll('div, blockquote, li, dd, td, th')) groupSections(parent);
      groupSections(staging);
      staging.className = 'document-html primary';
      container.replaceChildren(staging);
      documentLinks.set(container, links);
      documentControls.set(container, resizeDocumentTables(staging, options.columnLabel));
      if (options.anchor !== null && options.anchor !== undefined) scrollDocumentAnchor(container, options.anchor);
      return;
    } catch {
      // Исходный текст остаётся доступен, если разметку нельзя безопасно показать.
      const message = owner.createElement('p');
      message.className = 'document-rendering-error muted';
      message.textContent = options.htmlUnavailable;
      root.append(message, sourceView(owner, document.content));
    }
  }
  container.replaceChildren(root);
}

/**
 * Приостанавливает управление прежними таблицами для живого переноса контейнера.
 * @param {HTMLElement} container Контейнер нынешнего оформленного документа.
 * @returns {PreparedMove} Действия переноса имеющегося управления; без таблиц возвращает пустые синхронные действия.
 */
export function prepareDocumentContent(container) {
  return documentControls.get(container)?.prepareMove() || { resume() {}, rollback() {}, commit() {} };
}
