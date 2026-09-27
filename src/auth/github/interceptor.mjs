/**
 * Воркер получает GitHub API только через разрешённые GET с ограничением размера ответа.
 */
import { linkedDocumentPath } from '../../common/network/document-path.mjs';
import limits from '../../common/network/json/source-limits.json' with { type: 'json' };
import octocat from './json/octocat.json' with { type: 'json' };

const policy = limits.privateRequest;
const decoder = new TextDecoder('utf-8', { fatal: true });

/**
 * Отличает именованные поля внешнего JSON от null, массива и примитивов.
 * @param {unknown} value Результат декодирования GitHub до проверки полей нужного ответа.
 * @returns {value is Record<string,unknown>} Значение допускает проверку именованных полей без приведения к конечному DTO.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Создаёт ограниченный отказ транспорта без PAT или заголовков.
 * @param {string} code Код, который страница переводит в подпись отказа.
 * @param {number} [status] HTTP-статус GitHub; 0 для отказа до получения ответа.
 * @returns Ошибка с кодом и HTTP-статусом.
 */
function failure(code, status = 0) {
  return Object.assign(new Error(code), { code, status });
}

/**
 * Проверяет repo перед построением API-пути внутри Hxape.
 * @param {string} repo Имя репозитория Hxape, которому принадлежит запрос.
 * @returns Имя допустимого репозитория; повреждённая форма вызывает отказ.
 */
function repositoryName(repo) {
  if (typeof repo !== 'string' || !/^[a-z\d][a-z\d._-]{0,99}$/i.test(repo) || repo === '.' || repo === '..') {
    throw failure('invalid-repository');
  }
  return repo;
}

/**
 * Проверяет явный ref перед кодированием запроса GitHub.
 * @param {string} value Входное значение, форма которого проверяется этой функцией.
 * @returns Допустимый ref; пустые и неоднозначные сегменты вызывают отказ.
 */
function refName(value) {
  if (
    typeof value !== 'string' || !/^[a-z\d][a-z\d._/-]{0,99}$/i.test(value)
    || value.includes('..') || value.includes('//') || value.endsWith('/') || value.endsWith('.')
    || value.split('/').some((part) => part.startsWith('.') || part.endsWith('.lock'))
  ) {
    throw failure('invalid-ref');
  }
  return value;
}

/**
 * Ограничивает путь выбранным видом чтения: служебный снимок, документ, linked Markdown или .hx.
 * @param {string} path Путь файла относительно Git-корня, без URL-кодирования.
 * @param {string} kind Вид разрешённого чтения, выбирающий отдельный перечень путей.
 * @returns Разрешённый путь; произвольный файл или скрытый каталог отклоняются.
 */
