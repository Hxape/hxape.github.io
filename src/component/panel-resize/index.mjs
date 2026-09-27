/** Управляет шириной одного dialog, захватом указателя и наблюдением рабочей области. */

/**
 * Начальные значения одного жеста ширины; сохраняются только до завершения указателя.
 * @typedef {Object} PanelPointer
 * @property {number} pointerId Основной pointer, захваченный разделителем.
 * @property {number} x Горизонтальная координата начала в клиентской области.
 * @property {number} width Исходная доля ширины панели, к которой применяется смещение.
 */
/**
 * Границы одной изменяемой панели; доли задаются от ширины рабочей области.
 * @typedef {Object} PanelResizeRules
 * @property {number} initial Начальная доля ширины рабочей области.
 * @property {number} maximum Максимальная допустимая доля ширины.
 * @property {number} minimumPixels Пиксельный минимум, ограниченный minimumFraction на узком окне.
 * @property {number} minimumFraction Доля, ограничивающая пиксельный минимум в узкой области.
 * @property {number} keyStepPixels Обычный шаг клавиатурного изменения ширины.
 * @property {number} largeKeyStepPixels Шаг при удержании Shift.
 */

/** Внутренняя ширина панели: значение, захват указателя и наблюдение рабочей области. */
export class PanelWidth {
  /**
   * Единственный dialog получателя; контроллер задаёт ему --docs-width весь срок жизни экземпляра.
   * @type {HTMLDialogElement}
   */
  #dialog;
  /**
   * Прежний разделитель ширины; получает ввод и pointer capture при действующей привязке окна.
   * @type {HTMLDivElement}
   */
  #handle;
  /**
   * Выбранная доля ширины; сохраняется между stop/bind и переносами панели.
   * @type {number}
   */
  #width;
  /**
   * Переданные пределы и шаги ширины; не меняются самим контроллером.
   * @type {PanelResizeRules}
   */
  #rules;
  /**
   * Форматирование выбранного процента для aria-valuetext; смысл подписи задаёт блок.
   * @type {(percent:number)=>string}
   */
  #formatWidth;
  /**
   * Начало одного активного перетаскивания: id указателя, clientX и ширина панели в пикселях; null вне жеста.
   * @type {PanelPointer|null}
   */
  #pointer = null;
  /**
   * Рабочая область нынешней привязки, чья ширина задаёт пределы; null после stop.
   * @type {HTMLElement|null}
   */
  #workspace = null;
  /**
   * Окно нынешнего отображения, используемое для наблюдения и RAF; null вне bind.
   * @type {import('../../common/ui/view-utils.mjs').DisplayWindow|null}
   */
  #view = null;
  /**
   * Срок слушателей одной привязки; stop отзывает его целиком.
   * @type {AbortController|null}
   */
  #events = null;
  /**
   * Наблюдение размера рабочей области в нынешнем окне; отключается при stop.
   * @type {ResizeObserver|null}
   */
  #observer = null;
  /**
   * Последняя полученная ширина рабочей области до применения в RAF; null после stop.
   * @type {number|null}
   */
  #observedWidth = null;
  /**
   * Последняя применённая ширина области; повтор того же измерения не вызывает apply.
   * @type {number|null}
   */
  #appliedWidth = null;
  /**
   * Один отложенный RAF измерения; 0 означает отсутствие ожидающего кадра.
   */
  #frame = 0;
  /**
   * Разрешение менять ширину в нынешнем размещении; false завершает жест.
   */
  #enabled = false;
  /**
   * Действие блока, завершающее анимацию dialog перед ручным изменением; вне bind пусто.
   * @type {()=>void}
   */
  #finishAnimation = () => {};

