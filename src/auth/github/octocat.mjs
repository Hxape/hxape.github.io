/**
 * Octocat владеет открытым PAT, ключом снимка и сеансами; наружу отдаёт только данные разрешённых операций.
 */
import limits from '../../common/network/json/source-limits.json' with { type: 'json' };
import { seal, sealSnapshot, unseal, unsealSnapshot } from './crypto.mjs';
import { GithubTransport } from './interceptor.mjs';
import settings from './json/octocat.json' with { type: 'json' };

const protocol = settings.protocol;
const policy = settings;
const maxSnapshotBytes = limits.privateRequest.maxSnapshotBytes;
const github = new GithubTransport();
/**
 * Метаданные PAT, которые воркер вправе вернуть странице.
 * @typedef {Object} TokenMetadata
 * @property {string} id Идентификатор записи; открытый PAT в идентификатор не входит.
 * @property {string} label Пользовательская подпись записи PAT без самого токена.
 * @property {string} login Имя пользователя, проверенное ответом GitHub при добавлении PAT.
 * @property {string} storage Способ защиты PAT: пароль или passkey; не обозначает открытый секрет.
 * @property {string} [addedAt] Время добавления токена; у прежних записей может отсутствовать.
 * @property {string} [credentialId] Идентификатор WebAuthn credential в Base64url, без открытого PRF.
 * @property {string} [prfSalt] Сохранённая соль запроса PRF в Base64url.
 */
/**
 * Открытая запись PAT только внутри воркера до выделения метаданных.
 * @typedef {TokenMetadata & TokenEntryFields} TokenEntry
 */
/**
 * Секрет активированного этапа в памяти воркера; страница этого типа не получает.
 * @typedef {Object} Secret
 * @property {TokenMetadata} entry Метаданные принятой записи, которые можно выдавать странице без PAT.
 * @property {string} token Открытый PAT; этот тип используется только внутри авторизационного воркера.
 * @property {CryptoKey} cacheKey Ключ шифрования закрытых снимков; остаётся внутри воркера.
 * @property {string} ciphertext Зашифрованная запись; используется также для сверки короткого восстановления.
 */
/**
 * Один сеанс открытых секретов воркера; владение передаётся только после сверки восстановления.
 * @typedef {Object} Session
 * @property {'shared'|'dedicated'} mode Shared-сеанс допускает короткий handle; Dedicated-сеанс живёт с экземпляром страницы.
 * @property {string|null} handle Случайный ключ короткого SharedWorker-восстановления; не является PAT.
 * @property {Map<string,Secret>} entries Открытые секреты токенов этого сеанса; при drop/lock/remove ссылки очищаются.
 * @property {string|null} activeId Идентификатор выбранного токена; null означает отсутствие активного доступа.
 * @property {Binding|null} owner Нынешний порт-владелец сеанса; только он выполняет защищённые команды.
 * @property {Binding|null} previousOwner Освобождённый порт, который может вернуться в пределах reloadGraceMs.
 * @property {number} resumeUntil Срок короткого восстановления сеанса в миллисекундах Unix.
 * @property {boolean} preserveBfcache Поле записывается как false; нынешнее исполнение его не читает.
 * @property {number} generation Ревизия сеанса; результат более старой операции не принимается.
 */
/**
 * Привязка порта страницы к сеансу и его отменяемым командам.
 * @typedef {Object} Binding
 * @property {MessagePort|Worker} port Порт страницы или интерфейс DedicatedWorker этой привязки.
 * @property {'shared'|'dedicated'} mode Вид порта; задаётся при создании привязки и не меняется командой страницы.
 * @property {boolean} hello Приветствие данного порта принято; повторное hello запрещено.
 * @property {boolean} pendingResume Порт ожидает сверки сохранённого шифртекста перед восстановлением.
 * @property {boolean} released Порт освобождён и пока не имеет права выполнять защищённые операции.
 * @property {Session|null} session Открытый сеанс этого порта внутри воркера.
 * @property {Map<number,AbortController>} requests Отменяемые GitHub-запросы этого порта, индексированные номером команды.
 */
