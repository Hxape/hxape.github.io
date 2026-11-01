/**
 * Управляет доступом к закрытым деревьям и документам; открытые PAT остаются только в Octocat.
 */
import { linkedDocumentPath } from '../../common/network/document-path.mjs';
import sourceLimits from '../../common/network/json/source-limits.json' with { type: 'json' };
import { TextCache } from '../../common/network/text-cache.mjs';
import { formatText, ui } from '../../common/ui/text.mjs';
import { GithubSessionClient } from './session-client.mjs';
import { cached, stored, vaultStorageAvailable } from './vault.mjs';

const encoder = new TextEncoder();

/**
 * Проверяемые данные закрытого дерева и HXDoc до ограничения каталогом.
 * @typedef {Object} SnapshotData
 * @property {string} repository Имя репозитория, с которым сверяется полученный снимок.
 * @property {string} namespace Организация снимка; закрытый доступ принимает только Hxape.
 * @property {string} url Канонический GitHub URL источника, отдельно от местного VS Code пути.
 * @property {number} level Уровень закрытого экспорта; validateSnapshot принимает 3, Catalog отдельно ограничивает показ.
 * @property {string} root Корень показываемых исходников относительно Git-корня репозитория.
 * @property {unknown[]} children Узлы внешнего дерева; их поля и глубину показа отдельно проверяет Catalog.
 * @property {unknown} [documents] Внешние метаданные стандартных документов; закрытый экспорт не копирует их тексты.
 * @property {unknown} [ref] Прежнее необязательное поле; GithubAccess удаляет его и хранит выбранную branch отдельно.
 */
/**
 * Открытый снимок текущего PAT; хранится в памяти GithubAccess и связывает hash, branch и белые списки.
 * @typedef {Object} PrivateSnapshot
 * @property {string} tokenId Идентификатор PAT-владельца снимка, нужный для проверки текущего доступа.
 * @property {string} branch Ветка, которой принадлежат снимок и его сохранённый ключ.
 * @property {SnapshotData} data Проверенная структура и HXDoc текущего PAT; чтение README/raw выполняется отдельно.
 * @property {string} hash SHA-256 закрытого JSON, с которым сверяется местная копия.
 * @property {Set<string>} paths Белый список стандартных документов из снимка для document(), не правило linkedDocument().
 * @property {Set<string>} sourcePaths Разрешённые полные пути .hx, найденные в закрытом снимке.
 * @property {boolean} confirmed GitHub подтвердил hash именно этой branch и активного PAT; отдельно проверяется stale.
 * @property {boolean} [cacheError] Свежий снимок прочитан, но его сохранение не подтвердилось.
 * @property {boolean} [stale] Местный снимок оставлен после отказа сети; свежесть GitHub не подтверждена.
 */
/**
 * Разрешённые поля отказа; не включают секреты или готовые заголовки.
 * @typedef {Object} RequestError
 * @property {string} [code] Машинный код отказа без открытого секрета.
 * @property {number} [status] HTTP-статус отказа, если был получен ответ сервера.
 * @property {string} [detail] Ограниченное пояснение GitHub; не служит доказательством доступа.
 * @property {boolean} [denied] Подтверждённый запрет запроса; отличается от сетевого отказа и ограничения частоты.
 * @property {boolean} [rateLimited] GitHub ограничил частоту; такой отказ не отзывает прежний доступ.
 */

/**
 * Захваченный доступ одного запроса; хранится только на срок ожидания и не принадлежит постоянному кэшу.
 * @typedef {Object} AccessRequestScope
 * @property {string} tokenId Идентификатор записи PAT, которая разрешила запрос.
 * @property {number} revision Ревизия доступа до ожидания; смена токена делает ответ недействительным.
 * @property {number} activationIntent Намерение выбора/разблокировки до ожидания; новая активация не отзывается старым ответом.
 * @property {number} repoRevision Ревизия отзыва или межвкладочного изменения репозитория до ожидания.
 * @property {PrivateSnapshot|null} snapshot Сам снимок до чтения; ответ старого объекта не отзывает уже принятую замену того же токена.
 */
/**
 * Постоянная шифрованная запись PAT с метаданными защиты.
 * @typedef {Object} StoredToken
 * @property {string} id Идентификатор записи; открытый PAT в идентификатор не входит.
 * @property {string} storage Способ защиты PAT: пароль или passkey; не обозначает открытый секрет.
 * @property {string} ciphertext Зашифрованная запись; используется также для сверки короткого восстановления.
 * @property {string} iv Случайный вектор AES-GCM в Base64; хранится рядом с шифртекстом.
 * @property {string} [salt] Соль PBKDF2 в Base64 для защиты паролем; у passkey её нет.
 * @property {string} [credentialId] Идентификатор WebAuthn credential в Base64url, без открытого PRF.
 * @property {string} [prfSalt] Сохранённая соль запроса PRF в Base64url.
 * @property {string} [addedAt] Время добавления токена; у прежних записей может отсутствовать.
 */
/**
 * Метаданные открытой в воркере записи, дополненные сверяемым шифртекстом.
 * @typedef {Object} UnlockedToken
 * @property {string} id Идентификатор записи; открытый PAT в идентификатор не входит.
 * @property {string} label Пользовательская подпись записи PAT без самого токена.
 * @property {string} login Имя пользователя, проверенное ответом GitHub при добавлении PAT.
 * @property {string} storage Способ защиты PAT: пароль или passkey; не обозначает открытый секрет.
 * @property {string} ciphertext Зашифрованная запись; используется также для сверки короткого восстановления.
 * @property {string} [addedAt] Время добавления токена; у прежних записей может отсутствовать.
 * @property {string} [credentialId] Идентификатор WebAuthn credential в Base64url, без открытого PRF.
 * @property {string} [prfSalt] Сохранённая соль запроса PRF в Base64url.
 */
/**
 * Данные одной строки управления токенами, без открытого PAT.
 * @typedef {Object} TokenStatusEntry
 * @property {string} id Идентификатор записи; открытый PAT в идентификатор не входит.
 * @property {string} storage Способ защиты PAT: пароль или passkey; не обозначает открытый секрет.
 * @property {string} [credentialId] Идентификатор WebAuthn credential в Base64url, без открытого PRF.
 * @property {string} [prfSalt] Сохранённая соль запроса PRF в Base64url.
 * @property {string} [addedAt] Время добавления токена; у прежних записей может отсутствовать.
 * @property {boolean} saved Шифртекст этой записи присутствует в выбранном хранилище.
 * @property {boolean} unlocked Воркер держит открытый сеанс этой записи.
 * @property {string} [label] Пользовательская подпись записи PAT без самого токена.
 * @property {string} [login] Имя пользователя, проверенное ответом GitHub при добавлении PAT.
 */
/**
 * Результат сверки сеансов и хранилища для окна токенов.
 * @typedef {Object} TokenStatus
 * @property {TokenStatusEntry[]} entries Метаданные сохранённых записей и их признаки открытости; PAT здесь нет.
 * @property {string|null} activeId Идентификатор выбранного токена; null означает отсутствие активного доступа.
 * @property {boolean} storageError Чтение выбранного хранилища завершилось отказом.
 * @property {string} storageReason Пояснение отказа хранилища для интерфейса управления токенами.
 * @property {boolean} corrupted Есть повреждённые записи; корректные записи остаются доступны.
 */

/**
 * Проверяет имя репозитория Hxape до построения пути запроса.
 * @param {string} name Имя репозитория внутри Hxape, без владельца или пути файла.
 * @returns Допустимое имя; повреждённая форма вызывает отказ.
 */
function repositoryName(name) {
  if (typeof name !== 'string' || !/^[a-z\d][a-z\d._-]{0,99}$/i.test(name) || name === '.' || name === '..') {
    throw new Error(ui.access.invalidRepository);
  }
  return name;
}

/**
 * Проверяет ветку без неоднозначных, пустых или служебных сегментов.
 * @param {string} name Ветка закрытого снимка, передаваемая отдельно от пути файла.
 * @returns Допустимая ветка; повреждённая форма вызывает отказ.
 */
