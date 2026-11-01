/** Шифрует PAT и закрытые снимки в прежнем формате; хранением и доступом управляют другие модули. */
/**
 * Минимальные данные, запечатываемые владельцем токена; дополнительные проверенные метаданные также сериализуются.
 * @typedef {object} TokenSealEntry
 * @property {string} id Идентификатор записи, включённый в authenticated additionalData.
 * @property {string} storage encrypted выбирает пароль с новой солью; другой переданный способ использует PRF-материал.
 * @property {string} token Открытый PAT только на срок шифрования этой записи.
 * @property {string} [addedAt] Дата, которую владелец включает также в метаданные записи.
 */
/**
 * Секретный ввод одного получения ключей; переданные байтовые буферы потребляются и очищаются.
 * @typedef {object} SecretInput
 * @property {Uint8Array} [passwordBytes] Пароль в UTF-8 для PBKDF2, только при encrypted.
 * @property {Uint8Array} [material] Ровно 32 PRF-байта для HKDF, только при passkey.
 */
/**
 * Секретный ввод шифрования и метаданные ключа доступа для будущего открытия.
 * @typedef {object} SealInput
 * @property {Uint8Array} [passwordBytes] Пароль в UTF-8, потребляемый получением ключей.
 * @property {Uint8Array} [material] Ровно 32 PRF-байта, потребляемые получением ключей.
 * @property {string} [credentialId] Кодированный идентификатор ключа доступа, сохраняемый без секрета.
 * @property {string} [prfSalt] Кодированная соль будущего запроса PRF.
 */
/**
 * Два разделённых по назначению неэкспортируемых AES-GCM ключа; после возврата принадлежат вызывающему владельцу.
 * @typedef {object} StorageKeys
 * @property {CryptoKey} token Шифрует и открывает PAT-запись, получен с HKDF info PAT.
 * @property {CryptoKey} cache Шифрует и открывает снимки, получен с HKDF info snapshot.
 */
/**
 * Два кодированных поля шифртекста AES-GCM; содержимое не подтверждено до успешного открытия.
 * @typedef {object} SealedContent
 * @property {string} iv Base64 случайного 12-байтового nonce этой операции.
 * @property {string} ciphertext Base64 шифртекста и тега целостности.
 */
/**
 * Запись для открытия PAT после проверки владельцем хранилища.
 * @typedef {object} TokenOpenRecord
 * @property {string} id Идентификатор записи для authenticated additionalData.
 * @property {'encrypted'|'passkey'} storage Выбирает пароль с солью либо PRF-материал.
 * @property {string} iv Base64 nonce прежней операции.
 * @property {string} ciphertext Base64 запечатанного JSON токена.
 * @property {string} [salt] Base64 соли PBKDF2, обязательна для encrypted.
 */
/**
 * Поля открытого PAT проверены после расшифрования; объект и ключ не выходят из владельца доступа сами по себе.
 * @typedef {object} OpenTokenEntry
 * @property {string} id Совпавший идентификатор шифрованной записи.
 * @property {string} token Открытый PAT для владельца доступа.
 * @property {string} label Подпись записи, подготовленная владельцем.
 * @property {string} login Подтверждённое имя GitHub, включённое в запечатанный JSON.
 * @property {string} storage Способ защиты, сохранённый в открытом JSON.
 * @property {string} [addedAt] Сохранённая дата добавления.
 * @property {string} [credentialId] Идентификатор ключа доступа для последующего открытия.
 * @property {string} [prfSalt] Соль последующего запроса PRF.
 */
/**
 * Результат запечатывания: шифртекст может храниться, ключ снимков остаётся только у живой операции/сеанса.
 * @typedef {object} SealedToken
 * @property {import('./vault.mjs').TokenRecord} record Запечатанный JSON и несекретные метаданные для хранилища.
 * @property {CryptoKey} cacheKey Неэкспортируемый ключ закрытых снимков, который не записывается в record.
 */