/**
 * Непринятая разблокировка/добавление с ограниченным сроком; защищённые GET ещё запрещены.
 * @typedef {Object} Stage
 * @property {Binding} binding Порт, который подготовил этап и вправе его активировать.
 * @property {Session} session Открытый сеанс этого порта внутри воркера.
 * @property {number} generation Ревизия сеанса; результат более старой операции не принимается.
 * @property {TokenEntry} entry Подготовленная запись с открытым PAT; существует только внутри воркера до activate/expiry.
 * @property {CryptoKey} cacheKey Ключ шифрования закрытых снимков; остаётся внутри воркера.
 * @property {string} ciphertext Зашифрованная запись; используется также для сверки короткого восстановления.
 * @property {number} expiresAt Срок временного этапа; после него этап больше не активируется.
 */
/**
 * Shared-сеансы по случайным handle; после release действуют только до resumeUntil.
 * @type {Map<string,Session>}
 */
const sessions = new Map();
/**
 * Непринятые этапы добавления/разблокировки; ограничены maxStages и expiresAt.
 * @type {Map<string,Stage>}
 */
const stages = new Map();
const encoder = new TextEncoder();

/**
 * Удаляет истёкшие непринятые этапы из памяти воркера.
 */
function sweepStages() {
  const now = Date.now();
  for (const [id, stage] of stages) if (now > stage.expiresAt) stages.delete(id);
}

/**
 * Сохраняет временный этап и вытесняет старейший при достижении maxStages.
 * @param {string} id Случайный идентификатор этапа, который страница передаёт при activate или discard.
 * @param {Stage} stage Непринятая разблокировка или добавление PAT с портом, ревизией и сроком.
 */
function rememberStage(id, stage) {
  sweepStages();
  while (stages.size >= policy.maxStages) {
    const oldest = stages.keys().next().value;
    if (oldest === undefined) break;
    stages.delete(oldest);
  }
  stages.set(id, stage);
}

/**
 * Создаёт отказ протокола с машинным кодом.
 * @param {string} code Машинный код отказа без открытого секрета.
 * @returns Ошибка без открытого секрета.
 */
function failure(code) {
  return Object.assign(new Error(code), { code });
}

/**
 * Создаёт случайный 256-битный ключ восстановления или этапа.
 * @returns 64 шестнадцатеричных символа.
 */
function randomId() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Отделяет метаданные записи от открытого PAT.
 * @param {TokenEntry} entry Запись с открытым PAT, из которой выбираются только разрешённые странице поля.
 * @returns {TokenMetadata} Разрешённая странице часть записи без token и CryptoKey.
 */
function metadata(entry) {
  return {
    id: entry.id,
    label: entry.label,
    login: entry.login,
    storage: entry.storage,
    addedAt: entry.addedAt,
    credentialId: entry.credentialId,
    prfSalt: entry.prfSalt,
  };
}

/**
 * Проверяет запись перед дешифрованием.
 * @param {unknown} record Запись из хранилища или ответа; до проверки её поля не считаются достоверными.
 * @returns {ValidRecordResult} Допустимые поля записи; повреждённая форма вызывает invalid-record.
 */
function validRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw failure('invalid-record');
  const value = /** @type {Record<string,unknown>} */ (record);
  const storage = value.storage;
  if (storage !== 'encrypted' && storage !== 'passkey') throw failure('invalid-record');
  if (
    typeof value.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.id)
    || typeof value.iv !== 'string'
    || typeof value.ciphertext !== 'string' || value.iv.length > 64
    || value.salt !== undefined && (typeof value.salt !== 'string' || value.salt.length > 64)
    || value.ciphertext.length > 8192 || !value.ciphertext
  ) throw failure('invalid-record');
  return { id: value.id, storage, iv: value.iv, ciphertext: value.ciphertext, salt: value.salt };
}

/**
 * Требует нынешний неосвобождённый порт-владелец после hello.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @returns Сеанс; отсутствие владения вызывает session-lost.
 */
function requireSession(binding) {
  const session = binding.session;
  if (!binding.hello || !session || session.owner !== binding || binding.released) throw failure('session-lost');
  return session;
}

/**
 * Требует активный токен в сеансе нынешнего порта.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @returns Сеанс и его открытый секрет только внутри воркера.
 */
function currentSecret(binding) {
  const session = requireSession(binding);
  const secret = session.activeId ? session.entries.get(session.activeId) : undefined;
  if (!secret) throw failure('session-lost');
  return { session, secret };
}

/**
 * Отменяет и освобождает все запросы данного порта.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 */
