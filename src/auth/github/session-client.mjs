/** Клиент протокола Octocat: соединение, короткое восстановление сеанса и отмена ожидающих команд. */
import { formatText, ui } from '../../common/ui/text.mjs';
import octocat from './json/octocat.json' with { type: 'json' };

const VERSION = octocat.protocol;
const WORKER_URL = octocat.output;
const SESSION_KEY = octocat.sessionStorageKey;
export const OCTOCAT_AUTO_RESTORE_KEY = octocat.autoRestoreStorageKey;
const LEGACY_PASSKEY_ON_OPEN_KEY = 'github-passkey-on-open';
const FETCH_TIMEOUT = octocat.requestTimeoutMs;
const CRYPTO_TIMEOUT = octocat.cryptoTimeoutMs;

/**
 * Читает единую настройку запуска/запроса ключа, сохраняя прежний выбор из старого ключа при первом чтении.
 * @returns {boolean} false только для явно сохранённой строки false; отсутствие и отказ хранилища оставляют автоматическое восстановление включённым.
 */
export function octocatAutoRestoreEnabled() {
  try {
    const current = localStorage.getItem(OCTOCAT_AUTO_RESTORE_KEY);
    const previous = localStorage.getItem(LEGACY_PASSKEY_ON_OPEN_KEY);
    if (current !== null) {
      if (previous !== null) {
        try {
          localStorage.removeItem(LEGACY_PASSKEY_ON_OPEN_KEY);
        } catch {}
      }
      return current !== 'false';
    }
    if (previous !== null) {
      const enabled = previous !== 'false';
      try {
        localStorage.setItem(OCTOCAT_AUTO_RESTORE_KEY, String(enabled));
        localStorage.removeItem(LEGACY_PASSKEY_ON_OPEN_KEY);
      } catch {}
      return enabled;
    }
    return localStorage.getItem(OCTOCAT_AUTO_RESTORE_KEY) !== 'false';
  } catch {
    return true;
  }
}

/**
 * Единственная возвращаемая часть метаданных GitHub-репозитория.
 * @typedef {object} RepositoryBranch
 * @property {string} default_branch Строка ветки по умолчанию; дальнейший договор ревизии проверяет GithubAccess.
 */
/**
 * Единственная возвращаемая часть ответа о коммите выбранной ветки.
 * @typedef {object} BranchCommit
 * @property {string} sha Строковый SHA из ответа; форму полного хэша отдельно проверяет GithubAccess.
 */

/**
 * Вид нынешнего браузерного канала Octocat; DedicatedWorker не сохраняет открытый сеанс после перезагрузки.
 * @typedef {'shared'|'dedicated'} WorkerMode
 */
/**
 * Фаза соединения страницы с Octocat; connected сама по себе не означает открытый PAT.
 * @typedef {'ready'|'connecting'|'reconnecting'|'connected'|'unavailable'|'lost'} WorkerPhase
 */
/**
 * Один ожидаемый ответ нынешнего порта; удаляется при ответе, внешней отмене или закрытии канала.
 * @typedef {object} Pending
 * @property {(value:unknown)=>void} resolve Принимает непроверенный result; конкретный вызывающий метод проверяет форму.
 * @property {(error:Error)=>void} reject Отклоняет запрос при проверенной ошибке либо потере соединения.
 * @property {number} timer Таймер ожидания ответа в исходном окне; его срок закрывает весь канал.
 * @property {AbortSignal} [signal] Внешняя отмена только этой операции.
 * @property {()=>void} [abort] Снимает ожидание и посылает cancel для номера команды.
 */
/**
 * Метаданные открытой записи, разрешённые странице; открытый PAT и ключи сюда не входят.
 * @typedef {object} SessionEntry
 * @property {string} id Идентификатор записи, подтверждённый ответом команды.
 * @property {string} label Подпись токена, сохранённая в его запечатанном JSON.
 * @property {string} login Подтверждённое имя GitHub из метаданных записи.
 * @property {string} storage Способ защиты записи.
 * @property {string} [addedAt] Дата добавления для списка.
 * @property {string} [credentialId] Кодированный идентификатор ключа доступа.
 * @property {string} [prfSalt] Кодированная соль повторного запроса PRF.
 */
/**
 * Проверяемая форма запечатанной PAT-записи, которую страница может сохранить без секрета.
 * @typedef {import('./vault.mjs').TokenRecord} EncryptedRecord
 */
/**
 * Настройки ожидания одной команды; transfer передаёт владение перечисленными буферами воркеру.
 * @typedef {object} CommandOptions
 * @property {number} [timeout] Миллисекунды до закрытия канала; отсутствие использует обычный requestTimeoutMs.
 * @property {Transferable[]} [transfer] Одноразовые переносимые объекты этой команды, обычно пароль/PRF-буферы.
 * @property {AbortSignal} [signal] Внешняя отмена ожидания и операции с данным номером.
 */
/**
 * Минимальная форма события от Worker или MessagePort до проверки протокола и номера команды.
 * @typedef {object} WorkerReplyEvent
 * @property {unknown} data Непроверенное содержимое сообщения; ответ старого поколения игнорируется.
 */
