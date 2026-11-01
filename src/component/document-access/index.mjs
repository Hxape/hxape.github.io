/** Показывает ограниченный доступ к документу и готовые действия читателя. */

/**
 * Объяснение недоступности и разрешённые читателю действия; проверку прав компонент не выполняет.
 * @typedef {Object} DocumentAccessContent
 * @property {string} message Причина отсутствия содержимого, уже сформулированная владельцем.
 * @property {ReadonlyArray<DocumentAccessAction>} actions Кнопки управления доступом в заданном порядке.
 */

/**
 * Одно готовое действие при недоступном содержимом.
 * @typedef {Object} DocumentAccessAction
 * @property {string} label Текст кнопки, например открытия токенов или повтора доступа.
 * @property {(event:MouseEvent)=>void} run Обработчик владельца; получает нажатие на эту кнопку.
 */
import { html } from 'lit';

/**
 * Показывает закрытое содержимое с причиной и действиями управления доступом.
 * @param {DocumentAccessContent} content Объяснение недоступности и разрешённые читателю действия; проверку прав компонент не выполняет.
 * @returns {import('lit').TemplateResult} Шаблон состояния ограничения с готовыми кнопками; запросы доступа выполняют их обработчики.
 */
export function documentAccess({ message, actions }) {
  return html`
    <div class="document-private">
      <svg
        class       = "private-lock muted"
        viewBox     = "0 0 24 24"
        aria-hidden = "true"
      >
        <rect
          x      = "5"
          y      = "10"
          width  = "14"
          height = "11"
          rx     = "2"
        />
        <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
      </svg>
      <p class="document-state muted">${message}</p>
      <div class="document-access-actions">${
    actions.map((action) =>
      html`<button
        type    = "button"
        class   = "document-retry control primary"
        @click  = ${action.run}
      >${action.label}</button>`
    )
  }</div>
    </div>`;
}