function branchName(name) {
  if (
    typeof name !== 'string' || !/^[a-z\d][a-z\d._/-]{0,99}$/i.test(name)
    || name.includes('..') || name.includes('//') || name.endsWith('/') || name.endsWith('.')
    || name.split('/').some((part) => part.startsWith('.') || part.endsWith('.lock'))
  ) {
    throw new Error(ui.access.invalidBranch);
  }
  return name;
}

/**
 * Строит ключ закрытого снимка, сохраняя прежний ключ ветки main.
 * @param {string} id Идентификатор записи PAT, которой зашифрован снимок.
 * @param {string} repo Имя репозитория Hxape, которому принадлежит снимок.
 * @param {string} branch Ветка снимка; main сохраняет прежнюю двухчастную форму ключа.
 * @returns Идентичность PAT, репозитория и при необходимости ветки.
 */
function cacheIdentity(id, repo, branch) {
  return branch === 'main' ? `${id}:${repo}` : `${id}:${repo}:${branch}`;
}

/**
 * Выбирает проверенные поля отказа клиента из unknown, не доверяя произвольному выброшенному значению.
 * @param {unknown} value Ошибка чтения либо отмены до проверки полей GitHub.
 * @returns {RequestError} Только допустимые код, HTTP-статус и признаки отказа; примитив не доказывает запрет.
 */
function githubFailure(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return {
    code: 'code' in value && typeof value.code === 'string' ? value.code : undefined,
    status: 'status' in value && typeof value.status === 'number' && Number.isInteger(value.status)
        && value.status >= 0 && value.status <= 599
      ? value.status
      : undefined,
    denied: 'denied' in value && value.denied === true,
    rateLimited: 'rateLimited' in value && value.rateLimited === true,
    detail: 'detail' in value && typeof value.detail === 'string' ? value.detail.slice(0, 200) : undefined,
  };
}

/**
 * Проверяет обязательные поля снимка до передачи дерева потребителям.
 * @param {string} repo Имя репозитория Hxape, которому принадлежит запрос.
 * @param {unknown} data Внешние данные до проверки формы и ограничения разрешённым уровнем.
 * @returns {SnapshotData} Данные нужного репозитория; другой владелец или форма вызывают отказ.
 */
function validateSnapshot(repo, data) {
  if (
    !data || typeof data !== 'object' || !('repository' in data) || data.repository !== repo
    || !('namespace' in data) || data.namespace !== 'Hxape' || !('url' in data)
    || data.url !== `https://github.com/Hxape/${repo}` || !('level' in data) || data.level !== 3
    || !('root' in data) || typeof data.root !== 'string' || !('children' in data) || !Array.isArray(data.children)
  ) {
    throw new Error(ui.access.invalidSnapshot);
  }
  return /** @type {SnapshotData} */ (data);
}

/**
 * Проверяет содержимое зашифрованного местного снимка после открытия.
 * @param {unknown} value Входное значение, форма которого проверяется этой функцией.
 * @returns {CachedPayloadResult} Сырые data, hash и branch для дальнейшей проверки.
 */
function cachedPayload(value) {
  const branch = value && typeof value === 'object' && 'branch' in value ? value.branch : undefined;
  if (
    !value || typeof value !== 'object' || !('data' in value) || !('hash' in value)
    || typeof value.hash !== 'string' || (branch !== undefined && typeof branch !== 'string')
  ) {
    throw new Error(ui.access.invalidSavedHash);
  }
  return { data: value.data, hash: value.hash, branch };
}

/**
 * Собирает разрешённые пути документов из метаданных снимка.
 * @param {SnapshotData} snapshot Проверенный снимок дерева, к которому относится операция.
 * @returns Множество путей для отдельного чтения стандартных документов.
 */
function documentPaths(snapshot) {
  /**
   * @type {Set<string>}
   */
  const paths = new Set();
  /**
   * Добавляет проверенные непустые пути из одного набора метаданных, не сохраняя тексты документов.
   * @param {unknown} documents Непроверенное поле documents корня или каталога.
   */
  const add = (documents) => {
    if (!documents || typeof documents !== 'object') return;
    for (const document of Object.values(documents)) {
      const path = document && typeof document === 'object' && 'path' in document ? document.path : null;
      if (
        typeof path === 'string' && path
        && !path.split('/').some((part) => !part || part === '.' || part === '..')
      ) paths.add(path);
    }
  };
  /**
   * Обходит узлы снимка и собирает документы каждого каталога.
   * @param {unknown[]} nodes Дочерние узлы снимка до проверки их метаданных.
   */
  const visit = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      add('documents' in node ? node.documents : undefined);
      visit('children' in node && Array.isArray(node.children) ? node.children : []);
    }
  };
  add(snapshot.documents);
  visit(snapshot.children);
  return paths;
}

/**
 * Собирает полные пути .hx внутри разрешённого корня снимка.
 * @param {SnapshotData} snapshot Проверенный снимок дерева, к которому относится операция.
 * @returns Множество путей, которые могут быть прочитаны через sourceFile.
 */
function sourcePaths(snapshot) {
  /**
   * @type {Set<string>}
   */
  const paths = new Set();
  const root = snapshot.root;
  /**
   * @type {(path:unknown)=>path is string}
   */
  const safe = (path) =>
    typeof path === 'string' && path.length > 0
    && !path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes('\\'));
  if (!safe(root)) return paths;
  /**
   * Собирает полные пути файлов .hx, рекурсивно проходя только каталоги.
   * @param {unknown[]} nodes Дочерние узлы снимка до проверки вида и относительного пути.
   */
  const visit = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node || typeof node !== 'object' || !('type' in node)) continue;
      if (node.type === 'file' && 'path' in node && safe(node.path) && node.path.endsWith('.hx')) {
        paths.add(`${root}/${node.path}`);
      }
      if (node.type === 'directory' && 'children' in node && Array.isArray(node.children)) visit(node.children);
    }
  };
  visit(snapshot.children);
  return paths;
}

/**
 * Вычисляет SHA-256 UTF-8 текста закрытого JSON.
 * @param {string} text Текст для описанной операции; не является записью журнала адресов.
 * @returns 64-символьный hash для сверки с .private/site.sha256.
 */
async function digest(text) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
  return [...hash].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Владеет выбором PAT, снимками и закрытым текстовым кэшем; открытые PAT и ключи остаются в Octocat.
 */
export class GithubAccess extends EventTarget {
  /**
   * Метаданные открытых в воркере токенов и сверяемые шифртексты; PAT и ключи здесь не лежат.
   * @type {Map<string,UnlockedToken>}
   */
  #tokens = new Map();
  /**
   * Выбранная открытая запись PAT; null означает закрытый доступ.
   * @type {string|null}
   */
  #activeId = null;
  /**
   * Поколение доступа; invalidation отменяет принятие прежних ответов.
   */
  #revision = 0;
  /**
   * Номер выбора/добавления/разблокировки; позднее намерение побеждает прежнее.
   */
  #activationIntent = 0;
  /**
   * Открытые снимки текущего PAT; содержимое и пути не заменяют проверки свежести.
   * @type {Map<string,PrivateSnapshot>}
   */
  #snapshots = new Map();
  /**
   * Общий текущий Promise проверки каждого repo/branch; после ответа освобождается.
   * @type {Map<string,Promise<PrivateSnapshot>>}
   */
  #refreshing = new Map();
  /**
   * Репозитории с подтверждённым отзывом; их прежний кэш не используется.
   * @type {Set<string>}
   */
  #blocked = new Set();
  /**
   * Удалённые id за срок жизни страницы, чтобы поздний ответ не восстановил запись.
   * @type {Set<string>}
   */
  #removed = new Set();
  /**
   * Изменения закрытого снимка, в том числе из другой вкладки; не Git SHA.
   * @type {Map<string,number>}
   */
  #repoRevisions = new Map();
  /**
   * Последняя фаза проверки каждого репозитория для интерфейса.
   * @type {Map<string,string>}
   */
  #freshness = new Map();
  /**
   * Последнее пояснение отказа repo; успешная проверка его снимает.
   * @type {Map<string,string>}
   */
  #failures = new Map();
  /**
   * Ограниченные готовые закрытые Haxe/Markdown тексты только в памяти; смена доступа/снимка очищает их.
   */
  #sourceCache = new TextCache(sourceLimits.privateCache);
  /**
   * Проверка сохранённых записей уже идёт; события фокуса не запускают параллельный проход.
   */
  #statusChecking = false;
  /**
   * Одна текущая попытка короткого восстановления; после завершения освобождается.
   * @type {Promise<boolean>|null}
   */
  #restorePending = null;
  /**
   * Клиент Octocat; страница передаёт команды, а открытые секреты остаются в воркере.
   */
  #api = new GithubSessionClient();
  /**
   * Канал метаданных удаления/изменения между вкладками; открытый PAT не передаётся.
   * @type {BroadcastChannel|null}
   */
  #channel = null;

