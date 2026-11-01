/** Работает с готовой оболочкой просмотра и её областями без истории и загрузки данных. */

/**
 * Готовый ключ представления и подпись переключения.
 * @typedef {Object} DocumentModeContent
 * @property {string} mode Ключ data-mode для выбора видимого значка.
 * @property {string} label Доступное имя действия переключения Markdown либо изменения default policy Haxe.
 * @property {import('lit').TemplateResult} [icon] Готовый знак закрепления Haxe; отсутствие сохраняет прежние значки SOURCE/HTML.
 */

/**
 * Размещение состояния и host обработки Lit.
 * @typedef {Object} PanelStateOptions
 * @property {boolean} [centered] Центрирует состояние ограничения или ожидания классом is-private.
 * @property {HTMLElement} host Прежний host панели для контекста обработчиков Lit.
 */
import { html, nothing, render } from 'lit';
import { isHTMLElement } from '../../common/ui/view-utils.mjs';
import { disposeDocumentContent } from '../document-content/index.mjs';

/**
 * Прежние узлы одной оболочки просмотра; владение материалом остаётся у блока документов.
 * @typedef {Object} PanelDOM
 * @property {HTMLDialogElement} dialog Единственный dialog нынешнего просмотра.
 * @property {HTMLDivElement} body Область чтения с общей прокруткой и фокусом.
 * @property {HTMLElement} title Место имени и значка материала.
 * @property {HTMLParagraphElement} version Отдельная приписка установленной версии.
 * @property {HTMLDivElement} resize Разделитель ручного изменения ширины.
 * @property {HTMLDivElement} toolbar Область вкладок документов или представлений файла.
 * @property {HTMLDivElement} tabs Полоса документов репозитория или каталога.
 * @property {HTMLDivElement} sourceTabs Переключатель DOCUMENTATION и SOURCE CODE.
 * @property {HTMLElement} sourceHost Область ленивой оболочки исходника.
 * @property {HTMLButtonElement} sourceRetry Условная кнопка повтора raw-чтения либо подготовки отказавшего адреса при сохранённом успешном материале.
 * @property {HTMLButtonElement} mode Действие TEXT/HTML документа либо закрепления следующего обычного вида Haxe; pin не переключает нынешнюю вкладку.
 * @property {HTMLDivElement} state Место ожидания, отказа, ограничения или HXDoc.
 * @property {HTMLElement} document Место текста или оформленного Markdown.
 */

/**
 * Находит все обязательные узлы прежнего HTML-каркаса.
 * @param {HTMLElement} root Host панели, содержащий её загруженный фрагмент.
 * @returns {PanelDOM|null} Набор прежних узлов либо null, пока хотя бы один обязательный узел отсутствует.
 */
export function readPanelDOM(root) {
  const nodes = /** @type {PanelDOM} */ ({
    dialog: root.querySelector('#hxdoc'),
    body: root.querySelector('#docs-body'),
    title: root.querySelector('#docs-title'),
    version: root.querySelector('#docs-version'),
    resize: root.querySelector('#docs-resize'),
    toolbar: root.querySelector('#document-toolbar'),
    tabs: root.querySelector('#document-tabs'),
    sourceTabs: root.querySelector('#source-tabs'),
    sourceHost: root.querySelector('#source-host'),
    sourceRetry: root.querySelector('#source-retry-action'),
    mode: root.querySelector('#document-mode'),
    state: root.querySelector('#docs-state'),
    document: root.querySelector('#docs-document'),
  });
  return Object.values(nodes).some((node) => !node) ? null : nodes;
}

/**
 * Показывает готовое состояние вместо текста документа и исходника.
 * @param {PanelDOM} nodes Прежние узлы оболочки просмотра.
 * @param {import('lit').TemplateResult} template Готовое представление ожидания, отказа, ограничения либо HXDoc.
 * @param {PanelStateOptions} options Центрирование состояния и прежний host обработчиков Lit.
 * @returns {void} Освобождает управление таблицами и очищает документ, скрывая исходник; состояние вставляет в state.
 */
export function showPanelState(nodes, template, { centered = false, host }) {
  const { body, state, sourceHost, document: content } = nodes;
  disposeDocumentContent(content);
  content.replaceChildren();
  content.hidden = true;
  sourceHost.hidden = true;
  state.hidden = false;
  body.classList.toggle('is-private', centered);
  render(template, state, { host });
}

/**
 * Показывает или снимает пояснение пустого документа.
 * @param {HTMLElement} state Узел состояния прежней панели.
 * @param {string|null} message Готовый текст либо null для очистки пояснения.
 * @returns {void} Обновляет только содержимое state.
 */
export function showDocumentMessage(state, message) {
  render(message === null ? nothing : documentMessage(message), state);
}

/**
 * Создаёт текстовое пояснение документа без чтения его содержимого.
 * @param {string} message Подготовленная подпись состояния документа.
 * @returns {import('lit').TemplateResult} Шаблон абзаца document-state.
 */
export function documentMessage(message) {
  return html`
    <p class="document-state muted">${message}</p>
  `;
}

/**
 * Согласует знак и подпись кнопки переключения представления.
 * @param {HTMLButtonElement} button Прежняя кнопка вида материала.
 * @param {DocumentModeContent} content Готовый ключ/подпись и необязательный знак политики вместо текущего Markdown-вида.
 * @returns {void} Меняет атрибуты, сохраняя обработчик кнопки.
 */
export function showDocumentMode(button, { mode, label, icon }) {
  button.dataset.mode = mode;
  button.setAttribute('aria-label', label);
  button.dataset.tooltip = label;
  let slot = button.querySelector('.mode-pin');
  if (icon && !slot) {
    slot = button.ownerDocument.createElement('span');
    slot.className = 'mode-pin';
    button.append(slot);
  }
  if (isHTMLElement(slot)) {
    slot.toggleAttribute('hidden', !icon);
    render(icon || nothing, slot);
  }
  for (const previous of button.querySelectorAll('.mode-source, .mode-html')) {
    previous.toggleAttribute('hidden', Boolean(icon));
  }
}

/**
 * Добавляет оформление компактного HXDoc выбранного объявления.
 * @param {import('lit').TemplateResult} content Готовые секции выбранного объявления и его потомков.
 * @returns {import('lit').TemplateResult} Шаблон обёртки doc-compact; содержимое и смысл объявления не изменяются.
 */
export function compactDocument(content) {
  return html`
    <div class="doc-compact">${content}</div>
  `;
}
