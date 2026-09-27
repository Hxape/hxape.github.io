/** Показывает адрес назначения, готовое состояние замка и результат копирования. */

/**
 * Разрешение владельца размещения сокращать видимую подпись адреса.
 * @typedef {Object} AddressFitModel
 * @property {boolean} shorten Разрешает убирать целые ведущие части из видимого текста при нехватке ширины.
 */

/**
 * Уже вычисленное состояние доступа для замка нижней ссылки.
 * @typedef {Object} FooterLockModel
 * @property {'open'|'closed'|null} state Открытый, закрытый или отсутствующий замок; null удаляет оба атрибута доступа.
 * @property {string} [description] Необязательное пояснение основания доступа для aria-description.
 */

/**
 * Готовый внешний адрес и его краткая видимая форма.
 * @typedef {Object} FooterContextModel
 * @property {string} url Полный адрес href и доступная подпись ссылки.
 * @property {string} [path] Необязательный краткий путь для bdi; без него показывается url.
 */
import { isHTMLElement } from '../../common/ui/view-utils.mjs';

/**
 * Обновляет нижнюю ссылку и её полную и краткую подписи, сохраняя прежний узел ссылки.
 * @param {HTMLAnchorElement} link Прежняя ссылка нижнего адреса в нынешнем документе.
 * @param {FooterContextModel} model Готовый внешний адрес и его краткая видимая форма.
 * @returns {void} Меняет href и дочерние подписи; обработчики самой ссылки сохраняются.
 */
export function showContext(link, { url, path = url }) {
  link.href = url;
  link.setAttribute('aria-label', url);
  const address = link.ownerDocument.createElement('span');
  address.className = 'github-address';
  address.textContent = url;
  const compact = link.ownerDocument.createElement('bdi');
  compact.className = 'github-path';
  compact.dir = 'ltr';
  compact.textContent = path;
  link.replaceChildren(address, compact);
}

/**
 * Отражает готовое состояние замка, не подтверждая доступ к репозиторию.
 * @param {HTMLAnchorElement} link Ссылка нижнего адреса, чьи атрибуты рисуют замок.
 * @param {FooterLockModel} model Уже вычисленное состояние доступа для замка нижней ссылки.
 * @returns {void} Меняет атрибуты замка; при state=null убирает состояние и пояснение.
 */
export function showLock(link, model) {
  if (model.state === null) {
    link.removeAttribute('data-lock-state');
    link.removeAttribute('aria-description');
    return;
  }
  link.dataset.lockState = model.state;
  if (model.description !== undefined) link.setAttribute('aria-description', model.description);
}

/**
 * Сначала восстанавливает полную подпись, затем при разрешении сокращает её до доступной ширины.
 * @param {HTMLAnchorElement} link Нижняя ссылка с готовыми href и дочерней полной подписью.
 * @param {AddressFitModel} model Разрешение владельца размещения сокращать видимую подпись адреса.
 * @returns {void} Меняет только .github-address; href и доступное имя остаются полными. Без узла или измеряемой ширины сокращение не выполняется.
 */
export function fitAddress(link, model) {
  const address = link.querySelector('.github-address');
  if (!isHTMLElement(address)) return;
  const url = link.href;
  if (address.textContent !== url) address.textContent = url;
  if (!model.shorten) return;
  const available = link.getBoundingClientRect().width;
  if (!available || address.getBoundingClientRect().width <= available) return;
  const parts = url.replace(/^[a-z][a-z\d+.-]*:\/\//i, '').match(/[^/]+\/*/g) || [];
  for (let start = 0; start < parts.length; start++) {
    address.textContent = `…/${parts.slice(start).join('')}`;
    if (address.getBoundingClientRect().width <= available) break;
  }
}

/**
 * Связывает кнопку копирования с обработчиком и сроком событий владельца.
 * @param {HTMLElement} root Нижняя область с #github-copy.
 * @param {()=>void} onCopy Действие владельца, копирующее нынешний адрес.
 * @param {(node:HTMLElement,type:string,listener:EventListener)=>void} on Функция владельца для регистрации слушателя в его сроке жизни.
 * @returns {void} Добавляет слушатель найденной кнопке; при её отсутствии ничего не меняет.
 */
export function bindFooterAddress(root, onCopy, on) {
  const copy = root.querySelector('#github-copy');
  if (isHTMLElement(copy)) on(copy, 'click', onCopy);
}

/**
 * Выводит готовый результат операции копирования в область статуса.
 * @param {HTMLElement} feedback Узел сообщения для вспомогательного чтения.
 * @param {string} message Текст успеха или отказа копирования, сформулированный владельцем.
 * @returns {void} Заменяет текст статуса; буфер обмена здесь не используется.
 */
export function showCopyFeedback(feedback, message) {
  feedback.textContent = message;
}
