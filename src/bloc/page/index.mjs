/** Размещает настройки, нижнюю панель и подсказки, сохраняя их состояние при переносе в PiP. */
import { enableSystemSymbols } from '../../common/ui/icons.mjs';
import { createMotion } from '../../common/ui/motion.mjs';
import { ui } from '../../common/ui/text.mjs';
import { createTooltips, showTooltip } from '../../common/ui/tooltips.mjs';
import { displayWindow, isCommandKey, isElement, isHTMLElement } from '../../common/ui/view-utils.mjs';

import { bindFooterAddress, fitAddress, showCopyFeedback } from '../../component/footer-address/index.mjs';
import { showFooterDisclosure } from '../../component/footer-disclosure/index.mjs';
import {
  bindKeyboardHelp,
  clearKeyboardHints,
  showKeyboardContext,
  showKeyboardDescriptions,
  showKeyboardHelp,
} from '../../component/keyboard-help/index.mjs';
import { bindWindowActions, showWindowLayout, showWindowPiP } from '../../component/window-actions/index.mjs';

/**
 * Узлы и владельцы страницы, которые остаются живыми при переносе в PiP.
 * @typedef {object} AppearanceOptions
 * @property {HTMLElement} terminal Рамка основного вида; содержит верхние действия и каталог.
 * @property {HTMLElement} footer Единственная нижняя панель, которую переносит DocumentPanel.
 * @property {import('../preferences/index.mjs').SitePreferences} preferences Владелец оформления и режима ссылок; перемещается тот же элемент.
 * @property {import('../document/index.mjs').DocumentPanel} panel Владелец просмотра, предоставляющий состояние открытости и действия размещения.
 */
/**
 * Постоянные контейнеры одного элемента настроек.
 * @typedef {object} SettingsPlaces
 * @property {HTMLElement} header Место настроек в исходной верхней панели.
 * @property {HTMLElement} footer Место настроек в переносимой нижней панели.
 */
/**
 * Таймер с явным окном, чтобы отменять его после переноса DOM.
 * @typedef {object} WindowTimer
 * @property {import('../../common/ui/view-utils.mjs').DisplayWindow} view Окно, выдавшее идентификатор.
 * @property {number} id Идентификатор timeout либо animation frame в этом окне.
 */
/**
 * Наблюдение нынешней ссылки; оба наблюдателя принадлежат одному bind.
 * @typedef {object} AddressObservers
 * @property {ResizeObserver} resize Следит за шириной доступной области ссылки.
 * @property {MutationObserver} href Следит за заменой фактического адреса назначения.
 */
/**
 * Живые действия и области нижней панели.
 * @typedef {object} PageButtons
 * @property {HTMLButtonElement} help Раскрывает подсказки клавиатуры.
 * @property {HTMLButtonElement} settings Раскрывает нижние настройки.
 * @property {HTMLElement} controls Группа кнопок, чьё смещение анимируется вместе с footer.
 * @property {HTMLElement} hints Список подсказок, скрываемый действием help.
 */
/**
 * Фокус единственных настроек при синхронном переносе footer.
 * @typedef {object} FooterMoveOptions
 * @property {boolean} [restoreFocus=true] Восстанавливать прежний фокус настроек после операции и при её отказе.
 */
const hintDetails = ui.appearance.hints;
const settingsOpenKey = 'site-footer-settings-expanded';
const helpOpenKey = 'site-keyboard-help-expanded';

/**
 * Читает явное сворачивание блока; отсутствие записи или недоступное хранилище оставляет блок раскрытым.
 * @param {string} key Ключ открытости конкретного блока.
 * @returns {boolean} false только для сохранённой строки false.
 */
function savedExpanded(key) {
  try {
    return localStorage.getItem(key) !== 'false';
  } catch {
    return true;
  }
}

/**
 * Сохраняет явную открытость блока; отказ браузерного хранилища не прерывает действие интерфейса.
 * @param {string} key Ключ открытости конкретного блока.
 * @param {boolean} expanded Выбор пользователя для последующих загрузок.
 * @returns {void}
 */
function saveExpanded(key, expanded) {
  try {
    localStorage.setItem(key, String(expanded));
  } catch {}
}