function stopRequests(binding) {
  for (const request of binding.requests.values()) request.abort();
  binding.requests.clear();
}

/**
 * Удаляет сеанс, его этапы и ссылки на открытые секреты; прежние порты теряют владение.
 * @param {Session} session Сеанс открытых секретов внутри воркера.
 */
function dropSession(session) {
  if (session.handle) sessions.delete(session.handle);
  for (const [stageId, stage] of stages) if (stage.session === session) stages.delete(stageId);
  session.entries.clear();
  session.activeId = null;
  session.generation++;
  if (session.owner) {
    stopRequests(session.owner);
    session.owner.session = null;
  }
  if (session.previousOwner) session.previousOwner.session = null;
  session.owner = session.previousOwner = null;
}

/**
 * Меняет ключ восстановления и поколение сеанса; пустой или Dedicated-сеанс не получает ключ.
 * @param {Session} session Сеанс открытых секретов внутри воркера.
 * @returns Новый handle либо null.
 */
function rotateHandle(session) {
  if (session.handle) sessions.delete(session.handle);
  session.handle = session.mode === 'shared' && session.entries.size ? randomId() : null;
  if (session.handle) sessions.set(session.handle, session);
  session.generation++;
  return session.handle;
}

/**
 * Отдаёт ожидающий восстановление сеанс новой разблокировке без прежних секретов.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @returns Сеанс нынешнего порта; чужой владелец или истёкший срок вызывают отказ.
 */
function adoptForUnlock(binding) {
  if (!binding.pendingResume) return requireSession(binding);
  const session = binding.session;
  if (!session || session.owner) throw failure('session-lost');
  if (Date.now() > session.resumeUntil) {
    dropSession(session);
    throw failure('session-lost');
  }
  session.entries.clear();
  session.activeId = null;
  session.previousOwner = null;
  session.owner = binding;
  session.resumeUntil = 0;
  session.preserveBfcache = false;
  session.generation++;
  binding.pendingResume = false;
  return session;
}

/**
 * Создаёт привязку либо предлагает короткое восстановление освобождённого Shared-сеанса.
 * @param {Binding} binding Новый порт, ещё не выполнивший приветствие протокола.
 * @param {Record<string,unknown>} payload Поля hello; возможный handle проверяется перед поиском освобождённого Shared-сеанса.
 * @returns Mode и handle, без передачи открытого PAT.
 */
function hello(binding, payload) {
  if (binding.hello) throw failure('already-connected');
  let session = null;
  const proposed = payload?.handle;
  if (binding.mode === 'shared' && typeof proposed === 'string' && /^[0-9a-f]{64}$/.test(proposed)) {
    const old = sessions.get(proposed);
    if (old && !old.owner && Date.now() <= old.resumeUntil) session = old;
    else if (old && !old.owner && Date.now() > old.resumeUntil) dropSession(old);
  }
  if (!session) {
    const handle = binding.mode === 'shared' ? randomId() : null;
    session = {
      mode: binding.mode,
      handle,
      entries: new Map(),
      activeId: null,
      owner: binding,
      previousOwner: null,
      resumeUntil: 0,
      preserveBfcache: false,
      generation: 0,
    };
  } else binding.pendingResume = true;
  binding.session = session;
  binding.hello = true;
  return { mode: binding.mode, handle: session.handle };
}

/**
 * Возвращает только шифртекст для сверки при восстановлении страницы.
 * @param {Binding} binding Порт с непринятым кандидатом короткого восстановления.
 * @returns Метаданные и шифртекст либо null после истечения срока.
 */
function resume(binding) {
  const session = binding.session;
  if (!binding.pendingResume || !session || session.owner) return null;
  if (Date.now() > session.resumeUntil) {
    dropSession(session);
    return null;
  }
  const secret = session.activeId ? session.entries.get(session.activeId) : undefined;
  return secret ? { entry: secret.entry, ciphertext: secret.ciphertext } : null;
}

/**
 * Восстанавливает сеанс лишь при совпадении id и сохранённого шифртекста.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @param {Record<string,unknown>} payload Id активной записи и сохранённый шифртекст; оба сверяются с кандидатом восстановления.
 * @returns Метаданные активной записи и handle без секрета.
 */
