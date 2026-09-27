/** Показывает ввод цвета акцента и доступность его сброса. */
import { screenTemplate } from '../../common/html/screen.mjs';

/**
 * Значение акцента, подписи двух полей и готовые действия владельца цвета.
 * @typedef {Object} AccentControlModel
 * @property {string} label Подпись выбора цвета и доступное имя цветового поля.
 * @property {string} hexLabel Доступное имя текстового поля HEX.
 * @property {string} value Готовое значение обоих полей, обычно #RRGGBB.
 * @property {string} resetLabel Подпись действия возврата к исходному цвету.
 * @property {boolean} resetDisabled Готовый запрет сброса, когда возвращать значение не требуется.
 * @property {import('lit').TemplateResult} resetIcon Значок действия сброса.
 * @property {()=>void} onReset Обработчик владельца, выбирающий исходный цвет.
 * @property {(event:Event)=>void} onInput Обработчик события input любого из двух полей; проверку и сохранение выполняет владелец.
 */

/**
 * Составляет выбор акцента из цветового и HEX-поля и действия сброса.
 * @param {AccentControlModel} model Значение акцента, подписи двух полей и готовые действия владельца цвета.
 * @returns {import('lit').TemplateResult} Шаблон полей акцента; ввод только передаётся владельцу, компонент цвет не сохраняет.
 */
export function renderAccentControl(model) {
  return screenTemplate('preferences', 'accent-control.popoverHeading', {
    label: model.label,
    resetLabel: model.resetLabel,
    resetDisabled: model.resetDisabled,
    onClick: model.onReset,
    resetIcon: model.resetIcon,
    value: model.value,
    onInput: model.onInput,
    hexLabel: model.hexLabel,
  });
}
