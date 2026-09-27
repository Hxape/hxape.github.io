/** Создаёт и связывает владельцев интерфейса после загрузки начальных фрагментов. */
import '../bloc/catalog/index.mjs';
import '../bloc/document/index.mjs';
import '../bloc/preferences/index.mjs';
import { GithubAccess } from '../auth/github/access.mjs';
import { octocatAutoRestoreEnabled } from '../auth/github/session-client.mjs';
import { PageAppearance } from '../bloc/page/index.mjs';
import { startSiteUpdate } from '../bloc/update/index.mjs';
import { requestFragment } from '../common/html/request.mjs';
import { enableSystemSymbols, renderControlIcons } from '../common/ui/icons.mjs';
import { ui } from '../common/ui/text.mjs';
import { displayWindow } from '../common/ui/view-utils.mjs';
import { showTokenDialogFailure } from '../component/token-dialog/index.mjs';
import { PictureInPictureController } from './picture-in-picture.mjs';

// Состав приложения создаётся один раз после проверки начальных HTML-фрагментов bootstrap.
/**
 * Единственная рамка исходной страницы; тот же узел может быть перенесён в PiP.
 */
const terminal = /** @type {HTMLElement} */ (document.querySelector('.terminal'));
/**
 * Владелец данных каталога, выбора строки и нижнего смыслового адреса на срок страницы.
 */
const catalog =
  /** @type {import('../bloc/catalog/index.mjs').ProjectCatalog} */ (document.querySelector('project-catalog'));
/**
 * Владелец живого просмотра и внутреннего журнала; получает подготовку материалов от каталога.
 */
const panel =
  /** @type {import('../bloc/document/index.mjs').DocumentPanel} */ (document.querySelector('document-panel'));
/**
 * Единственный владелец настроек оформления, местного корня и режима ссылок обоих окон.
 */
const preferences = /** @type {import('../bloc/preferences/index.mjs').SitePreferences} */ (document.querySelector(
  'site-preferences',
));
/**
 * Общая нижняя панель, переносимая вместе с просмотром и содержащая форму доступа.
 */
const footer = /** @type {HTMLElement} */ (terminal.querySelector('.terminal-footer'));
renderControlIcons(terminal);
void enableSystemSymbols(document);

catalog.addEventListener('icons-ready', (event) => {
  const { detail } = /** @type {CustomEvent<import('../bloc/catalog/icons.mjs').IconSettings>} */ (event);
  preferences.setIcons(detail);
  catalog.setIcons(preferences.icons);
  panel.setIcons(preferences.icons);
});
preferences.addEventListener('icons-change', (event) => {
  const { detail } = /** @type {CustomEvent<import('../bloc/catalog/icons.mjs').IconSettings>} */ (event);
  catalog.setIcons(detail);
  panel.setIcons(detail);
});
preferences.addEventListener('font-size-change', () => {
  catalog.refreshTextSize();
  panel.refreshSourceGeometry();
});
preferences.addEventListener('hold-duration-change', (event) => {
  const duration = /** @type {CustomEvent<number>} */ (event).detail;
  catalog.setHoldDuration(duration);
  panel.setHoldDuration(duration);
});
catalog.setHoldDuration(preferences.holdDuration);
panel.setHoldDuration(preferences.holdDuration);
/**
 * Владелец размещения настроек, рамки, подсказок и нижних действий; связывает прежние узлы.
 */
const appearance = new PageAppearance({ terminal, panel, preferences, footer });
/**
 * Единственный доступ к Octocat и метаданным токенов; секретами продолжает владеть воркер.
 */
const githubAccess = new GithubAccess();
githubAccess.addEventListener('change', () => preferences.setTokenActive(githubAccess.active));
preferences.setTokenActive(githubAccess.active);
/**
 * Общее ожидание ленивой формы на срок страницы; отказ снимает его для следующего явного повтора.
 * @type {Promise<import('../bloc/tokens/index.mjs').GithubTokens>|null}
 */
let tokenManagerPromise = null;
/**
 * Лениво создаёт форму доступа и подключает её к размещению; успешный экземпляр переиспользуется.
 * @returns {Promise<import("../bloc/tokens/index.mjs").GithubTokens>} Готовая форма; отказ импорта отклоняет обещание и разрешает следующий повтор.
 */
