/** Показывает ползунок длительности и текущее значение. */
import { screenTemplate } from '../../common/html/screen.mjs';

/**
 * Диапазон удержания в миллисекундах и действие передачи выбранного значения.
 * @typedef {Object} HoldDurationModel
 * @property {string} label Видимая подпись настройки удержания.
 * @property {number} min Нижняя граница range в миллисекундах.
 * @property {number} max Верхняя граница range в миллисекундах.
 * @property {number} step Шаг изменения range в миллисекундах.
 * @property {number} value Нынешняя длительность удержания.
 * @property {string} valueLabel Готовая текстовая длительность для output и aria-valuetext.
 * @property {(event:Event)=>void} onInput Обработчик владельца, читающий новое значение ползунка.
 */

/**
 * Показывает ползунок длительности удержания и его текстовую величину.
 * @param {HoldDurationModel} model Диапазон удержания в миллисекундах и действие передачи выбранного значения.
 * @returns {import('lit').TemplateResult} Шаблон настройки; компонент не применяет таймер удержания и не сохраняет значение.
 */
export function renderHoldDurationControl(model) {
  return screenTemplate('preferences', 'hold-duration-control.holdControl', {
    label: model.label,
    min: model.min,
    max: model.max,
    step: model.step,
    value: String(model.value),
    valueLabel: model.valueLabel,
    onInput: model.onInput,
  });
}
