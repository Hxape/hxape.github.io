/** Показывает готовую подпись установленной версии и её источник. */

/**
 * Подготовленные номер установки и знак её источника.
 * @typedef {Object} InstalledVersionContent
 * @property {string} text Видимая версия без вычисления её происхождения.
 * @property {Node|null} [icon] Необязательный DOM-знак источника установки.
 * @property {string} [label] Необязательное подробное имя версии для aria-label и title.
 */

/**
 * Создаёт подпись установленной версии с выбранным владельцем знаком источника.
 * @param {Document} owner Документ, создающий узел подписи, в том числе документ PiP.
 * @param {InstalledVersionContent} content Подготовленные номер установки и знак её источника.
 * @returns {HTMLSpanElement} Новый span версии в указанном документе; его вставляет вызывающий блок.
 */
export function installedVersion(owner, { text, icon, label }) {
  const caption = owner.createElement('span');
  caption.className = 'library-version muted';
  caption.textContent = text;
  if (icon) caption.prepend(icon);
  if (label) {
    caption.setAttribute('aria-label', label);
    caption.title = label;
  }
  return caption;
}