function tokenManager() {
  if (!tokenManagerPromise) {
    tokenManagerPromise = import('../bloc/tokens/index.mjs').then(({ GithubTokens }) => {
      const manager = new GithubTokens({ footer, access: githubAccess, requestFragment });
      appearance.setTokenManager(manager);
      return manager;
    }).catch((error) => {
      tokenManagerPromise = null;
      throw error;
    });
  }
  return tokenManagerPromise;
}

/**
 * Показывает отказ ленивой формы и действие её повторного открытия в том же dialog footer.
 * @returns {void} Если dialog отсутствует, сообщение не создаётся.
 */
function tokenLoadFailure() {
  const dialog = footer.querySelector('#token-dialog');
  if (!(dialog instanceof HTMLDialogElement)) return;
  showTokenDialogFailure(dialog, {
    message: ui.tokens.loadFailed,
    retryLabel: ui.tokens.retry,
    onRetry: () => {
      void openTokenManager();
    },
  });
  if (!dialog.open) dialog.showModal();
}

/**
 * Открывает ленивую форму; отказ загрузки или открытия становится видимым повтором в footer.
 * @returns {Promise<void>} Отказ импорта перехватывается здесь, без второй формы доступа.
 */
async function openTokenManager() {
  try {
    await (await tokenManager()).open();
  } catch {
    tokenLoadFailure();
  }
}

preferences.addEventListener('tokens-open', () => {
  void openTokenManager();
});
panel.addEventListener('tokens-request', () => {
  void openTokenManager();
});
panel.addEventListener('github-reconnect', (event) => {
  const repository = /** @type {CustomEvent<{repository?:string}>} */ (event).detail?.repository;
  void (async () => {
    const state = await githubAccess.status();
    if (!state.activeId) {
      await openTokenManager();
      return;
    }
    if (repository) {
      if (await catalog.retryPrivate(repository)) {
        panel.retryCurrent();
        return;
      }
      panel.showAccessFailure(githubAccess.failure(repository) || ui.appearance.privateDataFailed);
      return;
    }
    panel.retryCurrent();
  })().catch(() => {
    void openTokenManager();
  });
});
panel.configure({
  workspace: /** @type {HTMLElement} */ (terminal.querySelector('.terminal-body')),
  footer,
  footerHome: terminal,
  eventRoot: terminal,
  withFooterMove: (operation, options) => appearance.withFooterMove(operation, options),
  prepareTarget: (target, options) => catalog.prepareTarget(target, options),
  targetIsCurrent: prepared => catalog.targetIsCurrent(prepared),
  acceptTarget: (prepared, shownTarget, options) => catalog.acceptTarget(prepared, shownTarget, options),
  footerTarget: () => catalog.footerTarget,
  getLinkMode: () => preferences.linkMode,
  cycleLinkMode: () => preferences.cycleLinkMode(),
  getOrganizationRootControl: () => preferences.organizationRootControl,
  getSourceHighlightDuration: () => preferences.sourceHighlightDuration,
  targetUsesBranch: target => catalog.targetUsesBranch(target),
  followLink: (value, current) => catalog.followLink(value, current),
  shouldHandleLink: (value, current) => catalog.canRouteLink(value, current),
  documentHref: (value, current) =>
    catalog.linkHref(value, current, preferences.linkMode, preferences.organizationRoot),
  linkHref: target => catalog.targetHref(target, preferences.linkMode, preferences.organizationRoot),
});
catalog.setPrivateAccess(githubAccess);
catalog.configure({
  panel,
  footer,
  getLinkMode: () => preferences.linkMode,
  getOrganizationRoot: () => preferences.organizationRoot,
  getHistoryTreeMode: () => preferences.historyTreeMode,
  getSearchTreeMode: () => preferences.searchTreeMode,
});
preferences.addEventListener('history-tree-mode-change', () => catalog.refreshHistoryTreeMode());
preferences.addEventListener('search-tree-mode-change', () => catalog.refreshSearchTreeMode());
preferences.addEventListener('source-highlight-duration-change', () => panel.refreshSourceHighlightDuration());
preferences.addEventListener('bookmarks-open', () => panel.showBookmarks());
// Последняя сфокусированная область выбирает получателя общей кнопки, не объединяя их состояние.
let searchOwner = 'catalog';
terminal.addEventListener('focusin', (event) => {
  const path = event.composedPath();
  if (path.includes(catalog)) searchOwner = 'catalog';
  else if (path.includes(panel)) searchOwner = 'file';
});
preferences.addEventListener('search-open', () => {
  if (searchOwner === 'catalog') catalog.showFind();
  else panel.showFind();
});
preferences.addEventListener('search-history-open', () => {
  if (searchOwner === 'catalog') catalog.showSearchHistory();
  else panel.showSearchHistory();
});
preferences.addEventListener('organization-root-open', () => panel.showOrganizationRoot());
for (const type of ['organization-root-change', 'link-mode-change']) {
  preferences.addEventListener(type, () => {
    catalog.refreshLinkMode();
    panel.refreshLinkMode();
  });
}