  /**
   * Создаёт управление прежним dialog и его разделителем с независимой сохранённой шириной.
   * @param {HTMLDialogElement} dialog Единственный dialog, получающий --docs-width.
   * @param {HTMLDivElement} handle Вертикальный разделитель, получающий ввод и aria-значения.
   * @param {PanelResizeRules} rules Начальная доля, пределы и клавиатурные шаги ширины.
   * @param {(percent:number)=>string} formatWidth Форматирование выбранного целого процента для вспомогательного чтения.
   */
  constructor(dialog, handle, rules, formatWidth) {
    this.#dialog = dialog;
    this.#handle = handle;
    this.#rules = rules;
    this.#width = rules.initial;
    this.#formatWidth = formatWidth;
  }

  /**
   * Снимает прежнюю привязку и подключает ввод и измерение в нынешнем окне.
   * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Фактическое окно dialog после подключения или PiP.
   * @param {HTMLElement} workspace Область, ширина которой ограничивает размер панели.
   * @param {()=>void} finishAnimation Действие блока перед началом ручного изменения.
   * @returns {void} Подключает слушатели и ResizeObserver; сохранённая доля ширины не сбрасывается.
   */
  bind(view, workspace, finishAnimation) {
    this.stop();
    this.#view = view;
    this.#workspace = workspace;
    this.#finishAnimation = finishAnimation;
    const events = new view.AbortController();
    this.#events = events;
    const signal = events.signal;
    this.#handle.addEventListener('pointerdown', (event) => this.#start(event), { signal });
    this.#handle.addEventListener('pointermove', (event) => this.#move(event), { signal });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.#handle.addEventListener(type, () => this.#end(), { signal });
    }
    this.#handle.addEventListener('keydown', (event) => this.#key(event), { signal });
    view.addEventListener('blur', () => this.#end(), { signal });
    this.#observer = new view.ResizeObserver(([entry]) => this.#measure(entry.contentRect.width, events));
    this.#observer.observe(workspace);
  }

  /**
   * Разрешает изменение ширины либо завершает текущий жест при отключении.
   * @param {boolean} enabled true включает ручное изменение в этом размещении.
   * @returns {void} При включении применяет сохранённую ширину; при отключении снимает захват указателя.
   */
  setEnabled(enabled) {
    this.#enabled = enabled;
    if (enabled) this.apply();
    else this.#end();
  }

