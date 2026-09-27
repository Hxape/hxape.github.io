/** Хранит только адреса и положение чтения; правила принятия просмотра остаются у панели. */
import { readMaterialOrigin, readMaterialTarget, targetKey } from '../catalog/material-target.mjs';

/**
 * Проверяемый сериализуемый адрес; наличие записи не является доказательством доступа.
 * @typedef {import('../catalog/material-target.mjs').MaterialTarget} MaterialTarget
 */
/**
 * Проверенная регистрация репозитория либо библиотеки; ключ разделяет происхождение и нынешнюю область доступа.
 * @typedef {import('../catalog/material-target.mjs').Origin} MaterialOrigin
 */
/**
 * Сохранённая подпись материала без текста документа.
 * @typedef {Object} Title
 * @property {'repository'|'directory'|'file'|'symbol'} type Вид узла для отображения подписи.
 * @property {string} name Публикуемое или разрешённое пользователем имя материала.
 * @property {string} [kind] Необязательный точный вид объявления Haxe.
 */
/**
 * Сохранённые представление и прокрутка одного материала.
 * @typedef {Object} Reading
 * @property {'html'|'source'} mode Оформленный или буквальный текст документа.
 * @property {'documentation'|'source'|null} sourceMode Представление Haxe-файла; null для другого материала.
 * @property {string|null} type Ключ выбранной вкладки документа; null без принятой вкладки.
 * @property {number} scrollTop Вертикальное положение чтения в пикселях.
 * @property {number} scrollLeft Горизонтальное положение чтения в пикселях.
 */
/**
 * Только метаданные уже принятого просмотра; DOM, загрузчики, текст и PAT не входят.
 * @typedef {Object} EntryData
 * @property {MaterialTarget} target Адрес для повторного разрешения по нынешним правам.
 * @property {Title} title Подпись и вид материала.
 * @property {Reading} reading Представление и место чтения.
 */
/**
 * Метаданные истории или закладки с устойчивым id для курсора и перестановки.
 * @typedef {EntryData & {id:string,groupId?:string}} JournalEntry
 * @property {string} id Устойчивый идентификатор записи; не является адресом или доказательством доступа.
 * @property {string} [groupId] Именованная группа закладки; история не использует это поле.
 */
/**
 * Правила новых записей истории; принадлежит только этому журналу, не общим Preferences.
 * @typedef {Object} HistorySettings
 * @property {boolean} autoCollect Новые переходы записываются автоматически; false сохраняет накопленную историю для ручного управления.
 * @property {'all'|'merge'|'unique'} policy Все посещения, последовательные входы одного файла либо одна запись файла.
 * @property {boolean} includeView Смена представления допускается как переход той же выбранной политики.
 * @property {number} limit Максимальное число хранимых посещений от 1 до 500, по умолчанию 50.
 */
/**
 * Пользовательское имя и устойчивый id группы закладок, без текстов и runtime-значков.
 * @typedef {Object} BookmarkGroup
 * @property {string} id Стабильный ключ группы для закладок и текущего выбора.
 * @property {string} name Видимое пользовательское имя группы.
 */
/**
 * Запрет будущего автоматического сбора одного источника; не отзывает доступ и не содержит текста.
 * @typedef {Object} HistoryExclusion
 * @property {MaterialOrigin} origin Проверенный источник для сравнения будущих адресов.
 * @property {string} name Разрешённая подпись репозитория либо сохранённый скрытый alias проекта.
 */
/**
 * Проверяемый постоянный снимок журнала одного браузера.
 * @typedef {Object} JournalState
 * @property {1} version Версия формы JSON этого журнала.
 * @property {JournalEntry[]} history Адресная история в порядке обхода назад и вперёд.
 * @property {JournalEntry[]} bookmarks Закладки в выбранном пользователем порядке.
 * @property {string|null} cursor Id нынешней записи истории либо отсутствие выбранной записи.
 * @property {string|null} lastBookmark Id последней созданной или открытой закладки.
 * @property {boolean} bookmarkTree Выбранное представление закладок: true для дерева.
 * @property {HistorySettings} historySettings Правила автоматического сбора и предела новых посещений.
 * @property {BookmarkGroup[]} bookmarkGroups Именованные группы закладок в порядке создания.
 * @property {string} currentGroup Id группы для показа и новых закладок.
 * @property {HistoryExclusion[]} historyExclusions Запрещённые источники будущего автоматического сбора; прошлые посещения остаются.
 */
/**
 * Переносимая группа без идентификаторов конкретного браузера.
 * @typedef {Object} BookmarkTransferGroup
 * @property {string} name Проверенное имя для сопоставления при объединении всех групп.
 * @property {EntryData[]} bookmarks Адреса, подписи и положение чтения в порядке группы.
 */
/**
 * Различимые формы обмена одной группой и всеми группами закладок.
 * @typedef {{version:1,type:'bookmark-group',group:BookmarkTransferGroup}|{version:1,type:'bookmark-groups',groups:BookmarkTransferGroup[]}} BookmarkTransfer
 */
/**
 * Адресная часть обмена историей; запросы отдельно проверяет их владелец SearchState.
 * @typedef {Object} HistoryTransfer
 * @property {1} version Версия формы обмена.
 * @property {'history'} type Отличает историю от групп закладок.
 * @property {EntryData[]} history Все посещения без браузерных идентификаторов.
 * @property {number|null} cursor Индекс выбранного посещения либо отсутствие выбора.
 * @property {unknown} searchQueries Список завершённых запросов до отдельной проверки SearchState.
 */

/** Местный ключ проверенного metadata JSON; тексты файлов и доступа туда не записываются. */
const storageKey = 'site-navigation-journal-v1';
/** Начальная группа принимает прежние записи без изменения их адресов или id. */
const defaultGroup = 'default';