/** Размещает живые настройки и ведёт состояние рамки, нижней панели и подсказок страницы. */
export class PageAppearance {
  /**
   * Живые узлы и блоки, переданные приложением; PageAppearance их не пересоздаёт.
   * @type {AppearanceOptions}
   */
  #options;
  /**
   * Исходное окно терминала; остаётся источником оконного вида и событий координатора PiP.
   * @type {import('../../common/ui/view-utils.mjs').DisplayWindow}
   */
  #opener;
  /**
   * Сроки привязок по нынешним окнам терминала и footer; снимаются перед переносом и dispose.
   * @type {Map<import('../../common/ui/view-utils.mjs').DisplayWindow,AbortController>}
   */
  #events = new Map();
  /**
   * Эффекты нынешних привязок; null между снятием событий и следующим bind.
   * @type {ReturnType<typeof createMotion>|null}
   */
  #motion = null;
  /**
   * Действия снятия подсказок обоих документов; заменяются при переносе настроек.
   * @type {Array<()=>void>}
   */
  #tooltips = [];
  /**
   * Общий координатор переноса, подключённый приложением; null до его установки.
   * @type {import('../../app/picture-in-picture.mjs').PictureInPictureController|null}
   */
  #pip = null;
  /**
   * Ленивая форма доступа, которую нужно закрыть перед переносом footer; PAT ей не передаётся.
   * @type {import('../tokens/index.mjs').GithubTokens|null}
   */
  #tokenManager = null;
  /**
   * Ручной выбор рамки на время страницы; null оставляет исходный оконный вид, узкий экран всегда fill.
   * @type {import('../preferences/index.mjs').PageLayout|null}
   */
  #layoutChoice = null;
  /**
   * Пауза обработчиков в подготовленной операции переноса; снимается commit или rollback.
   */
  #moving = false;
  /**
   * Открытость нижних настроек; явный выбор сохраняется, вынужденное раскрытие действует только сейчас.
   */
  #settingsExpanded = true;
  /**
   * Открытость подсказок клавиатуры, восстановленная из отдельного ключа браузера.
   */
  #helpExpanded = true;
  /**
   * Постоянные места одного элемента настроек в верхней и нижней панелях.
   * @type {SettingsPlaces}
   */
  #settingsPlaces;
  /**
   * Номер копирования: смена номера при unbind запрещает позднему ответу менять подсказку.
   */
  #copyOperation = 0;
  /**
   * Таймер снятия результата копирования вместе с его окном; null, когда сообщение не запланировано.
   * @type {WindowTimer|null}
   */
  #copyTimer = null;
  /**
   * Наблюдение ширины и href нынешнего нижнего адреса; существует только при активных привязках.
   * @type {AddressObservers|null}
   */
  #addressObservers = null;
  /**
   * Один отложенный пересчёт подписи адреса в окне footer; отменяется перед переносом.
   * @type {WindowTimer|null}
   */
  #addressFrame = null;
  /**
   * Живые действия раскрытия, контейнер управления и список подсказок; сохраняются при переносе DOM.
   * @type {PageButtons}
   */
  #buttons;

