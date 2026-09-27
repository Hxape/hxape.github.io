/** Хранит пользовательское оформление и применяет его к основному и PiP документам. */
import { LitElement } from 'lit';
import { loadScreen, screenReady } from '../../common/html/screen.mjs';
import { controlIcon, enableSystemSymbols } from '../../common/ui/icons.mjs';
import { createMotion } from '../../common/ui/motion.mjs';
import { formatText, ui } from '../../common/ui/text.mjs';
import { displayWindow, isElement, isHTMLElement } from '../../common/ui/view-utils.mjs';
import { renderPreferencesControls } from '../../component/preferences-controls/index.mjs';
import { groupedIcon } from '../catalog/icons.mjs';
import { readOrganizationRoot } from '../catalog/material-target.mjs';
import appearance from './json/appearance.json' with { type: 'json' };

const labels = ui.preferences;

/**
 * Размер рамки основного вида; компактное размещение использует fill независимо от ручного выбора.
 * @typedef {'fill'|'window'} PageLayout
 */
/**
 * Эффективная тема, для которой отдельно хранятся акцент и заливка mark.
 * @typedef {'light'|'dark'} ColorTheme
 */
/**
 * Единственное меню преференсов с прежним id icons-menu.
 * @typedef {'icons'} MenuName
 */
/**
 * Настроенные цвета двух тем; null использует цвет appearance.json.
 * @typedef {Record<ColorTheme,string|null>} ThemeColors
 */
/**
 * Прежний фокус каждого меню для закрытия по Escape; элементы могут принадлежать разным размещениям.
 * @typedef {Record<MenuName,HTMLElement|null>} MenuFocus
 */
/**
 * Порядок четырёх групп из appearance.json для формы выбора; сохраняемые флаги индексируются теми же ключами.
 * @type {ReadonlyArray<keyof import('../catalog/icons.mjs').IconSettings>}
 */
const iconGroups =
  /** @type {Array<keyof import('../catalog/icons.mjs').IconSettings>} */ (Object.keys(appearance.iconVisibility));
const defaultTheme = /** @type {ColorTheme} */ (appearance.themeDefault);
const organizationRootKey = 'site-organization-root';
const linkModeKey = 'site-link-mode';
const historyTreeModeKey = 'site-history-tree-mode';
const searchTreeModeKey = 'site-search-tree-mode';
const sourceHighlightDurationKey = 'site-source-highlight-duration';

/**
 * Задержка до снятия фона строки в миллисекундах; 0 не показывает фон, null оставляет его без таймера.
 * @typedef {0|500|1000|1500|2000|2500|3000|null} SourceHighlightDuration
 */

/**
 * Порядок допустимых значений ползунка; индекс относится только к представлению, наружу передаются миллисекунды или null.
 * @type {ReadonlyArray<SourceHighlightDuration>}
 */
const sourceHighlightDurations = [0, 500, 1000, 1500, 2000, 2500, 3000, null];

/**
 * Проверяет внешний скаляр хранилища без смешения отсутствующей записи и бесконечности.
 * @param {unknown} value Неизвестное значение localStorage; допустимы строки выбранных миллисекунд и infinity.
 * @returns {SourceHighlightDuration|undefined} Проверенный срок, включая 0/null; undefined при отсутствии или неверной записи.
 */
function readSourceHighlightDuration(value) {
  if (typeof value !== 'string') return undefined;
  return sourceHighlightDurations.find(duration => (duration === null ? 'infinity' : String(duration)) === value);
}

/**
 * Раскрытие при переходах истории или поиске каталога: none не раскрывает ветви,
 * temporary показывает нынешнее место и сворачивает только открытые этой операцией ветви после ухода,
 * always сохраняет раскрытие. Выбор хранится в браузере, правила ветвей принадлежат Catalog.
 * @typedef {'none'|'temporary'|'always'} HistoryTreeMode
 */

/**
 * Одно удержание готовой команды в нынешнем размещении настроек; снимается отпусканием, движением или переносом.
 * @typedef {Object} NavigationHold
 * @property {HTMLButtonElement} button Кнопка начала жеста; поздний таймер проверяет её подключение.
 * @property {import('../../common/ui/view-utils.mjs').DisplayWindow} display Окно таймера; завершение очищает таймер в том же окне.
 * @property {number} pointerId Единственный первичный указатель этого жеста.
 * @property {number} x Начальная координата для отмены удержания при прокрутке.
 * @property {number} y Начальная координата для отмены удержания при прокрутке.
 * @property {number} timer Id ожидания общего времени удержания; 0 после принятия либо отмены.
 * @property {boolean} ready Порог достигнут и кнопка подсвечена; второе действие выполнится только после допустимого отпускания.
 * @property {'organization-root-open'|'search-history-open'} action Готовая команда Panel для поля пути либо списка запросов.
 */
/**
 * Один release-click, подавляемый после удержания той же кнопки.
 * @typedef {Object} SuppressedNavigationClick
 * @property {HTMLButtonElement} button Кнопка завершённого жеста; другая команда и клавиатурный click не подавляются.
 * @property {number} until Верхняя граница Date.now() для одного последующего указательного click.
 */

/**
 * Проверяет внешнее значение одной настройки, не принимая неизвестные имена режимов.
 * @param {unknown} value Скаляр из браузерного хранилища либо значение поля выбора.
 * @returns {HistoryTreeMode|null} Допустимый режим; null при отсутствии или неверном значении.
 */
function readHistoryTreeMode(value) {
  return value === 'none' || value === 'temporary' || value === 'always' ? value : null;
}

/**
 * Единый владелец оформления основного окна и PiP.
 * @fires SitePreferences#icons-change
 */
export class SitePreferences extends LitElement {
  /**
   * Поля Lit, чьё изменение обновляет одно представление настроек; владение остаётся у SitePreferences.
   */
  static properties = {
    theme: { state: true },
    accent: { state: true },
    customAccent: { state: true },
    markColor: { state: true },
    customMark: { state: true },
    icons: { state: true },
    iconsEnabled: { state: true },
    fontIncrease: { state: true },
    holdDuration: { state: true },
    tokenActive: { state: true },
    iconsOpen: { state: true },
    iconsExpanded: { state: true },
  };

