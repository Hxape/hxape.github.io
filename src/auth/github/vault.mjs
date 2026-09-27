/** Хранит зашифрованные PAT и закрытые снимки в IndexedDB либо выбранном localStorage. */
import { ui } from '../../common/ui/text.mjs';

const databaseName = 'hxape-github-tokens-v1';
const tokenStore = 'tokens';
const snapshotStore = 'snapshots';
const localMarker = `${databaseName}:backend`;
const localTokens = `${databaseName}:token:`;
const localSnapshots = `${databaseName}:snapshot:`;
/**
 * Зашифрованная PAT-запись в постоянном хранилище; проверка здесь подтверждает форму полей, не открывает токен.
 * @typedef {object} TokenRecord
 * @property {string} id Ключ записи токена в обоих способах хранения.
 * @property {string} storage Способ защиты, который при открытии уточняет владелец криптографической операции.
 * @property {string} iv Base64 nonce шифрования PAT-записи.
 * @property {string} ciphertext Base64 запечатанного JSON с PAT.
 * @property {string} [salt] Base64 соли парольной защиты.
 * @property {string} [addedAt] Несекретная дата добавления для списка.
 * @property {string} [credentialId] Кодированный идентификатор ключа доступа.
 * @property {string} [prfSalt] Кодированная соль повторного запроса PRF.
 */
/**
 * Результат чтения списка, сохраняющий исправные записи при повреждении соседних.
 * @typedef {object} TokenList
 * @property {TokenRecord[]} records Записи с принятой формой полей, ещё зашифрованные.
 * @property {boolean} corrupted Хотя бы одна исходная запись была отброшена как повреждённая.
 */
/**
 * Шифртекст снимка либо отметка его отзыва; epoch различает последовательные записи одного ключа.
 * @typedef {object} CacheRecord
 * @property {string} key Ключ вида tokenId:repo для одной записи снимка.
 * @property {string} tokenId Идентификатор токена, которому принадлежит закрытый снимок.
 * @property {string} repo Имя репозитория снимка.
 * @property {string} [iv] Base64 nonce снимка; отсутствует у отметки отзыва.
 * @property {string} [ciphertext] Base64 шифртекста; отсутствует у отметки отзыва.
 * @property {number} [epoch] Номер сохранённой записи; отсутствие сравнивается с нулём.
 * @property {boolean} [revoked] true запрещает использовать прежний снимок этого ключа.
 */
/**
 * Подготовленная запись снимка с условием совпадения прежнего номера до принятия новых байтов.
 * @typedef {object} CacheWrite
 * @property {string} key Ключ tokenId:repo заменяемого снимка.
 * @property {string} tokenId Существующая запись токена, нужная для принятия шифртекста.
 * @property {string} repo Имя репозитория снимка.
 * @property {string} iv Base64 nonce нового снимка.
 * @property {string} ciphertext Base64 новых запечатанных данных.
 * @property {number} expectedEpoch Номер, прочитанный перед шифрованием; в хранилище вместо него записывается epoch+1.
 */

/**
 * Проверяет поля одной сохранённой PAT-записи без расшифрования; отсутствие допускается при чтении по id.
 * @param {unknown} value Значение IndexedDB или разобранного JSON localStorage.
 * @returns {TokenRecord|undefined} Принятая форма записи; undefined только при отсутствии.
 * @throws {Error} Если обязательные строки либо необязательные метаданные имеют неверный вид.
 */
function tokenRecord(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(ui.storage.invalidToken);
  const record = /** @type {Record<string,unknown>} */ (value);
  if (
    typeof record.id !== 'string' || typeof record.storage !== 'string'
    || typeof record.iv !== 'string' || typeof record.ciphertext !== 'string'
    || ['salt', 'addedAt', 'credentialId', 'prfSalt'].some((key) =>
      record[key] !== undefined && typeof record[key] !== 'string'
    )
  ) {
    throw new Error(ui.storage.invalidToken);
  }
  return /** @type {TokenRecord} */ (record);
}

/**
 * Требует существующую PAT-запись с принятой формой для списка.
 * @param {unknown} value Одна исходная запись перечисления.
 * @returns {TokenRecord} Проверенная зашифрованная запись.
 * @throws {Error} При отсутствии или неверной форме.
 */
