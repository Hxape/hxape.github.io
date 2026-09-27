/** Показывает готовые настройки сбора истории. */
import { screenTemplate } from '../../common/html/screen.mjs';

/**
 * Настройки, уже принятые владельцем истории; компонент не собирает и не объединяет записи.
 * @typedef {Object} HistoryControlsValues
 * @property {boolean} autoCollect Автоматический сбор разрешён; false сохраняет существующие записи.
 * @property {'all'|'merge'|'unique'} policy Выбранная проверенная политика накопления переходов.
 * @property {boolean} includeView Учитывать смену представления по правилам выбранной политики.
 * @property {number} limit Нынешний проверенный предел числа записей.
 * @property {boolean} empty В накопленной истории нет записей, поэтому очистка недоступна.
 */
/**
 * Подписи настроек истории, подготовленные вызывающим блоком.
 * @typedef {Object} HistoryControlsLabels
 * @property {string} collect Доступное имя автоматического сбора.
 * @property {string} policy Подпись выбора политики сбора.
 * @property {string} all Подпись хранения всех переходов.
 * @property {string} merge Подпись объединения последовательных переходов файла.
 * @property {string} unique Подпись единственной записи каждого файла.
 * @property {string} includeView Подпись учёта смены представления.
 * @property {string} limit Подпись предела числа записей.
 * @property {string} clear Подпись явной очистки всей истории.
 */
/**
 * Действия владельца настроек и постоянной истории.
 * @typedef {Object} HistoryControlsActions
 * @property {(enabled:boolean)=>void} autoCollect Принимает новый выбор автоматического сбора.
 * @property {(policy:string)=>void} policy Проверяет и принимает выбранный ключ политики.
 * @property {(enabled:boolean)=>void} includeView Принимает учёт смены вида.
 * @property {(limit:number)=>void} limit Проверяет и принимает число из поля, включая отказ неверному вводу.
 */

/**
 * Показывает поля текущего сбора; выключение скрывает только дополнительные настройки.
 * @param {HistoryControlsValues} values Готовые значения и доступность очистки.
 * @param {HistoryControlsLabels} labels Имена полей и политик.
 * @param {HistoryControlsActions} actions Действия владельца истории.
 * @returns {import('lit').TemplateResult} Молекула полей; дополнительные настройки скрыты при выключенном сборе.
 */
export function renderHistoryControls(values, labels, actions) {
  /**
   * Передаёт нынешний checkbox владельцу сбора.
   * @param {Event} event Change поля автоматического сбора.
   * @returns {void} Сам компонент записи не добавляет и не удаляет.
   */
  const collect = (event) => actions.autoCollect(/** @type {HTMLInputElement} */ (event.currentTarget).checked);
  /**
   * Передаёт строковый ключ политики для проверки владельцем.
   * @param {Event} event Change поля политики.
   * @returns {void} Объединение записей остаётся в Journal.
   */
  const policy = (event) => actions.policy(/** @type {HTMLSelectElement} */ (event.currentTarget).value);
  /**
   * Передаёт учёт смены вида без самостоятельной записи просмотра.
   * @param {Event} event Change checkbox представления.
   * @returns {void} Выбор принимает владелец настроек истории.
   */
  const includeView = (event) => actions.includeView(/** @type {HTMLInputElement} */ (event.currentTarget).checked);
  /**
   * Передаёт числовой ввод, не скрывая неверное значение от владельца.
   * @param {Event} event Change поля предела.
   * @returns {void} Проверку целого числа и границ выполняет Journal.
   */
  const limit = (event) => actions.limit(Number(/** @type {HTMLInputElement} */ (event.currentTarget).value));
  return screenTemplate('history', 'history-controls.historyControls', {
    collectLabel: labels.collect,
    autoCollect: values.autoCollect,
    onChange: collect,
    hidden: !values.autoCollect,
    policyLabel: labels.policy,
    policy: values.policy,
    onChange2: policy,
    selected: values.policy === 'all',
    allLabel: labels.all,
    selected2: values.policy === 'merge',
    mergeLabel: labels.merge,
    selected3: values.policy === 'unique',
    uniqueLabel: labels.unique,
    includeView: values.includeView,
    onChange3: includeView,
    includeViewLabel: labels.includeView,
    limitLabel: labels.limit,
    value: String(values.limit),
    onChange4: limit,
  });
}
