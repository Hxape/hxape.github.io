/** Очищает строчную приписку и разрешает только ссылки HTTP(S). */

/**
 * Разрешённая владельцем строчная разметка приписки.
 * @typedef {Object} CaptionPolicy
 * @property {string[]} tags Список разрешённых тегов для DOMPurify.
 * @property {string[]} attributes Список разрешённых атрибутов; data и aria дополнительно запрещены.
 */
import DOMPurify from '../../../vendor/dompurify-3.4.16/purify.es.mjs';

/**
 * Очищает копию приписки и оставляет ссылки только с адресом HTTP(S).
 * @param {HTMLTemplateElement} template Исходный template приписки; его содержимое не изменяется.
 * @param {CaptionPolicy} policy Разрешённая владельцем строчная разметка приписки.
 * @returns {HTMLElement} Новый span приписки; у неверной ссылки сохраняется только её текстовое содержимое.
 */
export function captionElement(template, policy) {
  const caption = template.ownerDocument.createElement('span');
  caption.append(template.content.cloneNode(true));
  DOMPurify.sanitize(caption, {
    IN_PLACE: true,
    ALLOWED_TAGS: policy.tags,
    ALLOWED_ATTR: policy.attributes,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
  });
  caption.className = 'catalog-caption muted';
  for (const link of caption.querySelectorAll('a')) {
    const value = link.getAttribute('href');
    let url = null;
    try {
      if (value) {
        const candidate = new URL(value, template.ownerDocument.baseURI);
        if (candidate.protocol === 'http:' || candidate.protocol === 'https:') url = candidate.href;
      }
    } catch {}
    if (!url) link.replaceWith(...link.childNodes);
    else {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }
  return caption;
}

/**
 * Добавляет один пустой носитель значка перед исходным текстом ссылки; изображение и тень задаются CSS.
 * @param {HTMLAnchorElement} link Ссылка, назначение которой уже классифицировал каталог.
 * @param {boolean} visible Показывать значок известного назначения; false удаляет прежний носитель.
 * @returns {void} Ссылка, её адрес и текст не заменяются; носитель скрыт от вспомогательных средств.
 */
export function showCaptionLinkIcon(link, visible) {
  const current = link.querySelector(':scope > .navigation-link-icon');
  if (!visible) {
    current?.remove();
    return;
  }
  if (current) return;
  const icon = link.ownerDocument.createElement('span');
  icon.className = 'navigation-link-icon';
  icon.setAttribute('aria-hidden', 'true');
  link.prepend(icon);
}
