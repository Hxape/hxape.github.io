/**
 * Владелец выбора, загрузок, кэшей и DOM каталога; передаёт просмотры DocumentPanel.
 */
import { withinRequestTime } from '../../common/network/request-lifetime.mjs';
import { formatText, ui } from '../../common/ui/text.mjs';
import {
  displayWindow,
  element,
  isCommandKey,
  isDetails,
  isElement,
  isHTMLElement,
} from '../../common/ui/view-utils.mjs';
import { showContext, showLock } from '../../component/footer-address/index.mjs';
import { installedVersion } from '../../component/installed-version/index.mjs';
import { publishedVersion } from '../../component/published-version/index.mjs';
import { cloneBranch } from '../../component/tree-branch/index.mjs';
import { showCaptionLinkIcon } from '../../component/tree-caption/index.mjs';
import { TreeLoader } from '../../component/tree-loader/index.mjs';
import { treeRetry } from '../../component/tree-retry/index.mjs';
import { flashUnavailable } from '../../component/tree-row/index.mjs';
import { CatalogSearch } from './search.mjs';
import {
  refreshTree,
  setLoading,
  setStatus,
  statusBody,
  updatePrefixes,
  visibleTreeContent,
} from '../../component/tree/index.mjs';
import { relativeMaterialPath } from '../document/href-resolver.mjs';
import {
  applyIcons,
  defaultIcons,
  groupedIcon as createGroupedIcon,
  unavailableLock,
  versionSourceIcon,
} from './icons.mjs';
import {
  githubHref,
  materialPath,
  materialRef,
  readMaterialOrigin,
  readMaterialTarget,
  readOrganizationRoot,
} from './material-target.mjs';
import {
  directoryDocumentTypes,
  documentTypes,
  encodedPath,
  filterDocuments,
  githubLocation,
  navigationKeys,
  noDocuments,
  readPolicy,
  readSnapshot,
  repositoryPath,
} from './model.mjs';
import { linkedDocumentPath, loadPublicDocument, publicDefaultRef, publicDocumentPath } from './public-document.mjs';
import { loadPublicSourceFile } from './public-source.mjs';
import { captionTemplateSelector, readCaptions, renderNodes } from './tree-view.mjs';

/**
 * Четыре стандартных вида документов; адресный Markdown ими не ограничивается.
 * @typedef {'README' | 'CONTRIBUTING' | 'AGENTS' | 'LICENSE'} DocumentType
 */

/**
 * Отдельные разрешения публикации текстов стандартных документов.
 * @typedef {Record<DocumentType, boolean>} DocumentPermissions
 */

/**
 * Нынешние флаги видимости SVG-групп, отдельные от доступа и состава дерева.
 * @typedef {import('./icons.mjs').IconSettings} IconSettings
 */

/**
 * Метаданные и разрешённый текст документа; договор определяется блоком просмотра.
 * @typedef {import('../document/index.mjs').RepositoryDocument} RepositoryDocument
 */

/**
 * Готовый результат документов для единственного просмотра панели.
 * @typedef {import('../document/index.mjs').DocumentsResult} DocumentsResult
 */

/**
 * Готовый публичный документ с именем и успешно прочитанным текстом.
 * @typedef {RepositoryDocument & PublicDocumentFields} PublicDocument
 */

/**
 * Проверенные метаданные публичного репозитория.
 * @typedef {Object} GitHubRepository
 * @property {string} default_branch Имя ветки по умолчанию, проверенное в публичном ответе GitHub.
 */

/**
 * Проверяемые метаданные одного файла из GitHub Contents.
 * @typedef {Object} GitHubFile
 * @property {'file'} type Вид узла каталога, определяющий путь и возможность просмотра.
 * @property {string} name Имя узла, файла или библиотеки для отображения и сопоставления.
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 * @property {string | null} download_url Проверяемый адрес raw-файла, полученный из GitHub Contents.
 * @property {string} [html_url] Необязательный web URL того же файла для нижнего адреса.
 */

/**
 * Общие поля ограниченного узла дерева; не полный исходный файл.
 * @typedef {Object} NodeFields
 * @property {string} name Имя узла, файла или библиотеки для отображения и сопоставления.
 * @property {CatalogNode[]} children Дочерние узлы подготовленного дерева, ограниченные действующим уровнем.
 * @property {string} [kind] Вид объявления Haxe, например class, method или field.
 * @property {string} [doc] HXDoc без обрамления комментария.
 * @property {number} [line] Номер строки объявления, начиная с 1.
 */

/**
 * Каталог дерева со своими метаданными документов.
 * @typedef {NodeFields & DirectoryNodeFields} DirectoryNode
 */

/**
 * Файл подготовленного дерева; путь относительно его корня.
 * @typedef {NodeFields & FileNodeFields} FileNode
 */

/**
 * Объявление Haxe внутри файла и его вложенные объявления.
 * @typedef {NodeFields & SymbolNodeFields} SymbolNode
 */

/**
 * Один допустимый вид узла ограниченного каталога.
 * @typedef {DirectoryNode | FileNode | SymbolNode} CatalogNode
 */

/**
 * Карты разрешённых приписок, которыми Catalog обогащает строки.
 * @typedef {Object} CatalogCaptions
 * @property {Map<string, HTMLElement>} directoryNames Приписки, применяемые ко всем каталогам с указанным именем.
 * @property {Map<string, HTMLElement>} directoryPaths Приписки конкретных каталогов относительно корня дерева.
 * @property {Map<string, HTMLElement>} filePaths Приписки конкретных файлов относительно корня дерева.
 * @property {Map<string, HTMLElement>} symbolPaths Приписки объявлений, определённые полным путём внутри файла.
 */

/**
 * Проверенные правила публикации и ветка зарегистрированного репозитория.
 * @typedef {Object} RepositoryPolicy
 * @property {boolean} private Показывает замок у нижней ссылки, независимо от доступа к данным.
 * @property {string} branch Ветка репозитория организации для закрытого снимка, документов и ссылок.
 * @property {number} level Разрешённый уровень дерева 0–4.
 * @property {DocumentPermissions} documents Разрешения на содержимое четырёх документов.
 */

/**
 * Ограниченный снимок, принимаемый каталогом после проверки источника и политики.
 * @typedef {Object} RepositorySnapshot
 * @property {string} url URL репозитория GitHub.
 * @property {string} ref Ветка или коммит подготовленного дерева.
 * @property {string} root Путь src внутри репозитория.
 * @property {number} level Разрешённая глубина показываемого дерева; не доказывает право на raw-файл.
 * @property {CatalogNode[]} children Дочерние узлы подготовленного дерева, ограниченные действующим уровнем.
 * @property {Record<string, RepositoryDocument>} documents Метаданные стандартных документов и тексты, разрешённые политикой опубликованного снимка.
 * @property {boolean} [privateSource] Данные прочитаны из закрытого снимка GitHub.
 */

/**
 * Проверенная установленная библиотека и независимые сведения о её происхождении.
 * @typedef {Object} LibrarySource
 * @property {string} name Имя узла, файла или библиотеки для отображения и сопоставления.
 * @property {string} version Установленная версия; публичные документы загружаются отдельно.
 * @property {string} url Канонический GitHub URL источника, отдельно от местного VS Code пути.
 * @property {string} ref Ревизия локально экспортированной установки; не default_branch публичного raw-чтения.
 * @property {string} root Корень показываемых исходников относительно Git-корня репозитория.
 * @property {string} documentsPath Каталог публичных документов относительно Git-корня библиотеки.
 * @property {string} outline URL локального JSON дерева и HXDoc.
 * @property {string} packagePath Каталог haxelib.json внутри репозитория GitHub.
 * @property {string} localPath Местный Git-корень либо установка относительно каталога организации.
 * @property {HaxelibOrUnknownInstallation|GithubInstallation} installation Проверенное происхождение установки, используемое для выбора сопоставимого источника публикаций.
 * @property {boolean} [dev] Установка выбрана через .dev; местный логический путь сохраняет устойчивый указатель.
 */

/**
 * Внешние настройки поверх defaults, ещё не принятые как политика.
 * @typedef {Object} PolicySettings
 * @property {boolean} [private] Правило показа замка либо происхождение чтения; не самостоятельное право доступа.
 * @property {string} [branch] Ветка, которой принадлежат снимок и его сохранённый ключ.
 * @property {number} [level] Разрешённая глубина показываемого дерева; не доказывает право на raw-файл.
 * @property {Partial<DocumentPermissions>} [documents] Переопределения разрешений публикации четырёх стандартных документов.
 */

/**
 * Живые связи единственного каталога с панелью, нижним адресом и владельцем настроек.
 * @typedef {Object} CatalogOptions
 * @property {import('../document/index.mjs').DocumentPanel} panel Единственный DocumentPanel; каталог передаёт ему готовые запросы и принимает события просмотра.
 * @property {HTMLElement} footer Живой элемент нижней панели, в том числе при переносе в PiP.
 * @property {()=>import('./material-target.mjs').LinkMode} [getLinkMode] Читает общий режим ссылок у владельца настроек без копии состояния.
 * @property {()=>string} [getOrganizationRoot] Читает местный корень организации у владельца настроек.
 * @property {()=>HistoryTreeMode} [getHistoryTreeMode] Читает сохранённый режим раскрытия дерева при переходах истории.
 * @property {()=>HistoryTreeMode} [getSearchTreeMode] Читает отдельный режим раскрытия дерева при поиске.
 */

/**
 * Сохранённый выбор раскрытия истории; самим значением владеет Preferences.
 * @typedef {import('../preferences/index.mjs').HistoryTreeMode} HistoryTreeMode
 */

/**
 * Происхождение успешного перехода панели, не сохраняемое в журнале.
 * @typedef {Object} AcceptTargetOptions
 * @property {boolean} [history] Переход назад/вперёд или выбор записи истории; обычная ссылка и закладка дают false.
 * @property {boolean} [refresh] Перечитан тот же материал; сохраняется нынешнее владение раскрытиями.
 */

/**
 * Раскрытие одной ветви перед заменой строк снимка; существует только на срок перерисовки.
 * @typedef {Object} BranchExpansion
 * @property {boolean} open Прежняя открытость native details, включая ручной выбор пользователя.
 * @property {boolean} temporary Ветвь открыла история и пользователь ещё не принял её управление.
 * @property {boolean} historyPath Ветвь входит в путь нынешнего просмотра из истории.
 * @property {boolean} searchTemporary Ветвь временно раскрыта поиском.
 * @property {boolean} searchPath Ветвь входит в путь нынешнего совпадения поиска.
 */

/**
 * Успешно прочитанные документы библиотеки для подготовки одного просмотра.
 * @typedef {Object} PublicDocuments
 * @property {string} url Канонический GitHub URL источника, отдельно от местного VS Code пути.
 * @property {string} ref Явный ref, на котором успешно прочитан этот набор публичных документов.
 * @property {Record<string, PublicDocument>} documents Успешно прочитанные материалы библиотеки по путям: имя, формат и готовый текст.
 * @property {string[]} order Порядок доступных вкладок документов; не порядок истории.
 */

/**
 * Состояние данных, ожидания и DOM одного репозитория в экземпляре Catalog.
 * @typedef {Object} RepositoryState
 * @property {RepositorySnapshot | null} data Нынешний ограниченный RepositorySnapshot; null до успешного чтения или после очистки доступа.
 * @property {Promise<RepositorySnapshot> | null} promise Один общий текущий запрос дерева и документов.
 * @property {Promise<boolean> | null} privatePromise Обновление статического дерева закрытым снимком.
 * @property {boolean} rendered Данные текущего снимка уже связаны со строками DOM.
 * @property {boolean} presenting Защита от повторного раскрытия во время ожидания.
 * @property {HTMLParagraphElement} notice Узел ожидания или отказа данного репозитория.
 */

/**
 * Незавершённое удержание строки; движение или перенос отменяют его.
 * @typedef {Object} TreePress
 * @property {HTMLElement} row Живая строка либо вложенная ссылка, на которой показывается готовность удержания.
 * @property {number} pointerId Указатель, начавший удержание или прокрутку.
 * @property {number} x Начальная горизонтальная координата жеста.
 * @property {number} y Начальная вертикальная координата жеста.
 * @property {number} left Горизонтальная прокрутка дерева при нажатии; её изменение отменяет удержание.
 * @property {number} top Вертикальная прокрутка дерева при нажатии; её изменение отменяет удержание.
 * @property {string|null} raw Исходный href вложенной ссылки либо null для информации строки.
 * @property {boolean} armed Порог достигнут; действие ещё не выполнено и ждёт отпускания.
 * @property {number} [timer] Таймер готовности; снимается при отпускании или отмене.
 */

/**
 * Нажатое E каталога на срок подготовки обычной информации и удержания PiP.
 * @typedef {Object} TreeInformationHold
 * @property {HTMLElement} row Строка исходной команды; новый фокус или новый жест отменяет эту идентичность.
 */

/**
 * Одна последовательность касаний с закрепляемой осью прокрутки.
 * @typedef {Object} TouchScroll
 * @property {number} id Идентификатор касания, которое начало текущий жест прокрутки.
 * @property {number} x Начальная горизонтальная координата жеста.
 * @property {number} y Начальная вертикальная координата жеста.
 * @property {number} left Горизонтальная прокрутка перед началом жеста.
 * @property {number} top Вертикальная прокрутка перед началом жеста.
 * @property {'x' | 'y' | null} axis Выбранная первым движением ось; не меняется до завершения жеста.
 */

/**
 * Сериализуемый адрес материала для истории, закладок и нижней панели.
 * @typedef {import('./material-target.mjs').Target} Target
 */

/**
 * Идентичность источника для повторного разрешения адреса; не подтверждение доступа.
 * @typedef {import('./material-target.mjs').Origin} Origin
 */

/**
 * Временный материал и ревизии перед принятием; не сохраняется в адресном журнале.
 * @typedef {Object} PreparedMaterial
 * @property {Target} target Смысловой адрес без текста, DOM, загрузчика и сохранённого доказательства доступа.
 * @property {import('../document/index.mjs').DocumentRequest} request Временный запрос панели; не принадлежит постоянному журналу.
 * @property {HTMLDetailsElement} repository Живой details конкретного репозитория; по нему проверяются нынешняя регистрация и состояние.
 * @property {RepositorySnapshot|null} snapshot Снимок, по которому готовилось чтение; null у безопасного просмотра отказа без текста.
 * @property {number} accessRevision Ревизия каталога перед ожиданием; смена PAT отменяет прежний результат.
 * @property {boolean} privateSource Данные подготовлены из закрытого снимка GithubAccess.
 * @property {string|null} accessProof Непостоянная ревизия снимка для проверки перед принятием.
 * @property {string} ref Фактический ref подготовленного материала; у denied-view это только настроенная branch.
 * @property {boolean} allowCached Временная проверка допускает уже открытый HXDoc нынешней местной копии; raw/Markdown всё равно требуют подтверждения.
 * @property {boolean} [denied] Готовый просмотр управления доступом без текста; не утверждение сетевого запрета или права чтения.
 */

/**
 * Отмена и выбранное представление определяют нужное ленивое чтение.
 * @typedef {Object} PrepareOptions
 * @property {AbortSignal} signal Сигнал владельца операции; не принадлежит кэшу готового текста.
 * @property {boolean} [refresh] Обойти готовый кэш и явно перечитать материал.
 * @property {'documentation'|'source'} [sourceMode] Представление файла, от которого зависит необходимость ленивого raw-чтения.
 * @property {boolean} [defaultBranch] Обычная команда .haxelib читает нынешнюю default_branch внутри отменяемой подготовки; явный ref не заменяется без этого признака.
 * @property {PreparedMaterial} [currentSource] Временный штамп единственного готового просмотра того же окна; совпавший текущий доступ позволяет повторно использовать его текст без нового raw-чтения.
 */

/**
 * Результат разбора понятной ссылки до проверки наличия материала в снимке.
 * @typedef {Object} LinkLocation
 * @property {Origin} origin Вид источника, ключ каталога и канонический GitHub URL.
 * @property {string|null} ref Ветка, тег или коммит, передаваемый отдельно от пути файла.
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 * @property {string|null} anchor Исходный Markdown-якорь; порождённый DOM-id не сохраняется.
 * @property {boolean} directory Ссылка обозначает каталог, а не файл.
 */

/**
 * Одно временное намерение внутренней ссылки; выбор репозитория не является посещением материала.
 * @typedef {Object} TreeNavigationIntent
 * @property {number} epoch Номер данного намерения; отмена не позволяет возврату фокуса возродить его.
 * @property {number} accessRevision Доступ каталога до ожидания; смена PAT отменяет продолжение.
 * @property {HTMLDetailsElement} repository Известный репозиторий, выбранный до ожидания.
 * @property {HTMLElement} row Строка, на которой фокус должен оставаться до собственного прыжка.
 * @property {Target|null} target Известный адрес либо результат разрешения после загрузки.
 * @property {string|null} raw Исходный href, если цель ещё требуется разрешить по дереву.
 * @property {Target|null} context Адрес исходного документа для относительного href.
 * @property {AbortController} controller Отмена только этого намерения и подготовки панели.
 * @property {object} loadingToken Идентичность видимого ожидания репозитория, сохраняемого до конца подготовки.
 * @property {number} panelRevision Счётчик панели до передачи ей адреса; новое действие отменяет предшествующую фазу.
 * @property {boolean} handedOff Панель уже получила адрес и защищает асинхронное принятие собственной ревизией.
 * @property {boolean} committing Синхронный собственный прыжок/показ вправе переместить фокус без отмены себя.
 */

/**
 * Обычная команда строки уточняет прежнее внутреннее намерение; ссылки оставляют эти поля пустыми.
 * @typedef {Object} TreeNavigationOptions
 * @property {HTMLElement} [row] Исходная строка обычной команды; выбирается до первого ожидания вместо корневой summary.
 * @property {'documentation'|'source'} [initialMode] Прежняя команда E/Enter/D выбирает представление; ссылки вычисляют его по адресу.
 * @property {boolean} [defaultBranch] Обычная команда библиотеки определяет ветку внутри срока подготовки панели.
 * @property {boolean} [applySourcePin] Удержание или Enter строки файла применяет закреплённый вид следующего открытия; E и явная строка его не меняют.
 */

/**
 * Отделяет объект внешнего JSON от null и массива.
 * @param {unknown} value Входное значение, форма которого проверяется этой функцией.
 * @returns {value is Record<string, unknown>} Значение допускает проверку именованных полей.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Находит строку каталога по цели события, не разбирая её предметные данные.
 * @param {Event} event Событие внутри каталога; его цель используется для поиска .tree-row.
 * @returns {HTMLElement | null} Живая .tree-row либо null.
 */
function eventRow(event) {
  return isElement(event.target) ? /** @type {HTMLElement | null} */ (event.target.closest('.tree-row')) : null;
}

/**
 * Разрешает относительный адрес JSON только внутри origin сайта.
 * @param {string} path Адрес опубликованного JSON относительно document.baseURI.
 * @returns {string} Абсолютный URL; чужой origin вызывает отказ.
 */
function localResource(path) {
  const url = new URL(path, document.baseURI);
  if (url.origin !== location.origin) throw new Error('Expected a local JSON resource');
  return url.href;
}

/**
 * Читает публичный GitHub JSON без PAT и ограничивает срок.
 * @param {string} url Адрес источника, который проверяется до сетевого обращения.
 * @param {AbortSignal} [externalSignal] Отмена владельца запроса, объединяемая с его сроком ожидания.
 * @returns {Promise<unknown>} Внешний JSON для предметной проверки; HTTP-отказ отклоняет чтение.
 */
async function githubJson(url, externalSignal) {
  return withinRequestTime(async (signal) => {
    const response = await fetch(url, {
      credentials: 'omit',
      headers: { Accept: 'application/vnd.github+json' },
      signal,
    });
    if (!response.ok) throw new Error(`GitHub request failed: ${response.status}`);
    return response.json();
  }, { signal: externalSignal });
}

/**
 * Распознаёт имя правового документа публичной библиотеки.
 * @param {string} name Имя файла из метаданных каталога GitHub, без родительского пути.
 * @returns {boolean} Имя начинается с разрешённого правового обозначения.
 */
function legalDocument(name) {
  return /^(LICENSE|LICENCE|COPYING|COPYRIGHT|NOTICE|UNLICENSE)/i.test(name);
}

/**
 * Выбирает публичный документ библиотеки с учётом просмотра корня или каталога.
 * @param {string} name Имя файла, по которому проверяется перечень допустимых документов.
 * @param {boolean} directory Адрес обозначает каталог, а не файл.
 * @returns {boolean} Файл соответствует допустимому виду документа; .hx сюда не входит.
 */
function publicDocument(name, directory) {
  if (/\.hx$/i.test(name)) return false;
  if (directory) return /^(README|AGENTS)(?:\.(md|markdown|txt))?$/i.test(name);
  return /\.(md|markdown)$/i.test(name) || legalDocument(name) || /^(README|CONTRIBUTING|AGENTS|CHANGE)/i.test(name);
}

/**
 * Задаёт порядок вкладок README, изменений, CONTRIBUTING, AGENTS и правовых текстов.
 * @param {string} name Имя файла публичного документа для определения порядка вкладки.
 * @returns {number} Числовой приоритет; равные значения сравниваются по пути.
 */