/**
 * Результат открытия, ещё не подтверждающий сетевые права GitHub этого PAT.
 * @typedef {object} OpenToken
 * @property {OpenTokenEntry} entry Проверенные поля открытого JSON, включая PAT.
 * @property {CryptoKey} cacheKey Неэкспортируемый ключ снимков этой записи для живого доступа.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Создаёт внутренний отказ с кодом, который владелец доступа переводит в сообщение интерфейса.
 * @param {string} code Имя отказа ввода или расшифрованной формы записи.
 * @returns {Error & {code:string}} Ошибка без секретного содержимого.
 */
function invalid(code) {
  return Object.assign(new Error(code), { code });
}

/**
 * Декодирует Base64-поле прежнего шифрованного формата в новый массив.
 * @param {string} value Base64 nonce, соли либо шифртекста.
 * @returns {Uint8Array<ArrayBuffer>} Новые байты декодированного поля.
 * @throws {DOMException} При недопустимом Base64.
 */
function bytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

/**
 * Кодирует байты прежнего формата небольшими частями, не передавая весь массив в аргументы одного вызова.
 * @param {Uint8Array} value Байты nonce, соли или шифртекста.
 * @returns {string} Base64, сохраняемый в записи хранилища.
 */
function base64(value) {
  let output = '';
  for (let offset = 0; offset < value.length; offset += 32768) {
    output += String.fromCharCode(...value.subarray(offset, offset + 32768));
  }
  return btoa(output);
}

/**
 * Импортирует 32-байтовый материал в HKDF и разделяет PAT и снимки по назначению ключей.
 * @param {Uint8Array|null|undefined} materialBytes Потребляемый PRF/производный материал; после импорта исходный массив и копия очищаются.
 * @returns {Promise<StorageKeys>} Неэкспортируемые AES-GCM ключи для двух разных назначений.
 * @throws {Error} Неверный размер/вид материала либо отказ Web Crypto.
 */
async function keys(materialBytes) {
  if (!(materialBytes instanceof Uint8Array) || materialBytes.byteLength !== 32) throw invalid('invalid-passkey');
  const copy = new Uint8Array(materialBytes);
  /**
   * Импортированный неэкспортируемый HKDF-материал только на срок получения двух ключей.
   * @type {CryptoKey}
   */
  let material;
  try {
    material = await crypto.subtle.importKey('raw', copy.buffer, 'HKDF', false, ['deriveKey']);
  } finally {
    copy.fill(0);
    materialBytes.fill(0);
  }
  /**
   * Получает отдельный AES-GCM ключ с тем же материалом и закреплённой строкой назначения HKDF.
   * @param {string} purpose PAT или snapshot; различает ключи одного токена.
   * @returns {Promise<CryptoKey>} Неэкспортируемый ключ с encrypt/decrypt.
   * @throws {Error} Отказ Web Crypto передаётся владельцу операции.
   */
  const derive = (purpose) =>
    crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: encoder.encode('Hxape local GitHub storage v1'),
        info: encoder.encode(purpose),
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  return { token: await derive('PAT'), cache: await derive('snapshot') };
}

/**
 * Получает 256 бит PBKDF2 с прежними 600000 итерациями, затем разделяет назначения через HKDF.
 * @param {Uint8Array|null|undefined} passwordBytes Потребляемый пароль в UTF-8; очищается после импорта.
 * @param {Uint8Array} salt Соль этой encrypted-записи.
 * @returns {Promise<StorageKeys>} Ключи PAT и снимков для данного пароля/соли.
 * @throws {Error} При неверном вводе или отказе Web Crypto.
 */
async function passwordKeys(passwordBytes, salt) {
  if (!(passwordBytes instanceof Uint8Array)) throw invalid('invalid-password');
  let material;
  try {
    material = await crypto.subtle.importKey('raw', /** @type {BufferSource} */ (passwordBytes), 'PBKDF2', false, [
      'deriveBits',
    ]);
  } finally {
    passwordBytes.fill(0);
  }
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new Uint8Array(salt).buffer, iterations: 600_000, hash: 'SHA-256' },
    material,
    256,
  );
  return keys(new Uint8Array(bits));
}

/**
 * Запечатывает JSON токена с authenticated id и новым nonce; хранение результата остаётся у владельца.
 * @param {TokenSealEntry} entry Проверенная владельцем будущая запись с открытым PAT.
 * @param {SealInput} input Одноразовый секрет и метаданные выбранного способа защиты.
 * @returns {Promise<SealedToken>} Шифрованная запись для хранения и отдельный ключ снимков для живого владельца.
 * @throws {Error} При неверном секрете, несериализуемом JSON или отказе шифрования.
 */
