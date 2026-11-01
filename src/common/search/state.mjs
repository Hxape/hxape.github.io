/** Сохраняет запрос и историю одного поиска; область и момент фиксации выбирает владелец. */

const queryLimit = 50;

/**
 * Постоянные данные поиска, независимо от материала и временного ограничения выделением.
 * @typedef {Object} SearchMetadata
 * @property {string} latest Последняя введённая строка, в том числе при выключенном сборе истории.
 * @property {boolean} collecting Следующее явное commit вправе добавить непустой запрос в историю.
 * @property {ReadonlyArray<string>} queries Уникальные точные строки от последнего зафиксированного запроса к прежним; не более 50.
 */

/**
 * Создаёт начальные данные без прежних запросов; сбор включён до выбора пользователя.
 * @returns {SearchMetadata} Пустая последняя строка и неизменяемый пустой список.
 */
function emptyMetadata() {
  return { latest: '', collecting: true, queries: Object.freeze([]) };
}

/**
 * Проверяет внешний JSON перед принятием трёх полей постоянных данных поиска.
 * @param {unknown} value Разобранная запись браузера до проверки обязательных полей.
 * @returns {SearchMetadata|null} Только проверенные строки и признак сбора; null при повреждённой форме, повторе или превышении предела.
 */
function readMetadata(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('latest' in value) ||
    typeof value.latest !== 'string' ||
    !('collecting' in value) ||
    typeof value.collecting !== 'boolean' ||
    !('queries' in value)
  )
    return null;
  const queries = readSearchQueries(value.queries);
  return queries ? { latest: value.latest, collecting: value.collecting, queries: Object.freeze(queries) } : null;
}

/**
 * Проверяет весь внешний список завершённых запросов до изменения поиска или адресной истории.
 * @param {unknown} value Список из браузерного хранилища либо JSON обмена историей.
 * @returns {string[]|null} Новые точные уникальные строки в прежнем порядке, не более 50; null при неверной форме.
 */
export function readSearchQueries(value) {
  if (!Array.isArray(value) || value.length > queryLimit) return null;
  const entries = /** @type {unknown[]} */ (value);
  /** @type {string[]} Проверенные строки в сохранённом порядке. */
  const queries = [];
  /** @type {Set<string>} Точные строки уже проверенных записей, без изменения регистра или пробелов. */
  const seen = new Set();
  for (const query of entries) {
    if (typeof query !== 'string' || !query || seen.has(query)) return null;
    seen.add(query);
    queries.push(query);
  }
  return queries;
}

/** Постоянные данные одного поиска; DOM и совпадения здесь не хранятся. */
export class SearchState {
  /** Ключ одного экземпляра: поиски файла и каталога не разделяют запись браузера. */
  #key;
  /**
   * Хранилище исходного окна, переданное владельцем один раз; перенос представления не заменяет его.
   * @type {Storage|null}
   */
  #storage;
  /**
   * Единственная последняя строка и её история; UI читает эти значения вместо отдельной копии query.
   * @type {SearchMetadata}
   */
  #state = emptyMetadata();
  /** Непроверенная прежняя запись не может быть затёрта изменениями текущего поиска. */
  #blockedWrite = false;
  /**
   * Последний отказ браузерного хранения; не мешает поиску по текущим данным в памяти.
   * @type {'storage'|'corrupt'|null}
   */
  #failure = null;

  /**
   * Один раз читает постоянные данные, сохраняя начальные значения при отказе.
   * @param {Storage|null} storage Хранилище исходного окна владельца; null оставляет поиск рабочим только в памяти.
   * @param {string} [key] Отдельная запись этого экземпляра; прежний ключ сохраняется у поиска файла.
   */
  constructor(storage, key = 'site-search-state') {
    this.#storage = storage;
    this.#key = key;
    this.#read();
  }

  /**
   * Отдаёт единственную строку для поля и вычисления совпадений.
   * @returns {string} Последний ввод без обрезания пробелов или изменения регистра.
   */
  get latest() {
    return this.#state.latest;
  }

  /**
   * Сообщает, разрешён ли сбор завершённых запросов.
   * @returns {boolean} Выключение сохраняет прежний список и последнюю строку.
   */
  get collecting() {
    return this.#state.collecting;
  }

  /**
   * Отдаёт готовый порядок для списка и временного обхода истории у владельца.
   * @returns {ReadonlyArray<string>} Неизменяемые уникальные строки, начиная с последнего явно зафиксированного запроса.
   */
  get queries() {
    return this.#state.queries;
  }

