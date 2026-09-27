/** Показывает кнопку обновления и применяет готовое состояние к тому же узлу. */

/**
 * Готовые состояние операции, доступность и подписи той же кнопки выпуска.
 * @typedef {Object} UpdateActionState
 * @property {string} state Ключ состояния data-control-state для оформления.
 * @property {boolean} disabled Готовый запрет нажатия во время операции.
 * @property {string} label Доступное имя нынешнего действия.
 * @property {string} tooltip Подробная подсказка действия и версии.
 * @property {string} control Ключ нового значка в уже существующем месте data-control.
 */

/**
 * Начальная подпись и ключ значка единственной кнопки обновления.
 * @typedef {Object} UpdateActionModel
 * @property {string} label Доступное имя и исходная подсказка кнопки.
 * @property {string} control Ключ места значка data-control для последующего заполнения.
 */
import { html } from 'lit';

/**
 * Создаёт место кнопки обновления, которую позднее связывает блок выпуска.
 * @param {UpdateActionModel} model Начальная подпись и ключ значка единственной кнопки обновления.
 * @returns {import('lit').TemplateResult} Шаблон одной кнопки с местом значка; запрос обновления не запускается.
 */
export function renderUpdateAction(model) {
  return html`
    <li class="update-tool">
      <button
        type         = "button"
        id           = "site-update-header"
        class        = "update-button icon-button muted"
        aria-label   = ${model.label}
        data-tooltip = ${model.label}
      ><span data-control=${model.control}></span></button>
    </li>`;
}

/**
 * Обновляет состояние и подписи выпуска на существующей кнопке без нового узла.
 * @param {HTMLButtonElement} button Прежняя кнопка выпуска, сохраняющая обработчик и положение в меню.
 * @param {UpdateActionState} model Готовые состояние операции, доступность и подписи той же кнопки выпуска.
 * @returns {void} Меняет атрибуты и ключ места значка; сам значок отдельно заполняет владелец.
 */
export function showUpdateAction(button, model) {
  button.dataset.controlState = model.state;
  button.disabled = model.disabled;
  button.setAttribute('aria-label', model.label);
  button.dataset.tooltip = model.tooltip;
  button.querySelector('[data-control]')?.setAttribute('data-control', model.control);
}