/**
 * Создаёт начальные правила записи истории отдельно от оформления страницы.
 * @returns {HistorySettings} Автоматический последовательный сбор, без смены вида, с пределом 50.
 */
function initialHistorySettings() {
  return { autoCollect: true, policy: 'merge', includeView: false, limit: 50 };
}

/**
 * Выделяет идентичность одного файла или нефайлового материала для объединения посещений.
 * @param {MaterialTarget} target Проверенный адрес; ref/path сохраняют регистр, origin разделяет права и регистрации.
 * @returns {string} Ключ без строки, объявления и якоря; каталог без README и корень имеют отдельные виды.
 */
export function historyFileKey(target) {
  const origin = [target.origin.kind, target.origin.id, target.origin.url.toLowerCase()];
  if (target.kind === 'repository') return JSON.stringify([...origin, 'repository']);
  const path = target.kind === 'directory' ? target.readmePath || target.path : target.path;
  const kind = target.kind === 'directory' && target.readmePath === null ? 'directory' : 'file';
  return JSON.stringify([...origin, kind, target.ref, path]);
}

/**
 * Выделяет идентичность репозитория в правилах сбора, не объединяя разные регистрации или права.
 * @param {MaterialOrigin} origin Проверенный источник адреса; регистр GitHub URL не отличает репозиторий.
 * @returns {string} Готовый ключ запрета без ref, пути, текста и доказательства доступа.
 */
export function historyRepositoryKey(origin) {
  return JSON.stringify([origin.kind, origin.id, origin.url.toLowerCase()]);
}

/**
 * Создаёт пустую форму журнала без выбранной истории или закладки.
 * @returns {JournalState} Новый снимок с пустыми списками и начальным представлением закладок.
 */
function emptyState() {
  return {
    version: 1,
    history: [],
    bookmarks: [],
    cursor: null,
    lastBookmark: null,
    bookmarkTree: false,
    historySettings: initialHistorySettings(),
    bookmarkGroups: [{ id: defaultGroup, name: 'Bookmarks' }],
    currentGroup: defaultGroup,
    historyExclusions: [],
  };
}

/**
 * Проверяет внешний объект до чтения его полей.
 * @param {unknown} value Неизвестное значение JSON, ещё не доверенное как запись.
 * @returns {value is Record<string,unknown>} true только для ненулевого объекта, который не является массивом.
 */
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Проверяет непустую подпись или ключ без управляющих символов.
 * @param {unknown} value Неизвестное значение строки из хранилища.
 * @param {number} limit Максимальное допустимое число символов.
 * @returns {value is string} true для строки в пределах длины и формата; false при отказе проверки.
 */
function text(value, limit) {
  return typeof value === 'string' && value.length > 0 && value.length <= limit
    && !/[\u0000-\u001f\u007f]/.test(value);
}

/**
 * Проверяет формат устойчивого id записи хранилища.
 * @param {unknown} value Неизвестный идентификатор из JSON.
 * @returns {value is string} true для ограниченной строки из букв, цифр и дефиса; формат не подтверждает наличие записи.
 */
function entryId(value) {
  return typeof value === 'string' && /^[a-z\d-]{1,100}$/i.test(value);
}

/**
 * Проверяет неизвестные правила журнала; отсутствие допускается только для прежнего снимка.
 * @param {unknown} value Внешнее поле historySettings либо undefined старой записи.
 * @returns {HistorySettings|null} Чистые допустимые правила, default для отсутствующего поля либо null при повреждении.
 */
function readHistorySettings(value) {
  if (value === undefined) return initialHistorySettings();
  if (
    !record(value) || typeof value.autoCollect !== 'boolean' || typeof value.includeView !== 'boolean'
    || value.policy !== 'all' && value.policy !== 'merge' && value.policy !== 'unique'
    || typeof value.limit !== 'number' || !Number.isInteger(value.limit) || value.limit < 1 || value.limit > 500
  ) return null;
  return { autoCollect: value.autoCollect, policy: value.policy, includeView: value.includeView, limit: value.limit };
}

/**
 * Проверяет адрес, подпись и чтение одной внешней записи и отбрасывает лишние поля.
 * @param {unknown} value Неизвестная запись истории или закладки из JSON.
 * @returns {JournalEntry|null} Чистая копия допустимых метаданных либо null при повреждении.
 */
function readEntry(value) {
  if (!record(value) || !entryId(value.id) || !record(value.title) || !record(value.reading)) return null;
  const target = readMaterialTarget(value.target);
  const title = value.title;
  const reading = value.reading;
  if (
    !target || typeof title.type !== 'string' || !['repository', 'directory', 'file', 'symbol'].includes(title.type)
    || !text(title.name, 1024) || title.kind !== undefined && !text(title.kind, 100)
    || typeof reading.mode !== 'string' || !['html', 'source'].includes(reading.mode)
    || ![null, 'documentation', 'source'].includes(/** @type {null|string} */ (reading.sourceMode))
    || reading.type !== null && !text(reading.type, 1024)
    || typeof reading.scrollTop !== 'number' || !Number.isFinite(reading.scrollTop) || reading.scrollTop < 0
    || typeof reading.scrollLeft !== 'number' || !Number.isFinite(reading.scrollLeft) || reading.scrollLeft < 0
  ) return null;
  return {
    id: value.id,
    target,
    title: {
      type: /** @type {Title['type']} */ (title.type),
      name: title.name,
      ...(typeof title.kind === 'string' ? { kind: title.kind } : {}),
    },
    reading: {
      mode: reading.mode === 'source' ? 'source' : 'html',
      sourceMode: reading.sourceMode === 'source'
        ? 'source'
        : reading.sourceMode === 'documentation'
        ? 'documentation'
        : null,
      type: reading.type === null ? null : /** @type {string} */ (reading.type),
      scrollTop: reading.scrollTop,
      scrollLeft: reading.scrollLeft,
    },
  };
}

