/** Показывает подготовленные клавиатурные подсказки и открытость их списка. */

/**
 * Готовые действия закрытия и открытия информации для текущего размещения.
 * @typedef {Object} KeyboardContextModel
 * @property {boolean} closeVisible Нужен ли пункт закрытия в нынешнем режиме окна.
 * @property {string} closeHint Подробная подпись действия закрытия.
 * @property {string} closeLabel Краткое видимое имя закрытия.
 * @property {string} contextHint Подробная подпись действия E в нынешнем контексте.
 * @property {string} contextLabel Краткое имя действия E.
 */

/**
 * Выбранная открытость подсказок и подпись её переключения.
 * @typedef {Object} KeyboardHelpModel
 * @property {boolean} expanded Показывает список подсказок и убирает класс help-collapsed.
 * @property {string} label Доступное имя кнопки раскрытия.
 */

/**
 * Узлы списка клавиш и его раскрытия в одном footer.
 * @typedef {Object} KeyboardHelpDOM
 * @property {HTMLElement} footer Нижняя область с классом состояния списка.
 * @property {HTMLElement} hints Список клавиатурных подсказок.
 * @property {HTMLButtonElement} toggle Кнопка раскрытия списка.
 */
import { isElement, isHTMLElement } from '../../common/ui/view-utils.mjs';
import { showDisclosureButton } from '../footer-disclosure/index.mjs';

/**
 * Отражает открытость списка клавиш и согласует его кнопку раскрытия.
 * @param {KeyboardHelpDOM} elements Готовые узлы footer, списка подсказок и переключателя.
 * @param {KeyboardHelpModel} model Выбранная открытость подсказок и подпись её переключения.
 * @returns {void} Меняет видимость списка и атрибуты кнопки; выбор не сохраняется здесь.
 */
export function showKeyboardHelp(elements, model) {
  elements.hints.hidden = !model.expanded;
  elements.footer.classList.toggle('help-collapsed', !model.expanded);
  showDisclosureButton(elements.toggle, model);
}

/**
 * Назначает подготовленные пояснения кнопкам с известными ключами подсказок.
 * @param {HTMLElement} root Область кнопок с data-hint.
 * @param {Readonly<Record<string,string>>} descriptions Соответствие ключа data-hint тексту пояснения; неизвестные ключи пропускаются.
 * @returns {void} Обновляет data-tooltip совпавших кнопок.
 */
export function showKeyboardDescriptions(root, descriptions) {
  for (const button of root.querySelectorAll('button[data-hint]')) {
    const key = button.getAttribute('data-hint');
    if (isHTMLElement(button) && key && Object.hasOwn(descriptions, key)) button.dataset.tooltip = descriptions[key];
  }
}

/**
 * Снимает закрепление пояснения со всех кнопок подсказок.
 * @param {HTMLElement} root Область кнопок с data-hint.
 * @returns {void} Выставляет aria-expanded=false, не меняя видимость общего списка.
 */
export function clearKeyboardHints(root) {
  root.querySelectorAll('button[data-hint]').forEach(item => item.setAttribute('aria-expanded', 'false'));
}

/**
 * Обновляет контекстные подписи E и закрытия, убирая закреплённую скрытую подсказку.
 * @param {HTMLElement} root Список подсказок с объявленными местами контекстных действий.
 * @param {KeyboardContextModel} model Готовые действия закрытия и открытия информации для текущего размещения.
 * @returns {void} Меняет только найденные пункты; не выполняет закрытие или открытие информации.
 */
export function showKeyboardContext(root, model) {
  const item = root.querySelector('#close-hint');
  if (isHTMLElement(item)) item.hidden = !model.closeVisible;
  if (!model.closeVisible && item?.querySelector('button')?.getAttribute('aria-expanded') === 'true') {
    clearKeyboardHints(root);
  }
  const close = item?.querySelector('button');
  if (close) {
    close.setAttribute('data-tooltip', model.closeHint);
    close.setAttribute('aria-label', model.closeHint);
    const label = close.querySelector('[data-close-action]');
    if (label) label.textContent = model.closeLabel;
  }
  const context = root.querySelector('[data-hint="context"]');
  if (isHTMLElement(context)) {
    context.dataset.tooltip = model.contextHint;
    context.setAttribute('aria-label', model.contextHint);
    const label = context.querySelector('[data-e-action]');
    if (label) label.textContent = model.contextLabel;
  }
}

/**
 * Передаёт нажатие на объявленную подсказку её владельцу.
 * @param {HTMLElement} root Область кнопок data-hint.
 * @param {(event:Event)=>void} onHint Обработчик владельца, показывающий пояснение выбранной кнопки.
 * @param {(node:HTMLElement,type:string,listener:EventListener)=>void} on Регистрация делегированного слушателя на срок жизни владельца.
 * @returns {void} Связывает один делегированный click; остальные нажатия пропускает.
 */
export function bindKeyboardHelp(root, onHint, on) {
  on(root, 'click', event => {
    if (isElement(event.target) && event.target.closest('button[data-hint]')) onHint(event);
  });
}
