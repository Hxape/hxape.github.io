/** Составляет единый popup преференсов с разметкой, загружаемой при открытии. */

/**
 * Открытость меню и подготовленные настройки значков, удержания и местного каталога.
 * @typedef {Object} IconsMenuModel
 * @property {string} hint Подсказка кнопки раскрытия.
 * @property {string} label Доступное имя меню.
 * @property {boolean} open Открытость details, задаваемая владельцем.
 * @property {boolean} expanded Значение aria-expanded summary.
 * @property {string} shortcut Клавиша раскрытия в aria-keyshortcuts.
 * @property {import('lit').TemplateResult} icon Готовый знак меню настроек.
 * @property {Parameters<typeof renderIconOptions>[0]} options Флаги видимости групп значков.
 * @property {Parameters<typeof renderHoldDurationControl>[0]} hold Диапазон и действия длительности удержания.
 * @property {Parameters<typeof renderOrganizationRootControl>[0]} organization Поле местного корня организации и сообщение его проверки.
 * @property {Parameters<typeof renderHistoryTreeControl>[0]} historyTree Выбор действия истории на дерево и сообщение его сохранения.
 * @property {Parameters<typeof renderHistoryTreeControl>[0]} searchTree Выбор действия поиска каталога на дерево.
 * @property {Parameters<typeof renderFontSizeControl>[0]} font Управление размером текста внутри popup.
 * @property {Parameters<typeof renderThemeAction>[0]} theme Та же операция темы, что у отдельной кнопки.
 * @property {Parameters<typeof renderAccentControl>[0]} accent Выбор акцента и сброс.
 * @property {Parameters<typeof renderMarkControl>[0]} mark Выбор заливки mark и сброс.
 * @property {Parameters<typeof renderSourceHighlightControl>[0]} sourceHighlight Время подсветки строки.
 * @property {boolean} loadFailed Разметка не загрузилась; данные преференсов остаются действующими.
 * @property {()=>void} retryLoad Явный повтор чтения preferences.html.
 * @property {(event:MouseEvent)=>void} onClick Обработчик раскрытия summary.
 * @property {(event:KeyboardEvent)=>void} onKey Обработчик клавиатуры меню и его фокуса.
 */
import { html } from 'lit';
import { screenReady, screenStatus, screenTemplate } from '../../common/html/screen.mjs';
import { renderAccentControl } from '../accent-control/index.mjs';
import { renderFontSizeControl } from '../font-size-control/index.mjs';
import { renderHistoryTreeControl } from '../history-tree-control/index.mjs';
import { renderHoldDurationControl } from '../hold-duration-control/index.mjs';
import { renderIconOptions } from '../icon-options/index.mjs';
import { renderMarkControl } from '../mark-control/index.mjs';
import { renderOrganizationRootControl } from '../organization-root-control/index.mjs';
import { renderSourceHighlightControl } from '../source-highlight-control/index.mjs';
import { renderThemeAction } from '../theme-action/index.mjs';

/**
 * Составляет раскрываемое меню значков, удержания и местного корня организации.
 * @param {IconsMenuModel} model Открытость меню и подготовленные настройки значков, удержания и местного каталога.
 * @returns {import('lit').TemplateResult} Шаблон подготовленных настроек; значения и сохранение остаются у Preferences.
 */
export function renderIconsMenu(model) {
  return html`
    <li
      class="icons-tool"
      data-tooltip=${model.hint}
    >
      <details
        class="icons-menu"
        id="icons-menu"
        .open=${model.open}
        @keydown=${model.onKey}
      >
        <summary
          class="icon-button muted"
          aria-label=${model.label}
          aria-keyshortcuts=${model.shortcut}
          aria-expanded=${model.expanded}
          @click=${model.onClick}
        >
          ${model.icon}
        </summary>
        ${screenReady('preferences')
          ? screenTemplate('preferences', 'preferences', {
              label: model.label,
              themeAction: screenTemplate('preferences', 'theme', model.theme),
              fontSizeControl: renderFontSizeControl(model.font),
              iconOptions: renderIconOptions(model.options),
              holdDuration: renderHoldDurationControl(model.hold),
              organizationRoot: renderOrganizationRootControl(model.organization),
              historyTree: renderHistoryTreeControl(model.historyTree),
              searchTree: renderHistoryTreeControl(model.searchTree),
              accentControl: renderAccentControl(model.accent),
              markControl: renderMarkControl(model.mark),
              sourceHighlight: renderSourceHighlightControl(model.sourceHighlight),
            })
          : html`
              <section class="icons-popover popover surface">
                ${screenStatus(model.loadFailed, model.retryLoad)}
              </section>
            `}
      </details>
    </li>
  `;
}
