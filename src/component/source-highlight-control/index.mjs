/** Показывает дискретный выбор времени подсветки из готовых значений и действия владельца. */
import { screenTemplate } from '../../common/html/screen.mjs';
import { nothing } from 'lit';

/**
 * Готовое представление одного ползунка; миллисекунды, хранение и таймеры остаются у владельцев.
 * @typedef {Object} SourceHighlightControlModel
 * @property {string} label Подпись времени до снятия подсветки строки.
 * @property {number} index Нынешняя позиция дискретного range, начиная с 0.
 * @property {number} max Последняя доступная позиция range, подготовленная Preferences.
 * @property {string} valueLabel Доступное название выбранного срока; у бесконечности объясняет отсутствие гашения.
 * @property {import('lit').TemplateResult|null} valueIcon Знак бесконечности вместо видимого текста; null показывает valueLabel.
 * @property {string} message Готовое сообщение об отказе сохранения; пустая строка скрывается CSS.
 * @property {(value:string)=>void} onInput Передаёт строку нынешнего индекса владельцу для проверки и принятия.
 */

/**
 * Выводит ползунок, выбранный срок и результат сохранения без собственного состояния настройки.
 * @param {SourceHighlightControlModel} model Готовый индекс, подписи и действие настройки времени.
 * @returns {import('lit').TemplateResult} Молекула на атомах формы; выбор индекса не создаёт таймер подсветки.
 */
export function renderSourceHighlightControl(model) {
  /**
   * Передаёт нынешнюю строку range владельцу без перевода индекса в миллисекунды.
   * @param {Event} event Ввод в единственный range этого поля.
   * @returns {void} Preferences проверяет индекс и принимает длительность; компонент ничего не сохраняет.
   */
  const input = (event) => model.onInput(/** @type {HTMLInputElement} */ (event.currentTarget).value);
  return screenTemplate('preferences', 'source-highlight-control.sourceHighlightControl', {
    label: model.label,
    max: model.max,
    value: String(model.index),
    valueLabel: model.valueLabel,
    onInput: input,
    valueIconContent: model.valueIcon || model.valueLabel,
    messageContent: model.message || nothing,
  });
}
