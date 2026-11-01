/** Показывает отказ чтения документа и переданное действие повтора. */

/**
 * Подпись состояния ошибки, сообщение и уже подготовленный повтор чтения.
 * @typedef {Object} DocumentFailureContent
 * @property {string} label Доступное имя всей области отказа.
 * @property {string} message Пояснение ошибки в области role=alert; пустая строка снимает временное сообщение, сохраняя действие повтора.
 * @property {import('lit').TemplateResult} [icon] Значок отказа чтения на срок его сообщения; отсутствие оставляет только переданный повтор.
 * @property {DocumentRetry} retry Действие повторного чтения; его сроком жизни управляет владелец.
 */

/**
 * Готовое действие повторного чтения после отказа.
 * @typedef {Object} DocumentRetry
 * @property {string} label Доступное имя кнопки повтора.
 * @property {string} hint Подсказка кнопки, обычно с клавишей R.
 * @property {string} text Видимая текстовая подпись кнопки.
 * @property {import('lit').TemplateResult} icon Значок повторного чтения.
 * @property {boolean} [disabled] Повтор уже ожидает результат либо его сохранённый адрес больше нельзя восстановить.
 * @property {()=>void} run Обработчик владельца, запускающий новую попытку.
 */
import { html, nothing } from 'lit';

/**
 * Показывает отказ чтения и кнопку повторной попытки без разбора сетевой ошибки.
 * @param {DocumentFailureContent} content Подпись состояния ошибки, сообщение и уже подготовленный повтор чтения.
 * @returns {import('lit').TemplateResult} Шаблон области отказа и повтора; новая попытка не запускается до действия читателя.
 */
export function documentFailure({ label, message, icon, retry }) {
  const disabled = Boolean(retry.disabled);
  return html`
    <section
      class       = "document-private document-error"
      aria-label  = ${label}
    >
      ${icon ? html`<span class="loading-icon muted">${icon}</span>` : nothing}
      ${message ? html`<p
        class = "document-state muted"
        role  = "alert"
      >${message}</p>` : nothing}
      <button
        type              = "button"
        class             = "document-retry control primary"
        aria-label        = ${retry.label}
        aria-keyshortcuts = "R"
        data-tooltip      = ${retry.hint}
        ?disabled         = ${disabled}
        @click            = ${retry.run}
      >${retry.icon}<span>${retry.text}</span></button>
    </section>`;
}
