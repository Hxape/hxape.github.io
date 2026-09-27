/*! Adapted from HTMX 2.0.11: makeFragment, normalizeScriptTags, swapInnerHTML.
 * https://github.com/bigskysoftware/htmx/blob/v2.0.11/src/htmx.js
 * License: 0BSD, vendor/htmx-2.0.11/LICENSE. */

/** Разбирает разрешённый HTML-фрагмент в документе получателя и вставляет его без script. */
/**
 * Удаляет script, включая отложенное содержимое вложенных template, до подключения фрагмента.
 * @param {DocumentFragment} fragment Инертный HTML, который ещё не вставлен в живой DOM.
 * @returns {void} Изменяет только переданный фрагмент.
 */
function removeScripts(fragment) {
  for (const script of fragment.querySelectorAll('script')) script.remove();
  for (const template of fragment.querySelectorAll('template')) removeScripts(template.content);
}

/**
 * Разбирает HTML в документе целевого узла и удаляет скрипты до вставки.
 * @param {HTMLElement} target Узел получателя; его прежние дочерние узлы будут заменены.
 * @param {string} response Текст проверенного разрешённого HTML-фрагмента.
 * @returns {void} Вставляет очищенный фрагмент в документ получателя.
 * @throws {Error} Отказ создания или замены DOM передаётся владельцу загрузки.
 */
export function insertFragment(target, response) {
  const range = target.ownerDocument.createRange();
  range.selectNodeContents(target);
  const fragment = range.createContextualFragment(response);
  removeScripts(fragment);
  target.replaceChildren(fragment);
}