  /**
   * Срок привязок нынешнего документа настроек; null до подключения и между этапами переноса.
   * @type {AbortController|null}
   */
  #events = null;
  /**
   * Анимации нынешних раскрытых меню; снимаются вместе с привязками.
   * @type {ReturnType<typeof createMotion>|null}
   */
  #motion = null;
  /**
   * Наблюдение системной темы в нынешнем окне; null, пока настройки отсоединены.
   * @type {MediaQueryList|null}
   */
  #systemTheme = null;
  /**
   * Ручной акцент по двум темам на срок настроек; null означает исходный цвет темы.
   * @type {ThemeColors}
   */
  #accents = { light: null, dark: null };
  /**
   * Ручная заливка mark по двум темам; значения отдельно сохраняются в браузере.
   * @type {ThemeColors}
   */
  #marks = { light: null, dark: null };
  /**
   * Только явно сохранённые флаги групп значков; они имеют приоритет над начальной конфигурацией каталога.
   * @type {Partial<import('../catalog/icons.mjs').IconSettings>}
   */
  #savedIcons = {};
  /**
   * Ручной выбор темы; null следит за системной темой, а выбранная тема сохраняется в браузере.
   * @type {ColorTheme|null}
   */
  #manualTheme = null;
  /**
   * Переход к противоположной теме для действия T; таблица не хранит нынешний выбор.
   * @type {{[K in ColorTheme]: ColorTheme}}
   */
  #reverseTheme = {
    'dark': 'light',
    'light': 'dark',
  };
  /**
   * Исходный документ настроек, чьё местное хранилище используется и после переноса в PiP.
   */
  #home = this.ownerDocument;
  /**
   * Документы, которым сейчас применяется одна тема и размер текста; набор заменяется координатором PiP.
   */
  #documents = new Set([this.ownerDocument]);
  /**
   * Пауза обработчиков во время подготовленного переноса; снимается commit либо rollback.
   */
  #moving = false;
  /**
   * Фокус перед раскрытием каждого меню; восстанавливается по Escape, если элемент ещё подключён.
   * @type {MenuFocus}
   */
  #menuFocus = { icons: null };
  /** Одна попытка чтения preferences.html; значения настроек от неё не зависят. */
  #markupLoading = false;
  /** Последняя попытка чтения разметки не удалась; повтор запускается открытием или кнопкой. */
  #markupFailed = false;
  /**
   * Местный проверенный корень организации; пустая строка исключает VS Code из режима ссылок.
   */
  #organizationRoot = '';
  /**
   * Единый нынешний режим ссылок основного окна и PiP, сохраняемый в браузере.
   * @type {import('../catalog/material-target.mjs').LinkMode}
   */
  #linkMode = 'internal';
  /**
   * Видимый отказ проверки или сохранения пути/режима; не входит в постоянную запись.
   */
  #navigationMessage = '';
  /**
   * Выбор раскрытия дерева при переходах истории; по умолчанию temporary, сохраняется в исходном браузере.
   * @type {HistoryTreeMode}
   */
  #historyTreeMode = 'temporary';
  /**
   * Видимый отказ сохранения настройки истории; выбор в живом интерфейсе остаётся принятым.
   */
  #historyTreeMessage = '';
  /** @type {HistoryTreeMode} Раскрытие при поиске хранится отдельно от истории. */
  #searchTreeMode = 'temporary';
  #searchTreeMessage = '';
  /**
   * Общая сохранённая задержка подсветки основного окна и PiP; визуальный таймер принадлежит SourceRequest.
   * @type {SourceHighlightDuration}
   */
  #sourceHighlightDuration = 3000;
  /**
   * Видимый отказ чтения или сохранения срока; не меняет принятую живую настройку.
   */
  #sourceHighlightMessage = '';
  /**
   * Незавершённый жест режима или поиска в единственном перемещаемом меню; null между жестами.
   * @type {NavigationHold|null}
   */
  #navigationHold = null;
  /**
   * Подавляемый указательный click прежней кнопки после удержания; клавиатура и другие кнопки сохраняют действие.
   * @type {SuppressedNavigationClick|null}
   */
  #suppressedNavigationClick = null;

  /**
   * Восстанавливает проверенные настройки из браузера; отсутствующие или недоступные записи оставляют начальные значения.
   */
  constructor() {
    super();
    const theme = this.#home.documentElement.dataset.theme;
    this.#manualTheme = theme === 'light' || theme === 'dark' ? theme : null;
    /**
     * Эффективная тема представления; ручной выбор и системная тема согласуются в updateTheme.
     * @type {ColorTheme}
     */
    this.theme = this.#manualTheme || defaultTheme;
    /**
     * Акцент нынешней темы для полей цвета; CSS применяется ко всем документам documents.
     */
    this.accent = appearance.accentColors.light;
    /**
     * У нынешней темы есть ручной акцент; управляет доступностью сброса.
     */
    this.customAccent = false;
    /**
     * Эффективная заливка mark нынешней темы для её полей и CSS.
     */
    this.markColor = appearance.markColors.light;
    /**
     * У нынешней темы есть ручная заливка mark; управляет доступностью сброса.
     */
    this.customMark = false;
    /**
     * Нынешние флаги четырёх групп значков; изменения передаются каталогу и панели событием.
     */
    this.icons = { ...appearance.iconVisibility };
    /**
     * Каталог уже передал начальную конфигурацию значков; до этого выбор групп недоступен.
     */
    this.iconsEnabled = false;
    /**
     * Видимость меню настроек и намерение раскрыть его; завершитель движения согласует open.
     */
    this.iconsOpen = this.iconsExpanded = false;
    /**
     * Добавка к базовому размеру текста в CSS-пикселях, ограниченная appearance.json.
     */
    this.fontIncrease = appearance.fontIncrease.default;
    /**
     * Общая длительность удержания в миллисекундах для дерева и панели.
     */
    this.holdDuration = appearance.holdDuration.default;
    /**
     * Отображаемый факт активного доступа GithubAccess; PAT в настройках не хранится.
     */
    this.tokenActive = false;
    try {
      const storage = displayWindow(this.#home).localStorage;
      const increase = Number(storage.getItem('font-increase'));
      if (
        Number.isInteger(increase) && increase >= appearance.fontIncrease.min && increase <= appearance.fontIncrease.max
      ) this.fontIncrease = increase;
      const duration = Number(storage.getItem('site-hold-duration'));
      if (
        Number.isInteger(duration) && duration >= appearance.holdDuration.min && duration <= appearance.holdDuration.max
      ) this.holdDuration = duration;
      const saved = /** @type {unknown} */ (JSON.parse(storage.getItem('site-icons') || '{}'));
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        const choices = /** @type {Record<string,unknown>} */ (saved);
        for (
          const name
            of /** @type {Array<keyof import('../catalog/icons.mjs').IconSettings>} */ (Object.keys(this.icons))
        ) {
          const value = choices[name];
          if (typeof value === 'boolean') this.#savedIcons[name] = value;
        }
      }
    } catch {
    }
    /**
     * Обе поддержанные темы, чьи отдельные сохранённые цвета перечитываются при создании настроек.
     * @type {ColorTheme[]}
     */
    const themes = ['light', 'dark'];
    for (const name of themes) {
      try {
        const value = displayWindow(this.#home).localStorage.getItem(`accent-${name}`);
        if (value && /^#[0-9a-f]{6}$/i.test(value)) this.#accents[name] = value;
        const mark = displayWindow(this.#home).localStorage.getItem(`mark-${name}`);
        if (mark && /^#[0-9a-f]{6}$/i.test(mark)) this.#marks[name] = mark;
      } catch {
      }
    }
    try {
      const storage = displayWindow(this.#home).localStorage;
      this.#organizationRoot = readOrganizationRoot(storage.getItem(organizationRootKey) || '') || '';
      const mode = storage.getItem(linkModeKey);
      if (mode === 'github' || mode === 'vscode' && this.#organizationRoot) this.#linkMode = mode;
    } catch {
      this.#navigationMessage = labels.navigationStorageFailed;
    }
    try {
      const saved = /** @type {unknown} */ (displayWindow(this.#home).localStorage.getItem(historyTreeModeKey));
      this.#historyTreeMode = readHistoryTreeMode(saved) || 'temporary';
    } catch {
      this.#historyTreeMessage = labels.navigationStorageFailed;
    }
    try {
      const saved = /** @type {unknown} */ (displayWindow(this.#home).localStorage.getItem(searchTreeModeKey));
      this.#searchTreeMode = readHistoryTreeMode(saved) || 'temporary';
    } catch {
      this.#searchTreeMessage = labels.navigationStorageFailed;
    }
    try {
      const saved = readSourceHighlightDuration(
        /** @type {unknown} */ (displayWindow(this.#home).localStorage.getItem(sourceHighlightDurationKey)),
      );
      if (saved !== undefined) this.#sourceHighlightDuration = saved;
    } catch {
      this.#sourceHighlightMessage = labels.navigationStorageFailed;
    }
  }

  /**
   * Предоставляет один выбранный срок прежнему владельцу визуальной подсветки.
   * @returns {SourceHighlightDuration} Задержка в миллисекундах; null означает не гасить, без достоверной записи — 3000.
   */
  get sourceHighlightDuration() {
    return this.#sourceHighlightDuration;
  }

  /**
   * Предоставляет Catalog нынешний выбор дерева для истории без владения открытостью ветвей.
   * @returns {HistoryTreeMode} none, temporary либо always; без достоверной записи — temporary.
   */
  get historyTreeMode() {
    return this.#historyTreeMode;
  }

  /** Читает отдельный режим раскрытия при поиске каталога. @returns {HistoryTreeMode} */
  get searchTreeMode() {
    return this.#searchTreeMode;
  }

  /**
   * Предоставляет проверенный местный корень без изменения настройки.
   * @returns {string} Абсолютный путь POSIX/диска Windows либо пустая строка, выключающая VS Code.
   */
  get organizationRoot() {
    return this.#organizationRoot;
  }

  /**
   * Подготавливает то же поле пути для временной области Panel; черновик хранится только в её input.
   * @returns {import('../../component/organization-root-control/index.mjs').OrganizationRootModel} Местный путь, сообщения и действия проверки/сброса; показ и фокус остаются у Panel.
   */
  get organizationRootControl() {
    return {
      id: 'navigation-organization-root',
      label: labels.organizationRoot,
      hint: labels.organizationRootHint,
      placeholder: labels.organizationRootPlaceholder,
      value: this.#organizationRoot,
      message: this.#navigationMessage,
      invalidMessage: labels.organizationRootInvalid,
      saveLabel: labels.organizationRootSave,
      resetLabel: labels.organizationRootReset,
      saveIcon: controlIcon('organization-root-save'),
      resetIcon: controlIcon('organization-root-reset'),
      save: value => this.saveOrganizationRoot(value),
      reset: () => {
        this.saveOrganizationRoot('');
      },
    };
  }

  /**
   * Проверяет ввод местного корня и сохраняет только допустимый абсолютный путь либо пустую строку.
   * @param {unknown} value Ввод поля; внешняя строка остаётся непроверенной до readOrganizationRoot.
   * @returns {boolean} true после принятия пути, включая живой выбор при отказе localStorage; false при неверном вводе, отсоединении или переносе. Отказ виден в готовой модели поля.
   */
  saveOrganizationRoot(value) {
    if (!this.#events || this.#moving) return false;
    const root = readOrganizationRoot(value);
    this.#navigationMessage = root === null ? labels.organizationRootInvalid : '';
    if (root === null) {
      this.requestUpdate();
      return false;
    }
    this.#setNavigation(root, this.#linkMode, true);
    return true;
  }

  /**
   * Предоставляет единый режим ссылок всем живым представлениям.
   * @returns {import("../catalog/material-target.mjs").LinkMode} Нынешний internal, vscode либо github.
   */
  get linkMode() {
    return this.#linkMode;
  }

  /**
   * Циклически выбирает internal, VS Code и GitHub, пропуская VS Code без корня; уведомляет потребителей после принятия состояния.
   * @returns {import("../catalog/material-target.mjs").LinkMode} Принятый режим; во время переноса сохраняется прежний. Отказ записи показывается в настройках.
   */
  cycleLinkMode() {
    if (this.#moving) return this.#linkMode;
    const mode = this.#linkMode === 'internal'
      ? this.#organizationRoot ? 'vscode' : 'github'
      : this.#linkMode === 'vscode'
      ? 'github'
      : 'internal';
    this.#setNavigation(this.#organizationRoot, mode, true);
    return this.#linkMode;
  }

  /**
   * Подключает постоянный CSS в ShadowRoot, который переезжает вместе с настройками.
   * @returns {ShadowRoot} Единственный корень представления; Lit вставляет содержимое перед его stylesheet.
   */
  createRenderRoot() {
    const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
    const sheet = this.ownerDocument.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = new URL('public/css/preferences.css', this.ownerDocument.baseURI).href;
    root.append(sheet);
    this.renderOptions.renderBefore = sheet;
    return root;
  }

  /**
   * Согласует начальные флаги каталога с явным местным выбором пользователя.
   * @param {import("../catalog/icons.mjs").IconSettings} settings Начальная конфигурация четырёх групп.
   * @param {boolean} [enabled=true] Разрешить управление группами после получения конфигурации.
   * @returns {void} Сохранённые флаги имеют приоритет, событие изменения здесь не отправляется.
   */
  setIcons(settings, enabled = true) {
    this.icons = { ...this.icons, ...settings, ...this.#savedIcons };
    this.iconsEnabled = enabled;
  }

  /**
   * Обновляет рисунок ключа по готовому состоянию доступа, не принимая PAT.
   * @param {boolean} active Есть ли активный токен у GithubAccess.
   * @returns {void} Меняет реактивный флаг отображения ключа без сохранения токена.
   */
  setTokenActive(active) {
    this.tokenActive = active;
  }

  /**
   * Заменяет набор документов с единым оформлением и сразу применяет нынешнюю тему и размер текста.
   * @param {Document[]} owners Основной документ и при наличии нынешний документ PiP.
   * @returns {void} Проверка системных глифов запускается отдельно для каждого документа.
   */
  setThemeDocuments(owners) {
    this.#documents = new Set(owners);
    this.#updateTheme(false);
    this.#applyFontSize();
    for (const owner of this.#documents) void enableSystemSymbols(owner);
  }

  /**
   * Снимает привязки перед переносом того же элемента; цвета, поля и открытость меню остаются здесь.
   * @param {import("../../app/picture-in-picture.mjs").MoveFocusOptions} [options] Правила возвращения принадлежащего настройкам фокуса.
   * @returns {import("../../app/picture-in-picture.mjs").PreparedMove} Возобновление, откат и принятие одного синхронного переноса.
   * @throws {Error} При параллельном переносе либо отказе снятия/восстановления привязок.
   */
  prepareMove({ restoreFocus = true, rollbackFocus = true } = {}) {
    if (this.#moving) throw new Error('Preferences are already moving');
    const focused = deepFocus(this.ownerDocument);
    const ownedFocus = focused && this.renderRoot.contains(focused) ? focused : null;
    this.#moving = true;
    const resume = () => {
      this.#bind();
      if (restoreFocus && ownedFocus?.isConnected) ownedFocus.focus({ preventScroll: true });
    };
    const restore = () => {
      this.#bind();
      if (rollbackFocus && ownedFocus?.isConnected) ownedFocus.focus({ preventScroll: true });
    };
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
   * Подключает Lit и события нынешнего документа, если перенос не держит их на паузе.
   * @returns {void} Привязывает события только после обычного подключения; подготовленный перенос сохраняет паузу.
   */
  connectedCallback() {
    super.connectedCallback();
    if (!this.#moving) this.#bind();
  }
  /**
   * Снимает события и закрывает меню при обычном отсоединении; подготовленный перенос сохраняет их состояние.
   * @returns {void} Обычное отсоединение освобождает жесты и меню до завершения Lit; перенос оставляет их для commit.
   */
  disconnectedCallback() {
    if (!this.#moving) {
      this.#unbind();
      this.#setMenu('icons', false, true);
    }
    super.disconnectedCallback();
  }

  /**
   * Связывает меню, клавиши, тему и местные настройки с нынешним документом; повторная привязка пропускается.
   * @returns {void} События остаются действительны до unbind.
   */
  #bind() {
    if (this.#events || !this.isConnected) return;
    const view = displayWindow(this);
    this.#events = new view.AbortController();
    this.#motion = createMotion(view);
    this.#systemTheme = view.matchMedia('(prefers-color-scheme: dark)');
    const signal = this.#events.signal;
    this.#systemTheme.addEventListener('change', () => {
      if (!this.#moving) this.#updateTheme();
    }, { signal });
    view.addEventListener('resize', () => {
      if (!this.#moving) this.#motion?.finishAll();
    }, { signal });
    this.ownerDocument.addEventListener('pointerdown', (event) => {
      if (this.#moving) return;
      const path = event.composedPath();
      if (this.#navigationHold && !path.includes(this.#navigationHold.button)) this.#cancelNavigationHold(true);
      const icons = this.renderRoot.querySelector('#icons-menu');
      if (!icons || !path.includes(icons)) this.#setMenu('icons', false);
    }, { signal });
    this.ownerDocument.addEventListener('keydown', (event) => this.#shortcut(event), { signal });
    this.ownerDocument.addEventListener('pointermove', event => {
      const hold = this.#navigationHold;
      if (
        hold && hold.pointerId === event.pointerId
        && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 8
      ) this.#cancelNavigationHold(true);
    }, { signal, passive: true });
    this.ownerDocument.addEventListener('pointerup', event => this.#releaseNavigationHold(event), {
      signal,
      capture: true,
    });
    this.ownerDocument.addEventListener('pointercancel', event => {
      if (this.#navigationHold?.pointerId === event.pointerId) this.#cancelNavigationHold(true);
    }, { signal, capture: true });
    this.ownerDocument.addEventListener('scroll', () => this.#cancelNavigationHold(true), {
      signal,
      capture: true,
      passive: true,
    });
    view.addEventListener('blur', () => this.#cancelNavigationHold(true), { signal });
    displayWindow(this.#home).addEventListener('storage', event => {
      if (this.#moving) return;
      if ([sourceHighlightDurationKey, null].includes(event.key)) {
        try {
          const saved = readSourceHighlightDuration(
            /** @type {unknown} */ (displayWindow(this.#home).localStorage.getItem(sourceHighlightDurationKey)),
          );
          this.#setSourceHighlightDuration(saved === undefined ? 3000 : saved);
        } catch {
          this.#sourceHighlightMessage = labels.navigationStorageFailed;
          this.requestUpdate();
        }
      }
      for (const kind of /** @type {const} */ (['history', 'search'])) {
        const key = kind === 'history' ? historyTreeModeKey : searchTreeModeKey;
        if (![key, null].includes(event.key)) continue;
        try {
          const saved = /** @type {unknown} */ (displayWindow(this.#home).localStorage.getItem(key));
          this.#setTreeMode(kind, readHistoryTreeMode(saved) || 'temporary');
        } catch {
          if (kind === 'history') this.#historyTreeMessage = labels.navigationStorageFailed;
          else this.#searchTreeMessage = labels.navigationStorageFailed;
          this.requestUpdate();
        }
      }
      if (![organizationRootKey, linkModeKey, null].includes(event.key)) return;
      try {
        const storage = displayWindow(this.#home).localStorage;
        const root = readOrganizationRoot(storage.getItem(organizationRootKey) || '');
        const mode = storage.getItem(linkModeKey);
        if (root === null) return;
        this.#setNavigation(root, mode === 'github' || mode === 'vscode' && root ? mode : 'internal');
      } catch {
        this.#navigationMessage = labels.navigationStorageFailed;
        this.requestUpdate();
      }
    }, { signal });
    this.#updateTheme(!this.#moving);
    this.#applyFontSize();
    void enableSystemSymbols(this.ownerDocument);
  }

  /**
   * Завершает движение меню и снимает события, эффекты и наблюдение системной темы.
   * @returns {void} Значения настроек не сбрасываются.
   */
  #unbind() {
    this.#cancelNavigationHold();
    this.#suppressedNavigationClick = null;
    this.#motion?.finishAll();
    this.#events?.abort();
    this.#events = null;
    this.#motion?.dispose();
    this.#motion = null;
    this.#systemTheme = null;
  }

  /**
   * Согласует тему и её два цвета во всех документах, затем при разрешении обновляет поля ввода.
   * @param {boolean} [syncInputs=true] Согласовать поля цвета после применения CSS; перенос может отложить это.
   * @returns {void} Применяет нынешние цвета и тему; поля согласует только при syncInputs и готовом renderRoot.
   */
  #updateTheme(syncInputs = true) {
    this.theme = this.#manualTheme || (this.#systemTheme?.matches ? 'dark' : 'light');
    this.customAccent = Boolean(this.#accents[this.theme]);
    this.accent = this.#accents[this.theme] || appearance.accentColors[this.theme];
    this.customMark = Boolean(this.#marks[this.theme]);
    this.markColor = this.#marks[this.theme] || appearance.markColors[this.theme];
    for (const owner of this.#documents) {
      if (this.#manualTheme) owner.documentElement.dataset.theme = this.#manualTheme;
      else delete owner.documentElement.dataset.theme;
      if (this.customAccent) owner.documentElement.style.setProperty('--accent-override', this.accent);
      else owner.documentElement.style.removeProperty('--accent-override');
      if (this.customMark) owner.documentElement.style.setProperty('--mark-background', this.markColor);
      else owner.documentElement.style.removeProperty('--mark-background');
    }
    if (!syncInputs || !this.renderRoot) return;
    for (const id of ['accent-color', 'accent-hex', 'mark-color', 'mark-hex']) {
      const input = /** @type {HTMLInputElement|null} */ (this.renderRoot.querySelector(`#${id}`));
      if (input) input.value = id.startsWith('mark-') ? this.markColor : this.accent;
    }
  }

  /**
   * Принимает ручную тему, сохраняет выбор и применяет его ко всем документам.
   * @param {ColorTheme} theme Новая ручная тема; системное наблюдение больше не выбирает её.
   * @returns {void} После успешной записи пересчитывает тему и CSS подготовленных документов.
   * @throws {DOMException} Отказ записи localStorage передаётся обработчику до применения CSS.
   */
  #setTheme(theme) {
    this.#manualTheme = theme;
    try {
      displayWindow(this.#home).localStorage.setItem('theme', theme);
    } finally {
    }
    this.#updateTheme();
  }

  /**
   * Передаёт нынешнюю добавку размера текста всем документам оформления.
   * @returns {void} Устанавливает --font-increase в каждом документе нынешнего набора.
   */
  #applyFontSize() {
    for (const owner of this.#documents) {
      owner.documentElement.style.setProperty('--font-increase', `${this.fontIncrease}px`);
    }
  }

  /**
   * Ограничивает изменение текста допустимым диапазоном, сохраняет его и уведомляет дерево.
   * @param {number} change Добавка либо уменьшение в CSS-пикселях.
   * @returns {void} При прежнем результате, отсоединении или переносе ничего не делает.
   * @throws {DOMException} Отказ записи localStorage прерывает применение CSS и уведомление.
   */
  #changeFontSize(change) {
    if (!this.#events || this.#moving) return;
    const increase = Math.min(
      appearance.fontIncrease.max,
      Math.max(appearance.fontIncrease.min, this.fontIncrease + change),
    );
    if (increase === this.fontIncrease) return;
    this.fontIncrease = increase;
    try {
      displayWindow(this.#home).localStorage.setItem('font-increase', String(increase));
    } finally {
    }
    this.#applyFontSize();
    this.dispatchEvent(new CustomEvent('font-size-change', { bubbles: true, composed: true }));
  }

  /**
   * Выбирает противоположную тему действием человека только при активных привязках.
   * @returns {void} Отказ сохранения темы передаётся вызывающему обработчику.
   */
  #toggleTheme() {
    if (!this.#events || this.#moving) return;
    this.#setTheme(this.#reverseTheme[this.theme]);
  }

  /**
   * Обрабатывает T и I вне ввода; модификаторы, повтор и уже обработанная команда игнорируются.
   * @param {KeyboardEvent} event Клавиша нынешнего документа настроек.
   * @returns {void} Для T меняет тему, для I раскрытие меню; принятая команда отменяет стандартное действие.
   */
  #shortcut(event) {
    if (
      !this.#events || this.#moving || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey
      || event.shiftKey || event.repeat || event.isComposing
    ) return;
    if (
      event.composedPath().some((node) =>
        isHTMLElement(node) && (node.matches('input,textarea,select') || node.isContentEditable)
      )
    ) return;
    const key = event.code;
    if (!['KeyT', 'KeyI'].includes(key)) return;
    event.preventDefault();
    if (key === 'KeyT') this.#toggleTheme();
    else {
      this.#setMenu('icons', !this.iconsExpanded);
    }
  }

  /**
   * Предотвращает перенос фокуса на кнопку или summary при нажатии основной кнопкой мыши.
   * @param {MouseEvent} event Нажатие внутри общего меню настроек.
   * @returns {void} Поля ввода сохраняют обычное получение фокуса.
   */
  #keepFocus(event) {
    if (event.button === 0 && isElement(event.target) && event.target.closest('button,summary')) event.preventDefault();
  }

  /**
   * Принимает только шестизначный HEX-акцент для нынешней темы и применяет его после сохранения.
   * @param {Event} event Изменение цветового или HEX-поля.
   * @returns {void} Некорректный цвет, перенос или отсоединение игнорируются.
   * @throws {DOMException} Если браузер не разрешил сохранить цвет.
   */
  #setAccent(event) {
    if (!this.#events || this.#moving) return;
    const value = /** @type {HTMLInputElement} */ (event.target).value;
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    const accent = value.toLowerCase();
    this.#accents[this.theme] = accent;
    try {
      displayWindow(this.#home).localStorage.setItem(`accent-${this.theme}`, accent);
    } finally {
    }
    this.#updateTheme();
  }

  /**
   * Удаляет ручной акцент нынешней темы и возвращает цвет appearance.json.
   * @returns {void} При переносе или отсоединении ничего не меняет.
   * @throws {DOMException} Если браузер не разрешил удалить сохранённый цвет.
   */
  #resetAccent() {
    if (!this.#events || this.#moving) return;
    this.#accents[this.theme] = null;
    try {
      displayWindow(this.#home).localStorage.removeItem(`accent-${this.theme}`);
    } finally {
    }
    this.#updateTheme();
  }

  /**
   * Принимает шестизначную HEX-заливку mark отдельно от акцента нынешней темы.
   * @param {Event} event Изменение поля заливки mark.
   * @returns {void} Некорректный цвет, перенос или отсоединение игнорируются.
   * @throws {DOMException} Если браузер не разрешил сохранить заливку.
   */
  #setMark(event) {
    if (!this.#events || this.#moving) return;
    const value = /** @type {HTMLInputElement} */ (event.target).value;
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    const mark = value.toLowerCase();
    this.#marks[this.theme] = mark;
    try {
      displayWindow(this.#home).localStorage.setItem(`mark-${this.theme}`, mark);
    } finally {
    }
    this.#updateTheme();
  }

  /**
   * Удаляет ручную заливку mark нынешней темы и применяет исходное значение.
   * @returns {void} При переносе или отсоединении ничего не меняет.
   * @throws {DOMException} Если браузер не разрешил удалить сохранённую заливку.
   */
  #resetMark() {
    if (!this.#events || this.#moving) return;
    this.#marks[this.theme] = null;
    try {
      displayWindow(this.#home).localStorage.removeItem(`mark-${this.theme}`);
    } finally {
    }
    this.#updateTheme();
  }

  /**
   * Сохраняет явный флаг одной известной группы и передаёт новый набор потребителям.
   * @param {Event} event Изменение флажка с data-icon-setting.
   * @returns {void} Неизвестная группа, перенос или отсоединение игнорируются.
   * @throws {DOMException} Если запись localStorage не удалась; событие тогда не отправляется.
   */
  #changeIcons(event) {
    if (!this.#events || this.#moving) return;
    const input = /** @type {HTMLInputElement} */ (event.target);
    const name = input.dataset.iconSetting;
    if (!name || !Object.hasOwn(this.icons, name)) return;
    this.icons = { ...this.icons, [name]: input.checked };
    this.#savedIcons = { ...this.#savedIcons, [name]: input.checked };
    try {
      displayWindow(this.#home).localStorage.setItem('site-icons', JSON.stringify(this.#savedIcons));
    } finally {
    }
    this.dispatchEvent(new CustomEvent('icons-change', { detail: { ...this.icons }, bubbles: true, composed: true }));
  }

  /**
   * Принимает допустимую целую длительность удержания, сохраняет её и уведомляет дерево и панель.
   * @param {Event} event Изменение ползунка длительности в миллисекундах.
   * @returns {void} Значение вне диапазона, перенос или отсоединение игнорируются.
   * @throws {DOMException} Если запись localStorage не удалась; событие тогда не отправляется.
   */
  #changeHoldDuration(event) {
    if (!this.#events || this.#moving) return;
    const value = Number(/** @type {HTMLInputElement} */ (event.target).value);
    if (!Number.isInteger(value) || value < appearance.holdDuration.min || value > appearance.holdDuration.max) return;
    this.holdDuration = value;
    try {
      displayWindow(this.#home).localStorage.setItem('site-hold-duration', String(value));
    } finally {
    }
    this.dispatchEvent(new CustomEvent('hold-duration-change', { detail: value, bubbles: true, composed: true }));
  }

  /**
   * Проверяет абсолютный местный путь до принятия настройки; недопустимый ввод остаётся в поле с сообщением.
   * @param {Event} event Завершённое изменение поля пути организации.
   * @returns {void} Допустимый путь нормализуется; отказ сохранения показывается в том же меню.
   */
  #changeOrganizationRoot(event) {
    if (!this.#events || this.#moving) return;
    const input = /** @type {HTMLInputElement} */ (event.target);
    const accepted = this.saveOrganizationRoot(input.value);
    input.setCustomValidity(accepted ? '' : labels.organizationRootInvalid);
    if (accepted) input.value = this.#organizationRoot;
  }

  /**
   * Начинает одно удержание готовой команды на общее время; кнопка сохраняется в header/footer.
   * @param {PointerEvent} event Первичное нажатие режима или поиска; другие кнопки и перенос игнорируются.
   * @param {'organization-root-open'|'search-history-open'} action Команда второго действия после достижения порога и отпускания.
   * @returns {void} Порог отмечает data-hold-ready; короткое нажатие сохраняет своё обычное действие.
   */
  #startNavigationHold(event, action) {
    if (!this.#events || this.#moving || !event.isPrimary || event.button !== 0) return;
    const button = event.currentTarget;
    if (!isHTMLElement(button) || button.localName !== 'button') return;
    this.#cancelNavigationHold();
    this.#suppressedNavigationClick = null;
    const display = displayWindow(this);
    const hold = {
      button: /** @type {HTMLButtonElement} */ (button),
      display,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      timer: 0,
      ready: false,
      action,
    };
    hold.timer = display.setTimeout(() => {
      hold.timer = 0;
      if (this.#navigationHold !== hold || !this.#events || this.#moving || !hold.button.isConnected) return;
      hold.ready = true;
      hold.button.setAttribute('data-hold-ready', '');
    }, this.holdDuration);
    this.#navigationHold = hold;
  }

  /**
   * Завершает один жест, снимает готовность и подавляет click после достигнутого порога либо отменённой прокрутки.
   * @param {boolean} [suppress=false] Подавить click также при отмене до порога, чтобы движение не исполнило короткую команду.
   * @returns {void} Команда не выполняется; таймер очищается в окне начала жеста.
   */
  #cancelNavigationHold(suppress = false) {
    const hold = this.#navigationHold;
    if (!hold) return;
    hold.display.clearTimeout(hold.timer);
    hold.button.removeAttribute('data-hold-ready');
    if (hold.ready || suppress) this.#suppressedNavigationClick = { button: hold.button, until: Date.now() + 1000 };
    this.#navigationHold = null;
  }

  /**
   * Передаёт второе действие только после отпускания действительного жеста, достигшего порога.
   * @param {PointerEvent} event Отпускание первичного указателя в нынешнем документе настроек.
   * @returns {void} Сначала снимает готовность и подавляет release-click, затем отправляет готовую команду Panel.
   */
  #releaseNavigationHold(event) {
    const hold = this.#navigationHold;
    if (!hold || hold.pointerId !== event.pointerId) return;
    const accepted = hold.ready && this.#events && !this.#moving && hold.button.isConnected;
    this.#cancelNavigationHold();
    if (accepted) this.dispatchEvent(new CustomEvent(hold.action, { bubbles: true, composed: true }));
  }

  /**
   * Отделяет короткое действие той же кнопки от release-click после удержания.
   * @param {MouseEvent} event Click той же кнопки; detail=0 сохраняет клавиатурное действие.
   * @param {'link-mode'|'bookmarks-open'|'search-open'} action Готовая команда короткого нажатия.
   * @returns {void} Подавляет один click прежней кнопки; обычное действие меняет режим либо открывает Panel.
   */
  #navigationClick(event, action) {
    const suppressed = this.#suppressedNavigationClick;
    if (
      event.detail > 0 && (this.#navigationHold?.button === event.currentTarget && this.#navigationHold.ready
        || suppressed?.button === event.currentTarget && Date.now() < suppressed.until)
    ) {
      event.preventDefault();
      this.#cancelNavigationHold();
      this.#suppressedNavigationClick = null;
      return;
    }
    this.#cancelNavigationHold();
    if (action === 'link-mode') this.cycleLinkMode();
    else this.dispatchEvent(new CustomEvent(action, { bubbles: true, composed: true }));
  }

  /**
   * Принимает только известный режим из поля; неподходящий ввод, отсоединение и перенос игнорируются.
   * @param {'history'|'search'} kind Настройка получателя раскрытия.
   * @param {unknown} value Нынешнее значение select, переданное молекулой выбора.
   * @returns {void} Допустимый выбор сохраняется и уведомляет Catalog через событие.
   */
  #changeTreeMode(kind, value) {
    if (!this.#events || this.#moving) return;
    const mode = readHistoryTreeMode(value);
    if (mode) this.#setTreeMode(kind, mode, true);
  }

  /**
   * Принимает только целый индекс готовой шкалы и передаёт выбранный срок, а не индекс, потребителям.
   * @param {unknown} value Строка range; внешние объекты, дробные и неизвестные позиции игнорируются.
   * @returns {void} Допустимое значение сохраняется; перенос или отсоединение оставляют прежний выбор.
   */
  #changeSourceHighlightDuration(value) {
    if (!this.#events || this.#moving || typeof value !== 'string' || !/^[0-7]$/.test(value)) return;
    const duration = sourceHighlightDurations[Number(value)];
    if (duration !== undefined) this.#setSourceHighlightDuration(duration, true);
  }

  /**
   * Принимает проверенный срок до события; адрес, закладки и таймер остаются у прежних владельцев.
   * @param {SourceHighlightDuration} duration Новый срок в миллисекундах либо null для бесконечности.
   * @param {boolean} [save=false] Сохранить скаляр браузера; false применяется для синхронизации другой вкладки.
   * @returns {void} Отказ записи показывается в меню, но живой выбор остаётся принятым.
   */
  #setSourceHighlightDuration(duration, save = false) {
    const previous = this.#sourceHighlightDuration;
    this.#sourceHighlightDuration = duration;
    this.#sourceHighlightMessage = '';
    if (save) {
      try {
        displayWindow(this.#home).localStorage.setItem(
          sourceHighlightDurationKey,
          duration === null ? 'infinity' : String(duration),
        );
      } catch {
        this.#sourceHighlightMessage = labels.navigationStorageFailed;
      }
    }
    this.requestUpdate();
    if (previous !== duration) {
      this.dispatchEvent(
        new CustomEvent('source-highlight-duration-change', { detail: duration, bubbles: true, composed: true }),
      );
    }
  }

  /**
   * Принимает проверенный выбор до события; открытость дерева меняет только Catalog.
   * @param {'history'|'search'} kind Отдельная настройка истории либо поиска.
   * @param {HistoryTreeMode} mode Новый допустимый режим раскрытия.
   * @param {boolean} [save=false] Сохранить скаляр localStorage; false используется для изменения другой вкладки.
   * @returns {void} Отказ записи показывается у поля, но не отменяет нынешний выбор.
   */
  #setTreeMode(kind, mode, save = false) {
    const history = kind === 'history';
    const previous = history ? this.#historyTreeMode : this.#searchTreeMode;
    let message = '';
    if (save) {
      try {
        displayWindow(this.#home).localStorage.setItem(history ? historyTreeModeKey : searchTreeModeKey, mode);
      } catch {
        message = labels.navigationStorageFailed;
      }
    }
    if (history) {
      this.#historyTreeMode = mode;
      this.#historyTreeMessage = message;
    } else {
      this.#searchTreeMode = mode;
      this.#searchTreeMessage = message;
    }
    this.requestUpdate();
    if (previous !== mode) {
      this.dispatchEvent(
        new CustomEvent(`${kind}-tree-mode-change`, {
          detail: mode,
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  /**
   * Принимает проверенные корень и режим в одном ходе; пустой корень снимает VS Code до уведомления потребителей.
   * @param {string} root Проверенный нормализованный путь; пустая строка выключает VS Code.
   * @param {import("../catalog/material-target.mjs").LinkMode} mode Запрошенный общий режим ссылок.
   * @param {boolean} [save=false] Записать оба значения в браузер; false используется для перечитывания другой вкладки.
   * @returns {void} Ошибка записи становится сообщением; принятое живое состояние и события сохраняются.
   */
  #setNavigation(root, mode, save = false) {
    const previousRoot = this.#organizationRoot;
    const previousMode = this.#linkMode;
    this.#organizationRoot = root;
    this.#linkMode = mode === 'vscode' && !root ? 'internal' : mode;
    if (save) {
      try {
        const storage = displayWindow(this.#home).localStorage;
        storage.setItem(organizationRootKey, root);
        storage.setItem(linkModeKey, this.#linkMode);
        this.#navigationMessage = '';
      } catch {
        this.#navigationMessage = labels.navigationStorageFailed;
      }
    }
    this.requestUpdate();
    if (previousRoot !== root) {
      this.dispatchEvent(new CustomEvent('organization-root-change', { detail: root, bubbles: true, composed: true }));
    }
    if (previousMode !== this.#linkMode) {
      this.dispatchEvent(
        new CustomEvent('link-mode-change', {
          detail: this.#linkMode,
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  /**
   * Переключает одно меню без стандартного действия summary; перенос и отсоединение запрещают действие.
   * @param {MouseEvent} event Нажатие summary меню.
   * @param {MenuName} name Меню цветов либо общих настроек.
   * @returns {void} Отменяет стандартное раскрытие и передаёт новый выбор прежнему setMenu при действующей привязке.
   */
  #menuClick(event, name) {
    event.preventDefault();
    if (!this.#events || this.#moving) return;
    this.#setMenu(name, !this[`${name}Expanded`]);
  }

  /**
   * Закрывает выбранное меню по Escape и возвращает его прежний подключённый фокус в том же документе.
   * @param {KeyboardEvent} event Событие внутри меню.
   * @param {MenuName} name Меню, которому принадлежит Escape.
   * @returns {void} Другие клавиши, перенос и отсоединение игнорируются.
   */
  #menuKey(event, name) {
    if (!this.#events || this.#moving || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    this.#setMenu(name, false);
    const focused = this.#menuFocus[name];
    if (focused?.isConnected && focused.ownerDocument === this.ownerDocument) focused.focus({ preventScroll: true });
  }

  /**
   * Открывает одно меню за раз; намерение раскрытия сохраняется отдельно до завершения движения.
   * @param {MenuName} name Меню цветов либо общих настроек.
   * @param {boolean} expanded Требуемая открытость меню.
   * @param {boolean} [immediate=false] Согласовать видимость сразу, без движения, например при отсоединении.
   * @returns {void} Прежний фокус сохраняется перед раскрытием; поздний завершитель сверяет нынешнее намерение.
   */
  #setMenu(name, expanded, immediate = false) {
    const intent = 'iconsExpanded';
    const visible = 'iconsOpen';
    if (this[intent] === expanded && !immediate) return;
    const menu = /** @type {HTMLDetailsElement|null} */ (this.renderRoot?.querySelector(`#${name}-menu`));
    const content = menu?.querySelector('.accent-picker, .icons-popover');
    const style = menu?.open && content ? displayWindow(this).getComputedStyle(content) : null;
    const from = { opacity: style?.opacity || '0', transform: style?.transform || 'translateY(-4px)' };
    if (content) this.#motion?.cancel(content);
    if (expanded) {
      this.#loadPreferencesMarkup();
      this.#updateTheme();
      this.dispatchEvent(new CustomEvent('settings-reveal', { bubbles: true }));
      this.#menuFocus[name] = deepFocus(this.ownerDocument);
    }
    this[intent] = expanded;
    if (immediate || !menu || !content || !this.#motion) {
      this[visible] = expanded;
      if (menu) menu.open = expanded;
      return;
    }
    if (expanded) {
      this[visible] = true;
      menu.open = true;
    }
    if (!menu.open) return;
    this.#motion.play(content, [from, {
      opacity: expanded ? 1 : 0,
      transform: expanded ? 'translateY(0)' : 'translateY(-4px)',
    }], {
      finish: () => {
        if (!this[intent]) {
          this[visible] = false;
          menu.open = false;
        }
      },
    });
  }

  /**
   * Читает HTML только при открытии преференсов или явном повторе.
   * @returns {void} Поздний ответ обновляет представление; состояние и сохранение настроек остаются независимыми.
   */
  #loadPreferencesMarkup() {
    if (screenReady('preferences') || this.#markupLoading) return;
    this.#markupLoading = true;
    this.#markupFailed = false;
    this.requestUpdate();
    void loadScreen('preferences')
      .catch(() => {
        this.#markupFailed = true;
      })
      .finally(() => {
        this.#markupLoading = false;
        if (this.isConnected && !this.#moving) this.requestUpdate();
      });
  }

  /**
   * Передаёт готовое состояние и обработчики единственному организму настроек, не создавая других владельцев.
   * @returns {import("lit").TemplateResult} Действия переходов и нынешние настройки для Lit.
   */
  render() {
    return renderPreferencesControls({
      label: labels.appearance,
      onMouseDown: event => this.#keepFocus(event),
      navigation: {
        items: [
          {
            id: 'site-bookmarks',
            label: ui.navigation.bookmarks,
            shortcut: 'N',
            icon: controlIcon('bookmarks'),
            onClick: event => this.#navigationClick(event, 'bookmarks-open'),
          },
          {
            id: 'site-search',
            label: ui.navigation.search,
            shortcut: 'F M',
            shortcutLabel: 'F / M',
            icon: controlIcon('search'),
            holdHint: ui.navigation.searchHistoryHold,
            onClick: event => this.#navigationClick(event, 'search-open'),
            onPointerDown: event => this.#startNavigationHold(event, 'search-history-open'),
            onPointerLeave: () => this.#cancelNavigationHold(true),
          },
        ],
        mode: {
          id: 'site-link-mode',
          label: ui.navigation[this.#linkMode],
          shortcut: 'B',
          icon: controlIcon(`link-${this.#linkMode}`),
          holdHint: ui.navigation.linkModeHold,
          onClick: event => this.#navigationClick(event, 'link-mode'),
          onPointerDown: event => this.#startNavigationHold(event, 'organization-root-open'),
          onPointerLeave: () => {
            this.#cancelNavigationHold(true);
          },
        },
      },
      font: {
        label: labels.textSize,
        smallerLabel: labels.decreaseTextSize,
        largerLabel: labels.increaseTextSize,
        smallerDisabled: this.fontIncrease === appearance.fontIncrease.min,
        largerDisabled: this.fontIncrease === appearance.fontIncrease.max,
        smallerIcon: controlIcon('text-smaller'),
        largerIcon: controlIcon('text-larger'),
        onSmaller: () => this.#changeFontSize(-appearance.fontIncrease.step),
        onLarger: () => this.#changeFontSize(appearance.fontIncrease.step),
      },
      icons: {
        hint: labels.iconVisibilityHint,
        label: labels.iconAndHold,
        open: this.iconsOpen,
        expanded: this.iconsExpanded,
        icon: controlIcon('icons'),
        shortcut: 'I',
        onClick: event => this.#menuClick(event, 'icons'),
        onKey: event => this.#menuKey(event, 'icons'),
        loadFailed: this.#markupFailed,
        retryLoad: () => this.#loadPreferencesMarkup(),
        options: {
          label: labels.iconVisibility,
          enabled: this.iconsEnabled,
          items: iconGroups.map(name => ({
            name,
            label: labels.icons[name],
            checked: this.icons[name],
            icon: groupedIcon(
              { repositories: 'repository', directories: 'directory', files: 'file-hx', symbols: 'symbol' }[name],
              name,
              this.icons,
            ),
          })),
          onChange: event => this.#changeIcons(event),
        },
        hold: {
          label: labels.holdDuration,
          ...appearance.holdDuration,
          value: this.holdDuration,
          valueLabel: `${this.holdDuration} ms`,
          onInput: event => this.#changeHoldDuration(event),
        },
        organization: {
          ...this.organizationRootControl,
          id: 'organization-root',
          onChange: event => this.#changeOrganizationRoot(event),
        },
        historyTree: {
          id: 'history-tree',
          label: labels.historyTree.label,
          hint: labels.historyTree.hint,
          value: this.#historyTreeMode,
          options: [
            { value: 'none', label: labels.historyTree.none },
            { value: 'temporary', label: labels.historyTree.temporary },
            { value: 'always', label: labels.historyTree.always },
          ],
          message: this.#historyTreeMessage,
          onChange: value => this.#changeTreeMode('history', value),
        },
        searchTree: {
          id: 'search-tree',
          label: labels.searchTree.label,
          hint: labels.searchTree.hint,
          value: this.#searchTreeMode,
          options: [
            { value: 'none', label: labels.searchTree.none },
            { value: 'temporary', label: labels.searchTree.temporary },
            { value: 'always', label: labels.searchTree.always },
          ],
          message: this.#searchTreeMessage,
          onChange: value => this.#changeTreeMode('search', value),
        },
      },
      colors: {
        accent: {
          label: labels.accentColor,
          hexLabel: labels.accentHexValue,
          value: this.accent,
          resetLabel: labels.resetAccentColor,
          resetDisabled: !this.customAccent,
          resetIcon: controlIcon('reset'),
          onReset: () => this.#resetAccent(),
          onInput: event => this.#setAccent(event),
        },
        mark: {
          label: labels.markBackground,
          hexLabel: labels.markBackgroundHex,
          value: this.markColor,
          resetLabel: labels.resetMarkBackground,
          resetDisabled: !this.customMark,
          resetIcon: controlIcon('reset'),
          onReset: () => this.#resetMark(),
          onInput: event => this.#setMark(event),
        },
        sourceHighlight: {
          label: labels.sourceHighlightTime,
          index: sourceHighlightDurations.indexOf(this.#sourceHighlightDuration),
          max: sourceHighlightDurations.length - 1,
          valueLabel: this.#sourceHighlightDuration === null
            ? labels.sourceHighlightInfinity
            : formatText(labels.sourceHighlightSeconds, { seconds: this.#sourceHighlightDuration / 1000 }),
          valueIcon: this.#sourceHighlightDuration === null ? controlIcon('infinity') : null,
          message: this.#sourceHighlightMessage,
          onInput: value => this.#changeSourceHighlightDuration(value),
        },
      },
      update: { label: ui.version.check, control: 'update-check' },
      access: {
        label: labels.manageTokens,
        dialogId: 'token-dialog',
        icon: controlIcon(this.tokenActive ? 'key' : 'key-slash'),
        onClick: () => this.dispatchEvent(new CustomEvent('tokens-open', { bubbles: true, composed: true })),
      },
      theme: {
        label: this.theme === 'dark' ? labels.switchLight : labels.switchDark,
        hint: this.theme === 'dark' ? labels.switchLightHint : labels.switchDarkHint,
        icon: controlIcon(this.theme === 'dark' ? 'moon' : 'sun'),
        shortcut: 'T',
        onClick: () => this.#toggleTheme(),
      },
    });
  }
}

/**
 * Находит фактический фокус через вложенные открытые ShadowRoot.
 * @param {Document} owner Документ, в котором сохраняется фокус до переноса или открытия меню.
 * @returns {HTMLElement|null} Самый глубокий HTML-элемент фокуса либо null.
 */
function deepFocus(owner) {
  let focused = owner.activeElement;
  while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
  return isHTMLElement(focused) ? focused : null;
}

customElements.define('site-preferences', SitePreferences);
/**
 * Явный выбор значков принят и сохранён; detail передаёт копию нынешних флагов потребителям.
 * @event SitePreferences#icons-change
 * @type {CustomEvent<import('../catalog/icons.mjs').IconSettings>}
 */
