/** Управляет одной подсказкой на документ, включая события из Shadow DOM настроек. */
import interaction from './json/interaction.json' with { type: 'json' };
import { displayWindow, isElement, isHTMLElement } from './view-utils.mjs';

/**
 * Явный запрос одной подсказки, разрешённый также вне настольного наведения.
 * @typedef {object} TooltipRequest
 * @property {string} [message] Подготовленный текст; отсутствие использует data-tooltip либо aria-label значка.
 * @property {boolean} [pin] Закрепить подсказку до второго запроса той же цели или внешнего действия.
 * @property {number} [timeout] Миллисекунды до снятия показанной подсказки; отсутствие не ставит таймер снятия.
 */
/**
 * Настройки явного показа у элемента; текст передаётся отдельным аргументом showTooltip.
 * @typedef {object} TooltipOptions
 * @property {boolean} [pin] Закрепить показанную подсказку, сохранив прежнее aria-describedby цели.
 * @property {number} [timeout] Миллисекунды до снятия подсказки после её показа.
 */

/**
 * Создаёт одну подсказку и привязки в документе и его явно переданных ShadowRoot.
 * @param {Document} owner Документ, содержащий popup и источник его размеров.
 * @param {()=>boolean} [active] Разрешение показывать подсказку сейчас; блок может приостанавливать её при переносе.
 * @param {ReadonlyArray<ShadowRoot>} [shadowRoots] Открытые корни настроек в этом же документе.
 * @returns {()=>void} Снимает подсказку, обработчики и popup при завершении привязок владельца.
 */