function requiredTokenRecord(value) {
  const record = tokenRecord(value);
  if (!record) throw new Error(ui.storage.invalidToken);
  return record;
}

/**
 * Собирает только исправные формы записей, отмечая повреждённые вместо отказа всего списка.
 * @param {unknown[]} values Исходный массив IndexedDB.
 * @returns {TokenList} Принятые записи и факт отбрасывания хотя бы одной.
 */
function tokenList(values) {
  /**
   * Исправные записи нынешнего перечисления; повреждённые элементы в этот массив не попадают.
   * @type {TokenRecord[]}
   */
  const records = [];
  let corrupted = false;
  for (const value of values) {
    try {
      records.push(requiredTokenRecord(value));
    } catch {
      corrupted = true;
    }
  }
  return { records, corrupted };
}

/**
 * Проверяет форму шифрованного снимка или отметки отзыва до доступа к полям.
 * @param {unknown} value Значение выбранного хранилища для ключа снимка.
 * @returns {CacheRecord|undefined} Принятая форма; отсутствие возвращает undefined.
 * @throws {Error} Если ключи, номер, отзыв или кодированные поля имеют неверные типы.
 */
function cacheRecord(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(ui.storage.transactionFailed);
  const record = /** @type {Record<string,unknown>} */ (value);
  if (
    typeof record.key !== 'string' || typeof record.tokenId !== 'string' || typeof record.repo !== 'string'
    || ['iv', 'ciphertext'].some((key) => record[key] !== undefined && typeof record[key] !== 'string')
    || (record.epoch !== undefined && typeof record.epoch !== 'number')
    || (record.revoked !== undefined && typeof record.revoked !== 'boolean')
  ) throw new Error(ui.storage.transactionFailed);
  return /** @type {CacheRecord} */ (record);
}

/**
 * Читает безопасный прежний номер для отзыва даже из записи с повреждённым остальным содержимым.
 * @param {unknown} value Прежние данные снимка до создания отметки отзыва.
 * @returns {number} Неотрицательное безопасное целое меньше MAX_SAFE_INTEGER; неподходящее значение даёт 0.
 */
function priorEpoch(value) {
  if (!value || typeof value !== 'object' || !('epoch' in value)) return 0;
  const epoch = value.epoch;
  return typeof epoch === 'number' && Number.isSafeInteger(epoch) && epoch >= 0 && epoch < Number.MAX_SAFE_INTEGER
    ? epoch
    : 0;
}

/**
 * Проверяет наличие IndexedDB либо доступного свойства localStorage без открытия базы или записи данных.
 * @returns {boolean} false при отсутствии обоих API либо отказе доступа к свойствам среды.
 */
export function vaultStorageAvailable() {
  try {
    return Boolean(globalThis.indexedDB || globalThis.localStorage);
  } catch {
    return false;
  }
}

/**
 * Сохраняет уже выбранный местный способ хранения; при IndexedDB не переводит записи в localStorage без прежней отметки.
 * @returns {Storage|null} Выбранный localStorage; null разрешает использовать IndexedDB.
 * @throws {Error} Без IndexedDB и пригодного localStorage либо при отказе записи отметки выбора.
 */
function fallbackStorage() {
  if (globalThis.indexedDB) {
    try {
      const storage = globalThis.localStorage;
      return storage?.getItem(localMarker) === 'localStorage' ? storage : null;
    } catch {
      return null;
    }
  }
  const storage = globalThis.localStorage;
  if (!storage) throw new Error(ui.storage.unavailable);
  storage.setItem(localMarker, 'localStorage');
  return storage;
}

/**
 * Читает одну строку выбранного localStorage как непроверенный JSON.
 * @param {Storage} storage Уже выбранное местное хранилище.
 * @param {string} key Полный ключ PAT-записи либо снимка.
 * @returns {unknown} Разобранное значение; отсутствие даёт undefined.
 * @throws {Error} При отказе доступа или неверном JSON.
 */
function localRead(storage, key) {
  const value = storage.getItem(key);
  return value === null ? undefined : JSON.parse(value);
}

