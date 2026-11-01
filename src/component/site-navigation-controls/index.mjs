/** Выводит действия журнала и общий режим ссылок без владения их состоянием. */

/**
 * Действия журнала и отдельная кнопка общего режима ссылок.
 * @typedef {Object} SiteNavigationModel
 * @property {NavigationAction[]} items История, закладки и поиск в заданном порядке.
 * @property {NavigationAction} mode Последняя кнопка, переключающая общий режим ссылок.
 */
import { html } from 'lit';
import { navigationTooltip } from '../../common/ui/text.mjs';

/**
 * Одна готовая кнопка переходов, доступная и при закрытом просмотре.
 * @typedef {Object} NavigationAction
 * @property {string} id DOM-id кнопки для связывания и фокуса.
 * @property {string} label Доступная подпись действия.
 * @property {string} shortcut Физические клавиши в aria-keyshortcuts, разделённые пробелом.
 * @property {string} [shortcutLabel] Готовая читаемая подпись клавиш для подсказки; отсутствие использует shortcut.
 * @property {import('lit').TemplateResult} icon Знак нынешнего действия или режима.
 * @property {(event:MouseEvent)=>void} onClick Действие владельца журнала или настроек ссылок; режим может подавить click после удержания.
 * @property {(event:PointerEvent)=>void} [onPointerDown] Начало удержания режима либо поиска; срок и действие хранит её владелец.
 * @property {()=>void} [onPointerLeave] Отмена ещё не принятого удержания при уходе указателя с кнопки.
 * @property {string} [holdHint] Пояснение удержания в доступном описании и подсказке.
 */

/**
 * Создаёт ряд готовых действий журнала и режима ссылок без чтения их состояния.
 * @param {SiteNavigationModel} model Действия журнала и отдельная кнопка общего режима ссылок.
 * @returns {import('lit').TemplateResult} Шаблон элементов меню; нажатия передаются подготовленным обработчикам.
 */
export function renderSiteNavigationControls(model) {
  return html`
    ${
      [...model.items, model.mode].map(item =>
      html`<li class="navigation-tool">
        <button
          type              = "button"
          id                = ${item.id}
          class             = "navigation-button icon-button muted"
          aria-label        = ${item.label}
          aria-keyshortcuts = ${item.shortcut}
          data-tooltip      = ${
        navigationTooltip(item.label, item.shortcutLabel || item.shortcut, item.holdHint)
      }
          aria-description  = ${
        item.holdHint || ''
      }
          @click            = ${item.onClick}
          @pointerdown      = ${item.onPointerDown}
          @pointerleave     = ${item.onPointerLeave}
        >${item.icon}</button>
      </li>`
    )
  }`;
}