export function createTooltips(owner, active = () => true, shadowRoots = []) {
  const view = displayWindow(owner);
  const events = new view.AbortController();
  const signal = events.signal;
  const desktop = view.matchMedia(interaction.tooltip.desktopMedia);
  const popup = owner.createElement('aside');
  popup.id = 'ui-tooltip';
  popup.className = 'ui-tooltip';
  popup.setAttribute('role', 'tooltip');
  popup.setAttribute('popover', 'manual');
  popup.hidden = true;
  owner.body.append(popup);
  /**
   * Элемент нынешней показанной или ожидающей подсказки; null после hide.
   * @type {HTMLElement|null}
   */
  let target = null;
  /**
   * Таймер задержки показа либо снятия текста в окне owner; hide отменяет его.
   */
  let timer = 0;
  /**
   * Прежнее aria-describedby нынешней цели; возвращается при снятии подсказки.
   */
  let description = '';
  /**
   * Нынешний текст закреплён явным запросом и не заменяется обычным наведением.
   */
  let pinned = false;

  /**
   * Снимает показ/ожидание, возвращает прежнее описание доступности цели и сбрасывает закрепление.
   * @returns {void} Закрытое окно может уже снять popover; этот отказ допускается.
   */
  function hide() {
    view.clearTimeout(timer);
    timer = 0;
    if (target) {
      if (description) target.setAttribute('aria-describedby', description);
      else target.removeAttribute('aria-describedby');
    }
    if (target?.hasAttribute('data-hint')) target.setAttribute('aria-expanded', 'false');
    target = null;
    pinned = false;
    if (!popup.hidden) {
      try {
        popup.hidePopover?.();
      } catch { /* Окно могло уже снять popover при закрытии. */ }
    }
    popup.hidden = true;
  }

  /**
   * Планирует наведение мышью независимо от ширины окна либо немедленный фокус/явный запрос.
   * @param {Event} event Событие с составным путём к HTML-цели подсказки.
   * @param {boolean} [immediate=false] Не ждать задержку наведения.
   * @param {TooltipRequest|null} [request] Явные текст и срок показа; null использует готовую подпись элемента при поддержке наведения.
   * @returns {void} Неподходящий узел или недоступные методы Element пропускаются без привязки к конструктору окна.
   */
  function offer(event, immediate = false, request = null) {
    if (!active() || (!request && ((!immediate && !desktop.matches) || pinned))) return;
    const item = event.composedPath().find((node) =>
      isHTMLElement(node) && typeof node.hasAttribute === 'function' && typeof node.matches === 'function'
      && (Boolean(request) || node.hasAttribute('data-tooltip')
        || node.matches('.icon-button[aria-label]'))
    );
    if (!isHTMLElement(item) || (!request && (item === target || item.querySelector('details[open]')))) return;
    if (request?.pin && pinned && item === target) {
      hide();
      return;
    }
    hide();
    // В модальном просмотре body снаружи диалога инертен; подсказка принадлежит тому же живому контексту.
    const dialog = event.composedPath().find(node =>
      isHTMLElement(node) && node.localName === 'dialog' && typeof node.hasAttribute === 'function'
      && node.hasAttribute('open')
    );
    const place = isHTMLElement(dialog) ? dialog : owner.body;
    if (popup.parentElement !== place) place.append(popup);
    target = item;
    pinned = Boolean(request?.pin);
    description = item.getAttribute('aria-describedby') || '';
    /**
     * Показывает текст лишь для прежней подключённой цели и размещает popup в границах окна.
     * @returns {void} После скрытия или замены цели отложенный показ ничего не меняет.
     */
    const show = () => {
      timer = 0;
      if (!active() || !item.isConnected || target !== item || (!request && !immediate && !desktop.matches)) return;
      popup.textContent = request?.message || item.dataset.tooltip || item.getAttribute('aria-label') || '';
      if (!popup.textContent) return;
      popup.hidden = false;
      popup.showPopover?.();
      const rect = item.getBoundingClientRect();
      const box = popup.getBoundingClientRect();
      const padding = interaction.tooltip.viewportPadding;
      popup.style.left = `${
        Math.max(padding, Math.min(view.innerWidth - box.width - padding, rect.left + (rect.width - box.width) / 2))
      }px`;
      const targetGap = interaction.tooltip.targetGap;
      const alternateGap = interaction.tooltip.alternateGap;
      popup.style.top = `${
        rect.bottom + box.height + alternateGap < view.innerHeight
          ? rect.bottom + targetGap
          : Math.max(padding, rect.top - box.height - targetGap)
      }px`;
      item.setAttribute('aria-describedby', `${description} ${popup.id}`.trim());
      if (item.hasAttribute('data-hint')) item.setAttribute('aria-expanded', 'true');
      if (request?.timeout) timer = view.setTimeout(hide, request.timeout);
    };
    if (immediate) show();
    else timer = view.setTimeout(show, interaction.tooltip.delay);
  }

  // Внутренние переходы relatedTarget не выходят из Shadow root.
  // Составное событие, дошедшее до Document, второй раз не обрабатываем.
  /**
   * Отделяет событие ShadowRoot от его повторного составного прохождения через Document.
   * @param {Event} event Событие на документе либо одном из переданных корней.
   * @returns {boolean} true, если этот обработчик должен предложить подсказку.
   */
  const owns = (event) =>
    event.currentTarget !== owner || !shadowRoots.some((root) => event.composedPath().includes(root));
  for (const root of [owner, ...shadowRoots]) {
    root.addEventListener('pointerover', (event) => {
      if (owns(event)) offer(event);
    }, { signal });
    root.addEventListener('pointerout', (event) => {
      const related = /** @type {PointerEvent} */ (event).relatedTarget;
      if (!owns(event) || pinned || !target || (isElement(related) && target.contains(related))) return;
      hide();
    }, { signal });
    root.addEventListener('focusin', (event) => {
      if (owns(event)) offer(event, true);
    }, { signal });
    root.addEventListener('focusout', (event) => {
      if (owns(event)) hide();
    }, { signal });
  }
  owner.addEventListener('pointerdown', (event) => {
    if (!pinned || !target || !event.composedPath().includes(target)) hide();
  }, { signal, capture: true });
  owner.addEventListener(
    'ui:tooltip',
    (event) => offer(event, true, /** @type {CustomEvent<TooltipRequest>} */ (event).detail),
    { signal },
  );
  owner.addEventListener('scroll', hide, { signal, capture: true });
  owner.addEventListener('keydown', hide, { signal });
  owner.addEventListener('close', hide, { signal, capture: true });
  view.addEventListener('resize', hide, { signal });
  return () => {
    hide();
    events.abort();
    popup.remove();
  };
}

/**
 * Просит нынешнего владельца документа показать текст у элемента, не создавая второго popup.
 * @param {HTMLElement} target Живой элемент, чьё окно и составной путь используются для запроса.
 * @param {string} message Готовый текст без разбора HTML.
 * @param {TooltipOptions} [options] Закрепление и срок снятия после показа.
 * @returns {void} Без createTooltips в этом документе событие не создаёт представления.
 */
export function showTooltip(target, message, options = {}) {
  target.dispatchEvent(
    new (displayWindow(target).CustomEvent)('ui:tooltip', {
      bubbles: true,
      composed: true,
      detail: { ...options, message },
    }),
  );
}
