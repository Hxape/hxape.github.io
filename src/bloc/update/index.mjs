/** Сверяет опубликованный выпуск и ведёт одну кнопку обновления сайта с повтором. */
import { withinRequestTime } from '../../common/network/request-lifetime.mjs';
import { renderControlIcons } from '../../common/ui/icons.mjs';
import { formatText, ui } from '../../common/ui/text.mjs';
import { showTooltip } from '../../common/ui/tooltips.mjs';
import { showUpdateAction } from '../../component/update-action/index.mjs';
import { showUpdateNotice } from '../../component/update-notice/index.mjs';
import { showVersionCaption } from '../../component/version-caption/index.mjs';

const root = new URL('./', document.baseURI);
const savedCommitKey = 'site-main-commit';
/**
 * Проверенный ресурс статического выпуска; путь остаётся внутри сайта, SHA относится к точным байтам.
 * @typedef {object} Resource
 * @property {string} path Относительный путь без пустых частей, точек и перехода к родителю.
 * @property {string} sha256 Ожидаемый SHA-256 ресурса из принятого манифеста.
 */
/**
 * Непроверенный внешний JSON; поля остаются unknown до resourcesFor.
 * @typedef {object} ResourceManifest
 * @property {unknown} [version] Должна оказаться числом 1.
 * @property {unknown} [resources] Должно оказаться непустым массивом не более 500 уникальных ресурсов.
 */

/**
 * Читает текст ресурса за общий срок запроса; учётные данные включаются только для того же origin.
 * @param {string|URL} url Адрес ресурса сайта либо открытого GitHub.
 * @param {RequestCache} cache Режим HTTP-кэша, выбранный операцией проверки.
 * @returns {Promise<string>} Полный успешный текст ответа.
 * @throws {Error} При HTTP-отказе, сетевом отказе или окончании срока.
 */
async function readText(url, cache) {
  return withinRequestTime(async (signal) => {
    const response = await fetch(url, {
      cache,
      credentials: new URL(url).origin === root.origin ? 'same-origin' : 'omit',
      signal,
    });
    if (!response.ok) throw new Error(`Resource request failed: ${response.status}`);
    return response.text();
  });
}

/**
 * Сверяет манифест точного коммита с опубликованным и проверяет каждую запись до начала загрузки.
 * @param {string} sha Проверенный полный SHA целевого коммита.
 * @returns {Promise<Resource[]>} Уникальные ресурсы принятого выпуска с проверенными путями и SHA-256.
 * @throws {Error} Если Pages ещё не соответствует коммиту, JSON неверен либо чтение не удалось.
 */
async function resourcesFor(sha) {
  const target = await readText(
    `https://raw.githubusercontent.com/Hxape/hxape.github.io/${sha}/public/json/resources.json`,
    'no-store',
  );
  const published = await readText(new URL('public/json/resources.json', root), 'reload');
  if (target !== published) throw new Error(ui.version.waitForDeployment);
  const parsed = /** @type {unknown} */ (JSON.parse(target));
  const manifest = /** @type {ResourceManifest|null} */ (parsed && typeof parsed === 'object' ? parsed : null);
  if (
    manifest?.version !== 1 || !Array.isArray(manifest.resources) || !manifest.resources.length
    || manifest.resources.length > 500
  ) throw new Error(ui.version.invalidResources);
  /**
   * Пути уже проверенных записей манифеста; повторный путь запрещает принятие всего списка.
   * @type {Set<string>}
   */
  const seen = new Set();
  /**
   * Только принятые пути и SHA-256 из нынешнего манифеста, готовые для загрузки.
   * @type {Resource[]}
   */
  const resources = [];
  const entries = /** @type {unknown[]} */ (manifest.resources);
  for (const entry of entries) {
    const item =
      /** @type {{path?:unknown,sha256?:unknown}|null} */ (entry && typeof entry === 'object' ? entry : null);
    const path = item?.path;
    if (
      typeof path !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(path) || path.split('/').some((part) =>
        !part || part === '.' || part === '..'
      ) || seen.has(path)
      || typeof item?.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(item.sha256)
    ) throw new Error(ui.version.invalidResources);
    seen.add(path);
    resources.push({ path, sha256: item.sha256 });
  }
  return resources;
}

/**
 * Загружает ресурс с обходом кэша и сверяет точные байты с SHA-256 принятого манифеста.
 * @param {Resource} resource Уже проверенный путь и ожидаемый хэш.
 * @returns {Promise<void>} Успех означает соответствие ресурса выпуску.
 * @throws {Error} При отказе чтения, вычисления хэша или несовпадении байтов.
 */
