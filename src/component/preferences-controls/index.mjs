/** Составляет единственное меню настроек из готовых представлений и обработчиков. */

/**
 * Готовые части одного меню действий и настроек.
 * @typedef {Object} PreferencesControlsModel
 * @property {string} label Доступное имя всего меню.
 * @property {Parameters<typeof renderSiteNavigationControls>[0]} navigation Кнопки истории, закладок, поиска и режима ссылок.
 * @property {Parameters<typeof renderFontSizeControl>[0]} font Действия уменьшения и увеличения текста.
 * @property {Omit<Parameters<typeof renderIconsMenu>[0],'font'|'theme'|'accent'|'mark'|'sourceHighlight'>} icons Единый popup преференсов и его поля значков, удержания и местного пути.
 * @property {Pick<Parameters<typeof import('../colors-menu/index.mjs').renderColorsMenu>[0],'accent'|'mark'|'sourceHighlight'>} colors Поля цветов и времени подсветки внутри преференсов.
 * @property {Parameters<typeof renderUpdateAction>[0]} update Начальное место кнопки обновления выпуска.
 * @property {Parameters<typeof renderAccessAction>[0]} access Действие управления токенами.
 * @property {Parameters<typeof renderThemeAction>[0]} theme Действие смены темы.
 * @property {(event:MouseEvent)=>void} onMouseDown Обработчик владельца, согласующий фокус при нажатии на меню.
 */
import { html } from 'lit';
import { renderAccessAction } from '../access-action/index.mjs';
import { renderFontSizeControl } from '../font-size-control/index.mjs';
import { renderIconsMenu } from '../icons-menu/index.mjs';
import { renderSiteNavigationControls } from '../site-navigation-controls/index.mjs';
import { renderThemeAction } from '../theme-action/index.mjs';
import { renderUpdateAction } from '../update-action/index.mjs';

/**
 * Составляет единое меню из подготовленных действий и самостоятельных настроек.
 * @param {PreferencesControlsModel} model Готовые части одного меню действий и настроек.
 * @returns {import('lit').TemplateResult} Шаблон организма меню; выбор значений, доступность и операции остаются у блоков.
 */
export function renderPreferencesControls(model) {
  return html`
    <menu
      class="header-tools plain-list control-row"
      aria-label=${model.label}
      @mousedown=${model.onMouseDown}
    >
      ${renderSiteNavigationControls(model.navigation)}${renderIconsMenu({
        ...model.icons,
        font: model.font,
        accent: model.colors.accent,
        mark: model.colors.mark,
        sourceHighlight: model.colors.sourceHighlight,
        theme: model.theme,
      })}${renderUpdateAction(model.update)}${renderAccessAction(model.access)}${renderThemeAction(model.theme)}
    </menu>
  `;
}
