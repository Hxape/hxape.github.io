/** Общие DOM-проверки и получение окна документа для основного вида и Picture-in-Picture. */
/**
 * Окно владельца DOM с конструкторами его области, включая перенесённые в PiP узлы.
 * @typedef {Window & typeof globalThis} DisplayWindow
 */

/**
 * Создаёт элемент с классом и необязательным текстом без разбора HTML.
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} tag Имя создаваемого HTML-элемента.
 * @param {string} className Классы оформления, разделённые пробелами.
 * @param {string} [text] Исходный текст для textContent; HTML не разбирается.
 * @returns {HTMLElementTagNameMap[T]} Новый отсоединённый элемент исходного документа.
 */
export function element(tag, className, text) {
  const item = document.createElement(tag);
  item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

/**
 * Проверяет узел по признакам DOM, в том числе после переноса в другое окно.
 * @param {unknown} value Значение из DOM или внешнего события, включая другое окно.
 * @returns {value is Element} true при наличии проверяемых признаков элемента.
 */
export function isElement(value) {
  return typeof value === 'object' && value !== null && 'nodeType' in value && value.nodeType === 1
    && 'localName' in value;
}

/**
 * Отличает HTML-элемент от SVG и других узлов DOM.
 * @param {unknown} value Значение, для которого требуются HTML-свойства.
 * @returns {value is HTMLElement} true для элемента в пространстве имён HTML.
 */
export function isHTMLElement(value) {
  return isElement(value) && value.namespaceURI === 'http://www.w3.org/1999/xhtml';
}

/**
 * Проверяет, что узел является раскрываемым элементом дерева.
 * @param {unknown} value Возможный узел из основного или PiP документа.
 * @returns {value is HTMLDetailsElement} true для HTML-элемента details.
 */
export function isDetails(value) {
  return isHTMLElement(value) && value.localName === 'details';
}

/**
 * Физическая клавиша без модификаторов и ввода, включая открытый Shadow DOM.
 * @param {KeyboardEvent} event Событие клавиатуры текущего документа.
 * @param {string} code Физическая клавиша из KeyboardEvent.code.
 * @returns {boolean} true только для свободной команды вне ввода, повторов и модификаторов.
 */
export function isCommandKey(event, code) {
  return event.code === code && !event.defaultPrevented && !event.repeat && !event.isComposing
    && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
    && !event.composedPath().some((node) =>
      isHTMLElement(node)
      && (node.matches('input, textarea, select') || node.isContentEditable)
    );
}

/**
 * Возвращает окно, которому сейчас принадлежит узел; отсутствие окна является ошибкой вызова.
 * @param {Node} node Документ либо живой узел, чьё нынешнее окно требуется.
 * @returns {DisplayWindow} Окно фактического документа узла.
 * @throws {Error} Если документ не имеет defaultView.
 */
export function displayWindow(node) {
  const owner = node.nodeType === 9 ? /** @type {Document} */ (node) : node.ownerDocument;
  if (!owner?.defaultView) throw new Error('The displayed node has no window');
  return /** @type {DisplayWindow} */ (owner.defaultView);
}
