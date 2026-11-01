/** Обновляет готовые действия панели без хранения истории, режима ссылок или просмотра. */

/**
 * Готовая доступность истории и знак общего режима ссылок.
 * @typedef {Object} NavigationActionState
 * @property {boolean} canBack Существует предыдущая запись для попытки перехода; право чтения проверяется при открытии.
 * @property {boolean} canForward Существует следующая запись для попытки перехода; сохранённый адрес не доказывает доступ.
 * @property {boolean} canHistory Виджет истории доступен удержанием стрелки, в том числе при пустом списке.
 * @property {boolean} canRefresh Можно начать обновление нынешнего материала.
 * @property {null|'add'|'remove'|'undo'|'allow-repository'|'exclude-repository'} manualHistoryMode Готовое действие файла либо допуска репозитория к сбору; null скрывает только эту кнопку.
 * @property {boolean} canManualHistory Нынешний материал допускает подготовленное действие истории.
 * @property {string} manualHistoryLabel Доступное имя и подсказка подготовленного действия истории.
 * @property {import('lit').TemplateResult} manualHistoryIcon Готовый знак отдельного действия истории.
 * @property {string} linkLabel Имя нынешнего режима ссылок для aria-label и подсказки.
 * @property {string} linkTooltip Единая подсказка режима, клавиши B и действия удержания от владельца.
 * @property {import('lit').TemplateResult} linkIcon Готовый знак нынешнего режима для прежнего места data-control.
 */
import { render } from 'lit';
import { isHTMLElement } from '../../common/ui/view-utils.mjs';

/**
 * Прежние кнопки верхней панели просмотра.
 * @typedef {Object} NavigationActionsDOM
 * @property {HTMLButtonElement} back Переход к предыдущей записи истории.
 * @property {HTMLButtonElement} forward Переход к следующей записи истории.
 * @property {HTMLButtonElement} manualHistory Отдельное действие истории между стрелками и обновлением; готовый режим определяет файл или репозиторий.
 * @property {HTMLButtonElement} refresh Явное обновление нынешнего материала.
 * @property {HTMLButtonElement} linkMode Переключение общего режима ссылок с единственным местом значка.
 * @property {HTMLButtonElement} bookmarks Открытие временной области закладок.
 * @property {HTMLButtonElement} search Открытие поля поиска.
 */

/**
 * Находит все обязательные кнопки прежней верхней панели.
 * @param {HTMLElement} root Host с загруженным HTML-каркасом просмотра.
 * @returns {NavigationActionsDOM|null} Набор кнопок либо null, пока хотя бы одна не существует.
 */
export function readNavigationActions(root) {
  const nodes = /** @type {NavigationActionsDOM} */ ({
    back: root.querySelector('#docs-history-back'),
    forward: root.querySelector('#docs-history-forward'),
    manualHistory: root.querySelector('#docs-history-manual'),
    refresh: root.querySelector('#docs-refresh'),
    linkMode: root.querySelector('#docs-link-mode'),
    bookmarks: root.querySelector('#docs-bookmarks'),
    search: root.querySelector('#docs-search'),
  });
  return Object.values(nodes).some(node => !node) ? null : nodes;
}

/**
 * Отражает доступность переходов и меняет знак в прежнем месте кнопки режима.
 * @param {NavigationActionsDOM} nodes Существующие кнопки одного просмотра.
 * @param {NavigationActionState} model Уже вычисленная доступность и подпись режима ссылок.
 * @returns {void} Меняет атрибуты и содержимое места значка; без места значка обновляет лишь подпись.
 */
export function showNavigationActions(nodes, model) {
  nodes.back.disabled = !model.canBack && !model.canHistory;
  nodes.forward.disabled = !model.canForward && !model.canHistory;
  nodes.back.dataset.stepAvailable = String(model.canBack);
  nodes.forward.dataset.stepAvailable = String(model.canForward);
  nodes.manualHistory.hidden = model.manualHistoryMode === null;
  nodes.manualHistory.disabled = !model.canManualHistory;
  nodes.manualHistory.setAttribute('aria-label', model.manualHistoryLabel);
  nodes.manualHistory.dataset.tooltip = model.manualHistoryLabel;
  const historySlot = nodes.manualHistory.querySelector('[data-control]');
  if (isHTMLElement(historySlot)) render(model.manualHistoryIcon, historySlot);
  nodes.refresh.disabled = !model.canRefresh;
  nodes.linkMode.setAttribute('aria-label', model.linkLabel);
  nodes.linkMode.dataset.tooltip = model.linkTooltip;
  const slot = nodes.linkMode.querySelector('[data-control]');
  if (isHTMLElement(slot)) render(model.linkIcon, slot);
}

/**
 * Скрывает пункт меню вместе с его условной кнопкой, сохраняя оба узла.
 * @param {HTMLElement} menu Меню прежних li, каждый с непосредственной кнопкой действия.
 * @returns {void} Отражает button.hidden на li, убирая также занимаемое пунктом место.
 */
export function showActionVisibility(menu) {
  for (const item of menu.querySelectorAll(':scope > li')) {
    const button = item.querySelector(':scope > button');
    if (isHTMLElement(item) && isHTMLElement(button)) item.hidden = button.hidden;
  }
}
