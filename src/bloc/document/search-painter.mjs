/** Рисует только текущий поисковый Range отдельными прямоугольниками вне текста и пользовательского выделения. */
import { rangeForSearchMatch } from './search-projection.mjs';

/**
 * Видимая область прокручиваемого элемента в координатах окна.
 * @typedef {Object} ClipRect
 * @property {number} left Левая внутренняя граница после рамки.
 * @property {number} top Верхняя внутренняя граница после рамки.
 * @property {number} right Правая граница clientWidth без полосы прокрутки.
 * @property {number} bottom Нижняя граница clientHeight без полосы прокрутки.
 */

/**
 * Считает внутреннюю область элемента в нынешнем документе.
 * @param {HTMLElement} element Скроллер либо область чтения, ограничивающая видимость совпадения.
 * @returns {ClipRect} Границы в координатах окна; текст и прокрутка не меняются.
 */
function innerRect(element) {
  const rect = element.getBoundingClientRect();
  const left = rect.left + element.clientLeft;
  const top = rect.top + element.clientTop;
  return { left, top, right: left + element.clientWidth, bottom: top + element.clientHeight };
}

/**
 * Единственный текущий диапазон и его рисунок; запрос, список совпадений и индекс принадлежат Panel.
 */
export class CurrentSearchPainter {
  /**
   * Общая область чтения; сохраняется при живом переносе панели.
   * @type {HTMLElement}
   */
  #body;
  /**
   * Отдельный data-search-current слой; никогда не входит в исходник или Markdown.
   * @type {HTMLElement}
   */
  #layer;
  /**
   * Один текущий диапазон; clear/dispose освобождают ссылки на Text-узлы.
   * @type {Range|null}
   */
  #range = null;
  /**
   * Окно нынешней привязки для RAF, событий и ResizeObserver.
   * @type {(Window & typeof globalThis)|null}
   */
  #view = null;
  /**
   * Срок слушателей одного фактического документа.
   * @type {AbortController|null}
   */
  #events = null;
  /**
   * Наблюдение области чтения и блочного предка нынешнего совпадения.
   * @type {ResizeObserver|null}
   */
  #observer = null;
  /** Единственный ожидающий RAF после прокрутки либо изменения размеров. */
  #frame = 0;

  /**
   * Связывает рисунок с отдельным слоем и фактическим окном области чтения.
   * @param {HTMLElement} body Общий скроллер панели.
   * @param {HTMLElement} layer Пустой слой .search-highlight-layer последним соседом материала.
   */
  constructor(body, layer) {
    this.#body = body;
    this.#layer = layer;
    this.rebind();
  }

