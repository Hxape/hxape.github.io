/** Связывает нативную форму и отображает подготовленную доступность её действий. */

/**
 * Частичное обновление доступности формы; отсутствующие свойства сохраняют прежнее состояние.
 * @typedef {Object} TokenFormState
 * @property {boolean} [submitDisabled] Необязательный запрет добавления во время операции.
 * @property {string} [submitLabel] Необязательная подпись кнопки добавления.
 * @property {boolean} [choicesDisabled] Необязательный запрет выбора способа защиты.
 * @property {boolean} [closeDisabled] Необязательный запрет действия закрытия.
 */

/**
 * Краткоживущие значения формы; секреты используются владельцем и затем очищаются в форме.
 * @typedef {Object} TokenFormValues
 * @property {string} label Введённая подпись токена, без предметной проверки.
 * @property {string} token Открытый введённый PAT; компонент не сохраняет его в своём состоянии.
 * @property {string} password Открытая парольная фраза, если выбрана парольная защита.
 * @property {string} mode Значение отмеченного способа хранения либо пустая строка.
 */

/**
 * Действия владельца формы добавления токена.
 * @typedef {Object} TokenFormHandlers
 * @property {()=>void} onSubmit Проверка и добавление токена после отменённой нативной отправки формы.
 * @property {(event:Event)=>void} onChange Обработка изменения способа защиты или иных полей формы.
 */

/**
 * Передаёт submit и change формы владельцу через нативный диалог.
 * @param {HTMLDialogElement} dialog Диалог, содержащий форму добавления и получающий всплывающие события.
 * @param {TokenFormHandlers} handlers Действия владельца формы добавления токена.
 * @returns {void} Отменяет обычную отправку страницы и вызывает onSubmit; повторное связывание исключает владелец.
 */
export function bindTokenForm(dialog, handlers) {
  dialog.addEventListener('submit', event => {
    event.preventDefault();
    handlers.onSubmit();
  });
  dialog.addEventListener('change', handlers.onChange);
}

/**
 * Читает обязательные поля формы без проверки токена и без удержания результата.
 * @param {HTMLFormElement} form Готовая форма с полями label, token, passphrase и вариантами storage.
 * @returns {TokenFormValues} Новый объект введённых значений; проверку и передачу секретов выполняет владелец.
 * @throws {Error} Обязательное поле отсутствует в каркасе формы.
 */
export function readTokenForm(form) {
  const label = /** @type {HTMLInputElement} */ (form.querySelector('input[name="label"]'));
  const token = /** @type {HTMLInputElement} */ (form.querySelector('input[name="token"]'));
  const password = /** @type {HTMLInputElement} */ (form.querySelector('input[name="passphrase"]'));
  const mode = /** @type {HTMLInputElement|null} */ (form.querySelector('input[name="storage"]:checked'));
  return { label: label.value, token: token.value, password: password.value, mode: mode?.value || '' };
}

/**
 * Обновляет только переданные части формы, не заменяя поля или введённые значения.
 * @param {HTMLDialogElement} dialog Диалог с прежней формой и действием закрытия.
 * @param {TokenFormState} model Частичное обновление доступности формы; отсутствующие свойства сохраняют прежнее состояние.
 * @returns {void} Меняет найденные кнопки и fieldset; отсутствующие узлы и свойства пропускает.
 */
export function showTokenForm(dialog, model) {
  const submit = /** @type {HTMLButtonElement|null} */ (dialog.querySelector('#token-form button[type="submit"]'));
  const choices = /** @type {HTMLFieldSetElement|null} */ (dialog.querySelector('#token-form fieldset'));
  const close = /** @type {HTMLButtonElement|null} */ (dialog.querySelector('button[data-token-action="close"]'));
  if (submit && model.submitDisabled !== undefined) submit.disabled = model.submitDisabled;
  if (submit && model.submitLabel !== undefined) submit.textContent = model.submitLabel;
  if (choices && model.choicesDisabled !== undefined) choices.disabled = model.choicesDisabled;
  if (close && model.closeDisabled !== undefined) close.disabled = model.closeDisabled;
}

/**
 * Очищает PAT и все парольные поля после разрешённого владельцем завершения.
 * @param {HTMLDialogElement} dialog Диалог с полями секретов; необязательные отсутствующие поля пропускаются.
 * @param {string} submitLabel Подпись кнопки добавления после очистки.
 * @returns {void} Сбрасывает значения чувствительных полей и подпись submit; название токена не очищает.
 */
export function clearTokenForm(dialog, submitLabel) {
  const token = /** @type {HTMLInputElement|null} */ (dialog.querySelector('input[name="token"]'));
  if (token) token.value = '';
  for (const input of dialog.querySelectorAll('input[type="password"]')) {
    /** @type {HTMLInputElement} */ (input).value = '';
  }
  showTokenForm(dialog, { submitLabel });
}
