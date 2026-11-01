/** Координирует перенос прежних узлов между страницей и одним окном Document PiP. */
import { ui } from '../common/ui/text.mjs';

/**
 * Часть живого интерфейса, переносимая в единственное окно PiP.
 * @typedef {'main'|'docs'} PictureInPictureMode
 */
/**
 * Окно с собственными конструкторами DOM; узлы после переноса используют именно его.
 * @typedef {Window & typeof globalThis} DisplayWindow
 */
/**
 * Подготовка владельца для одного синхронного переноса его прежних узлов.
 * @typedef {object} PreparedMove
 * @property {()=>void} resume Связывает владельца с уже перемещёнными узлами, сохраняя паузу до commit.
 * @property {()=>void} rollback Возвращает привязки и состояние после отказа операции.
 * @property {()=>void} commit Принимает размещение и снимает паузу обработчиков.
 */
/**
 * Разрешение восстановить прежний фокус при переносе и при отказе.
 * @typedef {object} MoveFocusOptions
 * @property {boolean} [restoreFocus=true] Возвращать принадлежащий владельцу фокус после переноса.
 * @property {boolean} [rollbackFocus=true] Возвращать прежний фокус при восстановлении исходного размещения.
 */
/**
 * Узлы, к которым DocumentPanel перепривязывается при смене основного и отдельного просмотра.
 * @typedef {object} PanelPlacement
 * @property {HTMLElement} workspace Область размещения панели.
 * @property {HTMLElement} eventRoot Корень событий её нынешнего размещения.
 * @property {HTMLElement} footerHome Место нижней панели при закрытом просмотре.
 * @property {boolean} standalone Панель занимает отдельный документ PiP.
 */
/**
 * Начальная область PiP в CSS-пикселях; браузер выбирает окончательные размеры.
 * @typedef {object} PiPWindowSize
 * @property {number} [width] Желаемая ширина перенесённой области.
 * @property {number} [height] Желаемая высота перенесённой области.
 */
/**
 * Поддерживаемая часть Document Picture-in-Picture API исходного окна.
 * @typedef {object} DocumentPictureInPictureAPI
 * @property {(options?:PiPWindowSize)=>Promise<Window>} requestWindow Запрашивает окно из действия человека; отказ браузера отклоняет обещание.
 */
/**
 * Прежние узлы и их владельцы, переданные приложением одному координатору PiP.
 * @typedef {object} PictureInPictureOptions
 * @property {DisplayWindow} opener Исходное окно, которое запрашивает и закрывает PiP.
 * @property {HTMLElement} terminal Рамка, переносимая в режиме main.
 * @property {HTMLElement} workspace Исходная область панели внутри терминала.
 * @property {HTMLElement} footer Единственная нижняя панель, переносимая вместе с просмотром.
 * @property {import('../bloc/catalog/index.mjs').ProjectCatalog} catalog Владелец данных и выбора дерева; сохраняет их при переносе.
 * @property {import('../bloc/document/index.mjs').DocumentPanel} panel Владелец живого просмотра, переносимого в режиме docs.
 * @property {import('../bloc/preferences/index.mjs').SitePreferences} preferences Единые настройки обоих документов.
 * @property {import('../bloc/page/index.mjs').PageAppearance} appearance Владелец размещения настроек и нижних действий.
 * @property {boolean} [historyBackEnabled=false] Разрешает браузерный back лишь после закрытия PiP и информации.
 */
/**
 * Комментарии-якоря, сохраняющие точные места прежних узлов для возврата или отката.
 * @typedef {object} Places
 * @property {Comment} terminal Место рамки терминала.
 * @property {Comment} panel Место панели просмотра.
 * @property {Comment} footer Место нижней панели.
 */

/**
 * Единственный сеанс живого PiP. Состояние дерева и просмотра остаётся у блоков.
 * @fires PictureInPictureController#change
 */
