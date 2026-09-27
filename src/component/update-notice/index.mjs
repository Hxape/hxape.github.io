/** Показывает ход обновления или отказ в плашке обновления. */

/**
 * Частичное состояние плашки выпуска и её кнопки повтора.
 * @typedef {Object} UpdateNoticeModel
 * @property {boolean} [hidden] Необязательная скрытость всей плашки.
 * @property {string} [text] Необязательное сообщение хода работы или отказа.
 * @property {boolean} [retryVisible] Необязательная доступность повтора в плашке.
 * @property {string} [retryLabel] Необязательное имя кнопки повторяемого действия.
 */

/**
 * Обновляет только переданные части плашки хода обновления.
 * @param {HTMLElement} notice Прежняя область с сообщением выпуска и кнопкой повтора.
 * @param {UpdateNoticeModel} model Частичное состояние плашки выпуска и её кнопки повтора.
 * @returns {void} Сохраняет остальные значения; выбор и запуск операции повтора принадлежат владельцу.
 */
export function showUpdateNotice(notice, model) {
  const message = notice.querySelector('#site-update-message');
  const retry = /** @type {HTMLButtonElement|null} */ (notice.querySelector('#site-update-retry'));
  if (model.hidden !== undefined) notice.hidden = model.hidden;
  if (message && model.text !== undefined) message.textContent = model.text;
  if (retry && model.retryVisible !== undefined) retry.hidden = !model.retryVisible;
  if (retry && model.retryLabel !== undefined) retry.textContent = model.retryLabel;
}
