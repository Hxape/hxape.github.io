/** Показывает готовый текст с номерами строк, припиской и состоянием загрузки. */

/**
 * Текст одного уже прочитанного файла и готовая приписка о его происхождении.
 * @typedef {Object} SourceTextContent
 * @property {string} content Полный текст исходника без номеров строк.
 * @property {string} note Готовая подпись ветки и, при необходимости, установленной версии.
 */
import { html, nothing, render } from 'lit';
import { isHTMLElement } from '../../common/ui/view-utils.mjs';

/**
 * Очищает нынешний текст, номера и метки, сохраняя загруженную оболочку.
 * @param {HTMLElement} host Прежняя область исходника с объявленными data-source-* узлами.
 * @returns {void} Скрывает frame и сбрасывает размеры и подсветку; отсутствующие узлы пропускает.
 */
function clearSourceContent(host) {
  const frame = /** @type {HTMLElement|null} */ (host.querySelector('[data-source-frame]'));
  const code = host.querySelector('[data-source-code]');
  const gutter = host.querySelector('[data-source-gutter]');
  const note = host.querySelector('[data-source-note]');
  const bookmarks = host.querySelector('[data-source-bookmarks]');
  if (code) code.textContent = '';
  if (gutter) {
    gutter.textContent = '';
    gutter.removeAttribute('data-selected-line');
  }
  if (note) note.textContent = '';
  if (isHTMLElement(bookmarks)) render(nothing, bookmarks);
  if (frame) {
    frame.hidden = true;
    delete frame.dataset.lineCount;
    frame.style.removeProperty('--source-number-digits');
    frame.style.removeProperty('--source-highlight-top');
    frame.style.removeProperty('--source-line-height');
    frame.removeAttribute('data-source-highlight');
  }
}

/**
 * Показывает ожидание чтения в прежней оболочке исходника.
 * @param {HTMLElement} host Область исходника после подготовки её HTML.
 * @param {string} message Готовый текст ожидания для role=status.
 * @returns {void} Очищает старый текст и назначает сообщение загрузки.
 */
export function showSourceLoading(host, message) {
  clearSourceContent(host);
  const state = host.querySelector('[data-source-state]');
  if (state) {
    state.textContent = message;
    state.setAttribute('role', 'status');
  }
}

/**
 * Формирует одну текстовую колонку номеров физических строк.
 * @param {string} content Полный текст файла; каждый LF добавляет строку, в том числе завершающий.
 * @returns {{count:number,text:string}} Число строк и текст номеров от 1 до count, разделённый LF; исходник не изменяется.
 */
function lineNumbers(content) {
  let count = 1;
  for (let index = 0; index < content.length; index++) if (content.charCodeAt(index) === 10) count++;
  /** @type {string[]} */
  const chunks = [];
  let chunk = '';
  for (let line = 1; line <= count; line++) {
    chunk += `${line}${line === count ? '' : '\n'}`;
    if (line % 1024 === 0) {
      chunks.push(chunk);
      chunk = '';
    }
  }
  if (chunk) chunks.push(chunk);
  return { count, text: chunks.join('') };
}

/**
 * Выводит исходник и номера двумя текстовыми узлами, задавая ширину колонки по count.
 * @param {HTMLElement} host Оболочка со всеми обязательными местами исходника.
 * @param {SourceTextContent} content Успешно прочитанный текст и готовая подпись его источника.
 * @returns {void} Показывает frame, очищает сообщение и устанавливает lineCount и число цифр.
 * @throws {Error} В оболочке отсутствует обязательный узел исходника.
 */
export function showSourceText(host, { content, note: noteText }) {
  const frame = /** @type {HTMLElement|null} */ (host.querySelector('[data-source-frame]'));
  const gutter = host.querySelector('[data-source-gutter]');
  const code = host.querySelector('[data-source-code]');
  const state = host.querySelector('[data-source-state]');
  const note = host.querySelector('[data-source-note]');
  if (!frame || !gutter || !code || !state || !note) throw new Error('Source view markup is missing');
  const lines = lineNumbers(content);
  code.textContent = content;
  gutter.textContent = lines.text;
  frame.dataset.lineCount = String(lines.count);
  frame.style.setProperty('--source-number-digits', String(String(lines.count).length));
  state.textContent = '';
  note.textContent = noteText;
  frame.hidden = false;
}