async function refreshResource(resource) {
  await withinRequestTime(async (signal) => {
    const response = await fetch(new URL(resource.path, root), { credentials: 'same-origin', cache: 'reload', signal });
    if (!response.ok) throw new Error(`Resource request failed: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    if (hash !== resource.sha256) throw new Error(ui.version.resourceMismatch);
  });
}

/**
 * Проверяет не более трёх ресурсов одновременно; первый отказ останавливает выдачу новых запросов.
 * @param {Resource[]} resources Проверенный список целевого выпуска.
 * @param {(finished:number)=>void} progress Сообщает количество успешно проверенных ресурсов после каждого ответа.
 * @returns {Promise<void>} Завершается после всех начатых запросов.
 * @throws {unknown} Первый отказ проверки; уже начатые запросы заканчиваются за свой срок.
 */
async function refreshResources(resources, progress) {
  let next = 0;
  let finished = 0;
  /**
   * Первый отказ проверки ресурса останавливает выдачу следующих; уже начатые запросы ещё заканчиваются.
   * @type {unknown}
   */
  let failure = null;
  /**
   * Берёт следующий ресурс из общей очереди и сообщает только успешное завершение; отказ сохраняется для всей операции.
   * @returns {Promise<void>} Начатый запрос заканчивается до остановки этого исполнителя.
   */
  const worker = async () => {
    while (!failure && next < resources.length) {
      const item = resources[next++];
      try {
        await refreshResource(item);
      } catch (error) {
        failure = error;
        break;
      }
      progress(++finished);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, resources.length) }, worker));
  if (failure) throw failure;
}

/**
 * Удаляет CacheStorage сайта после проверки выпуска; отсутствие API допускается.
 * @returns {Promise<void>} Удаление ограничено пятью секундами.
 * @throws {Error} Если доступ к CacheStorage или срок удаления завершился отказом.
 */
async function clearOldCaches() {
  if (!('caches' in window)) return;
  await withinRequestTime(async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }, { timeout: 5_000 });
}

/**
 * Связывает единственную переносимую кнопку со сверкой и установкой выпуска; загружать разрешено только действием человека.
 * @param {HTMLButtonElement} button Живая кнопка внутри единственных настроек.
 * @param {HTMLElement} footer Область версии, сообщения и повтора установки.
 * @returns {Promise<boolean>} Результат начальной проверки: false без перезагрузки; отсутствие обязательных узлов также даёт false.
 */
export function startSiteUpdate(button, footer) {
  const commit = footer.querySelector('#site-commit a');
  const banner = footer.querySelector('#site-update');
  const message = banner?.querySelector('#site-update-message');
  const retry = banner?.querySelector('#site-update-retry');
  if (
    !(commit instanceof HTMLAnchorElement) || !(banner instanceof HTMLElement) || !(message instanceof HTMLElement)
    || !(retry instanceof HTMLButtonElement) || !(button instanceof HTMLButtonElement)
  ) return Promise.resolve(false);
  /**
   * Последний успешно установленный полный SHA из браузера; null означает отсутствие достоверной записи.
   * @type {string|null}
   */
  let previous = null;
  try {
    previous = localStorage.getItem(savedCommitKey);
  } catch {}
  if (!previous || !/^[0-9a-f]{40}$/i.test(previous)) previous = null;
  /**
   * Показывает только последний успешно установленный SHA; кандидат нового выпуска не заменяет эту подпись.
   * @returns {void}
   */
  const showInstalled = () => {
    showVersionCaption(commit, {
      text: previous ? previous.slice(0, 7) : ui.version.unavailable,
      href: previous ? `https://github.com/Hxape/hxape.github.io/commit/${previous}` : undefined,
      title: previous ? formatText(ui.version.lastChecked, { sha: previous }) : undefined,
    });
  };
  showInstalled();
  /**
   * Идёт одна сверка или установка; все кнопки используют этот общий признак.
   */
  let pending = false;
  /**
   * Проверенный выпуск уже ведёт к location.replace; операция больше не включает кнопки повторно.
   */
  let navigating = false;
  /**
   * Нынешний рисунок и действие кнопки; success кратковременен и запрещает параллельное нажатие.
   * @type {'check'|'download'|'success'}
   */
  let state = 'check';
  /**
   * Действие последнего запроса, которое повторяет кнопка отказа.
   * @type {'check'|'download'}
   */
  let retryAction = 'check';
  /**
   * Таймер возврата краткого подтверждения к действию проверки; отменяется перед новой операцией.
   */
  let successTimer = 0;
  /**
   * Последний SHA, прочитанный у main; после отказа помогает сохранить действие загрузки нового выпуска.
   */
  let targetSha = '';
  /**
   * Согласует действие, доступность, значок и подсказку единственной кнопки.
   * @param {'check'|'download'|'success'} next Проверить, установить найденный выпуск либо кратко подтвердить успех.
   * @returns {void}
   */
  const setState = (next) => {
    state = next;
    const label = next === 'download'
      ? ui.version.download
      : next === 'success'
      ? ui.version.checked
      : ui.version.check;
    showUpdateAction(button, {
      state: next,
      disabled: pending || next === 'success',
      label,
      tooltip: formatText(ui.version.desktopTooltip, {
        action: label,
        sha: previous ? previous.slice(0, 7) : ui.version.unavailable,
      }),
      control: `update-${next}`,
    });
    renderControlIcons(button);
    if (button.getAttribute('aria-describedby')?.split(/\s+/).includes('ui-tooltip')) {
      showTooltip(button, button.dataset.tooltip || '');
    }
  };
  /**
   * Показывает краткое подтверждение и планирует возврат кнопки к проверке версии.
   * @returns {void}
   */
  const showSuccess = () => {
    window.clearTimeout(successTimer);
    setState('success');
    successTimer = window.setTimeout(() => setState('check'), 1600);
  };
  /**
   * Передаёт плашке установки готовый текст и разрешение повтора.
   * @param {string} text Сообщение текущей операции или отказа.
   * @param {boolean} canRetry Разрешить явный повтор последнего действия.
   * @returns {void}
   */
  const show = (text, canRetry) => {
    showUpdateNotice(banner, { hidden: false, text, retryVisible: canRetry });
  };
  /**
   * Читает main через открытый GitHub API и проверяет полный SHA до использования в адресах выпуска.
   * @returns {Promise<string>} Сорок шестнадцатеричных знаков SHA.
   * @throws {Error} При чтении, разборе JSON или неподходящем SHA.
   */
  const readCommit = async () => {
    const result = await readText('https://api.github.com/repos/Hxape/hxape.github.io/commits/main', 'no-store');
    const parsed = /** @type {unknown} */ (JSON.parse(result));
    const sha = parsed && typeof parsed === 'object' && 'sha' in parsed ? parsed.sha : null;
    if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/i.test(sha)) throw new Error(ui.version.invalidCommit);
    return sha;
  };
  /**
   * Ведёт одну проверку или установку: манифест и байты проверяются до записи SHA и перезагрузки.
   * @param {'check'|'download'} action Только сверка SHA либо загрузка принятого выпуска.
   * @param {boolean} [initial=false] Начальная тихая проверка при запуске страницы.
   * @returns {Promise<boolean>} true после принятой установки с переходом; false при сверке, параллельной операции или показанном отказе.
   */
  const update = async (action, initial = false) => {
    if (pending) return false;
    pending = true;
    window.clearTimeout(successTimer);
    retryAction = action;
    showUpdateNotice(banner, {
      retryLabel: action === 'download' ? ui.version.retry : ui.version.retryCheck,
    });
    setState(state);
    if (!initial) show(action === 'download' ? ui.version.preparing : ui.version.checking, false);
    try {
      const sha = await readCommit();
      targetSha = sha;
      if (previous === sha) {
        showUpdateNotice(banner, { hidden: true });
        if (initial) setState('check');
        else showSuccess();
        return false;
      }
      if (action === 'check') {
        showUpdateNotice(banner, { hidden: true });
        setState('download');
        return false;
      }
      show(ui.version.preparing, false);
      const resources = await resourcesFor(sha);
      show(formatText(ui.version.progress, { finished: 0, total: resources.length }), false);
      await refreshResources(
        resources,
        (finished) => show(formatText(ui.version.progress, { finished, total: resources.length }), false),
      );
      show(ui.version.cleaning, false);
      await clearOldCaches();
      // Записываем SHA после всех проверок: при ошибке следующая попытка снова сравнит выпуск с прежним SHA.
      localStorage.setItem(savedCommitKey, sha);
      previous = sha;
      showInstalled();
      showUpdateNotice(banner, { hidden: true });
      showSuccess();
      await new Promise((resolve) => window.setTimeout(resolve, 1100));
      const destination = new URL(location.href);
      destination.searchParams.set('commit', sha.slice(0, 7));
      location.replace(destination.href);
      navigating = true;
      return true;
    } catch (error) {
      show(
        error instanceof Error
          && [ui.version.waitForDeployment, ui.version.invalidResources, ui.version.resourceMismatch].includes(
            error.message,
          )
          ? error.message
          : action === 'download'
          ? ui.version.failed
          : ui.version.checkFailed,
        true,
      );
      if (!previous) showVersionCaption(commit, { text: ui.version.unavailable });
      setState(action === 'download' && targetSha !== previous ? 'download' : 'check');
      return false;
    } finally {
      if (!navigating) {
        pending = false;
        setState(state);
      }
    }
  };
  button.addEventListener('click', () => {
    void update(state === 'download' ? 'download' : 'check');
  });
  button.addEventListener('focus', () => showTooltip(button, button.dataset.tooltip || ''));
  retry.addEventListener('click', () => {
    void update(retryAction);
  });
  setState('check');
  return update('check', true);
}