  /**
   * Связывает потерю воркера и изменения хранилища между вкладками с отзывом доступа; PAT странице не хранит.
   */
  constructor() {
    super();
    this.#api.addEventListener('lost', () => this.#lostSession());
    this.#api.addEventListener('state-change', () => this.dispatchEvent(new Event('worker-state')));
    if ('BroadcastChannel' in window) {
      this.#channel = new BroadcastChannel('hxape-github-tokens-v1');
      this.#channel.addEventListener('message', (event) => {
        const value = /** @type {unknown} */ (event.data);
        if (!value || typeof value !== 'object' || Array.isArray(value)) return;
        const message = /** @type {Record<string,unknown>} */ (value);
        const { type, id, repo } = message;
        if (typeof id !== 'string') return;
        if (type === 'removed') {
          this.#forgetToken(id);
          void this.#api.remove(id).catch(() => {});
          return;
        }
        if (
          id !== this.#activeId || typeof repo !== 'string' || typeof type !== 'string'
          || !['snapshot-revoked', 'snapshot-updated'].includes(type)
        ) return;
        this.#repoRevisions.set(repo, (this.#repoRevisions.get(repo) || 0) + 1);
        this.#snapshots.delete(repo);
        if (type === 'snapshot-revoked') {
          this.#blocked.add(repo);
          this.#failures.set(repo, ui.access.changedInOtherTab);
          this.#notify(repo, 'revoked');
        } else if (type === 'snapshot-updated') {
          this.#blocked.delete(repo);
          this.#failures.delete(repo);
          this.#notify(repo, 'updated');
        }
      });
    }
    const checkStorage = () => {
      if (this.#statusChecking) return;
      this.#statusChecking = true;
      void this.status().catch(() => {}).finally(() => {
        this.#statusChecking = false;
      });
    };
    window.addEventListener('pageshow', checkStorage);
    window.addEventListener('focus', checkStorage);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkStorage();
    });
    void this.#retireServiceWorker();
  }

  /**
   * Проверяет выбор открытого сеанса PAT.
   * @returns Есть activeId; само наличие не подтверждает доступ к репозиторию.
   */
  get active() {
    return Boolean(this.#activeId);
  }
  /**
   * Проверяет наличие криптографии, хранилища и API воркера.
   * @returns Среда допускает работу авторизации; успешная разблокировка не утверждается.
   */
  get compatible() {
    return Boolean(
      globalThis.crypto?.subtle && vaultStorageAvailable() && this.#api.compatible
        && this.#api.state !== 'unavailable',
    );
  }
  /**
   * Отдаёт данные строки состояния Octocat без секретов.
   * @returns Фаза, mode и наличие активной записи клиента.
   */
  get workerStatus() {
    return this.#api.status;
  }
  /**
   * Проверяет признаки прежнего сеанса для пользовательского восстановления.
   * @returns Есть handle SharedWorker либо признак прежнего Dedicated-сеанса.
   */
  get hadWorkerSession() {
    return Boolean(this.#api.handle || this.#api.hadDedicatedSession);
  }
  /**
   * Поручает клиенту повторное подключение к Octocat.
   * @returns Тип действующего соединения либо отказ запуска.
   */
  restartWorker() {
    return this.#api.restart();
  }
  /**
   * Проверяет свежий снимок именно активного PAT без метки отзыва или stale.
   * @param {string} repo Имя репозитория Hxape, которому принадлежит запрос.
   * @returns Репозиторий имеет подтверждённый нынешний доступ.
   */
  confirmed(repo) {
    const snapshot = this.#snapshots.get(repo);
    return Boolean(
      this.#activeId && snapshot?.tokenId === this.#activeId && snapshot.confirmed
        && !snapshot.stale && !this.#blocked.has(repo),
    );
  }

  /**
   * Даёт непостоянную ревизию подтверждённого снимка для принятия материала каталогом.
   * @param {string} repo Имя репозитория Hxape, которому принадлежит запрос.
   * @param {string} branch Ветка репозитория; входит в адрес чтения и идентичность снимка.
   * @param {SnapshotRevisionOptions} [options] Уже показанный HXDoc может принадлежать местной копии снимка.
   * @returns {string|null} Ревизия активного снимка либо null; не запись журнала и не секрет.
   */
  snapshotRevision(repo, branch, { allowCached = false } = {}) {
    const snapshot = this.#snapshots.get(repo);
    const current = this.#activeId && snapshot?.tokenId === this.#activeId && !this.#blocked.has(repo);
    return current && snapshot?.branch === branch && (allowCached || this.confirmed(repo))
      ? JSON.stringify([this.#revision, this.#repoRevisions.get(repo) || 0, branch, snapshot.hash])
      : null;
  }
  /**
   * Отдаёт последнее состояние проверки указанного репозитория.
   * @param {string} repo Имя репозитория Hxape, которому принадлежит запрос.
   * @returns Состояние для интерфейса; без записи возвращается current.
   */
  freshness(repo) {
    return this.#freshness.get(repo) || 'current';
  }
  /**
   * Отдаёт последнее пояснение отказа репозитория.
   * @param {string} repo Имя репозитория Hxape, которому принадлежит запрос.
   * @returns Строка отказа либо null при отсутствии сохранённого отказа.
   */
  failure(repo) {
    return this.#failures.get(repo) || null;
  }

  /**
   * Снимает только прежний github-auth-sw.js в области сайта; новый Service Worker не создаёт.
   */
  async #retireServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const scope = new URL('./', document.baseURI);
      const script = new URL('github-auth-sw.js', scope).href;
      const registration = await navigator.serviceWorker.getRegistration(scope);
      if (
        registration
        && [registration.active, registration.waiting, registration.installing].some((worker) =>
          worker?.scriptURL === script
        )
      ) {
        await registration.unregister();
      }
    } catch {}
  }

  /**
   * Отменяет запросы и сбрасывает снимки, готовые закрытые тексты и ревизии прежнего доступа.
   */
  #invalidate() {
    ++this.#revision;
    this.#api.cancelAll();
    this.#sourceCache.clear();
    this.#snapshots.clear();
    this.#refreshing.clear();
    this.#blocked.clear();
    this.#repoRevisions.clear();
    this.#freshness.clear();
    this.#failures.clear();
  }

  /**
   * Отзывает доступ после потери секретов воркера и уведомляет каталог и интерфейс восстановления.
   */
  #lostSession() {
    if (!this.#activeId && !this.#tokens.size) return;
    const hadActive = Boolean(this.#activeId);
    ++this.#activationIntent;
    this.#invalidate();
    this.#activeId = null;
    this.#tokens.clear();
    this.dispatchEvent(new Event('change'));
    this.dispatchEvent(new Event('list-change'));
    if (hadActive) this.dispatchEvent(new Event('lost'));
  }

  /**
   * Удаляет локальное представление записи и отзывает её активный сеанс при совпадении id.
   * @param {string} id Идентификатор записи PAT, а не сам токен.
   */
  #forgetToken(id) {
    this.#removed.add(id);
    if (!this.#tokens.has(id)) {
      this.dispatchEvent(new Event('list-change'));
      return;
    }
    if (this.#activeId === id) {
      this.#invalidate();
      this.#activeId = null;
      this.#tokens.delete(id);
      this.dispatchEvent(new Event('change'));
    } else {
      this.#tokens.delete(id);
      this.dispatchEvent(new Event('list-change'));
    }
  }

  /**
   * Повторно сверяет шифртекст и поколение доступа после асинхронного шага.
   * @param {string} id Идентификатор записи PAT, а не сам токен.
   * @param {number} revision Ревизия доступа, захваченная до асинхронной работы.
   * @param {number} [intent] Намерение активации; более новый выбор отменяет принятие прежнего результата.
   * @returns Нынешняя шифрованная запись; удаление или замена записи вызывают отказ.
   */
  async #assertStored(id, revision, intent) {
    const record = await stored('read', id);
    if (
      revision !== this.#revision || this.#activeId !== id
      || (intent !== undefined && intent !== this.#activationIntent)
    ) throw new Error(ui.access.accessChanged);
    if (!record || this.#removed.has(id) || record.ciphertext !== this.#tokens.get(id)?.ciphertext) {
      this.#forgetToken(id);
      void this.#api.remove(id).catch(() => {});
      throw new Error(record ? ui.storage.tokenChanged : ui.access.tokenRemoved);
    }
    return record;
  }

  /**
   * Сверяет сохранённые шифртексты и отдаёт только метаданные окна токенов.
   * @returns {Promise<TokenStatus>} Метаданные окна токенов, activeId и признаки отказов, без PAT.
   */
  async status() {
    const revision = this.#revision;
    /**
     * @type {StoredToken[]}
     */
    let records = [];
    let storageError = false;
    let storageReason = '';
    let corrupted = false;
    try {
      const list = await stored('all');
      records = list.records;
      corrupted = list.corrupted;
    } catch (error) {
      storageError = true;
      storageReason = error instanceof Error
        ? `${error.name}${error.message ? `: ${error.message}` : ' (no details from browser)'}`
        : String(error);
    }
    if (revision !== this.#revision) return this.status();
    if (!storageError) {
      for (const [id, entry] of this.#tokens) {
        if (records.some((record) => record.id === id && record.ciphertext === entry.ciphertext)) continue;
        this.#forgetToken(id);
        void this.#api.remove(id).catch(() => {});
      }
    }
    if (revision !== this.#revision) return this.status();
    /**
     * @type {Map<string,TokenStatusEntry>}
     */
    const entries = new Map(
      records.filter((record) => !this.#removed.has(record.id)).map((
        record,
      ) => [record.id, {
        id: record.id,
        storage: record.storage,
        credentialId: record.credentialId,
        prfSalt: record.prfSalt,
        addedAt: record.addedAt,
        saved: true,
        unlocked: false,
      }]),
    );
    for (const entry of this.#tokens.values()) {
      entries.set(entry.id, {
        id: entry.id,
        label: entry.label,
        login: entry.login,
        storage: entry.storage,
        credentialId: entry.credentialId,
        prfSalt: entry.prfSalt,
        addedAt: entry.addedAt,
        saved: true,
        unlocked: true,
      });
    }
    return { entries: [...entries.values()], activeId: this.#activeId, storageError, storageReason, corrupted };
  }

  /**
   * Проверяет сохранённый шифртекст (`ciphertext`) перед продолжением короткого сеанса Octocat.
   * @returns Успех восстановления; несовпавшая запись оставляет доступ закрытым.
   */
  restoreSession() {
    if (this.#restorePending) return this.#restorePending;
    this.#restorePending = this.#restoreSession().finally(() => {
      this.#restorePending = null;
    });
    return this.#restorePending;
  }

  /**
   * Сверяет кандидат воркера с неизменным шифртекстом до и после подтверждения.
   * @returns true после принятия сеанса; отсутствие, смена или отказ дают false.
   */
  async #restoreSession() {
    if (!this.#api.handle) return false;
    const revision = this.#revision;
    const intent = this.#activationIntent;
    let candidate;
    try {
      candidate = await this.#api.resume();
    } catch {
      return false;
    }
    if (!candidate) return false;
    if (revision !== this.#revision || intent !== this.#activationIntent || this.#activeId) {
      await this.#api.abandonResume().catch(() => {});
      return false;
    }
    const { entry, ciphertext } = candidate;
    if (typeof entry?.id !== 'string' || typeof ciphertext !== 'string') {
      await this.#api.abandonResume().catch(() => {});
      return false;
    }
    const record = await stored('read', entry.id).catch(() => null);
    if (!record || record.ciphertext !== ciphertext || this.#removed.has(entry.id)) {
      await this.#api.abandonResume().catch(() => {});
      return false;
    }
    if (revision !== this.#revision || intent !== this.#activationIntent || this.#activeId) {
      await this.#api.abandonResume().catch(() => {});
      return false;
    }
    let confirmed = false;
    try {
      const restored = await this.#api.resumeConfirm(entry.id, ciphertext);
      confirmed = true;
      const checked = await stored('read', entry.id);
      if (
        revision !== this.#revision || intent !== this.#activationIntent || this.#activeId
        || !checked || checked.ciphertext !== ciphertext || restored?.id !== entry.id
      ) {
        await this.#api.lock(entry.id).catch(() => {});
        return false;
      }
      this.#invalidate();
      this.#tokens.set(entry.id, { ...restored, ciphertext });
      this.#activeId = entry.id;
      this.dispatchEvent(new Event('change'));
      return true;
    } catch {
      if (confirmed) await this.#api.lock(entry.id).catch(() => {});
      else await this.#api.abandonResume().catch(() => {});
      return false;
    }
  }

  /**
   * Записывает этапный шифртекст и активирует токен после повторной сверки записи.
   * @param {string} label Готовая подпись для человека; не меняет адрес или право доступа.
   * @param {string} token Открытый PAT; за пределы разрешённого запроса его не возвращают.
   * @param {'encrypted'|'passkey'} storage Выбранное хранилище либо способ защиты, указанный в договоре метода.
   * @param {string} password Пароль защиты PAT; передаётся воркеру в одноразовом буфере.
   * @param {AddPasskeyFields|null} [passkey] Подтверждённые credential/соль/PRF нового PAT либо null для защиты паролем.
   * @returns Метаданные после добавления; отказ защиты, хранения или смена намерения отклоняют вызов.
   */
  async add(label, token, storage, password, passkey = null) {
    const intent = ++this.#activationIntent;
    if (this.#restorePending) await this.#restorePending;
    label = String(label || '').trim().slice(0, 40);
    token = String(token || '').trim();
    if (
      !label || !token || !['encrypted', 'passkey'].includes(storage)
      || (storage === 'encrypted' && password.length < 12)
      || (storage === 'passkey' && (!passkey?.credentialId || !passkey?.prfSalt || passkey.material?.byteLength !== 32))
    ) {
      throw new Error(ui.access.invalidTokenDetails);
    }
    const revision = this.#revision;
    const entry = {
      id: crypto.randomUUID(),
      label,
      storage,
      addedAt: new Date().toISOString(),
      credentialId: passkey?.credentialId,
      prfSalt: passkey?.prfSalt,
    };
    /**
     * @type {string|null}
     */
    let stageId = null;
    let activated = false;
    let committed = false;
    try {
      const stage = this.#api.stageAdd(entry, token, password, passkey?.material || null);
      token = '';
      password = '';
      const staged = await stage;
      stageId = staged?.stageId;
      if (
        revision !== this.#revision || intent !== this.#activationIntent || !stageId || staged.record?.id !== entry.id
        || staged.entry?.id !== entry.id || typeof staged.record.ciphertext !== 'string'
      ) throw new Error(ui.access.setupChanged);
      await stored('put', staged.record);
      const saved = await stored('read', entry.id);
      if (
        revision !== this.#revision || intent !== this.#activationIntent || !saved
        || saved.ciphertext !== staged.record.ciphertext
      ) throw new Error(ui.access.setupChanged);
      const active = await this.#api.activate(stageId, saved.ciphertext);
      stageId = null;
      activated = true;
      const checked = await stored('read', entry.id);
      if (
        revision !== this.#revision || intent !== this.#activationIntent || !checked
        || checked.ciphertext !== saved.ciphertext || active?.id !== entry.id
      ) {
        throw new Error(ui.access.setupChanged);
      }
      this.#invalidate();
      this.#tokens.set(entry.id, { ...active, ciphertext: saved.ciphertext });
      this.#activeId = entry.id;
      committed = true;
      this.dispatchEvent(new Event('change'));
      return this.status();
    } catch (error) {
      if (activated && !committed) await this.#api.lock(entry.id).catch(() => {});
      throw error;
    } finally {
      token = '';
      if (stageId) this.#api.discard(stageId);
    }
  }

  /**
   * Открывает запись без GitHub-запроса и проверяет шифртекст перед активацией.
   * @param {string} id Идентификатор записи PAT, а не сам токен.
   * @param {string} password Пароль защиты PAT; передаётся воркеру в одноразовом буфере.
   * @param {Uint8Array|null} [material] PRF-материал passkey; его буфер передаётся воркеру, а не сохраняется страницей.
   * @returns Метаданные после открытия; неверная защита или замена записи вызывают отказ.
   */
  async unlock(id, password, material = null) {
    const intent = ++this.#activationIntent;
    if (this.#restorePending) await this.#restorePending;
    const revision = this.#revision;
    const record = await stored('read', id);
    if (!record || this.#removed.has(id)) throw new Error(ui.access.savedTokenMissing);
    /**
     * @type {string|null}
     */
    let stageId = null;
    let activated = false;
    let committed = false;
    try {
      let staged;
      try {
        const stage = this.#api.stageUnlock(record, password, material);
        password = '';
        staged = await stage;
      } catch (error) {
        if (/** @type {{code?:string}} */ (error)?.code === 'unlock-failed') throw new Error(ui.access.unlockFailed);
        throw error;
      }
      stageId = staged?.stageId;
      const stillStored = await stored('read', id);
      if (
        revision !== this.#revision || intent !== this.#activationIntent || this.#removed.has(id) || !stageId
        || staged.entry?.id !== id || !stillStored || stillStored.ciphertext !== record.ciphertext
      ) {
        throw new Error(ui.access.unlockChanged);
      }
      const active = await this.#api.activate(stageId, record.ciphertext);
      stageId = null;
      activated = true;
      const checked = await stored('read', id);
      if (
        revision !== this.#revision || intent !== this.#activationIntent || this.#removed.has(id) || !checked
        || checked.ciphertext !== record.ciphertext || active?.id !== id
      ) {
        throw new Error(ui.access.unlockChanged);
      }
      this.#invalidate();
      this.#tokens.set(id, { ...active, ciphertext: record.ciphertext });
      this.#activeId = id;
      committed = true;
      this.dispatchEvent(new Event('change'));
      return this.status();
    } catch (error) {
      if (activated && !committed) await this.#api.lock(id).catch(() => {});
      throw error;
    } finally {
      if (stageId) this.#api.discard(stageId);
    }
  }

  /**
   * Выбирает уже открытый PAT, сверяя сохранённую запись и намерение выбора.
   * @param {string} id Идентификатор записи PAT, а не сам токен.
   * @returns Состояние токенов после выбора; неверный id или поздний ответ не принимаются.
   */
  async select(id) {
    const intent = ++this.#activationIntent;
    if (this.#restorePending) await this.#restorePending;
    const revision = this.#revision;
    const entry = this.#tokens.get(id);
    if (!entry) throw new Error(ui.access.unlockFirst);
    const record = await stored('read', id);
    if (intent !== this.#activationIntent || revision !== this.#revision) throw new Error(ui.access.selectionChanged);
    if (!record || this.#removed.has(id) || record.ciphertext !== entry.ciphertext) {
      this.#forgetToken(id);
      void this.#api.remove(id).catch(() => {});
      throw new Error(ui.access.tokenRemoved);
    }
    if (!this.#tokens.has(id)) throw new Error(ui.access.noLongerUnlocked);
    if (this.#activeId !== id) {
      let selected = false;
      try {
        const result = await this.#api.select(id, record.ciphertext);
        selected = true;
        const checked = await stored('read', id);
        if (
          intent !== this.#activationIntent || revision !== this.#revision || result?.id !== id
          || !checked || checked.ciphertext !== record.ciphertext
        ) throw new Error(ui.access.selectionChanged);
        this.#invalidate();
        this.#activeId = id;
        this.dispatchEvent(new Event('change'));
      } catch (error) {
        if (selected) {
          await this.#api.lock(id).catch(() => {});
          this.#lostSession();
        }
        throw error;
      }
    }
    return this.status();
  }

  /**
   * Отзывает местный доступ немедленно, затем блокирует секрет в воркере.
   * @param {string} id Идентификатор записи PAT, а не сам токен.
   * @returns Состояние токенов после блокировки; шифртекст остаётся сохранённым.
   */
  async lock(id) {
    if (this.#activeId !== id || !this.#tokens.has(id)) throw new Error(ui.access.noLongerUnlocked);
    ++this.#activationIntent;
    this.#invalidate();
    this.#activeId = null;
    this.#tokens.delete(id);
    this.dispatchEvent(new Event('change'));
    this.dispatchEvent(new Event('list-change'));
    await this.#api.lock(id);
    return this.status();
  }

  /**
   * Удаляет шифртекст, снимки и открытый секрет PAT и уведомляет другие вкладки.
   * @param {string} id Идентификатор записи PAT, а не сам токен.
   * @returns Состояние оставшихся записей; отказ удаления не скрывается.
   */
  async remove(id) {
    this.#forgetToken(id);
    this.#channel?.postMessage({ type: 'removed', id });
    const purged = this.#api.remove(id).catch(() => {});
    try {
      await cached('delete', id);
    } catch {
      throw new Error(ui.access.removeFailed);
    }
    await purged;
    return this.status();
  }

  /**
   * Сохраняет фазу проверки репозитория и передаёт snapshot-state; смена/отзыв очищает готовый закрытый текст.
   * @param {string} repo Репозиторий, чья проверка или право чтения изменились.
   * @param {string} state Фаза свежести снимка; updated/revoked/missing/stale также очищают готовые закрытые тексты.
   */
  #notify(repo, state) {
    if (['updated', 'revoked', 'missing', 'stale'].includes(state)) this.#sourceCache.clear();
    this.#freshness.set(repo, state);
    this.dispatchEvent(new CustomEvent('snapshot-state', { detail: { repo, state } }));
  }

  /**
   * Сверяет захваченный токен и ревизии перед действием позднего отказа.
   * @param {string} repo Репозиторий запроса, чья ревизия сверяется.
   * @param {AccessRequestScope} scope Доступ, которым начинался запрос; не сохранённое доказательство права.
   * @returns {boolean} Ответ ещё принадлежит нынешним токену, активации, ревизии репозитория и объекту снимка.
   */
  #requestScopeCurrent(repo, scope) {
    return scope.tokenId === this.#activeId && scope.revision === this.#revision
      && scope.activationIntent === this.#activationIntent
      && scope.repoRevision === (this.#repoRevisions.get(repo) || 0)
      && scope.snapshot === (this.#snapshots.get(repo) || null);
  }

  /**
   * Отзывает снимок, очищает закрытый текст и помечает его зашифрованную копию отозванной.
   * @param {string} repo Репозиторий подтверждённого отзыва.
   * @param {string} branch Ветка снимка, чей ключ отзывается в хранилище.
   * @param {AccessRequestScope} scope Токен и ревизии до запроса; старый ответ не меняет новый доступ.
   * @param {string} reason Готовое пояснение отказа без PAT или заголовков.
   * @param {'revoked'|'missing'} [state] Вид уведомления каталога; missing сохраняет прежний случай отсутствующего служебного снимка.
   * @returns {Promise<boolean>} Нынешний доступ отозван; false для устаревшего ответа. Отказ записи метки отзыва отмечается отдельно.
   */
  async #revokeRepository(repo, branch, scope, reason, state = 'revoked') {
    if (!this.#requestScopeCurrent(repo, scope)) return false;
    const repoRevision = scope.repoRevision + 1;
    this.#repoRevisions.set(repo, repoRevision);
    this.#blocked.add(repo);
    this.#snapshots.delete(repo);
    this.#failures.set(repo, reason);
    const removal = cached('remove', cacheIdentity(scope.tokenId, repo, branch));
    try {
      this.#channel?.postMessage({ type: 'snapshot-revoked', id: scope.tokenId, repo });
    } catch {}
    this.#notify(repo, state);
    try {
      await removal;
    } catch {
      if (this.#requestScopeCurrent(repo, { ...scope, repoRevision, snapshot: null }) && this.#blocked.has(repo)) {
        this.#notify(repo, 'cache-error');
      }
    }
    return true;
  }

  /**
   * Читает содержимое с захваченным доступом и отзывает его только при настоящем запрете GitHub.
   * @param {string} repo Репозиторий документа или исходника.
   * @param {string} path Уже проверенный путь разрешённого вида чтения.
   * @param {string} branch Явная ветка чтения, отдельно от пути.
   * @param {'document'|'linked-document'|'source'} kind Разрешённый вид content протокола.
   * @param {AccessRequestScope} scope Токен и ревизии до ожидания content.
   * @param {AbortSignal} [signal] Отмена запроса владельцем просмотра; не принадлежит кэшу.
   * @returns {Promise<string>} Текст ответа; 401/denied отзывают текущий снимок, сеть/rate limit/404 сохраняют прежний успех.
   */
  async #readContent(repo, path, branch, kind, scope, signal) {
    if (!this.#requestScopeCurrent(repo, scope)) throw new Error(ui.access.accessChanged);
    try {
      return await this.#api.content(repo, path, branch, kind, signal);
    } catch (cause) {
      const failure = githubFailure(cause);
      if (
        failure.status !== 404 && !failure.rateLimited
        && (failure.status === 401 || failure.code === 'token-rejected' || failure.denied)
      ) {
        await this.#revokeRepository(
          repo,
          branch,
          scope,
          cause instanceof Error ? cause.message : ui.access.privateRequestFailed,
        );
      }
      throw cause;
    }
  }

  /**
   * Разделяет одну проверку repo/branch между вызовами и повторяет только после подтверждённой смены репозитория.
   * @param {string} repo Имя репозитория Hxape для общей проверки.
   * @param {string} branch Ветка, которая вместе с repo определяет выполняющийся запрос.
   * @param {PrivateSnapshot|null} previous Местный снимок для сравнения хеша или сохранения при отказе сети.
   * @returns {Promise<PrivateSnapshot>} Нынешний проверенный снимок либо отказ проверки.
   */
  async #check(repo, branch, previous) {
    const requestKey = `${repo}:${branch}`;
    const current = this.#refreshing.get(requestKey);
    if (current) {
      try {
        return await current;
      } catch (error) {
        if ((/** @type {RequestError} */ (error))?.code !== 'repo-changed') throw error;
        if (this.#refreshing.get(requestKey) === current) this.#refreshing.delete(requestKey);
        previous = this.#blocked.has(repo) ? null : await this.#readCached(repo, branch);
      }
    }
    const pending = this.#refreshSnapshot(repo, branch, previous);
    this.#refreshing.set(requestKey, pending);
    const clear = () => {
      if (this.#refreshing.get(requestKey) === pending) this.#refreshing.delete(requestKey);
    };
    pending.then(clear, clear);
    return pending;
  }

  /**
   * Открывает шифртекст снимка только текущим PAT и повторно сверяет запись перед принятием.
   * @param {string} repo Репозиторий, чей зашифрованный снимок открывается.
   * @param {string} branch Ожидаемая ветка местного снимка; чужая ветка не принимается.
   * @returns {Promise<PrivateSnapshot|null>} Местный снимок без утверждения свежести GitHub либо null.
   */
  async #readCached(repo, branch) {
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    if (!id) return null;
    const active = id ? this.#tokens.get(id) : null;
    const current = this.#snapshots.get(repo);
    if (current?.tokenId === id && current.branch === branch) return current;
    if (!active) return null;
    const key = cacheIdentity(id, repo, branch);
    let record;
    try {
      record = await cached('read', key);
    } catch {
      return null;
    }
    if (!record || record.tokenId !== id || record.revoked) return null;
    try {
      const saved = cachedPayload(await this.#api.unsealSnapshot(key, record));
      if ((saved.branch || 'main') !== branch) return null;
      const data = validateSnapshot(repo, saved.data);
      delete data.ref;
      if (!/^[0-9a-f]{64}$/.test(saved.hash)) throw new Error(ui.access.invalidSavedHash);
      await this.#assertStored(id, revision, intent);
      const entry = {
        tokenId: id,
        branch,
        data,
        hash: saved.hash,
        paths: documentPaths(data),
        sourcePaths: sourcePaths(data),
        confirmed: false,
      };
      this.#snapshots.set(repo, entry);
      return entry;
    } catch {
      return null;
    }
  }

  /**
   * Просит воркер шифровать снимок и записывает его лишь после сверки PAT и expectedEpoch.
   * @param {string} repo Репозиторий, для которого записывается зашифрованная копия.
   * @param {PrivateSnapshot} entry Принятые данные, хеш и ветка; текст источника .hx сюда не добавляется.
   * @param {number} expectedEpoch Поколение записи хранилища до ожидания; конкурентный отзыв или замена отклоняют запись.
   */
  async #saveCached(repo, entry, expectedEpoch) {
    const id = this.#activeId;
    const active = id ? this.#tokens.get(id) : null;
    if (!id || !active) return;
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const key = cacheIdentity(active.id, repo, entry.branch);
    const sealed = await this.#api.sealSnapshot(key, { data: entry.data, hash: entry.hash, branch: entry.branch });
    await this.#assertStored(id, revision, intent);
    await cached('put', key, { key, tokenId: active.id, repo, ...sealed, expectedEpoch });
  }

  /**
   * Сверяет закрытый снимок с GitHub на одной ревизии ветки и удерживает доступную местную копию при сетевом отказе.
   * @param {string} repo Имя репозитория Hxape, которому принадлежит запрос.
   * @param {string} branch Ветка репозитория; входит в адрес чтения и идентичность снимка.
   * @param {PrivateSnapshot|null} previous Предыдущий снимок, который можно сохранить при сетевом отказе.
   * @returns {Promise<PrivateSnapshot>} Проверенный либо stale снимок; подтверждённый запрет отзывает доступ.
   */
  async #refreshSnapshot(repo, branch, previous) {
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    if (!id) throw new Error('Unlock a token first.');
    const repoRevision = this.#repoRevisions.get(repo) || 0;
    const initialSnapshot = this.#snapshots.get(repo) || null;
    const key = cacheIdentity(id, repo, branch);
    const checkRepo = () => {
      if (repoRevision !== (this.#repoRevisions.get(repo) || 0)) {
        throw Object.assign(new Error(ui.access.privateChanged), { code: 'repo-changed' });
      }
    };
    let phase = 'repository';
    let remoteHash = null;
    /**
     * @type {PrivateSnapshot|null}
     */
    let downloaded = null;
    try {
      if (previous) previous.confirmed = false;
      await this.#assertStored(id, revision, intent);
      const initialCache = await cached('read', key).catch(() => null);
      const expectedEpoch = initialCache?.epoch || 0;
      checkRepo();
      const metadata = await this.#api.repository(repo);
      await this.#assertStored(id, revision, intent);
      checkRepo();
      if (typeof metadata.default_branch !== 'string' || !metadata.default_branch) {
        throw new Error(ui.access.defaultBranchMissing);
      }
      phase = 'commit';
      await this.#assertStored(id, revision, intent);
      const commit = await this.#api.commit(repo, branch);
      await this.#assertStored(id, revision, intent);
      checkRepo();
      if (!/^[0-9a-f]{40}$/i.test(commit.sha)) throw new Error(ui.access.invalidCommit);
      // Хэш и JSON читаются по SHA одного коммита, чтобы не смешать две ревизии ветки.
      phase = 'checksum';
      await this.#assertStored(id, revision, intent);
      const hash = (await this.#api.content(repo, '.private/site.sha256', commit.sha, 'checksum')).trim().toLowerCase();
      await this.#assertStored(id, revision, intent);
      checkRepo();
      if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error(ui.access.invalidPrivateHash);
      remoteHash = hash;
      await this.#assertStored(id, revision, intent);
      if (previous && previous.hash === hash) {
        const latestCache = await cached('read', key).catch(() => null);
        if (latestCache && (latestCache.epoch || 0) !== expectedEpoch) {
          throw Object.assign(new Error(ui.access.snapshotChanged), { code: 'cache-conflict' });
        }
        checkRepo();
        previous.confirmed = true;
        previous.stale = false;
        this.#blocked.delete(repo);
        this.#failures.delete(repo);
        this.#notify(repo, 'fresh');
        return previous;
      }
      phase = 'snapshot';
      const raw = await this.#api.content(repo, '.private/site.json', commit.sha, 'snapshot');
      await this.#assertStored(id, revision, intent);
      checkRepo();
      if (await digest(raw) !== hash) throw new Error(ui.access.snapshotHashMismatch);
      const data = validateSnapshot(repo, JSON.parse(raw));
      delete data.ref;
      await this.#assertStored(id, revision, intent);
      /**
       * @type {PrivateSnapshot}
       */
      const entry = {
        tokenId: id,
        branch,
        data,
        hash,
        paths: documentPaths(data),
        sourcePaths: sourcePaths(data),
        confirmed: true,
      };
      downloaded = entry;
      let cacheError = false;
      try {
        await this.#saveCached(repo, entry, expectedEpoch);
      } catch (error) {
        if ((/** @type {RequestError} */ (error))?.code === 'cache-conflict') throw error;
        cacheError = true;
      }
      await this.#assertStored(id, revision, intent);
      checkRepo();
      this.#sourceCache.clear();
      this.#snapshots.set(repo, entry);
      this.#blocked.delete(repo);
      this.#failures.delete(repo);
      entry.cacheError = cacheError;
      if (previous) this.#notify(repo, 'updated');
      if (cacheError) this.#notify(repo, 'cache-error');
      else this.#channel?.postMessage({ type: 'snapshot-updated', id, repo });
      return entry;
    } catch (cause) {
      const failure = githubFailure(cause);
      if (failure?.code === 'repo-changed' || repoRevision !== (this.#repoRevisions.get(repo) || 0)) throw cause;
      if (failure?.code === 'cache-conflict') {
        const record = await cached('read', key).catch(() => null);
        this.#snapshots.delete(repo);
        if (record?.revoked) {
          this.#blocked.add(repo);
          this.#failures.set(repo, ui.access.changedInOtherTab);
          this.#notify(repo, 'revoked');
          throw cause;
        }
        const latest = await this.#readCached(repo, branch);
        if (latest) {
          latest.stale = latest.hash !== remoteHash;
          this.#blocked.delete(repo);
          this.#notify(repo, latest.stale ? 'stale' : 'updated');
          return latest;
        }
        const fallback = downloaded || previous;
        if (fallback) {
          fallback.stale = true;
          fallback.confirmed = false;
          this.#snapshots.set(repo, fallback);
          this.#notify(repo, 'stale');
          return fallback;
        }
        throw cause;
      }
      const status = failure?.status || 0;
      let message = cause instanceof Error ? cause.message : ui.access.privateRequestFailed;
      let code = 'request-failed';
      if (status === 404 && phase === 'checksum') {
        message = ui.access.checksumMissing;
        code = 'snapshot-missing';
      } else if (status === 404 && phase === 'snapshot') {
        message = ui.access.snapshotMissing;
        code = 'snapshot-missing';
      } else if (status === 404 && phase === 'repository') {
        message = formatText(ui.access.repositoryUnavailable, { repo });
        code = 'repository-unavailable';
      } else if (status === 404 && phase === 'commit') {
        message = formatText(ui.access.branchUnavailable, { branch });
        code = 'branch-unavailable';
      } else if (status === 409 && phase === 'commit') {
        message = /git repository is empty/i.test(failure?.detail || '')
          ? formatText(ui.access.emptyRepository, { repo, branch })
          : formatText(ui.access.branchConflict, { repo, branch });
        code = 'branch-unavailable';
      }
      const error = Object.assign(new Error(message), { status, code, denied: failure?.denied });
      const scope = { tokenId: id, revision, activationIntent: intent, repoRevision, snapshot: initialSnapshot };
      if (this.#requestScopeCurrent(repo, scope)) {
        this.#failures.set(repo, message);
        if ([401, 404].includes(status) || failure?.denied && !failure.rateLimited) {
          await this.#revokeRepository(
            repo,
            branch,
            scope,
            message,
            code === 'snapshot-missing' ? 'missing' : 'revoked',
          );
        } else if (previous) this.#notify(repo, 'stale');
      }
      throw error;
    }
  }

  /**
   * Отдаёт доступную местную копию и при необходимости запускает её проверку, иначе читает свежую.
   * @param {string} repo Репозиторий Hxape, чей снимок требуется каталогу.
   * @param {boolean} [cachedOnly] При наличии местной копии не запускать её фоновую сетевую проверку; отсутствие копии требует чтения GitHub.
   * @param {string} [branch] Ожидаемая ветка снимка; по умолчанию main.
   * @returns Структура нужного repo/branch; секрет и ключ странице не выдаются.
   */
  async snapshot(repo, cachedOnly = false, branch = 'main') {
    repo = repositoryName(repo);
    branch = branchName(branch);
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    if (!id) throw new Error('Unlock a token first.');
    await this.#assertStored(id, revision, intent);
    const previous = this.#blocked.has(repo) ? null : await this.#readCached(repo, branch);
    if (revision !== this.#revision || intent !== this.#activationIntent || id !== this.#activeId) {
      throw new Error(ui.access.accessRevisionChanged);
    }
    if (previous) {
      if (!cachedOnly) void this.#check(repo, branch, previous).catch(() => {});
      this.#notify(
        repo,
        cachedOnly ? (previous.stale ? 'stale' : previous.cacheError ? 'cache-error' : 'current') : 'checking',
      );
      return previous.data;
    }
    const fresh = await this.#check(repo, branch, null);
    this.#notify(repo, fresh.stale ? 'stale' : fresh.cacheError ? 'cache-error' : 'current');
    return fresh.data;
  }

  /**
   * Явно сверяет снимок через GitHub, повторяя после repo-changed.
   * @param {string} repo Репозиторий Hxape для явной повторной проверки.
   * @param {string} [branch] Ветка, по которой читаются SHA, хеш и согласованный снимок.
   * @returns Свежая структура либо отказ; формат шифрованного хранения не меняется.
   */
  async refresh(repo, branch = 'main') {
    repo = repositoryName(repo);
    branch = branchName(branch);
    const id = this.#activeId;
    if (!id) throw new Error('Unlock a token first.');
    await this.#assertStored(id, this.#revision, this.#activationIntent);
    const previous = this.#blocked.has(repo) ? null : await this.#readCached(repo, branch);
    let fresh;
    try {
      fresh = await this.#check(repo, branch, previous);
    } catch (error) {
      if ((/** @type {RequestError} */ (error))?.code !== 'repo-changed') throw error;
      const latest = this.#blocked.has(repo) ? null : await this.#readCached(repo, branch);
      fresh = await this.#check(repo, branch, latest);
    }
    this.#notify(repo, fresh.stale ? 'stale' : fresh.cacheError ? 'cache-error' : 'current');
    return fresh.data;
  }

  /**
   * Читает стандартный документ по разрешённым метаданным снимка и сверяет доступ до и после ответа.
   * @param {string} repo Репозиторий текущего доступного снимка.
   * @param {string} path Полный путь стандартного документа, включённый в метаданные этого снимка.
   * @param {string} [branch] Ветка документа; должна совпасть с веткой снимка.
   * @param {AbortSignal} [signal] Отмена чтения; проверяется до передачи воркеру и после ответа.
   * @returns {Promise<string>} Текст нынешнего доступа; подтверждённый запрет отзывает снимок, остальные отказы не выдают старый ответ.
   */
  async document(repo, path, branch = 'main', signal) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Request cancelled.', 'AbortError');
    repo = repositoryName(repo);
    branch = branchName(branch);
    const snapshot = this.#snapshots.get(repo);
    if (!snapshot || snapshot.branch !== branch || !snapshot.paths.has(path)) {
      throw new Error(ui.access.loadSnapshotFirst);
    }
    const repoRevision = this.#repoRevisions.get(repo) || 0;
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    if (!id) throw new Error('Unlock a token first.');
    await this.#assertStored(id, revision, intent);
    if (signal?.aborted) throw signal.reason ?? new DOMException('Request cancelled.', 'AbortError');
    if (
      repoRevision !== (this.#repoRevisions.get(repo) || 0) || this.#blocked.has(repo)
      || this.#snapshots.get(repo) !== snapshot
    ) throw new Error(ui.access.accessChanged);
    const text = await this.#readContent(
      repo,
      path,
      branch,
      'document',
      { tokenId: id, revision, activationIntent: intent, repoRevision, snapshot },
      signal,
    );
    await this.#assertStored(id, revision, intent);
    if (signal?.aborted) throw signal.reason ?? new DOMException('Request cancelled.', 'AbortError');
    if (
      repoRevision !== (this.#repoRevisions.get(repo) || 0) || this.#blocked.has(repo)
      || this.#snapshots.get(repo) !== snapshot
    ) throw new Error(ui.access.accessChanged);
    return text;
  }

  /**
   * Читает исходник только из подтверждённого снимка и сверяет право после ответа.
   * @param {string} repo Имя репозитория Hxape, которому принадлежит запрос.
   * @param {string} path Полный относительный путь .hx, включённый в разрешённые файлы снимка.
   * @param {string} [branch] Ветка репозитория; входит в адрес чтения и идентичность снимка.
   * @param {AbortSignal} [signal] Отмена вызывающей стороны; результат после отмены не принимается.
   * @param {SourceFileOptions} [options] Явное обновление обходит готовый кэш исходника.
   * @returns {Promise<string>} Текст допустимого файла; обновление обходит кэш, подтверждённый запрет отзывает снимок, отмена и смена доступа отклоняют ответ.
   */
  async sourceFile(repo, path, branch = 'main', signal, { refresh = false } = {}) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Request cancelled.', 'AbortError');
    repo = repositoryName(repo);
    branch = branchName(branch);
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    const repoRevision = this.#repoRevisions.get(repo) || 0;
    if (!id) throw new Error(ui.githubRequest.unlockFirst);
    await this.#assertStored(id, revision, intent);
    let snapshot = this.#snapshots.get(repo);
    if (!snapshot || snapshot.branch !== branch || this.#blocked.has(repo)) {
      throw new Error(ui.access.loadSnapshotFirst);
    }
    if (!snapshot.confirmed) snapshot = await this.#check(repo, branch, snapshot);
    if (signal?.aborted) throw signal.reason ?? new DOMException('Request cancelled.', 'AbortError');
    if (!snapshot.confirmed || snapshot.stale || !snapshot.sourcePaths.has(path)) {
      throw new Error(ui.access.loadSnapshotFirst);
    }
    await this.#assertStored(id, revision, intent);
    if (signal?.aborted) throw signal.reason ?? new DOMException('Request cancelled.', 'AbortError');
    if (
      repoRevision !== (this.#repoRevisions.get(repo) || 0) || this.#blocked.has(repo)
      || this.#snapshots.get(repo) !== snapshot
    ) {
      throw new Error(ui.access.accessChanged);
    }
    const key = JSON.stringify([id, repo, branch, snapshot.hash, repoRevision, path]);
    const saved = refresh ? undefined : this.#sourceCache.get(key);
    if (saved !== undefined) return saved;
    const text = await this.#readContent(
      repo,
      path,
      branch,
      'source',
      { tokenId: id, revision, activationIntent: intent, repoRevision, snapshot },
      signal,
    );
    await this.#assertStored(id, revision, intent);
    if (signal?.aborted) throw signal.reason ?? new DOMException('Request cancelled.', 'AbortError');
    if (
      repoRevision !== (this.#repoRevisions.get(repo) || 0) || this.#blocked.has(repo) || !snapshot.confirmed
      || snapshot.stale
      || this.#snapshots.get(repo) !== snapshot
    ) throw new Error(ui.access.accessChanged);
    this.#sourceCache.set(key, text);
    return text;
  }

  /**
   * Читает упомянутый Markdown только при свежем подтверждённом снимке того же ref; сетевой отказ сохраняет успешный кэш.
   * @param {string} repo Имя репозитория Hxape, которому принадлежит запрос.
   * @param {string} path Нормализованный путь .md/.markdown/README/LICENSE без скрытого каталога; проверяется до чтения.
   * @param {string} [branch] Ветка репозитория; входит в адрес чтения и идентичность снимка.
   * @param {AbortSignal} [signal] Отмена вызывающей стороны; результат после отмены не принимается.
   * @param {LinkedDocumentOptions} [options] Явное обновление обходит готовый кэш документа.
   * @returns {Promise<string>} Успешный текст текущего доступа; подтверждённый запрет очищает кэш, сеть/rate limit/404 отдельного пути его сохраняют.
   */
  async linkedDocument(repo, path, branch = 'main', signal, { refresh = false } = {}) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Request cancelled.', 'AbortError');
    repo = repositoryName(repo);
    branch = branchName(branch);
    if (!linkedDocumentPath(path)) throw new Error('Invalid linked document path.');
    const snapshot = this.#snapshots.get(repo);
    if (!snapshot || snapshot.branch !== branch || !this.confirmed(repo)) throw new Error(ui.access.loadSnapshotFirst);
    const revision = this.#revision;
    const repoRevision = this.#repoRevisions.get(repo) || 0;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    if (!id) throw new Error(ui.githubRequest.unlockFirst);
    const assert = async () => {
      await this.#assertStored(id, revision, intent);
      if (signal?.aborted) throw signal.reason ?? new DOMException('Request cancelled.', 'AbortError');
      if (
        repoRevision !== (this.#repoRevisions.get(repo) || 0) || this.#snapshots.get(repo) !== snapshot
        || !this.confirmed(repo) || snapshot.branch !== branch
      ) throw new Error(ui.access.accessChanged);
    };
    await assert();
    const key = JSON.stringify(['document', id, repo, branch, snapshot.hash, repoRevision, path]);
    const saved = refresh ? undefined : this.#sourceCache.get(key);
    if (saved !== undefined) return saved;
    const text = await this.#readContent(
      repo,
      path,
      branch,
      'linked-document',
      { tokenId: id, revision, activationIntent: intent, repoRevision, snapshot },
      signal,
    );
    await assert();
    this.#sourceCache.set(key, text);
    return text;
  }
}

/**
 * Оболочка расшифрованного снимка; data отдельно проверяются по repo, hash и branch.
 * @typedef {Object} CachedPayloadResult
 * @property {unknown} data Внешний JSON после дешифрования; форму нужного repo отдельно проверяет validateSnapshot.
 * @property {string} hash Строка checksum из открытого кэша; формат SHA-256 проверяется перед принятием снимка.
 * @property {string} [branch] Ветка, которой принадлежат снимок и его сохранённый ключ.
 */

/**
 * Допуск нынешнего HXDoc местной копии при построении временной ревизии доступа.
 * @typedef {Object} SnapshotRevisionOptions
 * @property {boolean} [allowCached] Допустить уже открытый HXDoc местной копии; не разрешает linked Markdown или raw-чтение.
 */

/**
 * Подтверждённый credential и одноразовый PRF-материал защиты нового PAT.
 * @typedef {Object} AddPasskeyFields
 * @property {string} credentialId Идентификатор WebAuthn credential в Base64url, без открытого PRF.
 * @property {string} prfSalt Сохранённая соль запроса PRF в Base64url.
 * @property {Uint8Array} material 32-байтный результат PRF для передачи воркеру; постоянному хранению не принадлежит.
 */

/**
 * Явное перечитывание raw Haxe вместо выдачи готового закрытого кэша.
 * @typedef {Object} SourceFileOptions
 * @property {boolean} [refresh] Обойти готовый кэш и явно перечитать материал.
 */

/**
 * Явное перечитывание Markdown вместо выдачи готового закрытого кэша.
 * @typedef {Object} LinkedDocumentOptions
 * @property {boolean} [refresh] Обойти готовый кэш и явно перечитать материал.
 */
