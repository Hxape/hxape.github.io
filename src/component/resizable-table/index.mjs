/** Ведёт ручки и ширины колонок очищенного документа при обычном показе и живом переносе. */

/**
 * Одна видимая область захвата границы колонок у существующей ячейки.
 * @typedef {Object} ColumnSegment
 * @property {HTMLTableCellElement} cell Ячейка проверенной сетки для измерения вертикального участка.
 * @property {HTMLSpanElement} area Прежний прозрачный span указателя, переносимый вместе с ручкой.
 */
import { displayWindow, isElement, isHTMLElement } from '../../common/ui/view-utils.mjs';

/**
 * Синхронные действия временного переноса уже созданных ручек таблицы.
 * @typedef {Object} PreparedMove
 * @property {()=>void} resume Перепривязывает нынешний документ и возвращает прокрутку без нового DOM.
 * @property {()=>void} rollback Очищает частичную привязку и восстанавливает прежнее отображение.
 * @property {()=>void} commit Завершает временную паузу, сохраняя нынешние узлы и ширины.
 */
/**
 * Положение одной ячейки в вычисленной сетке таблицы.
 * @typedef {Object} GridCell
 * @property {HTMLTableCellElement} cell Прежняя ячейка th или td.
 * @property {number} start Индекс первой занимаемой колонки, начиная с 0.
 * @property {number} end Индекс границы после последней занимаемой колонки.
 */
/**
 * Проверенная сетка без вложенных таблиц с доступными границами всех колонок.
 * @typedef {Object} ColumnGrid
 * @property {GridCell[]} cells Ячейки с учтёнными rowSpan и colSpan.
 * @property {number} count Полное число логических колонок.
 */
/**
 * Начало одного жеста границы соседних колонок.
 * @typedef {Object} ColumnDrag
 * @property {HTMLElement} handle Ручка, удерживающая pointer capture.
 * @property {number} index Индекс левой из двух изменяемых колонок.
 * @property {number} pointerId Идентификатор захваченного указателя.
 * @property {number} x Исходный clientX жеста.
 * @property {number} width Исходная ширина левой колонки в пикселях.
 * @property {number} total Неизменная суммарная ширина пары колонок в этом жесте.
 */
/**
 * Управление совокупностью таблиц одного оформленного документа.
 * @typedef {Object} DocumentTableControls
 * @property {()=>void} dispose Окончательно снимает слушатели, наблюдатели и активные жесты всех таблиц.
 * @property {()=>PreparedMove} prepareMove Приостанавливает таблицы для синхронного переноса, сохраняя DOM и ширины.
 */
/** Минимум колонки в пикселях для допустимого жеста и клавиатурного изменения. */
const minimumWidth = 48;

/**
 * Проверяет сетку rowSpan/colSpan и возможность ручек на всех границах.
 * @param {HTMLTableElement} table Таблица, для которой ещё не созданы обёртка и ручки.
 * @returns {ColumnGrid|null} Сетка логических колонок; null для вложенной, пересекающейся или неподходящей таблицы.
 */
function columnGrid(table) {
  if (table.querySelector('table')) return null;
  /** @type {GridCell[]} */
  const cells = [];
  const edges = new Set([0]);
  /** @type {number[]} */
  let occupied = [];
  /** @type {Element|null} */
  let group = null;
  let count = 0;
  for (const row of table.rows) {
    if (group !== row.parentElement) {
      group = row.parentElement;
      occupied = [];
    }
    let column = 0;
    for (const cell of row.cells) {
      while (occupied[column]) column++;
      const end = column + cell.colSpan;
      for (let index = column; index < end; index++) {
        if (occupied[index]) return null;
        occupied[index] = cell.rowSpan || Infinity;
      }
      cells.push({ cell, start: column, end });
      edges.add(column);
      edges.add(end);
      count = Math.max(count, end);
      column = end;
    }
    occupied = occupied.map((value) => Math.max(0, value - 1));
  }
  return count > 1 && edges.size === count + 1 ? { cells, count } : null;
}