function resumeConfirm(binding, payload) {
  const session = binding.session;
  if (!binding.pendingResume || !session || session.owner) throw failure('session-lost');
  if (Date.now() > session.resumeUntil) {
    dropSession(session);
    throw failure('session-lost');
  }
  if (typeof payload.id !== 'string') throw failure('session-lost');
  const secret = session.entries.get(payload.id);
  if (!secret || session.activeId !== payload.id || secret.ciphertext !== payload.ciphertext) {
    throw failure('session-lost');
  }
  for (const id of session.entries.keys()) if (id !== payload.id) session.entries.delete(id);
  if (session.previousOwner) session.previousOwner.session = null;
  session.previousOwner = null;
  session.owner = binding;
  session.resumeUntil = 0;
  session.preserveBfcache = false;
  session.generation++;
  binding.pendingResume = false;
  return { entry: secret.entry, handle: session.handle };
}

/**
 * Удаляет неподтверждённый кандидат восстановления и привязку к нему.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @returns Пустой handle.
 */
function abandonResume(binding) {
  const session = binding.session;
  if (!binding.pendingResume || !session || session.owner) throw failure('session-lost');
  dropSession(session);
  binding.session = null;
  binding.pendingResume = false;
  return { handle: null };
}

/**
 * Проверяет новый PAT и готовит его к активации без возврата секрета странице.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @param {Record<string,unknown>} payload Метаданные новой записи, PAT и переданные байты пароля/PRF; секретные буферы очищаются в finally.
 * @param {AbortSignal} signal Отмена вызывающей стороны; результат после отмены не принимается.
 * @returns Номер этапа, шифртекст и метаданные без права выполнять защищённые GET.
 */
async function stageAdd(binding, payload, signal) {
  try {
    const session = adoptForUnlock(binding);
    const generation = session.generation;
    const input = payload.entry && typeof payload.entry === 'object' && !Array.isArray(payload.entry)
      ? /** @type {Record<string,unknown>} */ (payload.entry)
      : null;
    const id = input?.id;
    const label = input?.label;
    const storage = input?.storage;
    const addedAt = input?.addedAt;
    const credentialId = input?.credentialId;
    const prfSalt = input?.prfSalt;
    const token = payload.token;
    if (
      typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)
      || typeof label !== 'string' || !label.trim() || label.length > 40
      || (storage !== 'encrypted' && storage !== 'passkey') || typeof addedAt !== 'string' || addedAt.length > 64
      || (credentialId !== undefined && (typeof credentialId !== 'string' || credentialId.length > 512))
      || (prfSalt !== undefined && (typeof prfSalt !== 'string' || prfSalt.length > 512))
      || (payload?.passwordBytes instanceof Uint8Array && payload.passwordBytes.byteLength > 1024)
      || typeof token !== 'string' || !token || token.length > 500 || /\s/.test(token)
    ) throw failure('invalid-token');
    const duplicate = () =>
      [...session.entries.values()].some((entry) => entry.token === token)
      || [...stages.values()].some((stage) => stage.session === session && stage.entry.token === token);
    if (duplicate()) throw failure('duplicate-token');
    const user = await github.user(token, signal);
    if (session.generation !== generation || session.owner !== binding || signal.aborted) throw failure('cancelled');
    if (duplicate()) throw failure('duplicate-token');
    const entry = { id, label, login: user.login, token, storage, addedAt, credentialId, prfSalt };
    const sealed = await seal(entry, {
      passwordBytes: payload.passwordBytes instanceof Uint8Array ? payload.passwordBytes : undefined,
      material: payload.material instanceof Uint8Array ? payload.material : undefined,
      credentialId,
      prfSalt,
    });
    if (session.generation !== generation || session.owner !== binding || signal.aborted) throw failure('cancelled');
    const stageId = randomId();
    rememberStage(stageId, {
      binding,
      session,
      generation,
      entry,
      cacheKey: sealed.cacheKey,
      ciphertext: sealed.record.ciphertext,
      expiresAt: Date.now() + policy.stageTtlMs,
    });
    setTimeout(() => {
      const stage = stages.get(stageId);
      if (stage && Date.now() >= stage.expiresAt) stages.delete(stageId);
    }, policy.stageTtlMs + 10);
    return { stageId, record: sealed.record, entry: metadata(entry) };
  } finally {
    if (payload?.passwordBytes instanceof Uint8Array && payload.passwordBytes.byteLength) payload.passwordBytes.fill(0);
    if (payload?.material instanceof Uint8Array && payload.material.byteLength) payload.material.fill(0);
  }
}

