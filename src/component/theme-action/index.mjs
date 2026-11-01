/** Показывает действие смены темы по готовой подписи и значку. */

/**
 * Готовое действие выбора другой темы.
 * @typedef {Object} ThemeActionModel
 * @property {string} label Доступное имя смены темы.
 * @property {string} hint Подсказка кнопки с нынешним направлением смены.
 * @property {string} shortcut Клавиша действия в aria-keyshortcuts.
 * @property {import('lit').TemplateResult} icon Значок направления смены темы.
 * @property {()=>void} onClick Обработчик владельца темы.
 */
import { html } from 'lit';

/**
 * Показывает кнопку смены темы и передаёт нажатие владельцу.
 * @param {ThemeActionModel} model Готовое действие выбора другой темы.
 * @returns {import('lit').TemplateResult} Шаблон кнопки в элементе меню; тема здесь не выбирается и не сохраняется.
 */
export function renderThemeAction(model) {
  return html`
    <li data-tooltip=${model.hint}>
      <button
        type              = "button"
        class             = "theme-button icon-button muted"
        id                = "theme-toggle"
        aria-label        = ${model.label}
        aria-keyshortcuts = ${model.shortcut}
        @click            = ${model.onClick}
      >${model.icon}</button>
    </li>`;
}
