/** Показывает поля и пояснения выбранного способа защиты формы. */

/**
 * Готовая видимость полей выбранного способа защиты.
 * @typedef {Object} TokenProtectionState
 * @property {boolean} passwordVisible Показывает строку пароля и её пояснение.
 * @property {boolean} passkeyHintVisible Показывает пояснение защиты ключом доступа.
 * @property {boolean} passwordRequired Задаёт нативную обязательность поля парольной фразы.
 */

/**
 * Отражает выбранный владельцем способ защиты через видимость и required.
 * @param {HTMLFormElement} form Форма добавления с парольной строкой и двумя пояснениями защиты.
 * @param {TokenProtectionState} model Готовая видимость полей выбранного способа защиты.
 * @returns {void} Обновляет только существующие поля и пояснения; значение способа хранения не выбирает.
 */
export function showTokenProtectionChoice(form, model) {
  const row = /** @type {HTMLElement|null} */ (form.querySelector('#token-passphrase-row'));
  const passwordHint = /** @type {HTMLElement|null} */ (form.querySelector('.token-hint'));
  const passkeyHint = /** @type {HTMLElement|null} */ (form.querySelector('.token-passkey-hint'));
  const password = /** @type {HTMLInputElement|null} */ (form.querySelector('input[name="passphrase"]'));
  if (row) row.hidden = !model.passwordVisible;
  if (passwordHint) passwordHint.hidden = !model.passwordVisible;
  if (passkeyHint) passkeyHint.hidden = !model.passkeyHintVisible;
  if (password) password.required = model.passwordRequired;
}
