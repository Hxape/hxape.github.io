/** Показывает галочку восстановления доступа и её готовую подпись. */

/**
 * Выбор автоматического запуска воркера и запроса ключа доступа.
 * @typedef {Object} TokenRecoveryState
 * @property {boolean} checked Готовое значение checkbox автоматического восстановления.
 * @property {string} [label] Необязательная новая подпись checkbox.
 */

/**
 * Согласует подпись и состояние флага восстановления без его запуска.
 * @param {HTMLDialogElement} dialog Диалог с #octocat-auto-restore и местом его подписи.
 * @param {TokenRecoveryState} model Выбор автоматического запуска воркера и запроса ключа доступа.
 * @returns {void} Меняет найденные поле и подпись; сохранение настройки остаётся у владельца.
 */
export function showTokenRecoveryChoice(dialog, model) {
  const input = /** @type {HTMLInputElement|null} */ (dialog.querySelector('#octocat-auto-restore'));
  const label = dialog.querySelector('[data-octocat-auto-restore-label]');
  if (input) input.checked = model.checked;
  if (label && model.label !== undefined) label.textContent = model.label;
}
