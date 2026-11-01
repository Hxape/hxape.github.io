/** Согласует форму добавления и список в загруженном HTML-каркасе управления токенами. */

/**
 * Необязательная явная открытость секции добавления токена.
 * @typedef {Object} TokenManagerState
 * @property {boolean} [addExpanded] При наличии задаёт details.open; без свойства сохраняется нативный выбор.
 */

/**
 * Согласует секцию добавления и видимость списка уже загруженной формы.
 * @param {HTMLDialogElement} dialog Диалог с #token-add-details и #token-list.
 * @param {TokenManagerState} [model] Необязательная явная открытость секции добавления токена.
 * @returns {void} Показывает список только при свёрнутой секции добавления; отсутствующие узлы пропускает.
 */
export function showTokenManager(dialog, model = {}) {
  const details = /** @type {HTMLDetailsElement|null} */ (dialog.querySelector('#token-add-details'));
  const list = /** @type {HTMLElement|null} */ (dialog.querySelector('#token-list'));
  if (details && model.addExpanded !== undefined) details.open = model.addExpanded;
  if (list) list.hidden = Boolean(details?.open);
}
