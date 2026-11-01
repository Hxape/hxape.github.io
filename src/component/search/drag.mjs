/** Перемещает показанную форму поиска только по вертикали; положение живёт до закрытия или переноса панели. */
import { isElement } from '../../common/ui/view-utils.mjs';

/**
 * Один указатель свободной области формы; запрос и материал сюда не входят.
 * @typedef {Object} SearchDrag
 * @property {number} pointerId Указатель, начавший перемещение.
 * @property {number} y Начальная вертикальная координата в CSS-пикселях текущего окна.
 * @property {number} offset Прежнее временное смещение, возвращаемое при отмене этого жеста.
 * @property {number} top Верхняя граница popup при нажатии для ограничения окном.
 * @property {number} bottom Нижняя граница popup при нажатии для ограничения окном.
 * @property {boolean} moving Вертикальное движение достигло 15 пикселей; короткий клик больше не выполняется.
 */

/**
 * Связывает вертикальное перемещение поиска со свободными областями формы, сохраняя поле и X-положение.
 * @param {HTMLDialogElement} popup Живой dialog поиска; обработчики переживают замену form при renderSearch.
 * @param {AbortSignal} signal Срок привязки фактического окна; close/change/PiP снимают её через cleanup или abort.
 * @returns {()=>void} Повторяемая очистка слушателей, захвата, временного смещения и признака движения; записи не сохраняются.
 */
export function bindSearchDrag(popup, signal) {
  const owner = popup.ownerDocument;
  const view = owner.defaultView;
  if (!view || signal.aborted) return () => {};
  /**
   * Текущее перемещение либо null после отпускания или отмены.
   * @type {SearchDrag|null}
   */
  let drag = null;
  /** Временный Y нынешнего открытия формы; не записывается в настройки или журнал. */
  let offset = 0;
  /** Ближайший pointer-click после перемещения/отмены подавляется, новое нажатие снимает запрет. */
  let suppressClick = false;
  /** Привязка уже очищена; повторная очистка не меняет новый экземпляр формы. */
  let disposed = false;

  /**
   * Отражает временное Y-смещение в одном свойстве, не меняя CSS-центрирование по X.
   * @returns {void} Нулевое смещение возвращает исходное оформление без inline-свойства.
   */
  const paint = () => {
    if (offset) popup.style.setProperty('--search-drag-y', `${offset}px`);
    else popup.style.removeProperty('--search-drag-y');
  };

  /**
   * Завершает жест без передачи данных владельцу поиска.
   * @param {boolean} commit Сохранить временное положение после pointerup; false возвращает положение до нажатия.
   * @returns {void} Освобождает указатель и marker; перемещение/отмена подавляют release-click.
   */
  const finish = commit => {
    const current = drag;
    if (!current) return;
    drag = null;
    suppressClick = current.moving || !commit;
    popup.removeAttribute('data-search-dragging');
    if (!commit) {
      offset = current.offset;
      paint();
    }
    try {
      if (popup.hasPointerCapture(current.pointerId)) popup.releasePointerCapture(current.pointerId);
    } catch { /* При отсоединении указатель уже может не принадлежать прежнему документу. */ }
  };

  /**
   * Начинает ожидание вертикального движения только вне элементов ввода и действий.
   * @param {PointerEvent} event Основное нажатие внутри нынешней формы поиска.
   * @returns {void} Input/buttons/links/labels и изменённые модификаторами события сохраняют обычное поведение.
   */
  const start = event => {
    finish(false);
    if (event.isPrimary && event.button === 0) suppressClick = false;
    if (
      disposed || !event.isPrimary || event.button !== 0 || event.defaultPrevented
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !isElement(event.target)
      || !event.target.closest('form.navigation-search')
      || event.target.closest('input,textarea,select,button,a,label,[contenteditable]')
    ) return;
    const bounds = popup.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      y: event.clientY,
      offset,
      top: bounds.top,
      bottom: bounds.bottom,
      moving: false,
    };
    event.preventDefault();
    try {
      popup.setPointerCapture(event.pointerId);
    } catch { /* Отмена указателя может опередить захват; события документа всё равно завершают жест. */ }
  };

  /**
   * Применяет только вертикальное смещение после порога, удерживая popup в пределах окна.
   * @param {PointerEvent} event Движение нынешнего указателя в фактическом документе.
   * @returns {void} Горизонтальное движение не меняет X и не запускает вертикальное перемещение.
   */
  const move = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const delta = event.clientY - drag.y;
    if (!drag.moving && Math.abs(delta) < 15) return;
    drag.moving = true;
    popup.setAttribute('data-search-dragging', '');
    event.preventDefault();
    offset = drag.offset + Math.max(-drag.top, Math.min(view.innerHeight - drag.bottom, delta));
    paint();
  };

  /**
   * Оставляет временное положение только после отпускания своего указателя.
   * @param {PointerEvent} event Отпускание указателя нынешнего окна.
   * @returns {void} Чужой указатель не завершает нынешний жест.
   */
  const release = event => {
    if (event.pointerId !== drag?.pointerId) return;
    move(event);
    finish(true);
  };

  /**
   * Возвращает положение до жеста при потере указателя.
   * @param {PointerEvent} event Pointercancel либо lostpointercapture текущего popup.
   * @returns {void} Отмена не влияет на запрос, совпадения или материал.
   */
  const cancel = event => {
    if (event.pointerId === drag?.pointerId) finish(false);
  };

  /**
   * Подавляет click, следующий за перемещением или отменой, сохраняя клавиатурные действия формы.
   * @param {MouseEvent} event Click внутри текущего popup после pointer-жеста.
   * @returns {void} Один release-click не закрывает поиск и не запускает кнопку под отпущенным указателем.
   */
  const click = event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  /** Возвращает исходное положение при изменении окна или потере фокуса во время движения. */
  const interrupted = () => finish(false);

  /**
   * Полностью снимает привязку перед close/change/PiP; повторное выполнение безопасно.
   * @returns {void} Не сохраняет Y и освобождает все ссылки жеста и слушатели прежнего документа.
   */
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    finish(false);
    offset = 0;
    suppressClick = false;
    paint();
    popup.removeEventListener('pointerdown', start);
    popup.removeEventListener('lostpointercapture', cancel);
    popup.removeEventListener('click', click, true);
    owner.removeEventListener('pointermove', move);
    owner.removeEventListener('pointerup', release);
    owner.removeEventListener('pointercancel', cancel);
    view.removeEventListener('blur', interrupted);
    view.removeEventListener('resize', interrupted);
    signal.removeEventListener('abort', dispose);
  };
  popup.addEventListener('pointerdown', start, { signal });
  popup.addEventListener('lostpointercapture', cancel, { signal });
  popup.addEventListener('click', click, { signal, capture: true });
  owner.addEventListener('pointermove', move, { signal, passive: false });
  owner.addEventListener('pointerup', release, { signal });
  owner.addEventListener('pointercancel', cancel, { signal });
  view.addEventListener('blur', interrupted, { signal });
  view.addEventListener('resize', interrupted, { signal });
  signal.addEventListener('abort', dispose, { once: true });
  return dispose;
}
