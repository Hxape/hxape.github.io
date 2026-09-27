/** Передаёт указательный жест метки закладки её владельцу после порога в половину высоты строки; текст исходника не меняет. */
import { isElement, isHTMLElement } from '../../common/ui/view-utils.mjs';

/**
 * Действия владельца адресов; компонент не выбирает строку назначения и не меняет Journal.
 * @typedef {Object} SourceBookmarkDragCallbacks
 * @property {(line:number)=>boolean} start Проверяет известную строку и запоминает исходную закладку без её перемещения; false отклоняет жест.
 * @property {(clientX:number,clientY:number)=>void} move Получает координаты после порога; владелец решает пропуск занятых строк и увод за столбец.
 * @property {()=>void} finish Принимает итог достигшего порога жеста при отпускании.
 * @property {()=>void} cancel Освобождает или откатывает подготовку при отмене, очистке либо коротком отпускании.
 */

/**
 * Один указатель метки на срок нажатия; ссылка на снятый при перемещении marker освобождается при завершении.
 * @typedef {Object} SourceBookmarkPress
 * @property {HTMLButtonElement} marker Прежняя кнопка метки для захвата; отсоединение после move не прекращает передачу координат.
 * @property {number} pointerId Указатель, начавший жест.
 * @property {number} x Начальная горизонтальная координата в CSS-пикселях нынешнего окна.
 * @property {number} y Начальная вертикальная координата в CSS-пикселях нынешнего окна.
 * @property {number} threshold Половина измеренного line-height gutter при нажатии; до неё move не вызывается.
 * @property {boolean} dragged Горизонтальный либо вертикальный сдвиг достиг порога; release-click подавляется.
 */

/**
 * Связывает кнопки существующих меток с координатным жестом, сохраняя клавиатурное действие короткого click.
 * @param {HTMLElement} host Живая оболочка SourceView с gutter и button[data-bookmark-line].
 * @param {SourceBookmarkDragCallbacks} callbacks Действия прежнего владельца закладок, без чтения его внутреннего состояния.
 * @param {AbortSignal} signal Срок привязки текущего документа; закрытие, смена материала и PiP вызывают cleanup либо abort.
 * @returns {()=>void} Повторяемая очистка жеста, захвата и слушателей; ни исходник, ни адресные записи компонент не меняет.
 */