  /**
   * Готовит только историю запросов для JSON, без текущего ввода и правил сбора.
   * @returns {{version:1,queries:string[]}} Независимая копия строк этого экземпляра.
   */
  exportData() {
    return { version: 1, queries: [...this.#state.queries] };
  }

  /**
   * Проверяет JSON обмена и объединяет строки только с историей этого экземпляра.
   * @param {unknown} value Разобранный внешний JSON до проверки версии и списка.
   * @returns {boolean} false сохраняет данные; true сохраняет первые 50 уникальных запросов.
   */
  importData(value) {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      !('version' in value) ||
      value.version !== 1 ||
      !('queries' in value)
    )
      return false;
    return this.mergeQueries(value.queries);
  }

  /**
   * Объединяет проверенную историю запросов, сохраняя нынешние строки впереди новых.
   * @param {unknown} value Весь список завершённых запросов из JSON обмена.
   * @returns {boolean} true после принятия; false при неверной форме. Остаются первые 50 уникальных запросов; latest и разрешение сбора не меняются.
   */
  mergeQueries(value) {
    const incoming = readSearchQueries(value);
    if (!incoming) return false;
    const queries = [...this.#state.queries, ...incoming.filter((query) => !this.#state.queries.includes(query))].slice(
      0,
      queryLimit,
    );
    this.#state = { ...this.#state, queries: Object.freeze(queries) };
    this.#save();
    return true;
  }

  /**
   * Сообщает владельцу о непроверенной записи или несохранённых изменениях.
   * @returns {'storage'|'corrupt'|null} Вид отказа либо null после успешного чтения или записи.
   */
  get failure() {
    return this.#failure;
  }

  /**
   * Сохраняет последнюю строку отдельно от сбора истории.
   * @param {string} query Полный ввод, включая пустую строку очистки; не считается завершённым запросом.
   * @returns {void} При изменении обновляет память и пытается сохранить её; прежнее значение не вызывает записи.
   */
  setLatest(query) {
    if (query === this.#state.latest) return;
    this.#state = { ...this.#state, latest: query };
    this.#save();
  }

  /**
   * Фиксирует нынешнюю строку после явного завершённого действия, выбранного владельцем.
   * @returns {void} При включённом сборе переносит непустую точную строку в начало и удерживает 50 записей; пустая строка или уже первая запись ничего не меняет.
   */
  commit() {
    const { latest, collecting, queries } = this.#state;
    if (!collecting || !latest || queries[0] === latest) return;
    this.#state = {
      ...this.#state,
      queries: Object.freeze([latest, ...queries.filter((query) => query !== latest)].slice(0, queryLimit)),
    };
    this.#save();
  }

  /**
   * Удаляет одну точную строку из истории, не меняя ввод поля.
   * @param {string} query Строка удаляемой записи; регистр и пробелы значимы для её идентичности.
   * @returns {void} Отсутствующая запись ничего не меняет; очистку latest отдельно выбирает владелец.
   */
  remove(query) {
    if (!this.#state.queries.includes(query)) return;
    this.#state = { ...this.#state, queries: Object.freeze(this.#state.queries.filter((value) => value !== query)) };
    this.#save();
  }

  /**
   * Меняет только разрешение собирать следующие завершённые запросы.
   * @param {boolean} value Новый выбор; включение не фиксирует уже введённый черновик.
   * @returns {void} Сохраняет изменённый выбор; прежние запросы и latest остаются доступными.
   */
  setCollecting(value) {
    if (value === this.#state.collecting) return;
    this.#state = { ...this.#state, collecting: value };
    this.#save();
  }

  /**
   * Явно повторяет чтение непроверенной записи либо сохранение текущих данных после отказа записи.
   * @returns {void} Успешное повторное чтение принимает сохранённые значения; владелец заново отражает latest и историю в UI.
   */
  retryStorage() {
    if (this.#blockedWrite) this.#read();
    else if (this.#failure === 'storage') this.#save();
  }

  /**
   * Принимает только проверенную постоянную запись и запрещает перезапись при отказе её чтения.
   * @returns {void} Отказ сохраняет нынешние данные в памяти; успешное чтение заменяет их и снимает запрет записи.
   */
  #read() {
    try {
      if (!this.#storage) throw new Error('Browser storage is unavailable');
      const source = this.#storage.getItem(this.#key);
      /** @type {unknown} Разобранный JSON до проверки формы данных поиска. */
      let value;
      try {
        value = source === null ? null : JSON.parse(source);
      } catch {
        this.#failure = 'corrupt';
        this.#blockedWrite = true;
        return;
      }
      const state = source === null ? emptyMetadata() : readMetadata(value);
      if (!state) {
        this.#failure = 'corrupt';
        this.#blockedWrite = true;
        return;
      }
      this.#state = state;
      this.#blockedWrite = false;
      this.#failure = null;
    } catch {
      this.#failure = 'storage';
      this.#blockedWrite = true;
    }
  }

  /**
   * Записывает только разрешённые метаданные после действительного изменения или явного повтора.
   * @returns {void} Ошибка записи оставляет новый ввод и историю в памяти; непроверенная прежняя запись не перезаписывается.
   */
  #save() {
    if (this.#blockedWrite) return;
    try {
      if (!this.#storage) throw new Error('Browser storage is unavailable');
      this.#storage.setItem(this.#key, JSON.stringify(this.#state));
      this.#failure = null;
    } catch {
      this.#failure = 'storage';
    }
  }
}
