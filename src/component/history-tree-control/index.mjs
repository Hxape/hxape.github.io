/** Показывает подготовленный выбор раскрытия дерева; не хранит режим и не меняет ветви. */
import { screenTemplate } from '../../common/html/screen.mjs';

/**
 * Один подготовленный пункт настройки; его значение проверяет блок настроек.
 * @typedef {object} HistoryTreeOption
 * @property {string} value Скаляр, возвращаемый select при выборе пункта.
 * @property {string} label Видимая подпись поведения дерева.
 */
/**
 * Нынешний выбор и готовые подписи, переданные Preferences одной молекуле.
 * @typedef {object} HistoryTreeControlModel
 * @property {string} id Уникальный префикс связанных полей одного выбора.
 * @property {string} label Видимая и доступная подпись select.
 * @property {string} hint Граница действия настройки.
 * @property {string} value Принятый выбранный скаляр.
 * @property {ReadonlyArray<HistoryTreeOption>} options Пункты в порядке владельца настройки.
 * @property {string} message Отказ сохранения либо пустая строка.
 * @property {(value:string)=>void} onChange Передаёт выбранное значение Preferences для проверки и сохранения.
 */

/**
 * Выводит одну настройку без собственного хранения и управления деревом.
 * @param {HistoryTreeControlModel} model Готовые пункты, выбор, подписи и обработчик.
 * @returns {import('lit').TemplateResult} Связанное с label поле, пояснение и статус сохранения.
 */
export function renderHistoryTreeControl(model) {
  /**
   * Передаёт полный скаляр текущего select, не интерпретируя смысл режима.
   * @param {Event} event Изменение созданного поля выбора.
   * @returns {void} Проверку и сохранение выполняет model.onChange.
   */
  const changed = (event) => model.onChange(/** @type {HTMLSelectElement} */ (event.currentTarget).value);
  return screenTemplate('preferences', 'history-tree-control.historyTreeControl', {
    labelId: `${model.id}-label`,
    modeId: `${model.id}-mode`,
    hintId: `${model.id}-hint`,
    statusId: `${model.id}-status`,
    describedBy: `${model.id}-hint ${model.id}-status`,
    label: model.label,
    onChange: changed,
    optionsContent: model.options.map((option) =>
      screenTemplate('preferences', 'history-tree-control.option', {
        value: option.value,
        selected: option.value === model.value,
        content: option.label,
      }),
    ),
    hint: model.hint,
    message: model.message,
  });
}
