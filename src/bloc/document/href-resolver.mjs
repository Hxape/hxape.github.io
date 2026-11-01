/**
 * Разрешает относительные ссылки документа внутри выбранной ветки репозитория GitHub.
 */
import { materialPath } from '../catalog/material-target.mjs';

/**
 * Нормализует относительный путь ссылки от файла текущего материала.
 * @param {string} value Исходное относительное href с необязательными query и fragment.
 * @param {string} basePath Полный путь нынешнего файла относительно Git-корня.
 * @returns {RelativeMaterialPathResult|null} Путь и исходный фрагмент без выхода из Git-корня либо null для абсолютной, повреждённой или запрещённой ссылки.
 */
export function relativeMaterialPath(value, basePath) {
  if (
    !materialPath(basePath) || !value || /[\\\u0000-\u001f\u007f]/.test(value)
    || /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('/') || value.includes('?')
  ) return null;
  const split = value.indexOf('#');
  const pathname = split < 0 ? value : value.slice(0, split);
  let anchor = split < 0 ? null : value.slice(split + 1);
  const parts = pathname ? basePath.split('/').slice(0, -1) : basePath.split('/');
  try {
    if (anchor !== null) anchor = decodeURIComponent(anchor);
    for (const part of pathname.split('/')) {
      const decoded = decodeURIComponent(part);
      if (/[\/\\\u0000-\u001f\u007f]/.test(decoded)) return null;
      if (!decoded || decoded === '.') continue;
      if (decoded === '..') {
        if (!parts.length) return null;
        parts.pop();
      } else parts.push(decoded);
    }
  } catch {
    return null;
  }
  const path = parts.join('/');
  if (!materialPath(path, true)) return null;
  return { path, anchor, directory: /\/$|(?:^|\/)\.{1,2}$/.test(pathname) };
}

/**
 * Привязывает разрешение относительных адресов к одному файлу, репозиторию и ref.
 * @param {string} path Полный путь документа относительно Git-корня.
 * @param {string} repositoryUrl URL корня GitHub-репозитория этого документа.
 * @param {string} ref Фактическая ветка или ref чтения; не локальная установленная версия.
 * @returns {(value:string)=>string|null} Функция получения GitHub URL из относительного href; отказ конкретного значения возвращает null.
 */
export function repositoryHrefResolver(path, repositoryUrl, ref) {
  const parts = documentPath(path);
  return (value) => relativeUrl(value, parts, repositoryUrl, ref);
}

/**
 * Проверяет абсолютный адрес HTTP(S) без учётных данных и управляющих символов.
 * @param {string} value Проверяемая строка URL репозитория или ссылки.
 * @returns {URL|null} URL допустимого протокола либо null при отказе проверки.
 */
function httpUrl(value) {
  if (!/^https?:\/\//i.test(value) || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return !url.username && !url.password && ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Проверяет сегменты пути документа до разрешения относительной ссылки.
 * @param {unknown} path Внешнее значение полного пути, ещё не доверенное как строка.
 * @returns {string[]|null} Массив непустых допустимых сегментов либо null для запрещённого пути.
 */
function documentPath(path) {
  if (typeof path !== 'string' || /[\\\u0000-\u001f\u007f]/.test(path)) return null;
  const parts = path.split('/');
  return parts.every(part => part && part !== '.' && part !== '..') ? parts : null;
}

/**
 * Строит GitHub blob/tree URL из относительного пути без предположения о ref.
 * @param {string} value Исходное относительное href с query или fragment.
 * @param {string[]|null} path Проверенные сегменты нынешнего документа либо null при отказе пути.
 * @param {string|undefined} repositoryUrl Адрес корня репозитория; отсутствие или неправильный протокол запрещают преобразование.
 * @param {string|undefined} ref Ref чтения, явно переданный владельцем документа.
 * @returns {string|null} GitHub URL с закодированными сегментами либо null для недопустимого входа.
 */
function relativeUrl(value, path, repositoryUrl, ref) {
  if (!path || typeof ref !== 'string' || !ref || ref === '.' || ref === '..' || /[\\\u0000-\u001f\u007f]/.test(ref)) {
    return null;
  }
  const repository = typeof repositoryUrl === 'string' && httpUrl(repositoryUrl);
  if (!repository || /^[a-z][a-z\d+.-]*:/i.test(value) || /^[\/\\]/.test(value)) return null;
  const match = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(value);
  if (!match) return null;
  const [, pathname, search = '', hash = ''] = match;
  const parts = pathname ? path.slice(0, -1) : [...path];
  try {
    for (const part of pathname.split('/')) {
      const decoded = decodeURIComponent(part);
      if (/[\/\\\u0000-\u001f\u007f]/.test(decoded)) return null;
      if (!decoded || decoded === '.') continue;
      if (decoded === '..') {
        if (!parts.length) return null;
        parts.pop();
      } else {
        parts.push(decoded);
      }
    }
  } catch {
    return null;
  }
  const directory = /\/$|(?:^|\/)\.{1,2}$/.test(pathname);
  const base = repository.href.replace(/[?#].*$/, '').replace(/\/+$/, '');
  const route = directory ? 'tree' : 'blob';
  return `${base}/${route}/${encodeURIComponent(ref)}/${parts.map(encodeURIComponent).join('/')}${search}${hash}`;
}

/**
 * Нормализованный путь и исходный якорь относительно нынешнего документа, без GitHub URL.
 * @typedef {Object} RelativeMaterialPathResult
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 * @property {string|null} anchor Исходный Markdown-якорь; порождённый DOM-id не сохраняется.
 * @property {boolean} directory Ссылка обозначает каталог, а не файл.
 */