export class PictureInPictureController extends EventTarget {
  /**
   * Живые узлы и владельцы приложения на срок координатора; их данные остаются у блоков.
   * @type {PictureInPictureOptions}
   */
  #options;
  /**
   * Постоянные исходные места terminal, panel и footer; удаляются только после dispose.
   * @type {Places}
   */
  #home;
  /**
   * Единственное открытое либо подготавливаемое окно PiP; null после возврата или отказа.
   * @type {DisplayWindow | null}
   */
  #window = null;
  /**
   * Оболочка отдельного просмотра в нынешнем PiP; создаётся с CSS до перемещения панели.
   * @type {HTMLElement | null}
   */
  #docsHost = null;
  /**
   * Последнее принятое размещение узлов; null означает исходную страницу.
   * @type {PictureInPictureMode | null}
   */
  #mode = null;
  /**
   * Запрошенное размещение до завершения requestWindow; нужно для закрытия панели во время ожидания.
   * @type {PictureInPictureMode | null}
   */
  #openingMode = null;
  /**
   * Срок ожидания окна и его стилей; abort не отменяет браузерный requestWindow, позднее окно закрывается отдельно.
   * @type {AbortController | null}
   */
  #request = null;
  /**
   * Срок связей координатора с исходным окном и панелью; заканчивается при dispose.
   * @type {AbortController}
   */
  #events;
  /**
   * Поколение запроса окна: close или новый open делает прежний асинхронный ответ недействительным.
   */
  #generation = 0;
  /**
   * Синхронный участок переноса; close в этот период откладывает возврат.
   */
  #moving = false;
  /**
   * Отложенное закрытие после окончания переноса либо закрытия просмотренной панели.
   */
  #returnRequested = false;
  /**
   * Координатор завершён; новые запросы и уведомления больше не разрешены.
   */
  #disposed = false;
  /**
   * Последняя видимая ошибка запроса или восстановления; очищается перед новым open.
   */
  #error = '';