function filePath(path, kind) {
  if (kind === 'linked-document' && linkedDocumentPath(path)) return path;
  if (
    typeof path !== 'string' || !path || path.length > 1000
    || path.split('/').some((part) => !part || part === '.' || part === '..' || /[\\?#\x00-\x1f]/.test(part))
  ) {
    throw failure('invalid-path');
  }
  if (kind === 'checksum' && path === '.private/site.sha256') return path;
  if (kind === 'snapshot' && path === '.private/site.json') return path;
  if (path.split('/').some((part) => part.startsWith('.'))) throw failure('invalid-path');
  if (kind === 'source' && path.endsWith('.hx')) return path;
  if (kind === 'document' && /(?:^|\/)(?:README|CONTRIBUTING|AGENTS|LICENSE)(?:\.(?:md|markdown|txt))?$/i.test(path)) {
    return path;
  }
  throw failure('invalid-path');
}

/**
 * Читает ограниченный поток ответа и отменяет reader при превышении maxBytes.
 * @param {Response} response Ответ GitHub, чей Content-Length и поток проверяются до декодирования.
 * @param {number} maxBytes Максимальный размер полного ответа в байтах.
 * @returns Полные байты ответа в заданном пределе.
 */
async function readBytes(response, maxBytes) {
  const length = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(length) && length > maxBytes) throw failure('response-too-large', response.status);
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw failure('response-too-large', response.status);
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw failure('response-too-large', response.status);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Определяет отказ GitHub, отличая запрет от ограничения частоты и неверного PAT.
 * @param {Response} response Сетевой ответ; размер и форма проверяются до выдачи результата.
 * @returns Ограниченная ошибка со статусом и detail, без заголовка Authorization.
 */
async function requestError(response) {
  let detail = '';
  try {
    const data = /** @type {unknown} */ (JSON.parse(decoder.decode(await readBytes(response, policy.maxErrorBytes))));
    if (isRecord(data) && typeof data.message === 'string') detail = data.message.slice(0, 200);
  } catch {}
  const rateLimited = [403, 429].includes(response.status)
    && (response.headers.get('X-RateLimit-Remaining') === '0' || Boolean(response.headers.get('Retry-After'))
      || /rate limit/i.test(detail));
  const code = response.status === 401 ? 'token-rejected' : rateLimited
    ? 'rate-limited'
    : response.status === 403
    ? 'github-denied'
    : 'github-failed';
  return Object.assign(failure(code, response.status), {
    denied: response.status === 403 && !rateLimited,
    rateLimited,
    detail,
  });
}

/**
 * Собирает разрешённые адреса и заголовки внутри воркера.
 */
export class GithubTransport {
  /**
   * Строит типизированный GET внутри воркера с PAT, размером и сроком; произвольные методы не принимает.
   * @param {string} path Собранный разрешённым методом путь внутри https://api.github.com.
   * @param {string} token Открытый PAT нынешнего сеанса; используется только в заголовке воркера.
   * @param {number} maxBytes Предел байтов JSON-ответа до UTF-8 и JSON-декодирования.
   * @param {AbortSignal} [signal] Отмена команды страницы; объединяется со сроком воркера и снимается в finally.
   * @returns {Promise<unknown>} Внешний JSON для проверки вызывающим методом; срок и отмена отклоняют чтение.
   */
  async #json(path, token, maxBytes, signal) {
    if (!token) throw failure('session-lost');
    if (signal?.aborted) throw signal.reason ?? failure('cancelled');
    const request = new AbortController();
    const cancel = () => request.abort(signal?.reason);
    signal?.addEventListener('abort', cancel, { once: true });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      request.abort();
    }, octocat.workerRequestTimeoutMs);
    try {
      const response = await fetch(`https://api.github.com${path}`, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': octocat.apiVersion,
        },
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        signal: request.signal,
      });
      if (!response.ok) throw await requestError(response);
      const data = /** @type {unknown} */ (JSON.parse(decoder.decode(await readBytes(response, maxBytes))));
      return data;
    } catch (error) {
      if (timedOut) throw failure('timeout');
      if (signal?.aborted) throw failure('cancelled');
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }

  /**
   * Проверяет нового владельца PAT через /user.
   * @param {string} token Вновь добавляемый PAT, владелец которого ещё не подтверждён.
   * @param {AbortSignal} [signal] Отмена проверки владельца токена.
   * @returns Проверенный login; ошибочный или запрещённый ответ вызывает отказ.
   */
  async user(token, signal) {
    const data = await this.#json('/user', token, policy.maxJsonBytes, signal);
    if (!isRecord(data) || typeof data.login !== 'string' || !data.login) throw failure('invalid-user');
    return { login: data.login };
  }

  /**
   * Читает метаданные одного репозитория Hxape.
   * @param {string} repo Имя репозитория внутри организации Hxape, проверяемое перед запросом.
   * @param {string} token PAT нынешнего сеанса; странице не возвращается.
   * @param {AbortSignal} [signal] Отмена чтения метаданных репозитория.
   * @returns Проверенный default_branch; отсутствие поля вызывает отказ.
   */
  async repository(repo, token, signal) {
    repo = repositoryName(repo);
    const data = await this.#json(`/repos/Hxape/${encodeURIComponent(repo)}`, token, policy.maxJsonBytes, signal);
    if (!isRecord(data) || typeof data.default_branch !== 'string' || !data.default_branch) {
      throw failure('invalid-repository');
    }
    return { default_branch: data.default_branch };
  }

  /**
   * Читает refs/heads выбранной ветки и требует Git-коммит с SHA.
   * @param {string} repo Имя репозитория Hxape, в котором проверяется ветка.
   * @param {string} branch Имя ветки, которое должно совпасть с refs/heads в ответе GitHub.
   * @param {string} token PAT нынешнего сеанса; используется внутри воркера.
   * @param {AbortSignal} [signal] Отмена проверки коммита ветки.
   * @returns Точный SHA выбранной ветки; другой тип объекта вызывает отказ.
   */
  async commit(repo, branch, token, signal) {
    repo = repositoryName(repo);
    branch = refName(branch);
    const ref = `refs/heads/${branch}`;
    const path = branch.split('/').map(encodeURIComponent).join('/');
    const data = await this.#json(
      `/repos/Hxape/${encodeURIComponent(repo)}/git/ref/heads/${path}`,
      token,
      policy.maxJsonBytes,
      signal,
    );
    const object = isRecord(data) ? data.object : null;
    if (
      !isRecord(data) || data.ref !== ref || !isRecord(object) || object.type !== 'commit'
      || typeof object.sha !== 'string' || !/^[0-9a-f]{40}$/i.test(object.sha)
    ) throw failure('invalid-commit');
    return { sha: object.sha };
  }

  /**
   * Читает разрешённый файл через Contents/blob API, ограничивая Base64 и декодированные байты.
   * @param {string} repo Имя репозитория Hxape, которому принадлежит файл.
   * @param {string} path Путь внутри Git-корня; проверяется перечнем допустимых файлов выбранного kind.
   * @param {string} ref Явная ветка, тег или коммит, кодируемый отдельно от пути.
   * @param {'checksum'|'snapshot'|'document'|'linked-document'|'source'} kind Вид чтения, выбирающий проверку пути и предел размера.
   * @param {string} token Открытый PAT нынешнего сеанса; остаётся внутри воркера.
   * @param {AbortSignal} [signal] Отмена всей пары Contents/blob-запросов.
   * @returns UTF-8 текст в пределе выбранного вида; каталог, двоичный или слишком большой ответ отклоняются.
   */
  async content(repo, path, ref, kind, token, signal) {
    repo = repositoryName(repo);
    path = filePath(path, kind);
    ref = refName(ref);
    const maxBytes = kind === 'checksum' ? policy.maxChecksumBytes : kind === 'snapshot'
      ? policy.maxSnapshotBytes
      : kind === 'source'
      ? limits.maxSourceBytes
      : policy.maxDocumentBytes;
    const maxEncoded = Math.ceil(maxBytes / 3) * 4 + limits.maxMetadataBytes;
    const base = `/repos/Hxape/${encodeURIComponent(repo)}`;
    const metadata = await this.#json(
      `${base}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`,
      token,
      maxEncoded,
      signal,
    );
    if (
      !isRecord(metadata) || metadata.type !== 'file' || typeof metadata.sha !== 'string'
      || !/^[0-9a-f]{40}$/i.test(metadata.sha)
    ) {
      throw failure('invalid-file');
    }
    if (
      typeof metadata.size !== 'number' || !Number.isInteger(metadata.size) || metadata.size < 0
      || metadata.size > maxBytes
    ) {
      throw failure(kind === 'source' ? 'source-too-large' : 'response-too-large');
    }
    const source = metadata.encoding === 'base64' && typeof metadata.content === 'string'
      ? metadata
      : await this.#json(`${base}/git/blobs/${encodeURIComponent(metadata.sha)}`, token, maxEncoded, signal);
    if (!isRecord(source) || source.encoding !== 'base64' || typeof source.content !== 'string') {
      throw failure('invalid-file');
    }
    const encoded = source.content.replace(/\s/g, '');
    if (encoded.length > Math.ceil(maxBytes / 3) * 4 + 4) {
      throw failure(kind === 'source' ? 'source-too-large' : 'response-too-large');
    }
    let decoded;
    try {
      decoded = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    } catch {
      throw failure('invalid-file');
    }
    if (decoded.byteLength > maxBytes) throw failure(kind === 'source' ? 'source-too-large' : 'response-too-large');
    return decoder.decode(decoded);
  }
}