/**
 * Открывает сохранённую запись во временный этап без права на GitHub-запросы.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @param {Record<string,unknown>} payload Зашифрованная record и байты пароля/PRF; форма записи проверяется, буферы очищаются в finally.
 * @returns Номер этапа и метаданные; неверная защита вызывает unlock-failed.
 */
async function stageUnlock(binding, payload) {
  try {
    const session = adoptForUnlock(binding);
    const generation = session.generation;
    const record = validRecord(payload?.record);
    let opened;
    try {
      opened = await unseal(record, {
        passwordBytes: payload.passwordBytes instanceof Uint8Array ? payload.passwordBytes : undefined,
        material: payload.material instanceof Uint8Array ? payload.material : undefined,
      });
    } catch {
      throw failure('unlock-failed');
    }
    if (session.generation !== generation || session.owner !== binding) throw failure('cancelled');
    const stageId = randomId();
    rememberStage(stageId, {
      binding,
      session,
      generation,
      entry: opened.entry,
      cacheKey: opened.cacheKey,
      ciphertext: record.ciphertext,
      expiresAt: Date.now() + policy.stageTtlMs,
    });
    setTimeout(() => {
      const stage = stages.get(stageId);
      if (stage && Date.now() >= stage.expiresAt) stages.delete(stageId);
    }, policy.stageTtlMs + 10);
    return { stageId, entry: metadata(opened.entry) };
  } finally {
    if (payload?.passwordBytes instanceof Uint8Array && payload.passwordBytes.byteLength) payload.passwordBytes.fill(0);
    if (payload?.material instanceof Uint8Array && payload.material.byteLength) payload.material.fill(0);
  }
}

/**
 * Активирует этап только при совпадении владельца, срока и шифртекста.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @param {Record<string,unknown>} payload StageId и сохранённый ciphertext для принятия именно подготовленной записи.
 * @returns Метаданные и handle принятого сеанса без открытого PAT.
 */
function activate(binding, payload) {
  const session = requireSession(binding);
  if (typeof payload.stageId !== 'string') throw failure('stage-expired');
  const stage = stages.get(payload.stageId);
  if (
    !stage || stage.binding !== binding || stage.session !== session || stage.generation !== session.generation
    || Date.now() > stage.expiresAt || stage.ciphertext !== payload?.ciphertext
  ) throw failure('stage-expired');
  stages.delete(payload.stageId);
  const entry = metadata(stage.entry);
  session.entries.set(entry.id, {
    entry,
    token: stage.entry.token,
    cacheKey: stage.cacheKey,
    ciphertext: stage.ciphertext,
  });
  session.activeId = entry.id;
  session.generation++;
  if (session.mode === 'shared' && !session.handle) rotateHandle(session);
  else if (session.handle) sessions.set(session.handle, session);
  return { entry, handle: session.handle };
}

/**
 * Выбирает имеющийся открытый токен после сверки его шифртекста и отменяет прежние GET.
 * @param {Binding} binding Нынешний порт-владелец сеанса, чьи текущие GET будут отменены.
 * @param {Record<string,unknown>} payload Идентификатор выбираемого PAT и шифртекст для сверки с открытой записью.
 * @returns Метаданные и нынешний handle.
 */
function select(binding, payload) {
  const session = requireSession(binding);
  if (typeof payload.id !== 'string') throw failure('session-lost');
  const secret = session.entries.get(payload.id);
  if (!secret || secret.ciphertext !== payload?.ciphertext) throw failure('session-lost');
  stopRequests(binding);
  session.activeId = payload.id;
  session.generation++;
  return { entry: secret.entry, handle: session.handle };
}

/**
 * Удаляет открытый секрет выбранной записи и её этапы, отменяет GET и меняет handle.
 * @param {Binding} binding Нынешний порт-владелец сеанса блокируемого токена.
 * @param {Record<string,unknown>} payload Команда с id активной записи PAT; другая запись отклоняется.
 * @returns Handle сеанса без заблокированного токена.
 */