/**
 * Поля отказа, по которым выбирается закреплённый текст интерфейса.
 * @typedef {object} ReplyError
 * @property {string} [code] Код отказа воркера; неизвестный код получает общую подпись.
 * @property {string} [message] Полученный текст, который здесь не выводится; подпись выбирается по code.
 * @property {number} [status] HTTP-статус только для подписи github-failed.
 */
/**
 * Состояние соединения для формы и настроек без handle, PAT или ключей.
 * @typedef {object} WorkerStatus
 * @property {WorkerPhase} phase Нынешняя фаза подключения страницы.
 * @property {WorkerMode|null} mode Канал, выбранный при создании воркера; null после закрытия.
 * @property {boolean} active Страница имеет id записи после успешного открытия/активации, не утверждение всех прав репозитория.
 */
/**
 * Подготовленный секрет одного сообщения; postMessage отсоединяет переданный буфер от страницы.
 * @typedef {object} TransferredSecret
 * @property {object} payload Поле material либо passwordBytes для команды шифрования/открытия.
 * @property {Transferable[]} transfer Соответствующий ArrayBuffer для передачи без второй копии в сообщении.
 */
/**
 * Подготовленное добавление, ещё не принятое в активный сеанс.
 * @typedef {object} StagedAddition
 * @property {string} stageId Временный идентификатор операции в Octocat для activate/discard.
 * @property {EncryptedRecord} record Шифртекст, который требуется сохранить до activate.
 * @property {SessionEntry} entry Проверенные метаданные будущей активной записи.
 */
/**
 * Подготовленное открытие существующей записи, ещё не принятое activate.
 * @typedef {object} StagedUnlock
 * @property {string} stageId Временная операция Octocat, принимаемая после сверки записи хранилища.
 * @property {SessionEntry} entry Проверенные метаданные открытого JSON без PAT.
 */
/**
 * Кандидат короткого восстановления SharedWorker, который страница ещё сверяет с хранилищем.
 * @typedef {object} ResumeCandidate
 * @property {SessionEntry} entry Метаданные сохранявшегося открытого сеанса.
 * @property {string} ciphertext Шифртекст этой записи для точной проверки до resumeConfirm.
 */
/**
 * Состояние handle после удаления или блокировки; ключи и PAT остаются внутри Octocat.
 * @typedef {object} HandleResult
 * @property {string|null} handle Новый случайный handle либо отсутствие сохраняемого сеанса.
 */

/**
 * Отбрасывает не-объект и массив до чтения полей ответа Octocat.
 * @param {unknown} value Непроверенный result выбранной команды.
 * @returns {Record<string,unknown>} Объект, чьи отдельные поля ещё требуют проверки.
 * @throws {Error} Если ответ не имеет объектной формы.
 */
function responseObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(ui.access.accessChanged);
  return /** @type {Record<string,unknown>} */ (value);
}

/**
 * Проверяет только разрешённые странице метаданные ответа; PAT и ключей в этой форме нет.
 * @param {unknown} value Непроверенное поле entry ответа Octocat.
 * @returns {SessionEntry} Метаданные с обязательными строками и допустимыми необязательными строками.
 * @throws {Error} При повреждённой форме ответа.
 */
function responseEntry(value) {
  const entry = responseObject(value);
  if (
    typeof entry.id !== 'string' || typeof entry.label !== 'string' || typeof entry.login !== 'string'
    || typeof entry.storage !== 'string'
    || ['addedAt', 'credentialId', 'prfSalt'].some((key) => entry[key] !== undefined && typeof entry[key] !== 'string')
  ) {
    throw new Error(ui.access.accessChanged);
  }
  return /** @type {SessionEntry} */ (entry);
}

/**
 * Проверяет форму шифрованной PAT-записи перед её передачей хранилищу.
 * @param {unknown} value Непроверенное поле record подготовленного добавления.
 * @returns {EncryptedRecord} Строковые поля шифртекста и метаданных, без расшифрования.
 * @throws {Error} При неверной форме записи.
 */
function responseRecord(value) {
  const record = responseObject(value);
  if (
    typeof record.id !== 'string' || typeof record.storage !== 'string' || typeof record.iv !== 'string'
    || typeof record.ciphertext !== 'string'
    || ['salt', 'addedAt', 'credentialId', 'prfSalt'].some((key) =>
      record[key] !== undefined && typeof record[key] !== 'string'
    )
  ) {
    throw new Error(ui.access.accessChanged);
  }
  return /** @type {EncryptedRecord} */ (record);
}

/**
 * Принимает только строковый handle сеанса либо явное отсутствие.
 * @param {unknown} value Непроверенное поле handle ответа.
 * @returns {string|null} Handle для памяти/сохранения страницы либо null.
 * @throws {Error} Если поле не является строкой или null.
 */
function responseHandle(value) {
  if (value !== null && typeof value !== 'string') throw new Error(ui.access.accessChanged);
  return value;
}