/** Сохраняет прежние widths/colgroup/handles; перенос меняет только привязки окна. */
class TableResize {
  /**
   * Прежняя очищенная таблица; перенос не заменяет её DOM.
   * @type {HTMLTableElement}
   */
  #table;
  /**
   * Проверенные логические колонки и ячейки этой таблицы, неизменные для экземпляра.
   * @type {ColumnGrid}
   */
  #grid;
  /**
   * Форматирование доступного имени границы двух колонок, номера начинаются с 1.
   * @type {(first:number,second:number)=>string}
   */
  #columnLabel;
  /**
   * Единственная обёртка прокрутки таблицы; сохраняется при переносах.
   * @type {HTMLDivElement}
   */
  #viewport;
  /**
   * Прежние col, созданные при первом измерении для закрепления ширин.
   * @type {HTMLTableColElement[]}
   */
  #columns = [];
  /**
   * Прежние ручки внутренних границ колонок; не пересоздаются при измерении или PiP.
   * @type {HTMLDivElement[]}
   */
  #handles = [];
  /**
   * Области захвата каждой ручки, соответствующие вертикальным участкам ячеек.
   * @type {ColumnSegment[][]}
   */
  #segments = [];
  /**
   * Выбранные пиксельные ширины колонок; сохраняются между привязками окна.
   * @type {number[]}
   */
  #widths = [];
  /**
   * Начало одного активного жеста изменения пары колонок; null вне перетаскивания.
   * @type {ColumnDrag|null}
   */
  #drag = null;
  /**
   * Срок слушателей нынешнего окна; unbind отзывает его целиком.
   * @type {AbortController|null}
   */
  #events = null;
  /**
   * Наблюдение геометрии прежней таблицы в нынешнем окне; снимается при unbind.
   * @type {ResizeObserver|null}
   */
  #observer = null;
  /**
   * Окно нынешнего отображения для RAF и DOM-событий; null вне привязки.
   * @type {import('../../common/ui/view-utils.mjs').DisplayWindow|null}
   */
  #view = null;
  /**
   * Единственный отложенный RAF измерения; 0 означает, что кадр не ожидается.
   */
  #frame = 0;
  /**
   * Поколение привязки; старый RAF и наблюдатель не трогают новое окно.
   */
  #environment = 0;
  /**
   * Временная пауза переноса, запрещающая жесты и измерение до commit или rollback.
   */
  #moving = false;
  /**
   * Окончательное завершение контроллера; после dispose привязка не восстанавливается.
   */
  #disposed = false;