function lock(binding, payload) {
  const session = requireSession(binding);
  if (typeof payload.id !== 'string') throw failure('session-lost');
  if (session.activeId !== payload?.id || !session.entries.has(payload.id)) throw failure('session-lost');
  stopRequests(binding);
  for (const [stageId, stage] of stages) {
    if (stage.session === session && stage.entry.id === payload.id) stages.delete(stageId);
  }
  session.entries.delete(payload.id);
  session.activeId = null;
  return { handle: rotateHandle(session) };
}

/**
 * Удаляет указанную запись из сеансов воркера и уведомляет других владельцев о смене handle.
 * @param {Binding} binding Вызывающий порт; ему возвращается его handle после удаления.
 * @param {Record<string,unknown>} payload Команда с id записи PAT, удаляемой из открытых сеансов и этапов.
 * @returns Handle вызывающего порта после удаления.
 */
function remove(binding, payload) {
  const id = payload?.id;
  if (typeof id !== 'string') throw failure('invalid-token');
  for (const session of new Set(sessions.values())) {
    if (!session.entries.delete(id)) continue;
    if (session.activeId === id) session.activeId = null;
    if (session.owner) stopRequests(session.owner);
    const handle = rotateHandle(session);
    if (session.owner && session.owner !== binding) {
      try {
        session.owner.port.postMessage({ v: protocol, event: 'handle-rotated', handle, activeId: session.activeId });
      } catch {}
    }
  }
  if (binding.mode === 'dedicated' && binding.session?.entries.delete(id)) {
    if (binding.session.activeId === id) {
      binding.session.activeId = null;
      stopRequests(binding);
    }
    binding.session.generation++;
  }
  for (const [stageId, stage] of stages) if (stage.entry.id === id) stages.delete(stageId);
  const session = binding.session;
  return { handle: session?.handle || null };
}

/**
 * Освобождает соединение на короткий срок перезагрузки или возврата из BFCache.
 * @param {Binding} binding Нынешний порт-владелец, временно теряющий право защищённых команд.
 * @param {Record<string,unknown>} payload Поля release; нынешнее исполнение их не читает, включая persisted.
 * @returns Handle освобождённого сеанса.
 */
function release(binding, payload) {
  const session = requireSession(binding);
  stopRequests(binding);
  session.owner = null;
  session.previousOwner = binding;
  session.resumeUntil = Date.now() + policy.reloadGraceMs;
  session.preserveBfcache = false;
  binding.released = true;
  setTimeout(() => {
    if (!session.owner && Date.now() > session.resumeUntil) dropSession(session);
  }, policy.reloadGraceMs + 10);
  return { handle: session.handle };
}

/**
 * Возобновляет только прежнее соединение-владелец до истечения срока BFCache.
 * @param {Binding} binding Прежний порт-владелец, вернувшийся в пределах reloadGraceMs.
 * @returns Наличие живого сеанса и его handle; чужой порт не принимает владение.
 */
function renew(binding) {
  const session = binding.session;
  if (!session) return { active: false, handle: null };
  if (session.owner === binding && !binding.released) return { active: true, handle: session.handle };
  if (session.previousOwner !== binding || session.owner) return { active: false, handle: null };
  if (Date.now() > session.resumeUntil) {
    dropSession(session);
    return { active: false, handle: null };
  }
  session.owner = binding;
  session.previousOwner = null;
  session.resumeUntil = 0;
  session.preserveBfcache = false;
  binding.released = false;
  return { active: true, handle: session.handle };
}

/**
 * Выполняет разрешённый GitHub GET и отклоняет ответ сменившегося сеанса.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @param {Record<string,unknown>} payload Repo и поля выбранного чтения: branch для commit, path/ref/kind для content.
 * @param {string} operation Уже выбранная диспетчером защищённая команда repository, commit или content.
 * @param {AbortSignal} signal Отмена вызывающей стороны; результат после отмены не принимается.
 * @returns Разрешённые данные ответа; PAT и заголовки не выдаются странице.
 */
async function authenticated(binding, payload, operation, signal) {
  const { session, secret } = currentSecret(binding);
  const generation = session.generation;
  let body;
  if (typeof payload.repo !== 'string') throw failure('invalid-repository');
  if (operation === 'repository') body = await github.repository(payload.repo, secret.token, signal);
  else if (operation === 'commit') {
    if (typeof payload.branch !== 'string') throw failure('invalid-ref');
    body = await github.commit(payload.repo, payload.branch, secret.token, signal);
  } else {
    if (
      typeof payload.path !== 'string' || typeof payload.kind !== 'string'
      || !['checksum', 'snapshot', 'document', 'linked-document', 'source'].includes(payload.kind)
    ) throw failure('invalid-path');
    if (typeof payload.ref !== 'string') throw failure('invalid-ref');
    body = await github.content(
      payload.repo,
      payload.path,
      payload.ref,
      /**
       * @type {'checksum'|'snapshot'|'document'|'linked-document'|'source'}
       */ (payload.kind),
      secret.token,
      signal,
    );
  }
  if (session.generation !== generation || session.owner !== binding || signal.aborted) throw failure('cancelled');
  return body;
}