  /**
   * Ограничивает долю ширины и согласует CSS и доступные значения разделителя.
   * @param {number} [value] Запрошенная доля ширины области; по умолчанию прежняя выбранная доля.
   * @param {number} [workspaceWidth] Измеренная ширина рабочей области в пикселях; по умолчанию clientWidth.
   * @returns {void} Применяет допустимую долю; без измеряемой ширины ничего не меняет.
   */
  apply(value = this.#width, workspaceWidth = this.#workspace?.clientWidth || 0) {
    if (!workspaceWidth) return;
    const minimum = Math.min(this.#rules.minimumPixels, workspaceWidth * this.#rules.minimumFraction) / workspaceWidth;
    this.#width = Math.min(this.#rules.maximum, Math.max(minimum, value));
    const percent = `${this.#width * 100}%`;
    if (this.#dialog.style.getPropertyValue('--docs-width') !== percent) {
      this.#dialog.style.setProperty('--docs-width', percent);
    }
    const attributes = {
      'aria-valuemin': Math.round(minimum * 100),
      'aria-valuemax': Math.round(this.#rules.maximum * 100),
      'aria-valuenow': Math.round(this.#width * 100),
      'aria-valuetext': this.#formatWidth(Math.round(this.#width * 100)),
    };
    for (const [name, text] of Object.entries(attributes)) {
      if (this.#handle.getAttribute(name) !== String(text)) this.#handle.setAttribute(name, String(text));
    }
  }

  /**
   * Завершает жест и снимает события, наблюдатель и RAF нынешнего окна.
   * @returns {void} Очищает привязку и разрешение ввода, сохраняя выбранную долю ширины.
   */
  stop() {
    this.#end();
    this.#events?.abort();
    this.#events = null;
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#frame) this.#view?.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#observedWidth = this.#appliedWidth = null;
    this.#workspace = null;
    this.#view = null;
    this.#enabled = false;
    this.#finishAnimation = () => {};
  }

  /**
   * Начинает жест ширины по основному указателю на открытой разрешённой панели.
   * @param {PointerEvent} event Pointerdown разделителя; остальные кнопки и запрещённое размещение пропускаются.
   * @returns {void} Сохраняет исходные координаты и захватывает указатель; при отказе условий жест не создаётся.
   */
  #start(event) {
    if (!this.#enabled || !this.#dialog.open || !this.#workspace || !event.isPrimary || event.button !== 0) return;
    this.#finishAnimation();
    event.preventDefault();
    this.#pointer = { pointerId: event.pointerId, x: event.clientX, width: this.#width * this.#workspace.clientWidth };
    this.#handle.setPointerCapture(event.pointerId);
    this.#handle.focus({ preventScroll: true });
  }

  /**
   * Меняет ширину только по указателю действующего жеста.
   * @param {PointerEvent} event Перемещение захваченного указателя в clientX нынешнего окна.
   * @returns {void} Передаёт новую долю в apply; чужой указатель и нулевая ширина области пропускаются.
   */
  #move(event) {
    if (this.#pointer && event.pointerId === this.#pointer.pointerId && this.#workspace?.clientWidth) {
      this.apply((this.#pointer.width + this.#pointer.x - event.clientX) / this.#workspace.clientWidth);
    }
  }

  /**
   * Завершает один жест ширины и освобождает pointer capture.
   * @returns {void} Отбрасывает данные жеста; без жеста ничего не меняет.
   */
  #end() {
    if (!this.#pointer) return;
    const id = this.#pointer.pointerId;
    this.#pointer = null;
    if (this.#handle.hasPointerCapture(id)) this.#handle.releasePointerCapture(id);
  }

  /**
   * Обрабатывает изменение ширины стрелками, Home и End на разделителе.
   * @param {KeyboardEvent} event Клавиша разделителя; Shift выбирает крупный шаг, Alt/Ctrl/Meta не обрабатываются.
   * @returns {void} Для поддержанной клавиши завершает анимацию, применяет пределы и отменяет нативное действие.
   */
  #key(event) {
    if (
      !this.#enabled || !this.#dialog.open || !this.#workspace?.clientWidth || event.altKey || event.ctrlKey
      || event.metaKey
    ) return;
    const step = (event.shiftKey ? this.#rules.largeKeyStepPixels : this.#rules.keyStepPixels)
      / this.#workspace.clientWidth;
    let value;
    if (event.key === 'ArrowLeft') value = this.#width + step;
    else if (event.key === 'ArrowRight') value = this.#width - step;
    else if (event.key === 'Home') value = 0;
    else if (event.key === 'End') value = 1;
    else return;
    this.#finishAnimation();
    this.apply(value);
    event.preventDefault();
  }

  /**
   * Объединяет изменения рабочей ширины в один RAF нынешней привязки.
   * @param {number} width Новая ширина рабочей области из ResizeObserver в пикселях.
   * @param {AbortController} binding Срок привязки, породивший измерение; чужая привязка игнорируется.
   * @returns {void} Повтор измерения пропускается; новый размер завершает жест и при enabled ограничивает сохранённую долю.
   */
  #measure(width, binding) {
    if (this.#events !== binding || width === this.#observedWidth) return;
    this.#observedWidth = width;
    if (this.#frame || !this.#view) return;
    const view = this.#view;
    this.#frame = view.requestAnimationFrame(() => {
      if (this.#events !== binding) return;
      this.#frame = 0;
      const measured = this.#observedWidth;
      if (measured === null || measured === this.#appliedWidth) return;
      this.#appliedWidth = measured;
      this.#end();
      if (this.#enabled) this.apply(this.#width, measured);
    });
  }
}