export async function seal(entry, input) {
  const salt = entry.storage === 'encrypted' ? crypto.getRandomValues(new Uint8Array(16)) : null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const secret = salt ? await passwordKeys(input.passwordBytes, salt) : await keys(input.material);
  const content = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(entry.id) },
    secret.token,
    encoder.encode(JSON.stringify(entry)),
  );
  return {
    record: {
      id: entry.id,
      storage: entry.storage,
      salt: salt ? base64(salt) : undefined,
      credentialId: input.credentialId,
      prfSalt: input.prfSalt,
      addedAt: entry.addedAt,
      iv: base64(iv),
      ciphertext: base64(new Uint8Array(content)),
    },
    cacheKey: secret.cache,
  };
}

/**
 * Открывает прежнюю PAT-запись, сверяет её id и обязательные поля JSON после AES-GCM.
 * @param {TokenOpenRecord} record Шифрованная запись с nonce и при необходимости солью пароля.
 * @param {SecretInput} input Одноразовый пароль либо PRF-материал соответствующей записи.
 * @returns {Promise<OpenToken>} Проверенный открытый PAT и отдельный ключ снимков для владельца доступа.
 * @throws {Error} При неверном секрете, теге, JSON или обязательных полях записи.
 */
export async function unseal(record, input) {
  let secret;
  if (record.storage === 'passkey') secret = await keys(input.material);
  else {
    if (typeof record.salt !== 'string') throw invalid('invalid-record');
    secret = await passwordKeys(input.passwordBytes, bytes(record.salt));
  }
  const content = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes(record.iv), additionalData: encoder.encode(record.id) },
    secret.token,
    bytes(record.ciphertext),
  );
  const value = /** @type {unknown} */ (JSON.parse(decoder.decode(content)));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('invalid-token');
  const entry = /** @type {Record<string,unknown>} */ (value);
  if (
    entry.id !== record.id || typeof entry.token !== 'string' || typeof entry.label !== 'string'
    || typeof entry.login !== 'string' || typeof entry.storage !== 'string'
    || ['addedAt', 'credentialId', 'prfSalt'].some((key) => entry[key] !== undefined && typeof entry[key] !== 'string')
  ) {
    throw invalid('invalid-token');
  }
  return {
    entry: /** @type {OpenTokenEntry} */ (entry),
    cacheKey: secret.cache,
  };
}

/**
 * Шифрует JSON снимка отдельным ключом и связывает шифртекст с identity через authenticated additionalData.
 * @param {unknown} entry Сериализуемый снимок, уже проверенный владельцем каталога/доступа.
 * @param {CryptoKey} key Ключ снимков открытого токена; PAT-ключ сюда не передаётся.
 * @param {string} identity Идентичность записи кэша, которую нужно подтвердить при открытии.
 * @returns {Promise<SealedContent>} Новый nonce и шифртекст без открытых данных.
 * @throws {Error} При несериализуемом JSON или отказе Web Crypto.
 */
export async function sealSnapshot(entry, key, identity) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const content = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(identity) },
    key,
    encoder.encode(JSON.stringify(entry)),
  );
  return { iv: base64(iv), ciphertext: base64(new Uint8Array(content)) };
}

/**
 * Открывает снимок только с совпавшими ключом и authenticated identity; проверка его предметной формы остаётся у вызывающего.
 * @param {SealedContent} record Поля прежнего шифртекста снимка.
 * @param {CryptoKey} key Ключ снимков открытого токена.
 * @param {string} identity Ожидаемая идентичность этой записи кэша.
 * @returns {Promise<unknown>} Расшифрованный JSON, ещё не доверенный каталогом.
 * @throws {Error} При неверном Base64, теге, ключе или JSON.
 */
export async function unsealSnapshot(record, key, identity) {
  const content = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes(record.iv), additionalData: encoder.encode(identity) },
    key,
    bytes(record.ciphertext),
  );
  return JSON.parse(decoder.decode(content));
}