  /**
   * Обрамляет прежнюю таблицу единственной областью прокрутки и подключает её управление.
   * @param {HTMLTableElement} table Таблица с проверенной сеткой, не заменяемая контроллером.
   * @param {ColumnGrid} grid Результат проверки её логических колонок.
   * @param {(first:number,second:number)=>string} columnLabel Доступная подпись разделителя по номерам соседних колонок, начиная с 1.
   * @throws {Error} Отказ DOM или привязки очищается вызывающим владельцем набора таблиц.
   */
  constructor(table, grid, columnLabel) {
    this.#table = table;
    this.#grid = grid;
    this.#columnLabel = columnLabel;
    this.#viewport = table.ownerDocument.createElement('div');
    this.#viewport.className = 'document-table-scroll';
    table.before(this.#viewport);
    this.#viewport.append(table);
    table.classList.add('document-resizable');
    this.#bind();
  }

  /**
   * Применяет сохранённые пиксельные ширины col и суммарную ширину таблицы.
   * @returns {void} Меняет CSS ширины прежних узлов; новую геометрию не измеряет.
   */
  #writeWidths() {
    this.#table.style.width = `${this.#widths.reduce((sum, width) => sum + width, 0)}px`;
    this.#columns.forEach((column, index) => {
      column.style.width = `${this.#widths[index]}px`;
    });
  }

  /**
   * Перемещает границу пары колонок, сохраняя суммарную ширину и минимум каждой.
   * @param {number} index Индекс левой колонки изменяемой пары.
   * @param {number} width Желаемая новая ширина левой колонки в пикселях.
   * @param {number} [total] Фиксированная ширина пары; по умолчанию сумма нынешних ширин.
   * @returns {void} Меняет две сохранённые ширины, применяет CSS и обновляет ручки.
   */
  #move(index, width, total = this.#widths[index] + this.#widths[index + 1]) {
    this.#widths[index] = Math.max(minimumWidth, Math.min(total - minimumWidth, width));
    this.#widths[index + 1] = total - this.#widths[index];
    this.#writeWidths();
    this.#refresh();
  }

  /**
   * Отбрасывает данные жеста и освобождает захват указателя.
   * @returns {void} Без жеста или захвата ничего не делает; отсутствие указателя при release допускается.
   * @throws {Error} Прочая ошибка освобождения pointer capture передаётся владельцу.
   */
  #endDrag() {
    const previous = this.#drag;
    this.#drag = null;
    if (!previous?.handle.hasPointerCapture(previous.pointerId)) return;
    try {
      previous.handle.releasePointerCapture(previous.pointerId);
    } catch (error) {
      if (!error || typeof error !== 'object' || !('name' in error) || error.name !== 'NotFoundError') throw error;
    }
  }

  /**
   * Проверяет, относится ли цель события к ручке этой таблицы.
   * @param {EventTarget|null} target Цель события в нынешнем документе, в том числе null.
   * @returns {HTMLElement|null} Найденная ручка внутри своей обёртки либо null для чужой цели.
   */
  #handle(target) {
    const handle = isElement(target) ? target.closest('.document-column-resize') : null;
    return isHTMLElement(handle) && this.#viewport.contains(handle) ? handle : null;
  }

  /**
   * Начинает перетаскивание доступной границы колонок основным указателем.
   * @param {PointerEvent} event Pointerdown в обёртке таблицы; неосновные указатели, кнопки и перенос пропускаются.
   * @returns {void} Сохраняет исходные величины, фокусирует ручку и захватывает указатель.
   */
  #startDrag(event) {
    if (this.#disposed || this.#moving || event.button !== 0 || event.isPrimary === false) return;
    const handle = this.#handle(event.target);
    if (!handle) return;
    const index = Number(handle.dataset.column);
    this.#endDrag();
    event.preventDefault();
    event.stopPropagation();
    handle.focus({ preventScroll: true });
    this.#drag = {
      handle,
      index,
      pointerId: event.pointerId,
      x: event.clientX,
      width: this.#widths[index],
      total: this.#widths[index] + this.#widths[index + 1],
    };
    handle.setPointerCapture(event.pointerId);
  }

  /**
   * Применяет перемещение только указателя действующего жеста.
   * @param {PointerEvent} event Pointermove с clientX относительно начала жеста.
   * @returns {void} Меняет пару колонок и отменяет обычное действие; чужой указатель и пауза пропускаются.
   */
  #pointerMove(event) {
    const drag = this.#drag;
    if (this.#disposed || this.#moving || !drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    this.#move(drag.index, drag.width + event.clientX - drag.x, drag.total);
  }

  /**
   * Меняет пару колонок клавиатурой выбранной ручки.
   * @param {KeyboardEvent} event Стрелки, Home или End; Shift увеличивает шаг, Alt/Ctrl/Meta пропускаются.
   * @returns {void} Применяет допустимую ширину и останавливает распространение принятой клавиши.
   */
  #key(event) {
    if (this.#disposed || this.#moving || event.altKey || event.ctrlKey || event.metaKey) return;
    const handle = this.#handle(event.target);
    if (!handle) return;
    const index = Number(handle.dataset.column);
    const step = event.shiftKey ? 25 : 5;
    let width;
    if (event.key === 'ArrowLeft') width = this.#widths[index] - step;
    else if (event.key === 'ArrowRight') width = this.#widths[index] + step;
    else if (event.key === 'Home') width = minimumWidth;
    else if (event.key === 'End') width = this.#widths[index] + this.#widths[index + 1] - minimumWidth;
    else return;
    event.preventDefault();
    event.stopPropagation();
    this.#move(index, width);
  }

  /**
   * Создаёт одну границу и её области захвата по ячейкам проверенной сетки.
   * @param {number} index Индекс левой колонки; граница находится после неё.
   * @returns {void} Добавляет ручку в прежнюю обёртку и сохраняет её вертикальные участки.
   */
  #createHandle(index) {
    const owner = this.#table.ownerDocument;
    const handle = owner.createElement('div');
    handle.className = 'document-column-resize';
    handle.dataset.column = String(index);
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', this.#columnLabel(index + 1, index + 2));
    this.#segments[index] = this.#grid.cells.filter(({ end }) => end === index + 1).map(({ cell }) => {
      const area = owner.createElement('span');
      handle.append(area);
      return { cell, area };
    });
    this.#viewport.append(handle);
    this.#handles.push(handle);
  }

  /**
   * При первом измерении фиксирует colgroup и ширины, далее переставляет прежние ручки.
   * @returns {void} Без геометрии или во время переноса ничего не меняет; существующие ширины не переизмеряет.
   */
  #refresh() {
    if (this.#moving || this.#disposed || !this.#table.getBoundingClientRect().width) return;
    const table = this.#table;
    if (!this.#widths.length) {
      /** @type {number[]} */
      const edges = [];
      for (const { cell, start, end } of this.#grid.cells) {
        const rect = cell.getBoundingClientRect();
        edges[start] = rect.left;
        edges[end] = rect.right;
      }
      this.#widths = Array.from(
        { length: this.#grid.count },
        (_, index) => Math.max(minimumWidth, edges[index + 1] - edges[index]),
      );
      const group = table.ownerDocument.createElement('colgroup');
      for (let index = 0; index < this.#grid.count; index++) {
        const column = table.ownerDocument.createElement('col');
        group.append(column);
        this.#columns.push(column);
        if (index < this.#grid.count - 1) this.#createHandle(index);
      }
      if (table.caption) table.caption.after(group);
      else table.prepend(group);
      table.style.tableLayout = 'fixed';
      this.#writeWidths();
    }
    const rect = table.getBoundingClientRect();
    const outer = this.#viewport.getBoundingClientRect();
    const top = table.rows[0].getBoundingClientRect().top;
    const bottom = table.rows[table.rows.length - 1].getBoundingClientRect().bottom;
    let left = rect.left - outer.left + this.#viewport.scrollLeft;
    this.#handles.forEach((handle, index) => {
      left += this.#widths[index];
      handle.style.left = `${left}px`;
      handle.style.top = `${top - outer.top + this.#viewport.scrollTop}px`;
      handle.style.height = `${bottom - top}px`;
      handle.setAttribute('aria-valuemin', String(minimumWidth));
      handle.setAttribute(
        'aria-valuemax',
        String(Math.round(this.#widths[index] + this.#widths[index + 1] - minimumWidth)),
      );
      handle.setAttribute('aria-valuenow', String(Math.round(this.#widths[index])));
      for (const { cell, area } of this.#segments[index]) {
        const cellRect = cell.getBoundingClientRect();
        area.style.top = `${cellRect.top - top}px`;
        area.style.height = `${cellRect.height}px`;
      }
    });
  }

  /**
   * Объединяет обновления геометрии в один RAF нынешнего окна.
   * @returns {void} Кадр применяет refresh только при прежнем поколении привязки.
   */
  #schedule() {
    if (this.#disposed || this.#frame || !this.#view) return;
    const environment = this.#environment;
    this.#frame = this.#view.requestAnimationFrame(() => {
      if (environment !== this.#environment) return;
      this.#frame = 0;
      this.#refresh();
    });
  }

  /**
   * Подключает события и ResizeObserver фактического окна таблицы.
   * @returns {void} Создаёт один срок привязки и планирует измерение; повтор и disposed пропускаются.
   * @throws {Error} При частичном отказе очищает привязки, объединяя ошибки освобождения.
   */
  #bind() {
    if (this.#events || this.#disposed) return;
    const view = displayWindow(this.#table);
    const environment = ++this.#environment;
    this.#view = view;
    this.#events = new view.AbortController();
    const signal = this.#events.signal;
    try {
      this.#viewport.addEventListener('pointerdown', (event) => this.#startDrag(event), { signal });
      this.#viewport.addEventListener('pointermove', (event) => this.#pointerMove(event), { signal });
      this.#viewport.addEventListener('keydown', (event) => this.#key(event), { signal });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        this.#viewport.addEventListener(type, () => this.#endDrag(), { signal });
      }
      view.addEventListener('blur', () => this.#endDrag(), { signal });
      this.#observer = new view.ResizeObserver(() => {
        if (environment === this.#environment) this.#schedule();
      });
      this.#observer.observe(this.#table);
      this.#schedule();
    } catch (error) {
      try {
        this.#unbind();
      } catch (failure) {
        throw new AggregateError([error, failure], 'Could not release table bindings');
      }
      throw error;
    }
  }

  /**
   * Снимает наблюдение, RAF, жест и слушатели, инвалидируя старое поколение.
   * @returns {void} Ширины и DOM сохраняются для следующего bind.
   * @throws {Error} Собранные ошибки освобождения возвращаются как AggregateError.
   */
  #unbind() {
    ++this.#environment;
    const observer = this.#observer;
    const frame = this.#frame;
    const view = this.#view;
    const events = this.#events;
    this.#observer = null;
    this.#frame = 0;
    this.#events = null;
    this.#view = null;
    /** @type {unknown[]} */
    const errors = [];
    try {
      observer?.disconnect();
    } catch (error) {
      errors.push(error);
    }
    try {
      if (frame) view?.cancelAnimationFrame(frame);
    } catch (error) {
      errors.push(error);
    }
    try {
      this.#endDrag();
    } catch (error) {
      errors.push(error);
    }
    try {
      events?.abort();
    } catch (error) {
      errors.push(error);
    }
    if (errors.length) throw new AggregateError(errors, 'Could not release table bindings');
  }

  /**
   * Приостанавливает отображение для живого переноса прежней таблицы.
   * @returns {PreparedMove} Действия resume/rollback/commit с сохранённой прокруткой и ширинами.
   * @throws {Error} Повторная подготовка запрещена; частичный отказ пытается восстановить прежние привязки.
   */
  prepareMove() {
    if (this.#moving) throw new Error('The table is already being moved');
    const scroll = { left: this.#viewport.scrollLeft, top: this.#viewport.scrollTop };
    let finished = false;
    /**
     * Перепривязывает прежнюю таблицу к фактическому окну и возвращает прокрутку переноса.
     * @returns {void} После уже завершённого переноса ничего не делает; ширины сохраняются.
     */
    const resume = () => {
      if (finished) return;
      this.#bind();
      this.#viewport.scrollLeft = scroll.left;
      this.#viewport.scrollTop = scroll.top;
    };
    /**
     * Восстанавливает прежние привязки после частичного переноса и завершает временную паузу.
     * @returns {void} Снимает moving даже при отказе unbind/resume; ошибка передаётся владельцу набора.
     */
    const rollback = () => {
      if (finished) return;
      try {
        this.#unbind();
        resume();
      } finally {
        this.#moving = false;
        finished = true;
      }
    };
    this.#moving = true;
    try {
      this.#unbind();
    } catch (error) {
      try {
        rollback();
      } catch (failure) {
        throw new AggregateError([error, failure], 'Could not restore the table after preparation failed');
      }
      throw error;
    }
    return {
      resume,
      rollback,
      commit: () => {
        this.#moving = false;
        finished = true;
      },
    };
  }

  /**
   * Окончательно завершает управление таблицей и снимает её привязки.
   * @returns {void} Запрещает новый bind, очищая временную паузу; DOM таблицы остаётся.
   * @throws {Error} Ошибки снятия привязок передаются вызывающему владельцу.
   */
  dispose() {
    this.#disposed = true;
    try {
      this.#unbind();
    } finally {
      this.#moving = false;
    }
  }
}

/**
 * Создаёт управление пригодными таблицами одного очищенного документа.
 * @param {HTMLElement} root Контейнер безопасной разметки, чьи таблицы проверяются.
 * @param {(first:number,second:number)=>string} columnLabel Форматирование доступного имени границы по номерам соседних колонок.
 * @returns {DocumentTableControls} Единые dispose и prepareMove для созданного набора; неподходящие таблицы не изменяются.
 * @throws {Error} Частично созданный набор освобождается; ошибки очистки могут объединяться с исходной.
 */
export function resizeDocumentTables(root, columnLabel) {
  /** @type {TableResize[]} */
  const controls = [];
  /**
   * Завершает все созданные контроллеры документа, продолжая очистку после единичного отказа.
   * @returns {void} При отказах возвращает AggregateError после попытки очистить весь набор.
   */
  const dispose = () => {
    /** @type {unknown[]} */
    const errors = [];
    for (const control of controls) {
      try {
        control.dispose();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Could not release document tables');
  };
  try {
    for (const table of root.querySelectorAll('table')) {
      const grid = columnGrid(table);
      if (grid) controls.push(new TableResize(table, grid, columnLabel));
    }
  } catch (error) {
    try {
      dispose();
    } catch (failure) {
      throw new AggregateError([error, failure], 'Could not release document tables after initialization failed');
    }
    throw error;
  }
  return {
    dispose,
    prepareMove: () => {
      /** @type {PreparedMove[]} */
      const moves = [];
      /**
       * Откатывает уже подготовленные таблицы в обратном порядке при отказе общей подготовки.
       * @returns {void} Пробует весь набор; накопленные отказы возвращает как AggregateError.
       */
      const rollback = () => {
        const errors = [];
        for (const move of [...moves].reverse()) {
          try {
            move.rollback();
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length) throw new AggregateError(errors, 'Could not restore document tables');
      };
      try {
        for (const control of controls) moves.push(control.prepareMove());
      } catch (error) {
        try {
          rollback();
        } catch (failure) {
          throw new AggregateError([error, failure], 'Could not restore document tables after preparation failed');
        }
        throw error;
      }
      return {
        resume: () => moves.forEach((move) => move.resume()),
        rollback,
        commit: () => moves.forEach((move) => move.commit()),
      };
    },
  };
}
