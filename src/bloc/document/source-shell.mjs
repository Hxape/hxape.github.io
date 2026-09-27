/** Лениво загружает оболочку исходника и её стили отдельно для каждого документа. */
import { requestFragment } from '../../common/html/request.mjs';
import { ui } from '../../common/ui/text.mjs';

/** Готовые подписи ожидания оболочки; текст файла в этом модуле отсутствует. */
const labels = ui.sourceViewer;
/** Единственный путь CSS ready-исходника для ленивой загрузки и проверки подготовленного окна. */
const sourceStylePath = 'public/css/source.css';
/**
 * Одна незавершённая подготовка статической оболочки на host; запись снимается после успеха или отказа.
 * @type {WeakMap<HTMLElement,Promise<void>>}
 */
const loadingShell = new WeakMap();
/**
 * Одна незавершённая загрузка CSS на документ; готовность PiP проверяется отдельно, отказ допускает повтор.
 * @type {WeakMap<Document,Promise<void>>}
 */
const loadingStyle = new WeakMap();

/**
 * Проверяет CSS, который координатор уже подготовил до переноса готового текста.
 * @param {Document} owner Фактический документ готового host после append либо возврата при rollback.
 * @returns {void} При готовом stylesheet не создаёт запрос, кэш или новый link.
 * @throws {Error} Отсутствующий или не загруженный CSS делает синхронное возобновление недопустимым до commit.
 */
export function requirePreparedSourceStyle(owner) {
  const href = new URL(sourceStylePath, owner.baseURI).href;
  const link = [...owner.querySelectorAll('link')].find(item => item.rel === 'stylesheet' && item.href === href);
  if (!link?.sheet || link.disabled) throw new Error('The source stylesheet is not prepared for this document');
}

/**
 * Готовит единственную таблицу стилей исходника для данного документа.
 * @param {Document} owner Фактический документ показа, включая PiP; готовность не переносится между документами.
 * @returns {Promise<void>} Обещание готового CSS; загруженный link и текущий запрос повторно используются.
 * @throws {Error} Ошибка или 15-секундный отказ удаляют link, чтобы следующий вызов мог повторить загрузку.
 */
export function ensureSourceStyle(owner) {
  const href = new URL(sourceStylePath, owner.baseURI).href;
  const existing = [...owner.querySelectorAll('link')].find((link) => link.rel === 'stylesheet' && link.href === href);
  const link = existing || owner.createElement('link');
  link.dataset.sourceViewStyle = '';
  if (link.sheet) return Promise.resolve(undefined);
  const current = loadingStyle.get(owner);
  if (current) return current;
  if (!existing) {
    link.rel = 'stylesheet';
    link.href = href;
  }
  /** @type {Promise<void>} */
  const pending = new Promise((resolve, reject) => {
    /**
     * Завершает единственную попытку CSS и снимает её таймер и события.
     * @param {Error|null} error null после load; ошибка/таймаут удаляют link перед отказом обещания.
     * @returns {void} Готовая таблица стилей остаётся в документе; отказ можно повторить следующим вызовом.
     */
    const finish = (error) => {
      clearTimeout(timer);
      link.removeEventListener('load', loaded);
      link.removeEventListener('error', failed);
      if (error) {
        link.remove();
        reject(error);
      } else resolve(undefined);
    };
    const loaded = () => finish(null);
    const failed = () => finish(new Error('Source style failed to load.'));
    const timer = setTimeout(() => finish(new Error('Source style timed out.')), 15_000);
    link.addEventListener('load', loaded, { once: true });
    link.addEventListener('error', failed, { once: true });
    if (!existing) owner.head.append(link);
    else if (link.sheet) loaded();
  }).finally(() => loadingStyle.delete(owner));
  loadingStyle.set(owner, pending);
  return pending;
}

/**
 * Готовит CSS и статическую HTML-оболочку прежней области исходника.
 * @param {HTMLElement} host Подключённая область исходника, чья оболочка не содержит текста файла или PAT.
 * @returns {Promise<void>} Обещание проверенной оболочки; прежний data-source-code и общий запрос host повторно используются.
 * @throws {Error} Отказ CSS, HTML или отсутствие обязательного узла позволяют повторить подготовку.
 */
export async function ensureSourceShell(host) {
  await ensureSourceStyle(host.ownerDocument);
  if (host.querySelector('[data-source-code]')) return;
  const existing = loadingShell.get(host);
  if (existing) return existing;
  host.textContent = labels.loadingViewer;
  // При отказе Promise удаляется из WeakMap, чтобы следующая попытка загрузила оболочку заново.
  const pending = requestFragment('public/html/source-view.html', host).then(() => {
    if (
      ![
        '[data-source-frame]',
        '[data-source-gutter]',
        '[data-source-code]',
        '[data-source-state]',
        '[data-source-note]',
      ]
        .every((selector) => host.querySelector(selector))
    ) throw new Error(labels.viewerFailed);
  }).finally(() => loadingShell.delete(host));
  loadingShell.set(host, pending);
  return pending;
}