/**
 * Исполняет одну операцию только над шифрованными PAT-записями выбранного localStorage.
 * @param {Storage} storage Выбранный местный способ хранения.
 * @param {'all'|'read'|'put'|'delete'} mode Список, чтение одной записи, замена либо удаление.
 * @param {string|TokenRecord|undefined} record id при read/delete, запись при put; all не использует аргумент.
 * @returns {TokenList|TokenRecord|boolean|undefined} Список/запись либо true после изменения; отсутствие read даёт undefined.
 * @throws {Error} При отказе хранения или неверной одиночной записи; all отмечает повреждение в corrupted.
 */
function localStored(storage, mode, record) {
  if (mode === 'all') {
    /**
     * Исправные формы PAT-записей из нынешнего перечисления localStorage.
     * @type {TokenRecord[]}
     */
    const records = [];
    let corrupted = false;
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key?.startsWith(localTokens)) continue;
      const raw = storage.getItem(key);
      try {
        records.push(requiredTokenRecord(raw === null ? undefined : JSON.parse(raw)));
      } catch {
        corrupted = true;
      }
    }
    return { records, corrupted };
  }
  if (mode === 'read') return tokenRecord(localRead(storage, localTokens + String(record)));
  if (mode === 'put') {
    if (!record || typeof record !== 'object') throw new Error(ui.storage.invalidToken);
    storage.setItem(localTokens + record.id, JSON.stringify(record));
  } else storage.removeItem(localTokens + String(record));
  return true;
}

/**
 * Читает снимок, принимает замену с ожидаемым epoch, отзывает снимок или удаляет токен с его снимками.
 * @param {Storage} storage Выбранный localStorage.
 * @param {'read'|'put'|'remove'|'delete'} mode Операция над снимком; delete удаляет все снимки токена и его запись.
 * @param {string} key tokenId:repo для снимка, tokenId при delete.
 * @param {CacheWrite|undefined} record Новые байты и ожидаемый номер только при put.
 * @returns {CacheRecord|boolean|undefined} Снимок либо true после изменения; отсутствие read даёт undefined.
 * @throws {Error} При отказе хранения, исчезновении токена или несовпавшем expectedEpoch (cache-conflict).
 */
function localCached(storage, mode, key, record) {
  const cacheKey = localSnapshots + key;
  if (mode === 'read') return cacheRecord(localRead(storage, cacheKey));
  if (mode === 'put') {
    if (!record) throw new Error(ui.storage.tokenChanged);
    if (!storage.getItem(localTokens + record.tokenId)) throw new Error(ui.storage.tokenChanged);
    const previous = cacheRecord(localRead(storage, cacheKey));
    const expected = record.expectedEpoch || 0;
    if ((previous?.epoch || 0) !== expected) {
      throw Object.assign(new Error(ui.storage.snapshotChanged), { code: 'cache-conflict' });
    }
    const { expectedEpoch, ...saved } = record;
    storage.setItem(cacheKey, JSON.stringify({ ...saved, epoch: expected + 1 }));
  } else if (mode === 'remove') {
    const [tokenId, ...repo] = key.split(':');
    const raw = storage.getItem(cacheKey);
    let previous;
    try {
      previous = raw === null ? undefined : JSON.parse(raw);
    } catch {
      previous = undefined;
    }
    storage.setItem(
      cacheKey,
      JSON.stringify({ key, tokenId, repo: repo.join(':'), revoked: true, epoch: priorEpoch(previous) + 1 }),
    );
  } else {
    const keys = [];
    for (let index = 0; index < storage.length; index++) {
      const item = storage.key(index);
      if (item?.startsWith(`${localSnapshots}${key}:`)) keys.push(item);
    }
    for (const item of keys) storage.removeItem(item);
    storage.removeItem(localTokens + key);
  }
  return true;
}