/**
 * Запечатывает или открывает снимок активным ключом в пределах лимита размера.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @param {Record<string,unknown>} payload Key идентичности снимка и record для открытия либо entry для шифрования.
 * @param {boolean} opening Открыть сохранённый шифртекст вместо шифрования новых данных.
 * @returns Шифртекст либо внешний JSON; смена владельца во время операции вызывает отказ.
 */
async function snapshotCrypto(binding, payload, opening) {
  const { session, secret } = currentSecret(binding);
  const generation = session.generation;
  const identity = payload?.identity;
  if (typeof identity !== 'string' || identity.length > 300 || !identity.startsWith(`${session.activeId}:`)) {
    throw failure('invalid-identity');
  }
  if (opening) {
    const record = payload?.record;
    if (
      !record || typeof record !== 'object' || !('ciphertext' in record) || typeof record.ciphertext !== 'string'
      || !('iv' in record) || typeof record.iv !== 'string'
      || record.ciphertext.length > Math.ceil(maxSnapshotBytes / 3) * 4 + 128
    ) throw failure('response-too-large');
    const body = await unsealSnapshot({ iv: record.iv, ciphertext: record.ciphertext }, secret.cacheKey, identity);
    if (session.generation !== generation || session.owner !== binding) throw failure('session-lost');
    return body;
  }
  const entry = payload?.entry;
  if (!entry || encoder.encode(JSON.stringify(entry)).byteLength > maxSnapshotBytes) {
    throw failure('response-too-large');
  }
  const body = await sealSnapshot(entry, secret.cacheKey, identity);
  if (session.generation !== generation || session.owner !== binding) throw failure('session-lost');
  return body;
}

/**
 * Распределяет команды после проверки конверта протокола.
 * @param {Binding} binding Порт и его принадлежность текущему сеансу воркера.
 * @param {OperationMessage} message Конверт команды с номером, именем операции и проверенным объектом payload.
 * @returns Результат выбранной операции; неизвестная команда вызывает invalid-operation.
 */
async function operation(binding, message) {
  sweepStages();
  const payload = message.payload || {};
  switch (message.op) {
    case 'hello':
      return hello(binding, payload);
    case 'resume':
      return resume(binding);
    case 'resume-confirm':
      return resumeConfirm(binding, payload);
    case 'abandon-resume':
      return abandonResume(binding);
    case 'renew':
      return renew(binding);
    case 'release':
      return release(binding, payload);
    case 'stage-unlock':
      return stageUnlock(binding, payload);
    case 'activate':
      return activate(binding, payload);
    case 'discard':
      if (typeof payload.stageId === 'string') stages.delete(payload.stageId);
      return null;
    case 'select':
      return select(binding, payload);
    case 'lock':
      return lock(binding, payload);
    case 'remove':
      return remove(binding, payload);
    case 'seal-snapshot':
      return snapshotCrypto(binding, payload, false);
    case 'unseal-snapshot':
      return snapshotCrypto(binding, payload, true);
    case 'cancel':
      if (typeof payload.id === 'number') binding.requests.get(payload.id)?.abort();
      return null;
    case 'cancel-all':
      stopRequests(binding);
      return null;
    case 'stage-add':
    case 'repository':
    case 'commit':
    case 'content': {
      const controller = new AbortController();
      binding.requests.set(message.id, controller);
      try {
        return message.op === 'stage-add'
          ? await stageAdd(binding, payload, controller.signal)
          : await authenticated(binding, payload, message.op, controller.signal);
      } finally {
        binding.requests.delete(message.id);
      }
    }
    default:
      throw failure('invalid-operation');
  }
}

/**
 * Отделяет разрешённые поля отказа для ответа странице.
 * @param {unknown} cause Ошибка, из которой извлекаются только разрешённые поля ответа.
 * @returns Ограниченный код, статус и detail без открытого секрета.
 */