  /**
   * Запоминает исходные места живых узлов и связывает закрытие PiP с исходной страницей и просмотром.
   * @param {PictureInPictureOptions} options Единственные владельцы и узлы приложения.
   * @throws {Error} Если обязательный узел не имеет исходного места для возврата.
   */
  constructor(options) {
    super();
    this.#options = options;
    this.#home = this.#markPlaces('pip-home');
    this.#events = new options.opener.AbortController();
    options.panel.addEventListener('view-close', () => {
      if (!this.#moving && (this.#mode === 'docs' || this.#openingMode === 'docs')) this.close();
    }, { signal: this.#events.signal });
    options.opener.addEventListener('pagehide', () => this.close(), { signal: this.#events.signal });
  }

  /**
   * Проверяет наличие пригодного API в исходном окне, не запрашивая PiP.
   * @returns {boolean} true, если requestWindow является функцией.
   */
  get supported() {
    return Boolean(this.#api());
  }
  /**
   * Возвращает принятое размещение, а не ещё ожидаемый режим запроса.
   * @returns {PictureInPictureMode|null} main или docs после переноса; null на исходной странице.
   */
  get mode() {
    return this.#mode;
  }
  /**
   * Показывает, что окно запрашивается либо узлы сейчас синхронно перемещаются.
   * @returns {boolean} true запрещает параллельный open.
   */
  get pending() {
    return this.#request !== null || this.#moving;
  }
  /**
   * Возвращает последний отказ для оконных действий страницы.
   * @returns {string} Видимое сообщение либо пустая строка после успешного начала запроса.
   */
  get error() {
    return this.#error;
  }

  /**
   * Находит только поддержанную поверхность PiP исходного окна.
   * @returns {DocumentPictureInPictureAPI|undefined} API с requestWindow; undefined при отсутствии поддержки.
   */
  #api() {
    const owner =
      /** @type {DisplayWindow & {documentPictureInPicture?: DocumentPictureInPictureAPI}} */ (this.#options.opener);
    const api = owner.documentPictureInPicture;
    return typeof api?.requestWindow === 'function' ? api : undefined;
  }

  /**
   * Запрашивает окно до первого await; существующее окно переиспользуется для смены режима.
   * @param {PictureInPictureMode} mode main переносит терминал, docs — открытую панель и footer.
   * @returns {Promise<boolean>} true после принятого переноса; отказ, отмена или закрытая панель дают false и при необходимости error.
   */
  async open(mode) {
    if (this.#disposed || this.pending || (mode === 'docs' && !this.#options.panel.isOpen)) return false;
    this.#error = '';
    if (this.#window && !this.#window.closed) {
      try {
        this.#transfer(mode);
        this.#changed();
        return true;
      } catch (error) {
        this.#error = error instanceof AggregateError
          ? ui.pip.returnControlsFailed
          : ui.pip.moveFailed;
        this.#changed();
        return false;
      }
    }
    if (this.#window) {
      this.close();
      if (this.#window || this.#mode) return false;
      this.#error = '';
    }
    const api = this.#api();
    if (!api) {
      this.#error = ui.pip.unavailable;
      this.#changed();
      return false;
    }
    const generation = ++this.#generation;
    this.#openingMode = mode;
    const request = new this.#options.opener.AbortController();
    this.#request = request;
    const signal = request.signal;
    this.#changed();
    /**
     * Окно, полученное этой попыткой; при отказе закрывается даже до принятия window координатора.
     * @type {DisplayWindow | null}
     */
    let opened = null;
    try {
      const area = (mode === 'main' ? this.#options.terminal : this.#options.panel).getBoundingClientRect();
      const pendingWindow = api.requestWindow({
        width: Math.max(320, Math.round(area.width) || 640),
        height: Math.max(240, Math.round(area.height) || 480),
      });
      pendingWindow.then((late) => {
        // Если запрос окна ответил уже после отмены или смены поколения, это окно больше никому не принадлежит.
        if ((signal.aborted || generation !== this.#generation) && !late.closed) late.close();
      }, () => {});
      let timer = 0;
      try {
        /**
         * Срок ответа requestWindow: через 30 секунд прерывает ожидание, но позднее окно всё равно закрывается отдельно.
         * @type {Promise<never>}
         */
        const deadline = new Promise((_, reject) => {
          timer = this.#options.opener.setTimeout(
            () => reject(new Error('Picture-in-Picture did not respond.')),
            30_000,
          );
        });
        opened = /** @type {DisplayWindow} */ (await Promise.race([
          pendingWindow,
          deadline,
        ]));
      } finally {
        this.#options.opener.clearTimeout(timer);
      }
      if (generation !== this.#generation || this.#disposed) {
        if (!opened.closed) opened.close();
        return false;
      }
      if (opened.closed) {
        request.abort();
        return false;
      }
      this.#window = opened;
      const current = opened;
      current.addEventListener('pagehide', () => {
        if (this.#window === current) this.close();
      }, { once: true });
      await this.#prepareWindow(current, signal);
      if (generation !== this.#generation) return false;
      if (current.closed || this.#disposed) {
        this.close();
        return false;
      }
      if (mode === 'docs' && !this.#options.panel.isOpen) {
        this.close();
        return false;
      }
      this.#options.preferences.setThemeDocuments([this.#options.opener.document, current.document]);
      this.#transfer(mode);
      return true;
    } catch (error) {
      if (generation !== this.#generation) return false;
      request.abort();
      this.#window = null;
      this.#docsHost = null;
      this.#options.preferences.setThemeDocuments([this.#options.opener.document]);
      if (opened && !opened.closed) opened.close();
      this.#error = error instanceof AggregateError
        ? ui.pip.restoredPartially
        : ui.pip.openFailed;
      return false;
    } finally {
      // requestWindow не отменяется abort: до его ответа повторный Close остаётся действием PiP.
      if (this.#request === request) {
        this.#request = null;
        this.#openingMode = null;
        this.#changed();
      }
    }
  }

  /**
   * Возвращает нынешние узлы или отменяет незавершённый запрос; во время переноса откладывает возврат.
   * @returns {boolean} true, если действие относится к PiP; false при отсутствии окна, запроса и перенесённого вида.
   */
  close() {
    if (this.#moving) {
      this.#returnRequested = true;
      return true;
    }
    if (!this.#window && !this.#request && !this.#mode) return false;
    ++this.#generation;
    this.#openingMode = null;
    this.#request?.abort();
    const current = this.#window;
    try {
      if (this.#mode) this.#transfer(null);
    } catch {
      this.#error = ui.pip.restoredPartially;
      if (this.#mode !== null) {
        this.#changed();
        return true;
      }
    }
    this.#window = null;
    this.#docsHost = null;
    this.#options.preferences.setThemeDocuments([this.#options.opener.document]);
    if (current && !current.closed) current.close();
    this.#changed();
    return true;
  }

  /**
   * Обрабатывает красную кнопку: сначала PiP, затем информацию, затем разрешённый browser back.
   * @returns {void}
   */
  closeOrBack() {
    if (this.close()) return;
    if (this.#options.panel.isOpen) this.#options.panel.close();
    else if (this.#options.historyBackEnabled) this.#options.opener.history.back();
  }

  /**
   * Закрывает PiP, снимает связи и удаляет якоря после принятого возврата; во время переноса откладывается.
   * @returns {void} Если возврат оставил перенесённый вид, координатор ещё не помечается завершённым.
   */
  dispose() {
    if (this.#moving) {
      this.#returnRequested = true;
      this.#options.opener.queueMicrotask(() => this.dispose());
      return;
    }
    this.close();
    if (this.#mode !== null || this.#window) return;
    this.#disposed = true;
    this.#events.abort();
    for (const anchor of Object.values(this.#home)) anchor.remove();
  }

  /**
   * Создаёт в PiP только основу и копии стилей; приложение и его HTML повторно не запускаются.
   * @param {DisplayWindow} target Новое окно до переноса живых узлов.
   * @param {AbortSignal} signal Срок нынешнего открытия; ожидание стилей ограничено 15 секундами.
   * @returns {Promise<void>} Завершается после всех внешних CSS.
   * @throws {Error} При отмене, ошибке CSS или недоступном содержимом исходной таблицы стилей.
   */
  async #prepareWindow(target, signal) {
    const source = this.#options.opener.document;
    const document = target.document;
    const base = document.createElement('base');
    base.href = source.baseURI;
    document.head.append(base);
    document.title = source.title;
    document.documentElement.lang = source.documentElement.lang;
    document.body.className = source.body.className;
    if (source.documentElement.dataset.layout) {
      document.documentElement.dataset.layout = source.documentElement.dataset.layout;
    }
    /**
     * Ожидания только активных внешних CSS исходного документа; перед переносом должны завершиться все.
     * @type {Promise<void>[]}
     */
    const styles = [];
    for (const sheet of source.styleSheets) {
      if (sheet.disabled) continue;
      if (sheet.href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        link.media = sheet.media.mediaText;
        styles.push(
          new Promise((resolve, reject) => {
            /**
             * Снимает обработчики этой CSS-ссылки и отклоняет её ожидание после отмены открытия.
             */
            const aborted = () => {
              cleanup();
              reject(new Error('Picture-in-Picture preparation was cancelled'));
            };
            /**
             * Принимает одну CSS-ссылку после загрузки и снимает её обработчики.
             */
            const loaded = () => {
              cleanup();
              resolve();
            };
            /**
             * Сообщает отказ одной CSS-ссылки и снимает её обработчики.
             */
            const failed = () => {
              cleanup();
              reject(new Error('Could not load Picture-in-Picture styles'));
            };
            /**
             * Снимает все привязки CSS-ссылки до завершения её обещания.
             */
            const cleanup = () => {
              signal.removeEventListener('abort', aborted);
              link.removeEventListener('load', loaded);
              link.removeEventListener('error', failed);
            };
            if (signal.aborted) {
              aborted();
              return;
            }
            signal.addEventListener('abort', aborted, { once: true });
            link.addEventListener('load', loaded, { once: true });
            link.addEventListener('error', failed, { once: true });
            document.head.append(link);
          }),
        );
      } else {
        const style = document.createElement('style');
        style.media = sheet.media.mediaText;
        style.textContent = [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
        document.head.append(style);
      }
    }
    const host = document.createElement('div');
    host.className = 'pip-docs-host';
    host.hidden = true;
    document.body.append(host);
    this.#docsHost = host;
    const timeout = target.setTimeout(() => {
      // Незавершённая загрузка CSS иначе навсегда оставит открытие PiP в ожидании.
      if (this.#request?.signal === signal) this.#request.abort();
    }, 15_000);
    try {
      await Promise.all(styles);
    } finally {
      target.clearTimeout(timeout);
    }
  }

  /**
   * Подготавливает владельцев, перемещает прежние узлы и принимает размещение в одном синхронном участке.
   * @param {PictureInPictureMode|null} target Новое размещение; null возвращает исходные места.
   * @returns {void} Повтор нынешнего режима ничего не меняет.
   * @throws {Error} Отказ подготовки/переноса; AggregateError также содержит отказы отката.
   */
  #transfer(target) {
    if (target === this.#mode) return;
    const window = this.#window;
    const host = this.#docsHost;
    if (target && (!window || window.closed || !host)) throw new Error('Picture-in-Picture is not ready');
    /**
     * Временные места отката текущего переноса; null, пока узлы ещё не отмечены.
     * @type {Places | null}
     */
    let source = null;
    const previous = this.#mode;
    /**
     * Подготовки владельцев в порядке panel/catalog/preferences/appearance для общего принятия или отката.
     * @type {PreparedMove[]}
     */
    const prepared = [];
    const focus = { restoreFocus: target !== 'docs' && previous !== 'docs', rollbackFocus: previous !== 'docs' };
    const preferencesInInformation = previous === 'docs'
      && this.#options.preferences.ownerDocument === this.#options.panel.ownerDocument
      && this.#options.preferences.ownerDocument !== this.#options.terminal.ownerDocument;
    /**
     * Конечные узлы привязки DocumentPanel, выбранные до физического переноса.
     * @type {PanelPlacement}
     */
    const placement = target === 'docs' && host
      ? { workspace: host, eventRoot: host, footerHome: host, standalone: true }
      : {
        workspace: this.#options.workspace,
        eventRoot: this.#options.terminal,
        footerHome: this.#options.terminal,
        standalone: false,
      };
    this.#moving = true;
    try {
      prepared.push(this.#options.panel.prepareMove(placement));
      prepared.push(this.#options.catalog.prepareMove(focus));
      prepared.push(this.#options.preferences.prepareMove({
        restoreFocus: focus.restoreFocus || preferencesInInformation,
        rollbackFocus: focus.rollbackFocus || preferencesInInformation,
      }));
      prepared.push(this.#options.appearance.prepareMove(focus));
      if (target === 'docs' && !this.#options.panel.isOpen) throw new Error('The information view was closed');
      source = this.#markPlaces('pip-return');
      this.#restorePlaces(this.#home);
      if (window && host) {
        host.hidden = target !== 'docs';
        if (target) window.document.documentElement.dataset.pipMode = target;
        else delete window.document.documentElement.dataset.pipMode;
        if (target === 'main') window.document.body.append(this.#options.terminal);
        else if (target === 'docs') host.append(this.#options.panel, this.#options.footer);
      }
      // Владельцы возобновляются в прежнем порядке; после панели настройки получают уже конечное место.
      for (const [index, move] of prepared.entries()) {
        move.resume();
        if (index === 0) this.#options.appearance.placePreferences();
      }
      for (const move of prepared) move.commit();
      this.#mode = target;
    } catch (error) {
      const restoredMode = target === null ? null : previous;
      if (window && host) {
        host.hidden = restoredMode !== 'docs';
        if (restoredMode) window.document.documentElement.dataset.pipMode = restoredMode;
        else delete window.document.documentElement.dataset.pipMode;
      }
      // Закрывающееся PiP не может служить местом отката обратного переноса.
      if (target === null) this.#restorePlaces(this.#home);
      else if (source) this.#restorePlaces(source);
      this.#mode = restoredMode;
      const errors = [error];
      for (const [index, move] of prepared.entries()) {
        try {
          move.rollback();
        } catch (failure) {
          errors.push(failure);
        }
        if (index === 0) {
          try {
            this.#options.appearance.placePreferences();
          } catch (failure) {
            errors.push(failure);
          }
        }
      }
      if (errors.length > 1) throw new AggregateError(errors, 'Picture-in-Picture rollback failed');
      if (target === null) {
        this.#error = ui.pip.displayFailed;
        return;
      }
      throw error;
    } finally {
      if (source) { for (const anchor of Object.values(source)) anchor.remove(); }
      this.#moving = false;
      if (this.#mode === 'docs' && !this.#options.panel.isOpen) this.#returnRequested = true;
      if (this.#returnRequested) {
        this.#returnRequested = false;
        this.#options.opener.queueMicrotask(() => this.close());
      }
    }
  }

  /**
   * Ставит временные комментарии перед каждым живым узлом; при отказе убирает уже созданные якоря.
   * @param {string} label Подпись набора исходных мест либо мест отката.
   * @returns {Places} Якоря принадлежат координатору до возврата или завершения переноса.
   * @throws {Error} Если один из узлов уже не имеет родителя.
   */
  #markPlaces(label) {
    const { terminal, panel, footer } = this.#options;
    /**
     * Якоря уже отмеченных узлов; удаляются целиком, если следующий узел не имеет места.
     * @type {Comment[]}
     */
    const created = [];
    /**
     * Сохраняет место одного узла в его нынешнем документе и учитывает якорь для очистки при отказе.
     * @param {HTMLElement} node Переносимый живой узел.
     * @param {string} name Название роли узла в подписи комментария.
     * @returns {Comment} Новый якорь непосредственно перед узлом.
     * @throws {Error} Если у узла нет родителя.
     */
    const mark = (node, name) => {
      if (!node.parentNode) throw new Error(`Missing ${name} location`);
      const anchor = node.ownerDocument.createComment(`${label}-${name}`);
      node.before(anchor);
      created.push(anchor);
      return anchor;
    };
    try {
      return { terminal: mark(terminal, 'terminal'), panel: mark(panel, 'panel'), footer: mark(footer, 'footer') };
    } catch (error) {
      for (const anchor of created) anchor.remove();
      throw error;
    }
  }

  /**
   * Возвращает прежние узлы сразу после сохранённых якорей.
   * @param {Places} places Полный набор исходных мест либо мест отката.
   * @returns {void}
   * @throws {Error} Если хотя бы один якорь потерял родителя; перемещение тогда не начинается.
   */
  #restorePlaces(places) {
    if (Object.values(places).some((anchor) => !anchor.parentNode)) throw new Error('A return location is missing');
    places.terminal.after(this.#options.terminal);
    places.panel.after(this.#options.panel);
    places.footer.after(this.#options.footer);
  }

  /**
   * Уведомляет оконные действия о поддержке, ожидании, режиме и ошибке живого координатора.
   * @returns {void} После dispose уведомления не отправляются.
   */
  #changed() {
    if (!this.#disposed) this.dispatchEvent(new Event('change'));
  }
}

/**
 * Состояние координатора изменилось; потребители перечитывают getters, узлы событиями не передаются.\n * @event PictureInPictureController#change
 * @type {Event}
 */