/** Страница получает шифртекст, метаданные и случайный handle, но не открытый PAT или ключ. */
export class GithubSessionClient extends EventTarget {
  /**
   * Нынешний браузерный SharedWorker/Worker; ссылка снимается при закрытии канала.
   * @type {SharedWorker|Worker|null}
   */
  #worker = null;
  /**
   * Нынешний транспорт команд: MessagePort shared либо сам DedicatedWorker.
   * @type {MessagePort|Worker|null}
   */
  #port = null;
  /**
   * Вид созданного канала, выбранный до hello; null до создания и после close.
   * @type {WorkerMode|null}
   */
  #mode = null;
  /**
   * Одно ожидание создания/hello; параллельные connect используют его до finally.
   * @type {Promise<WorkerMode>|null}
   */
  #connecting = null;
  /**
   * Ожидаемые ответы по номерам нынешнего порта; close отклоняет и удаляет весь набор.
   * @type {Map<number,Pending>}
   */
  #pending = new Map();
  /**
   * Последний номер исходящей команды этой страницы, включая команды без ожидания ответа.
   */
  #nextId = 0;
  /**
   * Поколение порта; открытие/закрытие делает ответы прежнего подключения недействительными.
   */
  #generation = 0;
  /**
   * Нынешний hello принят с совпавшим видом канала; не означает наличия активного PAT.
   */
  #connected = false;
  /**
   * Страница получила pagehide; не пытается возобновлять сеанс до pageshow.
   */
  #leaving = false;
  /**
   * Одно ожидание проверки handle после возврата/видимости страницы.
   * @type {Promise<void>|null}
   */
  #renewPending = null;
  /**
   * Фаза подключения для UI; state-change отправляется после её принятия.
   * @type {WorkerPhase}
   */
  #state = 'ready';
  /**
   * Id записи после принятой активации/восстановления, без PAT; close снимает его.
   * @type {string|null}
   */
  #activeId = null;
  /**
   * Нынешний случайный идентификатор сеанса; сохраняется в sessionStorage лишь для активной записи.
   * @type {string|null}
   */
  #handle = null;
  /**
   * Считанный при создании признак прежнего DedicatedWorker-сеанса без секрета; после чтения отметка удаляется.
   */
  #hadDedicatedSession = false;