  /**
   * Создаёт только один диапазон текущего совпадения и сразу выводит его видимые части.
   * @param {import('./search-projection.mjs').SearchProjection} projection Проекция нынешнего представления.
   * @param {number} start Включаемое UTF-16 начало выбранного совпадения.
   * @param {number} end Не включаемый UTF-16 конец выбранного совпадения.
   * @returns {void} Прежний Range освобождается; повреждённая либо устаревшая проекция оставляет слой пустым.
   */
  show(projection, start, end) {
    this.clear();
    if (this.#view !== this.#body.ownerDocument.defaultView) this.rebind();
    if (projection.document !== this.#body.ownerDocument) return;
    this.#range = rangeForSearchMatch(projection, start, end);
    this.#observe();
    this.#paint();
  }

  /**
   * Прокручивает к началу текущего совпадения, включая вложенный pre/table скроллер.
   * @returns {void} Не переводит фокус, не меняет выделение, нижний адрес или журнал.
   */
  scrollCurrent() {
    const range = this.#range;
    const view = this.#view;
    if (!range || !view) return;
    const parent = range.startContainer.parentElement;
    for (let element = parent; element && this.#body.contains(element); element = element.parentElement) {
      const rect = range.getClientRects()[0];
      if (!rect) break;
      const clip = innerRect(element);
      const style = view.getComputedStyle(element);
      if (element === this.#body || /auto|scroll|hidden/.test(style.overflowY)) {
        if (rect.top < clip.top || rect.bottom > clip.bottom) {
          element.scrollTop += rect.top - clip.top - Math.min(element.clientHeight / 4, 80);
        }
      }
      if (element === this.#body || /auto|scroll|hidden/.test(style.overflowX)) {
        if (rect.left < clip.left) element.scrollLeft += rect.left - clip.left;
        else if (rect.right > clip.right) element.scrollLeft += rect.right - clip.right;
      }
      if (element === this.#body) break;
    }
    this.#paint();
  }

  /**
   * Освобождает диапазон перед заменой текста или переносом и убирает только собственные прямоугольники.
   * @returns {void} Слушатели остаются до rebind/dispose; проекция и запрос принадлежат Panel.
   */
  clear() {
    if (this.#frame) this.#view?.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#range = null;
    this.#layer.replaceChildren();
    this.#observe();
  }

  /**
   * Перепривязывает тот же слой к нынешнему ownerDocument после PiP либо отката.
   * @returns {void} Старые RAF/события/наблюдатели и Range сняты; новый диапазон передаётся последующим show.
   */
  rebind() {
    this.dispose();
    const view = /** @type {(Window & typeof globalThis)|null} */ (this.#body.ownerDocument.defaultView);
    if (!view) return;
    this.#view = view;
    this.#events = new view.AbortController();
    const signal = this.#events.signal;
    this.#body.addEventListener('scroll', () => this.#schedule(), { capture: true, passive: true, signal });
    view.addEventListener('resize', () => this.#schedule(), { signal });
    if (typeof view.ResizeObserver === 'function') {
      this.#observer = new view.ResizeObserver(() => this.#schedule());
      this.#observe();
    }
  }

  /**
   * Полностью снимает привязку прежнего окна и освобождает диапазон/рисунок.
   * @returns {void} Повторный dispose безопасен; после переноса экземпляр можно подключить через rebind.
   */
  dispose() {
    this.clear();
    this.#events?.abort();
    this.#events = null;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#view = null;
  }

  /** Наблюдает только размеры нынешнего рисунка, не мутации материала. */
  #observe() {
    if (!this.#observer) return;
    this.#observer.disconnect();
    this.#observer.observe(this.#body);
    const node = this.#range?.commonAncestorContainer;
    let parent = node?.nodeType === 1 ? /** @type {Element} */ (node) : node?.parentElement;
    while (parent && parent !== this.#body && this.#view?.getComputedStyle(parent).display === 'inline') {
      parent = parent.parentElement;
    }
    if (parent && parent !== this.#body) this.#observer.observe(parent);
  }

  /** Объединяет прокрутку/resize в один RAF; без диапазона или после смены документа не рисует. */
  #schedule() {
    const view = this.#view;
    if (!view || !this.#range || this.#frame) return;
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = 0;
      if (this.#view === view && this.#body.ownerDocument === view.document) this.#paint();
    });
  }

  /** Рисует видимые clientRects одного Range отдельными span, не создавая узлы на все найденные совпадения. */
  #paint() {
    const range = this.#range;
    const view = this.#view;
    if (
      !range || !view || range.startContainer.ownerDocument !== this.#body.ownerDocument
      || !range.startContainer.isConnected || !range.endContainer.isConnected
    ) {
      this.#layer.replaceChildren();
      return;
    }
    const clip = innerRect(this.#body);
    for (
      let element = range.startContainer.parentElement;
      element && element !== this.#body;
      element = element.parentElement
    ) {
      const style = view.getComputedStyle(element);
      const bounds = innerRect(element);
      if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
        clip.left = Math.max(clip.left, bounds.left);
        clip.right = Math.min(clip.right, bounds.right);
      }
      if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
        clip.top = Math.max(clip.top, bounds.top);
        clip.bottom = Math.min(clip.bottom, bounds.bottom);
      }
    }
    const origin = this.#layer.getBoundingClientRect();
    const nodes = this.#body.ownerDocument.createDocumentFragment();
    const seen = new Set();
    for (const rect of range.getClientRects()) {
      const left = Math.max(rect.left, clip.left);
      const top = Math.max(rect.top, clip.top);
      const right = Math.min(rect.right, clip.right);
      const bottom = Math.min(rect.bottom, clip.bottom);
      if (right <= left || bottom <= top) continue;
      const identity = `${left}:${top}:${right}:${bottom}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      const mark = this.#body.ownerDocument.createElement('span');
      mark.className = 'search-current-rect';
      mark.style.left = `${left - origin.left}px`;
      mark.style.top = `${top - origin.top}px`;
      mark.style.width = `${right - left}px`;
      mark.style.height = `${bottom - top}px`;
      nodes.append(mark);
    }
    this.#layer.replaceChildren(nodes);
  }
}
