/** Показывает открытость нижнего блока и согласует его кнопку раскрытия. */

/**
 * Доступность нижнего блока, его выбранная открытость и подпись действия.
 * @typedef {Object} FooterDisclosureModel
 * @property {boolean} available Разрешает показ нижних настроек; false скрывает также кнопку раскрытия.
 * @property {boolean} expanded Желаемая открытость при доступном блоке.
 * @property {string} label Подпись кнопки раскрытия, уже выбранная владельцем.
 */

/**
 * Прежние узлы нижнего блока настроек.
 * @typedef {Object} FooterDisclosureDOM
 * @property {HTMLElement} footer Общий footer с атрибутом открытости настроек.
 * @property {HTMLElement} region Область настроек, которую скрывают при сворачивании.
 * @property {HTMLButtonElement} toggle Кнопка раскрытия области.
 */

/**
 * Подпись и открытость связанной области.
 * @typedef {Object} DisclosureButtonModel
 * @property {boolean} expanded Готовая открытость для aria-expanded.
 * @property {string} label Доступное имя и подсказка нынешнего направления действия.
 */

/**
 * Согласует подпись и aria-expanded кнопки с готовой открытостью области.
 * @param {HTMLButtonElement} button Существующая кнопка раскрытия области.
 * @param {DisclosureButtonModel} model Подпись и открытость связанной области.
 * @returns {void} Обновляет только атрибуты кнопки.
 */
export function showDisclosureButton(button, model) {
  button.setAttribute('aria-expanded', String(model.expanded));
  button.setAttribute('aria-label', model.label);
  button.dataset.tooltip = model.label;
}

/**
 * Согласует видимость нижних настроек и их кнопки без сохранения выбора.
 * @param {FooterDisclosureDOM} elements Прежние узлы нижнего блока и кнопки раскрытия.
 * @param {FooterDisclosureModel} model Доступность нижнего блока, его выбранная открытость и подпись действия.
 * @returns {void} У недоступного блока скрывает область и кнопку; иначе отражает expanded.
 */
export function showFooterDisclosure(elements, model) {
  const expanded = model.available && model.expanded;
  elements.footer.dataset.settingsExpanded = String(expanded);
  elements.toggle.hidden = !model.available;
  elements.region.hidden = !expanded;
  showDisclosureButton(elements.toggle, { expanded, label: model.label });
}
