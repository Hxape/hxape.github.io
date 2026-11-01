/**
 * Читает публичный исходник GitHub с ограничением размера, срока и кэшем текста.
 */
import sourceLimits from '../../common/network/json/source-limits.json' with { type: 'json' };
import { withinRequestTime } from '../../common/network/request-lifetime.mjs';
import { TextCache } from '../../common/network/text-cache.mjs';

const MAX_SOURCE_BYTES = sourceLimits.maxSourceBytes;
const publicSources = new TextCache(sourceLimits.publicCache);

/**
 * Адрес и происхождение чтения полного исходника; не постоянное доказательство доступа.
 * @typedef {Object} SourceLocation
 * @property {string} url Канонический GitHub URL источника, отдельно от местного VS Code пути.
 * @property {string} ref Ветка, тег или коммит, передаваемый отдельно от пути файла.
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 * @property {boolean} library Обычная команда библиотеки выбирает default_branch; для явного ref этот флаг передают как false.
 * @property {boolean} private Закрытый исходник запрещён публичному загрузчику и читается через GithubAccess.
 */
/**
 * Части безопасного корня публичного GitHub-репозитория.
 * @typedef {Object} GithubRepository
 * @property {string} owner Владелец GitHub-репозитория, проверенный из web URL.
 * @property {string} repository Имя публичного репозитория, выделенное из безопасного URL.
 */

/**
 * Создаёт отдельный отказ превышения размера исходника.
 * @returns Ошибка source-too-large для повторяемого просмотра.
 */
function tooLarge() {
  return Object.assign(new Error('Source file is too large.'), { code: 'source-too-large' });
}

/**
 * Ограничивает чтение нормализованным относительным .hx-путём.
 * @param {string} value Полный относительный .hx-путь, который будет закодирован по сегментам.
 * @returns {boolean} Путь допустим для публичного raw-чтения.
 */
function safePath(value) {
  return typeof value === 'string' && value.endsWith('.hx') && value.length <= 1024
    && !value.split('/').some((part) => !part || part === '.' || part === '..' || /[\\\u0000-\u001f]/.test(part));
}

/**
 * Проверяет ref до кодирования адреса raw-файла.
 * @param {string} value Ref публичного raw-чтения, отдельно от пути.
 * @returns {boolean} Допустимая ветка, тег или коммит без обходных сегментов.
 */
function safeRef(value) {
  return typeof value === 'string' && /^[a-z\d][a-z\d._/-]{0,99}$/i.test(value)
    && !value.includes('..') && !value.includes('//') && !value.endsWith('/') && !value.endsWith('.')
    && !value.split('/').some((part) => part.startsWith('.') || part.endsWith('.lock'));
}

/**
 * Требует точный GitHub-корень без query, fragment и credentials.
 * @param {string} value Web URL только корня публичного GitHub-репозитория.
 * @returns {GithubRepository} Owner и repository для построения собственного URL; другой адрес вызывает отказ.
 */
function githubRepository(value) {
  const url = new URL(value);
  const match = url.pathname.match(/^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/);
  if (url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash || !match) {
    throw new Error('Invalid GitHub repository.');
  }
  return { owner: match[1], repository: match[2] };
}

/**
 * Ограничивает прочитанные байты и отменяет поток при превышении предела.
 * @param {Response} response Ответ raw GitHub, проверяемый до декодирования текста.
 * @param {number} limit Максимальный размер исходного файла в байтах.
 * @returns Полные байты ответа; слишком большой файл вызывает source-too-large.
 */
async function readBytes(response, limit) {
  const length = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(length) && length > limit) throw tooLarge();
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limit) throw tooLarge();
    return bytes;
  }
  const reader = response.body.getReader();
  /**
   * @type {Uint8Array[]}
   */
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw tooLarge();
      parts.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

/**
 * Читает только публичный raw-файл; PAT сюда не передаётся.
 * @param {SourceLocation} source URL GitHub-корня, ref, полный .hx-путь, флаг обычной библиотеки и запрет private.
 * @param {AbortSignal} signal Отмена вызывающей стороны; результат после отмены не принимается.
 * @param {LoadPublicSourceFileOptions} [options] Явное обновление обходит готовый временный кэш исходника.
 * @returns {Promise<LoadPublicSourceFileResult>} Готовый текст и actual ref; только успешный текст попадает в ограниченный временный кэш.
 */
export function loadPublicSourceFile(source, signal, { refresh = false } = {}) {
  if (!safePath(source.path) || typeof source.library !== 'boolean' || source.private) {
    throw new Error('Invalid source path.');
  }
  const { owner, repository } = githubRepository(source.url);
  return withinRequestTime(async (requestSignal) => {
    let ref = source.ref;
    // У установленной библиотеки показываем нынешнюю ветку GitHub; её ref не равен локальной ревизии.
    if (source.library) {
      const metadataUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
      const response = await fetch(metadataUrl, {
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        headers: { Accept: 'application/vnd.github+json' },
        signal: requestSignal,
      });
      if (!response.ok) throw new Error(`GitHub repository request failed: HTTP ${response.status}`);
      const metadata = /** @type {unknown} */ (JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(await readBytes(response, sourceLimits.maxMetadataBytes)),
      ));
      if (
        !metadata || typeof metadata !== 'object' || Array.isArray(metadata)
        || !('default_branch' in metadata) || typeof metadata.default_branch !== 'string'
      ) throw new Error('GitHub returned an invalid branch.');
      ref = metadata.default_branch;
    }
    if (!safeRef(ref)) throw new Error('GitHub returned an invalid branch.');
    // Ключ учитывает фактический ref; локальная версия установки не служит ключом публичного текста.
    const key = JSON.stringify([owner, repository, ref, source.path]);
    const cached = refresh ? undefined : publicSources.get(key);
    if (cached !== undefined) return { content: cached, ref };
    const path = source.path.split('/').map(encodeURIComponent).join('/');
    const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/${
      encodeURIComponent(ref)
    }/${path}`;
    const response = await fetch(url, {
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: requestSignal,
    });
    if (!response.ok || response.headers.get('Content-Type')?.toLowerCase().startsWith('text/html')) {
      throw new Error(`GitHub source request failed: HTTP ${response.status}`);
    }
    const content = new TextDecoder('utf-8', { fatal: true }).decode(await readBytes(response, MAX_SOURCE_BYTES));
    if (requestSignal.aborted) throw requestSignal.reason ?? new DOMException('Request cancelled.', 'AbortError');
    publicSources.set(key, content);
    return { content, ref };
  }, { timeout: 20_000, signal });
}

/**
 * Обход временного публичного кэша по явной команде обновления.
 * @typedef {Object} LoadPublicSourceFileOptions
 * @property {boolean} [refresh] Обойти готовый кэш и явно перечитать материал.
 */

/**
 * Полный публичный текст .hx и ref, на котором он был фактически прочитан.
 * @typedef {Object} LoadPublicSourceFileResult
 * @property {string} content Текст разрешённого материала; право чтения проверяет владелец источника.
 * @property {string} ref Ветка, тег или коммит, передаваемый отдельно от пути файла.
 */
