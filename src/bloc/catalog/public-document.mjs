/**
 * Читает публичный Markdown с GitHub и хранит только успешно прочитанный текст в ограниченном временном кэше.
 */
import { linkedDocumentPath } from '../../common/network/document-path.mjs';
import limits from '../../common/network/json/source-limits.json' with { type: 'json' };
import { withinRequestTime } from '../../common/network/request-lifetime.mjs';
import { TextCache } from '../../common/network/text-cache.mjs';
import { materialPath, materialRef, repositoryUrl } from './material-target.mjs';

const documents = new TextCache(limits.publicCache);

export { linkedDocumentPath };

/**
 * Распознаёт нормализованный публичный Markdown или правовой документ без скрытого каталога.
 * @param {string} path Полный относительный путь Markdown или правового документа внутри Git-корня.
 * @returns {boolean} Путь допустим для публичного документа.
 */
export function publicDocumentPath(path) {
  return linkedDocumentPath(path) || materialPath(path)
      && /(?:^|\/)(?:LICENSE|LICENCE|COPYING|COPYRIGHT|NOTICE|UNLICENSE)[^/]*$/i.test(path)
      && !path.split('/').some(part => part.startsWith('.'));
}

/**
 * Читает ограниченный текст и прекращает поток при превышении размера.
 * @param {Response} response Сетевой ответ; размер и форма проверяются до выдачи результата.
 * @param {number} limit Предельное число прочитанных байтов.
 * @returns {Promise<string>} Полный текст; слишком большой или недекодируемый ответ вызывает отказ.
 */
async function readText(response, limit) {
  const length = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(length) && length > limit) throw new Error('Document is too large.');
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limit) throw new Error('Document is too large.');
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }
  const reader = response.body.getReader();
  /**
   * @type {Uint8Array[]}
   */
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Document is too large.');
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
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/**
 * Определяет нынешнюю ветку публичной библиотеки; ошибка не становится именем ветки.
 * @param {string} url Адрес источника, который проверяется до сетевого обращения.
 * @param {AbortSignal} signal Отмена вызывающей стороны; результат после отмены не принимается.
 * @returns {Promise<string>} Ветка из успешного ответа; отказ не превращается в догадку о ref.
 */
export function publicDefaultRef(url, signal) {
  const repository = repositoryUrl(url);
  if (!repository) throw new Error('Invalid GitHub repository.');
  return withinRequestTime(async requestSignal => {
    const response = await fetch(`https://api.github.com/repos/${repository.slice('https://github.com/'.length)}`, {
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: requestSignal,
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error(`GitHub repository request failed: HTTP ${response.status}`);
    const data = /** @type {unknown} */ (JSON.parse(await readText(response, limits.maxMetadataBytes)));
    if (!data || typeof data !== 'object' || !('default_branch' in data) || !materialRef(data.default_branch)) {
      throw new Error('GitHub returned an invalid branch.');
    }
    return data.default_branch;
  }, { signal });
}

/**
 * Читает только заданный публичный документ; обновление обходит кэш, отказ сохраняет прежний успех.
 * @param {LoadPublicDocumentLocation} location Проверяемые GitHub URL, ref и путь читаемого материала.
 * @param {AbortSignal} signal Отмена вызывающей стороны; результат после отмены не принимается.
 * @param {LoadPublicDocumentOptions} [options] Явное обновление обходит готовый временный кэш текста.
 * @returns {Promise<string>} Успешный текст; ошибка или отмена не стирают прежний успешный кэш.
 */
export function loadPublicDocument(location, signal, { refresh = false } = {}) {
  const repository = repositoryUrl(location.url);
  if (!repository || !materialRef(location.ref) || !publicDocumentPath(location.path)) {
    throw new Error('Invalid document address.');
  }
  return withinRequestTime(async requestSignal => {
    const key = JSON.stringify([repository.toLowerCase(), location.ref, location.path]);
    const saved = refresh ? undefined : documents.get(key);
    if (saved !== undefined) return saved;
    const url = `https://raw.githubusercontent.com/${repository.slice('https://github.com/'.length)}/${
      encodeURIComponent(location.ref)
    }/${location.path.split('/').map(encodeURIComponent).join('/')}`;
    const response = await fetch(url, {
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: requestSignal,
    });
    if (!response.ok || response.headers.get('Content-Type')?.toLowerCase().startsWith('text/html')) {
      throw new Error(`GitHub document request failed: HTTP ${response.status}`);
    }
    const text = await readText(response, limits.privateRequest.maxDocumentBytes);
    if (requestSignal.aborted) throw requestSignal.reason;
    documents.set(key, text);
    return text;
  }, { signal, timeout: 20_000 });
}

/**
 * Точный публичный адрес чтения: GitHub-корень, явный ref и нормализованный путь.
 * @typedef {Object} LoadPublicDocumentLocation
 * @property {string} url Канонический GitHub URL источника, отдельно от местного VS Code пути.
 * @property {string} ref Ветка, тег или коммит, передаваемый отдельно от пути файла.
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 */

/**
 * Режим обхода временного кэша при явном обновлении документа.
 * @typedef {Object} LoadPublicDocumentOptions
 * @property {boolean} [refresh] Обойти готовый кэш и явно перечитать материал.
 */
