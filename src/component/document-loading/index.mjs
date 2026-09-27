/** Показывает ожидание документа с переданными текстом и знаком загрузки. */

/**
 * Подпись ожидания и выбранный владельцем знак или тематические изображения.
 * @typedef {Object} DocumentLoadingContent
 * @property {string} label Доступное имя области ожидания.
 * @property {string} message Видимое сообщение role=status о выполняемой загрузке.
 * @property {import('lit').TemplateResult} [icon] Необязательный знак ожидания, используемый без images.
 * @property {LoadingImages} [images] Необязательная пара изображений; при её наличии icon не показывается.
 */

/**
 * Два изображения состояния загрузки для существующих классов светлой и тёмной темы.
 * @typedef {Object} LoadingImages
 * @property {string} light Адрес изображения светлой темы.
 * @property {string} dark Адрес изображения тёмной темы.
 */
import { html } from 'lit';

/**
 * Создаёт состояние ожидания с обычным значком либо изображениями двух тем.
 * @param {DocumentLoadingContent} content Подпись ожидания и выбранный владельцем знак или тематические изображения.
 * @returns {import('lit').TemplateResult} Шаблон ожидания; сеть для материала и завершение загрузки остаются у владельца.
 */
export function documentLoading({ label, message, icon, images }) {
  return html`
    <section
      class      = "document-private"
      aria-label = ${label}
    >
    ${
    images
      ? html`<span
          class       = "github-loading-icon"
          aria-hidden = "true"
        >
          <img
            class = "brand-logo-light"
            src   = ${images.light}
            alt   = ""
          >
          <img
            class = "brand-logo-dark"
            src   = ${images.dark}
            alt   = ""
          >
        </span>`
      : html`<span
        class       = "loading-icon muted"
        aria-hidden = "true"
      >${icon}</span>`
  }
      <p
        class = "document-state muted"
        role  = "status"
      >${message}</p>
    </section>`;
}