function documentPriority(name) {
  if (/^README/i.test(name)) return 0;
  if (/^CHANGE/i.test(name)) return 1;
  if (/^CONTRIBUTING/i.test(name)) return 2;
  if (/^AGENTS/i.test(name)) return 3;
  return legalDocument(name) ? 4 : 5;
}

/**
 * Проверяет существование физической строки без массива всех строк уже готового исходника.
 * @param {string} content Успешно прочитанный текст; CRLF учитывается одним LF, как в SourceView.
 * @param {number|null} line Положительная строка адреса либо null для обычного открытия файла.
 * @returns {boolean} Строка присутствует; пустой файл имеет одну физическую строку.
 */
function sourceHasLine(content, line) {
  if (line === null || line === 1) return true;
  let count = 1;
  for (let index = 0; index < content.length; index++) {
    if (content.charCodeAt(index) === 10 && ++count >= line) return true;
  }
  return false;
}

/**
 * @event ProjectCatalog#icons-ready
 * @type {CustomEvent<IconSettings>} Доступные настройки иконок после загрузки site.json.
 */

/**
 * Каталог владеет деревом, разрешениями, загрузками и кэшами своего экземпляра.
 */
export class ProjectCatalog extends HTMLElement {
  /**
   * Поиск только своего дерева, с отдельными запросом и историей.
   * @type {CatalogSearch|null}
   */
  #search = null;
  /**
   * Соответствие показанных строк узлам, допускающим HXDoc; живёт с экземпляром каталога.
   * @type {WeakMap<HTMLElement, CatalogNode>}
   */
  #docsNodes = new WeakMap();
  /**
   * Соответствие показанных DOM-строк узлам их снимка; не постоянный журнал.
   * @type {WeakMap<HTMLElement, CatalogNode>}
   */
  #rowNodes = new WeakMap();
  /**
   * Снимок, которым создана строка; защищает старый видимый адрес до принятия нового дерева.
   * @type {WeakMap<HTMLElement,RepositorySnapshot>}
   */
  #rowSnapshots = new WeakMap();
  /**
   * Готовые адреса и пути показанных строк; строка не разбирает их самостоятельно.
   * @type {WeakMap<HTMLElement, {url:string,path:string,filePath:string,symbolPath?:string}>}
   */
  #nodeLinks = new WeakMap();
  /**
   * Проверенные установки, связанные с узлами библиотек до конца экземпляра каталога.
   * @type {WeakMap<HTMLDetailsElement, LibrarySource>}
   */
  #librarySources = new WeakMap();
  /**
   * Текущая проверка публикации каждой библиотеки; после завершения запись снимается.
   * @type {WeakMap<HTMLDetailsElement,Promise<void>>}
   */
  #releasePending = new WeakMap();
  /**
   * Библиотеки, для которых проверка публикации за эту страницу уже закончилась.
   */
  #releaseKnown = new WeakSet();
  /**
   * Результат публичной проверки repo за страницу; unknown не утверждает запрет GitHub.
   * @type {Map<string, 'checking'|'public'|'unknown'>}
   */
  #repositoryVisibility = new Map();
  /**
   * Нынешние проверенные уровни, ветки и отдельные разрешения документов.
   * @type {Map<HTMLDetailsElement, RepositoryPolicy>}
   */
  #policies = new Map();
  /**
   * Данные, текущие запросы и состояние вывода каждого репозитория; PiP их не копирует.
   * @type {WeakMap<HTMLDetailsElement, RepositoryState>}
   */
  #repositoryCache = new WeakMap();
  /**
   * Независимые ожидания дерева, свежести и версии; token отличает их позднее завершение.
   * @type {WeakMap<HTMLDetailsElement, Map<string, {token: object, label: string}>>}
   */
  #repositoryLoading = new WeakMap();
  /**
   * Индикаторы ожидания сняты на время перепривязки окна; состояние запросов остаётся.
   */
  #loadingDetached = false;
  /**
   * Нынешние флаги видимости групп значков; настройки меняют существующие SVG.
   * @type {IconSettings}
   */
  #iconSettings = defaultIcons();
  /**
   * Живые panel/footer и чтение настроек, заданные configure; не копии чужого состояния.
   * @type {CatalogOptions | null}
   */
  #options = null;
  /**
   * Отмена событий нынешнего отображения; снимается при disconnect и prepareMove.
   * @type {AbortController | null}
   */
  #events = null;
  /**
   * Наблюдатель ширины нынешнего окна; пересоздаётся после переноса.
   * @type {ResizeObserver | null}
   */
  #observer = null;
  /**
   * Последняя обработанная ширина; подавляет повторный пересчёт одинаковой геометрии.
   * @type {number | null}
   */
  #observedWidth = null;
  /**
   * Каркас и статические репозитории зарегистрированы один раз для экземпляра.
   */
  #initialized = false;
  /**
   * Начальный фокус уже установлен; повторное подключение его не навязывает.
   */
  #didFocus = false;
  /**
   * Единственный ожидающий RAF пересчёта соединителей нынешнего окна.
   */
  #prefixFrame = 0;
  /**
   * RAF восстановления прокрутки после изменения значков; снимается с привязкой окна.
   */
  #iconFrame = 0;
  /**
   * Одна текущая загрузка настроек site.json; отказ допускает явный повтор.
   * @type {Promise<void> | null}
   */
  #sitePromise = null;
  /**
   * Одна текущая загрузка индекса .haxelib; после завершения освобождается.
   * @type {Promise<void> | null}
   */
  #libraryPromise = null;
  /**
   * Ещё не разобранные настройки haxelib из site.json; проверяются при загрузке индекса.
   * @type {unknown}
   */
  #librarySettings = null;
  /**
   * Готовность списка библиотек; не статус доступа к их публичным документам.
   * @type {'idle' | 'loading' | 'ready' | 'error'}
   */
  #libraryState = 'idle';
  /**
   * Проверенный web-корень организации для адресов зарегистрированных проектов.
   */
  #organization = 'https://github.com/Hxape';
  /**
   * Готовность site.json; до ready каталог не разрешает запросы деревьев.
   * @type {'loading' | 'ready' | 'error'}
   */
  #siteState = 'loading';
  /**
   * Идентичность строки либо выбранного документа, которому принадлежит нижний адрес.
   * @type {object | null} Строка дерева либо непрозрачный контекст выбранного документа.
   */
  #footerContext = null;
  /**
   * Репозиторий нынешнего нижнего адреса для проверки замка и публичности.
   * @type {HTMLDetailsElement|null}
   */
  #footerRepository = null;
  /**
   * Текущий адрес получил успешное чтение файла; новый адрес сбрасывает это основание замка.
   */
  #footerFileOpened = false;
  /**
   * Единственная выбранная строка дерева; выбор сохраняется при PiP-переносе.
   * @type {HTMLElement | null}
   */
  #selected = null;
  /**
   * Статические репозитории Hxape; библиотеки .haxelib регистрируются отдельно в policies.
   * @type {HTMLDetailsElement[]}
   */
  #repositories = [];
  /**
   * Живой корень статического дерева, найденный при инициализации.
   * @type {HTMLUListElement | null}
   */
  #treeList = null;
  /**
   * Узел ожидания или отказа настроек сайта.
   * @type {HTMLParagraphElement | null}
   */
  #siteStatus = null;
  /**
   * Живой контейнер зарегистрированных библиотек .haxelib.
   * @type {HTMLUListElement | null}
   */
  #libraryList = null;
  /**
   * Узел ожидания или отказа индекса библиотек.
   * @type {HTMLParagraphElement | null}
   */
  #libraryStatus = null;
  /**
   * Живая ссылка нижней панели; канонический target хранится отдельно от её href.
   * @type {HTMLAnchorElement | null}
   */
  #githubLink = null;
  /**
   * Текущее удержание строки с координатами и таймером; движение или смена окна его отменяет.
   * @type {TreePress | null}
   */
  #press = null;
  /**
   * Текущее касание с начальной прокруткой и выбранной осью.
   * @type {TouchScroll | null}
   */
  #touchScroll = null;
  /**
   * Вертикальная ось инерционного жеста, удерживаемая до scrollend или запасного таймера.
   * @type {'y' | null}
   */
  #lockedScrollAxis = null;
  /**
   * Нынешний срок удержания строки в мс, полученный от настроек.
   */
  #holdDuration = 500;
  /**
   * Запасной таймер конца инерционной прокрутки без scrollend.
   */
  #scrollEndTimer = 0;
  /**
   * Удержание/горизонтальный жест уже приняли действие; ближайший короткий щелчок подавляется.
   */
  #suppressReleaseClick = false;
  /**
   * Фактическое окно отображения для событий, RAF и наблюдателей; меняется при PiP.
   * @type {import('../../common/ui/view-utils.mjs').DisplayWindow | null}
   */
  #display = null;
  /**
   * Узлы синхронно переносятся; новые действия до commit/rollback не принимаются.
   */
  #moving = false;
  /**
   * Поколение привязки окна; устаревшие callbacks наблюдателей и RAF отбрасываются.
   */
  #environment = 0;
  /**
   * Единственный владелец PAT-сеанса и закрытых чтений; сам каталог PAT не получает.
   * @type {import('../../auth/github/access.mjs').GithubAccess|null}
   */
  #privateAccess = null;
  /**
   * Поколение доступа каталога; смена PAT делает прежние запросы и строки недействительными.
   */
  #accessRevision = 0;
  /**
   * Репозитории с подтверждённым отзывом; снимаются только новым разрешённым повтором.
   */
  #blockedPrivate = new Set();
  /**
   * Нынешнее E до отпускания; идентичность не позволяет позднему открытию начать удержание новой команды.
   * @type {TreeInformationHold|null}
   */
  #informationKeyHold = null;
  /**
   * Канонический адрес нижней панели без зависимости от режима VS Code/GitHub.
   * @type {Target|null} Канонический адрес не зависит от режима внешней ссылки.
   */
  #footerTarget = null;
  /**
   * Число незавершённых подготовок каждого repo; новый снимок пока не заменяет видимые строки.
   * @type {Map<HTMLDetailsElement,number>}
   */
  #preparing = new Map();
  /**
   * Проверенные default_branch публичных библиотек за эту страницу.
   * @type {Map<string,string>} Подтверждённые нынешние default_branch библиотек.
   */
  #defaultRefs = new Map();
  /**
   * Единственное незавершённое намерение ссылки; не копия текущего просмотра или истории.
   * @type {TreeNavigationIntent|null}
   */
  #treeNavigation = null;
  /** Монотонное поколение ссылки; не откатывается при повторном фокусе той же строки. */
  #treeNavigationEpoch = 0;
  /**
   * Путь принятого перехода истории; null после ухода. Хранит только ветви раскрытия, без второго target/view.
   * @type {Set<HTMLDetailsElement>|null}
   */
  #historyPath = null;
  /**
   * Только ветви, открытые временной историей; ручное управление снимает принадлежность до native toggle.
   * @type {Set<HTMLDetailsElement>}
   */
  #temporaryHistoryBranches = new Set();
  /** @type {Set<HTMLDetailsElement>|null} Предки текущего совпадения поиска. */
  #searchPath = null;
  /** @type {Set<HTMLDetailsElement>} Только ветви, временно раскрытые поиском. */
  #temporarySearchBranches = new Set();
  /**
   * Ожидаемая открытость после собственного изменения; native toggle приходит отдельной задачей.
   * @type {WeakMap<HTMLDetailsElement,boolean>}
   */
  #historyToggles = new WeakMap();

