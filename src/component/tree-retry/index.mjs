/** Показывает отдельное действие повтора загрузки дерева. */

/**
 * Создаёт текстовое действие повтора для делегированного обработчика дерева.
 * @param {Document} owner Документ строки ожидания или отказа.
 * @param {string} label Видимое имя повторяемого действия.
 * @param {string} action Ключ data-action, который распознаёт владелец каталога.
 * @returns {HTMLButtonElement} Новая кнопка повтора; запросы не запускаются до обработанного нажатия.
 */
export function treeRetry(owner, label, action) {
  const button = owner.createElement('button');
  button.className = 'document-retry control primary';
  button.type = 'button';
  button.textContent = label;
  button.dataset.action = action;
  return button;
}
