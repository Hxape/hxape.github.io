/** Показывает подготовленные сообщения и доступность повтора чтения списка. */

/**
 * Частично подготовленные сообщения токенов, воркера и доступность повтора чтения.
 * @typedef {Object} TokenStatusModel
 * @property {string} [message] Необязательное сообщение операции токена.
 * @property {string} [workerMessage] Необязательное сообщение подключения или потери воркера.
 * @property {boolean} [storageRetryVisible] Необязательная видимость действия повторного чтения хранилища.
 */

/**
 * Обновляет переданные сообщения диалога и доступность повторного чтения списка.
 * @param {HTMLDialogElement} dialog Диалог с областями #token-status, #octocat-status и кнопкой retry-storage.
 * @param {TokenStatusModel} model Частично подготовленные сообщения токенов, воркера и доступность повтора чтения.
 * @returns {void} Остальные сообщения сохраняются; соединение и причина отказа не определяются компонентом.
 */
export function showTokenStatus(dialog, model) {
  const status = dialog.querySelector('#token-status');
  const worker = dialog.querySelector('#octocat-status');
  const retry =
    /** @type {HTMLButtonElement|null} */ (dialog.querySelector('button[data-token-action="retry-storage"]'));
  if (status && model.message !== undefined) status.textContent = model.message;
  if (worker && model.workerMessage !== undefined) worker.textContent = model.workerMessage;
  if (retry && model.storageRetryVisible !== undefined) retry.hidden = !model.storageRetryVisible;
}
