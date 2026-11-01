/** Ограниченный кэш готового текста: срок записи не продлевается при чтении, вытеснение идёт по давности обращения. */
/**
 * Успешно прочитанный текст в памяти; срок не продлевается при обращении.
 * @typedef {object} TextCacheEntry
 * @property {string} text Полный текст, уже проверенный владельцем загрузки.
 * @property {number} bytes Размер UTF-8 для общего ограничения кэша.
 * @property {number} expiresAt Время истечения по Date.now в миллисекундах.
 */
/**
 * Жёсткие пределы одного кэша успешных текстов.
 * @typedef {object} TextCacheLimits
 * @property {number} maxEntries Положительное целое число одновременно сохранённых записей.
 * @property {number} maxBytes Положительный общий предел UTF-8-байтов.
 * @property {number} ttlMs Положительный срок одной записи от момента set в миллисекундах.
 */
/** Хранит только готовые тексты в памяти; TTL и порядок вытеснения принадлежат этому экземпляру. */
export class TextCache {
  /**
   * Записи этого кэша в порядке последних обращений; их допустимость проверяет владелец до set.
   * @type {Map<string,TextCacheEntry>}
   */
  #entries = new Map();
  /**
   * Сумма UTF-8-байтов нынешних записей, согласуемая при каждом добавлении и удалении.
   */
  #usedBytes = 0;
  /**
   * Предел числа записей на срок этого экземпляра.
   * @type {number}
   */
  #maxEntries;
  /**
   * Общий предел UTF-8-байтов на срок экземпляра.
   * @type {number}
   */
  #maxBytes;
  /**
   * Срок записи от set; get продлевает только её порядок вытеснения.
   * @type {number}
   */
  #ttlMs;
  /**
   * Измеряет UTF-8-байты для ограничений этого кэша, не меняя текст.
   */
  #encoder = new TextEncoder();

  /**
   * Принимает постоянные пределы одного независимого кэша успешных текстов.
   * @param {TextCacheLimits} options Положительные целые пределы числа, байтов и срока.
   * @throws {TypeError} Если хотя бы один предел не является положительным безопасным целым.
   */
  constructor({ maxEntries, maxBytes, ttlMs }) {
    if (![maxEntries, maxBytes, ttlMs].every((value) => Number.isSafeInteger(value) && value > 0)) {
      throw new TypeError('Text cache limits must be positive integers.');
    }
    this.#maxEntries = maxEntries;
    this.#maxBytes = maxBytes;
    this.#ttlMs = ttlMs;
  }

  /**
   * Возвращает только живую запись и переносит её в конец очереди вытеснения, не продлевая срок.
   * @param {string} key Ключ, выбранный владельцем загрузки для адреса/ревизии текста.
   * @returns {string|undefined} Успешный текст; отсутствие и истечение дают undefined, истёкшая запись удаляется.
   */
  get(key) {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.#remove(key);
      return undefined;
    }
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    return entry.text;
  }

  /**
   * Заменяет прежнюю запись и удерживает текст в пределах числа и байтов; вытесняет истёкшие и давно не читанные записи.
   * @param {string} key Смысловой ключ, включающий различаемые владельцем адрес и ревизию.
   * @param {string} text Только успешный полный текст; ошибки и незавершённые запросы здесь не хранятся.
   * @returns {void} Слишком большой текст пропускается после удаления прежней записи с тем же ключом.
   * @throws {TypeError} Если ключ или текст не являются строками.
   */
  set(key, text) {
    if (typeof key !== 'string' || typeof text !== 'string') {
      throw new TypeError('Text cache accepts string keys and values.');
    }
    this.#remove(key);
    const bytes = this.#encoder.encode(text).byteLength;
    if (bytes > this.#maxBytes) return;
    const now = Date.now();
    for (const [saved, entry] of this.#entries) if (entry.expiresAt <= now) this.#remove(saved);
    while (this.#entries.size >= this.#maxEntries || this.#usedBytes + bytes > this.#maxBytes) {
      const oldest = this.#entries.keys().next().value;
      if (oldest === undefined) break;
      this.#remove(oldest);
    }
    this.#entries.set(key, { text, bytes, expiresAt: now + this.#ttlMs });
    this.#usedBytes += bytes;
  }

  /**
   * Удаляет все тексты этого экземпляра и сбрасывает общий счётчик байтов.
   * @returns {void}
   */
  clear() {
    this.#entries.clear();
    this.#usedBytes = 0;
  }

  /**
   * Убирает одну запись с согласованием счётчика байтов.
   * @param {string} key Удаляемый ключ.
   * @returns {void} Отсутствующий ключ игнорируется.
   */
  #remove(key) {
    const entry = this.#entries.get(key);
    if (!entry) return;
    this.#usedBytes -= entry.bytes;
    this.#entries.delete(key);
  }
}
