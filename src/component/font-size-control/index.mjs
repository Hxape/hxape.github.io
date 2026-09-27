/** Показывает действия уменьшения и увеличения текста без хранения выбранного размера. */
import { screenTemplate } from '../../common/html/screen.mjs';

/**
 * Готовые подписи, доступность и действия двух направлений изменения текста.
 * @typedef {Object} FontSizeControlModel
 * @property {string} label Доступное имя группы изменения размера.
 * @property {string} smallerLabel Подпись и подсказка уменьшения текста.
 * @property {string} largerLabel Подпись и подсказка увеличения текста.
 * @property {boolean} smallerDisabled Запрет уменьшения на нижней границе размера.
 * @property {boolean} largerDisabled Запрет увеличения на верхней границе размера.
 * @property {import('lit').TemplateResult} smallerIcon Значок уменьшения текста.
 * @property {import('lit').TemplateResult} largerIcon Значок увеличения текста.
 * @property {()=>void} onSmaller Действие владельца, выбирающее меньший размер.
 * @property {()=>void} onLarger Действие владельца, выбирающее больший размер.
 */

/**
 * Составляет две кнопки изменения размера текста с готовыми границами доступности.
 * @param {FontSizeControlModel} model Готовые подписи, доступность и действия двух направлений изменения текста.
 * @returns {import('lit').TemplateResult} Шаблон пары действий; выбранный размер и его сохранение не принадлежат компоненту.
 */
export function renderFontSizeControl(model) {
  return screenTemplate('preferences', 'font-size-control.fontTool', {
    label: model.label,
    smallerLabel: model.smallerLabel,
    smallerDisabled: model.smallerDisabled,
    onClick: model.onSmaller,
    smallerIcon: model.smallerIcon,
    largerLabel: model.largerLabel,
    largerDisabled: model.largerDisabled,
    onClick2: model.onLarger,
    largerIcon: model.largerIcon,
  });
}