  /**
   * Читает только местные признаки сеанса и связывает проверку соединения с уходом, возвратом и видимостью исходной страницы.
   */
  constructor() {
    super();
    if (!this.compatible) this.#state = 'unavailable';
    try {
      this.#handle = sessionStorage.getItem(SESSION_KEY);
    } catch {}
    try {
      this.#hadDedicatedSession = sessionStorage.getItem(octocat.dedicatedSessionMarkerKey) === 'true';
      sessionStorage.removeItem(octocat.dedicatedSessionMarkerKey);
    } catch {}
    window.addEventListener('pagehide', (event) => {
      this.#leaving = true;
      if (this.#connected) this.#fire('release', { persisted: event.persisted === true });
      if (!this.#activeId) this.#saveHandle(this.#handle, false);
    });
    window.addEventListener('pageshow', () => {
      this.#leaving = false;
      if (this.#state === 'lost') this.dispatchEvent(new Event('lost'));
      else if (this.#connected) void this.renew().catch(() => {});
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.#connected) void this.renew().catch(() => {});
    });
  }

  /**
   * Проверяет наличие браузерного Worker API, не запуская воркер и не подтверждая токен.
   * @returns {boolean} true при наличии SharedWorker либо Worker.
   */
  get compatible() {
    return Boolean(globalThis.SharedWorker || globalThis.Worker);
  }
  /**
   * Возвращает вид созданного транспорта, в том числе во время ожидания hello.
   * @returns {WorkerMode|null} shared/dedicated либо отсутствие нынешнего порта.
   */
  get mode() {
    return this.#mode;
  }
  /**
   * Возвращает нынешний случайный handle для проверки записи доступа.
   * @returns {string|null} Идентификатор сеанса, а не PAT или ключ шифрования.
   */
  get handle() {
    return this.#handle;
  }
  /**
   * Сообщает исходный факт предыдущего DedicatedWorker-сеанса, прочитанный до подключения.
   * @returns {boolean} Признак для предложения восстановить доступ; открытый сеанс этим не восстанавливается.
   */
  get hadDedicatedSession() {
    return this.#hadDedicatedSession;
  }
  /**
   * Возвращает нынешнюю фазу подключения страницы к Octocat.
   * @returns {WorkerPhase} ready/connecting/reconnecting/connected/unavailable/lost.
   */
  get state() {
    return this.#state;
  }
  /**
   * Подготавливает короткое состояние соединения для формы без секретов и handle.
   * @returns {WorkerStatus} Фаза, вид канала и наличие id принятой активной записи.
   */
  get status() {
    return { phase: this.#state, mode: this.#mode, active: Boolean(this.#activeId) };
  }

  /**
   * Принимает фазу соединения и уведомляет потребителей готовых getters.
   * @param {WorkerPhase} state Новая фаза подключения.
   * @param {boolean} [force=false] Уведомить также при прежней фазе, когда изменился activeId/handle.
   * @returns {void} Повтор прежней фазы без force пропускается.
   */
  #setState(state, force = false) {
    if (this.#state === state && !force) return;
    this.#state = state;
    this.dispatchEvent(new Event('state-change'));
  }

  /**
   * Согласует handle в памяти и sessionStorage; отказ хранения не закрывает живое соединение.
   * @param {string|null} handle Новый случайный handle; пустая строка снимает его.
   * @param {boolean} [persist] Сохранить для перезагрузки; по умолчанию только при activeId.
   * @returns {void} При persist=false удаляет постоянную запись, сохраняя переданный handle в памяти.
   */
  #saveHandle(handle, persist = Boolean(this.#activeId)) {
    this.#handle = typeof handle === 'string' && handle ? handle : null;
    try {
      if (this.#handle && persist) sessionStorage.setItem(SESSION_KEY, this.#handle);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  /**
   * Сохраняет лишь факт активного DedicatedWorker-сеанса для предложения восстановления после перезагрузки.
   * @returns {void} Для другого режима/пустого activeId отметка снимается; отказ хранения допускается.
   */
  #saveDedicatedMarker() {
    try {
      if (this.#mode === 'dedicated' && this.#activeId) {
        sessionStorage.setItem(octocat.dedicatedSessionMarkerKey, 'true');
      } else sessionStorage.removeItem(octocat.dedicatedSessionMarkerKey);
    } catch {}
  }

  /**
   * Снимает порт, активный id и ожидания; поздние ответы старого поколения больше не принимаются.
   * @param {unknown} reason Причина потери соединения; не-Error заменяется общим отказом доступа.
   * @param {boolean} [notify=true] Для принятого ранее соединения показать lost и уведомить о потере, иначе вернуться к ready.
   * @returns {void} DedicatedWorker завершается; shared закрывает только этот порт.
   */
  #close(reason, notify = true) {
    const error = reason instanceof Error ? reason : new Error(ui.access.accessChanged);
    const wasConnected = this.#connected;
    if (wasConnected && !this.#leaving && this.#port) {
      try {
        this.#port.postMessage({ v: VERSION, id: ++this.#nextId, op: 'release', payload: { persisted: false } });
      } catch {}
    }
    for (const [id, pending] of this.#pending) {
      clearTimeout(pending.timer);
      if (pending.signal && pending.abort) pending.signal.removeEventListener('abort', pending.abort);
      pending.reject(error);
      this.#pending.delete(id);
    }
    if (this.#mode === 'shared') /** @type {MessagePort} */ (this.#port)?.close();
    if (this.#mode === 'dedicated') /** @type {Worker} */ (this.#worker)?.terminate();
    this.#port = this.#worker = null;
    this.#mode = null;
    this.#activeId = null;
    ++this.#generation;
    this.#connected = false;
    if (wasConnected) {
      if (!this.#leaving) this.#saveHandle(null);
      this.#setState(notify ? 'lost' : 'ready');
      if (notify && !this.#leaving) this.dispatchEvent(new Event('lost'));
    }
  }

  /**
   * Принимает сообщения только нынешнего порта и проверяет протокол/номер до завершения ожидаемой команды.
   * @param {WorkerReplyEvent} event Событие Worker/MessagePort с ещё неизвестным data.
   * @param {number} generation Поколение, при котором был привязан этот транспорт.
   * @returns {void} Повреждённое сообщение закрывает канал; отсутствующий номер ожидания игнорируется.
   */
  #receive(event, generation) {
    if (generation !== this.#generation) return;
    const reply = event.data && typeof event.data === 'object' && !Array.isArray(event.data)
      ? /** @type {Record<string,unknown>} */ (event.data)
      : null;
    if (reply?.v === VERSION && reply.event === 'handle-rotated') {
      if (
        (typeof reply.handle !== 'string' && reply.handle !== null)
        || (typeof reply.activeId !== 'string' && reply.activeId !== null)
      ) {
        this.#close(new Error(ui.access.accessChanged));
        return;
      }
      this.#activeId = reply.activeId;
      this.#saveHandle(reply.handle);
      this.#setState('connected', true);
      return;
    }
    if (reply?.v !== VERSION || typeof reply.id !== 'number' || !Number.isSafeInteger(reply.id)) {
      this.#close(new Error(ui.access.accessChanged));
      return;
    }
    const pending = this.#pending.get(reply.id);
    if (!pending) return;
    this.#pending.delete(reply.id);
    clearTimeout(pending.timer);
    if (pending.signal && pending.abort) pending.signal.removeEventListener('abort', pending.abort);
    if (reply.ok === true) {
      pending.resolve(reply.result);
      return;
    }
    const rawError = reply.error && typeof reply.error === 'object' && !Array.isArray(reply.error)
      ? /** @type {Record<string,unknown>} */ (reply.error)
      : {};
    const response = {
      code: typeof rawError.code === 'string' ? rawError.code : undefined,
      status: typeof rawError.status === 'number' ? rawError.status : undefined,
      denied: rawError.denied === true,
      rateLimited: rawError.rateLimited === true,
      detail: typeof rawError.detail === 'string' ? rawError.detail : undefined,
    };
    const error = new Error(this.#errorMessage(response));
    Object.assign(error, response);
    pending.reject(error);
    if (response.code === 'session-lost') this.#close(error);
  }

  /**
   * Выбирает закреплённый текст по коду отказа, не выводя произвольное message воркера.
   * @param {ReplyError} error Проверенные поля кода и при необходимости HTTP-статуса.
   * @returns {string} Подпись конкретного отказа либо общее сообщение закрытого чтения.
   */
  #errorMessage(error) {
    if (error.code === 'github-denied') return ui.githubRequest.denied;
    if (error.code === 'token-rejected') return ui.githubRequest.tokenRejected;
    if (error.code === 'rate-limited') return ui.githubRequest.rateLimited;
    if (error.code === 'github-failed') return formatText(ui.githubRequest.failed, { status: error.status || 0 });
    if (error.code === 'timeout') return ui.githubRequest.timeout;
    if (error.code === 'session-lost' || error.code === 'protocol-mismatch') return ui.access.accessChanged;
    if (error.code === 'duplicate-token') return ui.access.duplicateToken;
    if (error.code === 'unlock-failed') return ui.access.unlockFailed;
    if (error.code === 'invalid-record') return ui.storage.invalidToken;
    if (error.code === 'invalid-token') return ui.access.invalidTokenDetails;
    if (error.code === 'stage-expired') return ui.access.setupChanged;
    if (error.code === 'invalid-repository') return ui.access.invalidRepository;
    if (error.code === 'invalid-ref') return ui.access.invalidBranch;
    if (error.code === 'invalid-path') return ui.githubRequest.invalidPath;
    if (error.code === 'invalid-file') return ui.githubRequest.invalidFile;
    if (error.code === 'response-too-large') return ui.githubRequest.responseTooLarge;
    return ui.access.privateRequestFailed;
  }

  /**
   * Посылает существующую команду без создания ожидания; например cancel, discard или release.
   * @param {string} op Имя команды прежнего протокола Octocat.
   * @param {object} [payload] Данные выбранной команды; по умолчанию пустой объект.
   * @returns {void} Без порта ничего не делает; отказ postMessage закрывает канал.
   */
  #fire(op, payload = {}) {
    if (!this.#port) return;
    try {
      this.#port.postMessage({ v: VERSION, id: ++this.#nextId, op, payload });
    } catch {
      this.#close(new Error(ui.access.accessChanged));
    }
  }

  /**
   * Связывает один result с номером команды; внешняя отмена снимает только её, а срок ответа закрывает весь канал.
   * @param {string} op Имя команды, проверяемое воркером.
   * @param {object} payload Данные этой операции; протокол и номер добавляются клиентом.
   * @param {CommandOptions} [options] Срок, передаваемые буферы и внешняя отмена.
   * @returns {Promise<unknown>} Непроверенный result; конкретный публичный метод принимает его форму.
   * @throws {unknown} Причина внешней отмены либо отказ/потеря канала; непереданные ArrayBuffer очищаются при отказе postMessage.
   */
  #send(op, payload, { timeout = FETCH_TIMEOUT, transfer = [], signal } = {}) {
    const port = this.#port;
    if (!port) return Promise.reject(new Error(ui.access.accessChanged));
    if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException('Request cancelled.', 'AbortError'));
    const id = ++this.#nextId;
    return new Promise((resolve, reject) => {
      /**
       * Снимает только нынешнее ожидание команды, сохраняет внешний reason и посылает cancel его номера.
       * @returns {void} Уже полученный/закрытый запрос игнорируется.
       */
      const abort = () => {
        const pending = this.#pending.get(id);
        if (!pending) return;
        this.#pending.delete(id);
        clearTimeout(pending.timer);
        signal?.removeEventListener('abort', abort);
        reject(signal?.reason ?? new DOMException('Request cancelled.', 'AbortError'));
        this.#fire('cancel', { id });
      };
      const timer = window.setTimeout(() => {
        this.#close(new Error(ui.githubRequest.timeout));
      }, timeout);
      this.#pending.set(id, { resolve, reject, timer, signal, abort });
      signal?.addEventListener('abort', abort, { once: true });
      try {
        port.postMessage({ v: VERSION, id, op, payload }, transfer);
      } catch (error) {
        for (const item of transfer) if (item instanceof ArrayBuffer && item.byteLength) new Uint8Array(item).fill(0);
        this.#close(error);
      }
    });
  }

  /**
   * Создаёт прежний classic Octocat и принимает обычный hello с совпавшим видом канала.
   * @param {WorkerMode} mode shared использует именованный MessagePort, dedicated — отдельный Worker.
   * @returns {Promise<WorkerMode>} Принятый вид соединения после проверки ответа.
   * @throws {Error} При отказе создания, протокола или hello; порт очищается.
   */
  async #open(mode) {
    const url = new URL(WORKER_URL, document.baseURI).href;
    const worker = mode === 'shared'
      ? new SharedWorker(
        url,
        /** @type {WorkerOptions & {extendedLifetime:boolean}} */ ({
          name: octocat.name,
          type: 'classic',
          extendedLifetime: true,
        }),
      )
      : new Worker(url, { type: 'classic' });
    const port = mode === 'shared' ? /** @type {SharedWorker} */ (worker).port : /** @type {Worker} */ (worker);
    this.#worker = worker;
    this.#port = port;
    this.#mode = mode;
    const generation = ++this.#generation;
    port.addEventListener('message', (event) => {
      if ('data' in event) this.#receive(event, generation);
    });
    port.addEventListener('messageerror', () => {
      if (generation === this.#generation) this.#close(new Error(ui.access.accessChanged));
    });
    worker.addEventListener('error', () => {
      if (generation === this.#generation) this.#close(new Error(ui.access.accessChanged));
    });
    if (mode === 'shared') /** @type {MessagePort} */ (port).start();
    try {
      const hello = responseObject(
        await this.#send('hello', { handle: this.#handle }, { timeout: octocat.helloTimeoutMs }),
      );
      if (hello.mode !== mode) throw new Error(ui.access.accessChanged);
      this.#connected = true;
      this.#saveHandle(responseHandle(hello.handle));
      this.#saveDedicatedMarker();
      this.#setState('connected');
      return mode;
    } catch (error) {
      this.#close(error);
      throw error;
    }
  }

  /**
   * Выбирает прежний SharedWorker, а при его отказе предусмотренный DedicatedWorker; параллельные обращения ждут одно подключение.
   * @param {boolean} [reconnecting=false] Показывать фазу восстановления вместо первоначального подключения.
   * @returns {Promise<WorkerMode>} Нынешний пригодный транспорт.
   * @throws {Error} Если оба доступных способа не подключились; UI получает unavailable.
   */
  connect(reconnecting = false) {
    if (this.#connected && this.#mode) return Promise.resolve(this.#mode);
    if (this.#connecting) return this.#connecting;
    this.#setState(reconnecting ? 'reconnecting' : 'connecting');
    this.#connecting = (async () => {
      if (globalThis.SharedWorker) {
        try {
          return await this.#open('shared');
        } catch {}
      }
      if (globalThis.Worker) return this.#open('dedicated');
      throw new Error(ui.access.workerUnavailable);
    })().catch((error) => {
      this.#setState('unavailable');
      throw error;
    })
      .finally(() => {
        this.#connecting = null;
      });
    return this.#connecting;
  }

  /**
   * Ждёт уже идущее подключение и повторяет его только если готового транспорта всё ещё нет.
   * @returns {Promise<WorkerMode>} Нынешний либо заново подключённый вид канала.
   * @throws {Error} Отказ нового connect передаётся вызывающему.
   */
  async restart() {
    if (this.#connecting) {
      try {
        await this.#connecting;
      } catch {}
    }
    if (this.#connected && this.#mode) return this.#mode;
    return this.connect(true);
  }

  /**
   * Обеспечивает соединение до посылки одной команды через send.
   * @param {string} op Имя команды выбранной операции.
   * @param {object} [payload] Данные команды без служебных полей протокола.
   * @param {CommandOptions} [options] Её срок, перенос буферов и отмена.
   * @returns {Promise<unknown>} Непроверенный result для приёма публичным методом.
   * @throws {unknown} Отказ соединения, команды либо причина внешней отмены.
   */
  async #request(op, payload = {}, options = {}) {
    await this.connect();
    return this.#send(op, payload, options);
  }

  /**
   * Запрашивает кандидат короткого восстановления, ещё не подтверждённый записью страницы.
   * @returns {Promise<ResumeCandidate|null>} Метаданные/шифртекст для сверки, либо отсутствие кандидата с удалением handle.
   * @throws {Error} При отказе команды или неверной форме ответа.
   */
  async resume() {
    const result = await this.#request('resume');
    if (!result) this.#saveHandle(null);
    if (!result) return null;
    const candidate = responseObject(result);
    if (typeof candidate.ciphertext !== 'string') throw new Error(ui.access.accessChanged);
    return { entry: responseEntry(candidate.entry), ciphertext: candidate.ciphertext };
  }
  /**
   * Снимает местный handle и уничтожает кандидат восстановления, который не совпал с хранилищем страницы.
   * @returns {Promise<void>} Без соединения только снимает handle; после принятой команды закрывает порт без lost.
   * @throws {Error} Если команда отказала либо её срок закрыл канал.
   */
  async abandonResume() {
    this.#saveHandle(null);
    if (!this.#connected) return;
    await this.#send('abandon-resume', {}, { timeout: octocat.helloTimeoutMs });
    this.#close(new Error(ui.access.accessChanged), false);
  }
  /**
   * Принимает восстановление только после точной сверки записи страницы с кандидатом.
   * @param {string} id Идентификатор проверенной записи токена.
   * @param {string} ciphertext Её нынешний шифртекст, который сверяет Octocat.
   * @returns {Promise<SessionEntry>} Метаданные принятого сеанса; activeId и handle обновляются после проверки формы.
   * @throws {Error} При отказе команды или формы ответа.
   */
  async resumeConfirm(id, ciphertext) {
    const result = responseObject(await this.#request('resume-confirm', { id, ciphertext }));
    const entry = responseEntry(result.entry);
    this.#activeId = entry.id;
    this.#saveHandle(responseHandle(result.handle));
    this.#saveDedicatedMarker();
    this.#setState('connected', true);
    return entry;
  }

  /**
   * Передаёт одноразовый секрет и PAT для подготовки записи в Octocat, ещё без принятия активного сеанса.
   * @param {object} entry Метаданные будущей записи, подготовленные GithubAccess.
   * @param {string} token Введённый открытый PAT на срок этой передачи.
   * @param {string} password Пароль при encrypted; кодируется в одноразовый буфер.
   * @param {Uint8Array|null} material PRF-материал при passkey; передача отсоединяет его буфер от страницы.
   * @returns {Promise<StagedAddition>} Временная операция, шифртекст для хранения и метаданные.
   * @throws {Error} При отказе передачи, проверки или шифрования в Octocat.
   */
  async stageAdd(entry, token, password, material) {
    await this.connect();
    const secret = this.#secret(password, material);
    const result = responseObject(
      await this.#send('stage-add', { entry, token, ...secret.payload }, {
        timeout: CRYPTO_TIMEOUT,
        transfer: secret.transfer,
      }),
    );
    if (typeof result.stageId !== 'string') throw new Error(ui.access.accessChanged);
    return { stageId: result.stageId, record: responseRecord(result.record), entry: responseEntry(result.entry) };
  }

  /**
   * Передаёт запись и одноразовый секрет для подготовки её открытия в Octocat.
   * @param {object} record Проверенная форма зашифрованной записи из хранилища.
   * @param {string} password Пароль encrypted-записи, кодируемый для одной передачи.
   * @param {Uint8Array|null} material PRF-материал passkey-записи, передаваемый без сохранения в клиенте.
   * @returns {Promise<StagedUnlock>} Временная операция и метаданные до activate.
   * @throws {Error} При отказе передачи, расшифрования или формы ответа.
   */
  async stageUnlock(record, password, material) {
    await this.connect();
    const secret = this.#secret(password, material);
    const result = responseObject(
      await this.#send('stage-unlock', { record, ...secret.payload }, {
        timeout: CRYPTO_TIMEOUT,
        transfer: secret.transfer,
      }),
    );
    if (typeof result.stageId !== 'string') throw new Error(ui.access.accessChanged);
    return { stageId: result.stageId, entry: responseEntry(result.entry) };
  }

  /**
   * Подготавливает пароль либо PRF-материал для передачи владения одним ArrayBuffer, без второй копии в сообщении.
   * @param {string} password Исходная строка пароля только при отсутствии material.
   * @param {Uint8Array|null} material Нынешний PRF-буфер; при наличии пароль не кодируется.
   * @returns {TransferredSecret} payload и его одноразовый ArrayBuffer для postMessage.
   */
  #secret(password, material) {
    if (material) return { payload: { material }, transfer: [/** @type {ArrayBuffer} */ (material.buffer)] };
    const passwordBytes = new TextEncoder().encode(password);
    return { payload: { passwordBytes }, transfer: [/** @type {ArrayBuffer} */ (passwordBytes.buffer)] };
  }

  /**
   * Принимает подготовленный сеанс после успешной записи/сверки шифртекста в хранилище страницы.
   * @param {string} stageId Временная операция stageAdd либо stageUnlock.
   * @param {string} ciphertext Нынешние сохранённые байты записи, которые сверяет воркер.
   * @returns {Promise<SessionEntry>} Метаданные принятой активной записи и обновлённые местные признаки.
   * @throws {Error} При исчезнувшей/изменённой операции или неверном ответе.
   */
  async activate(stageId, ciphertext) {
    const result = responseObject(await this.#request('activate', { stageId, ciphertext }));
    const entry = responseEntry(result.entry);
    this.#activeId = entry.id;
    this.#saveHandle(responseHandle(result.handle));
    this.#saveDedicatedMarker();
    this.#setState('connected', true);
    return entry;
  }

  /**
   * Просит Octocat удалить подготовленную, но не принятую операцию без ожидания ответа.
   * @param {string} stageId Временный идентификатор подготовки.
   * @returns {void} Без соединения ничего не посылает.
   */
  discard(stageId) {
    if (this.#connected) this.#fire('discard', { stageId });
  }

  /**
   * Выбирает уже открытый в Octocat токен после сверки его нынешнего шифртекста.
   * @param {string} id Идентификатор выбираемой записи.
   * @param {string} ciphertext Её нынешний шифртекст в браузерном хранилище.
   * @returns {Promise<SessionEntry>} Метаданные выбранной записи с обновлением activeId/handle.
   * @throws {Error} При отказе команды или формы ответа.
   */
  async select(id, ciphertext) {
    const result = responseObject(await this.#request('select', { id, ciphertext }));
    const entry = responseEntry(result.entry);
    this.#activeId = entry.id;
    this.#saveHandle(responseHandle(result.handle));
    this.#saveDedicatedMarker();
    this.#setState('connected', true);
    return entry;
  }

  /**
   * Снимает местный handle до ожидания блокировки выбранной записи в Octocat.
   * @param {string} id Идентификатор записи, чей живой секрет должен быть закрыт.
   * @returns {Promise<HandleResult>} Новый handle после блокировки; местный activeId снимается заранее, если совпал.
   * @throws {Error} При отказе команды или формы ответа; прежний handle заранее не возвращается.
   */
  async lock(id) {
    this.#saveHandle(null);
    if (this.#activeId === id) this.#activeId = null;
    this.#saveDedicatedMarker();
    this.#setState('connected', true);
    const result = responseObject(await this.#request('lock', { id }));
    const handle = responseHandle(result.handle);
    this.#saveHandle(handle);
    return { handle };
  }

  /**
   * Просит Octocat убрать живую запись доступа и принимает новые признаки сеанса после ответа.
   * @param {string} id Идентификатор удаляемой записи.
   * @returns {Promise<HandleResult>} Новый handle; совпавший activeId снимается. Постоянные записи удаляет GithubAccess отдельно.
   * @throws {Error} При отказе команды или формы ответа.
   */
  async remove(id) {
    const result = responseObject(await this.#request('remove', { id }));
    const handle = responseHandle(result.handle);
    if (this.#activeId === id) this.#activeId = null;
    this.#saveHandle(handle);
    this.#saveDedicatedMarker();
    this.#setState('connected', true);
    return { handle };
  }

  /**
   * Просит Octocat запечатать снимок ключом текущего токена, не возвращая ключ странице.
   * @param {string} identity Идентичность записи кэша для authenticated additionalData.
   * @param {object} entry Подготовленные закрытые данные снимка, ещё не записанные в хранилище.
   * @returns {Promise<import("./crypto.mjs").SealedContent>} Проверенные строковые iv и ciphertext.
   * @throws {Error} При отказе шифрования или формы ответа.
   */
  async sealSnapshot(identity, entry) {
    const result = responseObject(
      await this.#request('seal-snapshot', { identity, entry }, { timeout: CRYPTO_TIMEOUT }),
    );
    if (typeof result.iv !== 'string' || typeof result.ciphertext !== 'string') {
      throw new Error(ui.access.accessChanged);
    }
    return { iv: result.iv, ciphertext: result.ciphertext };
  }
  /**
   * Просит Octocat открыть снимок при совпавшей идентичности и текущем ключе.
   * @param {string} identity Ожидаемая идентичность записи кэша.
   * @param {object} record Шифрованные iv/ciphertext из проверенной записи хранения.
   * @returns {Promise<unknown>} Открытый JSON; предметную форму снова проверяет GithubAccess.
   * @throws {Error} При отказе соединения, ключа или открытии снимка.
   */
  unsealSnapshot(identity, record) {
    return this.#request('unseal-snapshot', { identity, record }, { timeout: CRYPTO_TIMEOUT });
  }
  /**
   * Читает метаданные разрешённого репозитория через Octocat с активным PAT.
   * @param {string} repo Имя репозитория организации Hxape.
   * @returns {Promise<RepositoryBranch>} Проверенная строка ветки по умолчанию; иные поля не возвращаются.
   * @throws {Error} При отказе GitHub/воркера или неподходящем ответе.
   */
  async repository(repo) {
    const result = responseObject(await this.#request('repository', { repo }));
    if (typeof result.default_branch !== 'string') throw new Error(ui.access.accessChanged);
    return { default_branch: result.default_branch };
  }
  /**
   * Читает точный SHA заданной ветки через Octocat.
   * @param {string} repo Имя репозитория организации Hxape.
   * @param {string} branch Ветка, уже выбранная конфигурацией каталога.
   * @returns {Promise<BranchCommit>} Проверенная строковая форма SHA; дальнейшую допустимость проверяет GithubAccess.
   * @throws {Error} При отказе запроса или формы ответа.
   */
  async commit(repo, branch) {
    const result = responseObject(await this.#request('commit', { repo, branch }));
    if (typeof result.sha !== 'string') throw new Error(ui.access.accessChanged);
    return { sha: result.sha };
  }
  /**
   * Запрашивает один разрешённый вид текстового содержимого через прежнюю команду content.
   * @param {string} repo Имя репозитория организации Hxape.
   * @param {string} path Нормализованный путь файла относительно Git-корня.
   * @param {string} ref Точная Git-ревизия для чтения файла.
   * @param {'checksum'|'snapshot'|'document'|'linked-document'|'source'} kind Вид содержимого; определяет проверку пути и размера в воркере.
   * @param {AbortSignal} [signal] Срок нынешнего чтения вызывающего владельца.
   * @returns {Promise<string>} Только текст успешного ответа, без PAT/Authorization.
   * @throws {unknown} Отказ GitHub, недопустимое содержимое, потеря канала либо причина отмены.
   */
  async content(repo, path, ref, kind, signal) {
    const result = await this.#request('content', { repo, path, ref, kind }, { signal });
    if (typeof result !== 'string') throw new Error(ui.access.accessChanged);
    return result;
  }

  /**
   * Посылает прежнюю команду отмены всех чтений нынешнего порта, не закрывая соединение.
   * @returns {void} Без принятого соединения ничего не делает.
   */
  cancelAll() {
    if (!this.#connected) return;
    this.#fire('cancel-all');
  }

  /**
   * Проверяет handle при возврате/видимости исходной страницы, объединяя параллельные обращения в одно ожидание.
   * @returns {Promise<void>} Неподтверждённый active/handle закрывает канал; уходящая или отсоединённая страница не начинает проверку.
   * @throws {Error} При отказе либо окончании срока проверки соединения.
   */
  renew() {
    if (!this.#connected || this.#leaving) return Promise.resolve();
    if (this.#renewPending) return this.#renewPending;
    this.#setState('reconnecting');
    this.#renewPending = (async () => {
      const result = responseObject(await this.#send('renew', {}, { timeout: octocat.renewTimeoutMs }));
      if (this.#leaving) return;
      if (!result?.active || result.handle !== this.#handle) this.#close(new Error(ui.access.accessChanged));
      else this.#setState('connected');
    })().finally(() => {
      this.#renewPending = null;
    });
    return this.#renewPending;
  }
}
