/** Показывает готовую подпись опубликованной версии и результат сравнения. */

/**
 * Версия публикации с уже вычисленным результатом сравнения.
 * @typedef {Object} PublishedVersionContent
 * @property {string} text Видимая опубликованная версия.
 * @property {Node|null} [icon] Необязательный DOM-знак источника публикации.
 * @property {string} [label] Необязательное подробное имя версии и даты проверки.
 * @property {boolean} newer Готовый результат сравнения, включающий класс is-newer.
 */

/**
 * Создаёт подпись опубликованной версии и применяет готовый признак более новой.
 * @param {Document} owner Документ, в котором создаётся подпись публикации.
 * @param {PublishedVersionContent} content Версия публикации с уже вычисленным результатом сравнения.
 * @returns {HTMLSpanElement} Новый span публикации; номер не сравнивается и источник не запрашивается компонентом.
 */
export function publishedVersion(owner, { text, icon, label, newer }) {
  const caption = owner.createElement('span');
  caption.className = 'library-release muted';
  caption.textContent = text;
  if (icon) caption.prepend(icon);
  caption.classList.toggle('is-newer', newer);
  if (label) {
    caption.setAttribute('aria-label', label);
    caption.title = label;
  }
  return caption;
}