/**
 * Единственный координатор переноса живых узлов; данные остаются у каталога, панели и настроек.
 */
const pictureInPicture = new PictureInPictureController({
  historyBackEnabled: false,
  opener: displayWindow(terminal),
  terminal,
  workspace: /** @type {HTMLElement} */ (terminal.querySelector('.terminal-body')),
  footer,
  catalog,
  panel,
  preferences,
  appearance,
});
preferences.setThemeDocuments([document]);
panel.setPictureInPicture(pictureInPicture);
appearance.setPictureInPicture(pictureInPicture);
/**
 * Одна незавершённая попытка автоматического запуска/запроса ключа; параллельные обращения ждут её.
 * @type {Promise<void>|null}
 */
let autoUnlockPending = null;
/**
 * При включённой настройке запускает Octocat и предлагает сохранённый passkey через единственную форму.
 * @returns {Promise<void>} Параллельный вызов получает нынешнее ожидание; выключенная настройка пропускает запрос, отказ допускает повтор.
 */
function autoUnlockIfSelected() {
  if (autoUnlockPending) return autoUnlockPending;
  if (!octocatAutoRestoreEnabled()) return Promise.resolve();
  autoUnlockPending = githubAccess.restartWorker()
    .then(() => tokenManager()).then((manager) => manager.autoUnlockSavedPasskey()).catch(() => {})
    .finally(() => {
      autoUnlockPending = null;
    });
  return autoUnlockPending;
}

/**
 * Общее ожидание восстановления после потери Octocat; null разрешает следующую попытку.
 * @type {Promise<void>|null}
 */
let recoveryPending = null;
/**
 * Объединяет автоматическое восстановление потерянного воркера в одно нынешнее ожидание.
 * @returns {Promise<void>} При выключенном восстановлении запросов нет; после завершения ожидание снимается.
 */
function recoverOctocat() {
  if (!octocatAutoRestoreEnabled()) return Promise.resolve();
  if (recoveryPending) return recoveryPending;
  recoveryPending = autoUnlockIfSelected().finally(() => {
    recoveryPending = null;
  });
  return recoveryPending;
}

githubAccess.addEventListener('lost', () => {
  void recoverOctocat();
});
/**
 * Исходный признак прежнего сеанса до restoreSession; нужен только для выбора восстановления при запуске.
 */
const hadWorkerSession = githubAccess.hadWorkerSession;
void githubAccess.restoreSession().then((restored) => {
  if (restored) return;
  if (hadWorkerSession) void recoverOctocat();
  else void autoUnlockIfSelected();
}).catch(() => {
  if (hadWorkerSession) void recoverOctocat();
  else void autoUnlockIfSelected();
});
/**
 * Готовность настроек и обязательной кнопки обновления для bootstrap; сетевую проверку версии не ждёт.
 */
export const siteReady = preferences.updateComplete.then(() => {
  const updateButton = preferences.shadowRoot?.querySelector('#site-update-header');
  if (!(updateButton instanceof HTMLButtonElement)) throw new Error('Не найдена кнопка обновления');
  void startSiteUpdate(updateButton, footer);
});