  /**
   * Находит обязательные места настроек и связывает живой каркас с исходным окном.
   * @param {AppearanceOptions} options Узлы и владельцы уже загруженной страницы.
   * @throws {Error} Если обязательные узлы каркаса недоступны.
   */
  constructor(options) {
    this.#options = options;
    this.#opener = displayWindow(options.terminal);
    const layout = options.terminal.ownerDocument.documentElement.dataset.layout;
    this.#layoutChoice = layout === 'fill' || layout === 'window' ? layout : null;
    this.#settingsPlaces = {
      header: /** @type {HTMLElement} */ (options.terminal.querySelector('#header-settings')),
      footer: /** @type {HTMLElement} */ (options.footer.querySelector('#footer-settings')),
    };
    this.#buttons = {
      help: /** @type {HTMLButtonElement} */ (options.footer.querySelector('#help-toggle')),
      settings: /** @type {HTMLButtonElement} */ (options.footer.querySelector('#settings-toggle')),
      controls: /** @type {HTMLElement} */ (options.footer.querySelector('.footer-controls')),
      hints: /** @type {HTMLElement} */ (options.footer.querySelector('#keyboard-help')),
    };
    this.#settingsExpanded = savedExpanded(settingsOpenKey);
    this.#helpExpanded = savedExpanded(helpOpenKey);
    this.#syncHelp();
    this.#relocatePreferences();
    this.#bind();
  }

  /**
   * Подключает координатор PiP и обновляет зависящие от него действия без создания нового состояния страницы.
   * @param {import("../../app/picture-in-picture.mjs").PictureInPictureController} controller Общий координатор приложения.
   * @returns {void}
   */
  setPictureInPicture(controller) {
    this.#unbind();
    this.#pip = controller;
    this.#bind();
  }

  /**
   * Запоминает загруженную форму, чтобы закрывать её перед перемещением нижней панели.
   * @param {import("../tokens/index.mjs").GithubTokens} manager Форма, чьим доступом владеет GithubAccess.
   * @returns {void}
   */
  setTokenManager(manager) {
    this.#tokenManager = manager;
  }

  /**
   * Приостанавливает привязки перед переносом; сохраняет фокус для возобновления или отката.
   * @param {import('../../app/picture-in-picture.mjs').MoveFocusOptions} [options] Правила восстановления прежнего фокуса.
   * @returns {import("../../app/picture-in-picture.mjs").PreparedMove} Действия для одного синхронного переноса; commit снимает паузу.
   * @throws {Error} Если снять привязки и восстановить исходное состояние не удалось.
   */
  prepareMove({ restoreFocus = true, rollbackFocus = true } = {}) {
    this.#tokenManager?.close();
    if (!this.#tokenManager) {
      const dialog = this.#options.footer.querySelector('#token-dialog');
      if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
    }
    const docs = new Set([this.#options.terminal.ownerDocument, this.#options.footer.ownerDocument]);
    const focused = [...docs].map((owner) => owner.activeElement).find((node) =>
      isHTMLElement(node)
      && (this.#options.footer.contains(node) || Boolean(node.closest('.window-controls')))
    );
    if (this.#options.preferences.shadowRoot?.activeElement) this.#settingsExpanded = true;
    const resume = () => {
      this.#bind();
      if (restoreFocus && isHTMLElement(focused) && focused.isConnected) focused.focus({ preventScroll: true });
    };
    const restore = () => {
      this.#bind();
      if (rollbackFocus && isHTMLElement(focused) && focused.isConnected) focused.focus({ preventScroll: true });
    };
    this.#moving = true;
    try {
      this.#unbind();
    } catch (error) {
      try {
        restore();
      } finally {
        this.#moving = false;
      }
      throw error;
    }
    return {
      resume,
      rollback: () => {
        try {
          this.#unbind();
          restore();
        } finally {
          this.#moving = false;
        }
      },
      commit: () => {
        this.#moving = false;
      },
    };
  }

  /**
   * Снимает события, наблюдение, подсказки и эффекты; сами узлы и владельцы приложения остаются живыми.
   * @returns {void}
   */
  dispose() {
    this.#unbind();
  }

  /**
   * Согласует видимость приглушённых верхних действий с наведением на рамку.
   * @param {boolean} over Есть ли указатель над верхней панелью; footer всегда снимает этот признак.
   * @returns {void}
   */
  #setPointerOver(over) {
    this.#options.terminal.ownerDocument.documentElement.dataset.headerPointerOver = String(over);
    this.#options.terminal.querySelector('.titlebar')?.toggleAttribute('data-pointer-over', over);
    this.#options.preferences.toggleAttribute(
      'data-pointer-over',
      over && this.#options.preferences.dataset.placement === 'header',
    );
  }

  /**
   * Переставляет единственный элемент настроек в место, соответствующее нынешнему окну и ширине.
   * @returns {void} Узлы настроек сохраняются, затем пересчитывается нижнее раскрытие.
   */
  placePreferences() {
    const { preferences, footer } = this.#options;
    const destination = this.#preferencesDestination();
    const placement = destination === this.#settingsPlaces.footer ? 'footer' : 'header';
    if (preferences.parentElement !== destination) {
      if (placement === 'header') destination.append(preferences);
      else destination.prepend(preferences);
    }
    preferences.dataset.placement = footer.dataset.settingsPlacement = placement;
    this.#reflectNavigation();
    if (placement === 'footer') this.#setPointerOver(false);
    this.#updateSettings();
  }

  /**
   * Снимает привязки настроек вокруг синхронного переноса footer и восстанавливает их в конечном документе.
   * @param {()=>void} operation Синхронное перемещение узлов, выполняемое между pause и resume.
   * @param {FooterMoveOptions} [options] Правило восстановления прежнего фокуса настроек.
   * @returns {void}
   * @throws {Error} Исходный отказ операции; AggregateError также содержит отказ восстановления.
   */
  withFooterMove(operation, { restoreFocus = true } = {}) {
    if (this.#moving) {
      operation();
      return;
    }
    const { preferences } = this.#options;
    const source = preferences.ownerDocument;
    const focused = source.hasFocus() && Boolean(preferences.shadowRoot?.activeElement);
    if (focused && this.#preferencesDestination() === this.#settingsPlaces.footer) this.#settingsExpanded = true;
    const move = preferences.prepareMove({
      restoreFocus: restoreFocus && focused,
      rollbackFocus: restoreFocus && focused,
    });
    try {
      operation();
      this.placePreferences();
      move.resume();
      move.commit();
    } catch (error) {
      try {
        this.placePreferences();
        move.rollback();
      } catch (failure) {
        throw new AggregateError([error, failure], 'Could not restore settings');
      }
      throw error;
    } finally {
      if (source !== preferences.ownerDocument && this.#events.size) this.#refreshTooltips();
    }
  }

  /**
   * Выбирает нижнее место для узкого окна или PiP по фактическим документам узлов, до фиксации режима.
   * @returns {HTMLElement} Один из двух постоянных контейнеров настроек.
   */
  #preferencesDestination() {
    const lower = [this.#options.terminal, this.#options.footer].some((node) =>
      Boolean(node.ownerDocument.documentElement.dataset.pipMode)
      || displayWindow(node).matchMedia('(max-width: 760px)').matches
    );
    return lower ? this.#settingsPlaces.footer : this.#settingsPlaces.header;
  }

  /**
   * Согласует место настроек с шириной окна; при реальном перемещении сохраняет их привязки.
   * @returns {void}
   */
  #relocatePreferences() {
    if (this.#options.preferences.parentElement === this.#preferencesDestination()) this.placePreferences();
    else this.withFooterMove(() => {});
  }

  /**
   * Обновляет доступность нижнего раскрытия и планирует пересчёт адреса после изменения footer.
   * @returns {void}
   */
  #updateSettings() {
    const lower = this.#options.preferences.parentElement === this.#settingsPlaces.footer;
    showFooterDisclosure({
      footer: this.#options.footer,
      region: this.#settingsPlaces.footer,
      toggle: this.#buttons.settings,
    }, {
      available: lower,
      expanded: this.#settingsExpanded,
      label: this.#settingsExpanded ? ui.appearance.collapseBottomBar : ui.appearance.expandBottomBar,
    });
    this.#scheduleAddress();
  }

  /**
   * Меняет открытость нижних настроек; вынужденное раскрытие для фокуса не сохраняет выбор пользователя.
   * @param {boolean} expanded Требуемая открытость нижнего блока.
   * @param {boolean} [explicit] Сохранять ли этот выбор в браузере; по умолчанию да.
   * @returns {void} В верхнем размещении и при прежнем состоянии ничего не меняет.
   */
  #showSettings(expanded, explicit = true) {
    if (
      this.#options.preferences.parentElement !== this.#settingsPlaces.footer || this.#settingsExpanded === expanded
    ) return;
    const { footer, preferences } = this.#options;
    const height = footer.getBoundingClientRect().height;
    const focused = preferences.ownerDocument.hasFocus() && Boolean(preferences.shadowRoot?.activeElement);
    this.#motion?.cancel(footer);
    this.#settingsExpanded = expanded;
    if (explicit) saveExpanded(settingsOpenKey, expanded);
    this.#updateSettings();
    this.#fitAddress();
    if (!expanded && focused) this.#buttons.settings.focus({ preventScroll: true });
    this.#motion?.play(footer, [{ height: `${height}px` }, { height: `${footer.getBoundingClientRect().height}px` }]);
  }

  /**
   * Заменяет подсказки в нынешних документах и ShadowRoot настроек; прежние обработчики снимаются.
   * @returns {void}
   */
  #refreshTooltips() {
    this.#tooltips.forEach((dispose) => dispose());
    this.#tooltips = [];
    const { terminal, footer, preferences } = this.#options;
    for (const owner of new Set([terminal.ownerDocument, footer.ownerDocument])) {
      const shadow = preferences.shadowRoot;
      this.#tooltips.push(createTooltips(owner, () => !this.#moving, shadow?.ownerDocument === owner ? [shadow] : []));
    }
  }

  /**
   * Привязывает управление к окнам, которым сейчас принадлежат terminal и footer; повторная привязка ничего не создаёт.
   * @returns {void} Слушатели действуют до unbind или dispose.
   */
  #bind() {
    if (this.#events.size) return;
    const { terminal, footer, panel } = this.#options;
    this.#motion = createMotion(displayWindow(terminal));
    const documents = new Set([terminal.ownerDocument, footer.ownerDocument]);
    /**
     * Возвращает общий срок событий одного нынешнего окна, создавая его один раз для bind.
     * @param {import("../../common/ui/view-utils.mjs").DisplayWindow} view Окно владельца элемента.
     * @returns {AbortSignal} Сигнал, который будет отменён в unbind.
     */
    const signal = (view) => {
      let controller = this.#events.get(view);
      if (!controller) {
        controller = new view.AbortController();
        this.#events.set(view, controller);
      }
      return controller.signal;
    };
    /**
     * Привязывает действие узла к сроку его окна и подавляет его во время переноса.
     * @param {HTMLElement} node Живой элемент нынешнего размещения.
     * @param {string} type Имя события DOM.
     * @param {EventListener} listener Действие, допустимое только вне паузы переноса.
     * @returns {void}
     */
    const on = (node, type, listener) =>
      node.addEventListener(type, (event) => {
        if (!this.#moving) listener(event);
      }, { signal: signal(displayWindow(node)) });
    on(this.#buttons.help, 'click', () => this.#toggleHelp());
    on(this.#buttons.settings, 'click', () => this.#showSettings(!this.#settingsExpanded));
    on(this.#options.preferences, 'settings-reveal', () => this.#showSettings(true, false));
    on(this.#options.preferences, 'font-size-change', () => this.#scheduleAddress());
    bindKeyboardHelp(footer, event => this.#explainHint(event), on);
    const titlebar = terminal.querySelector('.titlebar');
    if (isHTMLElement(titlebar)) {
      on(titlebar, 'pointerenter', () => this.#setPointerOver(true));
      on(titlebar, 'pointerleave', () => this.#setPointerOver(false));
      on(titlebar, 'focusin', () => this.#reflectHeaderFocus());
      on(titlebar, 'focusout', () => {
        terminal.ownerDocument.documentElement.dataset.headerFocusVisible = 'false';
      });
    }
    showKeyboardDescriptions(footer, hintDetails);
    bindWindowActions(terminal, {
      onFill: () => {
        if (!this.#compact()) this.#setLayout(this.#layout() === 'fill' ? 'window' : 'fill');
      },
      onClose: () => {
        if (this.#compact()) return;
        if (this.#pip) this.#pip.closeOrBack();
        else if (panel.isOpen) panel.close();
      },
      onPiP: () => {
        if (!this.#compact()) void this.#pip?.open('main');
      },
    }, on);
    bindFooterAddress(footer, () => {
      void this.#copyUrl();
    }, on);
    for (const node of [terminal.querySelector('.window-controls'), footer]) {
      if (!isHTMLElement(node)) continue;
      on(node, 'mousedown', (event) => {
        const pointer = /** @type {MouseEvent} */ (event);
        if (pointer.button === 0 && isElement(pointer.target) && pointer.target.closest('button')) {
          pointer.preventDefault();
        }
      });
    }
    for (const event of ['view-open', 'view-close']) {
      on(panel, event, () => {
        this.#finishFooter();
        this.#infoHint(event === 'view-open');
      });
    }
    on(panel, 'view-visibility', () => this.#reflectNavigation());
    // Слушатели ставятся в оба документа после переноса, поскольку события PiP не доходят до исходного окна.
    for (const owner of documents) {
      const view = displayWindow(owner);
      /**
       * Отражает фактический фокус каждого окна и видимый клавиатурный фокус верхних действий.
       * @returns {void}
       */
      const windowFocus = () => {
        owner.documentElement.dataset.windowActive = String(owner.hasFocus());
        this.#reflectHeaderFocus();
      };
      windowFocus();
      view.addEventListener('focus', windowFocus, { signal: signal(view) });
      view.addEventListener('blur', windowFocus, { signal: signal(view) });
      view.addEventListener('resize', () => {
        if (this.#moving) return;
        this.#motion?.finishAll();
        panel.refreshPlacement();
        this.#relocatePreferences();
        this.#updateLayoutButton();
      }, { signal: signal(view) });
      owner.addEventListener('keydown', (event) => {
        if (this.#moving || !isCommandKey(event, 'KeyP') || !this.#pip?.supported) return;
        event.preventDefault();
        void this.#pip.open(panel.isOpen ? 'docs' : 'main');
      }, { signal: signal(view) });
      void enableSystemSymbols(owner);
    }
    this.#refreshTooltips();
    this.#pip?.addEventListener('change', () => {
      if (!this.#moving) {
        this.#updatePiP();
        this.#infoHint(panel.isOpen);
      }
    }, { signal: signal(this.#opener) });
    this.#syncAppearance();
    this.#infoHint(panel.isOpen);
    this.#reflectHeaderFocus();
    this.#updatePiP();
    const link = footer.querySelector('#github-link');
    if (link) {
      const view = displayWindow(footer);
      const binding = this.#events.get(view);
      /**
       * Планирует измерение адреса только для всё ещё действующей привязки его окна.
       * @returns {void}
       */
      const changed = () => {
        if (this.#events.get(view) === binding) this.#scheduleAddress();
      };
      const resize = new view.ResizeObserver(changed);
      const href = new view.MutationObserver(changed);
      this.#addressObservers = { resize, href };
      resize.observe(link);
      href.observe(link, { attributes: true, attributeFilter: ['href'] });
      this.#scheduleAddress();
    }
  }

  /**
   * Снимает привязки и делает позднее копирование недействительным перед переносом или завершением.
   * @returns {void} Эффекты завершаются, таймеры и наблюдение отменяются.
   */
  #unbind() {
    this.#setPointerOver(false);
    this.#addressObservers?.resize.disconnect();
    this.#addressObservers?.href.disconnect();
    this.#addressObservers = null;
    if (this.#addressFrame) this.#addressFrame.view.cancelAnimationFrame(this.#addressFrame.id);
    this.#addressFrame = null;
    this.#motion?.finishAll();
    for (const [view, controller] of this.#events) {
      controller.abort();
      delete view.document.documentElement.dataset.preferencesPlacement;
      delete view.document.documentElement.dataset.informationOpen;
      delete view.document.documentElement.dataset.headerPointerOver;
      delete view.document.documentElement.dataset.headerFocusVisible;
    }
    this.#events.clear();
    this.#tooltips.forEach((dispose) => dispose());
    this.#tooltips = [];
    this.#motion?.dispose();
    this.#motion = null;
    this.#copyOperation++;
    if (this.#copyTimer) this.#copyTimer.view.clearTimeout(this.#copyTimer.id);
    this.#copyTimer = null;
  }

  /**
   * Применяет ручной выбор рамки в исходном и нынешнем документах и обновляет оконную кнопку.
   * @returns {void}
   */
  #syncAppearance() {
    for (const owner of new Set([this.#opener.document, this.#options.terminal.ownerDocument])) {
      if (this.#layoutChoice) owner.documentElement.dataset.layout = this.#layoutChoice;
      else delete owner.documentElement.dataset.layout;
    }
    this.#updateLayoutButton();
  }

  /**
   * Переключает и сохраняет открытость подсказок, согласуя высоту footer и подпись адреса.
   * @returns {void}
   */
  #toggleHelp() {
    const { footer } = this.#options;
    const { controls } = this.#buttons;
    const expanded = !this.#helpExpanded;
    const height = footer.getBoundingClientRect().height;
    const before = controls.getBoundingClientRect();
    this.#motion?.cancel(footer);
    this.#motion?.cancel(controls);
    this.#helpExpanded = expanded;
    saveExpanded(helpOpenKey, expanded);
    this.#syncHelp();
    this.#fitAddress();
    if (!expanded) this.#clearHint();
    const after = controls.getBoundingClientRect();
    this.#motion?.play(footer, [{ height: `${height}px` }, { height: `${footer.getBoundingClientRect().height}px` }]);
    this.#motion?.play(controls, [{ transform: `translate(${before.x - after.x}px, ${before.y - after.y}px)` }, {
      transform: 'translate(0, 0)',
    }]);
  }

  /**
   * Передаёт представлению нынешнюю открытость подсказок и подпись действия раскрытия.
   * @returns {void}
   */
  #syncHelp() {
    const { help, hints } = this.#buttons;
    showKeyboardHelp({ footer: this.#options.footer, hints, toggle: help }, {
      expanded: this.#helpExpanded,
      label: this.#helpExpanded ? ui.appearance.hideKeyboardHelp : ui.appearance.showKeyboardHelp,
    });
  }

  /**
   * Объединяет запросы измерения адреса в один кадр нынешнего окна footer.
   * @returns {void} После unbind отложенное измерение не выполняется.
   */
  #scheduleAddress() {
    if (this.#addressFrame) return;
    const view = displayWindow(this.#options.footer);
    this.#addressFrame = {
      view,
      id: view.requestAnimationFrame(() => {
        this.#addressFrame = null;
        if (!this.#moving && this.#events.has(view)) this.#fitAddress();
      }),
    };
  }

  /**
   * Умещает адрес в нижней панели; сокращение разрешено только при свёрнутых настольных подсказках.
   * @returns {void} Отсутствие ссылки оставляет footer без изменения.
   */
  #fitAddress() {
    const { footer } = this.#options;
    const link = /** @type {HTMLAnchorElement|null} */ (footer.querySelector('#github-link'));
    if (link) {
      fitAddress(link, {
        shorten: footer.dataset.settingsPlacement === 'header' && footer.classList.contains('help-collapsed'),
      });
    }
  }

  /**
   * Выбирает эффективную рамку с учётом компактного размещения.
   * @returns {import("../preferences/index.mjs").PageLayout} fill для узкого окна/PiP, иначе ручной выбор либо window.
   */
  #layout() {
    return this.#compact() ? 'fill' : this.#layoutChoice || 'window';
  }

  /**
   * Проверяет, требуется ли компактное управление в нынешнем документе терминала.
   * @returns {boolean} true для любого PiP либо ширины не более 760 px.
   */
  #compact() {
    return Boolean(this.#options.terminal.ownerDocument.documentElement.dataset.pipMode)
      || displayWindow(this.#options.terminal).matchMedia('(max-width: 760px)').matches;
  }

  /**
   * Меняет ручной размер рамки после завершения движения footer и анимирует прежние/новые размеры.
   * @param {import("../preferences/index.mjs").PageLayout} value Ручной выбор fill или window для текущей страницы.
   * @returns {void}
   */
  #setLayout(value) {
    const { terminal } = this.#options;
    const body = terminal.ownerDocument.body;
    const view = displayWindow(terminal);
    this.#finishFooter();
    const padding = view.getComputedStyle(body).padding;
    const before = frameStyle(terminal);
    this.#motion?.cancel('layout');
    this.#motion?.cancel(terminal);
    this.#layoutChoice = value;
    this.#syncAppearance();
    const target = frameStyle(terminal);
    this.#motion?.play(body, [{ padding }, { padding: view.getComputedStyle(body).padding }], { key: 'layout' });
    this.#motion?.play(terminal, [before, target]);
  }

  /**
   * Показывает действие перехода к противоположному эффективному размеру рамки.
   * @returns {void}
   */
  #updateLayoutButton() {
    const fill = this.#layout() === 'fill';
    showWindowLayout(this.#options.terminal, {
      label: fill ? ui.appearance.useWindowedView : ui.appearance.fillViewport,
      layout: fill ? 'fill' : 'window',
    });
  }

  /**
   * Передаёт оконной кнопке поддержку PiP, ожидание запроса и последний отказ координатора.
   * @returns {void}
   */
  #updatePiP() {
    showWindowPiP(this.#options.terminal, {
      disabled: !this.#pip?.supported || Boolean(this.#pip?.pending),
      supported: Boolean(this.#pip?.supported),
      description: !this.#pip?.supported
        ? ui.appearance.pipUnavailable
        : this.#pip.pending
        ? ui.appearance.pipOpening
        : ui.appearance.pipOpen,
      error: this.#pip?.error || '',
    });
  }

  /**
   * Подбирает подписи открытия информации и закрытия по текущему просмотру и размещению PiP.
   * @param {boolean} open Открыта ли панель информации сейчас.
   * @returns {void}
   */
  #infoHint(open) {
    this.#reflectNavigation();
    const browsing = this.#pip?.mode === 'docs';
    showKeyboardContext(this.#options.footer, {
      closeVisible: open,
      closeHint: browsing ? ui.appearance.closeBrowsing : hintDetails.close,
      closeLabel: browsing ? ui.appearance.browseFiles : ui.appearance.closeInfo,
      contextHint: open ? ui.appearance.contextOpen : hintDetails.context,
      contextLabel: open ? ui.appearance.holdForPip : ui.appearance.infoHoldForPip,
    });
  }

  /**
   * Отражает уже принятые размещение настроек и открытость панели для CSS каждого нынешнего документа.
   * @returns {void} html[data-*] скрывает нижние дубли лишь при доступной группе информации в том же окне; собственного состояния просмотра здесь нет.
   */
  #reflectNavigation() {
    const { terminal, footer, preferences, panel } = this.#options;
    for (
      const owner of new Set([
        terminal.ownerDocument,
        footer.ownerDocument,
        preferences.ownerDocument,
        panel.ownerDocument,
      ])
    ) {
      owner.documentElement.dataset.preferencesPlacement = preferences.ownerDocument === owner
        ? preferences.dataset.placement || 'header'
        : 'header';
      owner.documentElement.dataset.informationOpen = String(panel.ownerDocument === owner && panel.isOpen);
    }
  }

  /**
   * Отражает только видимый клавиатурный фокус верхней панели, не оставляя команды раскрытыми после указательного focus.
   * @returns {void} Проверяет активный узел нынешнего документа либо ShadowRoot настроек; другому окну и нижнему размещению не присваивает верхний фокус.
   */
  #reflectHeaderFocus() {
    const { terminal, preferences } = this.#options;
    const owner = terminal.ownerDocument;
    const header = terminal.querySelector('.titlebar');
    const inSettings = preferences.dataset.placement === 'header' && preferences.ownerDocument === owner;
    const active = inSettings && preferences.shadowRoot?.activeElement || owner.activeElement;
    owner.documentElement.dataset.headerFocusVisible = String(
      Boolean(
        owner.hasFocus() && isElement(active) && typeof active.matches === 'function'
          && active.matches(':focus-visible')
          && (header?.contains(active) || inSettings && preferences.shadowRoot?.contains(active)),
      ),
    );
  }

  /**
   * Снимает закреплённые описания клавиатуры с прежних кнопок footer.
   * @returns {void}
   */
  #clearHint() {
    clearKeyboardHints(this.#options.footer);
  }

  /**
   * Закрепляет описание выбранной подсказки; неизвестная кнопка или ключ словаря игнорируется.
   * @param {Event} event Нажатие на кнопку подсказок нижней панели.
   * @returns {void}
   */
  #explainHint(event) {
    const button = isElement(event.target) ? event.target.closest('button[data-hint]') : null;
    const key = button?.getAttribute('data-hint');
    if (!isHTMLElement(button) || !key || !Object.hasOwn(hintDetails, key)) return;
    showTooltip(button, button.dataset.tooltip || hintDetails[/** @type {keyof typeof hintDetails} */ (key)], {
      pin: true,
    });
  }

  /**
   * Копирует фактический href нынешнего нижнего адреса; поздний ответ после переноса не меняет интерфейс.
   * @returns {Promise<void>} Отказ clipboard становится кратким сообщением в footer, без выбрасывания ошибки.
   */
  async #copyUrl() {
    const operation = ++this.#copyOperation;
    const { footer } = this.#options;
    const link = /** @type {HTMLAnchorElement|null} */ (footer.querySelector('#github-link'));
    const feedback = footer.querySelector('#copy-status');
    if (!link || !isHTMLElement(feedback)) return;
    const view = displayWindow(footer);
    /**
     * Готовый результат нынешнего копирования; применяется только после проверки номера операции.
     * @type {string}
     */
    let message;
    try {
      await view.navigator.clipboard.writeText(link.href);
      message = ui.appearance.copied;
    } catch {
      message = ui.appearance.copyFailed;
    }
    if (operation !== this.#copyOperation || this.#moving) return;
    showCopyFeedback(feedback, message);
    const button = footer.querySelector('#github-copy');
    if (isHTMLElement(button)) showTooltip(button, message, { timeout: 2400 });
    if (this.#copyTimer) this.#copyTimer.view.clearTimeout(this.#copyTimer.id);
    this.#copyTimer = {
      view,
      id: view.setTimeout(() => {
        showCopyFeedback(feedback, '');
        this.#copyTimer = null;
      }, 2400),
    };
  }

  /**
   * Завершает движение footer и отменяет смещение его кнопок перед следующим действием.
   * @returns {void}
   */
  #finishFooter() {
    this.#motion?.finish(this.#options.footer);
    this.#motion?.cancel(this.#buttons.controls);
  }
}

/**
 * Снимает измеряемые свойства рамки для перехода между двумя её размерами.
 * @param {HTMLElement} terminal Живая рамка в документе, которому она сейчас принадлежит.
 * @returns {Keyframe} Ширина, скругление, граница и тень до или после смены размещения.
 */
function frameStyle(terminal) {
  const style = displayWindow(terminal).getComputedStyle(terminal);
  return {
    width: `${terminal.getBoundingClientRect().width}px`,
    borderRadius: style.borderRadius,
    borderWidth: style.borderWidth,
    boxShadow: style.boxShadow,
  };
}
