/** Показывает подготовленные сведения об установленной версии. */

/**
 * Подготовленные текст версии и необязательные новые адрес и подсказка.
 * @typedef {Object} VersionCaptionModel
 * @property {string} text Видимая строка версии.
 * @property {string} [href] Необязательный новый адрес; отсутствие сохраняет прежний href.
 * @property {string} [title] Необязательная новая подсказка; отсутствие сохраняет прежний title.
 */

/**
 * Меняет подпись версии, сохраняя адрес и подсказку при отсутствии новых значений.
 * @param {HTMLAnchorElement} link Уже существующая ссылка подписи версии.
 * @param {VersionCaptionModel} model Подготовленные текст версии и необязательные новые адрес и подсказка.
 * @returns {void} Обновляет только переданную ссылку версии.
 */
export function showVersionCaption(link, model) {
  link.textContent = model.text;
  if (model.href !== undefined) link.href = model.href;
  if (model.title !== undefined) link.title = model.title;
}
