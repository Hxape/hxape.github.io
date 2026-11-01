/** Проверяет нормализованный путь адресного Markdown-чтения без допуска служебных каталогов. */

/**
 * Допускает адресный Markdown/README/LICENSE путь относительно Git-корня без скрытых каталогов, переходов и управляющих символов.
 * @param {unknown} path Ещё не проверенный смысловой путь после разбора адреса, без URL-кодирования.
 * @returns {boolean} true только для разрешённого непустого пути не длиннее 1024 знаков; доступ к репозиторию здесь не проверяется.
 */
export function linkedDocumentPath(path) {
  return typeof path === 'string' && path.length > 0 && path.length <= 1024
    && !/[\\\u0000-\u001f\u007f]/.test(path)
    && path.split('/').every(part => part && part !== '.' && part !== '..' && !part.startsWith('.'))
    && /(?:\.(?:md|markdown)$|(?:^|\/)(?:README|CONTRIBUTING|AGENTS|LICENSE)(?:\.txt)?$)/i.test(path);
}
