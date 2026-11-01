/** Получает PRF-материал WebAuthn для шифрования; доступ к GitHub по-прежнему даёт PAT. */
import { formatText, ui } from '../../common/ui/text.mjs';

/**
 * Доступная часть метаданных сохранённой записи; обе строки нужны для переиспользования ключа.
 * @typedef {object} PasskeyEntry
 * @property {string} [credentialId] Идентификатор сохранённого passkey, если этот способ защиты выбран.
 * @property {string} [prfSalt] Соль сохранённого запроса PRF.
 */

/**
 * Метаданные ключа доступа, необходимые для повторного системного подтверждения.
 * @typedef {object} SavedPasskey
 * @property {string} credentialId Base64URL идентификатора разрешённого ключа.
 * @property {string} prfSalt Base64URL соли повторяемого запроса PRF.
 */
/**
 * Подтверждённый ключ с копией PRF-результата; вызывающая операция должна передать и очистить material.
 * @typedef {object} ReadyPasskey
 * @property {string} credentialId Base64URL идентификатора подтверждённого ключа.
 * @property {string} prfSalt Base64URL соли, при которой получен material.
 * @property {Uint8Array<ArrayBuffer>} material Ровно 32 байта для получения ключей шифрования, не PAT.
 * @property {false} [needsUnlock] Материал уже готов; второго подтверждения не требуется.
 */
/**
 * Созданный ключ поддерживает PRF, но материал ещё нужно запросить повторным подтверждением.
 * @typedef {object} PendingPasskey
 * @property {string} credentialId Base64URL идентификатора созданного ключа.
 * @property {string} prfSalt Base64URL соли следующего запроса PRF.
 * @property {true} needsUnlock Требуется unlockPasskey до шифрования токена.
 */
/**
 * Требует защищённую страницу; из HTTP допускается только localhost, остальные origins получают видимое объяснение.
 * @returns {void} Успех разрешает начать запрос credentials.
 * @throws {Error} Если нынешний origin не подходит для ключей доступа.
 */
function requirePasskeyOrigin() {
  if (!isSecureContext || (location.protocol === 'http:' && location.hostname !== 'localhost')) {
    const local = `http://localhost${location.port ? `:${location.port}` : ''}${location.pathname}`;
    throw new Error(formatText(ui.passkey.secureOrigin, { local }));
  }
}

/**
 * Кодирует бинарный идентификатор или соль в Base64URL без padding для метаданных записи.
 * @param {Uint8Array} bytes Байты идентификатора credentials либо соли PRF.
 * @returns {string} Строка с заменой +/ и без завершающих знаков равенства.
 */
function encode(bytes) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Возвращает байты сохранённого Base64URL, восстанавливая обычные символы и padding для atob.
 * @param {string} text Кодированный идентификатор credentials либо соль PRF.
 * @returns {Uint8Array<ArrayBuffer>} Новый массив декодированных байтов.
 * @throws {DOMException} При недопустимом Base64.
 */
function decode(text) {
  const value = text.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(
    atob(value.padEnd(Math.ceil(value.length / 4) * 4, '=')),
    (character) => character.charCodeAt(0),
  );
}

/**
 * Читает результат first расширения PRF и возвращает отдельную 32-байтовую копию.
 * @param {PublicKeyCredential} credential Только что полученный результат системного подтверждения.
 * @returns {Uint8Array<ArrayBuffer>} Копия PRF-материала для одной операции шифрования/открытия.
 * @throws {Error} Если провайдер не вернул ровно 32 байта.
 */
function secret(credential) {
  const extensions =
    /** @type {{prf?:{results?:{first?:ArrayBuffer|ArrayBufferView}}}} */ (credential.getClientExtensionResults());
  const result = extensions.prf?.results?.first;
  const bytes = result instanceof ArrayBuffer
    ? new Uint8Array(result)
    : ArrayBuffer.isView(result)
    ? new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
    : null;
  if (bytes?.byteLength !== 32) throw new Error(ui.passkey.noPrf);
  return new Uint8Array(bytes);
}

/**
 * Запрашивает системное подтверждение именно сохранённого ключа и сверяет возвращённый идентификатор до чтения PRF.
 * @param {SavedPasskey} saved Идентификатор и соль выбранной записи.
 * @param {AbortSignal} [signal] Отмена открытого подтверждения вызывающей операцией.
 * @returns {Promise<ReadyPasskey>} Проверенные метаданные и копия PRF-материала.
 * @throws {Error} При неподходящем origin, недоступном API, отмене, другом ключе или отсутствии PRF.
 */
export async function unlockPasskey(saved, signal) {
  requirePasskeyOrigin();
  if (!navigator.credentials?.get) throw new Error(ui.passkey.unavailable);
  const credentialId = decode(saved.credentialId);
  const salt = decode(saved.prfSalt);
  // Сигнал позволяет владельцу отменить открытый запрос подтверждения, например при истечении срока ожидания.
  const credential = /** @type {PublicKeyCredential|null} */ (await navigator.credentials.get({
    signal,
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: salt } } },
    },
  }));
  if (!credential || encode(new Uint8Array(credential.rawId)) !== saved.credentialId) {
    throw new Error(ui.passkey.mismatch);
  }
  return { ...saved, material: secret(credential) };
}

/**
 * Переиспользует первый сохранённый ключ с солью либо создаёт новый resident key с обязательным подтверждением пользователя.
 * @param {PasskeyEntry[]} entries Метаданные нынешних записей без PAT; первый полный passkey имеет приоритет.
 * @returns {Promise<ReadyPasskey|PendingPasskey>} Готовый материал либо метаданные для второго подтверждения после создания.
 * @throws {Error} При недоступном API, неподходящем origin, отмене или отсутствии поддержки PRF у созданного ключа.
 */
export async function passkeyForNewToken(entries) {
  requirePasskeyOrigin();
  const existing = entries.find((entry) => entry.credentialId && entry.prfSalt);
  if (existing) return unlockPasskey(/** @type {{credentialId:string,prfSalt:string}} */ (existing));
  if (!navigator.credentials?.create) throw new Error(ui.passkey.unavailable);
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const credential = /** @type {PublicKeyCredential|null} */ (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: ui.passkey.relyingPartyName },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: ui.passkey.vaultCredentialName,
        displayName: ui.passkey.vaultCredentialName,
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      extensions: { prf: { eval: { first: salt } } },
    },
  }));
  if (!credential) throw new Error(ui.passkey.creationCancelled);
  if (credential.getClientExtensionResults?.().prf?.enabled !== true) {
    throw new Error(ui.passkey.providerNoPrf);
  }
  const saved = { credentialId: encode(new Uint8Array(credential.rawId)), prfSalt: encode(salt) };
  try {
    return { ...saved, material: secret(credential) };
  } catch {
    return { ...saved, needsUnlock: true };
  }
}