/**
 * Убирает показанный текст и выводит подготовленный отказ чтения.
 * @param {HTMLElement} host Прежняя оболочка исходника.
 * @param {string} message Готовая причина отказа для role=alert.
 * @returns {void} Очищает содержимое и показывает отказ.
 * @throws {Error} В оболочке отсутствует место сообщения.
 */
export function showSourceFailure(host, message) {
  clearSourceContent(host);
  const state = host.querySelector('[data-source-state]');
  if (!state) throw new Error('Source view markup is missing');
  state.textContent = message;
  state.setAttribute('role', 'alert');
}

/**
 * Заменяет неготовую оболочку одним сообщением отказа.
 * @param {HTMLElement} host Область, где HTML исходника не был успешно подготовлен.
 * @param {string} text Готовое сообщение о недоступной оболочке.
 * @returns {void} Создаёт локальный абзац role=alert вместо частичного содержимого.
 */
export function showShellFailure(host, text) {
  host.replaceChildren();
  const message = host.ownerDocument.createElement('p');
  message.className = 'source-state';
  message.setAttribute('role', 'alert');
  message.textContent = text;
  host.append(message);
}

/**
 * Сбрасывает показанные текст и сообщение, оставляя оболочку для повторного использования.
 * @param {HTMLElement} host Прежняя область исходника.
 * @returns {void} Очищает frame и статус; сетевые запросы здесь не отменяются.
 */
export function clearSourceView(host) {
  clearSourceContent(host);
  const state = host.querySelector('[data-source-state]');
  if (state) state.textContent = '';
}

/**
 * Согласует номер и геометрию выбранной строки без изменения адреса или прокрутки.
 * @param {HTMLElement} host Оболочка с уже показанным исходником и lineCount.
 * @param {number|null} line Запрошенный номер начиная с 1; null снимает семантический выбор при отмене preview до первого выбора строки.
 * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Фактическое окно host для измерения line-height и прямоугольников.
 * @returns {number|null} Ограниченный существующими строками номер либо null при снятии/неготовой геометрии; видимость фона задаёт отдельное готовое значение.
 */
export function selectSourceLine(host, line, view) {
  const frame = /** @type {HTMLElement|null} */ (host.querySelector('[data-source-frame]'));
  const code = host.querySelector('[data-source-code]');
  const gutter = host.querySelector('[data-source-gutter]');
  if (!frame || !code || !isHTMLElement(gutter)) return null;
  if (line === null) {
    gutter.removeAttribute('data-selected-line');
    frame.style.removeProperty('--source-highlight-top');
    frame.style.removeProperty('--source-line-height');
    return null;
  }
  const lineHeight = parseFloat(view.getComputedStyle(code).lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return null;
  const count = Number(frame.dataset.lineCount) || 1;
  const target = Math.max(1, Math.min(Number.isInteger(line) ? line : 1, count));
  gutter.dataset.selectedLine = String(target);
  frame.style.setProperty('--source-highlight-top', `${(target - 1) * lineHeight}px`);
  frame.style.setProperty('--source-line-height', `${lineHeight}px`);
  return target;
}

/**
 * Применяет только готовую видимость фона текущей строки; номер и геометрия остаются прежними.
 * @param {HTMLElement} host Оболочка нынешнего raw с отдельным frame.
 * @param {boolean} visible Владелец разрешает показывать визуальную полосу; false гасит её без изменения позиции.
 * @param {boolean} [fade] Затухание по истечении срока; очистка, нулевой срок и новый выбор меняются сразу.
 * @returns {void} Меняет видимость frame и при истечении срока анимирует полосу; текст и место чтения сохраняются.
 */
export function showSourceHighlight(host, visible, fade = false) {
  const frame = host.querySelector('[data-source-frame]');
  const band = frame?.querySelector('[data-source-highlight-band]');
  const wasVisible = frame?.hasAttribute('data-source-highlight');
  band?.getAnimations().forEach(animation => animation.cancel());
  frame?.toggleAttribute('data-source-highlight', visible);
  if (fade && !visible && wasVisible && band) {
    band.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360 });
  }
}

