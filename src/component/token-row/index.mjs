/** Создаёт строку списка из подготовленных подписи, даты и действий. */

/**
 * Поле ручной парольной разблокировки, если оно требуется этой строке.
 * @typedef {Object} TokenPasswordField
 * @property {string} placeholder Подсказка пустого парольного поля.
 * @property {string} label Доступное имя поля для конкретного токена.
 */

/**
 * Подготовленная подпись даты добавления токена.
 * @typedef {Object} TokenAddedCaption
 * @property {string} text Видимая дата или сообщение о неизвестной дате.
 * @property {string} [dateTime] Машиночитаемая дата time.dateTime, когда она известна.
 */
import { render } from 'lit';

/**
 * Готовая команда одной строки токена.
 * @typedef {Object} TokenRowAction
 * @property {string} action Ключ data-token-action для делегированного обработчика.
 * @property {string} label Видимый текст либо доступное имя кнопки со значком.
 * @property {import('lit').TemplateResult|null} icon Знак команды; null выводит текстовую кнопку.
 */
/**
 * Готовая строка метаданных и команд токена без открытого PAT.
 * @typedef {Object} TokenRowModel
 * @property {string} id Идентификатор токена для data-token-id и делегированных действий.
 * @property {string} label Открытая подпись токена, сформированная владельцем.
 * @property {TokenAddedCaption} added Видимая и машинная подписи даты добавления.
 * @property {TokenRowAction} primary Основная команда, например открыть, выбрать или заблокировать.
 * @property {TokenRowAction} remove Готовая команда удаления.
 * @property {TokenPasswordField} [password] Необязательное поле ручной парольной разблокировки.
 */

/**
 * Создаёт кнопку готовой команды для делегированного обработчика токенов.
 * @param {Document} owner Документ, создающий кнопку строки.
 * @param {TokenRowAction} model Ключ команды, доступная подпись и необязательный значок.
 * @returns {HTMLButtonElement} Новая кнопка с data-token-action; собственный обработчик действия не назначается.
 */
function actionButton(owner, model) {
  const button = owner.createElement('button');
  button.type = 'button';
  button.dataset.tokenAction = model.action;
  if (model.icon) {
    button.className = 'token-icon-button icon-button muted';
    button.setAttribute('aria-label', model.label);
    button.title = model.label;
    render(model.icon, button);
  } else {
    button.className = 'control primary';
    button.textContent = model.label;
  }
  return button;
}

/**
 * Составляет строку токена из команд, подписи, даты и необязательного парольного ввода.
 * @param {Document} owner Документ текущего списка, создающий все узлы строки.
 * @param {TokenRowModel} model Подготовленные метаданные и разрешённые команды; состояние доступа здесь не вычисляется.
 * @returns {HTMLLIElement} Новый li строки; список вставляет его, а команды обрабатывает блок токенов.
 */
export function renderTokenRow(owner, model) {
  const row = owner.createElement('li');
  row.dataset.tokenId = model.id;
  row.className = 'control-row';
  const info = owner.createElement('span');
  info.className = 'token-info';
  const label = owner.createElement('span');
  label.className = 'token-label';
  label.textContent = model.label;
  const added = owner.createElement('time');
  added.className = 'token-added muted';
  if (model.added.dateTime) added.dateTime = model.added.dateTime;
  added.textContent = model.added.text;
  info.append(label, added);
  row.append(actionButton(owner, model.primary), info);
  if (model.password) {
    const password = owner.createElement('input');
    password.type = 'password';
    password.className = 'field primary';
    password.autocomplete = 'off';
    password.placeholder = model.password.placeholder;
    password.setAttribute('aria-label', model.password.label);
    row.append(password);
  }
  row.append(actionButton(owner, model.remove));
  return row;
}