  /**
   * Собирает существующие details до корня каталога; порядок начинается с ближайшей ветви.
   * @param {HTMLElement} row Строка нынешнего дерева, которой соответствует готовый материал.
   * @returns {Set<HTMLDetailsElement>} Путь для раскрытия; не содержит чужих или отсоединённых ветвей.
   */
  #branchPath(row) {
    /** @type {Set<HTMLDetailsElement>} */
    const path = new Set();
    for (
      let parent = row.closest('details');
      parent && this.contains(parent);
      parent = parent.parentElement?.closest('details') || null
    ) path.add(parent);
    return path;
  }

  /**
   * Меняет native open и помечает лишь предстоящее собственное событие toggle.
   * @param {HTMLDetailsElement} branch Ветвь нынешнего каталога или подготовленного нового списка.
   * @param {boolean} open Нужная открытость без изменения выбранного материала.
   * @returns {void} Уже совпавшее значение не вызывает нового события.
   */
  #setHistoryBranchOpen(branch, open) {
    if (branch.open === open) return;
    this.#historyToggles.set(branch, open);
    branch.open = open;
  }

  /**
   * Принимает путь успешного просмотра, сворачивая только несовпавшие временные ветви.
   * @param {Set<HTMLDetailsElement>} path Предки фактически выбранной строки нового материала.
   * @param {boolean} history Принята запись истории, а не обычная ссылка или закладка.
   * @param {boolean} refresh Перечитан прежний материал; его ручная открытость сохраняется.
   * @returns {void} Не вызывается на отказе подготовки; общие временные предки остаются открытыми.
   */
  #acceptHistoryPath(path, history, refresh) {
    if (refresh) {
      if (this.#historyPath) this.#historyPath = path;
      return;
    }
    const mode = history ? this.#options?.getHistoryTreeMode?.() || 'temporary' : 'always';
    for (const branch of this.#temporaryHistoryBranches) {
      if (!this.contains(branch)) {
        this.#temporaryHistoryBranches.delete(branch);
        continue;
      }
      if (mode === 'none' || !path.has(branch) && !(history && mode === 'always')) {
        if (!this.#searchPath?.has(branch) || this.#options?.getSearchTreeMode?.() === 'none') {
          this.#setHistoryBranchOpen(branch, false);
        }
        this.#temporaryHistoryBranches.delete(branch);
      }
    }
    if (!history || mode !== 'temporary') this.#temporaryHistoryBranches.clear();
    this.#historyPath = history ? path : null;
    if (mode === 'none') return;
    for (const branch of path) {
      if ((!branch.open || this.#temporarySearchBranches.has(branch)) && history && mode === 'temporary') {
        this.#temporaryHistoryBranches.add(branch);
      }
      if (mode === 'always') this.#temporarySearchBranches.delete(branch);
      this.#setHistoryBranchOpen(branch, true);
    }
  }

  /**
   * Завершает временное раскрытие при закрытии или отзыве, сохраняя ручные и постоянные ветви.
   * @returns {void} Освобождает путь и ссылки истории после сворачивания принадлежавших ей ветвей.
   */
  #clearHistoryPath() {
    this.#historyPath = null;
    for (const branch of this.#temporaryHistoryBranches) {
      if (this.contains(branch) && (!this.#searchPath?.has(branch) || this.#options?.getSearchTreeMode?.() === 'none')) {
        this.#setHistoryBranchOpen(branch, false);
      }
    }
    this.#temporaryHistoryBranches.clear();
  }

  /**
   * Применяет новый сохранённый режим к пути нынешнего просмотра истории.
   * @returns {void} none снимает временное раскрытие; always оставляет его открытым без дальнейшего сворачивания.
   */
  refreshHistoryTreeMode() {
    if (!this.#historyPath) return;
    this.#acceptHistoryPath(this.#historyPath, true, false);
    this.#refreshTree();
  }

  /** Применяет отдельный режим к текущему совпадению поиска. @returns {void} */
  refreshSearchTreeMode() {
    if (this.#searchPath) this.#acceptSearchPath(this.#searchPath);
  }

  /**
   * Меняет только раскрытия поиска, сохраняя ручные ветви и текущий путь истории.
   * @param {Set<HTMLDetailsElement>|null} path Предки нового совпадения либо завершение поиска.
   * @returns {void}
   */
  #acceptSearchPath(path) {
    const mode = this.#options?.getSearchTreeMode?.() || 'temporary';
    for (const branch of this.#temporarySearchBranches) {
      if (!path?.has(branch) || mode === 'none') {
        if (this.contains(branch) && (!this.#historyPath?.has(branch) || this.#options?.getHistoryTreeMode?.() === 'none')) {
          this.#setHistoryBranchOpen(branch, false);
        }
        this.#temporarySearchBranches.delete(branch);
      }
    }
    this.#searchPath = path;
    if (path && mode !== 'none') {
      for (const branch of path) {
        if (mode === 'temporary' && (!branch.open || this.#temporaryHistoryBranches.has(branch))) {
          this.#temporarySearchBranches.add(branch);
        }
        if (mode === 'always') {
          this.#temporarySearchBranches.delete(branch);
          this.#temporaryHistoryBranches.delete(branch);
        }
        this.#setHistoryBranchOpen(branch, true);
      }
    }
    this.#refreshTree();
  }

  /**
   * Определяет ветвь строк снимка по пути и объявлению, независимо от DOM и номера строки.
   * @param {HTMLDetailsElement} branch Ветвь внутри подготовленного дерева репозитория.
   * @returns {string|null} Ключ файла/каталога/объявления либо null вне строк снимка.
   */
  #branchKey(branch) {
    const row = branch.querySelector(':scope > summary');
    if (!isHTMLElement(row)) return null;
    const node = this.#rowNodes.get(row);
    const snapshot = this.#rowSnapshots.get(row);
    if (!node || !snapshot) return null;
    const link = this.#nodeLinks.get(row);
    return JSON.stringify([
      node.type,
      repositoryPath(snapshot.root, node.type === 'symbol' ? link?.filePath || '' : node.path),
      node.type === 'symbol' ? link?.symbolPath || '' : null,
    ]);
  }

  /**
   * Снимает раскрытия заменяемых строк и сразу освобождает ссылки на прежние details.
   * @param {Element|null} list Прежний динамический список одного репозитория.
   * @returns {Map<string,BranchExpansion>} Только состояния по смысловым ключам на срок замены; текст и DOM не сохраняются.
   */
  #captureBranchExpansion(list) {
    /** @type {Map<string,BranchExpansion>} */
    const states = new Map();
    for (const branch of list?.querySelectorAll('details') || []) {
      const key = this.#branchKey(branch);
      if (key) {
        states.set(key, {
          open: branch.open,
          temporary: this.#temporaryHistoryBranches.has(branch),
          historyPath: this.#historyPath?.has(branch) || false,
          searchTemporary: this.#temporarySearchBranches.has(branch),
          searchPath: this.#searchPath?.has(branch) || false,
        });
      }
      this.#temporaryHistoryBranches.delete(branch);
      this.#historyPath?.delete(branch);
      this.#temporarySearchBranches.delete(branch);
      this.#searchPath?.delete(branch);
      this.#historyToggles.delete(branch);
    }
    return states;
  }

  /**
   * Возвращает прежнюю открытость и принадлежность раскрытий новым строкам того же снимка.
   * @param {HTMLUListElement} list Новый список с уже связанными row/node/link.
   * @param {Map<string,BranchExpansion>} states Состояния прежних путей; исчезнувшие ветви не восстанавливаются.
   * @returns {void} История ссылается только на нынешние details; ручные открытые ветви остаются открытыми.
   */
  #restoreBranchExpansion(list, states) {
    for (const branch of list.querySelectorAll('details')) {
      const key = this.#branchKey(branch);
      const saved = key ? states.get(key) : null;
      if (!saved) continue;
      // Между снятием и заменой строк панель могла закрыть просмотр старого token; его временные раскрытия не возвращаются.
      const open = saved.open && (
        !saved.temporary && !saved.searchTemporary ||
        saved.temporary && this.#historyPath !== null ||
        saved.searchTemporary && this.#searchPath !== null
      );
      this.#setHistoryBranchOpen(branch, open);
      if (saved.temporary && open) this.#temporaryHistoryBranches.add(branch);
      if (saved.historyPath) this.#historyPath?.add(branch);
      if (saved.searchTemporary && open) this.#temporarySearchBranches.add(branch);
      if (saved.searchPath) this.#searchPath?.add(branch);
    }
  }

  /** Отменяет поздний прыжок и снимает только его индикатор, сохраняя уже выбранный репозиторий. */
  #cancelTreeNavigation() {
    const intent = this.#treeNavigation;
    if (!intent) return;
    this.#treeNavigation = null;
    ++this.#treeNavigationEpoch;
    intent.controller.abort();
    this.#endRepositoryLoading(intent.repository, 'navigation', intent.loadingToken);
  }

  /**
   * Проверяет фазу ссылки перед каждым ожиданием и передачей панели; уход/возврат фокуса не восстанавливает отменённое намерение.
   * @param {TreeNavigationIntent} intent Захваченное до ожидания намерение.
   * @returns {boolean} Это всё ещё нынешняя ссылка, доступ и фокус; после handoff ревизию самой подготовки проверяет Panel.
   */
  #treeNavigationCurrent(intent) {
    return this.#treeNavigation === intent && intent.epoch === this.#treeNavigationEpoch
      && !intent.controller.signal.aborted && intent.accessRevision === this.#accessRevision && this.#connected()
      && (intent.handedOff || this.#options?.panel.navigationRevision === intent.panelRevision)
      && (intent.committing || this.#selected === intent.row && this.ownerDocument.activeElement === intent.row);
  }

  /**
   * Сразу выбирает известный репозиторий, показывает ожидание, затем разрешает глубокую цель при сохранённом намерении.
   * @param {Origin} origin Проверенный источник, уже присутствующий в каталоге.
   * @param {Target|null} target Смысловой адрес либо null для разрешения raw после готовности дерева.
   * @param {string|null} raw Исходная ссылка при отложенном разрешении.
   * @param {Target|null} context Контекст относительной ссылки документа.
   * @param {boolean} information Удержание требует внутренней информации даже для корня репозитория.
   * @param {boolean} treeOnly Короткая ссылка на каталог выбирает/раскрывает его без посещения материала.
   * @param {TreeNavigationOptions} [options] Исходная строка и режим обычной команды; defaultBranch не распространяется на явные ссылки.
   * @returns {Promise<boolean>} Цель принята; отмена не возвращает прежний фокус/нижний адрес, отказ остаётся у выбранного repo.
   */
  async #stageTreeNavigation(origin, target, raw, context, information, treeOnly, options = {}) {
    const repository = this.#repositoryFor(origin);
    const panel = this.#options?.panel;
    if (!repository || !panel || !this.#connected()) return false;
    const summary = /** @type {HTMLElement} */ (repository.querySelector(':scope > summary'));
    const startingRow = options.row || summary;
    if (!startingRow.isConnected || !repository.contains(startingRow)) return false;
    this.#cancelTreeNavigation();
    panel.beginCatalogueNavigation();
    this.#selected?.classList.remove('is-selected');
    this.#selected = startingRow;
    startingRow.classList.add('is-selected');
    startingRow.focus({ preventScroll: true });
    for (const parent of this.#branchPath(startingRow)) {
      this.#temporaryHistoryBranches.delete(parent);
      this.#temporarySearchBranches.delete(parent);
      this.#historyToggles.delete(parent);
      parent.open = true;
    }
    startingRow.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.#updateLink(startingRow);
    this.#refreshTree();
    const loadingToken = this.#beginRepositoryLoading(repository, 'navigation', ui.catalog.loading);
    /** @type {TreeNavigationIntent} Только данные и отмена нынешнего ожидания, без PAT и текстов. */
    const intent = {
      epoch: ++this.#treeNavigationEpoch,
      accessRevision: this.#accessRevision,
      repository,
      row: startingRow,
      target,
      raw,
      context,
      loadingToken,
      controller: new AbortController(),
      panelRevision: panel.navigationRevision,
      handedOff: false,
      committing: false,
    };
    this.#treeNavigation = intent;
    try {
      const state = this.#repositoryCache.get(repository);
      const rootOnly = target?.kind === 'repository' || raw !== null && !this.#linkLocation(raw, context)?.path;
      if (!rootOnly || this.#repositoryLevel(repository) > 0) {
        let snapshot = await this.#loadRepository(repository);
        if (state?.privatePromise) await state.privatePromise;
        if (!this.#treeNavigationCurrent(intent)) return false;
        snapshot = state?.data || snapshot;
        this.#renderRepositoryTree(repository, snapshot, true);
      }
      if (!this.#treeNavigationCurrent(intent)) return false;
      const resolved = target || (raw !== null ? this.#linkTarget(raw, context) : null);
      if (!resolved) throw new Error('Linked material is absent from the current catalogue.');
      intent.target = resolved;
      if (resolved.kind === 'repository' && !information) return true;
      const node = state?.data ? this.#targetNode(state.data, resolved) : null;
      const row = this.#targetRow(repository, state?.data || null, resolved);
      if (resolved.kind === 'directory' && treeOnly && (node?.type !== 'directory' || row === summary)) {
        throw new Error('Linked directory is absent from the current catalogue.');
      }
      // Собственный второй прыжок разрешён только в этом стеке; во время чтения raw новый фокус отменяет намерение.
      intent.row = row;
      intent.committing = true;
      try {
        this.#selected?.classList.remove('is-selected');
        this.#selected = row;
        row.classList.add('is-selected');
        for (
          let parent = row.closest('details');
          parent && this.contains(parent);
          parent = parent.parentElement?.closest('details') || null
        ) {
          this.#temporaryHistoryBranches.delete(parent);
          this.#temporarySearchBranches.delete(parent);
          this.#historyToggles.delete(parent);
          parent.open = true;
        }
        row.focus({ preventScroll: true });
        row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        if (resolved.kind === 'directory' && treeOnly) {
          this.#footerTarget = { ...resolved, readmePath: null };
          this.#setFooter(githubHref(this.#footerTarget), repository, row, resolved.path);
        } else this.#updateLink(row);
        this.#refreshTree();
      } finally {
        intent.committing = false;
      }
      if (!this.#treeNavigationCurrent(intent)) return false;
      if (resolved.kind === 'directory' && treeOnly) return true;
      intent.handedOff = true;
      const accepted = await panel.navigate(resolved, {
        signal: intent.controller.signal,
        guard: () => this.#treeNavigationCurrent(intent),
        defaultBranch: options.defaultBranch,
        applySourcePin: options.applySourcePin,
        initialMode: options.initialMode
          || (resolved.kind === 'declaration' || resolved.kind === 'source' && resolved.line !== null
            ? 'source'
            : undefined),
      });
      if (!accepted && this.#treeNavigationCurrent(intent)) {
        this.#showTreeNavigationFailure(intent, information, treeOnly, options);
      }
      return accepted;
    } catch {
      if (this.#treeNavigationCurrent(intent)) this.#showTreeNavigationFailure(intent, information, treeOnly, options);
      return false;
    } finally {
      this.#endRepositoryLoading(repository, 'navigation', loadingToken);
      if (this.#treeNavigation === intent) this.#treeNavigation = null;
    }
  }

  /**
   * Оставляет отказ рядом с выбранным репозиторием; повтор создаёт новое намерение вместо возрождения epoch.
   * @param {TreeNavigationIntent} intent Неуспешная ссылка с адресными данными без текста и PAT.
   * @param {boolean} information Повтор снова открывает информацию внутри сайта.
   * @param {boolean} treeOnly Каталог раскрывается без посещения материала.
   * @param {TreeNavigationOptions} options Прежний режим/признак команды; при повторе строка выбирается из нынешнего дерева заново.
   * @returns {void} Не возвращает старый фокус, нижний адрес или спрятанную панель.
   */
  #showTreeNavigationFailure(intent, information, treeOnly, options) {
    const repository = intent.repository;
    const state = this.#repositoryCache.get(repository);
    if (!state) return;
    const retry = treeRetry(this.ownerDocument, ui.catalog.retry, 'retry-navigation');
    retry.addEventListener('click', () => {
      void this.#stageTreeNavigation(
        this.#origin(repository),
        intent.target,
        intent.raw,
        intent.context,
        information,
        treeOnly,
        {
          ...options,
          row: options.row && intent.target ? this.#targetRow(repository, state.data, intent.target) : undefined,
        },
      );
    }, { signal: this.#events?.signal });
    setStatus(
      state.notice,
      this.#privateAccess?.failure(repository.dataset.repository || '')
        || ui.catalog.repositoryFailed,
      retry,
    );
    repository.insertBefore(state.notice, repository.querySelector(':scope > .tree-list'));
    this.#refreshTree();
  }

  /**
   * Подключает панель и общий нижний бар, сохраняя дерево и кэши экземпляра.
   * @param {CatalogOptions} next Узлы и действия, которыми настраивается нынешний экземпляр каталога.
   */
  configure(next) {
    if (this.#options && (this.#options.panel !== next.panel || this.#options.footer !== next.footer)) {
      this.disconnect();
    }
    this.#options = next;
    this.connect();
  }

  /** Открывает поиск каталога; поиск файла у Panel не меняется. @returns {void} */
  showFind() {
    if (!this.#moving && this.#events) this.#search?.show();
  }

  /** Показывает отдельную историю запросов каталога. @returns {void} */
  showSearchHistory() {
    if (!this.#moving && this.#events) this.#search?.showHistory();
  }

  /**
   * Выбирает совпадение по режиму раскрытия, не загружая документы.
   * @param {HTMLElement|null} row Строка загруженного дерева; null завершает раскрытие поиска.
   * @returns {void} Поле поиска сохраняет фокус; нижний адрес отражает выбор дерева.
   */
  #selectSearchRow(row) {
    if (!row) {
      this.#acceptSearchPath(null);
      return;
    }
    if (this.#moving || !this.#treeList?.contains(row) || !row.isConnected) return;
    /** @type {Set<HTMLDetailsElement>} */
    const path = new Set();
    for (let parent = row.parentElement; parent && parent !== this.#treeList; parent = parent.parentElement) {
      if (isDetails(parent) && parent.querySelector(':scope > summary') !== row) path.add(parent);
    }
    this.#acceptSearchPath(path);
    this.#selected?.classList.remove('is-selected');
    this.#selected = row;
    row.classList.add('is-selected');
    this.#updateLink(row);
    this.#refreshTree();
    if (row.getBoundingClientRect().height) row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /**
   * Возвращает подтверждённый адрес нижней панели, отдельно от VS Code/GitHub href.
   * @returns {Target|null} Канонический адрес нынешней строки или принятого материала; null до первого выбора.
   */
  get footerTarget() {
    return this.#footerTarget ? readMaterialTarget(this.#footerTarget) : null;
  }

  /**
   * Собирает источник по нынешней регистрации строки репозитория.
   * @param {HTMLDetailsElement} repository Живой details, зарегистрированный текущим экземпляром каталога.
   * @returns {Origin} Ключ каталога и канонический GitHub URL, без раскрытия местных имён продуктов.
   */
  #origin(repository) {
    return {
      kind: this.#librarySources.has(repository) ? 'haxelib' : 'repository',
      id: repository.dataset.repository || '',
      url: this.#librarySources.get(repository)?.url || repository.dataset.url || '',
    };
  }

  /**
   * Ищет точное совпадение вида, ключа и URL источника в нынешних политиках.
   * @param {Origin} origin Вид источника, ключ каталога и канонический GitHub URL.
   * @returns {HTMLDetailsElement|null} Зарегистрированный узел либо null; совпадения одного URL недостаточно.
   */
  #repositoryFor(origin) {
    return [...this.#policies.keys()].find(repository => {
      const known = this.#origin(repository);
      return known.kind === origin.kind && known.id === origin.id
        && known.url.toLowerCase() === origin.url.toLowerCase();
    }) || null;
  }

  /**
   * Дожидается настроек и каталога библиотек до разрешения источника.
   * @param {Origin} origin Проверенный источник, который должен совпасть с нынешней регистрацией.
   * @param {AbortSignal} signal Отмена вызывающей стороны; результат после отмены не принимается.
   * @returns {Promise<HTMLDetailsElement>} Нынешний зарегистрированный узел; отмена или неизвестный источник вызывают отказ.
   */
  async #readyRepository(origin, signal) {
    if (signal.aborted) throw signal.reason;
    if (this.#siteState !== 'ready') await (this.#sitePromise || this.#loadSite());
    if (signal.aborted) throw signal.reason;
    if (this.#siteState !== 'ready') throw new Error('Site settings are unavailable.');
    if (origin.kind === 'haxelib' && this.#libraryState !== 'ready') {
      await (this.#libraryPromise || this.#loadLibraryCatalogue(this.#librarySettings));
    }
    if (signal.aborted) throw signal.reason;
    const repository = this.#repositoryFor(origin);
    if (!repository) throw new Error('Repository is not registered.');
    return repository;
  }

  /**
   * Ищет семантический узел без прежнего DOM-token и без создания ветвей.
   * @param {RepositorySnapshot} snapshot Ограниченный снимок, в котором ищется семантический путь.
   * @param {Target} target Проверенный смысловой адрес материала без DOM и доказательства доступа.
   * @returns {CatalogNode|null} Семантический узел либо null при отсутствии соответствия.
   */
  #targetNode(snapshot, target) {
    if (target.kind === 'repository' || target.kind === 'document') return null;
    /**
     * Прослеживает путь файла и цепочку вложенных объявлений в ограниченном дереве снимка.
     * @param {CatalogNode[]} nodes Узлы подготовленного дерева; полные исходные файлы сюда не входят.
     * @param {string} [file] Файл-владелец объявлений относительно корня подготовленного дерева.
     * @param {string} [symbol] Накопленный путь родительского объявления в файле.
     * @returns {CatalogNode|null} Первый узел с совпавшим полным путём файла или объявления либо null.
     */
    const visit = (nodes, file = '', symbol = '') => {
      for (const node of nodes) {
        const path = node.type === 'symbol' ? file : node.path;
        const fullPath = repositoryPath(snapshot.root, path);
        const entity = node.type === 'symbol' ? symbol ? `${symbol}.${node.name}` : `${file}#${node.name}` : '';
        if (target.kind === 'directory' && node.type === 'directory' && target.path === fullPath) return node;
        if (target.kind === 'source' && node.type === 'file' && target.path === fullPath) return node;
        if (
          target.kind === 'declaration' && node.type === 'symbol' && target.path === fullPath
          && target.symbolPath === entity
        ) return node;
        const found = visit(node.children, node.type === 'file' ? node.path : file, entity);
        if (found) return found;
      }
      return null;
    };
    return visit(snapshot.children);
  }

  /**
   * Выбирает существующую строку адреса или ближайший известный каталог для неэкспортированного Markdown.
   * @param {HTMLDetailsElement} repository Репозиторий с нынешними связанными строками.
   * @param {RepositorySnapshot|null} snapshot Снимок подготовленного материала; null у корневого отказа.
   * @param {Target} target Проверенный адрес; source обозначает файл, declaration — конкретное объявление.
   * @returns {HTMLElement} Строка материала, известного родителя либо корневая summary без создания искусственной строки.
   */
  #targetRow(repository, snapshot, target) {
    let row = /** @type {HTMLElement} */ (repository.querySelector(':scope > summary'));
    const node = snapshot ? this.#targetNode(snapshot, target) : null;
    let parentLength = -1;
    for (const candidate of repository.querySelectorAll('.tree-row')) {
      const element = /** @type {HTMLElement} */ (candidate);
      if (node && this.#rowNodes.get(element) === node) return element;
      const address = this.#targetForRow(element);
      if (
        target.kind !== 'repository' && address?.kind === 'directory'
        && target.path.startsWith(`${address.path}/`) && address.path.length > parentLength
      ) {
        row = element;
        parentLength = address.path.length;
      }
    }
    return row;
  }

  /**
   * Строит адрес из снимка, которым создана показанная строка.
   * @param {HTMLElement} row Показанная строка; адрес вычисляется по создавшему её снимку.
   * @returns {Target|null} Проверенный адрес либо null; подмена ещё не принятого снимка не меняет путь старой строки.
   */
  #targetForRow(row) {
    const repository = /** @type {HTMLDetailsElement|null} */ (row.closest('details[data-repository]'));
    if (!repository) return null;
    const origin = this.#origin(repository);
    const node = this.#rowNodes.get(row);
    if (!node) return readMaterialTarget({ kind: 'repository', origin });
    const snapshot = this.#rowSnapshots.get(row) || this.#repositoryCache.get(repository)?.data;
    const link = this.#nodeLinks.get(row);
    if (!snapshot) return null;
    const ref = snapshot.ref;
    if (node.type === 'directory') {
      const readme = node.documents.README;
      return readMaterialTarget({
        kind: 'directory',
        origin,
        ref,
        path: repositoryPath(snapshot.root, node.path),
        readmePath: readme?.path || null,
      });
    }
    const path = repositoryPath(snapshot.root, node.type === 'file' ? node.path : link?.filePath || '');
    return node.type === 'symbol' && link?.symbolPath && node.line
      ? readMaterialTarget({
        kind: 'declaration',
        origin,
        ref,
        path,
        symbolPath: link.symbolPath,
        symbolKind: node.kind || 'symbol',
        line: node.line,
      })
      : readMaterialTarget({ kind: 'source', origin, ref, path, line: null });
  }

  /**
   * Готовит прежний просмотр управления доступом без чтения файлов и без доказательства доступа.
   * @param {Target & DeniedRepositoryTargetFields} target Адрес корневого репозитория для просмотра управления доступом.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @param {RepositoryPolicy} policy Нынешние права публикации, уровень дерева и ветка репозитория.
   * @param {number} accessRevision Ревизия каталога, захваченная перед подготовкой.
   * @returns {PreparedMaterial} Готовый просмотр управления токенами без текста и без доказательства чтения.
   */
  #deniedRepository(target, repository, policy, accessRevision) {
    /**
     * @type {DocumentsResult}
     */
    const result = {
      public: false,
      documents: {},
      documentsDenied: true,
      reason: this.#privateAccess?.failure(target.origin.id) || undefined,
      retryAvailable: Boolean(this.#privateAccess?.active),
    };
    /**
     * @type {import('../document/index.mjs').RepositoryDocumentsRequest}
     */
    const request = {
      target,
      token: /** @type {HTMLElement} */ (repository.querySelector(':scope > summary')),
      title: { type: 'repository', name: target.origin.id },
      repository: target.origin.id,
      kind: 'documents',
      scope: 'repository',
      types: documentTypes,
      loadingSource: 'site',
      readyDocuments: result,
      load: async signal => {
        if (signal.aborted) throw signal.reason;
        return result;
      },
    };
    return {
      target,
      request,
      repository,
      snapshot: null,
      accessRevision,
      privateSource: false,
      accessProof: null,
      ref: policy.branch,
      allowCached: false,
      denied: true,
    };
  }

  /**
   * Готовит разрешённый материал до смены просмотра; временные данные не входят в журнал.
   * @param {Target} input Сохранённый либо построенный адрес; заново проверяется по нынешнему каталогу и доступу.
   * @param {PrepareOptions} options Срок перехода, явное обновление, режим файла и признак обычного default_branch; данные прежнего готового исходника не заменяют проверки доступа.
   * @returns {Promise<PreparedMaterial>} Материал и временные ревизии для последующей общей фиксации; отказ не принимает просмотр.
   */
  async prepareTarget(input, { signal, refresh = false, sourceMode, defaultBranch = false, currentSource }) {
    const parsed = readMaterialTarget(input);
    if (!parsed) throw new Error('Invalid material address.');
    let target = parsed;
    const repository = await this.#readyRepository(target.origin, signal);
    const policy = this.#policies.get(repository);
    const state = this.#repositoryCache.get(repository);
    if (!policy || !state) throw new Error('Repository is unavailable.');
    const accessRevision = this.#accessRevision;
    const library = this.#librarySources.get(repository);
    if (
      target.kind === 'repository' && !library && !refresh && !this.#privateAccess?.active
      && !documentTypes.some(type => policy.documents[type])
    ) {
      return this.#deniedRepository(target, repository, policy, accessRevision);
    }
    this.#preparing.set(repository, (this.#preparing.get(repository) || 0) + 1);
    try {
      let snapshot;
      try {
        snapshot = await this.#loadRepository(repository);
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        if (accessRevision !== this.#accessRevision) throw new Error('Repository access changed.');
        if (
          target.kind === 'repository' && !library && !refresh
          && (!this.#privateAccess?.active || this.#privateAccess.failure(target.origin.id))
        ) {
          return this.#deniedRepository(target, repository, policy, accessRevision);
        }
        throw error;
      }
      if (state.privatePromise) await state.privatePromise;
      snapshot = state.data || snapshot;
      const privateSource = !library && Boolean(snapshot.privateSource);
      const allowCached = !refresh && (target.kind === 'source' || target.kind === 'declaration')
        && (sourceMode || (target.kind === 'declaration' || target.line !== null ? 'source' : 'documentation'))
          === 'documentation';
      if (
        privateSource && this.#privateAccess
        && (refresh || !allowCached && !this.#privateAccess.confirmed(target.origin.id))
      ) {
        const data = await this.#privateAccess.refresh(target.origin.id, policy.branch);
        snapshot = this.#readSnapshot(repository, data, policy, undefined, true);
        state.data = snapshot;
        state.rendered = false;
        if (state.privatePromise) await state.privatePromise;
        snapshot = state.data || snapshot;
      }
      if (signal.aborted) throw signal.reason;
      if (accessRevision !== this.#accessRevision) throw new Error('Repository access changed.');
      const summary = /** @type {HTMLElement} */ (repository.querySelector(':scope > summary'));
      const node = this.#targetNode(snapshot, target);
      if (target.kind === 'directory' && node?.type === 'directory' && target.readmePath === null) {
        target = { ...target, readmePath: node.documents.README?.path || null };
      }
      /**
       * @type {Pick<import('../document/index.mjs').DocumentRequest,'target'|'token'|'title'|'version'|'repository'>}
       */
      const common = {
        target,
        token: summary,
        title: { type: node?.type || 'repository', name: node?.name || target.origin.id, kind: node?.kind },
        version: library?.version,
        repository: library ? undefined : target.origin.id,
      };
      let ref = target.kind === 'repository' ? library?.ref || policy.branch : target.ref;
      if (library && (target.kind === 'repository' || defaultBranch)) {
        ref = await publicDefaultRef(library.url, signal);
        if (signal.aborted) throw signal.reason;
        if (accessRevision !== this.#accessRevision || state.data !== snapshot) {
          throw new Error('Repository access changed.');
        }
        this.#defaultRefs.set(library.url.toLowerCase(), ref);
      }
      if (!library && ref !== policy.branch) {
        throw new Error('The material ref does not match the repository snapshot.');
      }
      if (target.kind !== 'repository') target = { ...target, ref };
      const source = { url: snapshot.url, ref };
      let accessProof = privateSource
        ? this.#privateAccess?.snapshotRevision(target.origin.id, ref, { allowCached }) || null
        : null;
      if (privateSource && !accessProof) throw new Error('A confirmed repository snapshot is required.');
      /**
       * Читает указанный Markdown/текстовый документ через нынешний закрытый или публичный источник.
       * @param {string} path Полный относительный путь документа внутри подтверждённого Git-корня.
       * @returns {Promise<string>} Текст текущего ref через закрытый или публичный загрузчик; отмена и запрет отклоняют чтение.
       */
      const readDocument = async path => {
        if (privateSource && this.#privateAccess) {
          return this.#privateAccess.linkedDocument(target.origin.id, path, ref, signal, { refresh });
        }
        return loadPublicDocument({ ...source, path }, signal, { refresh });
      };
      /**
       * @type {import('../document/index.mjs').DocumentRequest}
       */
      let request;
      if (target.kind === 'source' || target.kind === 'declaration') {
        if (!target.path.endsWith('.hx') || this.#repositoryLevel(repository) < 3) {
          throw new Error('Source file is unavailable.');
        }
        if (target.kind === 'declaration' && !node) throw new Error('Declaration is absent from the current snapshot.');
        /**
         * @type {CatalogNode}
         */
        const information = node
          || { type: 'file', name: target.path.split('/').at(-1) || '', path: target.path, children: [] };
        if (this.#repositoryLevel(repository) < 4) {
          if (!node || sourceMode === 'source') throw new Error('Source view is unavailable.');
          request = {
            ...common,
            target,
            title: { type: information.type, name: information.name, kind: information.kind },
            kind: 'hxdoc',
            node: information,
          };
        } else {
          const location = { ...source, path: target.path, library: Boolean(library), private: privateSource };
          /**
           * Получает полный .hx текущего ref; явная ссылка библиотеки не заменяется default_branch.
           * @param {AbortSignal} loadSignal Отмена единственного чтения, принадлежащая SourceRequest или панели.
           * @returns {Promise<PreparedSourceResult>} Готовый текст .hx и прочитанный ref; только нынешний доступ может завершить чтение.
           */
          const loadSource = async loadSignal => {
            if (privateSource && this.#privateAccess) {
              return {
                content: await this.#privateAccess.sourceFile(target.origin.id, location.path, ref, loadSignal, {
                  refresh,
                }),
                ref,
              };
            }
            return loadPublicSourceFile({ ...location, library: false }, loadSignal, { refresh });
          };
          const mode = sourceMode
            || (target.kind === 'declaration' || target.line !== null ? 'source' : 'documentation');
          const currentRequest = currentSource?.request;
          const previousReady = !refresh && currentSource && currentRequest?.kind === 'source-file'
              && this.targetIsCurrent(currentSource) && currentSource.repository === repository
              && currentSource.snapshot === snapshot && currentSource.accessRevision === accessRevision
              && currentSource.privateSource === privateSource && currentSource.accessProof === accessProof
              && currentSource.ref === ref && currentRequest.source.url === source.url
              && currentRequest.source.path === target.path && currentRequest.readySource?.ref === ref
            ? currentRequest.readySource
            : undefined;
          const readySource = mode === 'source' ? previousReady || await loadSource(signal) : undefined;
          if (readySource && !sourceHasLine(readySource.content, target.line)) {
            throw new Error('Source line is absent from the current file.');
          }
          request = {
            ...common,
            target,
            title: { type: information.type, name: information.name, kind: information.kind },
            kind: 'source-file',
            node: information,
            source: location,
            initialMode: mode,
            line: target.line,
            readySource,
            load: async loadSignal => {
              if (loadSignal.aborted) throw loadSignal.reason;
              if (
                accessRevision !== this.#accessRevision || state.data !== snapshot
                || privateSource
                  && this.#privateAccess?.snapshotRevision(target.origin.id, ref, { allowCached }) !== accessProof
              ) {
                throw new Error('Repository access changed.');
              }
              return readySource || loadSource(loadSignal);
            },
          };
        }
      } else {
        /**
         * @type {DocumentsResult}
         */
        let result;
        /**
         * @type {ReadonlyArray<string>}
         */
        let types;
        if (target.kind === 'document') {
          const content = await readDocument(target.path);
          result = {
            source,
            public: false,
            documents: {
              [target.path]: { name: target.path.split('/').at(-1), path: target.path, format: target.format, content },
            },
            order: [target.path],
          };
          types = [target.path];
          common.title = { type: 'file', name: target.path.split('/').at(-1) || '', kind: undefined };
        } else if (library) {
          const documents = await this.#loadPublicDocuments(
            library,
            node || { type: 'repository', name: library.name },
            signal,
            ref,
            refresh,
          );
          result = {
            source: { url: documents.url, ref: documents.ref },
            public: true,
            documents: documents.documents,
            order: documents.order,
          };
          types = documents.order;
        } else {
          types = target.kind === 'directory' ? directoryDocumentTypes : documentTypes;
          const metadata = node?.type === 'directory' ? node.documents : snapshot.documents;
          /**
           * @type {Record<string,RepositoryDocument>}
           */
          const documents = {};
          for (const type of types) {
            const document = metadata[type];
            if (!document || !privateSource && !policy.documents[/** @type {DocumentType} */ (type)]) continue;
            try {
              documents[type] = { ...document, content: await readDocument(document.path) };
            } catch (error) {
              if (refresh || privateSource || signal.aborted || typeof document.content !== 'string') throw error;
              documents[type] = document;
            }
          }
          if (!Object.keys(documents).length && target.kind !== 'directory') {
            if (target.kind === 'repository' && !refresh) {
              return this.#deniedRepository(target, repository, policy, accessRevision);
            }
            throw new Error('No readable repository document.');
          }
          result = { source, public: false, documents };
        }
        if (
          target.kind === 'directory'
          && (node?.type !== 'directory'
            || target.readmePath !== null && node.documents.README?.path !== target.readmePath)
        ) {
          throw new Error('Directory README is absent from the current snapshot.');
        }
        request = {
          ...common,
          target,
          kind: 'documents',
          readyDocuments: result,
          types,
          scope: target.kind === 'directory' ? 'directory' : 'repository',
          loadingSource: 'github',
          description: node?.doc || (target.kind === 'repository'
            ? repository.querySelector(':scope > .description.tree-content')?.textContent?.trim() || undefined
            : undefined),
          load: async loadSignal => {
            if (loadSignal.aborted) throw loadSignal.reason;
            return result;
          },
        };
      }
      accessProof = privateSource
        ? this.#privateAccess?.snapshotRevision(target.origin.id, ref, { allowCached }) || null
        : null;
      const prepared = {
        target,
        request,
        repository,
        snapshot,
        accessRevision,
        privateSource,
        accessProof,
        ref,
        allowCached,
      };
      if (signal.aborted) throw signal.reason;
      if (!this.targetIsCurrent(prepared)) throw new Error('Repository access changed.');
      return prepared;
    } finally {
      const count = (this.#preparing.get(repository) || 1) - 1;
      if (count) this.#preparing.set(repository, count);
      else this.#preparing.delete(repository);
    }
  }

  /**
   * Проверяет непостоянные доказательства перед синхронным принятием.
   * @param {PreparedMaterial} prepared Временный результат подготовки с ревизиями; не сохраняется в журнале.
   * @returns {boolean} Подготовка ещё принадлежит нынешним регистрации, снимку и доступу.
   */
  targetIsCurrent(prepared) {
    return prepared.accessRevision === this.#accessRevision
      && this.#repositoryFor(prepared.target.origin) === prepared.repository
      && (prepared.denied || this.#repositoryCache.get(prepared.repository)?.data === prepared.snapshot)
      && (!prepared.privateSource || prepared.accessProof !== null
          && prepared.accessProof
            === this.#privateAccess?.snapshotRevision(prepared.target.origin.id, prepared.ref, {
              allowCached: prepared.allowCached,
            }));
  }

  /**
   * Принимает готовый адрес и применяет раскрытие обычного перехода, истории либо обновления.
   * @param {PreparedMaterial} prepared Временный результат подготовки с ревизиями; не сохраняется в журнале.
   * @param {Target} shownTarget Адрес фактически принимаемого просмотра и нижней панели.
   * @param {AcceptTargetOptions} [options] Происхождение перехода; только успешная история меняет временное раскрытие.
   * @returns {void} Значение не возвращается; выбор дерева и нижний адрес приняты синхронно.
   */
  acceptTarget(prepared, shownTarget, { history = false, refresh = false } = {}) {
    const intent = this.#treeNavigation;
    if (intent && intent.repository === prepared.repository && this.#treeNavigationCurrent(intent)) {
      intent.committing = true;
    }
    const repository = prepared.repository;
    if (prepared.snapshot) {
      this.#renderRepositoryTree(repository, prepared.snapshot, true);
    }
    const row = this.#targetRow(repository, prepared.snapshot, prepared.target);
    prepared.request.token = row;
    this.#selected?.classList.remove('is-selected');
    this.#selected = row;
    row.classList.add('is-selected');
    this.#acceptHistoryPath(this.#branchPath(row), history, refresh);
    if (history && !refresh && (this.#options?.getHistoryTreeMode?.() || 'temporary') !== 'none') {
      row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    this.#footerTarget = readMaterialTarget(shownTarget);
    this.#setFooter(
      githubHref(shownTarget),
      repository,
      row,
      shownTarget.kind === 'repository'
        ? shownTarget.origin.id
        : shownTarget.kind === 'directory'
        ? shownTarget.readmePath || shownTarget.path
        : shownTarget.path,
      !prepared.denied,
    );
    this.#refreshTree();
  }

  /**
   * Выбирает известный репозиторий после загрузки дерева; отказ не меняет прежний выбор.
   * @param {Origin} input Входные данные, которые проверяются до принятия.
   * @returns {Promise<boolean>} Репозиторий выбран и раскрыт; неизвестный источник или отказ дерева дают false.
   */
  async revealRepository(input) {
    const origin = readMaterialOrigin(input);
    if (!origin) return false;
    try {
      const repository = await this.#readyRepository(origin, new AbortController().signal);
      if (this.#repositoryLevel(repository) > 0) await this.#loadRepository(repository);
      const state = this.#repositoryCache.get(repository);
      if (state?.data) this.#renderRepositoryTree(repository, state.data);
      const row = /** @type {HTMLElement} */ (repository.querySelector(':scope > summary'));
      for (
        let parent = repository;
        parent && this.contains(parent);
        parent = /** @type {HTMLDetailsElement} */ (parent.parentElement?.closest('details'))
      ) {
        this.#temporaryHistoryBranches.delete(parent);
        this.#temporarySearchBranches.delete(parent);
        this.#historyToggles.delete(parent);
        parent.open = true;
      }
      this.#selected?.classList.remove('is-selected');
      this.#selected = row;
      row.classList.add('is-selected');
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      this.#updateLink(row);
      this.#refreshTree();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Выбирает и раскрывает существующий каталог без обязательного README и без открытия просмотра.
   * @param {import('./material-target.mjs').DirectoryTarget} target Адрес каталога; документы не читаются.
   * @returns {Promise<boolean>} Каталог найден и выбран; отказ структуры сохраняет прежний выбор.
   */
  async revealDirectory(target) {
    try {
      const repository = await this.#readyRepository(target.origin, new AbortController().signal);
      const revision = this.#accessRevision;
      let snapshot = await this.#loadRepository(repository);
      const state = this.#repositoryCache.get(repository);
      if (state?.privatePromise) await state.privatePromise;
      snapshot = state?.data || snapshot;
      if (revision !== this.#accessRevision) return false;
      const node = this.#targetNode(snapshot, target);
      if (node?.type !== 'directory') return false;
      this.#renderRepositoryTree(repository, snapshot);
      const row = [...repository.querySelectorAll('.tree-row')].find(element =>
        this.#rowNodes.get(/** @type {HTMLElement} */ (element)) === node
      );
      if (!isHTMLElement(row)) return false;
      this.#selected?.classList.remove('is-selected');
      this.#selected = row;
      row.classList.add('is-selected');
      for (
        let parent = row.closest('details');
        parent && this.contains(parent);
        parent = parent.parentElement?.closest('details') || null
      ) {
        this.#temporaryHistoryBranches.delete(parent);
        this.#temporarySearchBranches.delete(parent);
        this.#historyToggles.delete(parent);
        parent.open = true;
      }
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      this.#footerTarget = { ...target, readmePath: null };
      this.#setFooter(githubHref(this.#footerTarget), repository, row, target.path);
      this.#refreshTree();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Определяет вид адреса по нормализованному пути и при наличии дерева добавляет README каталога.
   * @param {Origin} origin Вид источника, ключ каталога и канонический GitHub URL.
   * @param {string} ref Уже выделенный ref; существование ветки/материала проверяют загрузчики.
   * @param {string} path Полный нормализованный путь внутри Git-корня, отдельно от ref.
   * @param {string|null} anchor Исходный Markdown-якорь без порождённого DOM-id.
   * @param {boolean} directory Ссылка явно обозначает каталог; наличие README определяется снимком и не обязательно.
   * @returns {Target|null} Адрес доступного вида файла или каталога; неподдерживаемый путь даёт null.
   */
  #pathTarget(origin, ref, path, anchor, directory) {
    if (!materialRef(ref) || !materialPath(path, true)) return null;
    if (!path) return { kind: 'repository', origin };
    if (!directory && (linkedDocumentPath(path) || origin.kind === 'haxelib' && publicDocumentPath(path))) {
      return readMaterialTarget({
        kind: 'document',
        origin,
        ref,
        path,
        format: /\.(?:md|markdown)$/i.test(path) ? 'markdown' : 'text',
        anchor,
      });
    }
    if (!directory && path.endsWith('.hx')) {
      const line = anchor === null || anchor === '' ? null : /^L[1-9]\d*$/.test(anchor) ? Number(anchor.slice(1)) : -1;
      return readMaterialTarget({ kind: 'source', origin, ref, path, line });
    }
    const repository = this.#repositoryFor(origin);
    const snapshot = repository && this.#repositoryCache.get(repository)?.data;
    if (!snapshot) return directory ? { kind: 'directory', origin, ref, path, readmePath: null } : null;
    const node = this.#targetNode(snapshot, { kind: 'directory', origin, ref, path, readmePath: null });
    if (node?.type === 'directory') {
      return readMaterialTarget({
        kind: 'directory',
        origin,
        ref,
        path,
        readmePath: node.documents.README?.path || null,
      });
    }
    return null;
  }

  /**
   * Распознаёт только известный репозиторий и доказанный ref; относительный путь не проходит через GitHub URL.
   * @param {string} value Исходный href, до преобразования в выбранный внешний режим.
   * @param {Target|null} context Адрес читаемого документа для относительного пути; null для описаний дерева.
   * @returns {LinkLocation|null} Понятные repo/ref/path/anchor; неизвестный repo или неоднозначный ref дают null.
   */
  #linkLocation(value, context) {
    if (!value || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
    const current = context && readMaterialTarget(context);
    if (!/^[a-z][a-z\d+.-]*:/i.test(value)) {
      if (!current || current.kind === 'repository') return null;
      const base = current.kind === 'directory' ? current.readmePath : current.path;
      if (!base) return null;
      const relative = relativeMaterialPath(value, base);
      return relative ? { origin: current.origin, ref: current.ref, ...relative } : null;
    }
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (url.origin !== 'https://github.com' || url.username || url.password) return null;
    const match = /^\/([a-z\d_.-]+)\/([a-z\d_.-]+)(?:\/(blob|tree)\/(.*))?\/?$/i.exec(url.pathname);
    if (!match) return null;
    const base = `https://github.com/${match[1]}/${match[2]}`;
    const repository = [...this.#policies.keys()].find(item =>
      this.#origin(item).url.toLowerCase() === base.toLowerCase()
    );
    if (!repository) return null;
    const origin = this.#origin(repository);
    if (!match[3]) return { origin, ref: null, path: '', anchor: null, directory: true };
    const library = this.#librarySources.get(repository);
    const snapshot = this.#repositoryCache.get(repository)?.data;
    const refs = new Set(
      [
        library?.ref,
        this.#policies.get(repository)?.branch,
        snapshot?.ref,
        this.#defaultRefs.get(origin.url.toLowerCase()),
        library?.installation.source === 'github' ? library.installation.ref : undefined,
      ].filter(ref => typeof ref === 'string'),
    );
    const tail = (match[4] || '').replace(/%[a-f\d]{2}/gi, encoded => encoded.toUpperCase());
    /**
     * @type {Array<{ref:string,path:string}>}
     */
    const candidates = [];
    for (const ref of refs) {
      if (
        !ref || !materialRef(ref)
        || library && ref === this.#policies.get(repository)?.branch
          && ref !== this.#defaultRefs.get(origin.url.toLowerCase()) && ref !== library.ref
      ) continue;
      const prefixes = new Set([encodeURIComponent(ref), ref.split('/').map(encodeURIComponent).join('/')]);
      for (const prefix of prefixes) {
        if (tail === prefix || tail.startsWith(`${prefix}/`)) {
          const rawPath = tail.slice(prefix.length).replace(/^\//, '').replace(/\/$/, '');
          try {
            const parts = rawPath ? rawPath.split('/').map(part => decodeURIComponent(part)) : [];
            if (parts.some(part => !part || /[\/\\\u0000-\u001f\u007f]/.test(part))) continue;
            if (!candidates.some(candidate => candidate.ref === ref && candidate.path === parts.join('/'))) {
              candidates.push({ ref, path: parts.join('/') });
            }
          } catch { /* Ошибка кодировки не становится путём. */ }
        }
      }
    }
    if (candidates.length !== 1) return null;
    let anchor = url.hash ? url.hash.slice(1) : null;
    try {
      if (anchor !== null) anchor = decodeURIComponent(anchor);
    } catch {
      return null;
    }
    return { origin, ref: candidates[0].ref, path: candidates[0].path, anchor, directory: match[3] === 'tree' };
  }

  /**
   * Превращает понятный href в сериализуемый адрес, сохраняя ref, вид пути и исходный якорь.
   * @param {string} value Исходный href с ещё не определённым видом материала.
   * @param {Target|null} context Нынешний адрес документа для разрешения относительного пути.
   * @returns {Target|null} Типизированный адрес материала либо null, если назначение не удалось определить.
   */
  #linkTarget(value, context) {
    const location = this.#linkLocation(value, context);
    if (!location) return null;
    return location.ref === null
      ? { kind: 'repository', origin: location.origin }
      : this.#pathTarget(location.origin, location.ref, location.path, location.anchor, location.directory);
  }

  /**
   * Позволяет обработчику синхронно принять только понятный внутренний переход.
   * @param {string} value Входное значение, форма которого проверяется этой функцией.
   * @param {Target|null} [contextTarget] Нынешний материал, от которого разрешаются относительные ссылки.
   * @returns {boolean} Можно синхронно подавить обычное открытие ради понятного внутреннего перехода.
   */
  canRouteLink(value, contextTarget = null) {
    if (this.#linkTarget(value.trim(), contextTarget)) return true;
    const location = this.#linkLocation(value.trim(), contextTarget);
    return Boolean(
      location && (location.path === '' || location.directory || linkedDocumentPath(location.path)
        || location.path.endsWith('.hx')),
    );
  }

  /**
   * Разрешает адрес после готовности каталога; неизвестный или неоднозначный адрес возвращает null.
   * @param {string} value Исходная ссылка документа или описания дерева.
   * @param {Target|null} [contextTarget] Нынешний материал, от которого разрешаются относительные ссылки.
   * @returns {Promise<Target|null>} Разрешённый адрес либо null; путь каталога при необходимости проверяется загруженным снимком.
   */
  async routeLink(value, contextTarget = null) {
    if (this.#siteState !== 'ready') await (this.#sitePromise || this.#loadSite());
    if (this.#libraryState !== 'ready' && this.#librarySettings) {
      await (this.#libraryPromise || this.#loadLibraryCatalogue(this.#librarySettings));
    }
    let target = this.#linkTarget(value.trim(), contextTarget);
    if (target) return target;
    const location = this.#linkLocation(value.trim(), contextTarget);
    if (location) {
      const repository = this.#repositoryFor(location.origin);
      if (repository) {
        try {
          await this.#loadRepository(repository);
        } catch {
          return null;
        }
        target = this.#linkTarget(value.trim(), contextTarget);
      }
    }
    return target;
  }

  /**
   * Строит ссылку установленного редактора или GitHub; отсутствие местного корня выключает VS Code.
   * @param {Target} target Проверенный смысловой адрес материала без DOM и доказательства доступа.
   * @param {import('./material-target.mjs').LinkMode} mode Общий режим internal/vscode/github; пустой корень отключает vscode.
   * @param {string} organizationRoot Местный абсолютный корень организации; хранится только в браузере.
   * @returns {string|null} GitHub/VS Code URL либо null при неверном target или отсутствующем местном корне.
   */
  targetHref(target, mode, organizationRoot) {
    const parsed = readMaterialTarget(target);
    if (!parsed) return null;
    if (mode !== 'vscode') return githubHref(parsed);
    const root = readOrganizationRoot(organizationRoot);
    const repository = this.#repositoryFor(parsed.origin);
    if (!root || !repository) return null;
    const library = this.#librarySources.get(repository);
    const localRoot = library?.localPath || (parsed.origin.kind === 'repository' ? parsed.origin.id : '');
    if (!materialPath(localRoot)) return null;
    const path = parsed.kind === 'repository' ? '' : parsed.kind === 'directory' ? parsed.path : parsed.path;
    const absolute = `${root.replace(/\/$/, '')}/${localRoot}${path ? `/${path}` : ''}`;
    const line = parsed.kind === 'source' || parsed.kind === 'declaration' ? parsed.line : null;
    const encoded = absolute.split('/').map((part, index) =>
      index === 0 && /^[a-z]:$/i.test(part) ? part : encodeURIComponent(part)
    ).join('/');
    const suffix = parsed.kind === 'repository' || parsed.kind === 'directory' ? '/' : line ? `:${line}:1` : '';
    return `vscode://file/${encoded.replace(/^\//, '')}${suffix}`;
  }

  /**
   * Определяет знак ветки по уже принятым данным каталога, не угадывая вид произвольного ref.
   * @param {Target} input Адрес закладки без сохранённого доказательства доступа или вида Git-ссылки.
   * @returns {boolean} Ref совпадает с проверенным default_branch, веткой установки или нынешнего снимка; неизвестный ref и корень без ref дают false.
   */
  targetUsesBranch(input) {
    const target = readMaterialTarget(input);
    if (!target || target.kind === 'repository') return false;
    const repository = this.#repositoryFor(target.origin);
    if (!repository) return false;
    const library = this.#librarySources.get(repository);
    if (library) {
      return this.#defaultRefs.get(library.url.toLowerCase()) === target.ref
        || library.installation.source === 'github' && library.installation.refKind === 'branch'
          && library.installation.ref === target.ref;
    }
    const snapshot = this.#repositoryCache.get(repository)?.data;
    if (!snapshot || snapshot.ref !== target.ref || this.#policies.get(repository)?.branch !== target.ref) {
      return false;
    }
    return !snapshot.privateSource || !this.#blockedPrivate.has(target.origin.id)
        && Boolean(
          this.#privateAccess?.confirmed(target.origin.id)
            && this.#privateAccess.snapshotRevision(target.origin.id, target.ref),
        );
  }

  /**
   * Оформляет сырую ссылку синхронно; обычный внешний HTTP(S) остаётся внешним.
   * @param {string} value Исходный href; обычный внешний HTTP(S) адрес сохраняется.
   * @param {Target|null} contextTarget Нынешний материал, от которого разрешаются относительные ссылки.
   * @param {import('./material-target.mjs').LinkMode} mode Общий режим ссылок; обычные внешние HTTP(S) адреса сохраняют своё назначение.
   * @param {string} organizationRoot Местный абсолютный корень организации; хранится только в браузере.
   * @returns {string|null} Преобразованный известный адрес или обычный внешний HTTP(S); повреждённая ссылка даёт null.
   */
  linkHref(value, contextTarget, mode, organizationRoot) {
    const target = this.#linkTarget(value.trim(), contextTarget);
    if (target) return this.targetHref(target, mode, organizationRoot);
    if (!/^https?:\/\//i.test(value) || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
    try {
      const url = new URL(value);
      return url.username || url.password ? null : url.href;
    } catch {
      return null;
    }
  }

  /**
   * Выполняет действие ссылки; внутреннее раскрытие репозитория не создаёт просмотр.
   * @param {Target} target Проверенный смысловой адрес материала без DOM и доказательства доступа.
   * @returns {Promise<boolean>} Действие ссылки принято; недоступный внутренний материал или выключенный VS Code дают false.
   */
  async followTarget(target) {
    const mode = this.#options?.getLinkMode?.() || 'internal';
    if (mode === 'internal') {
      return this.#stageTreeNavigation(
        target.origin,
        target,
        null,
        null,
        false,
        target.kind === 'directory' && target.readmePath === null,
      );
    }
    const href = this.targetHref(target, mode, this.#options?.getOrganizationRoot?.() || '');
    if (!href) return false;
    displayWindow(this).open(href, '_blank', 'noopener,noreferrer');
    return true;
  }

  /**
   * Принимает исходную ссылку до ожидания её глубокого адреса, чтобы действие и индикатор были видны сразу.
   * @param {string} value Исходный href описания либо Markdown, не преобразованный VS Code адрес.
   * @param {Target|null} [contextTarget] Адрес документа для относительной ссылки; null у описания дерева.
   * @param {boolean} [information] Удержание открывает информацию внутри сайта независимо от режима короткого клика.
   * @returns {Promise<boolean>} Принятое действие; неизвестный repo/ref не получает выдуманного внутреннего адреса.
   */
  async followLink(value, contextTarget = null, information = false) {
    const raw = value.trim();
    const mode = information ? 'internal' : this.#options?.getLinkMode?.() || 'internal';
    if (mode !== 'internal') {
      const href = this.linkHref(raw, contextTarget, mode, this.#options?.getOrganizationRoot?.() || '');
      if (!href) return false;
      displayWindow(this).open(href, '_blank', 'noopener,noreferrer');
      return true;
    }
    const location = this.#linkLocation(raw, contextTarget);
    if (!location) return false;
    return this.#stageTreeNavigation(
      location.origin,
      null,
      raw,
      contextTarget,
      information,
      !information && contextTarget === null && location.directory,
    );
  }

  /**
   * Переоформляет href, сохраняя канонический нижний адрес.
   * @returns {void} Значение не возвращается; href переоформлен без изменения канонического footerTarget.
   */
  refreshLinkMode() {
    const mode = this.#options?.getLinkMode?.() || 'internal';
    const root = this.#options?.getOrganizationRoot?.() || '';
    if (this.#githubLink && this.#footerTarget) {
      const href = this.targetHref(this.#footerTarget, mode, root);
      if (href) this.#githubLink.href = href;
      else this.#githubLink.removeAttribute('href');
    }
    for (const element of this.querySelectorAll('.description a, .catalog-caption a')) {
      const link = /** @type {HTMLAnchorElement} */ (element);
      const original = link.dataset.originalHref || link.getAttribute('href') || '';
      if (!original) continue;
      link.dataset.originalHref = original;
      const target = this.#linkTarget(original, null);
      const location = this.#linkLocation(original, null);
      if (location) {
        const kind = !location.path ? 'repository' : location.directory
          ? 'directory'
          : location.anchor && /^L[1-9]\d*$/.test(location.anchor)
          ? 'line'
          : 'file';
        link.dataset.navigationLink = kind;
        link.dataset.navigationKind = kind;
        const extension = /\.([a-z\d]+)$/i.exec(location.path)?.[1]?.toLowerCase();
        if (extension && (kind === 'file' || kind === 'line')) link.dataset.navigationFileKind = extension;
        else delete link.dataset.navigationFileKind;
      } else {
        delete link.dataset.navigationLink;
        delete link.dataset.navigationKind;
        delete link.dataset.navigationFileKind;
      }
      showCaptionLinkIcon(link, Boolean(location));
      const href = this.linkHref(original, null, mode, root);
      if (href) link.href = href;
      else link.removeAttribute('href');
    }
  }

  /**
   * Подключает события сеанса и снимков; смена доступа отзывает прежние строки, запросы и закрытый текст.
   * @param {import('../../auth/github/access.mjs').GithubAccess} access GithubAccess, который проверяет снимки и читает закрытый текст; каталог не получает PAT.
   */
  setPrivateAccess(access) {
    this.#privateAccess = access;
    access.addEventListener('change', () => this.#forgetPrivateData());
    access.addEventListener('snapshot-state', (event) => {
      const { repo, state } = /** @type {CustomEvent<{repo:string,state:string}>} */ (event).detail;
      const repository = this.#repositories.find((item) => item.dataset.repository === repo);
      if (!repository) return;
      if (state === 'revoked' || state === 'missing') {
        this.#blockedPrivate.add(repo);
        this.#restorePublic(repository);
      } else if (state === 'updated') {
        const pending = this.#repositoryCache.get(repository)?.privatePromise;
        if (pending) void pending.then(() => this.#upgradePrivate(repository, this.#accessRevision, true));
        else void this.#upgradePrivate(repository, this.#accessRevision, true);
      } else {
        repository.dataset.level = String(this.#repositoryLevel(repository));
        this.#showFreshness(repository, state);
        if (this.#footerRepository === repository) this.#updatePrivateLock(repository);
      }
    });
  }

  /**
   * Смена PAT делает прежние ответы и строки недействительными, сохраняя публичный каталог.
   */
  #forgetPrivateData() {
    this.#cancelTreeNavigation();
    this.#clearHistoryPath();
    ++this.#accessRevision;
    this.#cancelGesture();
    this.#blockedPrivate.clear();
    for (const repository of this.#repositories) this.#options?.panel.forgetRepository(repository);
    for (const repository of this.#repositories) {
      this.#clearRepositoryLoading(repository);
      repository.dataset.level = String(this.#repositoryLevel(repository));
      const state = this.#repositoryCache.get(repository);
      if (!state) continue;
      if (
        this.#selected && repository.contains(this.#selected)
        && this.#selected !== repository.querySelector(':scope > summary')
      ) {
        this.#selected.classList.remove('is-selected');
        this.#selected = /** @type {HTMLElement|null} */ (repository.querySelector(':scope > summary'));
        this.#selected?.classList.add('is-selected');
      }
      repository.querySelector(':scope > .tree-list')?.remove();
      state.notice.remove();
      state.data = null;
      state.promise = null;
      state.privatePromise = null;
      state.rendered = false;
      state.presenting = false;
      delete repository.dataset.loaded;
      delete repository.dataset.loading;
      repository.removeAttribute('aria-busy');
    }
    this.#footerContext = null;
    this.#updateLink(this.#selected);
    this.#refreshTree();
    for (const repository of this.#repositories) if (repository.open) void this.#ensureRepository(repository);
  }

  /**
   * Возвращает токен ожидания: поздний ответ не снимает более новый лоадер.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @param {string} reason Ключ независимого ожидания: navigation, outline, freshness или version.
   * @param {string} label Готовая подпись для человека; не меняет адрес или право доступа.
   * @returns {object} Непостоянная идентичность ожидания для сравнения при позднем завершении; не PAT.
   */
  #beginRepositoryLoading(repository, reason, label) {
    let reasons = this.#repositoryLoading.get(repository);
    if (!reasons) {
      reasons = new Map();
      this.#repositoryLoading.set(repository, reasons);
    }
    const token = {};
    reasons.set(reason, { token, label });
    this.#showRepositoryLoading(repository);
    return token;
  }

  /**
   * Снимает причину лишь при совпадении токена текущего запроса.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @param {string} reason Ключ снимаемой причины ожидания репозитория.
   * @param {object} [token] Идентичность нынешнего ожидания; поздний чужой token не снимает его индикатор.
   */
  #endRepositoryLoading(repository, reason, token) {
    const reasons = this.#repositoryLoading.get(repository);
    if (!reasons?.has(reason) || (token && reasons.get(reason)?.token !== token)) return;
    reasons.delete(reason);
    if (!reasons.size) this.#repositoryLoading.delete(repository);
    this.#showRepositoryLoading(repository);
  }

  /**
   * Снимает все причины ожидания данного репозитория при отзыве данных или отключении загрузки.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   */
  #clearRepositoryLoading(repository) {
    this.#repositoryLoading.delete(repository);
    this.#showRepositoryLoading(repository);
  }

  /**
   * Показывает одну причину ожидания вместо значка репозитория.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   */
  #showRepositoryLoading(repository) {
    const row = repository.querySelector(':scope > summary');
    if (!row) return;
    const label = row.querySelector(':scope > .node-label');
    const icon = row.querySelector(':scope > svg[data-icon-group="repositories"]');
    let loader = row.querySelector(':scope > tree-loader.repository-loader');
    const reasons = this.#repositoryLoading.get(repository);
    if (!reasons && !loader) return;
    const active = this.#loadingDetached ? undefined : reasons;
    if (active?.size) {
      icon?.remove();
      if (!loader) {
        loader = new TreeLoader();
        loader.className = 'repository-loader';
        row.insertBefore(loader, label);
      }
      const reason = active.get('navigation') || active.get('outline') || active.get('freshness')
        || active.get('version');
      if (reason) loader.setAttribute('label', reason.label);
    } else {
      loader?.remove();
      if (!icon) row.insertBefore(createGroupedIcon('repository', 'repositories', this.#iconSettings), label);
    }
  }

  /**
   * Переводит фазу проверки местного закрытого снимка в loader или краткую подпись свежести.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @param {string} freshness Состояние проверки закрытого снимка, полученное от GithubAccess.
   */
  #showFreshness(repository, freshness) {
    const state = this.#repositoryCache.get(repository);
    if (!state?.data?.privateSource || !repository.open) {
      this.#endRepositoryLoading(repository, 'freshness');
      return;
    }
    const text = freshness === 'checking'
      ? ui.catalog.savedChecking
      : freshness === 'stale'
      ? ui.catalog.savedStale
      : freshness === 'cache-error'
      ? ui.catalog.cacheWriteFailed
      : '';
    if (freshness === 'checking') {
      if (!this.#repositoryLoading.get(repository)?.has('freshness')) {
        this.#beginRepositoryLoading(repository, 'freshness', text);
      }
      setStatus(state.notice);
      state.notice.remove();
    } else {
      this.#endRepositoryLoading(repository, 'freshness');
      setStatus(state.notice, text);
    }
    if (text && freshness !== 'checking') {
      repository.insertBefore(state.notice, repository.querySelector(':scope > .tree-list'));
    } else state.notice.remove();
    this.#refreshTree();
  }

  /**
   * Убирает закрытое дерево и возвращает публичный просмотр после отзыва снимка.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   */
  #restorePublic(repository) {
    const state = this.#repositoryCache.get(repository);
    if (!state) return;
    if (this.#historyPath?.has(repository)) this.#clearHistoryPath();
    this.#clearRepositoryLoading(repository);
    this.#cancelGesture();
    const name = repository.dataset.repository || '';
    const reopen = this.#options?.panel.showRepositoryUnavailable(
      repository,
      this.#privateAccess?.failure(name) || ui.catalog.privateData,
    );
    if (
      this.#selected && repository.contains(this.#selected)
      && this.#selected !== repository.querySelector(':scope > summary')
    ) {
      this.#selected.classList.remove('is-selected');
      this.#selected = /** @type {HTMLElement|null} */ (repository.querySelector(':scope > summary'));
      this.#selected?.classList.add('is-selected');
    }
    repository.querySelector(':scope > .tree-list')?.remove();
    state.notice.remove();
    state.data = null;
    state.promise = null;
    state.privatePromise = null;
    state.rendered = false;
    state.presenting = false;
    delete repository.dataset.loaded;
    if (repository.open) void this.#ensureRepository(repository);
    this.#updateLink(this.#selected);
    this.#refreshTree();
    if (reopen) {
      const summary = repository.querySelector(':scope > summary');
      if (summary && isHTMLElement(summary)) this.#openPreview(summary);
    }
  }

  /**
   * Меняет существующие SVG без пересоздания строк и сброса прокрутки.
   * @param {Partial<IconSettings>} settings Проверяемые настройки соответствующего владельца.
   */
  setIcons(settings) {
    Object.assign(this.#iconSettings, settings);
    const scroll = this.scrollTop;
    applyIcons(this, this.#iconSettings);
    this.scrollTop = scroll;
    this.#schedulePrefixes();
    if (!this.#connected()) return;
    const view = this.#display || displayWindow(this);
    const environment = this.#environment;
    view.cancelAnimationFrame(this.#iconFrame);
    this.#iconFrame = view.requestAnimationFrame(() => {
      if (environment !== this.#environment) return;
      this.#iconFrame = 0;
      if (this.#connected()) this.scrollTop = scroll;
    });
  }

  /**
   * Принимает настроенный срок удержания строки; значения вне 250–500 мс сохраняют прежний срок.
   * @param {number} duration Срок удержания строки в миллисекундах; допустимы 250–500.
   */
  setHoldDuration(duration) {
    if (Number.isInteger(duration) && duration >= 250 && duration <= 500) this.#holdDuration = duration;
  }

  /**
   * Приостанавливает только отображение для синхронного переноса координатором.
   * @param {CatalogMoveOptions} [options] Флаги восстановления фокуса при принятии и откате синхронного PiP-переноса.
   * @returns {import('../../app/picture-in-picture.mjs').PreparedMove} resume/rollback/commit для прежних DOM-узлов; логические выбор и кэши не копируются.
   */
  prepareMove({ restoreFocus = true, rollbackFocus = true } = {}) {
    this.#cancelTreeNavigation();
    if (this.#moving) throw new Error('The catalogue is already being moved');
    const scrollTop = this.scrollTop;
    const scrollLeft = this.scrollLeft;
    const active = this.ownerDocument.activeElement;
    const focused = isHTMLElement(active) && this.contains(active) ? active : null;
    const wasBound = Boolean(this.#events);
    let finished = false;
    /**
     * Подключает отображение в фактическом окне после переноса и восстанавливает его прокрутку.
     * @param {boolean} focus Восстановить захваченный фокус при возобновлении отображения.
     */
    const resume = (focus) => {
      if (finished) return;
      try {
        if (wasBound) this.#bind(true);
        this.scrollTop = scrollTop;
        this.scrollLeft = scrollLeft;
        if (focus && focused?.isConnected) focused.focus({ preventScroll: true });
      } catch (error) {
        this.#unbind();
        throw error;
      }
    };
    const rollback = () => {
      if (finished) return;
      try {
        this.#unbind();
        resume(rollbackFocus);
      } finally {
        this.querySelectorAll('tree-loader').forEach((loader) => /** @type {TreeLoader} */ (loader).restart());
        this.#moving = false;
        finished = true;
      }
    };
    this.#moving = true;
    try {
      this.#unbind();
    } catch (error) {
      try {
        rollback();
      } catch (failure) {
        throw new AggregateError([error, failure], 'Could not restore the catalogue after preparation failed');
      }
      throw error;
    }
    return {
      resume: () => resume(restoreFocus),
      rollback,
      commit: () => {
        this.#moving = false;
        finished = true;
      },
    };
  }

  /**
   * Проверяет действующую привязку каталога к документу вне синхронного переноса.
   * @returns Каталог подключён и способен принимать действия.
   */
  #connected() {
    return Boolean(this.#events && this.isConnected);
  }

  /**
   * Передаёт нынешние проверенные флаги значков владельцу настроек и панели.
   * @fires ProjectCatalog#icons-ready
   */
  #emitIcons() {
    if (this.#connected() && this.#siteState === 'ready') {
      this.dispatchEvent(new CustomEvent('icons-ready', { detail: { ...this.#iconSettings }, bubbles: true }));
    }
  }

  /**
   * Однократно находит каркас каталога и регистрирует статические репозитории.
   * @returns Каркас готов; при неполном HTML возвращается false.
   */
  #initialize() {
    if (this.#initialized) return true;
    this.#treeList = this.querySelector(':scope > .tree-list');
    if (!this.#treeList) return false;
    this.#repositories = [
      .../** @type {NodeListOf<HTMLDetailsElement>} */ (this.querySelectorAll('details[data-repository]')),
    ];
    this.#siteStatus = this.querySelector('#site-status');
    this.#libraryList = this.querySelector('#haxelib-list');
    this.#libraryStatus = this.querySelector('#haxelib-status');
    if (!this.#siteStatus || !this.#libraryList || !this.#libraryStatus) return false;
    this.#repositories.forEach((repository) => this.#registerRepository(repository));
    this.#selected = this.querySelector('.tree-row');
    this.#selected?.classList.add('is-selected');
    this.#initialized = true;
    return true;
  }

  /**
   * Подключает слушатели и наблюдатель; повторный вызов не дублирует их.
   * @returns {void} Подключает отображение без уничтожения выбора, снимков и кэшей экземпляра.
   */
  connect() {
    if (!this.#moving) this.#bind(false);
  }

  /**
   * Привязывает события, наблюдатель размеров и RAF к фактическому ownerDocument; preserve сохраняет прежнее состояние.
   * @param {boolean} preserve Сохранить прежний выбор и данные при перепривязке отображения.
   */
  #bind(preserve) {
    if (this.#events || !this.#options || !this.isConnected || !this.#initialize()) return;
    const document = this.ownerDocument;
    const view = displayWindow(this);
    const environment = ++this.#environment;
    this.#display = view;
    this.#events = new view.AbortController();
    if (!this.#search) {
      this.#search = new CatalogSearch(this,
        () => [...(this.#treeList?.querySelectorAll('.tree-row') || [])].filter(isHTMLElement),
        row => this.#selectSearchRow(row));
    }
    this.#search.connect();
    this.#githubLink = this.#options.footer.querySelector('#github-link');
    const help = this.#options.footer.querySelector('#keyboard-help');
    if (help?.ownerDocument === document) {
      this.setAttribute('aria-describedby', help.id);
      this.removeAttribute('aria-description');
    } else {
      this.removeAttribute('aria-describedby');
      const description = help?.getAttribute('aria-label') || help?.textContent?.replace(/\s+/g, ' ').trim();
      if (description) this.setAttribute('aria-description', description);
      else this.removeAttribute('aria-description');
    }
    this.#listen(this, 'toggle', this.#onToggle, { capture: true });
    this.#listen(this, 'focusin', this.#onFocus);
    this.#listen(this.#options.panel, 'view-open', this.#onViewOpen);
    this.#listen(this.#options.panel, 'document-select', this.#onDocumentSelect);
    this.#listen(this.#options.panel, 'view-close', this.#onViewClose);
    if (this.#githubLink) {
      this.#listen(this.#githubLink, 'click', event => {
        const click = /** @type {MouseEvent} */ (event);
        if (click.button !== 0 || click.ctrlKey || click.metaKey || click.altKey || click.shiftKey) return;
        if ((this.#options?.getLinkMode?.() || 'internal') === 'internal' && this.#footerTarget) {
          event.preventDefault();
          void this.followTarget(this.#footerTarget);
        }
      });
    }
    this.#listen(document, 'pointerdown', event => {
      this.#cancelTreeNavigation();
      const pointer = /** @type {PointerEvent} */ (event);
      if (pointer.isPrimary && pointer.button === 0) {
        this.#suppressReleaseClick = false;
        this.#cancelPress();
      } else this.#cancelGesture();
      this.#cancelInformationKey();
    }, { capture: true });
    this.#listen(document, 'focusin', event => {
      const intent = this.#treeNavigation;
      if (intent && !intent.committing && event.target !== intent.row) this.#cancelTreeNavigation();
    }, { capture: true });
    this.#listen(this, 'pointerdown', this.#onPointerDown);
    this.#listen(document, 'pointermove', this.#onPointerMove, { passive: true });
    this.#listen(document, 'pointerup', this.#onPointerUp, { passive: true });
    this.#listen(document, 'pointercancel', this.#cancelGesture, { passive: true });
    this.#listen(this, 'touchstart', this.#onTouchStart, { passive: true });
    this.#listen(this, 'touchmove', this.#onTouchMove, { passive: false });
    this.#listen(this, 'touchend', this.#endTouchScroll, { passive: true });
    this.#listen(this, 'touchcancel', event => {
      this.#cancelGesture();
      this.#endTouchScroll(/** @type {TouchEvent} */ (event));
    }, { passive: true });
    this.#listen(this, 'scroll', this.#cancelGesture, { capture: true, passive: true });
    if (this.#supportsScrollEnd()) this.#listen(this, 'scrollend', this.#onScrollEnd, { passive: true });
    else this.#listen(this, 'scroll', this.#onLegacyScroll, { passive: true });
    this.#listen(view, 'blur', () => {
      this.#cancelGesture();
      this.#cancelTreeNavigation();
    });
    this.#listen(this, 'focusout', this.#onHoldFocusOut);
    this.#listen(document, 'click', (event) => {
      if (this.#suppressReleaseClick && /** @type {MouseEvent} */ (event).detail > 0) {
        event.preventDefault();
        event.stopPropagation();
        this.#suppressReleaseClick = false;
      }
    }, { capture: true });
    this.#listen(this, 'contextmenu', (event) => {
      if (this.#press || this.#suppressReleaseClick) event.preventDefault();
    });
    this.#listen(this, 'click', this.#onClick);
    this.#listen(document, 'keydown', this.#onKeydown);
    this.#listen(document, 'keyup', this.#onInformationKeyUp);
    this.#observedWidth = null;
    this.#observer = new view.ResizeObserver(([entry]) => {
      if (environment !== this.#environment || this.#moving || !this.#connected()) return;
      const width = entry.contentRect.width;
      if (!Number.isFinite(width) || width === this.#observedWidth) return;
      this.#observedWidth = width;
      this.#schedulePrefixes();
    });
    this.#observer.observe(this);
    this.#loadingDetached = false;
    this.querySelectorAll('details[data-repository]').forEach((repository) =>
      this.#showRepositoryLoading(/** @type {HTMLDetailsElement} */ (repository))
    );
    if (preserve) {
      this.#schedulePrefixes();
      return;
    }
    this.#refreshTree();
    this.#updateLink(this.#selected);
    this.#emitIcons();
    for (
      const repository
        of /** @type {NodeListOf<HTMLDetailsElement>} */ (this.querySelectorAll('details[data-repository][open]'))
    ) {
      this.#ensureRepository(repository);
    }
    if (!this.#didFocus && this.#selected) {
      this.#selected.focus({ preventScroll: true });
      this.#didFocus = true;
    }
    if (!this.#sitePromise && this.#siteState !== 'ready') this.#sitePromise = this.#loadSite();
    else if (this.#siteState === 'ready' && this.#libraryState === 'idle') {
      this.#loadLibraryCatalogue(this.#librarySettings);
    }
  }

  /**
   * Отменяет действия интерфейса; общие запросы и готовые данные остаются у экземпляра.
   * @returns {void} Снимает отображение и жесты; готовые снимки остаются у экземпляра для повторного подключения.
   */
  disconnect() {
    if (this.#moving || !this.#events) return;
    this.#clearHistoryPath();
    this.#unbind();
    this.#loadingDetached = true;
    this.querySelectorAll('details[data-repository]').forEach((repository) =>
      this.#showRepositoryLoading(/** @type {HTMLDetailsElement} */ (repository))
    );
    this.#options?.panel.close({ restore: false });
  }

  /**
   * Отменяет привязки окна, RAF и незавершённые жесты без удаления данных дерева.
   */
  #unbind() {
    this.#search?.pause();
    this.#cancelTreeNavigation();
    ++this.#environment;
    this.#events?.abort();
    this.#events = null;
    this.#cancelGesture();
    this.#touchScroll = null;
    this.#lockedScrollAxis = null;
    this.#display?.clearTimeout(this.#scrollEndTimer);
    this.#scrollEndTimer = 0;
    this.#suppressReleaseClick = false;
    this.#display?.cancelAnimationFrame(this.#prefixFrame);
    this.#display?.cancelAnimationFrame(this.#iconFrame);
    this.#prefixFrame = this.#iconFrame = 0;
    this.#observer?.disconnect();
    this.#observer = null;
    this.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
  }

  /**
   * Слушатель связан с экземпляром и снимается общим AbortController.
   * @template {Event} E
   * @param {EventTarget} target Проверенный смысловой адрес материала без DOM и доказательства доступа.
   * @param {string} type Имя события узла или нынешнего окна.
   * @param {(event: E) => void} listener Обработчик события, связанный с this каталога и сроком его привязки.
   * @param {AddEventListenerOptions} [settings] Параметры слушателя, дополненные AbortSignal нынешней привязки окна.
   */
  #listen(target, type, listener, settings = {}) {
    if (!this.#events) return;
    const bound = listener.bind(this);
    target.addEventListener(type, (event) => {
      if (!this.#moving) bound(/** @type {E} */ (event));
    }, { ...settings, signal: this.#events.signal });
  }

  /**
   * Пересчитывает видимые соединители и признаки дочернего содержимого после изменения DOM.
   */
  #refreshTree() {
    if (!this.#treeList) return;
    refreshTree(this.#treeList);
    this.#schedulePrefixes();
  }

  /**
   * Объединяет запросы по кадру; расчёт префиксов не хранит состояние дерева.
   */
  #schedulePrefixes() {
    if (this.#prefixFrame || !this.#connected()) return;
    const view = this.#display || displayWindow(this);
    const environment = this.#environment;
    this.#prefixFrame = view.requestAnimationFrame(() => {
      if (environment !== this.#environment) return;
      this.#prefixFrame = 0;
      if (this.#connected()) updatePrefixes(this.#treeList, view);
    });
  }

  /**
   * Пересчитывает ветви после смены размера текста без изменения ширины.
   * @returns {void} Пересчитывает дерево и значки после изменения размера текста без замены данных.
   */
  refreshTextSize() {
    this.#schedulePrefixes();
  }

  /**
   * Выбирает канонический нижний адрес строки по её показанному снимку.
   * @param {HTMLElement | null} row Строка каталога; её соответствие данным принадлежит каталогу.
   */
  #updateLink(row) {
    if (!row || !this.#connected()) return;
    const repository = /** @type {HTMLDetailsElement | null} */ (row.closest('details[data-repository]'));
    const link = this.#nodeLinks.get(row);
    this.#footerTarget = this.#targetForRow(row);
    const url = row.dataset.url || link?.url || repository?.dataset.url || this.#organization;
    this.#setFooter(url, repository, row, link?.path);
  }

  /**
   * Показывает нижний адрес строки или принятого документа и заново вычисляет основания замка.
   * @param {string} url Канонический GitHub адрес выбранного материала до преобразования режима ссылки.
   * @param {HTMLDetailsElement | null} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @param {object} context Идентичность выбранной строки либо документа для сохранения его нижнего адреса.
   * @param {string} [path] Готовая компактная подпись адреса; не путь для сетевого запроса.
   * @param {boolean} [fileOpened] Нынешний нижний адрес получил успешное чтение материала; новый адрес сбрасывает это основание.
   */
  #setFooter(url, repository, context, path = url, fileOpened = false) {
    if (!this.#githubLink) return;
    showContext(this.#githubLink, { url, path });
    this.#footerRepository = repository;
    this.#footerFileOpened = fileOpened;
    this.#footerContext = context;
    this.#updatePrivateLock(repository);
    this.#checkPublicRepository(repository);
    this.refreshLinkMode();
  }

  /**
   * Проверяет публичность ссылки независимо от флага закрытого каталога.
   * @param {HTMLDetailsElement|null} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   */
  #checkPublicRepository(repository) {
    const name = repository?.dataset.repository;
    if (!repository || !name || this.#librarySources.has(repository) || this.#repositoryVisibility.has(name)) return;
    this.#repositoryVisibility.set(name, 'checking');
    void githubJson(`https://api.github.com/repos/Hxape/${encodeURIComponent(name)}`)
      .then((value) => {
        const data = isRecord(value) ? value : null;
        this.#repositoryVisibility.set(
          name,
          data?.private === false && typeof data.full_name === 'string'
            && data.full_name.toLowerCase() === `hxape/${name}`.toLowerCase()
            ? 'public'
            : 'unknown',
        );
      })
      .catch(() => {
        this.#repositoryVisibility.set(name, 'unknown');
      })
      .finally(() => {
        if (this.#footerRepository === repository) this.#updatePrivateLock(repository);
      });
  }

  /**
   * Замок отражает подтверждённый доступ или уже открытое содержимое.
   * @param {HTMLDetailsElement|null} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   */
  #updatePrivateLock(repository) {
    if (!this.#githubLink) return;
    const name = repository?.dataset.repository;
    const privateRepository = Boolean(
      repository && !this.#librarySources.has(repository) && this.#policies.get(repository)?.private
        && (!name || this.#repositoryVisibility.get(name) !== 'public'),
    );
    const confirmed = privateRepository
      && Boolean(repository?.dataset.repository && this.#privateAccess?.confirmed(repository.dataset.repository));
    const privateTreeLoaded = Boolean(
      privateRepository && repository && name && this.#privateAccess?.active
        && !this.#blockedPrivate.has(name) && this.#repositoryCache.get(repository)?.data?.privateSource,
    );
    if (!privateRepository) {
      showLock(this.#githubLink, { state: null });
      return;
    }
    const state = confirmed || this.#footerFileOpened || privateTreeLoaded ? 'open' : 'closed';
    const label = confirmed ? ui.catalog.privateAccessConfirmed : this.#footerFileOpened
      ? ui.catalog.privateContentOpened
      : privateTreeLoaded
      ? ui.catalog.privateTreeLoaded
      : ui.catalog.privateRepository;
    showLock(this.#githubLink, { state, description: label });
  }

  /**
   * Проверяет, может ли строка открыть просмотр при действующих настройках сайта.
   * @param {HTMLElement | null} row Строка каталога; её соответствие данным принадлежит каталогу.
   * @returns {boolean} Есть допустимый вид просмотра; это не доказательство доступа к raw-файлу.
   */
  #canPreview(row) {
    return Boolean(
      this.#siteState === 'ready' && row && (this.#docsNodes.has(row) || this.#rowNodes.get(row)?.type === 'directory'
        || (row.matches('summary') && row.parentElement?.matches('details[data-repository]'))),
    );
  }

  /**
   * Сразу передаёт строку в отменяемую подготовку панели; default_branch обычной команды библиотеки читается внутри её срока.
   * @param {HTMLElement} row Строка каталога; её соответствие данным принадлежит каталогу.
   * @param {'documentation'|'source'} [initialMode] Предпочтение DOCUMENTATION либо прямой переход в SOURCE; сохранённый выбор меняет сама панель.
   * @param {boolean} [applySourcePin] Удержание или Enter применяет закреплённый вид только к файлу; остальные строки сохраняют прежний выбор.
   * @returns {Promise<boolean>} Успех принятия просмотра; отказ подготовки не меняет прежний материал.
   */
  async #openPreview(row, initialMode = 'documentation', applySourcePin = false) {
    if (!this.#connected() || !this.#canPreview(row) || !this.#options) return false;
    const target = this.#targetForRow(row);
    if (!target) return false;
    const pinnedFile = applySourcePin && this.#rowNodes.get(row)?.type === 'file';
    if (target.origin.kind === 'haxelib') {
      return this.#stageTreeNavigation(
        target.origin,
        target,
        null,
        null,
        true,
        false,
        { row, initialMode, defaultBranch: true, applySourcePin: pinnedFile },
      );
    }
    return this.#options.panel.navigate(target, { initialMode, applySourcePin: pinnedFile });
  }

  /**
   * Сочетает опубликованный уровень с активным закрытым снимком и его подтверждением.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @returns {number} Нынешняя допустимая глубина; один PAT не подтверждает право raw-чтения.
   */
  #repositoryLevel(repository) {
    const level = this.#policies.get(repository)?.level || 0;
    if (this.#privateAccess?.active && !this.#librarySources.has(repository)) {
      if (this.#privateAccess.confirmed(repository.dataset.repository || '')) return 4;
      return this.#repositoryCache.get(repository)?.data?.privateSource ? 3 : Math.max(level, 3);
    }
    return level;
  }

  /**
   * Проверяет, должна ли строка показать отказ раскрытия вместо пустой ветви.
   * @param {HTMLElement} row Строка каталога; её соответствие данным принадлежит каталогу.
   * @returns {boolean} Строку нельзя раскрыть по нынешним данным и уровню.
   */
  #unavailable(row) {
    const repository = row.parentElement;
    return row.matches('summary') && isDetails(repository)
      && repository.hasAttribute('data-repository') && (this.#siteState !== 'ready'
        || (this.#repositoryLevel(repository) === 0
          && !repository.querySelector(':scope > .description.tree-content')));
  }

  /**
   * Загружает каталог установленных библиотек; после отказа повтор разрешён.
   * @param {unknown} settings Часть site.json haxelib до проверки каталога и настроек установок.
   * @returns {Promise<void>} Завершение регистрации либо показанного отказа; ошибочные данные не становятся настройками.
   */
  #loadLibraryCatalogue(settings) {
    if (this.#libraryPromise) return this.#libraryPromise;
    const status = this.#libraryStatus;
    const libraryList = this.#libraryList;
    if (!status || !libraryList) return Promise.reject(new Error('The library catalogue is not initialized'));
    this.#libraryState = 'loading';
    status.hidden = false;
    setLoading(status, ui.catalog.loadingLibraries, true);
    this.#refreshTree();
    this.#libraryPromise = Promise.resolve().then(async () => {
      if (!isRecord(settings) || typeof settings.catalog !== 'string') {
        throw new Error('Library catalogue is not configured');
      }
      const catalogueUrl = settings.catalog;
      const data = /** @type {unknown} */ (await withinRequestTime(async (signal) => {
        const response = await fetch(localResource(catalogueUrl), { credentials: 'omit', cache: 'no-cache', signal });
        if (!response.ok) throw new Error('Library catalogue request failed');
        return response.json();
      }));
      if (!isRecord(data) || !Array.isArray(data.libraries)) throw new Error('Invalid library catalogue');
      /**
       * @type {Set<string>}
       */
      const names = new Set();
      /**
       * @type {Array<keyof LibrarySource>}
       */
      const fields = ['name', 'version', 'url', 'ref', 'root', 'documentsPath', 'outline', 'packagePath', 'localPath'];
      const libraries = /** @type {unknown[]} */ (data.libraries).filter((entry) => {
        if (!isRecord(entry)) throw new Error('Invalid library entry');
        const librarySettings = isRecord(settings.libraries) ? settings.libraries[String(entry.name)] : null;
        return !isRecord(librarySettings) || librarySettings.visible !== false;
      }).map((entry) => {
        if (!isRecord(entry)) throw new Error('Invalid library entry');
        const installation = entry.installation;
        if (
          !fields.every((key) => typeof entry[key] === 'string')
          || (entry.dev !== undefined && typeof entry.dev !== 'boolean')
          || !isRecord(installation) || typeof installation.source !== 'string'
          || !['haxelib', 'github', 'unknown'].includes(installation.source)
          || (installation.source === 'github'
            && (typeof installation.refKind !== 'string' || !['branch', 'tag'].includes(installation.refKind)
              || typeof installation.ref !== 'string' || !installation.ref || typeof installation.sha !== 'string'
              || !/^[0-9a-f]{40}$/.test(installation.sha)))
          || typeof entry.name !== 'string' || !entry.name || typeof entry.version !== 'string' || !entry.version
          || typeof entry.ref !== 'string' || !entry.ref || names.has(entry.name)
          || !materialPath(entry.localPath) || !entry.localPath.startsWith('.haxelib/')
        ) throw new Error('Invalid library entry');
        names.add(entry.name);
        // Все поля LibrarySource проверены выше; сырые дополнительные поля не участвуют в договоре.
        const library = /** @type {LibrarySource} */ (/** @type {unknown} */ (entry));
        return { ...library, url: githubLocation(library.url).url, outline: localResource(library.outline) };
      }).sort((a, b) => a.name.localeCompare(b.name));
      libraryList.style.setProperty(
        '--library-name-width',
        `${Math.max(0, ...libraries.map((library) => library.name.length)) + 2}ch`,
      );
      const list = this.ownerDocument.createDocumentFragment();
      for (const library of libraries) {
        const entry = cloneBranch(this.ownerDocument);
        const repository = /** @type {HTMLDetailsElement} */ (entry.firstElementChild);
        repository.dataset.repository = library.name;
        repository.dataset.library = library.name;
        repository.dataset.url = library.url;
        const row = /** @type {HTMLElement} */ (repository.querySelector('summary'));
        row.classList.add('repository-row');
        /**
         * @type {HTMLSpanElement}
         */ (row.querySelector('.node-label')).textContent = library.name;
        row.prepend(createGroupedIcon('repository', 'repositories', this.#iconSettings));
        const source = versionSourceIcon(library.installation, this.ownerDocument);
        const installation = library.installation;
        const label = !source ? undefined : installation.source === 'haxelib'
          ? formatText(ui.catalog.installedHaxelib, { version: library.version })
          : installation.source === 'github'
          ? formatText(
            installation.refKind === 'branch' ? ui.catalog.installedGitHubBranch : ui.catalog.installedGitHubTag,
            { version: library.version, ref: installation.ref },
          )
          : undefined;
        const installed = installedVersion(this.ownerDocument, {
          text: formatText(ui.catalog.installedVersion, { version: library.version }),
          icon: source,
          label,
        });
        row.append(installed);
        this.#librarySources.set(repository, library);
        this.#registerRepository(repository, {
          private: false,
          branch: 'main',
          level: 4,
          documents: { README: true, CONTRIBUTING: true, AGENTS: true, LICENSE: true },
        });
        list.append(entry);
      }
      libraryList.replaceChildren(list);
      setStatus(status, libraries.length ? '' : ui.catalog.noLibraries);
      status.hidden = libraries.length > 0;
      this.#libraryState = 'ready';
      this.#refreshTree();
      this.refreshLinkMode();
    }).catch(() => {
      this.#libraryState = 'error';
      const retry = treeRetry(status.ownerDocument, ui.catalog.retry, 'retry-libraries');
      setStatus(status, status.ownerDocument.createTextNode(ui.catalog.librariesFailed), retry);
      this.#refreshTree();
    }).finally(() => {
      this.#libraryPromise = null;
    });
    return this.#libraryPromise;
  }

  /**
   * Проверяет выпуск при открытии библиотеки; отказ допускает следующий повтор.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   */
  #checkLibraryRelease(repository) {
    const library = this.#librarySources.get(repository);
    if (!library || this.#releaseKnown.has(repository) || this.#releasePending.has(repository)) return;
    if (library.installation.source === 'unknown') {
      this.#releaseKnown.add(repository);
      return;
    }
    const row = repository.querySelector(':scope > summary');
    const token = this.#beginRepositoryLoading(repository, 'version', ui.catalog.checkingVersion);
    const pending = import('./releases.mjs').then(async ({ publishedLibraryVersion, compareVersions }) => ({
      release: await publishedLibraryVersion(library),
      compareVersions,
    })).then(({ release, compareVersions }) => {
      this.#releaseKnown.add(repository);
      if (!release || !repository.isConnected || this.#librarySources.get(repository) !== library) return;
      const order = compareVersions(library.version, release.version);
      if (order === null || order === 0) return;
      const label = formatText(
        release.source === 'haxelib' ? ui.catalog.publishedHaxelib : ui.catalog.publishedGitHub,
        { version: release.displayVersion },
      );
      const newer = order < 0;
      const checked = release.checkedAt
        ? formatText(ui.catalog.publicationCheckedAt, { date: release.checkedAt.slice(0, 10) })
        : '';
      const badge = publishedVersion(this.ownerDocument, {
        text: newer ? label : release.displayVersion,
        icon: versionSourceIcon({ source: release.source, refKind: release.refKind }, this.ownerDocument),
        newer,
        label: checked ? `${label}. ${checked}` : !newer ? label : undefined,
      });
      row?.append(badge);
    }).catch(() => {}).finally(() => {
      this.#endRepositoryLoading(repository, 'version', token);
      if (this.#releasePending.get(repository) === pending) this.#releasePending.delete(repository);
    });
    this.#releasePending.set(repository, pending);
  }

  /**
   * Находит документы библиотеки на уже выбранном ref; готовый Markdown кэширует публичный загрузчик.
   * @param {LibrarySource} library Проверенные сведения об установке и источнике библиотеки.
   * @param {CatalogNode | RepositoryDocumentScope} node Узел дерева, чей вид и путь определяют действие.
   * @param {AbortSignal} signal Отмена вызывающей стороны; результат после отмены не принимается.
   * @param {string} ref Явная ветка, тег или коммит; не выводится из первого сегмента пути.
   * @param {boolean} refresh Явно перечитать материал, обходя готовый текстовый кэш.
   * @returns {Promise<PublicDocuments>} Документы, порядок и actual ref; чужой raw-host или отказ чтения отклоняют подготовку.
   */
  #loadPublicDocuments(library, node, signal, ref, refresh) {
    const directory = node.type === 'directory';
    const path = directory ? repositoryPath(library.root, node.path) : repositoryPath(library.documentsPath);
    const location = githubLocation(library.url);
    return (async () => {
      if (signal.aborted) throw signal.reason;
      /**
       * Получает метаданные обычных файлов одного каталога публичной библиотеки на выбранном ref.
       * @param {string} path Нормализованный путь каталога относительно Git-корня; пустая строка обозначает корень.
       * @returns {Promise<GitHubFile[]>} Проверенные метаданные файлов указанного каталога GitHub; не их тексты.
       */
      async function listAt(path) {
        const entries = await githubJson(
          `${location.api}/contents${path ? `/${encodedPath(path)}` : ''}?ref=${encodeURIComponent(ref)}`,
          signal,
        );
        if (!Array.isArray(entries)) throw new Error('Expected a GitHub directory');
        /**
         * @type {GitHubFile[]}
         */
        const files = [];
        for (const entry of /** @type {unknown[]} */ (entries)) {
          if (!entry || typeof entry !== 'object') throw new Error('Invalid GitHub entry');
          if (!('type' in entry) || entry.type !== 'file') continue;
          if (
            !('name' in entry) || typeof entry.name !== 'string' || !entry.name
            || !('path' in entry) || typeof entry.path !== 'string' || !entry.path
            || !('download_url' in entry) || (typeof entry.download_url !== 'string' && entry.download_url !== null)
          ) {
            throw new Error('Invalid GitHub file');
          }
          /**
           * @type {GitHubFile}
           */
          const file = { type: 'file', name: entry.name, path: entry.path, download_url: entry.download_url };
          if ('html_url' in entry && typeof entry.html_url === 'string') file.html_url = entry.html_url;
          files.push(file);
        }
        return files;
      }
      const [entries, rootEntries] = await Promise.all([
        listAt(path),
        !directory && path ? listAt('') : Promise.resolve([]),
      ]);
      if (signal.aborted) throw signal.reason;
      /**
       * @type {Map<string, GitHubFile>}
       */
      const files = new Map();
      for (const file of entries.filter((entry) => publicDocument(entry.name, directory))) files.set(file.path, file);
      for (const file of rootEntries.filter((entry) => legalDocument(entry.name) && !/\.hx$/i.test(entry.name))) {
        files.set(file.path, file);
      }
      const ordered = [...files.values()].sort((a, b) =>
        documentPriority(a.name) - documentPriority(b.name) || a.path.localeCompare(b.path)
      );
      const documents = await Promise.all(ordered.map(async (file) => {
        if (typeof file.download_url !== 'string') throw new Error('Invalid GitHub document');
        const download = new URL(file.download_url);
        if (download.origin !== 'https://raw.githubusercontent.com' || download.username || download.password) {
          throw new Error('Unexpected document host');
        }
        const content = await loadPublicDocument({ url: location.url, ref, path: file.path }, signal, { refresh });
        /**
         * @type {PublicDocument}
         */
        const document = {
          name: file.name,
          path: file.path,
          format: /\.(md|markdown)$/i.test(file.name) ? 'markdown' : 'text',
          content,
        };
        if (typeof file.html_url === 'string' && file.html_url.startsWith(`${location.url}/blob/`)) {
          document.url = file.html_url;
        }
        return /** @type {[string, PublicDocument]} */ ([file.path, document]);
      }));
      return {
        url: location.url,
        ref,
        documents: Object.fromEntries(documents),
        order: ordered.map((file) => file.path),
      };
    })();
  }

  /**
   * До успешной проверки site.json запросы деревьев закрыты; сырой JSON не становится
   * настройкой до проверки адреса организации, политик и значков.
   * @returns {Promise<void>} Завершение проверки настроек или показа их отказа с повтором; ошибочный JSON не принимается.
   */
  async #loadSite() {
    const status = this.#siteStatus;
    if (!status) return;
    this.#siteState = 'loading';
    setLoading(status, ui.catalog.loadingSettings);
    status.hidden = false;
    try {
      const settings = /** @type {unknown} */ (await withinRequestTime(async (signal) => {
        const response = await fetch('public/json/site.json', { signal, cache: 'no-cache' });
        if (!response.ok) throw new Error('Settings request failed');
        return response.json();
      }));
      if (
        !isRecord(settings) || typeof settings.organization !== 'string'
        || !/^https:\/\/github\.com\/[a-z0-9-]+\/?$/i.test(settings.organization) || !isRecord(settings.repositories)
      ) {
        throw new Error('Invalid site settings');
      }
      const defaults = readPolicy(
        { private: true, branch: 'main', level: 0, documents: noDocuments },
        settings.defaults,
      );
      const entries = new Map(
        Object.entries(settings.repositories).map(([name, entry]) => [name, readPolicy(defaults, entry)]),
      );
      if (settings.icons !== undefined && !isRecord(settings.icons)) {
        throw new Error('Invalid icon settings');
      }
      const rawIcons = isRecord(settings.icons) ? settings.icons : {};
      const icons = { ...this.#iconSettings };
      for (const name of /** @type {Array<keyof IconSettings>} */ (Object.keys(icons))) {
        if (!Object.hasOwn(rawIcons, name)) continue;
        const value = rawIcons[name];
        if (typeof value !== 'boolean') throw new Error('Invalid icon settings');
        icons[name] = value;
      }
      this.#organization = settings.organization.replace(/\/$/, '');
      Object.assign(this.#iconSettings, icons);
      for (const repository of this.#repositories) {
        const name = /** @type {string} */ (repository.dataset.repository);
        const policy = entries.get(name) || defaults;
        this.#policies.set(repository, policy);
        repository.dataset.level = String(this.#repositoryLevel(repository));
        repository.dataset.url = `${this.#organization}/${encodeURIComponent(name)}`;
        const row = /** @type {HTMLElement} */ (repository.querySelector(':scope > summary'));
        row.removeAttribute('aria-disabled');
        row.setAttribute('aria-haspopup', 'dialog');
        row.querySelector(':scope > [data-icon-group="repositories"]')?.remove();
        row.insertBefore(
          createGroupedIcon('repository', 'repositories', this.#iconSettings),
          row.querySelector('.node-label'),
        );
      }
      setStatus(status);
      status.hidden = true;
      this.#siteState = 'ready';
      this.#librarySettings = settings.haxelib || null;
      this.setIcons(this.#iconSettings);
      this.#emitIcons();
      this.#updateLink(this.#selected);
      this.refreshLinkMode();
      if (this.#connected()) this.#loadLibraryCatalogue(this.#librarySettings);
    } catch {
      this.#siteState = 'error';
      this.#repositories.forEach((repository) => {
        this.#policies.set(repository, { private: true, branch: 'main', level: 0, documents: noDocuments });
        repository.dataset.level = '0';
        repository.open = false;
        repository.querySelector('summary')?.setAttribute('aria-disabled', 'true');
      });
      const retry = treeRetry(status.ownerDocument, ui.catalog.retry, 'retry-site');
      setStatus(status, status.ownerDocument.createTextNode(ui.catalog.settingsFailed), retry);
      status.hidden = false;
      this.#sitePromise = null;
    }
  }

  /**
   * Дерево и документы репозитория разделяют запрос; в кэш попадают только разрешённые данные.
   * Ревизия доступа не даёт позднему ответу прежнего PAT заменить нынешний снимок.
   * @param {HTMLDetailsElement} repository Зарегистрированный details, которому принадлежат кэш, политика и индикатор ожидания.
   * @returns {Promise<RepositorySnapshot>} Нынешний снимок; поздний ответ прежнего доступа и ошибки JSON не принимаются.
   */
  #loadRepository(repository) {
    if (this.#siteState !== 'ready') return Promise.reject(new Error('Site settings are unavailable'));
    const state = this.#repositoryCache.get(repository);
    const policy = this.#policies.get(repository);
    const name = repository.dataset.repository;
    if (!state || !policy || !name) return Promise.reject(new Error('Repository is not registered'));
    if (state.data) return Promise.resolve(state.data);
    if (state.promise) return state.promise;
    repository.dataset.loading = 'true';
    const revision = this.#accessRevision;
    const pending = Promise.resolve().then(async () => {
      const library = this.#librarySources.get(repository);
      if (library) this.#checkLibraryRelease(repository);
      const response = await withinRequestTime(async (signal) => {
        const result = await fetch(
          library ? library.outline : `public/json/repositories/${encodeURIComponent(name)}.json`,
          { credentials: library ? 'omit' : 'same-origin', cache: 'no-cache', signal },
        );
        return { status: result.status, data: /** @type {unknown} */ (result.ok ? await result.json() : null) };
      });
      let data = response.data;
      // Только 404 означает отсутствие опубликованного файла и разрешает первичный запрос закрытого снимка.
      if (
        !data && (library || response.status !== 404 || !this.#privateAccess?.active || this.#blockedPrivate.has(name))
      ) throw new Error('Repository request failed');
      let privateSource = false;
      if (!data && this.#privateAccess) {
        data = await this.#privateAccess.snapshot(name, false, policy.branch);
        privateSource = true;
      }
      if (revision !== this.#accessRevision) throw new Error('Repository access changed');
      const snapshot = this.#readSnapshot(repository, data, policy, library, privateSource);
      if (revision !== this.#accessRevision) throw new Error('Repository access changed');
      state.data = snapshot;
      repository.dataset.url = snapshot.url;
      if (!library && !privateSource && this.#privateAccess?.active && !this.#blockedPrivate.has(name)) {
        void this.#upgradePrivate(repository, revision);
      }
      return snapshot;
    }).finally(() => {
      if (state.promise === pending) {
        state.promise = null;
        delete repository.dataset.loading;
      }
    });
    state.promise = pending;
    return pending;
  }

  /**
   * Передаёт сырые данные в проверку снимка без доверия типу ответа JSON.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @param {unknown} data Внешний JSON структуры до проверки и ограничения policy.
   * @param {RepositoryPolicy} policy Нынешние права публикации, уровень дерева и ветка репозитория.
   * @param {LibrarySource|undefined} library Проверенные сведения об установке и источнике библиотеки.
   * @param {boolean} privateSource Снимок получен через GithubAccess, а не из опубликованного JSON.
   * @returns {RepositorySnapshot} Проверенный ограниченный снимок; несовместимая форма вызывает отказ.
   */
  #readSnapshot(repository, data, policy, library, privateSource) {
    return readSnapshot(
      repository.dataset.repository || '',
      repository.dataset.url || '',
      data,
      policy,
      library,
      privateSource,
    );
  }

  /**
   * Повторяет закрытую загрузку после ожидания уже начатой проверки; смена доступа отменяет повтор.
   * @param {string} name Имя зарегистрированного репозитория Hxape для повторной проверки доступа и снимка.
   * @returns Закрытый снимок успешно обновлён и принят каталогом.
   */
  async retryPrivate(name) {
    const revision = this.#accessRevision;
    const repository = this.#repositories.find((item) => item.dataset.repository === name);
    if (!repository || !this.#privateAccess?.active) return false;
    const pending = this.#repositoryCache.get(repository)?.privatePromise;
    if (pending) await pending;
    if (revision !== this.#accessRevision || !this.#privateAccess?.active) return false;
    this.#blockedPrivate.delete(name);
    return this.#upgradePrivate(repository, revision, false, true);
  }

  /**
   * Заменяет публичное дерево закрытым снимком после проверки ревизии доступа.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @param {number} revision Ревизия доступа, захваченная до асинхронной работы.
   * @param {boolean} [cachedOnly] Читать уже доступную местную копию без запуска проверки GitHub.
   * @param {boolean} [force] Явный повтор, обходящий прежний результат там, где это разрешено.
   * @returns {Promise<boolean>} Закрытый снимок принят в данные каталога; отказ или смена доступа дают false.
   */
  async #upgradePrivate(repository, revision, cachedOnly = false, force = false) {
    const state = this.#repositoryCache.get(repository);
    const policy = this.#policies.get(repository);
    const name = repository.dataset.repository;
    if (
      !state || !policy || !name || state.privatePromise || !this.#privateAccess?.active
      || this.#blockedPrivate.has(name)
    ) return false;
    // Только явный повтор обходит снимок в памяти и снова сверяет данные с GitHub.
    const pending = (force
      ? this.#privateAccess.refresh(name, policy.branch)
      : this.#privateAccess.snapshot(name, cachedOnly, policy.branch)).then((data) => {
        // Поздний ответ не должен вернуть в дерево снимок для прежнего PAT.
        if (revision !== this.#accessRevision || this.#blockedPrivate.has(name)) return false;
        const snapshot = this.#readSnapshot(repository, data, policy, undefined, true);
        if (this.#preparing.has(repository)) {
          state.data = snapshot;
          state.rendered = false;
          return true;
        }
        if (
          this.#selected && repository.contains(this.#selected)
          && this.#selected !== repository.querySelector(':scope > summary')
        ) {
          this.#selected.classList.remove('is-selected');
          this.#selected = /** @type {HTMLElement|null} */ (repository.querySelector(':scope > summary'));
          this.#selected?.classList.add('is-selected');
        }
        this.#options?.panel.forgetDetachedRows(repository);
        state.data = snapshot;
        state.rendered = false;
        repository.dataset.level = String(this.#repositoryLevel(repository));
        repository.dataset.url = snapshot.url;
        setStatus(state.notice);
        state.notice.remove();
        this.#renderRepositoryTree(repository, snapshot);
        this.#showFreshness(repository, this.#privateAccess?.freshness(name) || 'current');
        this.#updateLink(this.#selected);
        return true;
      }).catch((error) => {
        if (revision !== this.#accessRevision) return false;
        setStatus(
          state.notice,
          this.#privateAccess?.failure(name)
            || (error instanceof Error ? error.message : ui.catalog.privateUpdateFailed),
        );
        if (repository.open) repository.insertBefore(state.notice, repository.querySelector(':scope > .tree-list'));
        this.#refreshTree();
        return false;
      }).finally(() => {
        if (state.privatePromise === pending) state.privatePromise = null;
      });
    state.privatePromise = pending;
    return pending;
  }

  /**
   * Связывает новые строки с узлами только после проверки текущего снимка; карты остаются у каталога.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @param {RepositorySnapshot} snapshot Проверенный снимок дерева, к которому относится операция.
   * @param {boolean} [preserveView] Сохранить прежний принятый просмотр во время подготовки перехода или принятия обновления.
   */
  #renderRepositoryTree(repository, snapshot, preserveView = false) {
    const state = this.#repositoryCache.get(repository);
    if (!state || state.rendered || state.data !== snapshot || this.#repositoryLevel(repository) === 0) return;
    const { list, rows } = renderNodes(
      snapshot.children,
      snapshot,
      readCaptions(repository),
      this.#iconSettings,
      this.ownerDocument,
    );
    for (const { row, node, link, docs } of rows) {
      this.#rowNodes.set(row, node);
      this.#rowSnapshots.set(row, snapshot);
      this.#nodeLinks.set(row, link);
      if (docs) this.#docsNodes.set(row, node);
    }
    const previous = repository.querySelector(':scope > .tree-list');
    const expansion = this.#captureBranchExpansion(previous);
    if (previous) {
      if (this.#selected && previous.contains(this.#selected)) {
        this.#selected.classList.remove('is-selected');
        this.#selected = /** @type {HTMLElement|null} */ (repository.querySelector(':scope > summary'));
        this.#selected?.classList.add('is-selected');
      }
      if (!preserveView) this.#options?.panel.forgetDetachedRows(repository);
      previous.remove();
    }
    this.#restoreBranchExpansion(list, expansion);
    if (list.childElementCount) repository.append(list);
    if (!state.notice.hasAttribute('data-loading') && statusBody(state.notice).hasChildNodes()) {
      repository.insertBefore(state.notice, repository.querySelector(':scope > .tree-list'));
    } else {
      state.notice.remove();
      setStatus(state.notice);
    }
    state.rendered = true;
    repository.dataset.loaded = 'true';
    this.#refreshTree();
    this.refreshLinkMode();
    if (snapshot.privateSource) {
      this.#showFreshness(repository, this.#privateAccess?.freshness(repository.dataset.repository || '') || 'current');
    }
    if (repository.contains(this.#selected) && this.#footerContext === this.#selected) this.#updateLink(this.#selected);
  }

  /**
   * Создаёт состояние известного репозитория и убирает неподтверждённые дочерние строки.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @param {RepositoryPolicy} [policy] Нынешние права публикации, уровень дерева и ветка репозитория.
   */
  #registerRepository(repository, policy = { private: true, branch: 'main', level: 0, documents: noDocuments }) {
    if (this.#repositoryCache.has(repository)) return;
    this.#policies.set(repository, policy);
    repository.dataset.level = String(this.#repositoryLevel(repository));
    repository.open = false;
    const row = repository.querySelector(':scope > summary');
    if (!row) throw new Error('Repository summary is missing');
    if (this.#siteState === 'ready') row.setAttribute('aria-haspopup', 'dialog');
    else row.setAttribute('aria-disabled', 'true');
    [...repository.children].filter((child) =>
      child !== row && !child.matches(`p.description.tree-content, ${captionTemplateSelector}`)
    ).forEach((child) => child.remove());
    const notice = element('p', 'description label-row muted nonselectable');
    notice.setAttribute('role', 'status');
    this.#repositoryCache.set(repository, {
      data: null,
      promise: null,
      privatePromise: null,
      rendered: false,
      presenting: false,
      notice,
    });
  }

  /**
   * Поздний ответ сохраняется в кэше, но не раскрывает закрытый или отключённый узел.
   * @param {HTMLDetailsElement} repository Узел зарегистрированного репозитория в нынешнем каталоге.
   * @returns {Promise<void>} Завершение ожидания дерева; поздний ответ не раскрывает закрытую либо отключённую ветвь.
   */
  async #ensureRepository(repository) {
    const state = this.#repositoryCache.get(repository);
    if (!state) return;
    if (this.#siteState !== 'ready' || this.#repositoryLevel(repository) === 0) {
      if (this.#siteState !== 'ready' || !repository.querySelector(':scope > .description.tree-content')) {
        repository.open = false;
      }
      return;
    }
    if (!this.#connected() || !repository.open || state.rendered || state.presenting) return;
    state.presenting = true;
    const revision = this.#accessRevision;
    const { notice } = state;
    const token = this.#beginRepositoryLoading(repository, 'outline', ui.catalog.loading);
    setStatus(notice);
    notice.remove();
    repository.setAttribute('aria-busy', 'true');
    this.#refreshTree();
    try {
      const snapshot = await this.#loadRepository(repository);
      if (
        revision !== this.#accessRevision || this.#repositoryLoading.get(repository)?.get('outline')?.token !== token
      ) return;
      if (this.#connected() && repository.open && !this.#preparing.has(repository)) {
        this.#renderRepositoryTree(repository, snapshot);
      } else {
        notice.remove();
        setStatus(notice);
      }
    } catch {
      if (
        revision !== this.#accessRevision || this.#repositoryLoading.get(repository)?.get('outline')?.token !== token
      ) return;
      setStatus(
        notice,
        this.#privateAccess?.failure(repository.dataset.repository || '') || ui.catalog.repositoryFailed,
      );
      if (repository.open) repository.insertBefore(notice, repository.querySelector(':scope > .tree-list'));
      if (this.#connected()) this.#refreshTree();
    } finally {
      const current = this.#repositoryLoading.get(repository)?.get('outline')?.token === token;
      this.#endRepositoryLoading(repository, 'outline', token);
      if (revision === this.#accessRevision && current) {
        state.presenting = false;
        repository.removeAttribute('aria-busy');
      }
    }
  }

  /**
   * Снимает таймер и сигнал готовности строки/ссылки без выполнения действия.
   * @returns {void} Освобождает нынешнее нажатие; подавление release-click отдельно задаётся принятием или отменой жеста.
   */
  #cancelPress() {
    if (this.#press) {
      this.#display?.clearTimeout(this.#press.timer);
      this.#press.row.removeAttribute('data-hold-ready');
    }
    this.#press = null;
  }

  /**
   * Отменяет клавиатурное ожидание каталога и принадлежащее ему удержание PiP панели.
   * @returns {void} Поздний ответ обычной информации больше не может начать PiP hold.
   */
  #cancelInformationKey() {
    if (!this.#informationKeyHold) return;
    this.#informationKeyHold = null;
    this.#options?.panel.cancelPiPHold();
  }

  /**
   * Отменяет указательное удержание и E для PiP, сохраняя выбранную ось нынешней прокрутки.
   */
  #cancelGesture() {
    if (this.#press) this.#suppressReleaseClick = true;
    this.#cancelPress();
    this.#cancelInformationKey();
  }

  /**
   * Оставляет удержание при штатном фокусе ссылки или открываемой информации; другой фокус его отменяет.
   * @param {FocusEvent} event Уход фокуса из строки нынешнего каталога.
   * @returns {void} Переход на сам удерживаемый элемент или в открываемую панель не считается отменой.
   */
  #onHoldFocusOut(event) {
    const next = event.relatedTarget;
    if (this.#press && (!isElement(next) || !this.#press.row.contains(next))) {
      this.#suppressReleaseClick = true;
      this.#cancelPress();
    }
    const hold = this.#informationKeyHold;
    if (
      hold && next !== hold.row && (!isElement(next) || !this.#options?.panel.contains(next))
    ) this.#cancelInformationKey();
  }

  /**
   * Завершает E пользовательским событием; готовый PiP запрашивает окно до любого ожидания.
   * @param {KeyboardEvent} event Отпускание E в нынешнем документе каталога или панели.
   * @returns {void} Обычная информация уже открывалась на keydown; отменённое или короткое PiP-удержание не переносит её.
   */
  #onInformationKeyUp(event) {
    if (event.code !== 'KeyE' || !this.#informationKeyHold) return;
    this.#informationKeyHold = null;
    if (isCommandKey(event, 'KeyE')) {
      if (this.#options?.panel.finishPiPHold()) event.preventDefault();
    } else this.#options?.panel.cancelPiPHold();
  }

  /**
   * Начинает ленивую загрузку лишь для раскрытого зарегистрированного репозитория.
   * @param {Event} event Toggle элемента details текущего каталога.
   */
  #onToggle(event) {
    this.#schedulePrefixes();
    if (isDetails(event.target)) {
      const branch = event.target;
      if (this.#historyToggles.get(branch) !== branch.open) {
        this.#temporaryHistoryBranches.delete(branch);
        this.#temporarySearchBranches.delete(branch);
      }
      this.#historyToggles.delete(branch);
      if (this.#repositoryCache.has(branch)) {
        if (branch.open) this.#checkLibraryRelease(branch);
        this.#ensureRepository(branch);
      }
    }
  }

  /**
   * Меняет единственный выбор дерева и нижний адрес; ссылки приписок не становятся выбранной строкой.
   * @param {FocusEvent} event Focusin строки каталога текущего документа; ссылки описаний не выбирают родителя.
   */
  #onFocus(event) {
    // Возврат фокуса при синхронном переносе сохраняет логический выбор и фактический footer, а не публикует ref снимка заново.
    if (this.#moving) return;
    if (isElement(event.target) && event.target.closest('.description a, .catalog-caption a')) return;
    const row = eventRow(event);
    if (!row) return;
    this.#selected?.classList.remove('is-selected');
    this.#selected = row;
    this.#selected.classList.add('is-selected');
    this.#updateLink(row);
  }

  /**
   * Принимает канонический адрес открытого просмотра либо восстанавливает адрес его строки.
   * @param {CustomEvent<import('../document/index.mjs').ViewOpened>} event Событие панели с token строки и каноническим адресом открытого просмотра.
   */
  #onViewOpen(event) {
    const { token, target } = event.detail;
    if (!this.contains(token)) return;
    if (!target) {
      this.#updateLink(token);
      return;
    }
    this.#footerTarget = readMaterialTarget(target);
    const repository = /** @type {HTMLDetailsElement|null} */ (token.closest('details[data-repository]'));
    this.#setFooter(
      githubHref(target),
      repository,
      token,
      target.kind === 'repository'
        ? target.origin.id
        : target.kind === 'directory'
        ? target.readmePath || target.path
        : target.path,
    );
  }

  /**
   * Принимает адрес действительно прочитанного документа или исходника и основание открытого замка.
   * @param {CustomEvent<import('../document/index.mjs').DocumentSelected>} event Событие панели с фактически прочитанным документом/исходником и его ref.
   */
  #onDocumentSelect(event) {
    const { token, context, source, document, target } = event.detail;
    if (!this.contains(token)) return;
    const url = document.url || `${source.url}/blob/${encodeURIComponent(source.ref)}/${encodedPath(document.path)}`;
    const repository = /** @type {HTMLDetailsElement|null} */ (token.closest('details[data-repository]'));
    const root = repository
      && (this.#librarySources.get(repository)?.root ?? this.#repositoryCache.get(repository)?.data?.root);
    const path = root && document.path.startsWith(`${root}/`) ? document.path.slice(root.length + 1) : document.path;
    this.#footerTarget = target
      ? readMaterialTarget(target)
      : readMaterialTarget({
        kind: 'document',
        origin: repository ? this.#origin(repository) : null,
        ref: source.ref,
        path: document.path,
        format: /\.(?:md|markdown)$/i.test(document.path) ? 'markdown' : 'text',
        anchor: null,
      });
    this.#setFooter(url, repository, context, path, true);
  }

  /**
   * Завершает временное раскрытие истории; возвращает фокус видимой строке, а обычный просмотр раскрывает прежних предков.
   * @param {CustomEvent<import('../document/index.mjs').ViewClosed>} event Событие закрытия панели с token прежней строки и разрешением возврата фокуса.
   */
  #onViewClose(event) {
    const { token, restore } = event.detail;
    if (!this.contains(token)) return;
    const history = this.#historyPath !== null;
    this.#clearHistoryPath();
    if (restore) {
      if (history) {
        let row = token;
        for (
          let parent = token.closest('details');
          parent && this.contains(parent);
          parent = parent.parentElement?.closest('details') || null
        ) {
          const summary = parent.querySelector(':scope > summary');
          if (!parent.open && summary !== token && isHTMLElement(summary)) row = summary;
        }
        row.focus({ preventScroll: true });
        row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        this.#updateLink(row);
        this.#refreshTree();
        return;
      }
      const container = token.matches('summary') ? token.parentElement : token;
      for (
        let parent = container?.parentElement?.closest('details');
        parent && this.contains(parent);
        parent = parent.parentElement?.closest('details')
      ) parent.open = true;
      token.focus({ preventScroll: true });
      token.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      this.#updateLink(token);
    } else this.#updateLink(this.#selected);
  }

  /**
   * Начинает удержание строки или внутренней ссылки; таймер показывает готовность без раннего действия.
   * @param {PointerEvent} event Нажатие основного указателя внутри строки либо ссылки описания каталога.
   */
  #onPointerDown(event) {
    if (!event.isPrimary || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const link = isElement(event.target) ? event.target.closest('.description a, .catalog-caption a') : null;
    const row = isHTMLElement(link) ? link : eventRow(event);
    const raw = isHTMLElement(link) ? link.dataset.originalHref || link.getAttribute('href') || '' : null;
    if (!row || (raw !== null ? !this.canRouteLink(raw, null) : !this.#canPreview(row))) return;
    if (raw === null) row.focus({ preventScroll: true });
    /**
     * @type {TreePress}
     */
    const pending = {
      row,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: this.scrollLeft,
      top: this.scrollTop,
      raw,
      armed: false,
    };
    pending.timer = displayWindow(this).setTimeout(() => {
      if (this.#press !== pending) return;
      if (
        !row.isConnected || !this.contains(row) || this.scrollLeft !== pending.left || this.scrollTop !== pending.top
      ) {
        this.#cancelGesture();
        return;
      }
      pending.armed = true;
      row.setAttribute('data-hold-ready', '');
      this.#suppressReleaseClick = true;
    }, this.#holdDuration);
    this.#press = pending;
  }

  /**
   * Выполняет достигшее порога удержание только после отпускания того же указателя.
   * @param {PointerEvent} event Отпускание указателя нынешнего документа.
   * @returns {void} Короткое нажатие остаётся обычным click; отмена и принятое удержание подавляют release-click.
   */
  #onPointerUp(event) {
    const pending = this.#press;
    if (!pending || event.pointerId !== pending.pointerId) return;
    if (
      !pending.row.isConnected || !this.contains(pending.row) || !this.#connected()
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
      || Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 8
      || this.scrollLeft !== pending.left || this.scrollTop !== pending.top
    ) {
      this.#cancelGesture();
      return;
    }
    this.#cancelPress();
    if (!pending.armed) return;
    this.#suppressReleaseClick = true;
    if (pending.raw !== null) void this.followLink(pending.raw, null, true);
    else void this.#openPreview(pending.row, 'documentation', true);
  }

  /**
   * Отменяет удержание, когда жест стал перемещением, а не нажатием.
   * @param {PointerEvent} event Движение указателя текущего документа; сравнивается только с начавшим удержание pointerId.
   */
  #onPointerMove(event) {
    if (
      this.#press && event.pointerId === this.#press.pointerId
      && Math.hypot(event.clientX - this.#press.x, event.clientY - this.#press.y) > 8
    ) {
      this.#cancelGesture();
    }
  }

  /**
   * Запоминает начальные координаты одной оси прокрутки и отменяет удержание при многокасании.
   * @param {TouchEvent} event Начало касания каталога с координатами пальца и прежней прокруткой.
   */
  #onTouchStart(event) {
    if (!this.#display?.matchMedia('(max-width: 760px)').matches) return;
    if (event.touches.length !== 1) {
      this.#touchScroll = null;
      this.#cancelGesture();
      return;
    }
    const touch = event.touches[0];
    this.#touchScroll = {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      left: this.scrollLeft,
      top: this.scrollTop,
      axis: this.#lockedScrollAxis,
    };
  }

  /**
   * Фиксирует первую ось жеста; горизонтальный жест управляет scrollLeft, вертикальный остаётся браузеру.
   * @param {TouchEvent} event Движение касания каталога; первая ось жеста закрепляется до завершения прокрутки.
   */
  #onTouchMove(event) {
    const gesture = this.#touchScroll;
    if (!gesture) return;
    if (event.touches.length !== 1) {
      this.#touchScroll = null;
      this.#cancelGesture();
      return;
    }
    const touch = event.touches[0];
    if (touch.identifier !== gesture.id) return;
    const dx = touch.clientX - gesture.x;
    const dy = touch.clientY - gesture.y;
    if (!gesture.axis && this.scrollTop !== gesture.top) gesture.axis = 'y';
    if (!gesture.axis && Math.hypot(dx, dy) > 8) gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (gesture.axis) this.#cancelGesture();
    if (gesture.axis !== 'x') return;
    event.preventDefault();
    this.scrollLeft = gesture.left - dx;
    this.#suppressReleaseClick = true;
    this.#cancelPress();
  }

  /**
   * Заканчивает отслеживание пальца, сохраняя ось до конца инерционной прокрутки.
   * @param {TouchEvent} event Конец касания каталога; инерционная вертикальная прокрутка может продолжаться.
   */
  #endTouchScroll(event) {
    const gesture = this.#touchScroll;
    if (!gesture || ![...event.changedTouches].some((touch) => touch.identifier === gesture.id)) return;
    if (gesture.axis === 'y' && this.scrollTop !== gesture.top) {
      this.#lockedScrollAxis = 'y';
      if (!this.#supportsScrollEnd()) this.#onLegacyScroll();
    }
    this.#touchScroll = null;
  }

  /**
   * Проверяет наличие родного события конца прокрутки.
   * @returns Браузер предоставляет scrollend этому элементу.
   */
  #supportsScrollEnd() {
    return 'onscrollend' in this;
  }

  /**
   * Снимает фиксацию оси после родного завершения прокрутки.
   * @param {Event} event Конец прокрутки каталога в нынешнем документе.
   */
  #onScrollEnd(event) {
    if (event.target === this) this.#lockedScrollAxis = null;
  }

  /**
   * Продлевает запасной таймер конца прокрутки в браузере без scrollend.
   */
  #onLegacyScroll() {
    if (!this.#lockedScrollAxis) return;
    this.#display?.clearTimeout(this.#scrollEndTimer);
    this.#scrollEndTimer = this.#display?.setTimeout(() => {
      this.#lockedScrollAxis = null;
      this.#scrollEndTimer = 0;
    }, 100) || 0;
  }

  /**
   * Разделяет ссылки, повторы загрузки и короткое действие строки; раскрытие не открывает просмотр само по себе.
   * @param {MouseEvent} event Короткий щелчок внутри каталога после исключения уже принятого удержания.
   */
  #onClick(event) {
    const link = isElement(event.target) ? event.target.closest('.description a, .catalog-caption a') : null;
    const row = link ? null : eventRow(event);
    if (row?.matches('summary') && isDetails(row.parentElement) && !this.#unavailable(row)) {
      this.#temporaryHistoryBranches.delete(row.parentElement);
      this.#temporarySearchBranches.delete(row.parentElement);
      this.#historyToggles.delete(row.parentElement);
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (link) {
      const element = /** @type {HTMLAnchorElement} */ (link);
      const raw = element.dataset.originalHref || element.getAttribute('href') || '';
      if (this.canRouteLink(raw, null)) {
        event.preventDefault();
        void this.followLink(raw, null);
      }
      return;
    }
    if (isElement(event.target) && event.target.closest('[data-action="retry-site"]')) {
      if (this.#siteState === 'error' && !this.#sitePromise) this.#sitePromise = this.#loadSite();
      return;
    }
    if (isElement(event.target) && event.target.closest('[data-action="retry-libraries"]')) {
      this.#loadLibraryCatalogue(this.#librarySettings);
      return;
    }
    row?.focus({ preventScroll: true });
    if (row && this.#unavailable(row)) {
      event.preventDefault();
      flashUnavailable(row, unavailableLock);
    }
  }

  /**
   * Оставляет клавиши форме, панели и выделенному тексту, в том числе в Shadow DOM.
   * @param {KeyboardEvent} event Клавиатурное событие текущего документа с composedPath для форм и Shadow DOM.
   * @returns {boolean} Дерево не должно перехватывать стрелки данного события.
   */
  #keepsArrowInput(event) {
    const panel = this.#options?.panel;
    const focused = this.ownerDocument.activeElement;
    if (focused && panel?.contains(focused)) return true;
    const path = event.composedPath();
    for (let active = focused; active; active = active.shadowRoot?.activeElement || null) path.push(active);
    for (const target of path) {
      if (target === panel) return true;
      if (!isElement(target)) continue;
      if (target.closest('form, input, textarea, select') || (isHTMLElement(target) && target.isContentEditable)) {
        return true;
      }
    }
    const selection = this.ownerDocument.getSelection();
    return Boolean(selection && !selection.isCollapsed && selection.toString().length);
  }

  /**
   * Клавиши дерева работают только при свободном вводе; E, Enter и стрелки открывают разные режимы.
   * @param {KeyboardEvent} event Клавиша в нынешнем документе; ввод формы и уже принятые события не перехватываются.
   */
  #onKeydown(event) {
    if (this.#press) this.#cancelGesture();
    if (event.code !== 'KeyE') this.#cancelInformationKey();
    if (
      event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
    ) return;
    if (isElement(event.target) && event.target.closest('.catalog-caption a')) return;
    if (event.code === 'KeyE') {
      const panel = this.#options?.panel;
      if (!panel || !isCommandKey(event, 'KeyE') || this.#keepsArrowInput(event)) return;
      const row = this.#selected;
      if (row && this.#canPreview(row)) {
        event.preventDefault();
        /** @type {TreeInformationHold} */
        const hold = { row };
        this.#informationKeyHold = hold;
        void this.#openPreview(row).then(opened => {
          if (opened && this.#informationKeyHold === hold && panel.isOpen) panel.beginPiPHold(row);
        });
      }
      return;
    }
    const key = navigationKeys[event.code] || event.key;
    const arrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
    if (!arrow) {
      const row = eventRow(event);
      if (!row || !this.contains(row)) return;
      if (event.key === 'Enter' && this.#canPreview(row)) {
        event.preventDefault();
        this.#openPreview(row, 'documentation', true);
      } else if (this.#unavailable(row) && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        flashUnavailable(row, unavailableLock);
      }
      return;
    }
    if (this.#keepsArrowInput(event)) return;
    const row = this.#selected;
    if (!row) return;

    event.preventDefault();
    row.focus({ preventScroll: true });
    const rows = [...visibleTreeContent(this.#treeList)].filter((item) => item.classList.contains('tree-row'));
    const index = rows.indexOf(row);
    const directory = row.matches('summary') && isDetails(row.parentElement) ? row.parentElement : null;
    let next = row;

    if (key === 'ArrowDown') next = rows[index + 1] || row;
    if (key === 'ArrowUp') next = rows[index - 1] || row;
    if (key === 'ArrowRight') {
      const repository = directory?.matches('[data-repository]');
      const pending = directory !== null && repository && this.#repositoryLevel(directory) > 0
        && !directory.dataset.loaded;
      if (repository && this.#siteState === 'loading') return;
      const node = this.#docsNodes.get(row);
      const parent = /** @type {HTMLDetailsElement|null} */ (row.closest('details[data-repository]'));
      if (
        !directory && node?.type === 'symbol' && !node.children.length && parent && this.#repositoryLevel(parent) === 4
      ) {
        this.#openPreview(row, 'source');
        return;
      }
      if (this.#unavailable(row)) flashUnavailable(row, unavailableLock);
      else if (!directory) {
        if (node?.type !== 'symbol') flashUnavailable(row, unavailableLock);
      } else if (!directory.open) {
        if (pending || directory.querySelector(':scope > .tree-list > li, :scope > .description')) {
          this.#temporaryHistoryBranches.delete(directory);
          this.#temporarySearchBranches.delete(directory);
          this.#historyToggles.delete(directory);
          directory.open = true;
        } else flashUnavailable(row, unavailableLock);
      } else if (directory.contains(rows[index + 1])) next = rows[index + 1];
      else if (!pending) flashUnavailable(row, unavailableLock);
    }
    if (key === 'ArrowLeft') {
      if (directory?.open) {
        this.#temporaryHistoryBranches.delete(directory);
        this.#temporarySearchBranches.delete(directory);
        this.#historyToggles.delete(directory);
        directory.open = false;
      } else next = (directory || row).parentElement?.closest('details')?.querySelector('summary') || row;
    }

    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /**
   * Подключает нынешний экземпляр к отображению при обычном добавлении DOM.
   */
  connectedCallback() {
    this.connect();
  }
  /**
   * Снимает привязки при обычном удалении; синхронный PiP-перенос обслуживается prepareMove.
   */
  disconnectedCallback() {
    this.disconnect();
  }
}

customElements.define('project-catalog', ProjectCatalog);

/**
 * Имя и успешно прочитанный текст, добавляемые к метаданным документа.
 * @typedef {Object} PublicDocumentFields
 * @property {string} name Имя узла, файла или библиотеки для отображения и сопоставления.
 * @property {string} content Текст разрешённого материала; право чтения проверяет владелец источника.
 */

/**
 * Путь каталога и его собственные документы в ограниченном дереве.
 * @typedef {Object} DirectoryNodeFields
 * @property {'directory'} type Вид узла каталога, определяющий путь и возможность просмотра.
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 * @property {Record<string, RepositoryDocument>} documents Метаданные доступных видов документов; тексты выдаются только по правилам владельца.
 */

/**
 * Путь файла в подготовленном дереве без полного исходного текста.
 * @typedef {Object} FileNodeFields
 * @property {'file'} type Вид узла каталога, определяющий путь и возможность просмотра.
 * @property {string} path Смысловой путь относительно Git-корня; URL-кодирование выполняется отдельно.
 */

/**
 * Признак объявления Haxe, дополняющий общие данные узла.
 * @typedef {Object} SymbolNodeFields
 * @property {'symbol'} type Вид узла каталога, определяющий путь и возможность просмотра.
 */

/**
 * Установка из Haxelib либо установка с неподтверждённым происхождением; GitHub ref этим не утверждается.
 * @typedef {Object} HaxelibOrUnknownInstallation
 * @property {'haxelib'|'unknown'} source Происхождение версии или адреса; неизвестное происхождение не подтверждает выпуск.
 */

/**
 * Подтверждённая установка из конкретной ветки или тега GitHub с точным SHA.
 * @typedef {Object} GithubInstallation
 * @property {'github'} source Происхождение версии или адреса; неизвестное происхождение не подтверждает выпуск.
 * @property {'branch'|'tag'} refKind Ref обозначает ветку либо тег; выбирает правило проверки публикации.
 * @property {string} ref Ветка, тег или коммит, передаваемый отдельно от пути файла.
 * @property {string} sha Проверенный SHA коммита установки либо ответа GitHub.
 */

/**
 * Ограничение адреса корневым репозиторием для просмотра управления доступом.
 * @typedef {Object} DeniedRepositoryTargetFields
 * @property {'repository'} kind Вид источника, назначения или разрешённой операции; определяет ветвь обработки.
 */

/**
 * Успешно прочитанный исходник и фактический ref для подготовки панели.
 * @typedef {Object} PreparedSourceResult
 * @property {string} content Текст разрешённого материала; право чтения проверяет владелец источника.
 * @property {string} ref Ветка, тег или коммит, передаваемый отдельно от пути файла.
 */

/**
 * Приоритет восстановления фокуса каталога при прямом переносе и откате PiP.
 * @typedef {Object} CatalogMoveOptions
 * @property {boolean} [restoreFocus] Восстановить захваченный фокус после успешной перепривязки.
 * @property {boolean} [rollbackFocus] Восстановить захваченный фокус при откате переноса.
 */

/**
 * Корневой узел библиотеки без файла или каталога для поиска её документов.
 * @typedef {Object} RepositoryDocumentScope
 * @property {'repository'} type Вид узла каталога, определяющий путь и возможность просмотра.
 * @property {string} name Имя узла, файла или библиотеки для отображения и сопоставления.
 */
