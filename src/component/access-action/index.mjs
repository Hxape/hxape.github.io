/** Показывает действие открытия управления доступом без знания его состояния. */

/**
 * Готовое действие открытия диалога токенов; права и открытость определяет вызывающий блок.
 * @typedef {Object} AccessActionModel
 * @property {string} label Доступное имя кнопки и текст её подсказки.
 * @property {string} dialogId DOM-id диалога для aria-controls.
 * @property {import('lit').TemplateResult} icon Уже выбранный значок состояния доступа.
 * @property {()=>void} onClick Обработчик владельца, открывающий управление токенами.
 */
import { html } from 'lit';

/**
 * Создаёт кнопку открытия управления токенами без чтения их состояния.
 * @param {AccessActionModel} model Готовое действие открытия диалога токенов; права и открытость определяет вызывающий блок.
 * @returns {import('lit').TemplateResult} Шаблон элемента меню с кнопкой; DOM и действие открытия остаются у вызывающей стороны.
 */
export function renderAccessAction(model) {
  return html`
    <li data-tooltip=${model.label}>
      <button
        type          = "button"
        class         = "token-button icon-button muted"
        aria-label    = ${model.label}
        aria-haspopup = "dialog"
        aria-controls = ${model.dialogId}
        @click        = ${model.onClick}
      >${model.icon}</button>
    </li>`;
}