/**
 * Открывает прежнюю базу и создаёт только отсутствующие stores; поздний успех после blocked закрывается.
 * @returns {Promise<IDBDatabase>} Открытая база, которую вызывающая операция закрывает в finally.
 * @throws {Error} При blocked, отказе открытия или отсутствии пригодного результата.
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(tokenStore)) {
        request.result.createObjectStore(tokenStore, { keyPath: 'id' });
      }
      if (!request.result.objectStoreNames.contains(snapshotStore)) {
        request.result.createObjectStore(snapshotStore, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => reject(request.error || new Error(ui.storage.indexedDbOpenFailed));
    request.onblocked = () => {
      blocked = true;
      reject(new Error(ui.storage.blocked));
    };
  });
}

/**
 * Перечисляет зашифрованные PAT-записи, сохраняя факт повреждённых элементов.
 * @overload
 * @param {'all'} mode Чтение всего списка без второго аргумента.
 * @returns {Promise<TokenList>} Исправные формы и флаг corrupted.
 */
/**
 * Читает одну зашифрованную PAT-запись.
 * @overload
 * @param {'read'} mode Чтение по id.
 * @param {string} record Идентификатор записи.
 * @returns {Promise<TokenRecord|undefined>} Запись либо отсутствие.
 */
/**
 * Принимает замену одной зашифрованной PAT-записи.
 * @overload
 * @param {'put'} mode Запись по record.id.
 * @param {TokenRecord} record Готовый шифртекст и несекретные метаданные.
 * @returns {Promise<boolean>} true после завершения изменения.
 */
/**
 * Удаляет одну PAT-запись; снимки удаляются отдельной операцией cached delete.
 * @overload
 * @param {'delete'} mode Удаление по id.
 * @param {string} record Идентификатор записи.
 * @returns {Promise<boolean>} true после завершения удаления.
 */
/**
 * Читает или меняет только шифрованные PAT-записи в уже выбранном способе хранения.
 * @param {'all'|'read'|'put'|'delete'} mode Список, чтение, замена либо удаление.
 * @param {string|TokenRecord} [record] id при read/delete, готовая запись при put.
 * @returns {Promise<TokenList|TokenRecord|boolean|undefined>} Результат выбранной операции, без открытого PAT.
 * @throws {Error} При повреждённой одиночной записи, отказе базы, записи или транзакции.
 */
export async function stored(mode, record) {
  const fallback = fallbackStorage();
  if (fallback) return localStored(fallback, mode, record);
  const database = await openDatabase();
  try {
    /**
     * Результат этой транзакции токенов: чтение принимает форму ответа, изменение ждёт oncomplete.
     * @type {Promise<TokenList|TokenRecord|boolean|undefined>}
     */
    const result = new Promise((resolve, reject) => {
      const transaction = database.transaction(
        tokenStore,
        mode === 'read' || mode === 'all' ? 'readonly' : 'readwrite',
      );
      const store = transaction.objectStore(tokenStore);
      if (mode !== 'all' && (mode === 'put' ? !record || typeof record !== 'object' : typeof record !== 'string')) {
        throw new Error(ui.storage.invalidToken);
      }
      const request = mode === 'all' ? store.getAll() : mode === 'read'
        ? store.get(/** @type {string} */ (record))
        : mode === 'put'
        ? store.put(record)
        : store.delete(/** @type {string} */ (record));
      request.onsuccess = () => {
        if (mode === 'all') {
          try {
            if (!Array.isArray(request.result)) throw new Error(ui.storage.invalidToken);
            resolve(tokenList(request.result));
          } catch (error) {
            reject(error);
          }
        } else if (mode === 'read') {
          try {
            resolve(tokenRecord(request.result));
          } catch (error) {
            reject(error);
          }
        }
      };
      transaction.oncomplete = () => {
        if (mode === 'put' || mode === 'delete') resolve(true);
      };
      transaction.onerror = () => reject(transaction.error || request.error || new Error(ui.storage.transactionFailed));
      transaction.onabort = () => reject(transaction.error || new Error(ui.storage.interrupted));
    });
    return await result;
  } finally {
    database.close();
  }
}

/**
 * Читает зашифрованный снимок либо сохранённую отметку отзыва.
 * @overload
 * @param {'read'} mode Чтение одного ключа.
 * @param {string} key tokenId:repo.
 * @returns {Promise<CacheRecord|undefined>} Запись либо отсутствие.
 */