/**
 * Проверяет переносимые метаданные без доверия к id и лишним полям входа.
 * @param {unknown} value Одна запись JSON обмена.
 * @returns {EntryData|null} Чистые адрес, подпись и чтение либо null при отказе.
 */
function readTransferEntry(value) {
  if (!record(value)) return null;
  const entry = readEntry({ ...value, id: 'transfer' });
  return entry ? { target: entry.target, title: entry.title, reading: entry.reading } : null;
}

/**
 * Проверяет целиком массив переносимых записей до изменения журнала.
 * @param {unknown} value Внешний список метаданных.
 * @returns {EntryData[]|null} Чистые копии в исходном порядке либо null при неверной записи.
 */
function readTransferEntries(value) {
  if (!Array.isArray(value)) return null;
  /** @type {EntryData[]} */
  const entries = [];
  for (const raw of /** @type {unknown[]} */ (value)) {
    const entry = readTransferEntry(raw);
    if (!entry) return null;
    entries.push(entry);
  }
  return entries;
}

/**
 * Проверяет форму, имена и глобальную уникальность адресов входящих групп.
 * @param {unknown} value JSON одной группы либо всех групп.
 * @returns {BookmarkTransfer|null} Весь проверенный переносимый снимок либо null без частичного принятия.
 */
export function readBookmarkTransfer(value) {
  if (!record(value) || value.version !== 1) return null;
  const sources = value.type === 'bookmark-group' ? [value.group] : value.type === 'bookmark-groups'
      && Array.isArray(value.groups)
    ? value.groups
    : null;
  if (!sources || !sources.length) return null;
  /** @type {BookmarkTransferGroup[]} */
  const groups = [];
  const names = new Set();
  const targets = new Set();
  for (const source of /** @type {unknown[]} */ (sources)) {
    if (!record(source) || !text(source.name, 100) || source.name !== source.name.trim() || names.has(source.name)) {
      return null;
    }
    const bookmarks = readTransferEntries(source.bookmarks);
    if (!bookmarks) return null;
    for (const entry of bookmarks) {
      const key = targetKey(entry.target);
      if (targets.has(key)) return null;
      targets.add(key);
    }
    names.add(source.name);
    groups.push({ name: source.name, bookmarks });
  }
  return value.type === 'bookmark-group'
    ? { version: 1, type: 'bookmark-group', group: groups[0] }
    : { version: 1, type: 'bookmark-groups', groups };
}

/**
 * Проверяет адресную историю и курсор; форму списка запросов проверяет SearchState до общей фиксации Panel.
 * @param {unknown} value Вставленный JSON с явным видом history и версией 1.
 * @returns {HistoryTransfer|null} Чистый адресный блок и ещё неизвестные searchQueries либо null при отказе.
 */
export function readHistoryTransfer(value) {
  if (!record(value) || value.version !== 1 || value.type !== 'history' || !('searchQueries' in value)) return null;
  const history = readTransferEntries(value.history);
  if (
    !history || value.cursor !== null
      && (typeof value.cursor !== 'number' || !Number.isInteger(value.cursor) || value.cursor < 0
        || value.cursor >= history.length)
  ) return null;
  return { version: 1, type: 'history', history, cursor: value.cursor, searchQueries: value.searchQueries };
}

/**
 * Убирает id, группу и возможные runtime-поля из выдаваемых метаданных.
 * @param {JournalEntry} entry Нынешняя проверенная запись внутреннего журнала.
 * @returns {EntryData} Самостоятельная сериализуемая копия; повреждённая внутренняя запись вызывает отказ.
 */
function transferEntry(entry) {
  const clean = readTransferEntry(entry);
  if (!clean) throw new Error('Invalid navigation metadata');
  return clean;
}

/**
 * Проверяет оба списка и курсоры до замены нынешнего журнала.
 * @param {unknown} value Неизвестный снимок JSON с версией формы.
 * @returns {JournalState|null} Проверенный снимок либо null для неверной формы, повторного id или чужого курсора.
 */
function readState(value) {
  if (
    !record(value) || value.version !== 1 || !Array.isArray(value.history) || !Array.isArray(value.bookmarks)
    || typeof value.bookmarkTree !== 'boolean'
  ) return null;
  /**
   * Проверяет один список записей и уникальность его идентификаторов.
   * @param {unknown[]} entries Внешний массив без доверия к форме каждого элемента.
   * @returns {JournalEntry[]|null} Чистые записи в исходном порядке либо null при любом отказе проверки.
   */
  const read = entries => {
    /** @type {JournalEntry[]} */
    const result = [];
    const ids = new Set();
    for (const source of entries) {
      const entry = readEntry(source);
      if (!entry || ids.has(entry.id)) return null;
      ids.add(entry.id);
      result.push(entry);
    }
    return result;
  };
  const history = read(value.history);
  const bookmarks = read(value.bookmarks);
  const historySettings = readHistorySettings(value.historySettings);
  /** @type {BookmarkGroup[]} */
  const bookmarkGroups = [];
  if (value.bookmarkGroups === undefined) bookmarkGroups.push({ id: defaultGroup, name: 'Bookmarks' });
  else {
    if (!Array.isArray(value.bookmarkGroups) || !value.bookmarkGroups.length) return null;
    for (const group of /** @type {unknown[]} */ (value.bookmarkGroups)) {
      if (
        !record(group) || !entryId(group.id) || !text(group.name, 100)
        || bookmarkGroups.some(item => item.id === group.id)
      ) return null;
      bookmarkGroups.push({ id: group.id, name: group.name });
    }
  }
  const currentGroup = value.currentGroup === undefined ? defaultGroup : value.currentGroup;
  if (!entryId(currentGroup) || !bookmarkGroups.some(group => group.id === currentGroup)) return null;
  if (bookmarks) {
    for (let index = 0; index < bookmarks.length; index++) {
      const raw = /** @type {unknown} */ (value.bookmarks[index]);
      const groupId = record(raw) && raw.groupId !== undefined ? raw.groupId : defaultGroup;
      if (!entryId(groupId) || !bookmarkGroups.some(group => group.id === groupId)) return null;
      bookmarks[index].groupId = groupId;
    }
  }
  /** @type {HistoryExclusion[]} */
  const historyExclusions = [];
  if (value.historyExclusions !== undefined) {
    if (!Array.isArray(value.historyExclusions)) return null;
    for (const raw of /** @type {unknown[]} */ (value.historyExclusions)) {
      if (!record(raw) || !text(raw.name, 1024)) return null;
      const origin = readMaterialOrigin(raw.origin);
      if (
        !origin || historyExclusions.some(item => historyRepositoryKey(item.origin) === historyRepositoryKey(origin))
      ) return null;
      historyExclusions.push({ origin, name: raw.name });
    }
  }
  if (
    !history || !bookmarks || !historySettings
    || value.cursor !== null && (!entryId(value.cursor) || !history.some(entry => entry.id === value.cursor))
    || value.lastBookmark !== null
      && (!entryId(value.lastBookmark) || !bookmarks.some(entry => entry.id === value.lastBookmark))
  ) {
    return null;
  }
  return {
    version: 1,
    history,
    bookmarks,
    cursor: /** @type {string|null} */ (value.cursor),
    lastBookmark: /** @type {string|null} */ (value.lastBookmark),
    bookmarkTree: value.bookmarkTree,
    historySettings,
    bookmarkGroups,
    currentGroup,
    historyExclusions,
  };
}

