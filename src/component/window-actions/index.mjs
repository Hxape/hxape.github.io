/** Связывает оконные действия и отображает подготовленные подписи и доступность. */

/**
 * Подготовленная доступность PiP и его сообщения.
 * @typedef {Object} WindowPiPModel
 * @property {boolean} disabled Запрет нажатия во время операции или недоступности.
 * @property {boolean} supported Подтверждённая владельцем поддержка API для рисунка кнопки.
 * @property {string} description Пояснение нынешнего действия или недоступности.
 * @property {string} error Текст отказа; пустая строка скрывает область статуса.
 */

/**
 * Готовая подпись действия и выбранный вид страницы.
 * @typedef {Object} WindowLayoutModel
 * @property {string} label Доступное имя и подсказка действия смены вида.
 * @property {'fill'|'window'} layout Ключ рисунка заполненного или оконного вида.
 */

/**
 * Действия владельца для трёх кнопок окна.
 * @typedef {Object} WindowActionHandlers
 * @property {()=>void} onClose Закрытие PiP или информации по текущему порядку владельца.
 * @property {()=>void} onPiP Открытие или изменение режима PiP.
 * @property {()=>void} onFill Переключение заполнения страницы или оконного вида.
 */
import { isHTMLElement } from '../../common/ui/view-utils.mjs';

/**
 * Связывает оконные кнопки через регистрацию слушателей владельца.
 * @param {HTMLElement} root Область с window-close, window-pip и window-fill.
 * @param {WindowActionHandlers} handlers Действия владельца для трёх кнопок окна.
 * @param {(node:HTMLElement,type:string,listener:EventListener)=>void} on Регистрация события с условиями и сроком жизни владельца.
 * @returns {void} Добавляет обработчики только найденным кнопкам; сами правила оконного действия здесь не выбираются.
 */
export function bindWindowActions(root, handlers, on) {
  const actions = {
    'window-close': handlers.onClose,
    'window-pip': handlers.onPiP,
    'window-fill': handlers.onFill,
  };
  for (const [id, listener] of Object.entries(actions)) {
    const button = root.querySelector(`#${id}`);
    if (isHTMLElement(button)) on(button, 'click', listener);
  }
}

/**
 * Обновляет подпись и рисунок кнопки оконного размещения.
 * @param {HTMLElement} root Область управления видом страницы.
 * @param {WindowLayoutModel} model Готовая подпись действия и выбранный вид страницы.
 * @returns {void} Меняет найденную кнопку; отсутствие места window-fill пропускается.
 */
export function showWindowLayout(root, model) {
  const button = root.querySelector('#window-fill');
  if (!isHTMLElement(button)) return;
  button.setAttribute('aria-label', model.label);
  button.dataset.tooltip = model.label;
  button.dataset.layout = model.layout;
}

/**
 * Отражает доступность PiP и сообщение его последней операции.
 * @param {HTMLElement} root Область с window-pip и window-status.
 * @param {WindowPiPModel} model Подготовленная доступность PiP и его сообщения.
 * @returns {void} Обновляет найденные кнопку и статус; API PiP не вызывается.
 */
export function showWindowPiP(root, model) {
  const button = /** @type {HTMLButtonElement|null} */ (root.querySelector('#window-pip'));
  const status = /** @type {HTMLElement|null} */ (root.querySelector('#window-status'));
  if (button) {
    button.disabled = model.disabled;
    button.dataset.supported = String(model.supported);
    button.dataset.tooltip = model.description;
    button.setAttribute('aria-description', model.description);
  }
  if (status) {
    status.textContent = model.error;
    status.hidden = !model.error;
  }
}