export function bindSourceBookmarkDrag(host, callbacks, signal) {
  const owner = host.ownerDocument;
  const view = owner.defaultView;
  if (!view || signal.aborted) return () => {};
  /**
   * Единственное нажатие; после завершения ссылки старой кнопки здесь нет.
   * @type {SourceBookmarkPress|null}
   */
  let press = null;
  /** Ближайший pointer-click после drag/отмены подавляется в документе, даже если его целью стал другой узел. */
  let suppressClick = false;
  /** Очистка уже выполнена; повторный вызов не отменяет чужой новый жест. */
  let disposed = false;

  /**
   * Освобождает локальный жест до вызова владельца, чтобы перерисовка marker не возродила capture.
   * @param {boolean} released Указатель отпущен; только достигший порога жест вызывает finish, остальные вызывают cancel.
   * @returns {void} Подавляет завершающий pointer-click перемещения/отмены и освобождает прежний marker даже при отказе callback.
   */
  const end = released => {
    const current = press;
    if (!current) return;
    press = null;
    suppressClick = current.dragged || !released;
    host.removeAttribute('data-bookmark-dragging');
    try {
      if (released && current.dragged) callbacks.finish();
      else callbacks.cancel();
    } finally {
      try {
        if (current.marker.hasPointerCapture(current.pointerId)) {
          current.marker.releasePointerCapture(current.pointerId);
        }
      } catch { /* Отсоединённая метка уже может не иметь указателя прежнего документа. */ }
    }
  };

  /**
   * Новое нажатие отменяет прежний жест; новый основной указатель начинает независимое действие.
   * @param {PointerEvent} event Нажатие любого узла нынешнего документа, включая многокасание.
   * @returns {void} Второй палец не оставляет активную подготовку прежней закладки.
   */
  const newPress = event => {
    end(false);
    if (event.isPrimary && event.button === 0) suppressClick = false;
  };

  /**
   * Читает номер показанной метки и измеряет порог до передачи подготовки её владельцу.
   * @param {PointerEvent} event Основное нажатие кнопки метки без модификаторов.
   * @returns {void} Повреждённый номер, отсутствующий gutter или неизмеримая высота не начинают жест.
   */
  const start = event => {
    if (
      disposed || !event.isPrimary || event.button !== 0 || event.defaultPrevented
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !isElement(event.target)
    ) return;
    const marker = event.target.closest('button[data-bookmark-line]');
    if (!isHTMLElement(marker) || !host.contains(marker)) return;
    const raw = marker.getAttribute('data-bookmark-line');
    if (!raw || !/^[1-9]\d*$/.test(raw)) return;
    const line = Number(raw);
    const gutter = host.querySelector('[data-source-gutter]');
    if (!Number.isSafeInteger(line) || !gutter) return;
    const height = parseFloat(view.getComputedStyle(gutter).lineHeight);
    if (!Number.isFinite(height) || height <= 0 || !callbacks.start(line)) return;
    if (disposed || signal.aborted || host.ownerDocument !== owner) {
      callbacks.cancel();
      return;
    }
    press = {
      marker: /** @type {HTMLButtonElement} */ (marker),
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      threshold: height / 2,
      dragged: false,
    };
    event.preventDefault();
    try {
      marker.setPointerCapture(event.pointerId);
    } catch { /* При отменённом указателе события документа всё равно завершают подготовку. */ }
  };

  /**
   * Передаёт координаты после сдвига по любой оси на половину высоты строки, включая снятую при перерисовке метку.
   * @param {PointerEvent} event Движение нынешнего указателя в фактическом документе SourceView.
   * @returns {void} До порога не вызывает move и не позволяет компоненту удалить или перенести адрес.
   */
  const move = event => {
    const current = press;
    if (!current || event.pointerId !== current.pointerId) return;
    if (
      !current.dragged
      && Math.max(Math.abs(event.clientX - current.x), Math.abs(event.clientY - current.y)) < current.threshold
    ) return;
    current.dragged = true;
    host.setAttribute('data-bookmark-dragging', '');
    event.preventDefault();
    callbacks.move(event.clientX, event.clientY);
  };

  /**
   * Передаёт конечную координату и принимает только действительно перемещавшуюся метку.
   * @param {PointerEvent} event Отпускание указателя нынешнего документа.
   * @returns {void} Короткое отпускание очищает подготовку, оставляя обычный идемпотентный click владельцу.
   */
  const release = event => {
    if (event.pointerId !== press?.pointerId) return;
    move(event);
    end(true);
  };

  /**
   * Отменяет только нынешний указатель, не принимая preview координат.
   * @param {PointerEvent} event Pointercancel текущего документа.
   * @returns {void} Владелец освобождает или откатывает свою подготовку через cancel.
   */
  const cancel = event => {
    if (event.pointerId === press?.pointerId) end(false);
  };

  /**
   * Потеря захвата живой кнопки отменяет жест; её снятие владельцем при move позволяет продолжить координатные события.
   * @param {PointerEvent} event Lostpointercapture кнопки метки нынешнего host.
   * @returns {void} Отсоединённая кнопка не превращает обычное перемещение в отмену.
   */
  const lost = event => {
    if (event.pointerId === press?.pointerId && press.marker.isConnected) end(false);
  };

  /**
   * Подавляет release-click в capture документа, в том числе после удаления или перерисовки его первоначальной цели.
   * @param {MouseEvent} event Click нынешнего документа; клавиатурный click имеет detail=0 и остаётся доступным.
   * @returns {void} Один указательный click после drag/отмены не выполняет другое действие.
   */
  const click = event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  /** Отмена фокусом не принимает preview перемещения закладки. */
  const blur = () => end(false);

  /**
   * Отменяет жест и снимает прежние привязки перед закрытием, заменой исходника или PiP.
   * @returns {void} Освобождает marker, захват и слушатели; повторная очистка безопасна.
   */
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try {
      end(false);
    } finally {
      suppressClick = false;
      host.removeEventListener('pointerdown', start);
      host.removeEventListener('lostpointercapture', lost);
      owner.removeEventListener('pointerdown', newPress, true);
      owner.removeEventListener('pointermove', move);
      owner.removeEventListener('pointerup', release);
      owner.removeEventListener('pointercancel', cancel);
      owner.removeEventListener('click', click, true);
      view.removeEventListener('blur', blur);
      signal.removeEventListener('abort', dispose);
    }
  };
  host.addEventListener('pointerdown', start, { signal });
  host.addEventListener('lostpointercapture', lost, { signal });
  owner.addEventListener('pointerdown', newPress, { signal, capture: true });
  owner.addEventListener('pointermove', move, { signal, passive: false });
  owner.addEventListener('pointerup', release, { signal });
  owner.addEventListener('pointercancel', cancel, { signal });
  owner.addEventListener('click', click, { signal, capture: true });
  view.addEventListener('blur', blur, { signal });
  signal.addEventListener('abort', dispose, { once: true });
  return dispose;
}
