/** Связывает нативный диалог и показывает состояние загрузки его содержимого. */

/**
 * Причина отказа загрузки формы и готовый способ повтора.
 * @typedef {Object} TokenDialogFailureModel
 * @property {string} message Видимое сообщение отказа загрузки HTML.
 * @property {string} retryLabel Текст кнопки повтора.
 * @property {string} [retryAction] Необязательный ключ делегированного data-token-action.
 * @property {()=>void} [onRetry] Необязательный прямой обработчик повторной загрузки.
 */

/**
 * Действия владельца нативного диалога токенов.
 * @typedef {Object} TokenDialogHandlers
 * @property {()=>void} onBackdrop Закрытие по нажатию за прямоугольником диалога.
 * @property {(event:MouseEvent)=>void} onClick Делегированное действие внутри содержимого диалога.
 * @property {(event:Event)=>void} onCancel Обработка нативной отмены dialog, включая Escape.
 * @property {()=>void} onClose Очистка владельца после нативного close.
 */

/**
 * Связывает события диалога и отличает фон за окном от его содержимого.
 * @param {HTMLDialogElement} dialog Прежний нативный диалог управления токенами.
 * @param {TokenDialogHandlers} handlers Действия владельца нативного диалога токенов.
 * @returns {void} Регистрирует слушатели на данном диалоге; повторное связывание должен исключать владелец.
 */
export function bindTokenDialog(dialog, handlers) {
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top
        || event.clientY > bounds.bottom
      ) handlers.onBackdrop();
      return;
    }
    handlers.onClick(event);
  });
  dialog.addEventListener('cancel', handlers.onCancel);
  dialog.addEventListener('close', handlers.onClose);
}

/**
 * Показывает сообщение ожидания вместо ещё не загруженной формы.
 * @param {HTMLDialogElement} dialog Диалог до вставки его HTML-каркаса.
 * @param {string} message Готовая подпись ожидания загрузки формы.
 * @returns {void} Заменяет содержимое диалога текстом ожидания.
 */
export function showTokenDialogLoading(dialog, message) {
  dialog.textContent = message;
}

/**
 * Заменяет неготовое содержимое диалога сообщением отказа и кнопкой повтора.
 * @param {HTMLDialogElement} dialog Диалог, чья форма не была успешно загружена.
 * @param {TokenDialogFailureModel} model Причина отказа загрузки формы и готовый способ повтора.
 * @returns {void} Создаёт сообщение и кнопку в документе диалога; загрузку выполняет переданное действие.
 */
export function showTokenDialogFailure(dialog, model) {
  const message = dialog.ownerDocument.createElement('p');
  message.textContent = model.message;
  const retry = dialog.ownerDocument.createElement('button');
  retry.type = 'button';
  retry.textContent = model.retryLabel;
  if (model.retryAction) retry.dataset.tokenAction = model.retryAction;
  if (model.onRetry) retry.addEventListener('click', model.onRetry);
  dialog.replaceChildren(message, retry);
}
