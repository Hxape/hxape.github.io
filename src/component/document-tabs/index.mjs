/** Показывает отдельные вкладки документов и передаёт намерение выбора. */
import { html, nothing, render } from 'lit';
import { isElement } from '../../common/ui/view-utils.mjs';

/**
 * Одна подготовленная вкладка разрешённого или закрытого документа.
 * @typedef {Object} DocumentTab
 * @property {string} key Ключ документа для data-document и выбора у владельца.
 * @property {string} id DOM-id кнопки вкладки для aria-labelledby области чтения.
 * @property {string} label Видимое уникальное имя вкладки.
 * @property {string} path Путь документа в подсказке.
 * @property {boolean} disabled Запрещает выбор вкладки, когда текст не доступен.
 * @property {string} [disabledLabel] Необязательное пояснение запрета для aria-label.
 */

/**
 * Создаёт полосу вкладок с готовой доступностью и общей шириной подписей.
 * @param {HTMLElement} tabs Прежний контейнер role=tablist; обработчики остаются на нём.
 * @param {ReadonlyArray<DocumentTab>} items Подготовленные вкладки в порядке владельца.
 * @param {string} controls DOM-id общей области чтения для aria-controls каждой вкладки.
 * @returns {void} Меняет кнопки и --tab-width; ни одну вкладку самостоятельно не выбирает.
 */
export function renderDocumentTabs(tabs, items, controls) {
  tabs.style.setProperty('--tab-width', `calc(${Math.max(12, ...items.map((item) => item.label.length))}ch + 32px)`);
  render(
    html`
      ${
      items.map((item) =>
        html`<button
          type           = "button"
          role           = "tab"
          tabindex        = "-1"
          aria-selected   = "false"
          id              = ${item.id}
          data-document   = ${item.key}
          data-tooltip    = ${item.path}
          aria-controls   = ${controls}
          ?disabled       = ${item.disabled}
          aria-label      = ${
          item.disabledLabel || nothing
        }
        >
          <svg
            class       = "document-lock"
            viewBox     = "0 0 24 24"
            aria-hidden = "true"
            ?hidden     = ${!item.disabled}
          >
            <rect
              x      = "5"
              y      = "10"
              width  = "14"
              height = "11"
              rx     = "2"
            />
            <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
          </svg>
          <span class="document-tab-label">${item.label}</span>
        </button>`
      )
    }`,
    tabs,
  );
}

/**
 * Отмечает принятую вкладку и при необходимости прокручивает полосу к её кнопке.
 * @param {HTMLElement} tabs Полоса ранее созданных вкладок.
 * @param {string} key Принятый владельцем ключ data-document.
 * @returns {void} Выставляет aria-selected и tabIndex; отсутствующий ключ оставляет все кнопки невыбранными.
 */
export function selectDocumentTab(tabs, key) {
  tabs.querySelectorAll('button').forEach((button) => {
    const selected = button.dataset.document === key;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  const selected = tabs.querySelector('button[aria-selected="true"]');
  if (selected) {
    const strip = tabs.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    if (item.left < strip.left) tabs.scrollLeft += item.left - strip.left;
    else if (item.right > strip.right) tabs.scrollLeft += item.right - strip.right;
  }
}

/**
 * Передаёт намерение выбрать доступную вкладку при стрелках, Home и End.
 * @param {KeyboardEvent} event Нажатие клавиши на одной из кнопок полосы.
 * @param {HTMLElement} tabs Полоса вкладок, из которой исключаются disabled-кнопки.
 * @param {(key:string)=>void} choose Действие владельца для принятия найденного ключа документа.
 * @returns {void} Для поддержанной клавиши отменяет обычное действие, вызывает choose и переносит фокус; прочие события пропускает.
 */
export function documentTabsKey(event, tabs, choose) {
  const buttons = [...tabs.querySelectorAll('button')].filter((button) => !button.disabled);
  const target = isElement(event.target) ? event.target.closest('button') : null;
  if (!target) return;
  let index = buttons.indexOf(target);
  if (index < 0) return;
  if (event.key === 'ArrowRight') index = (index + 1) % buttons.length;
  else if (event.key === 'ArrowLeft') index = (index - 1 + buttons.length) % buttons.length;
  else if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = buttons.length - 1;
  else return;
  event.preventDefault();
  const key = buttons[index].dataset.document;
  if (!key) return;
  choose(key);
  buttons[index].focus({ preventScroll: true });
}