/** Пассивный журнал не открывает материалы, не знает DOM и не подтверждает доступ. */
export class NavigationJournal {
  /**
   * Нынешние проверенные метаданные журнала; изменяются только его методами по решению панели.
   */
  #state = emptyState();
  /**
   * Хранилище браузера, переданное панелью; null означает недоступность API для этого экземпляра.
   * @type {Storage|null}
   */
  #storage;
  /**
   * Последний отказ чтения/записи или повреждение JSON; используется панелью для сообщения и повтора.
   * @type {'storage'|'corrupt'|null}
   */
  #failure = null;
  /**
   * Запрет перезаписывать непроверенное прежнее хранилище после отказа чтения или повреждения.
   */
  #blockedWrite = false;

  /**
   * Создаёт пассивный журнал и однократно читает прежнюю запись браузера.
   * @param {Storage|null} storage Переданное панелью Storage либо null без доступного API.
   */
  constructor(storage) {
    this.#storage = storage;
    this.reload();
  }

  /**
   * Предоставляет нынешний порядок метаданных истории для представления панели.
   * @returns {JournalEntry[]} Массив записей журнала; изменять порядок следует через его операции.
   */
  get history() {
    return this.#state.history;
  }
  /**
   * Предоставляет метаданные закладок в порядке пользовательского обхода.
   * @returns {JournalEntry[]} Нынешний массив закладок; открытия или загрузки не выполняются.
   */
  get bookmarks() {
    return this.#state.bookmarks;
  }
  /**
   * Предоставляет устойчивый id нынешней записи истории.
   * @returns {string|null} Id либо null, если выбранная запись отсутствует.
   */
  get cursor() {
    return this.#state.cursor;
  }
  /**
   * Предоставляет сохранённый выбор вида закладок.
   * @returns {boolean} true для дерева, false для списка.
   */
  get bookmarkTree() {
    return this.#state.bookmarkTree;
  }
  /**
   * Предоставляет копию настроек сбора только этого виджета истории.
   * @returns {HistorySettings} Текущие scalar values; менять их следует через setHistorySettings.
   */
  get historySettings() {
    return { ...this.#state.historySettings };
  }
  /**
   * Предоставляет проверенные запреты автоматического сбора без раскрытия исходников или доказательств доступа.
   * @returns {HistoryExclusion[]} Копии источников и разрешённых подписей для списка исключений.
   */
  get historyExclusions() {
    return this.#state.historyExclusions.map(item => ({ ...item, origin: { ...item.origin } }));
  }

  /**
   * Проверяет только правило сбора истории для данного источника.
   * @param {MaterialOrigin} origin Проверенная регистрация материала; это не запрос GitHub-доступа.
   * @returns {boolean} true при запрете будущего автоматического сбора этого источника.
   */
  repositoryExcluded(origin) {
    const key = historyRepositoryKey(origin);
    return this.#state.historyExclusions.some(item => historyRepositoryKey(item.origin) === key);
  }

  /**
   * Добавляет либо снимает запрет новых автоматических посещений, сохраняя прошлую историю.
   * @param {unknown} value Источник адреса до проверки формы; лишние поля не сохраняются.
   * @param {boolean} excluded true запрещает будущий сбор, false снимает запрет.
   * @param {unknown} name Разрешённое видимое имя или скрытый alias; не выводится из закрытого пути.
   * @returns {boolean} true после принятия правила; false при неверном источнике или подписи. Доступ, тексты и закладки не меняются.
   */
  setRepositoryExcluded(value, excluded, name) {
    const origin = readMaterialOrigin(value);
    if (!origin || !text(name, 1024)) return false;
    const key = historyRepositoryKey(origin);
    this.#state.historyExclusions = this.#state.historyExclusions.filter(item =>
      historyRepositoryKey(item.origin) !== key
    );
    if (excluded) this.#state.historyExclusions.push({ origin, name });
    this.#save();
    return true;
  }