/**
 * Принимает новые байты только при существующем токене и совпавшем прежнем epoch.
 * @overload
 * @param {'put'} mode Условная замена снимка.
 * @param {string} key tokenId:repo.
 * @param {CacheWrite} record Шифртекст и номер, прочитанный перед его подготовкой.
 * @returns {Promise<boolean>} true после принятия записи с увеличенным epoch.
 */
/**
 * Отзывает один снимок либо удаляет все снимки и саму запись токена.
 * @overload
 * @param {'remove'|'delete'} mode remove сохраняет отметку отзыва, delete удаляет записи токена.
 * @param {string} key tokenId:repo при remove, tokenId при delete.
 * @returns {Promise<boolean>} true после изменения.
 */
/**
 * Хранит только шифртекст и отметки отзыва снимков; открытие JSON принадлежит доступу/криптографии.
 * @param {'read'|'put'|'remove'|'delete'} mode Чтение, условная замена, отзыв либо полное удаление токена.
 * @param {string} key tokenId:repo для снимка, tokenId при delete.
 * @param {CacheWrite} [record] Новые байты и expectedEpoch только при put.
 * @returns {Promise<CacheRecord|boolean|undefined>} Запись/отсутствие при read, true после изменения.
 * @throws {Error} При повреждении, исчезновении токена, отказе хранилища или транзакции или несовпавшем epoch (cache-conflict).
 */
export async function cached(mode, key, record) {
  const fallback = fallbackStorage();
  if (fallback) return localCached(fallback, mode, key, record);
  const database = await openDatabase();
  try {
    /**
     * Результат этой транзакции снимка: запись и отзыв принимаются только по её завершению.
     * @type {Promise<CacheRecord|boolean|undefined>}
     */
    const result = new Promise((resolve, reject) => {
      const transaction = database.transaction([tokenStore, snapshotStore], mode === 'read' ? 'readonly' : 'readwrite');
      const store = transaction.objectStore(snapshotStore);
      let conflict = false;
      if (mode === 'read') {
        const request = store.get(key);
        request.onsuccess = () => {
          try {
            resolve(cacheRecord(request.result));
          } catch (error) {
            reject(error);
          }
        };
      } else if (mode === 'put') {
        if (!record) throw new Error(ui.storage.tokenChanged);
        const token = transaction.objectStore(tokenStore).get(record.tokenId);
        const previous = store.get(key);
        let completed = 0;
        /**
         * Ждёт оба чтения одной транзакции, затем сверяет наличие токена и прежний номер до записи шифртекста.
         * @returns {void} Второй ответ либо принимает запись, либо отменяет транзакцию с причиной отказа.
         */
        const put = () => {
          if (++completed !== 2) return;
          if (!token.result) {
            transaction.abort();
            return;
          }
          const expected = record.expectedEpoch || 0;
          let previousRecord;
          try {
            previousRecord = cacheRecord(previous.result);
          } catch (error) {
            transaction.abort();
            reject(error);
            return;
          }
          if ((previousRecord?.epoch || 0) !== expected) {
            conflict = true;
            transaction.abort();
            return;
          }
          const { expectedEpoch, ...saved } = record;
          store.put({ ...saved, epoch: expected + 1 });
        };
        token.onsuccess = put;
        previous.onsuccess = put;
      } else if (mode === 'remove') {
        const [tokenId, ...repo] = key.split(':');
        const previous = store.get(key);
        previous.onsuccess = () => {
          try {
            store.put({ key, tokenId, repo: repo.join(':'), revoked: true, epoch: priorEpoch(previous.result) + 1 });
          } catch (error) {
            transaction.abort();
            reject(error);
          }
        };
      } else {
        const request = store.getAll();
        request.onsuccess = () => {
          for (const item of request.result) {
            if (typeof item?.key === 'string' && item.key.startsWith(`${key}:`)) store.delete(item.key);
          }
          transaction.objectStore(tokenStore).delete(key);
        };
      }
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(
          conflict
            ? Object.assign(new Error(ui.storage.snapshotChanged), { code: 'cache-conflict' })
            : transaction.error || new Error(ui.storage.tokenChanged),
        );
    });
    return await result;
  } finally {
    database.close();
  }
}
