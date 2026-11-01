/** Составляет раскрываемое меню цветов и времени подсветки строки. */

/**
 * Подготовленное меню акцента и заливки с открытостью, подписями и обработчиками раскрытия.
 * @typedef {Object} ColorsMenuModel
 * @property {string} hint Подсказка всего действия выбора цветов.
 * @property {string} label Доступное имя кнопки раскрытия.
 * @property {string} sectionLabel Доступное имя области полей цвета.
 * @property {boolean} open Открытость details, задаваемая владельцем меню.
 * @property {boolean} expanded Значение aria-expanded кнопки раскрытия.
 * @property {string} shortcut Подпись сочетания клавиш в aria-keyshortcuts.
 * @property {Parameters<typeof renderAccentControl>[0]} accent Готовые поля и действия выбора акцента.
 * @property {Parameters<typeof renderMarkControl>[0]} mark Готовые поля и действия выбора заливки mark.
 * @property {Parameters<typeof renderSourceHighlightControl>[0]} sourceHighlight Готовый выбор времени до снятия подсветки строки.
 * @property {(event:MouseEvent)=>void} onClick Обработчик нажатия на summary; владелец согласует открытость.
 * @property {(event:KeyboardEvent)=>void} onKey Обработчик клавиатуры внутри меню, включая переходы фокуса.
 */
import { html } from 'lit';
import { renderAccentControl } from '../accent-control/index.mjs';
import { renderMarkControl } from '../mark-control/index.mjs';
import { renderSourceHighlightControl } from '../source-highlight-control/index.mjs';

/**
 * Составляет раскрываемую область цветов и отдельно подготовленного времени подсветки.
 * @param {ColorsMenuModel} model Подготовленное меню акцента и заливки с открытостью, подписями и обработчиками раскрытия.
 * @returns {import('lit').TemplateResult} Шаблон меню с полями акцента, mark и времени строки; состояние раскрытия и значений принадлежит Preferences.
 */
export function renderColorsMenu(model) {
  return html`
    <li
      class        = "accent-tool"
      data-tooltip = ${model.hint}
    >
      <div
        class = "accent-controls control-row"
        id    = "accent-controls"
      >
        <details
          class       = "accent-menu"
          id          = "accent-menu"
          .open       = ${model.open}
          @keydown    = ${model.onKey}
        >
          <summary
            class             = "accent-swatch icon-button"
            aria-label        = ${model.label}
            aria-keyshortcuts = ${model.shortcut}
            aria-expanded     = ${model.expanded}
            @click            = ${model.onClick}
          ></summary>
          <section
            class      = "accent-picker popover surface"
            aria-label = ${model.sectionLabel}
          >${
    renderAccentControl(model.accent)
  }${renderMarkControl(model.mark)}${renderSourceHighlightControl(model.sourceHighlight)}</section>
        </details>
      </div>
    </li>`;
}