  /**
   * Снимает выбранный запрет из подготовленного списка источников.
   * @param {string} id Canonical key, подготовленный из нынешней проверенной записи списка.
   * @returns {boolean} true после удаления существующего правила; false для чужого id.
   */
  unblockRepository(id) {
    const current = this.#state.historyExclusions.find(item => historyRepositoryKey(item.origin) === id);
    return current ? this.setRepositoryExcluded(current.origin, false, current.name) : false;
  }
  /**
   * Предоставляет имена и id пользовательских групп без записей материалов.
   * @returns {BookmarkGroup[]} Копии метаданных групп в прежнем порядке.
   */
  get bookmarkGroups() {
    return this.#state.bookmarkGroups.map(group => ({ ...group }));
  }
  /**
   * Предоставляет выбранную группу для новых закладок и внутригруппового обхода.
   * @returns {string} Id существующей группы.
   */
  get currentGroup() {
    return this.#state.currentGroup;
  }

  /**
   * Проверяет и сохраняет изменения настроек истории, не применяя новую политику к прежним посещениям задним числом.
   * @param {unknown} changes Неизвестный объект scalar изменений от controls; неверная форма не принимается.
   * @returns {boolean} true после принятия правил и предела; false при повреждённом вводе. Уменьшение предела удаляет старейшие посещения и чинит cursor.
   */
  setHistorySettings(changes) {
    if (!record(changes)) return false;
    const settings = readHistorySettings({ ...this.#state.historySettings, ...changes });
    if (!settings) return false;
    const changedLimit = settings.limit !== this.#state.historySettings.limit;
    this.#state.historySettings = settings;
    if (changedLimit) this.#limitHistory();
    this.#save();
    return true;
  }

  /**
   * Удаляет только накопленную историю, сохраняя настройки, закладки и группы.
   * @returns {void} Очищает список и cursor; отменой ожидающих операций владеет Panel.
   */
  clearHistory() {
    this.#state.history = [];
    this.#state.cursor = null;
    this.#save();
  }

  /**
   * Ограничивает принятый список фактическим пределом, не оставляя cursor на удалённой записи.
   * @returns {void} Удаляет старейшие посещения; закладки и lastBookmark не меняются.
   */
  #limitHistory() {
    const excess = this.#state.history.length - this.#state.historySettings.limit;
    if (excess > 0) this.#state.history.splice(0, excess);
    if (this.#state.cursor && !this.historyEntry(this.#state.cursor)) this.#state.cursor = null;
  }

  /**
   * Выбирает существующую группу закладок и сохраняет этот выбор.
   * @param {string} id Устойчивый id, переданный готовым списком групп.
   * @returns {boolean} true для существующей группы; false для чужого id.
   */
  selectGroup(id) {
    if (!this.#state.bookmarkGroups.some(group => group.id === id)) return false;
    this.#state.currentGroup = id;
    this.#save();
    return true;
  }

  /**
   * Создаёт именованную группу и выбирает её для следующих новых закладок.
   * @param {unknown} value Имя из поля; принимается непустая строка без управляющих символов до 100 знаков.
   * @returns {BookmarkGroup|null} Новая группа либо null при неверном или повторном имени.
   */
  createGroup(value) {
    const name = typeof value === 'string' ? value.trim() : '';
    if (!text(name, 100) || this.#state.bookmarkGroups.some(group => group.name === name)) return null;
    const group = { id: crypto.randomUUID(), name };
    this.#state.bookmarkGroups.push(group);
    this.#state.currentGroup = group.id;
    this.#save();
    return { ...group };
  }

  /**
   * Меняет только имя существующей пользовательской группы.
   * @param {string} id Id выбранной группы.
   * @param {unknown} value Новое имя поля; пустые, длинные и управляющие строки отвергаются.
   * @returns {boolean} true после принятия имени; false при отсутствии группы или конфликте имени.
   */
  renameGroup(id, value) {
    const group = this.#state.bookmarkGroups.find(item => item.id === id);
    const name = typeof value === 'string' ? value.trim() : '';
    if (!group || !text(name, 100) || this.#state.bookmarkGroups.some(item => item.id !== id && item.name === name)) {
      return false;
    }
    group.name = name;
    this.#save();
    return true;
  }

  /**
   * Удаляет группу вместе с её закладками при наличии другой группы для выбора.
   * @param {string} id Id группы, запрошенной пользователем.
   * @returns {boolean} true после удаления; false для последней или отсутствующей группы. Подтверждением владеет Panel.
   */
  deleteGroup(id) {
    if (
      this.#state.bookmarkGroups.length < 2 || !this.#state.bookmarkGroups.some(group => group.id === id)
    ) return false;
    this.#state.bookmarkGroups = this.#state.bookmarkGroups.filter(group => group.id !== id);
    this.#state.bookmarks = this.#state.bookmarks.filter(entry => entry.groupId !== id);
    if (!this.#state.bookmarks.some(entry => entry.id === this.#state.lastBookmark)) this.#state.lastBookmark = null;
    if (this.#state.currentGroup === id) this.#state.currentGroup = this.#state.bookmarkGroups[0].id;
    this.#save();
    return true;
  }

  /**
   * Выдаёт одну выбранную группу либо все группы без местных id и содержимого материалов.
   * @param {boolean} [all] true выгружает все группы; false только нынешнюю выбранную.
   * @returns {BookmarkTransfer} Новый переносимый JSON-объект с явным видом и версией.
   */
  exportBookmarks(all = false) {
    const groups = this.#state.bookmarkGroups.filter(group => all || group.id === this.#state.currentGroup).map(
      group => ({
        name: group.name,
        bookmarks: this.#state.bookmarks.filter(entry => entry.groupId === group.id).map(transferEntry),
      }),
    );
    return all
      ? { version: 1, type: 'bookmark-groups', groups }
      : { version: 1, type: 'bookmark-group', group: groups[0] };
  }

  /**
   * Объединяет или заменяет проверенные закладки у прежнего владельца.
   * @param {unknown} value Полный JSON обмена; одна группа сопоставляется по точному имени либо создаётся и выбирается после проверки.
   * @param {unknown} mode merge сохраняет существующие адреса и добавляет новые; replace заменяет группу с именем из JSON либо все группы по виду JSON.
   * @returns {boolean} true после общей фиксации; false при неверной форме или режиме. Совпадающий адрес в другой группе сохраняет её принадлежность.
   */
  importBookmarks(value, mode) {
    if (mode !== 'merge' && mode !== 'replace') return false;
    const incoming = readBookmarkTransfer(value);
    if (!incoming) return false;
    const all = incoming.type === 'bookmark-groups';
    const sources = incoming.type === 'bookmark-group' ? [incoming.group] : incoming.groups;
    const groups = all && mode === 'replace' ? [] : this.bookmarkGroups;
    const destination = !all ? groups.find(group => group.name === sources[0].name) : null;
    const bookmarks = mode === 'merge' ? [...this.#state.bookmarks] : all
      ? []
      : this.#state.bookmarks.filter(entry => entry.groupId !== destination?.id);
    const targets = new Set(bookmarks.map(entry => targetKey(entry.target)));
    let selectedGroup = this.#state.currentGroup;
    for (const source of sources) {
      let group = groups.find(item => item.name === source.name);
      if (!group) {
        group = { id: crypto.randomUUID(), name: source.name };
        groups.push(group);
      }
      if (!all) selectedGroup = group.id;
      for (const entry of source.bookmarks) {
        const key = targetKey(entry.target);
        if (targets.has(key)) continue;
        targets.add(key);
        bookmarks.push({ ...entry, id: crypto.randomUUID(), groupId: group.id });
      }
    }
    this.#state = {
      ...this.#state,
      bookmarks,
      bookmarkGroups: groups,
      currentGroup: groups.some(group => group.id === selectedGroup) ? selectedGroup : groups[0].id,
      lastBookmark: bookmarks.some(entry => entry.id === this.#state.lastBookmark) ? this.#state.lastBookmark : null,
    };
    this.#save();
    return true;
  }

  /**
   * Выгружает все адресные посещения и переданную историю завершённых поисков.
   * @param {ReadonlyArray<string>} queries Готовые строки единственного SearchState; его настройки и текущий ввод не включаются.
   * @returns {HistoryTransfer} Копия метаданных и числового курсора без материалов и местных id.
   */
  exportHistory(queries) {
    const cursor = this.#state.history.findIndex(entry => entry.id === this.#state.cursor);
    return {
      version: 1,
      type: 'history',
      history: this.#state.history.map(transferEntry),
      cursor: cursor < 0 ? null : cursor,
      searchQueries: [...queries],
    };
  }

  /**
   * Заменяет только адресную историю после проверки всего адресного блока.
   * @param {unknown} value JSON обмена history; Panel обязан отдельно проверить searchQueries до вызова обоих владельцев.
   * @returns {boolean} true после замены всех посещений и cursor; false при неверной форме. Настройки сбора и закладки сохраняются.
   */
  importHistory(value) {
    const incoming = readHistoryTransfer(value);
    if (!incoming) return false;
    const history = incoming.history.map(entry => ({ ...entry, id: crypto.randomUUID() }));
    this.#state.history = history;
    this.#state.cursor = incoming.cursor === null ? null : history[incoming.cursor].id;
    this.#save();
    return true;
  }

  /**
   * Явно назначает закладку существующей группе; перетаскивание этого действия не выполняет.
   * @param {string} id Устойчивый id закладки.
   * @param {string} groupId Id новой группы назначения.
   * @returns {boolean} true после назначения; false при чужой закладке или группе.
   */
  assignGroup(id, groupId) {
    const entry = this.#state.bookmarks.find(item => item.id === id);
    if (!entry || !this.#state.bookmarkGroups.some(group => group.id === groupId)) return false;
    entry.groupId = groupId;
    this.#save();
    return true;
  }
  /**
   * Предоставляет последний отказ хранилища для сообщения владельца.
   * @returns {'storage'|'corrupt'|null} storage, corrupt или null после успешной операции.
   */
  get failure() {
    return this.#failure;
  }

  /**
   * Читает и проверяет постоянный JSON до замены нынешних метаданных.
   * @returns {void} При успехе заменяет состояние; при отказе сохраняет нынешнее и блокирует перезапись прежней записи.
   */
  reload() {
    try {
      if (!this.#storage) throw new Error('Browser storage is unavailable');
      const source = this.#storage.getItem(storageKey);
      /** @type {unknown} */
      let parsed;
      try {
        parsed = source === null ? null : JSON.parse(source);
      } catch {
        this.#failure = 'corrupt';
        this.#blockedWrite = true;
        return;
      }
      const state = source === null ? emptyState() : readState(parsed);
      if (!state) {
        this.#failure = 'corrupt';
        this.#blockedWrite = true;
        return;
      }
      this.#state = state;
      this.#failure = null;
      this.#blockedWrite = false;
    } catch {
      this.#failure = 'storage';
      this.#blockedWrite = true;
    }
  }

  /**
   * Повторяет нужную операцию хранилища по виду предыдущего отказа.
   * @returns {void} После непроверенного чтения перечитывает; после отказа записи повторно сохраняет нынешние метаданные.
   */
  retryStorage() {
    if (this.#blockedWrite) this.reload();
    else this.#save();
  }

  /**
   * Явно заменяет повреждённый журнал пустым после решения пользователя.
   * @returns {void} Сбрасывает списки и снимает запрет записи; отказ сохранения остаётся виден через failure.
   */
  discardStored() {
    this.#state = emptyState();
    this.#blockedWrite = false;
    this.#save();
  }

  /**
   * Сохраняет нынешние метаданные, не затирая непроверенную запись после отказа чтения.
   * @returns {void} При успехе снимает ошибку; при отказе сохраняет данные в памяти и выставляет storage.
   */
  #save() {
    if (this.#blockedWrite) return;
    try {
      if (!this.#storage) throw new Error('Browser storage is unavailable');
      this.#storage.setItem(storageKey, JSON.stringify(this.#state));
      this.#failure = null;
    } catch {
      this.#failure = 'storage';
    }
  }

  /**
   * Находит запись истории по устойчивому id, независимо от её позиции.
   * @param {string} id Id записи, выбранной представлением или курсором.
   * @returns {JournalEntry|null} Нынешняя запись либо null, если её удалили или она не существует.
   */
  historyEntry(id) {
    return this.#state.history.find(entry => entry.id === id) || null;
  }

  /**
   * Находит закладку по каноническому адресу материала.
   * @param {MaterialTarget} target Проверенный адрес, в том числе декларация или source с той же строкой.
   * @returns {JournalEntry|null} Закладка совпадающего targetKey либо null; доступ к материалу не проверяется.
   */
  bookmarkFor(target) {
    const key = targetKey(target);
    return this.#state.bookmarks.find(entry => targetKey(entry.target) === key) || null;
  }

  /**
   * Выбирает метаданные соседней записи без изменения курсора.
   * @param {-1|1} direction -1 для назад, 1 для вперёд в нынешнем порядке списка.
   * @returns {JournalEntry|null} Соседняя запись либо null; без курсора назад выбирает последнюю запись.
   */
  adjacentHistory(direction) {
    const index = this.#state.history.findIndex(entry => entry.id === this.#state.cursor);
    if (index < 0) return direction === -1 ? this.#state.history.at(-1) || null : null;
    return this.#state.history[index + direction] || null;
  }

  /**
   * Фиксирует уже принятый панелью просмотр, сохраняя только его метаданные.
   * @param {EntryData} data Подпись, адрес и чтение принятого материала без runtime-содержимого.
   * @param {'push'|'replace'|'restore'} visit push добавляет переход, replace обновляет нынешний, restore выбирает существующий id.
   * @param {string|null} [recordId] Id связанной записи при restore/replace; null запрещает выбирать чужой cursor, отсутствие допускает нынешний cursor.
   * @param {{force?:boolean,view?:boolean}} [options] force допускает ручной сбор при выключенном auto; view подчиняет смену представления includeView и той же политике.
   * @returns {JournalEntry|null} Связанный с реально принятым материалом entry либо null при паузе/чужом restore; restore не переставляет, merge объединяет только нынешний вход файла.
   */
  accept(data, visit = 'push', recordId, { force = false, view = false } = {}) {
    const current = this.#state.history.findIndex(entry => entry.id === this.#state.cursor);
    const key = historyFileKey(data.target);
    /** @type {JournalEntry|null} */
    let accepted = null;
    if (visit === 'restore') {
      const restored = recordId && this.historyEntry(recordId);
      if (!restored) return null;
      this.#state.cursor = restored.id;
      accepted = restored;
    } else if (visit === 'replace' || view && !this.#state.historySettings.includeView) {
      const entry = recordId === undefined
        ? current >= 0 ? this.#state.history[current] : null
        : recordId
        ? this.historyEntry(recordId)
        : null;
      if (!entry || historyFileKey(entry.target) !== key) return null;
      Object.assign(entry, data);
      accepted = entry;
    } else if (
      current >= 0 && targetKey(this.#state.history[current].target) === targetKey(data.target)
      && (!this.#state.historySettings.includeView
        || this.#state.history[current].reading.mode === data.reading.mode
          && this.#state.history[current].reading.sourceMode === data.reading.sourceMode)
    ) {
      accepted = this.#state.history[current];
      Object.assign(accepted, data);
    } else if (!force && (!this.#state.historySettings.autoCollect || this.repositoryExcluded(data.target.origin))) {
      this.#state.cursor = null;
    } else {
      const policy = this.#state.historySettings.policy;
      if (policy === 'merge' && current >= 0 && historyFileKey(this.#state.history[current].target) === key) {
        accepted = this.#state.history[current];
        Object.assign(accepted, data);
      } else {
        if (current >= 0) this.#state.history.splice(current + 1);
        if (policy === 'unique') {
          accepted = this.#state.history.filter(entry => historyFileKey(entry.target) === key).at(-1) || null;
          this.#state.history = this.#state.history.filter(entry => historyFileKey(entry.target) !== key);
        }
        accepted = Object.assign(accepted || { ...data, id: crypto.randomUUID() }, data);
        this.#state.history.push(accepted);
        // Старый снимок может превышать новый начальный предел: pause/restore/replace не удаляют его записи без нового входа.
        this.#limitHistory();
      }
      this.#state.cursor = accepted.id;
    }
    this.#save();
    return accepted && this.historyEntry(accepted.id);
  }

  /**
   * Возвращает успешно открываемую удаляемую запись в конец, сохраняя всё прежнее продолжение истории.
   * @param {EntryData} data Метаданные реально принятого материала без текста, DOM или загрузчика.
   * @param {string} id Id записи, выбранной до истечения срока отмены удаления.
   * @returns {JournalEntry} Переносит существующий id либо возвращает удалённый, ставит курсор на конец и сохраняет снимок в пределах limit.
   */
  appendRestored(data, id) {
    const key = historyFileKey(data.target);
    this.#state.history = this.#state.history.filter(entry =>
      entry.id !== id
      && (this.#state.historySettings.policy !== 'unique' || historyFileKey(entry.target) !== key)
    );
    this.#state.history.push({ ...data, id });
    this.#state.cursor = id;
    this.#limitHistory();
    this.#save();
    return /** @type {JournalEntry} */ (this.historyEntry(id));
  }

  /**
   * Сохраняет представление и место чтения текущего материала без нового посещения.
   * @param {EntryData} data Нынешние адрес, подпись и положение чтения, спроецированные панелью.
   * @param {string|null|undefined} id Id, связанный Panel с этим принятым view; без аргумента выбирается нынешний cursor, null означает материал без записи.
   * @returns {void} Обновляет только существующий связанный entry того же файла; пауза нового B не превращает прежний A в B.
   */
  updateCurrent(data, id = this.#state.cursor) {
    const entry = id && this.historyEntry(id);
    if (!entry || historyFileKey(entry.target) !== historyFileKey(data.target)) return;
    Object.assign(entry, data);
    this.#save();
  }

  /**
   * Создаёт закладку адреса либо выбирает его существующую закладку.
   * @param {EntryData} data Только адрес, подпись и чтение принятого материала.
   * @returns {JournalEntry} Существующая или новая закладка; становится последней созданной/открытой без текста материала.
   */
  addBookmark(data) {
    let entry = this.bookmarkFor(data.target);
    if (!entry) {
      entry = { ...data, id: crypto.randomUUID(), groupId: this.#state.currentGroup };
      this.#state.bookmarks.push(entry);
    }
    this.#state.lastBookmark = entry.id;
    this.#save();
    return entry;
  }

  /**
   * Переносит существующую закладку на новый адрес, сохраняя её id и порядок.
   * @param {string} id Id перемещаемой закладки; неизвестный id не создаёт запись.
   * @param {EntryData} data Проверенные адрес, подпись и место чтения без текста, DOM или загрузчика.
   * @returns {boolean} true после сохранения; false для отсутствующей записи или адреса, занятого другой закладкой.
   */
  moveBookmark(id, data) {
    const entry = this.#state.bookmarks.find(item => item.id === id);
    const occupied = this.bookmarkFor(data.target);
    if (!entry || occupied && occupied.id !== id) return false;
    Object.assign(entry, data);
    this.#save();
    return true;
  }

  /**
   * Удаляет закладку канонического адреса.
   * @param {MaterialTarget} target Адрес удаления, обычно нынешний нижний адрес.
   * @returns {boolean} true при удалении; false, если закладка этого адреса отсутствует.
   */
  removeBookmark(target) {
    const entry = this.bookmarkFor(target);
    if (!entry) return false;
    this.remove('bookmarks', entry.id);
    return true;
  }

  /**
   * Фиксирует последнюю успешно открытую закладку.
   * @param {string} id Id закладки после успешного перехода панели.
   * @returns {void} Меняет lastBookmark только для ещё существующего id.
   */
  rememberBookmark(id) {
    if (!this.#state.bookmarks.some(entry => entry.id === id)) return;
    this.#state.lastBookmark = id;
    this.#save();
  }

  /**
   * Находит последнюю созданную или открытую закладку.
   * @returns {JournalEntry|null} Её метаданные либо null без действующего id.
   */
  lastBookmark() {
    return this.#state.bookmarks.find(entry => entry.id === this.#state.lastBookmark) || null;
  }

  /**
   * Выбирает соседнюю закладку для циклического обхода.
   * @param {-1|1} direction -1 для предыдущей, 1 для следующей относительно lastBookmark.
   * @returns {JournalEntry|null} Метаданные выбранной позиции с обходом границы; null для пустого списка.
   */
  adjacentBookmark(direction) {
    const entries = this.#state.bookmarks.filter(entry => entry.groupId === this.#state.currentGroup);
    if (!entries.length) return null;
    const index = entries.findIndex(entry => entry.id === this.#state.lastBookmark);
    return entries[
      index < 0
        ? direction === 1 ? 0 : entries.length - 1
        : (index + direction + entries.length) % entries.length
    ];
  }

  /**
   * Удаляет запись выбранного списка без закрытия нынешнего просмотра.
   * @param {'history'|'bookmarks'} list История или закладки, изменяемые по решению панели.
   * @param {string} id Устойчивый id удаляемой записи.
   * @returns {void} Очищает соответствующий курсор, если удалён его id, и сохраняет новый снимок.
   */
  remove(list, id) {
    this.#state[list] = this.#state[list].filter(entry => entry.id !== id);
    if (list === 'history' && this.#state.cursor === id) this.#state.cursor = null;
    if (list === 'bookmarks' && this.#state.lastBookmark === id) this.#state.lastBookmark = null;
    this.#save();
  }

  /**
   * Переставляет запись, сохраняя привязку курсоров к id.
   * @param {'history'|'bookmarks'} list Список истории или закладок для перестановки.
   * @param {string} id Id переносимой записи.
   * @param {string} before Id позиции вставки; пустая строка означает конец списка.
   * @returns {void} Меняет порядок лишь при существующих id; повтор самой позиции и неизвестные id пропускает.
   */
  reorder(list, id, before) {
    if (id === before) return;
    const entries = this.#state[list];
    const source = entries.findIndex(entry => entry.id === id);
    if (source < 0 || before !== '' && !entries.some(entry => entry.id === before)) return;
    if (list === 'bookmarks') {
      const groupId = entries[source].groupId;
      const destination = before ? entries.find(entry => entry.id === before) : null;
      if (groupId !== this.#state.currentGroup || destination && destination.groupId !== groupId) return;
      const group = entries.filter(entry => entry.groupId === groupId);
      const [entry] = group.splice(group.findIndex(item => item.id === id), 1);
      group.splice(before === '' ? group.length : group.findIndex(item => item.id === before), 0, entry);
      let position = 0;
      this.#state.bookmarks = entries.map(item => item.groupId === groupId ? group[position++] : item);
      this.#save();
      return;
    }
    const [entry] = entries.splice(source, 1);
    entries.splice(before === '' ? entries.length : entries.findIndex(item => item.id === before), 0, entry);
    this.#save();
  }

  /**
   * Переключает сохраняемый вид закладок между списком и деревом.
   * @returns {void} Меняет только bookmarkTree и сохраняет снимок, не создавая просмотр.
   */
  toggleBookmarkTree() {
    this.#state.bookmarkTree = !this.#state.bookmarkTree;
    this.#save();
  }
}