function errorValue(cause) {
  const error = cause && typeof cause === 'object' ? /** @type {Record<string,unknown>} */ (cause) : {};
  const code = typeof error.code === 'string' ? error.code : 'worker-failed';
  return {
    code,
    message: code,
    status: typeof error.status === 'number' && Number.isInteger(error.status) ? error.status : 0,
    denied: error.denied === true,
    rateLimited: error.rateLimited === true,
    detail: typeof error.detail === 'string' ? error.detail.slice(0, 200) : '',
  };
}

/**
 * Проверяет конверт входящего сообщения и отвечает тому же порту с исходным номером команды.
 * @param {Binding} binding Привязка порта, которому возвращается ответ или ограниченная ошибка.
 * @param {{data:unknown}} event MessageEvent привязанного порта страницы с внешним конвертом команды.
 */
async function dispatch(binding, event) {
  const value = event.data;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const message = /** @type {Record<string,unknown>} */ (value);
  if (typeof message.id !== 'number' || !Number.isSafeInteger(message.id) || message.id <= 0) return;
  if (message.v !== protocol) {
    binding.port.postMessage({
      v: protocol,
      id: message.id,
      ok: false,
      error: errorValue(failure('protocol-mismatch')),
    });
    return;
  }
  try {
    if (
      typeof message.op !== 'string' || (message.payload !== undefined
        && (!message.payload || typeof message.payload !== 'object' || Array.isArray(message.payload)))
    ) {
      throw failure('invalid-operation');
    }
    const result = await operation(
      binding,
      /**
       * @type {{id:number,op:string,payload?:Record<string,unknown>}}
       */ (message),
    );
    try {
      binding.port.postMessage({ v: protocol, id: message.id, ok: true, result });
    } catch {}
  } catch (error) {
    try {
      binding.port.postMessage({ v: protocol, id: message.id, ok: false, error: errorValue(error) });
    } catch {}
  }
}

/**
 * Создаёт отдельную привязку порта и слушатель команд до конца его соединения.
 * @param {MessagePort|Worker} port MessagePort SharedWorker либо интерфейс DedicatedWorker для сообщений одной страницы.
 * @param {'shared'|'dedicated'} mode Вид соединения, определяющий возможность короткого восстановления.
 */
function attach(port, mode) {
  /**
   * @type {Binding}
   */
  const binding = {
    port,
    mode,
    hello: false,
    pendingResume: false,
    released: false,
    session: null,
    requests: new Map(),
  };
  port.addEventListener('message', (event) => {
    if ('data' in event) void dispatch(binding, event);
  });
  if ('start' in port && typeof port.start === 'function') port.start();
}

if ('onconnect' in self) {
  self.onconnect = (/** @type {MessageEvent} */ event) => {
    for (const port of event.ports) attach(port, 'shared');
  };
} else attach(/** @type {Worker} */ (/** @type {unknown} */ (self)), 'dedicated');

/**
 * Открытый PAT внутри воркера, дополняющий разрешённые странице метаданные.
 * @typedef {Object} TokenEntryFields
 * @property {string} token Открытый PAT; этот тип используется только внутри авторизационного воркера.
 */

/**
 * Проверенные поля записи, достаточные для открытия PAT выбранной защитой.
 * @typedef {Object} ValidRecordResult
 * @property {string} id Идентификатор записи; открытый PAT в идентификатор не входит.
 * @property {'encrypted'|'passkey'} storage Способ защиты PAT: пароль или passkey; не обозначает открытый секрет.
 * @property {string} iv Случайный вектор AES-GCM в Base64; хранится рядом с шифртекстом.
 * @property {string} ciphertext Зашифрованная запись; используется также для сверки короткого восстановления.
 * @property {string} [salt] Соль PBKDF2 в Base64 для защиты паролем; у passkey её нет.
 */

/**
 * Конверт принятой команды Octocat; payload ещё проверяется выбранной операцией.
 * @typedef {Object} OperationMessage
 * @property {number} id Идентификатор записи; открытый PAT в идентификатор не входит.
 * @property {string} op Имя разрешённой команды протокола Octocat.
 * @property {Record<string,unknown>} [payload] Объект входных полей; конкретная операция проверяет состав до доступа к секретам.
 */