/**
 * Выбирает допустимую строку и прокручивает область чтения к ней.
 * @param {HTMLElement} body Прокручиваемая область чтения панели.
 * @param {HTMLElement} host Оболочка с уже показанным исходником и lineCount.
 * @param {number} line Запрошенный номер начиная с 1; ограничивается существующими строками.
 * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Фактическое окно host для измерения строки.
 * @returns {void} Назначает выбранный номер и прокрутку; видимость полосы задаёт владелец срока отдельно.
 */
export function scrollSourceLine(body, host, line, view) {
  const target = selectSourceLine(host, line, view);
  const frame = /** @type {HTMLElement|null} */ (host.querySelector('[data-source-frame]'));
  if (target === null || !frame) return;
  const lineHeight = parseFloat(frame.style.getPropertyValue('--source-line-height'));
  if (target === 1) {
    body.scrollTop = 0;
    return;
  }
  const top = frame.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
  body.scrollTop = Math.max(0, top + (target - 1) * lineHeight - Math.min(body.clientHeight / 4, 120));
}

/**
 * Находит номер строки по вертикальной координате текстовой колонки.
 * @param {HTMLElement} host Оболочка показанного исходника.
 * @param {number} clientY Координата указателя в окне текущего отображения.
 * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Окно измерения gutter; учитывается его DOM realm.
 * @returns {number|null} Номер от 1 до lineCount либо null для скрытого frame, неверной геометрии или координаты вне строк.
 */
export function sourceLineAt(host, clientY, view) {
  const gutter = host.querySelector('[data-source-gutter]');
  const frame = host.querySelector('[data-source-frame]');
  if (!isHTMLElement(gutter) || !isHTMLElement(frame) || frame.hidden) return null;
  const height = parseFloat(view.getComputedStyle(gutter).lineHeight);
  const count = Number(frame.dataset.lineCount);
  if (!Number.isFinite(height) || height <= 0 || !Number.isSafeInteger(count) || count <= 0) return null;
  const line = Math.floor((clientY - gutter.getBoundingClientRect().top) / height) + 1;
  return line >= 1 && line <= count ? line : null;
}

/**
 * Читает число строк уже показанного frame.
 * @param {HTMLElement} host Область исходника с атрибутом data-line-count.
 * @returns {number} Положительное целое число либо 0 без корректного счётчика.
 */
export function sourceLineCount(host) {
  const frame = host.querySelector('[data-source-frame]');
  const count = Number(frame?.getAttribute('data-line-count'));
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

/**
 * Показывает готовые метки перед номерами вне потока колонки.
 * @param {HTMLElement} host Оболочка с отдельным data-source-bookmarks и gutter.
 * @param {ReadonlyArray<number>} lines Номера закладок нынешнего файла; повторы и номера вне lineCount не показываются.
 * @param {import('lit').TemplateResult} icon Готовый знак добавленной закладки для каждой допустимой метки.
 * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Переданное окно отображения; геометрия меток следует CSS текущего документа.
 * @param {(line:number)=>string} label Готовая доступная подпись существующей метки от владельца.
 * @returns {void} Обновляет только отдельный слой меток; номера остаются одним текстовым узлом.
 */
export function showSourceBookmarks(host, lines, icon, view, label) {
  const container = host.querySelector('[data-source-bookmarks]');
  const gutter = host.querySelector('[data-source-gutter]');
  if (!isHTMLElement(container) || !gutter) return;
  const count = sourceLineCount(host);
  const shown = [...new Set(lines)].filter(line => Number.isSafeInteger(line) && line > 0 && line <= count);
  render(
    html`
      ${shown.map(line =>
        html`
          <button
            type               = "button"
            class              = "source-line-bookmark control primary icon-button nonselectable"
            data-bookmark-line = ${line}
            aria-label         = ${label(line)}
            data-tooltip       = ${label(line)}
            style              = ${`--bookmark-line:${line - 1}`}
          >
            <span class="source-bookmark-icon">${icon}</span>
          </button>
        `
      )}
    `,
    container,
  );
  // Preview меняет style вне Lit; повтор прежних metadata после cancel должен явно вернуть позицию и убрать dim-state.
  for (const marker of container.querySelectorAll('[data-bookmark-line]')) {
    if (!isHTMLElement(marker)) continue;
    const line = Number(marker.dataset.bookmarkLine);
    if (Number.isSafeInteger(line) && line > 0 && line <= count) {
      marker.style.setProperty('--bookmark-line', String(line - 1));
    }
    marker.removeAttribute('data-bookmark-removing');
  }
}
