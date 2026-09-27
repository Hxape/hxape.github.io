/** Хранит один просмотр: dialog, вкладки, историю и принятие ответов документов и исходника. */

/**
 * Готовая позиция выбранного документа для нижнего адреса каталога.
 * @typedef {Object} SelectedDocument
 * @property {string} path Полный путь файла относительно Git-корня.
 * @property {string} [url] Готовый GitHub URL фактического ref и строки, если владелец уже подготовил его.
 */

/**
 * Одна адресная операция панели; runtime-сигнал и guard никогда не входят в журнал.
 * @typedef {Object} NavigationOptions
 * @property {'push'|'replace'|'restore'} [visit] Способ принятия метаданных: новое посещение, обновление либо курсор существующей истории.
 * @property {boolean} [refresh] Обходит прежний успешный кэш для явного перечитывания.
 * @property {string} [recordId] Id истории при restore или закладки для сохранённого чтения.
 * @property {'documentation'|'source'} [initialMode] Начальное представление Haxe конкретного действия; прямой source не меняет предпочтение.
 * @property {boolean} [defaultBranch] Обычная команда библиотеки определяет нынешнюю default_branch внутри этой же отменяемой подготовки; сохранённые адреса не подменяются.
 * @property {boolean} [applySourcePin] Только обычные Hold/Enter файла допускают закреплённый default view; E и прямой адрес строки сохраняют своё действие.
 * @property {AbortSignal} [signal] Срок внешнего намерения каталога; его отмена прекращает собственную подготовку панели.
 * @property {()=>boolean} [guard] Проверяет свежесть намерения после ожиданий и перед общей фиксацией; false отвергает устаревший переход.
 */

/**
 * Метаданные последнего отказа подготовки для явного R; не являются принятым просмотром или записью журнала.
 * @typedef {Object} PendingRetry
 * @property {MaterialTarget} target Проверенный адрес той же новой проверки доступа и чтения, включая ref.
 * @property {'push'|'replace'|'restore'} visit Первоначальный способ принятия только будущего успешного перехода.
 * @property {boolean} refresh Первоначальное требование перечитать материал, обходя успешный кэш.
 * @property {string} [recordId] Id места чтения; restore разрешён лишь пока запись истории существует.
 * @property {'documentation'|'source'} [initialMode] Представление Haxe исходного действия; не хранит загрузчик, сигнал или доказательство доступа.
 * @property {boolean} [defaultBranch] Повторяет определение ветки обычной команды библиотеки внутри нового срока подготовки.
 * @property {boolean} [applySourcePin] Повторяет смысл обычного Hold/Enter файла; не является изменением текущего представления.
 */

/**
 * Кандидат одного удержания E, принадлежащий прежнему окну до отпускания или переноса.
 * @typedef {Object} PiPHold
 * @property {ActiveView} view Просмотр начала удержания; поздний таймер проверяет его identity.
 * @property {import('../../common/ui/view-utils.mjs').DisplayWindow} display Окно, создавшее таймер; очищать срок нужно в этом же окне.
 * @property {number} timer Id отложенного переноса; снимается отпусканием или сменой ввода.
 * @property {boolean} armed Порог удержания достигнут; PiP выполняется только на release.
 * @property {HTMLElement} target Живой элемент обратной связи data-hold-ready; marker снимается при завершении/отмене.
 */

/**
 * Только ссылка на материал, ожидающий завершения закрытия; не является вторым текущим просмотром.
 * @typedef {Object} ClosingView
 * @property {ActiveView|null} view Прежний материал для события завершения и возврата к строке; null без материала.
 */

/**
 * Дополнение запроса документацией файла и ленивым raw-представлением.
 * @typedef {Object} SourceFileFields
 * @property {'source-file'} kind Выбирает общий просмотр DOCUMENTATION/SOURCE CODE.
 * @property {import('../catalog/index.mjs').CatalogNode} node Узел HXDoc файла или объявления для DOCUMENTATION.
 * @property {SourceLocation} source Подготовленное происхождение полного .hx.
 * @property {'documentation'|'source'} initialMode Начальный режим конкретного действия; прямой переход к строке выбирает source.
 * @property {number|null} line Целевая строка начиная с 1; null открывает файл без полосы подсветки.
 * @property {SourceResult} [readySource] Уже успешно прочитанный результат только нынешнего просмотра.
 * @property {(signal:AbortSignal)=>Promise<SourceResult>} load Загрузчик разрешённого raw-файла с проверкой доступа и отменой.
 */

/**
 * Успешно прочитанный raw-файл нынешнего просмотра; в постоянный журнал не входит.
 * @typedef {Object} SourceResult
 * @property {string} content Полный текст файла в памяти текущего просмотра.
 * @property {string} ref Фактически прочитанный ref для подписи и нижнего адреса.
 */

/**
 * Дополнение запроса набором документов и операцией их чтения.
 * @typedef {Object} RepositoryDocumentsFields
 * @property {'documents'} kind Выбирает вкладки документов репозитория или каталога.
 * @property {ReadonlyArray<string>} types Желаемый порядок ключей вкладок, если результат не задаёт свой.
 * @property {'directory'|'repository'} scope Область материала для пояснения пустого набора.
 * @property {'github'|'site'} loadingSource Происхождение операции для сообщения ожидания.
 * @property {string} [description] Готовое пояснение каталога или репозитория для области без документов.
 * @property {DocumentsResult} [readyDocuments] Уже успешно подготовленный результат для синхронного принятия вкладки.
 * @property {(signal:AbortSignal)=>Promise<DocumentsResult>} load Чтение подготовленного набора с отменой; доступ и происхождение проверяет его владелец.
 */

/**
 * Дополнение запроса только готовым деревом документации, без raw-чтения.
 * @typedef {Object} HXDocFields
 * @property {'hxdoc'} kind Выбирает представление уже подготовленного HXDoc.
 * @property {import('../catalog/index.mjs').CatalogNode} node Узел документации с дочерними объявлениями; предметный обход выполняет блок.
 */
import { html, nothing, render } from 'lit';
import { controlIcon, renderControlIcons } from '../../common/ui/icons.mjs';
import { createMotion } from '../../common/ui/motion.mjs';
import { formatText, navigationTooltip, ui } from '../../common/ui/text.mjs';
import { displayWindow, isCommandKey, isElement, isHTMLElement } from '../../common/ui/view-utils.mjs';
import { renderBookmarks } from '../../component/bookmarks/index.mjs';
import { documentAccess } from '../../component/document-access/index.mjs';
import {
  disposeDocumentContent,
  prepareDocumentContent,
  refreshDocumentLinks,
  renderDocumentContent,
  scrollDocumentAnchor,
} from '../../component/document-content/index.mjs';
import { documentFailure } from '../../component/document-failure/index.mjs';
import { showDocumentHeading } from '../../component/document-heading/index.mjs';
import { documentLoading } from '../../component/document-loading/index.mjs';
import {
  compactDocument,
  documentMessage,
  readPanelDOM,
  showDocumentMessage,
  showDocumentMode,
  showPanelState,
} from '../../component/document-panel/index.mjs';
import { documentTabsKey, renderDocumentTabs, selectDocumentTab } from '../../component/document-tabs/index.mjs';
import { renderHistory } from '../../component/history/index.mjs';
import { loadScreen, screenReady, screenStatus } from '../../common/html/screen.mjs';
import {
  readNavigationActions,
  showActionVisibility,
  showNavigationActions,
} from '../../component/navigation-actions/index.mjs';
import { renderOrganizationRootControl } from '../../component/organization-root-control/index.mjs';
import { outlineDocument } from '../../component/outline-document/index.mjs';
import { PanelWidth } from '../../component/panel-resize/index.mjs';
import { bindSearchDrag } from '../../component/search/drag.mjs';
import { renderSearch, renderSearchHistory, resetSearchHistory } from '../../component/search/index.mjs';
import {
  labelSourceTabs,
  selectSourceTab as showSourceTab,
  sourceTabsKey,
} from '../../component/source-tabs/index.mjs';
import { bindSourceBookmarkDrag } from '../../component/source-view/bookmark-drag.mjs';
import { applyIcons, defaultIcons, nodeIcon } from '../catalog/icons.mjs';
import { githubHref, readMaterialTarget, targetKey } from '../catalog/material-target.mjs';
import {
  historyFileKey,
  historyRepositoryKey,
  NavigationJournal,
  readBookmarkTransfer,
  readHistoryTransfer,
} from './journal.mjs';
import widthRules from './json/width.json' with { type: 'json' };
import { circularSearchIndex, findSearchMatches } from './search-matches.mjs';
import { CurrentSearchPainter } from './search-painter.mjs';
import { createSearchProjection, releaseSearchProjection, searchBoundsForRange } from './search-projection.mjs';
import { readSearchQueries, SearchState } from '../../common/search/state.mjs';
import { SourceRequest } from './source-request.mjs';
import {
  bookmarkRow,
  collectionRow,
  documentTarget,
  firstDocument,
  repositoryName,
  targetTitle,
} from './target-presentation.mjs';

/** Готовые подписи документа и состояния панели; бизнес-состояния здесь не хранятся. */
const labels = ui.documents;
// Прежний ключ сохраняет уже выбранный режим.
const sourceModeKey = 'site-mobile-source-mode';
/** Политика обычного открытия хранится отдельно от последнего явно выбранного Haxe-вида. */
const sourcePinKey = 'site-source-pin';

/**
 * Проверенные метаданные одного документа; текст появляется только при принятом разрешённом чтении.
 * @typedef {Object} RepositoryDocument
 * @property {string} path Полный путь относительно Git-корня.
 * @property {'markdown'|'text'} format Способ оформления текста в панели.
 * @property {string} [content] Успешно прочитанный текст текущего просмотра; отсутствие обозначает неготовый или закрытый документ.
 * @property {string} [name] Необязательное имя файла для подписи публичной библиотеки.
 * @property {string} [url] Необязательный готовый GitHub URL фактического чтения.
 */
/**
 * Подтверждённое происхождение документов одного результата.
 * @typedef {Object} RepositorySource
 * @property {string} url Корень GitHub-репозитория.
 * @property {string} ref Фактическая ветка или ref чтения, отдельно от версии установки.
 */
/**
 * Документ публичной библиотеки с обязательными именем и успешно прочитанным текстом.
 * @typedef {RepositoryDocument & {name:string,content:string}} PublicDocument
 */
/**
 * Результат документов дерева Hxape или состояния ограничения; public=false отличает его от библиотечного набора.
 * @typedef {Object} PrivateDocumentsResult
 * @property {RepositorySource} [source] Происхождение доступных документов, когда оно известно.
 * @property {Record<string,RepositoryDocument>} documents Документы по ключам вкладок; content отсутствует у запрещённых.
 * @property {string[]} [order] Необязательный собственный порядок вкладок результата.
 * @property {false} [public] Маркер небиблиотечного результата; не утверждает закрытость каждого документа.
 * @property {boolean} [documentsDenied] Нужно показать состояние закрытого доступа при отсутствии читаемых вкладок.
 * @property {string} [reason] Готовое пояснение ограничения или отказа.
 * @property {boolean} [retryAvailable] Владелец допускает действие повтора проверки доступа.
 */
/**
 * Успешно прочитанный набор документов публичной библиотеки.
 * @typedef {Object} PublicDocumentsResult
 * @property {RepositorySource} source Фактическое происхождение всех документов результата.
 * @property {Record<string,PublicDocument>} documents Документы с обязательными текстом и именем.
 * @property {string[]} order Порядок вкладок по ключам документов.
 * @property {true} public Маркер библиотечного набора для подписей вкладок.
 */
/**
 * Успешный библиотечный набор либо документы дерева/состояние ограничения; панель различает их по public.
 * @typedef {PrivateDocumentsResult|PublicDocumentsResult} DocumentsResult
 */
/**
 * Готовый заголовок живого просмотра без чтения карты каталога.
 * @typedef {Object} ViewTitle
 * @property {'repository'|'directory'|'file'|'symbol'} type Вид материала для имени и значка.
 * @property {string} name Видимое имя материала.
 * @property {string} [kind] Необязательный точный вид объявления Haxe.
 */
/**
 * Проверенный адрес материала без DOM, текста и доказательства доступа.
 * @typedef {import('../catalog/material-target.mjs').MaterialTarget} MaterialTarget
 */
/**
 * Временный результат разрешения адреса каталогом; принимается только при действующей ревизии.
 * @typedef {import('../catalog/index.mjs').PreparedMaterial} PreparedMaterial
 */
/**
 * Общий выбор внутреннего перехода, установленного VS Code или GitHub; хранится настройками.
 * @typedef {'internal'|'vscode'|'github'} LinkMode
 */
/**
 * Задержка визуальной полосы строки от Preferences; 0 скрывает сразу, null сохраняет без timer.
 * @typedef {import('../preferences/index.mjs').SourceHighlightDuration} SourceHighlightDuration
 */
/**
 * Подготовленные адрес и подпись одного просмотра; runtime-токен возвращается каталогу в событиях.
 * @typedef {Object} ViewRequest
 * @property {HTMLElement} token Прежняя строка каталога для событий и возврата фокуса; в журнал не входит.
 * @property {ViewTitle} title Готовые имя и вид заголовка.
 * @property {MaterialTarget} target Проверенный адрес повторного разрешения.
 * @property {string} [version] Версия локальной установки для приписки библиотеки.
 * @property {string} [repository] Идентификатор Hxape-репозитория для проверки/повтора доступа; у библиотеки отсутствует.
 */
/**
 * Запрос заголовка и адреса с готовым узлом HXDoc; отдельный текст файла не читается.
 * @typedef {ViewRequest & HXDocFields} HXDocRequest
 */
/**
 * Запрос одного живого набора вкладок с готовыми метаданными и отменяемым загрузчиком.
 * @typedef {ViewRequest & RepositoryDocumentsFields} RepositoryDocumentsRequest
 */
/**
 * Источник raw Haxe, явно подготовленный владельцем каталога и доступа.
 * @typedef {Object} SourceLocation
 * @property {string} url Корень GitHub-репозитория файла.
 * @property {string} ref Ref чтения файла, отдельно от локальной установки.
 * @property {string} path Полный путь .hx относительно Git-корня.
 * @property {boolean} library Нужно пояснение об отличии от установленной библиотеки.
 * @property {boolean} private Текст разрешено читать через закрытый владелец доступа, а не публичный загрузчик.
 */
/**
 * Запрос единственного просмотра документации/raw-файла с явными путём и строкой.
 * @typedef {ViewRequest & SourceFileFields} SourceFileRequest
 */
/**
 * Один из трёх запросов панели: HXDoc, набор документов или файл с двумя представлениями.
 * @typedef {HXDocRequest|RepositoryDocumentsRequest|SourceFileRequest} DocumentRequest
 */
/**
 * Внешние узлы и действия прежних владельцев, связываемые main с единственной панелью.
 * @typedef {Object} PanelOptions
 * @property {HTMLElement} workspace Рабочая область для геометрии ширины в нынешнем размещении.
 * @property {HTMLElement} footer Единственный переносимый нижний бар.
 * @property {HTMLElement} footerHome Место возврата footer для нынешнего размещения.
 * @property {HTMLElement} eventRoot Область событий закрытия текущего окна или самостоятельного PiP.
 * @property {boolean} [standalone] Панель занимает самостоятельное docs-only PiP вместо обычной боковой области.
 * @property {(operation:()=>void,options:{restoreFocus:boolean})=>void} [withFooterMove] Синхронное обрамление переноса footer владельцем настроек и фокуса.
 * @property {(target:MaterialTarget,options:{signal:AbortSignal,refresh:boolean,sourceMode?:'documentation'|'source',defaultBranch?:boolean,currentSource?:PreparedMaterial})=>Promise<PreparedMaterial>} prepareTarget Разрешает адрес/доступ; runtime currentSource допускает прежний готовый текст только после проверки его свежего происхождения и доказательств.
 * @property {(prepared:PreparedMaterial)=>boolean} targetIsCurrent Проверяет, что результат подготовки ещё принадлежит нынешнему источнику и доступу.
 * @property {(prepared:PreparedMaterial,shownTarget:MaterialTarget,options:{history:boolean,refresh?:boolean})=>void} acceptTarget Синхронно принимает строку/нижний адрес и сообщает каталогу происхождение перехода для его правил раскрытия истории.
 * @property {()=>MaterialTarget|null} footerTarget Читает единственный нынешний нижний адрес, в том числе для удаления закладки.
 * @property {(target:MaterialTarget)=>boolean} [targetUsesBranch] Подтверждает источник ветки для значка закладки по нынешним данным Catalog; отсутствие или false оставляет обычный Git, не меняя Journal.
 * @property {()=>SourceHighlightDuration} [getSourceHighlightDuration] Читает сохранённый срок визуальной полосы; 0/null валидны, отсутствие getter использует 3000 мс.
 * @property {()=>LinkMode} getLinkMode Читает общий режим из владельца настроек.
 * @property {()=>LinkMode} cycleLinkMode Выбирает и сохраняет следующий допустимый режим у настроек.
 * @property {()=>import('../../component/organization-root-control/index.mjs').OrganizationRootModel} getOrganizationRootControl Готовит местный путь, подписи и save/reset от Preferences; панель хранит только временное поле popup.
 * @property {(target:MaterialTarget)=>string|null} linkHref Готовит href типизированного адреса по нынешнему режиму; null означает недоступность назначения.
 * @property {(value:string,current:MaterialTarget|null)=>Promise<boolean>} followLink Синхронно принимает намерение очищенной ссылки и начинает переход каталога до ожидания её адресного чтения.
 * @property {(value:string,current:MaterialTarget|null)=>string|null} documentHref Готовит синхронное href очищенной Markdown-ссылки, сохраняя обычное внешнее назначение неизвестной.
 * @property {(value:string,current:MaterialTarget|null)=>boolean} shouldHandleLink До preventDefault доказывает, что обычное нажатие можно обработать внутри сайта.
 */
/**
 * Событие принятого открытия для выбора/нижнего адреса каталога.
 * @typedef {Object} ViewOpened
 * @property {HTMLElement} token Runtime-строка, переданная владельцем каталога.
 * @property {MaterialTarget} [target] Показанный адрес с фактическим ref, если он известен.
 */
/**
 * Событие реально показанного документа или исходника.
 * @typedef {Object} DocumentSelected
 * @property {HTMLElement} token Строка для связи результата с текущим каталогом.
 * @property {object} context Непрозрачный контекст этого просмотра/документа для нижнего адреса.
 * @property {RepositorySource} source Фактическое происхождение успешного чтения.
 * @property {SelectedDocument} document Путь выбранного файла и необязательный готовый GitHub URL.
 * @property {MaterialTarget} [target] Канонический адрес материала и позиции для footer и журнала.
 */
/**
 * Событие завершённого закрытия одного просмотра.
 * @typedef {Object} ViewClosed
 * @property {HTMLElement} token Прежняя строка открытия, если она ещё существует.
 * @property {boolean} restore Нужно вернуть выбор и фокус к строке; false для отзыва доступа/lifecycle.
 */
/**
 * Единственное runtime-состояние панели; постоянные записи получают только его проекцию.
 * @typedef {Object} ActiveView
 * @property {DocumentRequest} request Подготовленный запрос с DOM-токеном и загрузчиком, не сохраняемый в журнал.
 * @property {PreparedMaterial} [prepared] Непостоянное доказательство принятой подготовки для безопасного reuse ready source; смена ревизии делает его недействительным, в Journal не входит.
 * @property {string|null} [historyId] Id записи, реально принятой для этого view; null при ручном режиме без записи, чтобы поздний reading не заменял прежний файл cursor.
 * @property {boolean} [pendingViewVisit] Пользовательская смена вида ждёт готового DOM/сырого текста; отказ не создаёт посещение.
 * @property {boolean} [history] Этот материал принят из истории; C того же материала сохраняет признак, обычный переход снимает. В журнал не входит.
 * @property {MaterialTarget} target Нынешний показанный адрес с фактическим ref и позицией.
 * @property {import('./journal.mjs').Reading|null} [restoreReading] Сохранённое место чтения до готовности нового DOM или повтора доступа.
 * @property {object} context Непрозрачный контекст события выбранного документа.
 * @property {'html'|'source'} mode Вид текста документа репозитория.
 * @property {string|null} type Ключ принятой вкладки либо отсутствие читаемой вкладки.
 * @property {'documentation'|'source'} [sourceMode] Вид текущего Haxe-файла.
 * @property {DocumentsResult} [result] Принятые тексты и метаданные только текущего набора документов.
 * @property {boolean} [failed] Последняя загрузка документов завершилась отказом.
 * @property {number} [loadRevision] Поколение попытки документов; прежний ответ отвергается после повтора.
 * @property {boolean} [pendingDocumentRender] Принятый результат ждёт возвращения панели после временного переноса.
 * @property {Map<string,string>} tabIds Ключи документов и DOM-id их нынешних кнопок.
 * @property {number} [scrollTop] Вертикальная прокрутка перед закрытием/возобновлением этого runtime-просмотра.
 * @property {number} [scrollLeft] Горизонтальная прокрутка перед закрытием/возобновлением этого runtime-просмотра.
 */
/**
 * Обязательные прежние узлы статической оболочки; общие компоненты не владеют её материалом.
 * @typedef {import('../../component/document-panel/index.mjs').PanelDOM} PanelDOM
 */

/**
 * Отмена удаления истории в течение четырёх секунд; существует только у живой панели.
 * @typedef {Object} PendingHistoryRemoval
 * @property {number} timer Таймер исходного окна, чтобы перенос в PiP не менял срок удаления.
 * @property {'waiting'|'removed'|'cancelled'} phase waiting доступен для отмены; removed позволяет позднему успеху вернуть запись; cancelled отменяет перенос в конец.
 */
/**
 * Отмена удаления закладки в течение трёх секунд; живёт только в нынешней области выбранной группы.
 * @typedef {Object} PendingBookmarkRemoval
 * @property {Window} display Фактическое окно таймера; перенос представления отменяет ожидание.
 * @property {number} timer Нынешний таймер отсчёта; освобождается до изменения области или записи.
 * @property {number} deadline Конец трёхсекундного срока по монотонным часам фактического окна.
 * @property {import('./journal.mjs').JournalEntry} entry Та же запись начала ожидания; замена с тем же id не принимается.
 * @property {string} targetKey Адрес начала ожидания; перемещение прежнего id на другой адрес отменяет удаление.
 * @property {string} groupId Группа начала ожидания; её смена или перенос записи отменяют удаление.
 */
/**
 * Один черновик обмена JSON в прежней временной области Panel.
 * @typedef {Object} PendingJSONTransfer
 * @property {'group'|'bookmarks'|'history'} scope Выбранная область обмена, не определяется из вставленного текста.
 * @property {boolean} importing true для вставки, false для выгрузки только для чтения.
 * @property {string} value Полный введённый текст либо форматированный JSON метаданных.
 * @property {'merge'|'replace'} mode Отдельный выбор объединения или замены закладок; для истории всегда replace.
 * @property {boolean} confirming Весь черновик уже проверен перед подтверждением замены; ввод снимает подтверждение.
 * @property {string} message Ошибка формы или результат копирования, без очистки черновика.
 * @property {string} confirmation Полная подпись подтверждения, подготовленная только из проверенного JSON.
 */

/**
 * Только preview одного жеста существующей метки; Journal изменяется на finish.
 * @typedef {Object} BookmarkDrag
 * @property {ActiveView} view Нынешний source view начала жеста; смена материала отменяет его.
 * @property {string} id Устойчивый id перемещаемой metadata-закладки.
 * @property {number} originalLine Начальная строка marker для возврата preview после cancel.
 * @property {number} selectedLine Прежняя подсвеченная строка; cancel восстанавливает её без записи.
 * @property {number} line Нынешняя свободная preview-строка в пределах готового файла.
 * @property {number} pointerLine Последняя строка под указателем до пропуска занятого места; release в той же точке сохраняет направление.
 * @property {-1|1} direction Направление между строками указателя, независимо от свободной preview-позиции.
 * @property {boolean} remove Pointer уже отлип и находится за левой/правой границей gutter; удаление принимается на release.
 */

/**
 * Местные фокус и прокрутка прежних узлов popup на время native close/showModal или синхронного PiP-переноса.
 * @typedef {Object} PopupPlacement
 * @property {HTMLElement|null} focused Прежний сфокусированный узел внутри popup; чужой фокус не переносится в форму.
 * @property {number} scrollTop Вертикальное место чтения самого dialog.
 * @property {number} scrollLeft Горизонтальное место чтения самого dialog.
 * @property {number} contentTop Вертикальная прокрутка прежнего контейнера содержимого.
 * @property {number} contentLeft Горизонтальная прокрутка прежнего контейнера содержимого.
 */

/** Один просмотр. token возвращается в событиях и никогда не разбирается панелью. */
export class DocumentPanel extends HTMLElement {
  /**
   * Нынешнее размещение и действия владельцев; меняется только configure и подготовкой PiP.
   * @type {PanelOptions|null}
   */
  #options = null;
  /**
   * Единственный живой материал с текстом и запросом; null после закрытия/отзыва, не входит в постоянный журнал.
   * @type {ActiveView|null}
   */
  #view = null;
  /** Узкий dialog временно закрыт ради немедленного перехода каталога; прежний принятый материал остаётся у #view до замены/очистки. */
  #catalogueParked = false;
  /**
   * Документ исходного окна, запомненный при создании для клавиш, когда панель вынесена в PiP.
   */
  #commandHome = this.ownerDocument;
  /**
   * Пассивный постоянный журнал только адресов, подписей и чтения; панель принимает в него переходы.
   * @type {NavigationJournal}
   */
  #journal;
  /**
   * Пассивные постоянные latest/история запросов этого Panel; не хранит материал, DOM, диапазон или решение о completed commit.
   * @type {SearchState}
   */
  #searchState;
  /**
   * Поколение одной подготовки перехода; поздний результат после нового действия не принимается.
   */
  #navigationRevision = 0;
  /**
   * Ещё отменяемые удаления истории по id; замыкание перехода может помнить истёкшую запись до ответа.
   * @type {Map<string,PendingHistoryRemoval>}
   */
  #pendingHistory = new Map();
  /**
   * Незавершённые удаления строк закладок; журнал сохраняет запись до её срока.
   * @type {Map<string,PendingBookmarkRemoval>}
   */
  #pendingBookmarks = new Map();
  /** Правое действие строки закладки начинается с удаления; перенос включается явно в живой панели. */
  #bookmarkMoveMode = false;
  /**
   * Выбранная операция поля имени; сам черновик хранит только живой input временной области.
   * @type {'create'|'rename'|null}
   */
  #bookmarkNameMode = null;
  /**
   * Id группы, чьё удаление с записями ещё требует явного подтверждения.
   * @type {string|null}
   */
  #bookmarkDeleteConfirm = null;
  /**
   * Единственная временная форма обмена JSON; закрытие области освобождает черновик.
   * @type {PendingJSONTransfer|null}
   */
  #jsonTransfer = null;
  /**
   * Отмена нынешней подготовки адреса/оболочки, отдельная от запроса уже показанного файла.
   * @type {AbortController|null}
   */
  #navigationRequest = null;
  /**
   * Только нынешняя подготовка restore, которую Clear/settings отменяют без отзыва другого нового адреса.
   * @type {AbortController|null}
   */
  #historyRestoreRequest = null;
  /**
   * Последний отказ подготовки только в памяти нынешней панели; новый адрес, успех, закрытие и отзыв доступа снимают его.
   * @type {PendingRetry|null}
   */
  #pendingRetry = null;
  /**
   * Нынешняя подготовка перечитывает тот же уже показанный материал; открытие поиска сохраняет это C.
   * Новая адресная операция, завершение либо отмена снимают признак; в журнал он не входит.
   */
  #refreshingCurrent = false;
  /**
   * Прежние кнопки загруженной верхней панели; состояние готовит этот блок.
   * @type {import('../../component/navigation-actions/index.mjs').NavigationActionsDOM|null}
   */
  #navigationActions = null;
  /**
   * Единственный временный dialog истории/закладок/поиска, переносимый в прежнем host.
   * @type {HTMLDialogElement|null}
   */
  #popup = null;
  /**
   * Прежнее место временного представления внутри popup.
   * @type {HTMLElement|null}
   */
  #popupContent = null;
  /**
   * Нынешняя временная область либо null; её открытие не является посещением материала.
   * @type {'history'|'bookmarks'|'search'|'searchHistory'|'organizationRoot'|null}
   */
  #popupKind = null;
  /**
   * Попытки чтения HTML всплывающих экранов; журнал и преференсы от них не зависят.
   * @type {Map<import('../../common/html/screen.mjs').ScreenName,'loading'|'failed'>}
   */
  #popupMarkup = new Map();
  /** Открытость настроек истории в этой панели; не входит в сохраняемый журнал. */
  #historySettingsOpen = false;
  /**
   * Очистка местного жеста/слушателей коллекции перед её заменой или переносом.
   * @type {(()=>void)|null}
   */
  #collectionStop = null;
  /**
   * Прежний фокус до открытия popup для допустимого возврата при закрытии.
   * @type {HTMLElement|null}
   */
  #popupFocus = null;
  /**
   * Соответствие нынешнего материала и нижнего адреса перед popup; тот же view разрешает вернуть его адрес после возврата фокуса.
   * Поле хранит только ссылку на прежний текущий view, не снимок footer или второго владельца материала.
   * @type {ActiveView|null}
   */
  #popupView = null;
  /**
   * Краткое сообщение перехода или закладки, не содержащее текста материала.
   */
  #navigationMessage = '';
  /** Таймер трёхсекундного сообщения перехода; работает в исходном окне и не удерживает тексты материалов. */
  #navigationNoticeTimer = 0;
  /** Поиск открыт явно; встроенная полоса остаётся между переходами файлов, постоянную строку хранит только SearchState. */
  #searchOpen = false;
  /**
   * Единственное место встроенной формы перед docs-body; переносится вместе с прежним dialog, не является вторым просмотром.
   * @type {HTMLElement|null}
   */
  #searchBar = null;
  /**
   * Показанный корень нынешней проекции; тот же ready Text/root/window допускает смену строки без повторного индексирования.
   * @type {HTMLElement|null}
   */
  #searchProjectionRoot = null;
  /**
   * Числовые границы ранее захваченного native Selection; не удерживают сам Range или закрытый текст.
   * @type {import('./search-projection.mjs').SearchBounds|null}
   */
  #searchSelectionBounds = null;
  /**
   * Только идентичность проекции, в которой границы были вычислены; новый текст/вид/окно снимает её.
   * @type {import('./search-projection.mjs').SearchProjection|null}
   */
  #searchSelectionProjection = null;
  /** true ограничивает совпадения захваченным выделением; недоступное отображение диапазона даёт пустой результат, не весь файл. */
  #searchSelectionOnly = false;
  /** Позиция только обхода MRU стрелками input; -1 означает свободный ввод, не текущую историю материалов. */
  #searchRecallIndex = -1;
  /** Черновик перед обходом MRU, возвращаемый Down за самым новым запросом; не является второй действующей строкой. */
  #searchRecallDraft = '';
  /**
   * Только строка явно удалённого нынешнего черновика: обычное закрытие без нового ввода/Enter не возвращает её в MRU.
   * Не используется как query и не сохраняется; поиск всегда читает latest помощника.
   * @type {string|null}
   */
  #searchDeletedDraft = null;
  /**
   * Производные текст/связи нынешнего DOM только на срок поиска; освобождаются до замены текста или переноса.
   * @type {import('./search-projection.mjs').SearchProjection|null}
   */
  #searchProjection = null;
  /**
   * Компактные числовые позиции совпадений без Range на каждый результат; существуют только при живой форме.
   * @type {import('./search-matches.mjs').SearchMatches}
   */
  #searchMatches = { starts: new Uint32Array(), ends: new Uint32Array() };
  /** Индекс выбранного совпадения начиная с 0; -1 означает отсутствие текущего результата. */
  #searchCurrent = -1;
  /**
   * Единственный производный Range и слой нынешнего совпадения; не владеет query, текущим материалом или журналом.
   * @type {CurrentSearchPainter|null}
   */
  #searchPainter = null;
  /**
   * Очистка только временного вертикального жеста формы; положение не входит в Reading или Journal.
   * @type {(()=>void)|null}
   */
  #searchDragStop = null;
  /**
   * Защита общей фиксации: программный render не переписывает старую запись до принятия нового посещения.
   */
  #recordingSuspended = false;
  /**
   * Материал, ожидающий завершения анимации закрытия; null после окончательной очистки.
   * @type {ClosingView|null}
   */
  #closing = null;
  /**
   * Срок событий нынешней привязки окна; временный перенос снимает его без копии просмотра.
   * @type {AbortController|null}
   */
  #events = null;
  /**
   * Единственный контроллер геометрии ширины, сохраняющий её между переносами.
   * @type {PanelWidth|null}
   */
  #panelWidth = null;
  /**
   * Анимации нынешнего окна; снимаются при перепривязке.
   * @type {ReturnType<typeof createMotion>|null}
   */
  #motion = null;
  /**
   * MediaQuery нынешнего документа для модального узкого размещения.
   * @type {MediaQueryList|null}
   */
  #mobile = null;
  /**
   * Общий сохранённый выбор обычного открытия файла; прямой переход к строке его не меняет.
   * @type {'documentation'|'source'}
   */
  #sourceMode = 'documentation';
  /**
   * Закреплённый default обычного открытия файла; last использует прежний выбор sourceMode и не меняет нынешнюю вкладку.
   * @type {'documentation'|'source'|'last'}
   */
  #sourcePin = 'last';
  /**
   * Нынешние флаги SVG-групп, применяемые без пересоздания документов.
   */
  #icons = defaultIcons();
  /**
   * Длительность явного удержания E в миллисекундах; допустимые границы задаёт договор интерфейса.
   */
  #holdDuration = 500;
  /**
   * Единственный runtime-запрос/оболочка исходника; не владеет просмотром или журналом.
   * @type {SourceRequest|null}
   */
  #sourceRequest = null;
  /**
   * Preview текущей перемещаемой метки, без копии текста/токена или постоянного состояния жеста.
   * @type {BookmarkDrag|null}
   */
  #bookmarkDrag = null;
  /**
   * Очистка локального pointer gesture нынешнего source host, снимаемая перед заменой/переносом.
   * @type {(()=>void)|null}
   */
  #bookmarkDragStop = null;
  /**
   * Отмена одной загрузки документов текущего просмотра.
   * @type {AbortController|null}
   */
  #documentLoad = null;
  /**
   * Синхронная пауза PiP: обычный ввод и принятие новых материалов закрыты до commit/rollback; подготовленное отображение возобновляется частным допуском.
   */
  #moving = false;
  /** Частный синхронный допуск подготовленного отображения внутри resume/rollback; обычные действия по #moving остаются закрыты. */
  #resumingDisplay = false;
  /**
   * Исходное размещение для возврата из PiP, без копии данных просмотра.
   * @type {PanelOptions|null}
   */
  #homeOptions = null;
  /**
   * Фактическое окно нынешних событий/геометрии; null вне привязки.
   * @type {import('../../common/ui/view-utils.mjs').DisplayWindow|null}
   */
  #boundView = null;
  /**
   * Прежний координатор живого переноса; API принадлежит исходному окну.
   * @type {import('../../app/picture-in-picture.mjs').PictureInPictureController|null}
   */
  #pip = null;
  /**
   * Один раз найденные обязательные узлы каркаса; живой перенос их не заменяет.
   * @type {PanelDOM|null}
   */
  #dom = null;
  /**
   * RAF восстановления прокрутки после изменения значков; 0 без ожидающего кадра.
   */
  #iconFrame = 0;
  /**
   * Последнее применённое модальное размещение dialog для согласования footer.
   */
  #modal = false;
  /**
   * Таймер удержания E и просмотр, к которому он относится; сбрасывается новым вводом/переносом.
   * @type {PiPHold|null}
   */
  #pipHold = null;
  /**
   * Просмотр короткого E, ожидающего keyup; длинное удержание не переключает исходник.
   * @type {ActiveView|null}
   */
  #shortSourceE = null;

  /**
   * Создаёт одну панель и читает сохранённые режим исходника и метаданные журнала.
   */
  constructor() {
    super();
    /** @type {Storage|null} */
    let storage = null;
    try {
      storage = localStorage;
      if (localStorage.getItem(sourceModeKey) === 'source') this.#sourceMode = 'source';
      const pin = localStorage.getItem(sourcePinKey);
      if (pin === 'documentation' || pin === 'source') this.#sourcePin = pin;
    } catch {}
    this.#journal = new NavigationJournal(storage);
    this.#searchState = new SearchState(storage);
  }

  /**
   * Подключает размещение и действия прежних владельцев; при смене внешних узлов снимает прежние события.
   * @param {PanelOptions} options Узлы нынешнего размещения и действия каталога/настроек без копии их состояния.
   * @returns {void} Сохраняет исходное размещение и подключает готовую оболочку; без оболочки события ждут подключения.
   */
  configure(options) {
    const previous = this.#options;
    if (
      previous
      && (previous.workspace !== options.workspace || previous.footer !== options.footer
        || previous.footerHome !== options.footerHome || previous.eventRoot !== options.eventRoot)
    ) this.#disconnect();
    this.#homeOptions = { ...options, standalone: false };
    this.#options = this.#homeOptions;
    this.#connect();
  }

  /**
   * Применяет выбранные значки к прежнему DOM, сохраняя вертикальную прокрутку текущего материала.
   * @param {import('../catalog/icons.mjs').IconSettings} settings Готовые флаги четырёх групп значков от владельца настроек.
   * @returns {void} Меняет оформление сразу; отложенное восстановление прокрутки выполняется только в той же привязке и вкладке.
   */
  setIcons(settings) {
    Object.assign(this.#icons, settings);
    if (!this.#dom) return;
    const { body } = this.#elements;
    const scroll = body.scrollTop;
    const view = this.#view;
    const type = view?.type;
    applyIcons(this, this.#icons);
    body.scrollTop = scroll;
    if (!this.#events) return;
    this.#display.cancelAnimationFrame(this.#iconFrame);
    const binding = this.#events;
    this.#iconFrame = this.#display.requestAnimationFrame(() => {
      if (this.#events !== binding) return;
      this.#iconFrame = 0;
      if (this.#events && this.#view === view && this.#view?.type === type) body.scrollTop = scroll;
    });
  }

  /**
   * Принимает длительность удержания действий информации.
   * @param {number} milliseconds Длительность в миллисекундах; допускаются конечные значения от 250 до 500.
   * @returns {void} Допустимое значение применяется к следующим удержаниям; недопустимое оставляет прежнее.
   */
  setHoldDuration(milliseconds) {
    if (Number.isFinite(milliseconds) && milliseconds >= 250 && milliseconds <= 500) {
      this.#holdDuration = milliseconds;
    }
  }

  /**
   * Применяет новый срок только к семантически выбранной строке нынешнего raw.
   * @returns {void} Перезапускает её визуальное ожидание без изменения target/reading/Journal; pointer preview сохраняется до release, перенос и неготовый source пропускаются.
   */
  refreshSourceHighlightDuration() {
    const view = this.#view;
    if (
      this.#moving || this.#bookmarkDrag || !view || view.request.kind !== 'source-file'
      || view.sourceMode !== 'source' || !this.#current(view)
    ) return;
    this.#sourceRequest?.refreshHighlight(this.#sourceHighlightDuration, this.#display);
  }

  /**
   * Пересчитывает координаты полосы после применения размера шрифта в нынешнем окне.
   * @returns {void} Меняет только геометрию ready source и текущего поискового рисунка; не прокручивает, не меняет deadline/видимость/Journal и не воскрешает погашенный фон.
   */
  refreshSourceGeometry() {
    const view = this.#view;
    if (
      this.#moving || !view || !this.#current(view)
    ) return;
    if (view.request.kind === 'source-file' && view.sourceMode === 'source') {
      this.#sourceRequest?.refreshGeometry(this.#display);
    }
    this.#paintSearch();
  }

  /**
   * Синхронно принимает готовый запрос или переключает представление того же материала.
   * @param {DocumentRequest} request Подготовленные адрес, подпись, узел и отменяемый загрузчик владельца данных.
   * @returns {boolean} true после принятия; false без подключения, во время переноса или до готовности анимаций.
   */
  open(request) {
    if (!this.#events || this.#moving || !this.isConnected || !this.#motion) return false;
    this.#clearPreparationRetry();
    this.#cancelNavigation();
    const sourceMode = request.kind === 'source-file' ? this.#initialSourceMode(request) : undefined;
    if (this.#sameInformation(request)) {
      if (request.kind === 'source-file' && this.#view?.request.kind === 'source-file') {
        if (this.#view.sourceMode === sourceMode && sourceMode === 'source' && this.#sourceRequest?.ready) {
          if (request.line !== null) this.#scrollSourceLine(request.line);
        } else this.#selectSourceTab(this.#view, sourceMode);
      }
      return true;
    }
    this.#captureReading();
    this.#closePopup(false);
    /** @type {ActiveView} */
    const view = {
      request,
      target: request.target,
      context: {},
      mode: /** @type {'html'} */ ('html'),
      type: null,
      sourceMode,
      tabIds: new Map(),
    };
    this.#recordingSuspended = true;
    try {
      this.#present(view);
    } finally {
      this.#recordingSuspended = false;
    }
    view.historyId = this.#journal.accept(this.#entryData(view), 'push')?.id || null;
    this.#updateNavigationActions();
    return true;
  }

  /**
   * Определяет, действует ли сохранённый выбор DOCUMENTATION/SOURCE CODE в нынешнем окне.
   * @returns {boolean} true в основном окне; false в PiP, где обычное открытие начинает с документации.
   */
  #sourceModePreferenceApplies() {
    return !this.ownerDocument.documentElement.hasAttribute('data-pip-mode');
  }

  /**
   * Выбирает начальное представление готового запроса файла.
   * @param {SourceFileRequest} request Запрос с явным source для перехода к строке либо обычным начальным режимом.
   * @returns {'documentation'|'source'} Явный source имеет приоритет; иначе сохранённый режим основного окна либо documentation в PiP.
   */
  #initialSourceMode(request) {
    return request.initialMode === 'source'
      ? 'source'
      : this.#sourceModePreferenceApplies()
      ? this.#sourceMode
      : 'documentation';
  }

  /**
   * Сравнивает нынешний материал с запросом без вызова загрузчика.
   * @param {DocumentRequest} request Запрос, для которого допускается переключение уже открытого просмотра.
   * @returns {boolean} true только при совпадении адреса, вида, подписи и происхождения/узла; иное открытие требует нового просмотра.
   */
  #sameInformation(request) {
    if (this.#catalogueParked) return false;
    const current = this.#view;
    const previous = current?.request;
    if (
      !current || !previous || targetKey(current.target) !== targetKey(request.target) || previous.kind !== request.kind
      || previous.version !== request.version
      || previous.title.type !== request.title.type || previous.title.name !== request.title.name
      || previous.title.kind !== request.title.kind
    ) return false;
    if (previous.kind === 'hxdoc' && request.kind === 'hxdoc') return previous.node === request.node;
    if (previous.kind === 'source-file' && request.kind === 'source-file') {
      return previous.node === request.node && previous.source.url === request.source.url
        && previous.source.ref === request.source.ref && previous.source.path === request.source.path
        && previous.source.private === request.source.private && previous.source.library === request.source.library;
    }
    return previous.kind === 'documents' && request.kind === 'documents' && previous.scope === request.scope
      && previous.loadingSource === request.loadingSource && previous.types.length === request.types.length
      && previous.types.every((type, index) => type === request.types[index]);
  }

  /**
   * Показывает единственный принятый просмотр, связывает заголовок и режим, затем готовый материал.
   * @param {ActiveView} view Новое runtime-состояние, уже проверенное перед общей фиксацией.
   * @returns {void} Заменяет прежний DOM и запросы, сообщает открытие и восстанавливает готовое место чтения; ленивый загрузчик остаётся отменяемым.
   */
  #present(view) {
    this.#catalogueParked = false;
    const request = view.request;
    const sourceMode = request.kind === 'source-file' ? view.sourceMode || request.initialMode : null;
    this.#cancelPiPHold();
    this.#documentLoad?.abort();
    this.#documentLoad = null;
    this.#leaveSource();
    const { dialog, body, toolbar, tabs, sourceTabs, sourceHost, mode } = this.#elements;
    const entering = !dialog.open || Boolean(this.#closing);
    const style = dialog.open ? this.#display.getComputedStyle(dialog) : null;
    const from = { opacity: style?.opacity || '0', transform: style?.transform || this.#offset() };
    this.#motion?.cancel(dialog);
    this.#closing = null;
    if (dialog.contains(this.ownerDocument.activeElement)) body.focus({ preventScroll: true });
    this.#view = view;
    this.#releaseSearchProjection();
    const selected = view.type;
    view.type = null;
    this.#showHeading(view);
    toolbar.hidden = mode.hidden = true;
    tabs.hidden = false;
    sourceTabs.hidden = sourceHost.hidden = true;
    render(nothing, tabs);
    body.removeAttribute('role');
    body.removeAttribute('aria-labelledby');
    body.removeAttribute('aria-busy');
    this.#emit('view-open', { token: request.token, target: view.target });
    if (request.kind === 'hxdoc') {
      this.#showState(this.#hxdoc(request.node));
    } else if (request.kind === 'source-file') {
      view.sourceMode = undefined;
      this.#showSourceDocumentation(view);
    } else if (!view.result) {
      this.#showLoading(view);
      this.#load(view);
    }
    this.#place();
    // Готовая вкладка применяет restoreReading внутри renderTabs; исходная позиция не должна сбросить её после этого.
    body.scrollTop = view.scrollTop || 0;
    body.scrollLeft = view.scrollLeft || 0;
    if (sourceMode === 'source') this.#showSource(view);
    if (view.result) this.#renderTabs(view, selected);
    if (request.kind === 'hxdoc' || request.kind === 'source-file' && sourceMode !== 'source') {
      this.#restoreReading(view);
    }
    if (entering) this.#motion?.play(dialog, [from, { opacity: 1, transform: 'translate(0)' }]);
  }

  /**
   * Обновляет только имя и значок принятого материала, не затрагивая текст и оболочку чтения.
   * @param {ActiveView} view Нынешние подготовленные метаданные заголовка и его действия.
   * @returns {void} Сохраняет верхние controls; декларация получает адресное действие, установленная версия не печатается.
   */
  #showHeading(view) {
    const request = view.request;
    const headingIcon = nodeIcon(request.title, { repositories: true, directories: true, files: true, symbols: true });
    headingIcon?.removeAttribute('data-icon-group');
    showDocumentHeading(this.#elements.title, this.#elements.version, {
      name: request.title.name,
      label: `${request.title.kind || request.title.type} ${request.title.name}`,
      icon: headingIcon,
      versionText: '',
      ...(request.kind === 'source-file' && request.target.kind === 'declaration'
        ? {
          href: this.#settings.linkHref(request.target),
          onOpen: (/** @type {MouseEvent} */ event) => {
            const target = this.#headingTarget(view);
            if (target) this.#openDeclaration(target, event);
          },
        }
        : {}),
    });
  }

  /**
   * Принимает другую позицию того же подтверждённого ready файла без замены его Text, frame или shell.
   * @param {ActiveView} view Новые принятые метаданные того же источника и окна.
   * @returns {void} Обновляет строку, имя/footer и reading; не вызывает clear/start, loading или вставку DOCUMENTATION.
   */
  #reuseSource(view) {
    this.#cancelPiPHold();
    this.#cancelBookmarkDrag(false);
    this.#view = view;
    this.#showHeading(view);
    if (view.request.kind !== 'source-file') return;
    if (view.request.line !== null) this.#scrollSourceLine(view.request.line);
    else {
      this.#sourceRequest?.clearSelection(this.#display);
      this.#elements.body.scrollTop = 0;
      this.#elements.body.scrollLeft = 0;
    }
    this.#announceShown(view);
    this.#restoreReading(view);
    this.#refreshSourceBookmarks();
  }

  /**
   * Сразу отвергает поздние ответы и закрывает просмотр с допустимой анимацией и возвратом фокуса.
   * @param {{restore?:boolean,immediate?:boolean}} [options] restore возвращает выбор к строке; immediate завершает закрытие сразу, по умолчанию при restore=false.
   * @returns {void} Очищает текущий запрос и переносит footer домой при завершении; история браузера не изменяется.
   */
  close({ restore = true, immediate = !restore } = {}) {
    this.#catalogueParked = false;
    this.#clearPreparationRetry();
    this.#clearSearch();
    this.#closePopup(false);
    this.#cancelNavigation();
    this.#captureReading();
    this.#cancelPiPHold();
    this.#documentLoad?.abort();
    this.#documentLoad = null;
    this.#leaveSource();
    const view = this.#view || this.#closing?.view || null;
    if (view && this.#dom) {
      view.scrollTop = this.#elements.body.scrollTop;
      view.scrollLeft = this.#elements.body.scrollLeft;
    }
    this.#view = null;
    this.#updateNavigationActions();
    if (!this.#dom || (this.#closing && !immediate)) return;
    const { dialog, body, document: content } = this.#elements;
    disposeDocumentContent(content);
    body.removeAttribute('aria-busy');
    this.#panelWidth?.setEnabled(false);
    /**
     * Завершает закрытие прежней оболочки и переносит единственный footer домой.
     * @returns {void} Сообщает закрытие прежнего токена только после закрытия dialog.
     */
    const finish = () => {
      this.#closing = null;
      const { footer, footerHome } = this.#settings;
      this.#withFooterMove(() => {
        if (dialog.open) dialog.close();
        if (footer.parentElement !== footerHome) footerHome.append(footer);
      }, false);
      if (view) this.#emit('view-close', { token: view.request.token, restore });
      this.#notifyVisibility();
    };
    if (immediate || !dialog.open || !this.#motion) {
      this.#motion?.cancel(dialog);
      finish();
      return;
    }
    const style = this.#display.getComputedStyle(dialog);
    this.#closing = { view };
    this.#motion.play(dialog, [{ opacity: style.opacity, transform: style.transform }, {
      opacity: 0,
      transform: this.#offset(),
    }], { finish });
  }

  /**
   * Удаляет живые тексты и запросы после смены доступа, сохраняя разрешённые метаданные журнала.
   * @returns {void} Немедленно закрывает просмотр и очищает содержимое/вкладки без возврата к удалённой строке.
   */
  forgetAccess() {
    this.#clearPreparationRetry();
    this.#clearSearch();
    this.#closePopup(false);
    this.#leaveSource();
    this.#cancelNavigation();
    if (this.#view || this.#closing || this.#dom?.dialog.open) this.close({ restore: false, immediate: true });
    this.#closing = null;
    if (this.#dom) {
      disposeDocumentContent(this.#elements.document);
      this.#elements.document.replaceChildren();
      render(nothing, this.#elements.state);
      render(nothing, this.#elements.tabs);
    }
  }

  /**
   * Очищает просмотр, если его запрос относится к отзываемому репозиторию.
   * @param {HTMLElement} repository Нынешняя область репозитория с ключом dataset.repository и его строками.
   * @returns {void} Чужой просмотр сохраняется; принадлежащий репозиторию очищается через forgetAccess.
   */
  forgetRepository(repository) {
    const requests = [this.#view?.request];
    if (
      this.#pendingRetry?.target.origin.id === repository.dataset.repository
      || requests.some((request) =>
        request && (request.repository === repository.dataset.repository || repository.contains(request.token))
      )
    ) {
      this.forgetAccess();
    }
  }

  /**
   * Заменяет корневую информацию состоянием доступа либо очищает просмотр удаляемой строки.
   * @param {HTMLElement} repository Область репозитория с корневым summary.
   * @param {string} reason Готовое пояснение отказа нынешней проверки доступа.
   * @returns {boolean} false, если корневой просмотр сохранился как отказ; true, если прежний просмотр репозитория очищен и может потребовать повторного открытия.
   */
  showRepositoryUnavailable(repository, reason) {
    const request = this.#view?.request;
    const summary = repository.querySelector(':scope > summary');
    if (
      request?.kind === 'documents' && request.repository === repository.dataset.repository && request.token === summary
    ) {
      this.showAccessFailure(reason);
      return false;
    }
    const reopen = Boolean(request?.repository === repository.dataset.repository);
    this.forgetRepository(repository);
    return reopen;
  }

  /**
   * Очищает живой материал строки, которую владелец каталога собирается заменить.
   * @param {HTMLElement} repository Область заменяемого дерева; корневой summary остаётся прежним.
   * @returns {void} Просмотр дочерней строки очищается; корневая информация и адресные записи журнала сохраняются.
   */
  forgetDetachedRows(repository) {
    const summary = repository.querySelector(':scope > summary');
    /**
     * Проверяет, принадлежит ли runtime-токен заменяемой дочерней строке репозитория.
     * @param {DocumentRequest|null|undefined} request Нынешний запрос либо отсутствие материала.
     * @returns {boolean|undefined|null} Истинное значение для дочерней строки; отсутствие запроса или корневой summary не требует очистки.
     */
    const detached = (request) => request && repository.contains(request.token) && request.token !== summary;
    if (detached(this.#view?.request)) {
      this.forgetAccess();
      return;
    }
  }

  /**
   * Запускает свежую подготовку нынешнего адреса после проверки доступа.
   * @returns {void} При действующем просмотре вызывает refreshCurrent; старый готовый закрытый текст не воспроизводится.
   */
  retryCurrent() {
    if (this.#retry()) return;
    const view = this.#view;
    if (!view || !this.#current(view)) return;
    void this.refreshCurrent();
  }

  /**
   * Снимает тексты документов и прежний ready-загрузчик при отказе доступа.
   * @param {string} reason Пояснение отказа от владельца доступа, пригодное для отображения.
   * @returns {void} Сохраняет метаданные чтения, очищает DOM и оставляет только состояние отказа; другие виды просмотра пропускает.
   */
  showAccessFailure(reason) {
    this.#clearPreparationRetry();
    const view = this.#view;
    if (!view || view.request.kind !== 'documents') return;
    if (!this.#current(view)) {
      // Временно закрытый материал тоже должен освободить закрытые тексты при отзыве.
      this.forgetAccess();
      return;
    }
    this.#clearSearch();
    this.#closePopup(false);
    this.#documentLoad?.abort();
    if (!view.restoreReading) view.restoreReading = this.#entryData(view).reading;
    view.loadRevision = (view.loadRevision || 0) + 1;
    view.failed = false;
    view.type = null;
    /** @type {PrivateDocumentsResult} */
    const denied = { public: false, documents: {}, documentsDenied: true, reason, retryAvailable: true };
    // Статический результат подготовки больше не может повторно вернуть прежние закрытые тексты.
    view.request.readyDocuments = undefined;
    view.request.load = async signal => {
      if (signal.aborted) throw signal.reason;
      return denied;
    };
    view.result = denied;
    disposeDocumentContent(this.#elements.document);
    this.#elements.document.replaceChildren();
    this.#elements.body.removeAttribute('aria-busy');
    this.#renderTabs(view);
  }

  /**
   * Сообщает наличие открытой информации, включая оболочку явного повтора без принятого материала.
   * @returns {boolean} true для просмотра, открытой оболочки или незавершённого закрытия; false при временном закрытии ради каталога.
   */
  get isOpen() {
    return !this.#catalogueParked && Boolean(this.#view || this.#closing || this.#dom?.dialog.open);
  }

  /**
   * Предоставляет поколение существующей подготовки для краткого ожидания каталога до передачи в navigate.
   * @returns {number} Нынешний runtime-счётчик; новое действие/перенос меняет его, в журнал и адрес материала он не входит.
   */
  get navigationRevision() {
    return this.#navigationRevision;
  }

  /**
   * Освобождает узкий экран для немедленно выбранного репозитория, сохраняя прежний принятый материал.
   * @returns {void} Отменяет подготовку/временные формы, закрывает только узкий modal и возвращает footer каталогу; отказ нового чтения не возвращает dialog автоматически.
   */
  beginCatalogueNavigation() {
    this.#clearPreparationRetry();
    this.#cancelBookmarkDrag(false);
    this.#captureReading();
    this.#cancelNavigation();
    this.#cancelPiPHold();
    this.#closePopup(false);
    this.#documentLoad?.abort();
    this.#documentLoad = null;
    this.#sourceRequest?.stop();
    // Прежний ready материал сохраняется при ожидании/отказе нового адреса; его визуальный срок продолжает идти.
    this.#sourceRequest?.resumeHighlight(this.#display);
    if (!this.#dom || !this.#options || this.#moving || this.#settings.standalone || !this.#smallScreen) return;
    this.#motion?.finishAll();
    this.#closing = null;
    const { dialog, body } = this.#elements;
    if (this.#view) {
      this.#view.scrollTop = body.scrollTop;
      this.#view.scrollLeft = body.scrollLeft;
      this.#catalogueParked = true;
    }
    this.#panelWidth?.setEnabled(false);
    this.#withFooterMove(() => {
      if (dialog.open) dialog.close();
      this.#settings.footerHome.append(this.#settings.footer);
    }, false);
    this.#releaseSearchProjection();
    this.#renderSearch();
    this.#updateNavigationActions();
    this.#notifyVisibility();
  }

  /**
   * Сообщает размещению изменение доступности верхней группы без передачи адресов или текста.
   * @returns {void} Page читает нынешние isOpen/ownerDocument и отражает только derived видимость дублей footer.
   */
  #notifyVisibility() {
    this.dispatchEvent(new Event('view-visibility', { bubbles: true }));
  }

  /**
   * Отменяет только подготовку нового адреса и делает её поздний результат недействительным.
   * @returns {void} Увеличивает поколение операции, отменяет её сигнал; уже показанный материал сохраняется.
   */
  #cancelNavigation() {
    ++this.#navigationRevision;
    this.#navigationRequest?.abort();
    this.#navigationRequest = null;
    this.#historyRestoreRequest = null;
    this.#refreshingCurrent = false;
  }

  /**
   * Разрешает адрес по нынешним правам и принимает готовые просмотр, выбор каталога и журнал одним синхронным ходом.
   * @param {MaterialTarget} target Проверяемый адрес повторного разрешения; наличие в журнале не доказывает доступ.
   * @param {NavigationOptions} [options] Адресная фиксация, сохранённое чтение, вид Haxe и срок внешнего намерения.
   * @returns {Promise<boolean>} true после общей фиксации; false при отказе, отмене или недоступной панели, с прежним успешным просмотром. Отказ доступа не возвращает ожидающую удаления запись в историю.
   */
  async navigate(
    target,
    {
      visit = 'push',
      refresh = false,
      recordId,
      initialMode,
      defaultBranch = false,
      applySourcePin = false,
      signal,
      guard,
    } = {},
  ) {
    const address = readMaterialTarget(target);
    if (
      !address || signal?.aborted || guard && !guard() || !this.#events || this.#moving || !this.isConnected
      || !this.#motion
    ) return false;
    if (this.#pendingRetry && targetKey(this.#pendingRetry.target) !== targetKey(address)) {
      this.#clearPreparationRetry();
    }
    const restored = recordId
      ? visit === 'restore'
        ? this.#journal.historyEntry(recordId)
        : this.#journal.bookmarks.find(entry => entry.id === recordId) || null
      : null;
    if (visit === 'restore' && !restored) return false;
    const pending = visit === 'restore' && recordId ? this.#pendingHistory.get(recordId) || null : null;
    const previous = this.#view;
    const owner = this.ownerDocument;
    const refreshing = refresh && visit === 'replace' ? previous : null;
    const reading = restored?.reading || (visit === 'replace' && previous ? this.#entryData(previous).reading : null);
    const preferred = this.#sourceModePreferenceApplies() ? this.#sourceMode : 'documentation';
    const pinned = applySourcePin && address.kind === 'source' && address.line === null
      ? this.#sourcePin === 'last' ? this.#sourceMode : this.#sourcePin
      : preferred;
    const sourceMode = reading?.sourceMode || (initialMode === 'source' ? 'source' : initialMode === 'documentation'
      ? pinned
      : address.kind === 'declaration' || address.kind === 'source' && address.line !== null
      ? 'source'
      : pinned);
    const currentSource = !refresh && sourceMode === 'source' && previous?.request.kind === 'source-file'
        && previous.sourceMode === 'source' && this.#current(previous) && this.#sourceRequest?.ready
        && !this.#elements.sourceHost.hidden
        && previous.request.readySource && previous.prepared && this.#settings.targetIsCurrent(previous.prepared)
        && (address.kind === 'source' || address.kind === 'declaration')
        && address.origin.kind === previous.target.origin.kind && address.origin.id === previous.target.origin.id
        && address.origin.url.toLowerCase() === previous.target.origin.url.toLowerCase()
        && address.path === previous.request.source.path
        && (defaultBranch || address.ref === previous.request.readySource.ref)
      ? previous.prepared
      : undefined;
    this.#captureReading();
    this.#cancelNavigation();
    const revision = this.#navigationRevision;
    const controller = new AbortController();
    this.#navigationRequest = controller;
    this.#historyRestoreRequest = visit === 'restore' ? controller : null;
    this.#refreshingCurrent = Boolean(
      refreshing && this.#current(refreshing)
        && (targetKey(address) === targetKey(refreshing.target)
          || targetKey(address) === targetKey(refreshing.request.target)),
    );
    /**
     * Передаёт отмену внешнего намерения единственной подготовке панели.
     * @returns {void} Показанный успешный материал этой отменой не очищается.
     */
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    this.#setNavigationMessage('');
    this.#updateNavigationActions();
    try {
      if (
        !currentSource && sourceMode === 'source' && (address.kind === 'source' || address.kind === 'declaration')
        && this.#sourceRequest
      ) {
        await this.#sourceRequest.prepareShell(this.ownerDocument, controller.signal, this.#commandHome);
        if (
          controller.signal.aborted || guard && !guard() || revision !== this.#navigationRevision || this.#moving
          || !this.#events
        ) {
          return false;
        }
      }
      const prepared = await this.#settings.prepareTarget(address, {
        signal: controller.signal,
        refresh,
        sourceMode,
        defaultBranch,
        currentSource,
      });
      if (
        controller.signal.aborted || revision !== this.#navigationRevision || this.#moving || !this.#events
        || this.ownerDocument !== owner
        || guard && !guard()
        || !this.#settings.targetIsCurrent(prepared)
        || visit === 'restore' && (!recordId || !this.#journal.historyEntry(recordId) && pending?.phase !== 'removed')
      ) return false;
      // Начальный корневой отказ доступа разрешает управление токенами; возврат удаляемой записи требует готового материала.
      if (pending && pending.phase !== 'cancelled' && prepared.denied) {
        throw new Error('The pending history material is unavailable.');
      }
      const request = prepared.request;
      if (request.kind === 'source-file') request.initialMode = sourceMode;
      const result = request.kind === 'documents' ? request.readyDocuments : undefined;
      let shownTarget = refreshing?.target || prepared.target;
      if (refreshing?.request.kind === 'documents' && reading?.type && request.kind === 'documents') {
        const selected = result?.documents[reading.type];
        if (!selected || typeof selected.content !== 'string') {
          throw new Error('The current document is absent from the refreshed group.');
        }
        const path = refreshing.target.kind === 'document'
          ? refreshing.target.path
          : refreshing.target.kind === 'directory'
          ? refreshing.target.readmePath
          : refreshing.result?.documents[reading.type]?.path;
        if (!path || selected.path !== path) {
          throw new Error('The refreshed group no longer contains the current path.');
        }
      }
      if (request.kind === 'documents' && result?.source) {
        const selected = firstDocument(result, request.types, reading?.type || null);
        if (selected) shownTarget = documentTarget(shownTarget, result.documents[selected], result.source.ref);
      }
      /** @type {ActiveView} */
      const view = {
        request,
        prepared,
        history: visit === 'restore' || this.#refreshingCurrent && Boolean(previous?.history),
        target: shownTarget,
        result,
        context: {},
        mode: reading?.mode || 'html',
        type: reading?.type || null,
        sourceMode: request.kind === 'source-file' ? sourceMode : undefined,
        restoreReading: reading ? { ...reading } : null,
        tabIds: new Map(),
      };
      this.#recordingSuspended = true;
      try {
        this.#clearPreparationRetry();
        // Каталог меняет строку и адрес лишь после успешной подготовки; runtime token не попадает в журнал.
        this.#settings.acceptTarget(prepared, shownTarget, {
          history: Boolean(view.history),
          refresh: this.#refreshingCurrent,
        });
        const reuse = currentSource && previous && this.#view === previous && this.#current(previous)
          && previous.request.kind === 'source-file' && this.#sourceRequest?.ready && request.kind === 'source-file'
          && currentSource.request.kind === 'source-file' && request.readySource === currentSource.request.readySource
          && request.source.ref === previous.request.source.ref && request.source.path === previous.request.source.path
          && prepared.accessRevision === currentSource.accessRevision && prepared.snapshot === currentSource.snapshot
          && prepared.accessProof === currentSource.accessProof && this.#settings.targetIsCurrent(currentSource);
        if (reuse) this.#reuseSource(view);
        else this.#present(view);
        if (pending && pending.phase !== 'cancelled' && recordId) {
          this.#cancelHistoryRemoval(recordId);
          view.historyId = this.#journal.appendRestored(this.#entryData(view), recordId).id;
        } else {
          const historyId = visit === 'replace' ? previous?.historyId || null : recordId;
          view.historyId = this.#journal.accept(this.#entryData(view), visit, historyId)?.id || null;
        }
      } finally {
        this.#recordingSuspended = false;
      }
      this.#closePopup(false);
      this.#reindexSearch();
      this.#setNavigationMessage('');
      return true;
    } catch {
      if (!controller.signal.aborted && (!guard || guard()) && revision === this.#navigationRevision) {
        this.#pendingRetry = { target: address, visit, refresh, recordId, initialMode, defaultBranch, applySourcePin };
        this.#setNavigationMessage(refresh ? ui.navigation.refreshFailed : ui.navigation.navigationFailed);
        if (!this.#view) this.#showPreparationFailure();
        this.#renderPopup();
      }
      return false;
    } finally {
      signal?.removeEventListener('abort', abort);
      if (this.#navigationRequest === controller) {
        this.#navigationRequest = null;
        this.#refreshingCurrent = false;
      }
      if (this.#historyRestoreRequest === controller) this.#historyRestoreRequest = null;
      this.#updateNavigationActions();
    }
  }

  /**
   * Перечитывает нынешний материал, сохраняя вкладку, набор документов, вид и прокрутку.
   * @returns {Promise<boolean>} true после принятия обновления; false без просмотра или при отказе, который сохраняет прежний успех.
   */
  refreshCurrent() {
    if (this.#catalogueParked) return Promise.resolve(false);
    const view = this.#view;
    const target = view?.request.kind === 'documents'
        && (view.request.target.kind === 'repository' || view.request.target.kind === 'directory')
      ? view.request.target
      : view?.target;
    return view && target
      ? this.navigate(target, {
        visit: 'replace',
        refresh: true,
        initialMode: view.request.kind === 'source-file' ? view.sourceMode || 'documentation' : undefined,
      })
      : Promise.resolve(false);
  }

  /**
   * Открывает предыдущую запись в нынешнем порядке истории.
   * @returns {Promise<boolean>} true после успешного восстановления; false без соседней записи или при отказе чтения.
   */
  backward() {
    return this.#historyStep(-1);
  }
  /**
   * Открывает следующую запись в нынешнем порядке истории.
   * @returns {Promise<boolean>} true после успешного восстановления; false без соседней записи или при отказе чтения.
   */
  forward() {
    return this.#historyStep(1);
  }

  /**
   * Разрешает соседний адрес истории без изменения списка до успешного чтения.
   * @param {-1|1} direction -1 выбирает предыдущую, 1 следующую запись относительно курсора.
   * @returns {Promise<boolean>} true после успешного восстановления курсора; false без записи или при отказе перехода.
   */
  #historyStep(direction) {
    const entry = this.#journal.adjacentHistory(direction);
    return entry ? this.navigate(entry.target, { visit: 'restore', recordId: entry.id }) : Promise.resolve(false);
  }

  /**
   * Переключает открытое представление закладок, Haxe-файла или документа.
   * @returns {void} Меняет список/дерево, DOCUMENTATION/SOURCE CODE либо TEXT/HTML; без подходящего просмотра ничего не меняет.
   */
  toggleCurrentViewMode() {
    this.#cancelNavigation();
    if (this.#popupKind === 'bookmarks') {
      this.#journal.toggleBookmarkTree();
      this.#renderPopup();
      return;
    }
    const view = this.#view;
    if (!view || !this.#current(view)) return;
    if (view.request.kind === 'source-file') {
      this.#selectSourceTab(view, view.sourceMode === 'source' ? 'documentation' : 'source', true);
    } else if (view.request.kind === 'documents' && view.type) {
      this.#captureReading();
      view.pendingViewVisit = true;
      view.mode = view.mode === 'html' ? 'source' : 'html';
      this.#showDocument(view);
      this.#recordViewTransition(view);
    }
  }

  /**
   * Циклически закрепляет вид следующего обычного Hold/Enter файла, не переключая нынешний материал.
   * @returns {void} Последовательно выбирает documentation/source/last и сохраняет scalar policy; без принятого Haxe-view ничего не меняет.
   */
  #cycleSourcePin() {
    if (this.#view?.request.kind !== 'source-file' || !this.#current(this.#view)) return;
    this.#sourcePin = this.#sourcePin === 'last'
      ? 'documentation'
      : this.#sourcePin === 'documentation'
      ? 'source'
      : 'last';
    try {
      localStorage.setItem(sourcePinKey, this.#sourcePin);
    } catch {}
    this.#showSourcePin();
  }

  /**
   * Готовит знак и доступную подпись политики обычного открытия для прежней кнопки вида.
   * @returns {void} Меняет только представление policy; вкладка, строка, чтение и история остаются нынешними.
   */
  #showSourcePin() {
    if (!this.#dom || this.#view?.request.kind !== 'source-file') return;
    showDocumentMode(this.#elements.mode, {
      mode: `pin-${this.#sourcePin}`,
      label: this.#sourcePin === 'documentation' ? ui.navigation.sourcePinDocumentation : this.#sourcePin === 'source'
        ? ui.navigation.sourcePinSource
        : ui.navigation.sourcePinLast,
      icon: this.#sourcePin === 'last'
        ? controlIcon('source-pin-last')
        : html`
          <span class="mode-pin-symbol">
            ${controlIcon(this.#sourcePin === 'source' ? 'code' : 'document')}<span class="mode-pin-badge">${controlIcon('source-pin')}</span>
          </span>
        `,
    });
  }

  /**
   * Отражает общий режим на уже показанных ссылках и отменяет прежнее намерение перехода, сохраняя текст и таблицы.
   * @returns {void} Переписывает готовые href и знак режима; повреждённые служебные адреса игнорирует.
   */
  refreshLinkMode() {
    this.#cancelNavigation();
    this.#updateNavigationActions();
    const view = this.#view;
    if (!view || !this.#dom) return;
    for (const link of this.#elements.state.querySelectorAll('a[data-material-target]')) {
      if (link.localName !== 'a') continue;
      let target = null;
      try {
        target = readMaterialTarget(
          /** @type {unknown} */ (JSON.parse(link.getAttribute('data-material-target') || 'null')),
        );
      } catch { /* Адрес, созданный панелью, после внешней правки не применяется. */ }
      const href = target && this.#settings.linkHref(target);
      if (href) link.setAttribute('href', href);
      else link.removeAttribute('href');
    }
    if (view.request.kind === 'documents' && view.type) {
      refreshDocumentLinks(this.#elements.document, this.#contentOptions(view));
    }
    const rootLink = this.#elements.title.querySelector('a');
    if (rootLink) {
      const target = this.#headingTarget(view);
      const href = target && this.#settings.linkHref(target);
      if (href) rootLink.setAttribute('href', href);
      else rootLink.removeAttribute('href');
    }
  }

  /**
   * Проецирует нынешний материал в метаданные адреса, подписи и чтения.
   * @param {ActiveView} view Принятый runtime-просмотр, из которого нельзя сохранять текст или замыкания.
   * @returns {import('./journal.mjs').EntryData} Новый объект для журнала; отложенное restoreReading имеет приоритет над ещё не готовой прокруткой.
   */
  #entryData(view) {
    return {
      target: view.target,
      title: targetTitle(view.target, view.request.title),
      reading: view.restoreReading ? { ...view.restoreReading } : {
        mode: view.mode,
        sourceMode: view.sourceMode || null,
        type: view.type,
        scrollTop: this.#dom && !this.#catalogueParked ? this.#elements.body.scrollTop : view.scrollTop || 0,
        scrollLeft: this.#dom && !this.#catalogueParked ? this.#elements.body.scrollLeft : view.scrollLeft || 0,
      },
    };
  }

  /**
   * Сохраняет нынешнее место чтения перед переходом или завершением страницы.
   * @returns {void} Обновляет только запись курсора; без просмотра или во время общей фиксации ничего не сохраняет.
   */
  #captureReading() {
    if (!this.#view || this.#recordingSuspended) return;
    if (
      this.#view.pendingViewVisit
      || this.#view.request.kind === 'source-file' && this.#view.sourceMode === 'source' && !this.#sourceRequest?.ready
    ) return;
    this.#journal.updateCurrent(this.#entryData(this.#view), this.#view.historyId || null);
  }

  /**
   * Согласует метаданные уже показанного материала с записью курсора.
   * @param {ActiveView} view Просмотр, чей DOM только что отобразился или сменил вид.
   * @returns {void} Обновляет текущую запись без нового посещения; чужой просмотр и общая фиксация пропускаются.
   */
  #recordShown(view) {
    if (this.#view !== view || this.#recordingSuspended || view.pendingViewVisit) return;
    this.#journal.updateCurrent(this.#entryData(view), view.historyId || null);
    this.#updateNavigationActions();
  }

  /**
   * Фиксирует только законченную пользовательскую смену TEXT/HTML или DOC/SOURCE по правилам текущего журнала.
   * @param {ActiveView} view Тот же нынешний view после готового представления.
   * @returns {void} IncludeView=false сохраняет reading связанной записи; true допускает переход через all/merge/unique, без исключения из policy.
   */
  #recordViewTransition(view) {
    if (!view.pendingViewVisit || !this.#current(view) || this.#recordingSuspended) return;
    view.pendingViewVisit = false;
    view.historyId = this.#journal.accept(this.#entryData(view), 'push', view.historyId || null, { view: true })?.id
      || null;
    this.#updateNavigationActions();
  }

  /**
   * Восстанавливает сохранённую прокрутку, когда нынешний DOM готов к чтению.
   * @param {ActiveView} view Просмотр с необязательным restoreReading от истории, закладки или обновления.
   * @returns {void} Применяет обе координаты и освобождает временную копию; чужой/неготовый просмотр сохраняет ожидание.
   */
  #restoreReading(view) {
    if (!view.restoreReading || !this.#displayCurrent(view)) return;
    const reading = view.restoreReading;
    this.#elements.body.scrollTop = reading.scrollTop;
    this.#elements.body.scrollLeft = reading.scrollLeft;
    view.restoreReading = null;
  }

  /**
   * Готовит одну строку истории или закладки без чтения материала.
   * @param {import('./journal.mjs').JournalEntry} entry Проверенные метаданные одной записи внутреннего журнала.
   * @returns {import('../../component/navigation-collection/index.mjs').CollectionRow} Подписи и признаки текущей записи/закладки для пассивного компонента.
   */
  #collectionRow(entry) {
    return collectionRow(entry, this.#journal.cursor, Boolean(this.#journal.bookmarkFor(entry.target)));
  }

  /**
   * Открывает метаданные истории без нового посещения материала.
   * @returns {void} Показывает временную область и передаёт фокус первой доступной команде, если оболочка готова.
   */
  showHistory() {
    this.#showPopup('history');
  }
  /**
   * Открывает метаданные закладок в сохранённом виде без нового посещения.
   * @returns {void} Показывает временную область и её действия; отсутствующие материалы не читаются до выбора записи.
   */
  showBookmarks() {
    this.#showPopup('bookmarks');
  }
  /**
   * Открывает поиск только в нынешнем показанном материале и передаёт фокус полю.
   * @returns {void} Показывает встроенную полосу либо fallback без материала, захватывая только числовые границы выделения до фокуса input. Latest хранится отдельно от адресного журнала.
   */
  showFind() {
    if (!this.#events || this.#moving || !this.#searchBar) return;
    const retainedSelection = this.#searchOpen && this.#popupKind !== null && this.#searchProjection
        && this.#searchSelectionProjection === this.#searchProjection
      ? this.#searchProjection
      : null;
    if (!this.#refreshingCurrent) this.#cancelNavigation();
    this.#captureReading();
    this.#searchOpen = true;
    this.#reindexSearch();
    if (!retainedSelection || retainedSelection !== this.#searchProjection) this.#captureSearchSelection();
    if (this.#searchSelectionOnly) this.#findSearchMatches();
    if (this.#view && this.#current(this.#view) && !this.#view.prepared?.denied) {
      this.#closePopup(false);
      this.#renderSearch()?.focus({ preventScroll: true });
    } else this.#showPopup('search');
  }

  /**
   * Открывает отдельный список сохранённых запросов без фиксации незавершённого ввода.
   * @returns {void} Прежний popup показывает только строки SearchState; материал и его история не меняются.
   */
  showSearchHistory() {
    this.#showPopup('searchHistory');
  }

  /**
   * Открывает существующее поле корня организации в прежнем popup, не создавая владельца пути или хранилища.
   * @returns {void} Передаёт фокус полю; проверка, сохранение и сброс остаются в Preferences.
   */
  showOrganizationRoot() {
    this.#showPopup('organizationRoot');
  }

  /**
   * Показывает одну временную область в прежнем host и сохраняет допустимый прежний фокус.
   * @param {'history'|'bookmarks'|'search'|'searchHistory'|'organizationRoot'} kind Адресная коллекция, поиск, список запросов либо местный путь; выбор области не является посещением.
   * @returns {void} Готовит область и фокусирует ввод/команду; поиск сохраняет ожидающее C того же показанного материала. Другие новые области отменяют подготовку; без подключения или при переносе действие пропускается.
   */
  #showPopup(kind) {
    if (!this.#popup || !this.#popupContent || this.#moving || !this.#events) return;
    if (this.#popupKind !== kind) {
      resetSearchHistory(this.#popupContent);
      this.#cancelPendingBookmarks();
      this.#bookmarkDeleteConfirm = null;
      this.#bookmarkNameMode = null;
      this.#jsonTransfer = null;
    }
    if (this.#popupKind !== kind && !(kind === 'search' && this.#refreshingCurrent)) this.#cancelNavigation();
    if (kind !== 'search') {
      this.#searchDragStop?.();
      this.#searchDragStop = null;
    }
    this.#captureReading();
    if (!this.#popup.open) {
      this.#popupFocus = deepFocus(this.ownerDocument);
      this.#popupView = this.#matchingFooterView();
    }
    this.#popupKind = kind;
    if (kind === 'search') {
      this.#searchOpen = true;
      this.#reindexSearch();
    }
    this.#renderPopup();
    this.#placePopup();
  }

  /**
   * Проверяет соответствие единственного показанного материала и нынешнего нижнего адреса перед служебным переносом фокуса.
   * @returns {ActiveView|null} Ссылка на тот же нынешний view либо null при другом адресе, parked-состоянии или отсутствии просмотра.
   */
  #matchingFooterView() {
    const view = this.#view;
    const target = this.#settings.footerTarget();
    return view && this.#current(view) && target && targetKey(target) === targetKey(view.target) ? view : null;
  }

  /**
   * Захватывает только геометрию и допустимый фокус живой формы без копии модели, запроса или текста материала.
   * @returns {PopupPlacement|null} Местная проекция прежних узлов; null без выбранной временной области.
   */
  #capturePopupPlacement() {
    const popup = this.#popup;
    const content = this.#popupContent;
    if (!popup || !content || !this.#popupKind) return null;
    const focused = deepFocus(this.ownerDocument);
    return {
      focused: focused && popup.contains(focused) ? focused : null,
      scrollTop: popup.scrollTop,
      scrollLeft: popup.scrollLeft,
      contentTop: content.scrollTop,
      contentLeft: content.scrollLeft,
    };
  }

  /**
   * Открывает прежний popup последним в native top layer после размещения документа.
   * @param {PopupPlacement|null} [placement] Фокус и прокрутка до служебного закрытия; без них выбирается первый ввод или действие формы.
   * @returns {void} Сохраняет живые input и модель, возвращает допустимый фокус и связывает search drag с нынешним окном; без области ничего не делает.
   */
  #placePopup(placement = null) {
    const popup = this.#popup;
    const content = this.#popupContent;
    if (!popup || !content || !this.#popupKind || !this.#events) return;
    if (!popup.open) popup.showModal();
    if (this.#popupKind === 'search' && !this.#searchDragStop) {
      this.#searchDragStop = bindSearchDrag(popup, this.#events.signal);
    }
    const focused = placement?.focused;
    if (focused?.isConnected && focused.ownerDocument === this.ownerDocument && popup.contains(focused)) {
      focused.focus({ preventScroll: true });
    } else {
      const first = content.querySelector(this.#jsonTransfer ? 'textarea' : 'input, select, button');
      if (isHTMLElement(first)) first.focus({ preventScroll: true });
      if (first?.tagName === 'TEXTAREA' && this.#jsonTransfer && !this.#jsonTransfer.importing) {
        /** @type {HTMLTextAreaElement} */ (first).select();
      }
    }
    if (placement) {
      popup.scrollTop = placement.scrollTop;
      popup.scrollLeft = placement.scrollLeft;
      content.scrollTop = placement.contentTop;
      content.scrollLeft = placement.contentLeft;
    }
  }

  /**
   * Согласует временную область с готовыми метаданными и действиями нынешнего владельца.
   * @returns {void} Снимает прежний жест коллекции, отображает выбранную область и связывает id с операциями журнала; без области ничего не делает.
   */
  #renderPopup() {
    const popup = this.#popup;
    const container = this.#popupContent;
    if (!popup || !container || !this.#popupKind) return;
    this.#collectionStop?.();
    this.#collectionStop = null;
    popup.classList.toggle('is-search', this.#popupKind === 'search');
    popup.classList.toggle('is-organization-root', this.#popupKind === 'organizationRoot');
    const screen = this.#popupKind === 'organizationRoot' ? 'preferences'
      : this.#popupKind === 'searchHistory' ? 'search' : this.#popupKind;
    if ((screen === 'bookmarks' || screen === 'history' || screen === 'preferences' || screen === 'search') && !screenReady(screen)) {
      if (!this.#popupMarkup.has(screen)) this.#loadPopupMarkup(screen);
      render(
        screenStatus(
          this.#popupMarkup.get(screen) === 'failed',
          () => this.#loadPopupMarkup(screen),
          () => this.#closePopup(),
        ),
        container,
      );
      return;
    }
    if (this.#popupKind === 'organizationRoot') {
      const model = this.#settings.getOrganizationRootControl();
      popup.setAttribute('aria-label', model.label);
      render(
        renderOrganizationRootControl({
          ...model,
          id: 'navigation-organization-root',
          onChange: undefined,
          save: value => {
            if (this.#moving) return false;
            const saved = this.#settings.getOrganizationRootControl().save?.(value) ?? false;
            this.#renderPopup();
            return saved;
          },
          reset: () => {
            if (this.#moving) return;
            this.#settings.getOrganizationRootControl().reset?.();
            this.#renderPopup();
          },
        }),
        container,
      );
      return;
    }
    popup.setAttribute('aria-label', ui.navigation[this.#popupKind]);
    if (this.#popupKind === 'search') {
      this.#renderSearch();
      return;
    }
    if (this.#popupKind === 'searchHistory') {
      renderSearchHistory(container, {
        queries: this.#searchState.queries,
        current: this.#searchState.latest,
        labels: {
          title: ui.navigation.searchHistory,
          empty: ui.navigation.searchHistoryEmpty,
          remove: ui.navigation.searchHistoryRemove,
          close: ui.navigation.close,
          message: this.#searchState.failure === 'corrupt'
            ? ui.navigation.storageCorrupt
            : this.#searchState.failure
            ? ui.navigation.storageFailed
            : '',
          retry: ui.navigation.retryStorage,
        },
        icons: { remove: controlIcon('trash'), close: controlIcon('close') },
      }, {
        select: query => {
          if (this.#moving) return;
          this.#searchState.setLatest(query);
          this.#resetSearchRecall();
          this.#searchCurrent = -1;
          this.#findSearchMatches();
          this.showFind();
        },
        remove: query => {
          if (this.#moving) return;
          if (query === this.#searchState.latest) this.#searchDeletedDraft = query;
          this.#searchState.remove(query);
          this.#resetSearchRecall();
          this.#renderPopup();
        },
        close: () => this.#closePopup(),
        retry: () => {
          if (this.#moving) return;
          this.#searchState.retryStorage();
          this.#resetSearchRecall();
          this.#findSearchMatches();
          this.#renderPopup();
        },
        exportData: () => this.#searchState.exportData(),
        importData: value => {
          if (this.#moving) return false;
          const accepted = this.#searchState.importData(value);
          if (accepted) this.#resetSearchRecall();
          return accepted;
        },
        refresh: () => this.#renderPopup(),
      });
      return;
    }
    const list = this.#popupKind;
    const labels = ui.navigation;
    const entries = list === 'bookmarks'
      ? this.#journal.bookmarks.filter(entry => entry.groupId === this.#journal.currentGroup)
      : this.#journal.history;
    const groups = this.#journal.bookmarkGroups;
    const storageFailure = this.#journal.failure;
    const model = {
      rows: entries.map(entry => {
        const row = bookmarkRow(
          entry,
          this.#journal.cursor,
          Boolean(this.#journal.bookmarkFor(entry.target)),
          this.#settings.targetUsesBranch?.(entry.target) === true,
          this.ownerDocument,
        );
        const pending = list === 'bookmarks' ? this.#pendingBookmarks.get(entry.id) : null;
        row.pendingRemove = list === 'history' ? this.#pendingHistory.has(entry.id) : Boolean(pending);
        if (pending) {
          row.removeSeconds = Math.max(1, Math.ceil((pending.deadline - pending.display.performance.now()) / 1000));
        }
        const current = this.#settings.footerTarget();
        if (list === 'bookmarks') row.active = Boolean(current && targetKey(current) === targetKey(entry.target));
        const target = entry.target;
        const path = target.kind === 'repository'
          ? ''
          : target.kind === 'directory'
          ? target.readmePath || target.path
          : target.path;
        const fileName = path.split('/').at(-1) || entry.title.name;
        const fileIcon = nodeIcon({
          type: target.kind === 'directory' && target.readmePath === null
            ? 'directory'
            : target.kind === 'repository'
            ? 'repository'
            : 'file',
          name: fileName,
        }, { repositories: true, directories: true, files: true, symbols: true });
        fileIcon?.removeAttribute('data-icon-group');
        if (fileIcon && fileIcon.ownerDocument !== this.ownerDocument) this.ownerDocument.adoptNode(fileIcon);
        return {
          ...row,
          fileKey: historyFileKey(target),
          fileName,
          fileIcon,
          ref: target.kind === 'repository' ? '' : target.ref,
          groupId: entry.groupId || '',
        };
      }),
      ...(list === 'history'
        ? {
          controlsOpen: this.#historySettingsOpen,
          historyControls: { ...this.#journal.historySettings, empty: this.#journal.history.length === 0 },
          historyExclusions: {
            repositories: this.#journal.historyExclusions.map(item => ({
              id: historyRepositoryKey(item.origin),
              name: item.name,
            })),
          },
        }
        : {
          bookmarkGroups: {
            groups,
            currentGroup: this.#journal.currentGroup,
            canDeleteGroup: groups.length > 1,
            confirmDelete: this.#bookmarkDeleteConfirm === this.#journal.currentGroup,
            moveMode: groups.length > 1 && this.#bookmarkMoveMode,
            nameMode: this.#bookmarkNameMode,
          },
        }),
      ...(this.#jsonTransfer ? { transfer: this.#jsonTransferView(this.#jsonTransfer) } : {}),
      labels: {
        title: labels[list],
        empty: list === 'history' ? labels.emptyHistory : labels.emptyBookmarks,
        remove: list === 'bookmarks' ? labels.deleteBookmark : labels.remove,
        undo: labels.undo,
        addBookmark: labels.addBookmark,
        removeBookmark: labels.removeBookmark,
        reorder: labels.reorder,
        close: labels.close,
        toggleView: this.#journal.bookmarkTree ? labels.bookmarksList : labels.bookmarksTree,
        toggleControls: this.#historySettingsOpen ? labels.historyHideSettings : labels.historyShowSettings,
        message: storageFailure === 'corrupt'
          ? labels.storageCorrupt
          : storageFailure
          ? labels.storageFailed
          : this.#navigationMessage,
        retry: labels.retryStorage,
        reset: labels.resetStorage,
        exportAll: list === 'bookmarks' ? labels.bookmarksExportAll : labels.historyExport,
        importAll: list === 'bookmarks' ? labels.bookmarksImportAll : labels.historyImport,
        actionMode: this.#bookmarkMoveMode ? labels.bookmarkShowDelete : labels.bookmarkShowMove,
        historyControls: {
          collect: labels.historyCollect,
          policy: labels.historyPolicy,
          all: labels.historyAll,
          merge: labels.historyMerge,
          unique: labels.historyUnique,
          includeView: labels.historyIncludeView,
          limit: labels.historyLimit,
          clear: labels.historyClear,
        },
        historyExclusions: {
          label: labels.historyExcludedRepositories,
          empty: labels.historyNoExcludedRepositories,
          unblock: labels.historyUnblockRepository,
        },
        bookmarkGroups: {
          select: labels.bookmarkGroupSelect,
          name: labels.bookmarkGroupName,
          create: labels.bookmarkGroupCreate,
          rename: labels.bookmarkGroupRename,
          delete: labels.bookmarkGroupDelete,
          confirmDelete: labels.bookmarkGroupConfirmDelete.replace(
            '{name}',
            groups.find(group => group.id === this.#journal.currentGroup)?.name || '',
          ),
          confirm: labels.confirmDelete,
          cancel: labels.cancel,
          export: labels.bookmarkExport,
          import: labels.bookmarkImport,
          assign: labels.bookmarkGroupAssign,
        },
      },
      icons: {
        bookmark: controlIcon('bookmark'),
        bookmarked: controlIcon('bookmark-added'),
        bookmarkRemove: controlIcon('bookmark-remove'),
        remove: controlIcon(list === 'bookmarks' ? 'trash.square' : 'trash'),
        close: controlIcon('close'),
        view: controlIcon(this.#journal.bookmarkTree ? 'bookmarks-list' : 'bookmarks-tree'),
        controls: controlIcon('icons'),
        assign: controlIcon('bookmark.square'),
        exportAll: controlIcon(list === 'bookmarks' ? 'square.and.arrow.up.on.square' : 'tray.and.arrow.up'),
        importAll: controlIcon(list === 'bookmarks' ? 'square.and.arrow.down.on.square' : 'tray.and.arrow.down'),
        groups: {
          create: controlIcon('square.badge.plus'),
          rename: controlIcon('square.and.pencil'),
          remove: controlIcon('trash.square'),
          export: controlIcon('square.and.arrow.up'),
          import: controlIcon('square.and.arrow.down'),
          cancel: controlIcon('xmark.square'),
        },
      },
    };
    /** @type {import('../../component/navigation-collection/index.mjs').CollectionActions} */
    const actions = {
      autoCollect: value => this.#setHistorySettings({ autoCollect: value }),
      policy: value => this.#setHistorySettings({ policy: value }),
      includeView: value => this.#setHistorySettings({ includeView: value }),
      limit: value => this.#setHistorySettings({ limit: value }),
      clear: () => this.#clearHistory(),
      exportAll: () => this.#openJSONTransfer(list === 'bookmarks' ? 'bookmarks' : 'history', false),
      importAll: () => this.#openJSONTransfer(list === 'bookmarks' ? 'bookmarks' : 'history', true),
      exportGroup: () => this.#openJSONTransfer('group', false),
      importGroup: () => this.#openJSONTransfer('group', true),
      editJSON: value => {
        const transfer = this.#jsonTransfer;
        if (this.#moving || !transfer?.importing) return;
        transfer.value = value;
        const refresh = transfer.confirming || Boolean(transfer.message);
        transfer.confirming = false;
        transfer.confirmation = '';
        transfer.message = '';
        if (refresh) this.#renderPopup();
      },
      selectImportMode: mode => {
        const transfer = this.#jsonTransfer;
        if (
          this.#moving || !transfer?.importing || transfer.scope === 'history' || mode !== 'merge' && mode !== 'replace'
        ) return;
        transfer.mode = mode;
        transfer.confirming = false;
        transfer.confirmation = '';
        transfer.message = '';
        this.#renderPopup();
      },
      applyJSON: () => this.#applyJSONTransfer(),
      closeJSON: () => {
        if (this.#moving) return;
        this.#jsonTransfer = null;
        this.#renderPopup();
        this.#placePopup();
      },
      copyJSON: () => {
        void this.#copyJSONTransfer();
      },
      toggleActionMode: () => {
        if (this.#moving) return;
        this.#cancelPendingBookmarks();
        this.#bookmarkMoveMode = !this.#bookmarkMoveMode;
        this.#renderPopup();
      },
      unblockRepository: id => {
        if (this.#moving) return;
        this.#journal.unblockRepository(id);
        this.#renderPopup();
        this.#updateNavigationActions();
      },
      selectGroup: id => {
        if (this.#moving) return;
        this.#cancelPendingBookmarks();
        this.#bookmarkDeleteConfirm = null;
        this.#bookmarkNameMode = null;
        this.#journal.selectGroup(id);
        this.#renderPopup();
      },
      createGroup: name => {
        if (this.#moving || this.#bookmarkNameMode !== 'create') return;
        if (!this.#journal.createGroup(name)) {
          this.#setNavigationMessage(labels.bookmarkGroupInvalidName);
        } else {
          this.#cancelPendingBookmarks();
          this.#bookmarkDeleteConfirm = null;
          this.#bookmarkNameMode = null;
          this.#setNavigationMessage('');
        }
        this.#renderPopup();
      },
      renameGroup: (id, name) => {
        if (this.#moving || this.#bookmarkNameMode !== 'rename' || id !== this.#journal.currentGroup) return;
        if (!this.#journal.renameGroup(id, name)) this.#setNavigationMessage(labels.bookmarkGroupInvalidName);
        else {
          this.#bookmarkDeleteConfirm = null;
          this.#bookmarkNameMode = null;
          this.#setNavigationMessage('');
        }
        this.#renderPopup();
      },
      editGroupName: mode => {
        if (this.#moving || this.#jsonTransfer || this.#popupKind !== 'bookmarks') return;
        this.#bookmarkNameMode = this.#bookmarkNameMode === mode ? null : mode;
        this.#bookmarkDeleteConfirm = null;
        this.#setNavigationMessage('');
        this.#renderPopup();
        const input = this.#popupContent?.querySelector('#bookmark-group-name');
        if (input?.tagName === 'INPUT') {
          /** @type {HTMLInputElement} */ (input).focus({ preventScroll: true });
          if (mode === 'rename') /** @type {HTMLInputElement} */ (input).select();
        }
      },
      cancelGroupName: () => {
        if (this.#moving) return;
        this.#bookmarkNameMode = null;
        this.#setNavigationMessage('');
        this.#renderPopup();
        this.#placePopup();
      },
      deleteGroup: id => {
        if (this.#moving || groups.length < 2 || id !== this.#journal.currentGroup) return;
        this.#cancelPendingBookmarks();
        this.#bookmarkNameMode = null;
        this.#bookmarkDeleteConfirm = id;
        this.#renderPopup();
      },
      confirmDeleteGroup: id => {
        if (this.#moving || this.#bookmarkDeleteConfirm !== id || id !== this.#journal.currentGroup) return;
        this.#cancelPendingBookmarks();
        this.#bookmarkDeleteConfirm = null;
        const removed = this.#journal.bookmarks.filter(entry => entry.groupId === id);
        if (this.#journal.deleteGroup(id)) {
          for (const entry of removed) this.#refreshBookmarkHighlight(entry.target);
          this.#refreshSourceBookmarks();
          this.#updateNavigationActions();
        }
        if (this.#journal.bookmarkGroups.length < 2) this.#bookmarkMoveMode = false;
        this.#renderPopup();
      },
      cancelDeleteGroup: () => {
        if (this.#moving) return;
        this.#bookmarkDeleteConfirm = null;
        this.#renderPopup();
      },
      assignGroup: (id, groupId) => {
        if (this.#moving) return;
        this.#cancelBookmarkRemoval(id);
        this.#journal.assignGroup(id, groupId);
        this.#renderPopup();
      },
      open: id => {
        if (this.#moving) return;
        const entry = this.#journal[list].find(item => item.id === id);
        if (!entry) return;
        if (list === 'history') void this.navigate(entry.target, { visit: 'restore', recordId: id });
        else void this.#openBookmark(entry);
      },
      remove: id => {
        if (this.#moving) return;
        if (list === 'history') this.#scheduleHistoryRemoval(id);
        else this.#scheduleBookmarkRemoval(id);
        this.#renderPopup();
        this.#updateNavigationActions();
        this.#refreshSourceBookmarks();
      },
      undo: id => {
        if (this.#moving) return;
        if (list === 'history') this.#cancelHistoryRemoval(id);
        else this.#cancelBookmarkRemoval(id);
        this.#renderPopup();
      },
      bookmark: id => {
        if (this.#moving) return;
        const entry = this.#journal[list].find(item => item.id === id);
        if (!entry) return;
        if (this.#journal.bookmarkFor(entry.target)) this.#journal.removeBookmark(entry.target);
        else this.#journal.addBookmark(entry);
        this.#refreshBookmarkHighlight(entry.target);
        this.#renderPopup();
        this.#refreshSourceBookmarks();
      },
      reorder: (id, before) => {
        if (this.#moving) return;
        this.#journal.reorder(list, id, before);
        this.#renderPopup();
        this.#updateNavigationActions();
      },
      close: () => this.#closePopup(),
      ...(storageFailure
        ? {
          retry: () => {
            if (this.#moving) return;
            this.#cancelPendingHistory();
            this.#cancelPendingBookmarks();
            this.#jsonTransfer = null;
            this.#bookmarkDeleteConfirm = null;
            this.#bookmarkNameMode = null;
            this.#cancelNavigation();
            this.#journal.retryStorage();
            this.#renderPopup();
            this.#updateNavigationActions();
          },
          ...(storageFailure === 'corrupt'
            ? {
              reset: () => {
                if (this.#moving) return;
                this.#cancelPendingHistory();
                this.#cancelPendingBookmarks();
                this.#jsonTransfer = null;
                this.#bookmarkDeleteConfirm = null;
                this.#bookmarkNameMode = null;
                this.#cancelNavigation();
                this.#journal.discardStored();
                this.#renderPopup();
                this.#updateNavigationActions();
              },
            }
            : {}),
        }
        : {}),
    };
    if (list === 'bookmarks') {
      delete actions.bookmark;
      actions.toggleView = () => this.toggleCurrentViewMode();
      this.#collectionStop = renderBookmarks(container, { ...model, tree: this.#journal.bookmarkTree }, actions);
    } else {
      actions.toggleControls = () => {
        if (this.#moving || this.#jsonTransfer || this.#popupKind !== 'history') return;
        this.#historySettingsOpen = !this.#historySettingsOpen;
        this.#renderPopup();
        this.#placePopup();
      };
      this.#collectionStop = renderHistory(container, model, actions);
    }
  }

  /**
   * Читает HTML выбранного popup; поздний ответ не подменяет другую открытую область.
   * @param {import('../../common/html/screen.mjs').ScreenName} screen История, закладки либо поле преференсов.
   * @returns {void} Успех сохраняет разметку; отказ показывает повтор только в соответствующем popup.
   */
  #loadPopupMarkup(screen) {
    if (this.#popupMarkup.get(screen) === 'loading' || screenReady(screen)) return;
    this.#popupMarkup.set(screen, 'loading');
    const refresh = () => {
      const current = this.#popupKind === 'organizationRoot' ? 'preferences'
        : this.#popupKind === 'searchHistory' ? 'search' : this.#popupKind;
      if (current === screen && this.#events && !this.#moving) {
        this.#renderPopup();
        this.#placePopup();
      }
      if (screen === 'search' && this.#searchOpen && this.#events && !this.#moving) {
        const input = this.#renderSearch();
        if (!this.#popupKind || this.#popupKind === 'search') input?.focus({ preventScroll: true });
      }
    };
    void loadScreen(screen)
      .then(() => {
        this.#popupMarkup.delete(screen);
      })
      .catch(() => {
        this.#popupMarkup.set(screen, 'failed');
      })
      .finally(refresh);
    refresh();
  }

  /**
   * Открывает форму обмена у прежнего списка, сохраняя владельцев адресов и запросов.
   * @param {'group'|'bookmarks'|'history'} scope Явная область кнопки; вставленный JSON не расширяет её.
   * @param {boolean} importing true предлагает вставку, false показывает снимок для копирования.
   * @returns {void} Снимает местные удаления и прежнее подтверждение; выгрузка содержит только метаданные.
   */
  #openJSONTransfer(scope, importing) {
    if (this.#moving || !this.#events || this.#popupKind !== (scope === 'history' ? 'history' : 'bookmarks')) return;
    this.#captureReading();
    this.#cancelNavigation();
    let value = '';
    if (!importing) {
      const data = scope === 'history'
        ? this.#journal.exportHistory(this.#searchState.queries)
        : this.#journal.exportBookmarks(scope === 'bookmarks');
      value = JSON.stringify(data, null, 2);
    }
    this.#cancelPendingBookmarks();
    this.#bookmarkDeleteConfirm = null;
    this.#bookmarkNameMode = null;
    this.#jsonTransfer = {
      scope,
      importing,
      value,
      mode: scope === 'history' ? 'replace' : 'merge',
      confirming: false,
      confirmation: '',
      message: '',
    };
    this.#renderPopup();
    this.#placePopup();
  }

  /**
   * Готовит подписи и значения одной временной формы JSON без отдельного состояния компонента.
   * @param {PendingJSONTransfer} transfer Нынешний черновик и явная область кнопки обмена.
   * @returns {import('../../component/navigation-collection/index.mjs').CollectionTransfer} Готовая форма; имя подтверждения приходит только из проверенного JSON.
   */
  #jsonTransferView(transfer) {
    const labels = ui.navigation;
    const name = this.#journal.bookmarkGroups.find(group => group.id === this.#journal.currentGroup)?.name || '';
    const title = transfer.scope === 'history'
      ? transfer.importing ? labels.historyImport : labels.historyExport
      : transfer.scope === 'bookmarks'
      ? transfer.importing ? labels.bookmarksImportAll : labels.bookmarksExportAll
      : transfer.importing
      ? labels.bookmarkImport
      : labels.jsonExportSelected.replace('{name}', name);
    return {
      title,
      value: transfer.value,
      importing: transfer.importing,
      allowMerge: transfer.scope !== 'history',
      mode: transfer.mode,
      confirming: transfer.confirming,
      message: transfer.message,
      hint: !transfer.importing ? labels.jsonExportHint : transfer.scope === 'history'
        ? labels.jsonImportHistoryHint
        : transfer.scope === 'group'
        ? labels.jsonImportGroupHint
        : labels.jsonImportBookmarksHint,
      field: labels.jsonField,
      merge: labels.jsonMerge,
      replace: labels.jsonReplace,
      confirmation: transfer.confirmation,
      apply: labels.jsonApply,
      confirm: labels.jsonConfirmReplace,
      copy: labels.jsonCopy,
      cancel: transfer.importing ? labels.cancel : labels.jsonDone,
    };
  }

  /**
   * Проверяет весь ввод и обоих владельцев истории до подтверждения или изменения данных.
   * @returns {void} Ошибка сохраняет текст и нынешние данные; замена требует отдельного принятия проверенного черновика.
   */
  #applyJSONTransfer() {
    const transfer = this.#jsonTransfer;
    if (this.#moving || !transfer?.importing) return;
    const labels = ui.navigation;
    /**
     * Оставляет ошибку в нынешней форме без очистки ввода.
     * @param {string} message Готовая причина отказа проверки.
     * @returns {void} Снимает прежнее подтверждение и отражает отказ.
     */
    const reject = message => {
      transfer.message = message;
      transfer.confirming = false;
      transfer.confirmation = '';
      this.#renderPopup();
    };
    const byteLimit = 5 * 1024 * 1024;
    if (transfer.value.length > byteLimit || new TextEncoder().encode(transfer.value).byteLength > byteLimit) {
      reject(labels.jsonTooLarge);
      return;
    }
    /** @type {unknown} Вставленный JSON остаётся неизвестным до проверки формы каждого владельца. */
    let value;
    try {
      value = JSON.parse(transfer.value);
    } catch {
      reject(labels.jsonInvalid);
      return;
    }
    const expectedType = transfer.scope === 'group' ? 'bookmark-group' : transfer.scope === 'bookmarks'
      ? 'bookmark-groups'
      : 'history';
    if (
      !value || typeof value !== 'object' || Array.isArray(value) || !('type' in value) || value.type !== expectedType
    ) {
      reject(labels.jsonWrongType);
      return;
    }
    if (!('version' in value) || value.version !== 1) {
      reject(labels.jsonUnsupportedVersion);
      return;
    }
    const history = transfer.scope === 'history' ? readHistoryTransfer(value) : null;
    const bookmarks = transfer.scope === 'history' ? null : readBookmarkTransfer(value);
    if (transfer.scope === 'history' ? !history : !bookmarks) {
      reject(transfer.scope === 'history' ? labels.jsonInvalidHistory : labels.jsonInvalidBookmarks);
      return;
    }
    const queries = history ? readSearchQueries(history.searchQueries) : null;
    if (history && !queries) {
      reject(labels.jsonInvalidQueries);
      return;
    }
    if (transfer.mode === 'replace' && !transfer.confirming) {
      transfer.message = '';
      transfer.confirming = true;
      transfer.confirmation = history ? labels.jsonReplaceHistory : bookmarks?.type === 'bookmark-group'
        ? labels.jsonReplaceGroup.replace('{name}', bookmarks.group.name)
        : labels.jsonReplaceBookmarks;
      this.#renderPopup();
      return;
    }
    // Проверка обоих блоков завершена; синхронная фиксация не отдаёт управление позднему переходу или таймеру.
    this.#cancelNavigation();
    this.#cancelPendingBookmarks();
    const previousBookmarks = this.#journal.bookmarks;
    let accepted = false;
    if (history && queries) {
      this.#cancelPendingHistory();
      if (this.#pendingRetry?.visit === 'restore') this.#clearPreparationRetry();
      accepted = this.#journal.importHistory(history);
      if (accepted) {
        this.#searchState.mergeQueries(queries);
        this.#resetSearchRecall();
        if (this.#view) {
          this.#view.historyId = null;
          this.#view.pendingViewVisit = false;
        }
      }
    } else if (bookmarks) accepted = this.#journal.importBookmarks(bookmarks, transfer.mode);
    if (!accepted) {
      reject(history ? labels.jsonInvalidHistory : labels.jsonInvalidBookmarks);
      return;
    }
    this.#jsonTransfer = null;
    this.#bookmarkDeleteConfirm = null;
    this.#bookmarkNameMode = null;
    if (this.#journal.bookmarkGroups.length < 2) this.#bookmarkMoveMode = false;
    for (const entry of previousBookmarks) this.#refreshBookmarkHighlight(entry.target);
    this.#refreshSourceBookmarks();
    this.#setNavigationMessage(
      this.#journal.failure || history && this.#searchState.failure ? labels.storageFailed : labels.jsonImported,
    );
    this.#renderPopup();
    this.#placePopup();
  }

  /**
   * Копирует только нынешнюю выгрузку и проверяет срок жизни формы после асинхронного ответа буфера.
   * @returns {Promise<void>} При отказе сохраняет доступный для ручного копирования JSON; поздний ответ не меняет новую область.
   */
  async #copyJSONTransfer() {
    const transfer = this.#jsonTransfer;
    if (this.#moving || !transfer || transfer.importing) return;
    let message = ui.appearance.copied;
    try {
      const clipboard = this.ownerDocument.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('Clipboard is unavailable');
      await clipboard.writeText(transfer.value);
    } catch {
      message = ui.navigation.jsonCopyFailed;
    }
    if (this.#moving || this.#jsonTransfer !== transfer || !this.#events) return;
    transfer.message = message;
    this.#renderPopup();
    this.#placePopup();
  }

  /**
   * Применяет правила истории через её прежнего владельца и отменяет прежний restore после нового намерения настройки.
   * @param {unknown} changes Scalar поля виджета, которые Journal проверяет до сохранения.
   * @returns {void} Новый предел не оставляет ожидающих удалённых id; текущий материал и закладки сохраняются.
   */
  #setHistorySettings(changes) {
    if (this.#moving) return;
    this.#captureReading();
    if (this.#historyRestoreRequest) this.#cancelNavigation();
    if (!this.#journal.setHistorySettings(changes)) return;
    for (const id of this.#pendingHistory.keys()) {
      if (!this.#journal.historyEntry(id)) this.#cancelHistoryRemoval(id);
    }
    if (
      this.#pendingRetry?.visit === 'restore'
      && (!this.#pendingRetry.recordId || !this.#journal.historyEntry(this.#pendingRetry.recordId))
    ) this.#clearPreparationRetry();
    this.#renderPopup();
    this.#updateNavigationActions();
  }

  /**
   * Очищает историю и её непринятые операции, сохраняя читаемый материал и пользовательские группы закладок.
   * @returns {void} Поздний pending restore не возвращает очищенные посещения; кнопки и popup отражают пустой журнал.
   */
  #clearHistory() {
    if (this.#moving) return;
    if (this.#historyRestoreRequest) this.#cancelNavigation();
    this.#cancelPendingHistory();
    if (this.#pendingRetry?.visit === 'restore') this.#clearPreparationRetry();
    this.#journal.clearHistory();
    if (this.#view) {
      this.#view.historyId = null;
      this.#view.pendingViewVisit = false;
    }
    this.#renderPopup();
    this.#updateNavigationActions();
  }

  /**
   * Возвращает только метаданные реально принятого и готового материала для ручного сбора.
   * @returns {import('./journal.mjs').EntryData|null} Чтение нынешнего view либо null для отказа, loading, denied-shell или отсутствия материала.
   */
  #readyHistoryData() {
    const view = this.#view;
    if (!view || !this.#current(view) || view.failed || view.prepared?.denied) return null;
    if (view.request.kind === 'documents') {
      if (!view.type || typeof view.result?.documents[view.type]?.content !== 'string') return null;
    } else if (view.request.kind === 'source-file' && view.sourceMode === 'source' && !this.#sourceRequest?.ready) {
      return null;
    }
    return this.#entryData(view);
  }

  /**
   * Определяет готовое действие файла в ручном сборе либо запрета репозитория в автоматическом.
   * @returns {{mode:'add'|'remove'|'undo'|'allow-repository'|'exclude-repository',enabled:boolean}} Отсутствие готового view отключает действие; pending файла допускает Undo, запрет не меняет GitHub-доступ.
   */
  #manualHistoryState() {
    const data = this.#readyHistoryData();
    if (this.#journal.historySettings.autoCollect) {
      return {
        mode: data && this.#journal.repositoryExcluded(data.target.origin) ? 'allow-repository' : 'exclude-repository',
        enabled: Boolean(data),
      };
    }
    if (!data) return { mode: 'add', enabled: false };
    const key = historyFileKey(data.target);
    const entries = this.#journal.history.filter(entry => historyFileKey(entry.target) === key);
    return {
      mode: entries.some(entry => this.#pendingHistory.has(entry.id)) ? 'undo' : entries.length ? 'remove' : 'add',
      enabled: true,
    };
  }

  /**
   * Меняет правило текущего репозитория при auto либо принудительно собирает/удаляет файл при manual.
   * @returns {void} Diamond сохраняет прошлую историю; ручной plus подчиняется policy, minus оставляет посещения файла видимыми на 4 секунды, Undo отменяет ожидание. Сам материал остаётся.
   */
  toggleManualHistory() {
    if (this.#moving) return;
    const data = this.#readyHistoryData();
    if (!data) return;
    if (this.#journal.historySettings.autoCollect) {
      this.#journal.setRepositoryExcluded(
        data.target.origin,
        !this.#journal.repositoryExcluded(data.target.origin),
        repositoryName(data.target.origin),
      );
      this.#renderPopup();
      this.#updateNavigationActions();
      return;
    }
    const key = historyFileKey(data.target);
    const entries = this.#journal.history.filter(entry => historyFileKey(entry.target) === key);
    if (entries.some(entry => this.#pendingHistory.has(entry.id))) {
      for (const entry of entries) this.#cancelHistoryRemoval(entry.id);
    } else if (entries.length) {
      for (const entry of entries) this.#scheduleHistoryRemoval(entry.id);
    } else {
      const entry = this.#journal.accept(data, 'push', undefined, { force: true });
      if (this.#view) this.#view.historyId = entry?.id || null;
    }
    this.#renderPopup();
    this.#updateNavigationActions();
  }

  /**
   * Оставляет запись доступной до срока удаления и показывает действие отмены в истории.
   * @param {string} id Id нынешней записи истории; повторное нажатие не продлевает срок.
   * @returns {void} Через четыре секунды удаляет ещё ожидающую запись, не закрывая материал и не добавляя посещение.
   */
  #scheduleHistoryRemoval(id) {
    if (this.#moving) return;
    if (this.#pendingHistory.has(id) || !this.#journal.historyEntry(id)) return;
    const display = this.#commandHome.defaultView || this.#display;
    /** @type {PendingHistoryRemoval} */
    const pending = { timer: 0, phase: 'waiting' };
    pending.timer = display.setTimeout(() => {
      if (pending.phase !== 'waiting') return;
      pending.phase = 'removed';
      this.#pendingHistory.delete(id);
      this.#journal.remove('history', id);
      if (this.#popupKind === 'history') this.#renderPopup();
      this.#updateNavigationActions();
    }, 4000);
    this.#pendingHistory.set(id, pending);
  }

  /**
   * Отменяет ещё ожидающее удаление одной записи без изменения её порядка или курсора.
   * @param {string} id Id записи с местным таймером отмены.
   * @returns {void} Снимает таймер и помечает отмену для уже ожидающего перехода; истёкшую запись не возвращает.
   */
  #cancelHistoryRemoval(id) {
    const pending = this.#pendingHistory.get(id);
    if (!pending) return;
    (this.#commandHome.defaultView || this.#display).clearTimeout(pending.timer);
    pending.phase = 'cancelled';
    this.#pendingHistory.delete(id);
  }

  /**
   * Снимает непринятые удаления перед повторным чтением журнала или окончательным отключением панели.
   * @returns {void} Нынешние записи остаются в постоянном журнале; незавершённые таймеры не переживают reload.
   */
  #cancelPendingHistory() {
    for (const id of this.#pendingHistory.keys()) this.#cancelHistoryRemoval(id);
  }

  /**
   * Оставляет закладку в Journal до конца трёхсекундного срока и обновляет только её счётчик.
   * @param {string} id Id строки нынешней выбранной группы.
   * @returns {void} Ожидание доступно для отмены; поздний callback не удаляет новую запись или запись иной области.
   */
  #scheduleBookmarkRemoval(id) {
    if (this.#moving || this.#popupKind !== 'bookmarks' || this.#jsonTransfer || this.#pendingBookmarks.has(id)) return;
    const entry = this.#journal.bookmarks.find(item => item.id === id);
    if (!entry || entry.groupId !== this.#journal.currentGroup) return;
    const display = this.#display;
    /** @type {PendingBookmarkRemoval} */
    const pending = {
      display,
      timer: 0,
      deadline: display.performance.now() + 3000,
      entry,
      targetKey: targetKey(entry.target),
      groupId: this.#journal.currentGroup,
    };
    /**
     * Проверяет прежнюю запись и область перед следующим тиком или принятием удаления.
     * @returns {void} Новая область и замена метаданных отменяют старое ожидание без изменения журнала.
     */
    const tick = () => {
      if (this.#pendingBookmarks.get(id) !== pending) return;
      if (
        this.#moving || !this.#events || this.#popupKind !== 'bookmarks' || this.#jsonTransfer
        || this.#journal.currentGroup !== pending.groupId || pending.entry.groupId !== pending.groupId
        || targetKey(pending.entry.target) !== pending.targetKey
        || this.#journal.bookmarks.find(item => item.id === id) !== pending.entry || this.#display !== pending.display
      ) {
        this.#cancelBookmarkRemoval(id);
        return;
      }
      const remaining = pending.deadline - display.performance.now();
      if (remaining <= 0) {
        this.#pendingBookmarks.delete(id);
        pending.timer = 0;
        this.#journal.remove('bookmarks', id);
        this.#refreshBookmarkHighlight(entry.target);
        this.#refreshSourceBookmarks();
        this.#updateNavigationActions();
        this.#renderPopup();
      } else {
        const counter = this.#popupContent?.querySelector(`[data-record-id="${id}"] .navigation-remove-countdown`);
        if (counter) counter.textContent = `${Math.ceil(remaining / 1000)} с`;
        pending.timer = display.setTimeout(tick, Math.min(1000, remaining));
      }
    };
    this.#pendingBookmarks.set(id, pending);
    pending.timer = display.setTimeout(tick, 1000);
  }

  /**
   * Отменяет ещё ожидающее удаление одной закладки у фактического окна таймера.
   * @param {string} id Id строки с непринятым ожиданием.
   * @returns {void} Запись, её группа и положение остаются прежними; чужой id ничего не меняет.
   */
  #cancelBookmarkRemoval(id) {
    const pending = this.#pendingBookmarks.get(id);
    if (!pending) return;
    pending.display.clearTimeout(pending.timer);
    this.#pendingBookmarks.delete(id);
  }

  /**
   * Освобождает все таймеры области закладок перед сменой группы, обменом, закрытием или переносом окна.
   * @returns {void} Непринятые удаления не меняют Journal и не переживают срок жизни области.
   */
  #cancelPendingBookmarks() {
    for (const id of this.#pendingBookmarks.keys()) this.#cancelBookmarkRemoval(id);
  }

  /**
   * Закрывает временную область и освобождает её DOM и местные слушатели.
   * @param {boolean} [restoreFocus] Разрешает вернуть прежний фокус, только если узел ещё в том же документе.
   * @returns {void} Закрывает dialog и возвращает допустимый фокус. Если footer до popup соответствовал тому же показанному view, возвращает его адрес прежними событиями; новый/parked материал или иной адрес не восстанавливает. Посещение не создаётся.
   */
  #closePopup(restoreFocus = true) {
    if (this.#moving && restoreFocus) return;
    if (this.#popupContent) resetSearchHistory(this.#popupContent);
    this.#cancelPendingBookmarks();
    this.#bookmarkDeleteConfirm = null;
    this.#bookmarkNameMode = null;
    this.#jsonTransfer = null;
    this.#searchDragStop?.();
    this.#searchDragStop = null;
    const view = this.#popupView;
    const kind = this.#popupKind;
    this.#popupView = null;
    if (restoreFocus && this.#popupKind === 'search') {
      if (this.#searchState.latest !== this.#searchDeletedDraft) this.#searchState.commit();
      this.#clearSearch();
    }
    this.#collectionStop?.();
    this.#collectionStop = null;
    this.#popupKind = null;
    if (this.#popup?.open) this.#popup.close();
    if (this.#popupContent) render(nothing, this.#popupContent);
    const focus = this.#popupFocus;
    this.#popupFocus = null;
    if (restoreFocus && focus?.isConnected && focus.ownerDocument === this.ownerDocument) {
      focus.focus({ preventScroll: true });
    }
    if (restoreFocus && view && this.#current(view)) this.#announceShown(view);
    if (kind && kind !== 'search' && this.#searchOpen) {
      this.#reindexSearch();
      if (restoreFocus && (!this.#view || !this.#current(this.#view) || this.#view.prepared?.denied)) {
        this.#showPopup('search');
      }
    }
  }

  /**
   * Сообщает каталогу фактически показанный адрес и основание прочитанного файла без загрузки, раскрытия дерева или посещения.
   * @param {ActiveView} view Тот же нынешний view; вызывается после готового текста или согласованного возврата фокуса popup.
   * @returns {void} Документ/raw использует прежний document-select, HXDoc/состояние — view-open. Чужой или временно закрытый view пропускается.
   */
  #announceShown(view) {
    if (!this.#displayCurrent(view)) return;
    const request = view.request;
    if (request.kind === 'documents' && view.type && view.result?.source) {
      const document = view.result.documents[view.type];
      if (typeof document?.content === 'string') {
        this.#emit('document-select', {
          token: request.token,
          context: view.context,
          source: view.result.source,
          document: { path: document.path, url: document.url },
          target: view.target,
        });
        return;
      }
    }
    if (
      request.kind === 'source-file' && view.sourceMode === 'source' && request.readySource
      && this.#sourceRequest?.ready
    ) {
      this.#emit('document-select', {
        token: request.token,
        context: view.context,
        source: { url: request.source.url, ref: request.readySource.ref },
        document: { path: request.source.path, url: githubHref(view.target) },
        target: view.target,
      });
      return;
    }
    this.#emit('view-open', { token: request.token, target: view.target });
  }

  /**
   * Выбирает только корень уже показанного текста, исключая gutter, состояние загрузки и команды.
   * @returns {HTMLElement|null} Документ, HXDoc либо ready raw; null при отсутствии разрешённого показанного текста.
   */
  #searchRoot() {
    const view = this.#view;
    if (!view || !this.#displayCurrent(view)) return null;
    if (view.request.kind === 'documents') {
      return view.type && typeof view.result?.documents[view.type]?.content === 'string'
        ? this.#elements.document
        : null;
    }
    if (view.request.kind === 'source-file' && view.sourceMode === 'source') {
      return this.#sourceRequest?.ready && !this.#elements.sourceHost.hidden
        ? this.#elements.sourceHost.querySelector('[data-source-code]')
        : null;
    }
    return this.#elements.state.querySelector('.doc-section') ? this.#elements.state : null;
  }

  /**
   * Показывает одну форму из готовых данных helper и runtime-области нынешнего материала.
   * @returns {HTMLInputElement|null} Прежнее поле встроенной полосы или fallback для фокуса; null при закрытом поиске/отсутствии места. Component не читает материал и хранилище.
   */
  #renderSearch() {
    const embedded = Boolean(this.#view && this.#displayCurrent(this.#view) && !this.#view.prepared?.denied);
    if (embedded && this.#popupKind === 'search') this.#closePopup(false);
    if (this.#searchBar) this.#searchBar.hidden = !this.#searchOpen || !embedded;
    const container = embedded ? this.#searchBar : this.#popupKind === 'search' ? this.#popupContent : null;
    if (!this.#searchOpen || !container) return null;
    if (!screenReady('search')) {
      if (!this.#popupMarkup.has('search')) this.#loadPopupMarkup('search');
      render(screenStatus(this.#popupMarkup.get('search') === 'failed', () => {
        this.#popupMarkup.delete('search');
        this.#renderSearch();
      }), container);
      return null;
    }
    const count = this.#searchMatches.starts.length;
    return renderSearch(container, {
      query: this.#searchState.latest,
      current: count ? this.#searchCurrent + 1 : 0,
      total: count,
      embedded,
      collecting: this.#searchState.collecting,
      selectionOnly: this.#searchSelectionOnly,
      canSelection: this.#searchSelectionOnly
        || Boolean(this.#searchSelectionBounds && this.#searchSelectionProjection === this.#searchProjection),
      labels: {
        label: ui.navigation.searchInMaterial,
        placeholder: this.#searchProjection ? ui.navigation.searchPlaceholder : ui.navigation.searchUnavailable,
        previous: ui.navigation.searchPrevious,
        next: ui.navigation.searchNext,
        clear: ui.navigation.searchClear,
        count: formatText(ui.navigation.searchCount, { current: count ? this.#searchCurrent + 1 : 0, total: count }),
        selection: this.#searchSelectionOnly ? ui.navigation.searchWholeMaterial : ui.navigation.searchSelection,
        collecting: this.#searchState.collecting ? ui.navigation.searchCollectingOn : ui.navigation.searchCollectingOff,
        close: ui.navigation.close,
        history: ui.navigation.searchHistory,
      },
      icons: {
        previous: controlIcon('search-previous'),
        next: controlIcon('search-next'),
        clear: controlIcon('search-clear'),
        selection: controlIcon('search-selection'),
        collecting: controlIcon(this.#searchState.collecting ? 'search-collect-on' : 'search-collect-off'),
        close: controlIcon('close'),
        history: controlIcon('history'),
      },
    }, {
      input: query => this.#searchInput(query),
      recall: direction => this.#recallSearch(direction),
      submit: () => this.#searchStep(1),
      previous: () => this.#searchStep(-1),
      next: () => this.#searchStep(1),
      clear: () => this.#removeSearchQuery(),
      toggleSelection: () => this.#toggleSearchSelection(),
      toggleCollecting: () => {
        if (this.#moving) return;
        this.#searchState.setCollecting(!this.#searchState.collecting);
        this.#renderSearch();
        this.#updateNavigationActions();
      },
      close: () => this.#closeSearch(),
      history: () => this.showSearchHistory(),
    });
  }

  /**
   * Переводит native Selection в числовую область до фокуса формы, не сохраняя Range.
   * @returns {void} Новое действительное выделение заменяет границы; схлопывание сохраняет активную область либо захваченный кандидат при фокусе элементов формы поиска. Новая пустая/чужая область читателя не расширяется до файла.
   */
  #captureSearchSelection() {
    const projection = this.#searchProjection;
    if (
      !projection || projection.document !== this.ownerDocument || this.#searchRoot() !== this.#searchProjectionRoot
    ) return;
    const selection = this.ownerDocument.getSelection();
    const emptyNative = !selection || selection.isCollapsed || !selection.rangeCount;
    const bounds = !emptyNative
      ? searchBoundsForRange(projection, selection.getRangeAt(0))
      : null;
    if (!bounds) {
      // Включённая область уже принадлежит проекции: возврат фокуса в документ не заменяет её схлопнутым native Range.
      if (
        emptyNative && this.#searchSelectionOnly && this.#searchSelectionBounds
        && this.#searchSelectionProjection === projection
      ) return;
      const focused = deepFocus(this.ownerDocument);
      const ownControl = focused?.matches('input,textarea,select,button')
        && (this.#searchBar?.contains(focused) || this.#popupKind === 'search' && this.#popup?.contains(focused));
      // Кнопка области получает фокус до click: действительный кандидат той же проекции нужен для первого включения.
      if (emptyNative && ownControl && this.#searchSelectionBounds && this.#searchSelectionProjection === projection) {
        return;
      }
      this.#searchSelectionBounds = null;
      this.#searchSelectionProjection = null;
      return;
    }
    this.#searchSelectionBounds = bounds;
    this.#searchSelectionProjection = projection;
  }

  /**
   * Ограничивает поиск ранее захваченным выделением либо снимает это ограничение.
   * @returns {void} Новая область принимается только у нынешней проекции; при недоступной области scope не расширяется до всего материала.
   */
  #toggleSearchSelection() {
    if (!this.#searchOpen || this.#moving) return;
    if (this.#searchSelectionOnly) this.#searchSelectionOnly = false;
    else {
      this.#captureSearchSelection();
      if (!this.#searchSelectionBounds || this.#searchSelectionProjection !== this.#searchProjection) return;
      this.#searchSelectionOnly = true;
    }
    this.#searchCurrent = -1;
    this.#findSearchMatches();
    this.#renderSearch();
    this.#searchPainter?.scrollCurrent();
  }

  /**
   * Снимает только обход MRU после нового ввода, фиксации или изменения списка.
   * @returns {void} Latest не копируется и не меняется; временный черновик перестаёт использоваться.
   */
  #resetSearchRecall() {
    this.#searchRecallIndex = -1;
    this.#searchRecallDraft = '';
  }

  /**
   * Выбирает прежний запрос стрелками input, сохраняя его исходный незавершённый черновик.
   * @param {-1|1} direction -1 означает вверх к более старым MRU, 1 вниз обратно к последнему запросу и черновику.
   * @returns {void} Меняет только latest/результаты; recall не фиксирует и не переставляет запросы.
   */
  #recallSearch(direction) {
    if (!this.#searchOpen || this.#moving || !this.#searchState.queries.length) return;
    if (this.#searchRecallIndex < 0) {
      if (direction === 1) return;
      this.#searchRecallDraft = this.#searchState.latest;
    }
    const index = Math.min(this.#searchState.queries.length - 1, this.#searchRecallIndex - direction);
    if (index < 0) {
      const draft = this.#searchRecallDraft;
      this.#resetSearchRecall();
      this.#searchState.setLatest(draft);
    } else {
      this.#searchRecallIndex = index;
      this.#searchState.setLatest(this.#searchState.queries[index]);
    }
    this.#searchCurrent = -1;
    this.#findSearchMatches();
    this.#renderSearch();
    this.#searchPainter?.scrollCurrent();
    this.#updateNavigationActions();
  }

  /**
   * Очищает нынешнюю строку и именно её запись поисковой истории.
   * @returns {void} Остальные запросы остаются; числовое выделение текущего материала не превращается в новую запись.
   */
  #removeSearchQuery() {
    if (this.#moving || !this.#searchOpen) return;
    this.#searchState.remove(this.#searchState.latest);
    this.#searchInput('');
  }

  /**
   * Закрывает форму поиска после явного завершения либо без commit при принудительной очистке.
   * @param {boolean} [commit] true фиксирует непустой completed query; false при отзыве, новом виджете или закрытии материала.
   * @param {boolean} [restoreFocus] true передаёт фокус нынешнему телу документа; служебная очистка его не меняет.
   * @returns {void} Latest/MRU остаются у helper; runtime-текст, Range, bounds и рисунок освобождаются.
   */
  #closeSearch(commit = true, restoreFocus = true) {
    if (this.#moving || !this.#searchOpen) return;
    if (commit && this.#searchState.latest !== this.#searchDeletedDraft) this.#searchState.commit();
    this.#clearSearch();
    if (this.#popupKind === 'search') this.#closePopup(false);
    if (restoreFocus && this.#view && this.#current(this.#view)) this.#elements.body.focus({ preventScroll: true });
    this.#updateNavigationActions();
  }

  /**
   * Освобождает производные закрытого или заменяемого текста до изменения его DOM.
   * @returns {void} Удаляет текущий Range, текст/связи проекции и числовые позиции; query и индекс можно восстановить после V/PiP.
   */
  #releaseSearchProjection() {
    this.#searchPainter?.clear();
    if (this.#searchProjection) releaseSearchProjection(this.#searchProjection);
    this.#searchProjection = null;
    this.#searchProjectionRoot = null;
    this.#searchSelectionBounds = null;
    this.#searchSelectionProjection = null;
    this.#searchSelectionOnly = false;
    this.#searchMatches = { starts: new Uint32Array(), ends: new Uint32Array() };
  }

  /**
   * Снимает только runtime-поиск без фиксации незавершённого запроса.
   * @returns {void} Latest/queries остаются в SearchState; проекция/Range/область и обход MRU очищаются, форма скрывается.
   */
  #clearSearch() {
    this.#releaseSearchProjection();
    this.#searchOpen = false;
    if (this.#searchBar) this.#searchBar.hidden = true;
    this.#resetSearchRecall();
    this.#searchCurrent = -1;
  }

  /**
   * Переиндексирует нынешнее представление только при живой форме после V, готового raw, обновления или переноса.
   * @returns {void} Пересоздаёт производную проекцию и компактные позиции, ограничивая прежний индекс новым числом результатов.
   */
  #reindexSearch() {
    if (!this.#searchOpen || this.#moving && !this.#resumingDisplay) return;
    const root = this.#searchRoot();
    if (!root || root !== this.#searchProjectionRoot || this.#searchProjection?.document !== this.ownerDocument) {
      this.#releaseSearchProjection();
      if (root) {
        this.#searchProjectionRoot = root;
        this.#searchProjection = createSearchProjection(root);
        this.#findSearchMatches();
      }
    }
    this.#renderSearch();
  }

  /**
   * Принимает буквальный ввод формы без отдельной загрузки данных.
   * @param {string} query Полный нынешний запрос, включая пустую строку собственного или native clear.
   * @returns {void} Заменяет query, выбирает первый результат и обновляет готовые UI и один подсвеченный Range.
   */
  #searchInput(query) {
    if (!this.#searchOpen || this.#moving) return;
    this.#searchState.setLatest(query);
    this.#searchDeletedDraft = null;
    this.#resetSearchRecall();
    this.#searchCurrent = -1;
    this.#findSearchMatches();
    this.#renderSearch();
    this.#searchPainter?.scrollCurrent();
    this.#updateNavigationActions();
  }

  /**
   * Вычисляет точные совпадения буквального запроса в проекции нынешнего представления.
   * @returns {void} Счётчик охватывает все неперекрывающиеся совпадения без учёта регистра; Range создаётся только для текущего.
   */
  #findSearchMatches() {
    const projection = this.#searchProjection;
    this.#searchMatches = projection
      ? findSearchMatches(
        projection.text,
        projection.blocks,
        this.#searchState.latest,
        this.#searchSelectionOnly
          ? this.#searchSelectionProjection === projection ? this.#searchSelectionBounds : null
          : undefined,
      )
      : { starts: new Uint32Array(), ends: new Uint32Array() };
    const count = this.#searchMatches.starts.length;
    this.#searchCurrent = count ? Math.min(Math.max(this.#searchCurrent, 0), count - 1) : -1;
    this.#paintSearch();
  }

  /**
   * Выбирает соседнее совпадение по кругу, сохраняя запрос и проекцию.
   * @param {-1|1} direction -1 для предыдущего, 1 для следующего результата.
   * @returns {void} Фиксирует completed query, затем согласует номер/одну подсветку/прокрутку; пустой результат не создаёт Range, но явный Enter остаётся завершением запроса.
   */
  #searchStep(direction) {
    if (!this.#searchOpen || this.#moving) return;
    this.#searchDeletedDraft = null;
    this.#searchState.commit();
    this.#resetSearchRecall();
    this.#searchCurrent = circularSearchIndex(this.#searchCurrent, this.#searchMatches.starts.length, direction);
    this.#paintSearch();
    this.#renderSearch();
    this.#searchPainter?.scrollCurrent();
    this.#updateNavigationActions();
  }

  /**
   * Передаёт пассивному painter только нынешний диапазон, не создавая DOM на каждый результат.
   * @returns {void} Без current/projection снимает слой; иначе показывает единственный действующий Range.
   */
  #paintSearch() {
    if (!this.#searchProjection || this.#searchCurrent < 0) {
      this.#searchPainter?.clear();
      return;
    }
    this.#searchPainter?.show(
      this.#searchProjection,
      this.#searchMatches.starts[this.#searchCurrent],
      this.#searchMatches.ends[this.#searchCurrent],
    );
  }

  /**
   * Открывает проверенный адрес закладки с её сохранённым видом и местом чтения.
   * @param {import('./journal.mjs').JournalEntry} entry Нынешняя закладка без текста или доказательства доступа.
   * @returns {Promise<boolean>} true после перехода и обновления lastBookmark; false при отказе, оставляющем прежний материал.
   */
  async #openBookmark(entry) {
    const opened = await this.navigate(entry.target, { recordId: entry.id });
    if (opened) this.#journal.rememberBookmark(entry.id);
    return opened;
  }

  /**
   * Готовит доступность истории/обновления и краткое состояние для нынешних кнопок.
   * @returns {void} Обновляет только готовые значения и сообщение; без настройки/DOM ничего не делает.
   */
  #updateNavigationActions() {
    if (!this.#navigationActions || !this.#options) return;
    const mode = this.#options.getLinkMode();
    const manual = this.#manualHistoryState();
    const manualLabel = manual.mode === 'undo' ? ui.navigation.historyUndoRemoval : manual.mode === 'remove'
      ? ui.navigation.historyRemoveFile
      : manual.mode === 'allow-repository'
      ? ui.navigation.historyAllowRepository
      : manual.mode === 'exclude-repository'
      ? ui.navigation.historyExcludeRepository
      : ui.navigation.historyAddFile;
    showNavigationActions(this.#navigationActions, {
      canBack: Boolean(this.#journal.adjacentHistory(-1)),
      canForward: Boolean(this.#journal.adjacentHistory(1)),
      canHistory: true,
      canRefresh: Boolean(this.#view && !this.#catalogueParked && !this.#navigationRequest),
      linkLabel: ui.navigation[mode],
      linkTooltip: navigationTooltip(ui.navigation[mode], 'B', ui.navigation.linkModeHold),
      linkIcon: controlIcon(mode === 'vscode' ? 'link-vscode' : mode === 'github' ? 'link-github' : 'link-internal'),
      manualHistoryMode: manual.mode,
      canManualHistory: manual.enabled,
      manualHistoryLabel: manualLabel,
      manualHistoryIcon: controlIcon(
        manual.mode === 'remove'
          ? 'history-subtract'
          : manual.mode === 'undo'
          ? 'reset'
          : manual.mode === 'allow-repository'
          ? 'history-allow-repository'
          : manual.mode === 'exclude-repository'
          ? 'history-exclude-repository'
          : 'history-add',
      ),
    });
    const notice = this.querySelector('#navigation-status');
    if (isHTMLElement(notice)) {
      notice.textContent = this.#journal.failure === 'corrupt'
        ? ui.navigation.storageCorrupt
        : this.#journal.failure
        ? ui.navigation.storageFailed
        : this.#searchState.failure === 'corrupt'
        ? ui.navigation.storageCorrupt
        : this.#searchState.failure
        ? ui.navigation.storageFailed
        : this.#navigationMessage;
      notice.hidden = !notice.textContent;
    }
    this.#updateRetryAction();
    if (this.#pendingRetry && !this.#view) this.#renderPreparationFailure();
    this.#actionVisibility();
  }

  /**
   * Показывает краткий исход перехода, не изменяя сохранённый успешный материал.
   * @param {string} message Готовая подпись операции; пустая строка снимает прежнее сообщение.
   * @returns {void} Заменяет сообщение и снимает его через три секунды; ошибки постоянного хранилища сохраняют собственное состояние.
   */
  #setNavigationMessage(message) {
    const display = this.#commandHome.defaultView || this.#display;
    display.clearTimeout(this.#navigationNoticeTimer);
    this.#navigationNoticeTimer = 0;
    this.#navigationMessage = message;
    if (message) {
      this.#navigationNoticeTimer = display.setTimeout(() => {
        this.#navigationNoticeTimer = 0;
        this.#navigationMessage = '';
        this.#updateNavigationActions();
        if (this.#popupKind && this.#popupKind !== 'search') this.#renderPopup();
      }, 3000);
    }
    this.#updateNavigationActions();
  }

  /**
   * Связывает короткий шаг и вооружённое удержание стрелки; список открывается на release.
   * @param {HTMLButtonElement} button Прежняя стрелка, доступная и без шага при непустой истории.
   * @param {-1|1} direction Направление обычного click относительно курсора.
   * @param {AbortSignal} signal Срок событий нынешнего окна; снимает также visual marker.
   * @returns {void} Порог сообщает готовность, release открывает историю, следующий pointer click подавляется.
   */
  #bindHistoryArrow(button, direction, signal) {
    button.setAttribute('aria-description', ui.navigation.historyHold);
    button.dataset.tooltip = navigationTooltip(
      direction === -1 ? ui.navigation.back : ui.navigation.forward,
      direction === -1 ? 'Z' : 'X',
      ui.navigation.historyHold,
    );
    this.#bindHoldButton(
      button,
      () => {
        void this.#historyStep(direction);
      },
      () => this.showHistory(),
      signal,
    );
  }

  /**
   * Обрамляет одно действие кнопки вооружением и release без отдельного владельца её состояния.
   * @param {HTMLButtonElement} button Живая кнопка нынешнего host.
   * @param {()=>void} short Обычное короткое нажатие; клавиатурный click не ожидает pointer timer.
   * @param {()=>void} held Действие вооружённого release, вызываемое в пользовательском событии.
   * @param {AbortSignal} signal Срок единственной привязки; отменяет таймер и marker при переносе.
   * @returns {void} Уход/движение/scroll отменяют жест; click после HOLD не выполняет short и не закрывает новый popup через backdrop.
   */
  #bindHoldButton(button, short, held, signal) {
    const display = this.#display;
    let timer = 0;
    let pointer = -1;
    let startX = 0;
    let startY = 0;
    let armed = false;
    let suppressClick = false;
    /**
     * Снимает только местное ожидание и визуальную готовность.
     * @returns {void} Действия short/held не вызываются; release suppression живёт до нового pointerdown или своего click.
     */
    const cancel = () => {
      display.clearTimeout(timer);
      timer = 0;
      pointer = -1;
      armed = false;
      button.removeAttribute('data-hold-ready');
    };
    this.ownerDocument.addEventListener('pointerdown', () => {
      if (pointer < 0) suppressClick = false;
    }, { signal, capture: true });
    button.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || button.disabled) return;
      cancel();
      suppressClick = false;
      pointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      timer = display.setTimeout(() => {
        timer = 0;
        if (this.#moving || !this.#events || pointer !== event.pointerId || !button.isConnected) return;
        armed = true;
        button.setAttribute('data-hold-ready', '');
      }, this.#holdDuration);
    }, { signal });
    this.ownerDocument.addEventListener('pointerup', event => {
      if (event.pointerId !== pointer) return;
      const ready = armed && !this.#moving && Boolean(this.#events);
      cancel();
      if (ready) {
        suppressClick = true;
        held();
      }
    }, { signal, capture: true });
    this.ownerDocument.addEventListener('pointermove', event => {
      if (event.pointerId === pointer && Math.hypot(event.clientX - startX, event.clientY - startY) > 8) {
        suppressClick = true;
        cancel();
      }
    }, { signal, passive: true });
    this.ownerDocument.addEventListener('pointercancel', event => {
      if (event.pointerId === pointer) {
        suppressClick = true;
        cancel();
      }
    }, { signal, capture: true });
    button.addEventListener('pointerleave', () => {
      if (pointer >= 0) {
        suppressClick = true;
        cancel();
      }
    }, { signal });
    this.ownerDocument.addEventListener('click', event => {
      if (!suppressClick || event.detail <= 0) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, { signal, capture: true });
    button.addEventListener('click', () => {
      if (!this.#moving && this.#events) short();
    }, { signal });
    this.ownerDocument.addEventListener('scroll', () => {
      if (pointer >= 0) cancel();
    }, { signal, capture: true, passive: true });
    display.addEventListener('blur', cancel, { signal });
    signal.addEventListener('abort', cancel, { once: true });
  }

  /**
   * Обрабатывает физические команды панели в её документе и исходном окне.
   * @param {KeyboardEvent} event Событие клавиатуры; модификаторы, повтор и ввод в полях оставляются владельцу ввода.
   * @returns {void} Предотвращает стандартное действие лишь для принятой команды; popup закрывается Escape/Q.
   */
  #navigationKey(event) {
    if (
      this.#moving || event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey
      || event.metaKey
    ) return;
    if (this.#popupKind && event.key === 'Escape') {
      event.preventDefault();
      this.#closePopup();
      return;
    }
    if (this.#searchOpen && event.key === 'Escape') {
      event.preventDefault();
      this.#closeSearch();
      return;
    }
    const path = event.composedPath();
    for (
      let focused = event.view?.document.activeElement || null;
      focused;
      focused = focused.shadowRoot?.activeElement || null
    ) path.push(focused);
    if (path.some(node => isHTMLElement(node) && (node.matches('input,textarea,select') || node.isContentEditable))) {
      return;
    }
    if ((this.#popupKind || this.#searchOpen) && isCommandKey(event, 'KeyQ')) {
      event.preventDefault();
      if (this.#popupKind) this.#closePopup();
      else this.#closeSearch();
      return;
    }
    /** @type {(()=>void)|null} */
    let run = null;
    if (!event.shiftKey) {
      if (event.code === 'KeyZ') {
        run = () => {
          void this.backward();
        };
      }
      if (event.code === 'KeyX') {
        run = () => {
          void this.forward();
        };
      }
      // Обновить текущий документ.
      if (event.code === 'KeyR') {
        run = () => {
          void this.refreshCurrent();
        };
      }
      if (event.code === 'KeyV') run = () => this.toggleCurrentViewMode();
      if (event.code === 'KeyU') {
        run = () => {
          this.#settings.cycleLinkMode();
          this.refreshLinkMode();
        };
      }
      if (event.code === 'KeyH') run = () => this.showHistory();
      if (event.code === 'KeyB') run = () => this.showBookmarks();
      if (event.code === 'KeyF') run = () => this.showFind();
    }
    if (event.code === 'Comma' || event.code === 'Period') {
      run = () => {
        const entry = this.#journal.adjacentBookmark(event.code === 'Comma' ? -1 : 1);
        if (entry) void this.#openBookmark(entry);
      };
    }
    if (event.code === 'KeyL') {
      run = event.shiftKey
        ? () => {
          const target = this.#settings.footerTarget();
          if (target) {
            this.#cancelBookmarkDrag();
            this.#journal.removeBookmark(target);
            this.#refreshBookmarkHighlight(target);
          }
          this.#renderPopup();
          this.#refreshSourceBookmarks();
        }
        : () => {
          const entry = this.#journal.lastBookmark();
          if (entry) void this.#openBookmark(entry);
        };
    }
    if (run) {
      event.preventDefault();
      this.#cancelPiPHold();
      run();
    }
  }

  /**
   * Начинает удержание E для переноса нынешней информации в PiP.
   * @param {HTMLElement} [readyTarget] Живой элемент для визуального признака; по умолчанию нынешний dialog.
   * @returns {void} Таймер только вооружает действие; окно запрашивается при finishPiPHold из события release.
   */
  beginPiPHold(readyTarget) {
    const view = this.#view;
    if (!view || !this.#current(view) || !this.#pip?.supported || this.#pipHold) return;
    const hold = { view, display: this.#display, timer: 0, armed: false, target: readyTarget || this.#elements.dialog };
    hold.timer = hold.display.setTimeout(() => {
      if (this.#pipHold !== hold) return;
      if (!this.#current(hold.view)) return;
      hold.armed = true;
      hold.target.setAttribute('data-hold-ready', '');
    }, this.#holdDuration);
    this.#pipHold = hold;
  }

  /**
   * Выполняет вооружённое PiP из пользовательского release, сохраняя его browser activation.
   * @returns {boolean} true, если release принят и запрос окна начат; false без armed/current. Асинхронный успех окна определяет прежний controller.
   */
  finishPiPHold() {
    const hold = this.#pipHold;
    const ready = Boolean(hold?.armed && this.#current(hold.view) && this.#pip?.supported && !this.#pip.pending);
    this.#cancelPiPHold();
    if (ready) void this.#pip?.open('docs');
    return ready;
  }

  /**
   * Снимает внешний кандидат PiP после ухода фокуса, нового действия или отмены Catalog.
   * @returns {void} Отложенное действие и visual marker больше не действуют; нынешний материал сохраняется.
   */
  cancelPiPHold() {
    this.#cancelPiPHold();
  }

  /**
   * Снимает таймер удержания E и кандидата короткого переключения.
   * @returns {void} Старое удержание больше не может перенести или переключить материал.
   */
  #cancelPiPHold() {
    if (this.#pipHold) this.#pipHold.display.clearTimeout(this.#pipHold.timer);
    this.#pipHold?.target.removeAttribute('data-hold-ready');
    this.#pipHold = null;
    this.#shortSourceE = null;
  }

  /**
   * Согласует прежние D/E/R внутри информации с переключением вида и удержанием PiP.
   * @param {KeyboardEvent} event Нынешний ввод документа панели; команды проверяются физическим кодом.
   * @returns {void} D выбирает документацию, E ждёт отпускания/hold, R повторяет отказ; другое действие отменяет удержание.
   */
  #informationKey(event) {
    if (this.#moving) return;
    if (
      !this.#view && this.#pendingRetry && event.composedPath().includes(this.#elements.dialog)
      && isCommandKey(event, 'KeyE')
    ) {
      if (this.#retry()) event.preventDefault();
      return;
    }
    const sourceView =
      this.#view?.request.kind === 'source-file' && event.composedPath().includes(this.#elements.dialog)
        ? this.#view
        : null;
    if (sourceView && isCommandKey(event, 'KeyD')) {
      event.preventDefault();
      this.#cancelPiPHold();
      this.#selectSourceTab(sourceView, 'documentation', true);
      return;
    }
    if (this.#view && event.composedPath().includes(this.#elements.dialog) && isCommandKey(event, 'KeyE')) {
      event.preventDefault();
      this.#shortSourceE = sourceView;
      this.beginPiPHold(isHTMLElement(event.target) ? event.target : this.#elements.dialog);
      return;
    }
    if (
      event.code !== 'KeyE' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing
    ) this.#cancelPiPHold();
    if (isCommandKey(event, 'KeyR') && this.#retry()) event.preventDefault();
  }

  /**
   * Завершает короткое E только для того же ещё действующего просмотра.
   * @param {KeyboardEvent} event Отпускание клавиши в нынешнем документе панели.
   * @returns {void} Короткое E выбирает source; завершённый hold и сменённый просмотр ничего не переключают.
   */
  #informationKeyUp(event) {
    if (event.code !== 'KeyE') return;
    const short = this.#shortSourceE;
    if (this.finishPiPHold()) {
      event.preventDefault();
      return;
    }
    this.#cancelPiPHold();
    if (short && this.#current(short) && isCommandKey(event, 'KeyE')) {
      event.preventDefault();
      this.#selectSourceTab(short, 'source', true);
    }
  }

  /**
   * Закрывает обычную информацию либо сначала возвращает docs-only PiP в main.
   * @returns {void} Асинхронный результат переноса закрывает только прежний всё ещё нынешний просмотр.
   */
  #collapseInformation() {
    const view = this.#view;
    if (!view) {
      if (this.#dom?.dialog.open) this.close();
      return;
    }
    this.#cancelPiPHold();
    if (!this.#settings.standalone) {
      this.close();
      return;
    }
    const controller = this.#pip;
    if (controller?.mode !== 'docs') return;
    void controller.open('main').then((opened) => {
      if (opened && controller.mode === 'main' && this.#current(view)) this.close();
    });
  }

  /**
   * Подключает прежний координатор живого переноса и его текущую доступность.
   * @param {import('../../app/picture-in-picture.mjs').PictureInPictureController} controller Единственный координатор переноса приложения; второе окно материала не создаётся.
   * @returns {void} Подписывается в срок нынешней привязки и отражает поддержку/ожидание PiP на кнопке.
   */
  setPictureInPicture(controller) {
    this.#pip = controller;
  }

  /**
   * Временно снимает события нынешнего окна, сохраняя единственный DOM и материал для переноса.
   * @param {import('../../app/picture-in-picture.mjs').PanelPlacement} placement Узлы принимающего размещения; исходное размещение сохраняется для отката.
   * @returns {import('../../app/picture-in-picture.mjs').PreparedMove} resume перепривязывает после переноса, commit завершает паузу, rollback восстанавливает прежнее размещение и может сообщить AggregateError.
   */
  prepareMove(placement) {
    this.#releaseSearchProjection();
    this.#motion?.finishAll();
    this.#captureReading();
    this.#cancelNavigation();
    const source = this.#settings;
    const { dialog, body, document: content } = this.#elements;
    const showing = dialog.open && !this.#catalogueParked;
    const active = deepFocus(this.ownerDocument);
    const focused = active && this.contains(active) ? active : null;
    const popupPlacement = this.#capturePopupPlacement();
    const footerView = this.#matchingFooterView();
    const scroll = { top: body.scrollTop, left: body.scrollLeft };
    const tables = prepareDocumentContent(content);
    /**
     * Возвращает подготовленное отображение до общей фиксации, не открывая обычные действия панели.
     * @param {(operation:()=>void)=>void} [perform] По умолчанию отказ прерывает resume; rollback передаёт сборщик, чтобы попытаться восстановить каждую область.
     * @returns {void} Синхронные DOM/API завершаются при ещё откатываемых таблицах; pending-чтения сохраняют прежние поколение и загрузчик.
     */
    const restoreDisplay = (perform = operation => operation()) => {
      const restoring = this.#resumingDisplay;
      const suspended = this.#recordingSuspended;
      this.#resumingDisplay = true;
      this.#recordingSuspended = true;
      try {
        perform(() => this.#restoreSourceStyle());
        perform(() => this.#sourceRequest?.resumeHighlight(this.#display));
        perform(() => this.#refreshSourceBookmarks());
        perform(() => this.#searchPainter?.rebind());
        perform(() => {
          if (
            this.#view?.request.kind === 'source-file' && this.#view.sourceMode === 'source'
            && !this.#sourceRequest?.ready && !this.#sourceRequest?.failed
          ) this.#showSource(this.#view);
        });
        perform(() => {
          if (this.#view?.pendingDocumentRender) this.#finishDocumentLoad(this.#view);
        });
        perform(() => this.#reindexSearch());
        perform(() => {
          if (footerView && this.#displayCurrent(footerView)) this.#announceShown(footerView);
        });
        perform(() => {
          if (this.#popupKind && this.#popupKind !== 'organizationRoot') this.#renderPopup();
        });
        perform(() => this.#placePopup(popupPlacement));
        perform(() => this.#notifyVisibility());
      } finally {
        this.#recordingSuspended = suspended;
        this.#resumingDisplay = restoring;
      }
    };
    /**
     * Возвращает события, размещение, прокрутку и допустимый фокус после переноса прежнего DOM.
     * @returns {void} Пауза moving остаётся до commit; подготовленные таблицы получают своё новое окно.
     */
    const resume = () => {
      this.#connect();
      if (dialog.open) dialog.close();
      if (showing) this.#place(false, popupPlacement);
      else {
        this.#settings.footerHome.append(this.#settings.footer);
        this.#placePopup(popupPlacement);
      }
      tables.resume();
      body.scrollTop = scroll.top;
      body.scrollLeft = scroll.left;
      if (
        !popupPlacement && focused?.isConnected && focused.ownerDocument === this.ownerDocument
        && !focused.closest('[hidden]')
      ) {
        focused.focus({ preventScroll: true });
      } else if (!popupPlacement && this.#view && this.#settings.standalone) body.focus({ preventScroll: true });
      body.scrollTop = scroll.top;
      body.scrollLeft = scroll.left;
      restoreDisplay();
    };
    /**
     * Восстанавливает исходное размещение после частичного отказа, пробуя все шаги очистки/возврата.
     * @returns {void} Снимает паузу и повторно индексирует нынешний DOM; собранные отказы передаёт как AggregateError.
     */
    const rollback = () => {
      /** @type {unknown[]} */
      const failures = [];
      /**
       * Выполняет один шаг отката и собирает отказ, чтобы остальные узлы тоже восстановились.
       * @param {()=>void} operation Синхронное восстановление одной прежней привязки или области.
       * @returns {void} Отказ добавляется в общий список, а не прерывает следующие шаги отката.
       */
      const attempt = (operation) => {
        try {
          operation();
        } catch (error) {
          failures.push(error);
        }
      };
      try {
        attempt(() => this.#stopBindings());
        this.#options = source.workspace.ownerDocument === this.ownerDocument ? source : this.#homeOptions;
        attempt(() => this.#connect());
        attempt(() => {
          if (dialog.open) dialog.close();
          if (showing) this.#place(false, popupPlacement);
          else {
            this.#settings.footerHome.append(this.#settings.footer);
            this.#placePopup(popupPlacement);
          }
        });
        attempt(() => tables.rollback());
        body.scrollTop = scroll.top;
        body.scrollLeft = scroll.left;
        if (!popupPlacement && focused?.isConnected && focused.ownerDocument === this.ownerDocument) {
          focused.focus({ preventScroll: true });
        }
        restoreDisplay(attempt);
      } finally {
        this.#moving = false;
      }
      if (failures.length) throw new AggregateError(failures, 'Could not restore information bindings');
    };
    this.#moving = true;
    try {
      this.#stopBindings();
      this.#options = { ...source, ...placement };
    } catch (error) {
      try {
        rollback();
      } catch (failure) {
        throw new AggregateError([error, failure], 'Information preparation failed');
      }
      throw error;
    }
    return {
      resume,
      rollback,
      commit: () => {
        tables.commit();
        this.#moving = false;
      },
    };
  }

  /**
   * Подключает оболочку и события после обычного добавления панели.
   * @returns {void} Во время согласованного PiP-переноса не создаёт вторую привязку.
   */
  connectedCallback() {
    if (!this.#moving) this.#connect();
  }
  /**
   * Окончательно снимает текущие привязки при удалении панели из DOM.
   * @returns {void} Согласованный перенос пропускает очистку; обычное отключение очищает запросы и непостоянные состояния.
   */
  disconnectedCallback() {
    if (!this.#moving) this.#disconnect();
  }

  /**
   * Однократно находит обязательную оболочку и создаёт её местные контроллеры.
   * @returns {boolean} true при готовых узлах; false, пока HTML ещё не загружен.
   */
  #initialize() {
    if (this.#dom) return true;
    const nodes = readPanelDOM(this);
    if (!nodes) return false;
    this.#dom = nodes;
    this.#navigationActions = readNavigationActions(this);
    this.#popup = /** @type {HTMLDialogElement|null} */ (this.querySelector('#navigation-popup'));
    this.#popupContent = this.querySelector('#navigation-content');
    const searchBar = this.querySelector('#docs-search-bar');
    this.#searchBar = isHTMLElement(searchBar) ? searchBar : this.ownerDocument.createElement('section');
    this.#searchBar.id = 'docs-search-bar';
    this.#searchBar.hidden = true;
    this.#searchBar.setAttribute('aria-label', ui.navigation.searchInMaterial);
    if (!this.#searchBar.parentElement) nodes.body.before(this.#searchBar);
    this.#panelWidth = new PanelWidth(
      nodes.dialog,
      nodes.resize,
      widthRules,
      (percent) => formatText(widthRules.ariaWidth, { percent }),
    );
    this.#sourceRequest = new SourceRequest(nodes.sourceHost);
    nodes.sourceRetry.setAttribute('aria-label', ui.sourceViewer.retry);
    nodes.sourceRetry.setAttribute('data-tooltip', ui.sourceViewer.retry);
    nodes.sourceRetry.title = ui.sourceViewer.retry;
    const retryLabel = nodes.sourceRetry.querySelector('.source-retry-label');
    if (retryLabel) retryLabel.textContent = ui.sourceViewer.retry;
    labelSourceTabs(nodes.sourceTabs, [ui.sourceViewer.documentation, ui.sourceViewer.sourceCode]);
    renderControlIcons(this);
    return true;
  }

  /**
   * Проверяет право runtime-просмотра менять нынешний открытый DOM.
   * @param {ActiveView} view Кандидат ответа или действия, чья identity должна совпасть с единственным текущим просмотром.
   * @returns {boolean} true только при подключении, отсутствии переноса и открытом dialog; access stamp проверяется перед общей фиксацией, а не при локальном V.
   */
  #current(view) {
    return Boolean(
      this.#events && !this.#moving && this.isConnected && this.#view === view && this.#dom?.dialog.open,
    );
  }
  /**
   * Разрешает только отображение прежнего текущего материала в защищённом resume/rollback.
   * @param {ActiveView} view Принятый просмотр, который не копируется и не меняет владельца во время переноса.
   * @returns {boolean} Обычный current либо узкий синхронный display allowance; публичные действия и ввод по-прежнему требуют !moving.
   */
  #displayCurrent(view) {
    return this.#current(view) || Boolean(
      this.#resumingDisplay && this.#events && this.isConnected
        && this.#view === view && this.#dom?.dialog.open,
    );
  }
  /**
   * Предоставляет уже найденные обязательные узлы единственной оболочки.
   * @returns {PanelDOM} Нынешние узлы, сохраняющие identity при переносе.
   * @throws {Error} Если HTML оболочки ещё не готов.
   */
  get #elements() {
    if (!this.#dom) throw new Error('Document panel markup is not ready');
    return this.#dom;
  }

  /**
   * Предоставляет нынешнее размещение и действия прежних владельцев.
   * @returns {PanelOptions} Настройка этого размещения без копии состояния каталога или предпочтений.
   * @throws {Error} Если configure ещё не выполнен.
   */
  get #settings() {
    if (!this.#options) throw new Error('Document panel is not configured');
    return this.#options;
  }

  /**
   * Определяет модальное размещение по media query нынешнего документа.
   * @returns {boolean} true для узкой области; false до создания привязки.
   */
  get #smallScreen() {
    return this.#mobile?.matches ?? false;
  }

  /**
   * Предоставляет окно нынешних событий и геометрии.
   * @returns {Window & typeof globalThis} Привязанное окно либо фактическое окно ownerDocument после переноса.
   */
  get #display() {
    return this.#boundView || displayWindow(this);
  }
  /**
   * Читает срок у прежнего владельца настроек, сохраняя специальные 0 и null без подмены default.
   * @returns {SourceHighlightDuration} Сохранённый scalar либо 3000 мс только при отсутствии getter.
   */
  get #sourceHighlightDuration() {
    return this.#settings.getSourceHighlightDuration ? this.#settings.getSourceHighlightDuration() : 3000;
  }
  /**
   * Готовит короткое смещение входа и закрытия панели.
   * @returns {string} CSS transform для правого края; выбор размещения не меняет владельца DOM.
   */
  #offset() {
    return 'translateX(12px)';
  }

  /**
   * Сообщает каталогу принятое открытие, документ или завершённое закрытие.
   * @param {'view-open'|'document-select'|'view-close'} type Вид события принятого состояния панели.
   * @param {ViewOpened|DocumentSelected|ViewClosed} detail Готовые runtime-токен и метаданные события; DOM-токен не сохраняется в журнал.
   * @returns {void} Порождает всплывающее событие для прежнего владельца выбора и нижнего адреса.
   */
  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }

  /**
   * Показывает готовый шаблон HXDoc, ожидания или отказа в единственной области состояния.
   * @param {import('lit').TemplateResult} template Готовая разметка пассивного компонента.
   * @param {boolean} [privateView] Центрирует состояние ожидания/отказа и включает его оформление.
   * @returns {void} Согласует прежние state/document/sourceHost и значки без принятия нового адреса.
   */
  #showState(template, privateView = false) {
    this.#releaseSearchProjection();
    showPanelState(this.#elements, template, { centered: privateView, host: this });
    this.#reindexSearch();
    if (this.#popupKind === 'search') this.#renderPopup();
  }

  /**
   * Готовит рекурсивную документацию с точными адресами известных объявлений.
   * @param {import('../catalog/index.mjs').CatalogNode} node Уже разрешённый узел HXDoc; файл или объявление не читается заново.
   * @param {boolean} [heading] Добавляет подпись и знак дочернего объявления.
   * @param {string} [symbolPath] Канонический путь объявления от outline-файла; нужен для адреса известной строки.
   * @returns {import('lit').TemplateResult} Готовый шаблон документации; source-ссылки создаются только для подтверждённых объявлений нынешнего файла.
   */
  #hxdoc(node, heading = false, symbolPath = '') {
    const view = this.#view;
    const file = view?.request.kind === 'source-file' ? view.request : null;
    const base = view?.target;
    const path = node.type === 'file' ? node.path : symbolPath;
    const nextSymbol = node.type === 'symbol'
      ? path
        || (file?.target.kind === 'declaration'
          ? file.target.symbolPath
          : base?.kind === 'declaration'
          ? base.symbolPath
          : '')
      : '';
    /** @type {MaterialTarget|null} */
    const target = file && node.type === 'symbol' && node.line && base && base.kind !== 'repository'
      ? {
        kind: 'declaration',
        origin: base.origin,
        ref: file.readySource?.ref || base.ref,
        path: file.source.path,
        symbolPath: nextSymbol,
        symbolKind: node.kind || 'symbol',
        line: node.line,
      }
      : null;
    return outlineDocument({
      heading: heading
        ? {
          name: node.name,
          label: node.kind ? `${node.kind} ${node.name}` : undefined,
          icon: nodeIcon(node, this.#icons),
          ...(target
            ? {
              href: this.#settings.linkHref(target),
              target: JSON.stringify(target),
              onOpen: (/** @type {MouseEvent} */ event) => this.#openDeclaration(target, event),
            }
            : {}),
        }
        : undefined,
      text: typeof node.doc === 'string' ? node.doc : '',
      children: node.children.map((child) =>
        this.#hxdoc(
          child,
          true,
          node.type === 'file' ? `${node.path}#${child.name}` : nextSymbol ? `${nextSymbol}.${child.name}` : child.name,
        )
      ),
    });
  }

  /**
   * Очищает единственный запрос raw и его местный DOM перед уходом из source.
   * @returns {void} Поздний raw ответ отвергается; кнопка повтора и busy-состояние снимаются.
   */
  #leaveSource() {
    this.#cancelBookmarkDrag(false);
    this.#bookmarkDragStop?.();
    this.#bookmarkDragStop = null;
    this.#releaseSearchProjection();
    this.#sourceRequest?.clear();
    if (!this.#dom) return;
    this.#elements.body.removeAttribute('aria-busy');
    this.#elements.sourceRetry.hidden = true;
    this.#actionVisibility();
  }

  /**
   * Возвращает готовый raw с уже подготовленным CSS нового документа внутри защищённого возобновления.
   * @returns {void} Сохраняет Text, frame и прокрутку без Promise, скрытия и повторного чтения.
   * @throws {Error} Неготовый CSS или чужой owner прерывает resume до фиксации таблиц.
   */
  #restoreSourceStyle() {
    const view = this.#view;
    const request = this.#sourceRequest;
    if (!request || view?.request.kind !== 'source-file' || view.sourceMode !== 'source' || !request.ready) return;
    request.restoreStyle(this.ownerDocument);
  }

  /**
   * Отражает выбранное представление Haxe в нынешних вкладках и отдельную политику обычного открытия.
   * @param {ActiveView} view Нынешний Haxe-просмотр.
   * @param {'documentation'|'source'} mode documentation показывает HXDoc, source готовит raw-представление.
   * @returns {void} Согласует toolbar/вкладки и runtime mode; постоянное предпочтение не меняется.
   */
  #sourceTab(view, mode) {
    const { body, toolbar, tabs, sourceTabs } = this.#elements;
    toolbar.hidden = false;
    tabs.hidden = true;
    sourceTabs.hidden = false;
    view.sourceMode = mode;
    showSourceTab(sourceTabs, body, mode);
    this.#elements.mode.hidden = false;
    this.#showSourcePin();
    this.#actionVisibility();
  }

  /**
   * Показывает уже готовую документацию файла или объявления вместо raw.
   * @param {ActiveView} view Нынешний source-file запрос с подготовленным узлом HXDoc.
   * @returns {void} Очищает raw и показывает HXDoc; обновляет текущие метаданные без нового посещения.
   */
  #showSourceDocumentation(view) {
    if (view.request.kind !== 'source-file') return;
    const wasSource = view.sourceMode === 'source';
    this.#leaveSource();
    this.#sourceTab(view, 'documentation');
    const docs = this.#hxdoc(view.request.node);
    this.#showState(view.request.node.type === 'symbol' ? compactDocument(docs) : docs);
    this.#elements.body.scrollTop = 0;
    if (wasSource) this.#emit('view-open', { token: view.request.token, target: view.target });
    this.#recordShown(view);
  }

  /**
   * Читает либо использует готовый raw-файл и принимает результат только в том же режиме/поколении.
   * @param {ActiveView} view Действующий source-file просмотр с отменяемым загрузчиком и необязательным readySource.
   * @returns {void} Запускает оболочку/чтение; поздний ответ не меняет новый материал, успешный обновляет ref/строку/footer и чтение.
   */
  #showSource(view) {
    if (view.request.kind !== 'source-file' || !this.#displayCurrent(view) || !this.#sourceRequest) return;
    this.#releaseSearchProjection();
    this.#sourceTab(view, 'source');
    const { body, state, sourceHost, sourceRetry, document: content } = this.#elements;
    disposeDocumentContent(content);
    content.hidden = true;
    content.replaceChildren();
    state.hidden = true;
    sourceHost.hidden = false;
    sourceRetry.hidden = true;
    this.#actionVisibility();
    body.classList.remove('is-private');
    body.setAttribute('aria-busy', 'true');
    const sourceRequest = this.#sourceRequest;
    const readySource = view.request.readySource;
    const { revision, promise } = sourceRequest.start(
      readySource ? () => Promise.resolve(readySource) : view.request.load,
      view.request.source.library,
      view.request.version,
      this.#commandHome,
    );
    if (this.#popupKind === 'search') this.#renderPopup();
    void promise.then((result) => {
      if (!this.#current(view) || view.sourceMode !== 'source' || !sourceRequest.current(revision)) return;
      body.removeAttribute('aria-busy');
      sourceRetry.hidden = !sourceRequest.failed;
      this.#actionVisibility();
      if (!result || view.request.kind !== 'source-file') {
        view.pendingViewVisit = false;
        return;
      }
      view.request.readySource = result;
      body.scrollTop = 0;
      if (view.request.line !== null) this.#scrollSourceLine(view.request.line);
      if (view.target.kind === 'source' || view.target.kind === 'declaration') {
        view.target = { ...view.target, ref: result.ref };
      }
      this.#announceShown(view);
      this.#restoreReading(view);
      this.#refreshSourceBookmarks();
      this.#bindBookmarkDrag();
      this.#recordShown(view);
      this.#recordViewTransition(view);
      this.#reindexSearch();
      if (this.#popupKind === 'search') this.#renderPopup();
    });
  }

  /**
   * Прокручивает нынешний raw к выбранной строке и обновляет доступную подпись gutter.
   * @param {number} line Целевая строка файла начиная с 1; clamp и ready-проверка принадлежат SourceRequest.
   * @param {boolean} [preview] Pointer preview держит только визуальную полосу без expiry до release/cancel.
   * @returns {void} Согласует положение, доступную строку и срок полосы; истечение срока не меняет номер/адрес/reading. Без ready прокрутки нет.
   */
  #scrollSourceLine(line, preview = false) {
    this.#sourceRequest?.scrollLine(this.#elements.body, line, this.#display, this.#sourceHighlightDuration, preview);
    this.#labelSourceLine(line);
  }

  /**
   * Обновляет доступные имя и состояние закладки выбранной строки gutter.
   * @param {number} line Строка по умолчанию, если raw ещё не записал selectedLine.
   * @returns {void} Отражает точный source-адрес строки; не добавляет закладку или посещение.
   */
  #labelSourceLine(line) {
    const gutter = this.#elements.sourceHost.querySelector('[data-source-gutter]');
    if (isHTMLElement(gutter)) {
      const selected = Number(gutter.dataset.selectedLine) || line;
      gutter.setAttribute(
        'aria-label',
        formatText(ui.navigation.sourceLine, { line: selected }),
      );
      const view = this.#view;
      const bookmarked = view?.request.kind === 'source-file' && view.target.kind !== 'repository'
        && this.#journal.bookmarkFor({
          kind: 'source',
          origin: view.target.origin,
          ref: view.request.readySource?.ref || view.target.ref,
          path: view.request.source.path,
          line: selected,
        });
      gutter.setAttribute('aria-pressed', String(Boolean(bookmarked)));
    }
  }

  /**
   * Обрабатывает обычное внутреннее нажатие на подтверждённое объявление HXDoc.
   * @param {MaterialTarget} target Точный адрес объявления/строки нынешнего файла.
   * @param {MouseEvent} event Нажатие ссылки; изменённое модификаторами или внешний режим сохраняет обычное href.
   * @returns {void} Выбирает source и прокручивает тот же адрес либо запускает navigate; только принятое внутреннее нажатие отменяет браузерное действие.
   */
  #openDeclaration(target, event) {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (this.#settings.getLinkMode() !== 'internal') return;
    event.preventDefault();
    const view = this.#view;
    if (view?.request.kind === 'source-file' && this.#current(view) && targetKey(view.target) === targetKey(target)) {
      this.#selectSourceTab(view, 'source');
      if (
        (target.kind === 'source' || target.kind === 'declaration') && target.line !== null
        && this.#sourceRequest?.ready
      ) {
        this.#scrollSourceLine(target.line);
      }
    } else void this.navigate(target, { initialMode: 'source' });
  }

  /**
   * Готовит фактический адрес объявления для уже показанного заголовка.
   * @param {ActiveView} view Просмотр файла/объявления, чьё readySource может уточнить ref.
   * @returns {MaterialTarget|null} Адрес декларации с фактическим ref либо null для другого заголовка.
   */
  #headingTarget(view) {
    const request = view.request;
    return request.kind === 'source-file' && request.target.kind === 'declaration'
      ? { ...request.target, ref: request.readySource?.ref || request.target.ref }
      : null;
  }

  /**
   * Находит только известное объявление с точным номером строки, не угадывая тело метода.
   * @param {SourceFileRequest} request Подготовленный source-file запрос с узлами outline.
   * @param {number} line Строка raw-файла начиная с 1, для которой нужна подпись закладки.
   * @returns {Extract<MaterialTarget,{kind:'declaration'}>|null} Адрес точного объявления либо null; произвольная строка остаётся адресом file+line.
   */
  #declarationAt(request, line) {
    const target = this.#view?.target || request.target;
    if (target.kind === 'repository') return null;
    /**
     * Ищет известное объявление с точной строкой внутри подготовленного HXDoc.
     * @param {import('../catalog/index.mjs').CatalogNode} node Узел нынешнего файла или его дочернее объявление.
     * @param {string} symbolPath Канонический путь узла от outline-файла.
     * @returns {Extract<MaterialTarget,{kind:'declaration'}>|null} Адрес первого точного объявления либо null без такого узла.
     */
    const visit = (node, symbolPath) => {
      if (node.type === 'symbol' && node.line === line) {
        return {
          kind: 'declaration',
          origin: target.origin,
          ref: request.readySource?.ref || target.ref,
          path: request.source.path,
          symbolPath,
          symbolKind: node.kind || 'symbol',
          line,
        };
      }
      for (const child of node.children) {
        const childPath = node.type === 'file'
          ? `${node.path}#${child.name}`
          : symbolPath
          ? `${symbolPath}.${child.name}`
          : child.name;
        const found = visit(child, childPath);
        if (found) return found;
      }
      return null;
    };
    return visit(request.node, request.target.kind === 'declaration' ? request.target.symbolPath : '');
  }

  /**
   * Готовит точную metadata-позицию строки, не угадывая границы тела объявления.
   * @param {ActiveView} view Готовый source-file просмотр единственного файла.
   * @param {number} line Целая допустимая строка; собственное объявление берётся только при точном равенстве line.
   * @returns {import('./journal.mjs').EntryData|null} Адрес/подпись/чтение без текста либо null вне нынешнего raw.
   */
  #sourceLineData(view, line) {
    if (
      view.request.kind !== 'source-file' || view.sourceMode !== 'source' || !this.#current(view)
      || !this.#sourceRequest?.ready || view.target.kind === 'repository' || !Number.isSafeInteger(line)
      || line < 1 || line > this.#sourceRequest.lineCount
    ) return null;
    const request = view.request;
    const declaration = this.#declarationAt(request, line);
    const target = declaration || {
      kind: /** @type {'source'} */ ('source'),
      origin: view.target.origin,
      ref: request.readySource?.ref || view.target.ref,
      path: request.source.path,
      line,
    };
    const title = declaration
      ? {
        type: /** @type {'symbol'} */ ('symbol'),
        name: declaration.symbolPath.split(/[.#]/).at(-1) || request.title.name,
        kind: declaration.symbolKind,
      }
      : {
        type: /** @type {'file'} */ ('file'),
        name: `${request.source.path.split('/').at(-1) || request.title.name}:${line}`,
      };
    return { ...this.#entryData(view), target, title };
  }

  /**
   * Принимает положение реально выбранной строки raw без нового посещения.
   * @param {ActiveView} view Действующий source view.
   * @param {import('./journal.mjs').EntryData} data Проверенные метаданные этой строки.
   * @param {number} line Принятая строка файла начиная с 1.
   * @returns {void} Согласует нынешний адрес, подсветку/footer и запись курсора; Journal закладок меняется отдельным действием.
   */
  #selectSourcePosition(view, data, line) {
    if (view.request.kind !== 'source-file') return;
    this.#captureReading();
    view.target = data.target;
    view.request.line = line;
    this.#scrollSourceLine(line);
    this.#announceShown(view);
    view.historyId = this.#journal.accept(this.#entryData(view), 'push')?.id || null;
    this.#updateNavigationActions();
  }

  /**
   * Создаёт закладку выбранной строки; повторное нажатие сохраняет существующую запись.
   * @param {number} line Допустимая строка готового source.
   * @returns {void} Точный entity либо file+line становится нынешним адресом; дубль не создаётся и bookmark не удаляется.
   */
  #bookmarkSourceLine(line) {
    const view = this.#view;
    const data = view && this.#sourceLineData(view, line);
    if (!view || !data) return;
    this.#cancelNavigation();
    this.#selectSourcePosition(view, data, line);
    this.#journal.addBookmark({ ...data, reading: this.#entryData(view).reading });
    this.#refreshSourceBookmarks();
    this.#setNavigationMessage(ui.navigation.bookmarkAdded);
    this.#updateNavigationActions();
  }

  /**
   * Захватывает существующую metadata-метку перед локальным жестом; постоянная запись ещё не меняется.
   * @param {number} line Начальная строка marker, созданного компонентом.
   * @returns {boolean} true для готовой существующей метки; false при смене view или отсутствии bookmark.
   */
  #startBookmarkDrag(line) {
    const view = this.#view;
    const data = view && this.#sourceLineData(view, line);
    const entry = data && this.#journal.bookmarkFor(data.target);
    if (!view || !entry || this.#bookmarkDrag) return false;
    const gutter = this.#elements.sourceHost.querySelector('[data-source-gutter]');
    this.#bookmarkDrag = {
      view,
      id: entry.id,
      originalLine: line,
      selectedLine: Number(gutter?.getAttribute('data-selected-line')) || line,
      line,
      pointerLine: line,
      direction: 1,
      remove: false,
    };
    return true;
  }

  /**
   * Выбирает свободную preview-строку либо обозначает боковое удаление только после detach порога компонента.
   * @param {number} clientX Горизонтальная координата pointer нынешнего source окна.
   * @param {number} clientY Вертикальная координата для номера строки, не для выделения текста.
   * @returns {void} Занятые другой меткой строки пропускаются по направлению движения; Journal остаётся прежним до finish.
   */
  #moveBookmarkDrag(clientX, clientY) {
    const drag = this.#bookmarkDrag;
    const gutter = this.#elements.sourceHost.querySelector('[data-source-gutter]');
    if (!drag || !this.#current(drag.view) || !isHTMLElement(gutter) || !this.#sourceRequest?.ready) return;
    const bounds = gutter.getBoundingClientRect();
    drag.remove = clientX < bounds.left || clientX > bounds.right;
    const marker = this.#elements.sourceHost.querySelector(`[data-bookmark-line="${drag.originalLine}"]`);
    marker?.toggleAttribute('data-bookmark-removing', drag.remove);
    if (drag.remove) {
      this.#scrollSourceLine(drag.line, true);
      return;
    }
    const height = parseFloat(this.#display.getComputedStyle(gutter).lineHeight);
    if (!Number.isFinite(height) || height <= 0) return;
    const desired = Math.max(
      1,
      Math.min(this.#sourceRequest.lineCount, Math.floor((clientY - bounds.top) / height) + 1),
    );
    if (desired !== drag.pointerLine) drag.direction = desired > drag.pointerLine ? 1 : -1;
    drag.pointerLine = desired;
    for (let line = desired; line >= 1 && line <= this.#sourceRequest.lineCount; line += drag.direction) {
      const data = this.#sourceLineData(drag.view, line);
      const occupied = data && this.#journal.bookmarkFor(data.target);
      if (!data || occupied && occupied.id !== drag.id) continue;
      drag.line = line;
      if (isHTMLElement(marker)) marker.style.setProperty('--bookmark-line', String(line - 1));
      this.#scrollSourceLine(line, true);
      return;
    }
    // Пока свободного места нет, прежняя preview-строка всё равно остаётся видимой до release/cancel.
    this.#scrollSourceLine(drag.line, true);
  }

  /**
   * Фиксирует один законченный drag; удаление и move используют прежнего владельца metadata.
   * @returns {void} Боковой release удаляет id, внутренний перенос меняет его адрес без перестановки/дубля. Чужой view ничего не принимает.
   */
  #finishBookmarkDrag() {
    const drag = this.#bookmarkDrag;
    this.#bookmarkDrag = null;
    if (!drag || !this.#current(drag.view)) return;
    if (drag.remove) {
      this.#journal.remove('bookmarks', drag.id);
      this.#sourceRequest?.refreshHighlight(this.#sourceHighlightDuration, this.#display);
    } else {
      const data = this.#sourceLineData(drag.view, drag.line);
      if (data && this.#journal.moveBookmark(drag.id, data)) this.#selectSourcePosition(drag.view, data, drag.line);
      else this.#scrollSourceLine(drag.selectedLine);
    }
    this.#refreshSourceBookmarks();
    if (this.#popupKind === 'bookmarks') this.#renderPopup();
  }

  /**
   * Отменяет только preview жеста перед новым view, pointercancel либо переносом.
   * @param {boolean} [reset] true начинает новый срок после пользовательской отмены; false восстанавливает прежний остаток перед clear/PiP без нового timer.
   * @returns {void} Metadata-адрес не меняется; прежняя семантическая строка и рисунок меток возвращаются для того же view. Перенос не воскрешает погашенную до preview полосу.
   */
  #cancelBookmarkDrag(reset = true) {
    const drag = this.#bookmarkDrag;
    this.#bookmarkDrag = null;
    if (drag && this.#view === drag.view) {
      if (reset && this.#current(drag.view)) this.#scrollSourceLine(drag.selectedLine);
      else {
        this.#sourceRequest?.cancelPreview(displayWindow(this.#elements.sourceHost), false);
        this.#labelSourceLine(drag.selectedLine);
      }
      this.#refreshSourceBookmarks();
    }
  }

  /**
   * Связывает готовые метки с локальным жестом компонента в нынешнем документе.
   * @returns {void} Только координаты и metadata-команды пересекают границу; компонент не читает Journal или исходный текст.
   */
  #bindBookmarkDrag() {
    if (this.#bookmarkDragStop || !this.#events || !this.#sourceRequest?.ready) return;
    this.#bookmarkDragStop = bindSourceBookmarkDrag(this.#elements.sourceHost, {
      start: line => this.#startBookmarkDrag(line),
      move: (x, y) => this.#moveBookmarkDrag(x, y),
      finish: () => this.#finishBookmarkDrag(),
      cancel: () => this.#cancelBookmarkDrag(),
    }, this.#events.signal);
  }

  /**
   * Даёт доступный выбор строки и добавление её закладки через единый gutter.
   * @param {KeyboardEvent} event Ввод самого gutter; изменение полей и модифицированные команды не перехватываются.
   * @returns {void} Стрелки/Home/End выбирают готовую строку, Enter/Space добавляют закладку без кнопки на каждую строку.
   */
  #gutterKey(event) {
    const gutter = this.#elements.sourceHost.querySelector('[data-source-gutter]');
    if (
      event.target !== gutter || !isHTMLElement(gutter) || event.altKey || event.ctrlKey || event.metaKey
      || event.shiftKey
      || event.isComposing || !this.#sourceRequest?.ready
    ) return;
    const count = this.#sourceRequest.lineCount;
    const current = Number(gutter.dataset.selectedLine) || 1;
    const line = event.key === 'ArrowUp' ? Math.max(1, current - 1) : event.key === 'ArrowDown'
      ? Math.min(count, current + 1)
      : event.key === 'Home'
      ? 1
      : event.key === 'End'
      ? count
      : null;
    if (line !== null) {
      event.preventDefault();
      this.#scrollSourceLine(line);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#bookmarkSourceLine(current);
    }
  }

  /**
   * Проецирует сохранённые закладки нынешнего файла в ограниченный абсолютный слой gutter.
   * @returns {void} Показывает только совпадающие repo/ref/path строки с одним знаком на закладку; текст PRE и число его узлов не дробит.
   */
  #refreshSourceBookmarks() {
    const view = this.#view;
    if (
      !view || view.request.kind !== 'source-file' || view.sourceMode !== 'source' || !this.#sourceRequest?.ready
      || view.target.kind === 'repository'
    ) return;
    const current = view.target;
    const path = view.request.source.path;
    /** @type {number[]} */
    const lines = [];
    for (const entry of this.#journal.bookmarks) {
      const target = entry.target;
      if (
        (target.kind === 'source' || target.kind === 'declaration') && target.line !== null
        && target.origin.url.toLowerCase() === current.origin.url.toLowerCase() && target.ref === current.ref
        && target.path === path
      ) {
        lines.push(target.line);
      }
    }
    this.#sourceRequest.showBookmarks(
      lines,
      controlIcon('bookmark-added'),
      this.#display,
      line => formatText(ui.navigation.sourceLine, { line }),
    );
    this.#labelSourceLine(1);
  }

  /**
   * Повторно показывает полосу текущей строки только при изменении закладки её же адреса.
   * @param {MaterialTarget} target Адрес добавленной/удалённой метки; другие материалы не меняют нынешний raw.
   * @returns {void} Перезапускает только визуальный срок; URI, строка, reading и порядок журнала сохраняются.
   */
  #refreshBookmarkHighlight(target) {
    const view = this.#view;
    if (
      !view || view.request.kind !== 'source-file' || view.sourceMode !== 'source' || !this.#current(view)
      || targetKey(target) !== targetKey(view.target) || this.#bookmarkDrag
    ) return;
    this.#sourceRequest?.refreshHighlight(this.#sourceHighlightDuration, this.#display);
  }

  /**
   * Читает подготовленный набор документов с отдельной отменой и поколением повторов.
   * @param {ActiveView} view Нынешний documents-просмотр; его загрузчик уже выбран владельцем доступа.
   * @returns {Promise<void>} Готовый успех или отказ принимается только прежним runtime-просмотром; во время переноса отображение ждёт resume.
   */
  async #load(view) {
    if (view.request.kind !== 'documents') return;
    const load = view.request.load;
    const revision = view.loadRevision || 0;
    const controller = new AbortController();
    this.#documentLoad = controller;
    try {
      const result = await Promise.resolve().then(() => load(controller.signal));
      // Закрытие, смена просмотра и повтор делают прежний ответ недействительным.
      if (controller.signal.aborted || this.#view !== view || revision !== (view.loadRevision || 0)) return;
      view.result = result;
      view.pendingDocumentRender = true;
      this.#finishDocumentLoad(view);
    } catch {
      if (controller.signal.aborted || this.#view !== view || revision !== (view.loadRevision || 0)) return;
      view.failed = true;
      view.pendingDocumentRender = true;
      this.#finishDocumentLoad(view);
    } finally {
      if (this.#documentLoad === controller) this.#documentLoad = null;
    }
  }

  /**
   * Отображает принятый ответ только после возвращения текущего просмотра в открытый dialog.
   * @param {ActiveView} view Просмотр с pendingDocumentRender после завершения чтения.
   * @returns {void} Снимает ожидание и показывает вкладки/отказ только в текущем отображении; при переносе разрешён лишь защищённый resume/rollback, чужой просмотр пропускается.
   */
  #finishDocumentLoad(view) {
    // Обычный ответ во время переноса хранится у view; подготовленное отображение разрешено только внутри resume/rollback.
    if (view.request.kind !== 'documents' || !view.pendingDocumentRender || !this.#displayCurrent(view)) return;
    view.pendingDocumentRender = false;
    this.#elements.body.removeAttribute('aria-busy');
    if (view.result) this.#renderTabs(view, view.restoreReading?.type || view.type);
    else {this.#showState(
        documentFailure({
          label: labels.loadingFailed,
          message: labels.repositoryFailed,
          icon: controlIcon('error'),
          retry: {
            label: labels.retryLoading,
            hint: labels.retryLoadingHint,
            text: labels.retry,
            icon: controlIcon('reset'),
            run: () => {
              this.#retry();
            },
          },
        }),
        true,
      );}
  }

  /**
   * Заново разрешает метаданные отказавшего перехода либо повторяет raw/документы действующего просмотра.
   * @returns {boolean} true для принятого повтора или уже ожидающего такого чтения; false без отказа, при переносе или после удаления восстанавливаемой записи. Старый успех не подменяет адрес отказавшей попытки.
   */
  #retry() {
    if (this.#moving || !this.#events) return false;
    const retry = this.#pendingRetry;
    if (retry) {
      if (retry.visit === 'restore' && (!retry.recordId || !this.#journal.historyEntry(retry.recordId))) {
        this.#clearPreparationRetry();
        return false;
      }
      if (this.#navigationRequest) return true;
      void this.navigate(retry.target, {
        visit: retry.visit,
        refresh: retry.refresh,
        recordId: retry.recordId,
        initialMode: retry.initialMode,
        defaultBranch: retry.defaultBranch,
        applySourcePin: retry.applySourcePin,
      });
      return true;
    }
    const view = this.#view;
    if (
      view?.request.kind === 'source-file' && view.sourceMode === 'source' && this.#sourceRequest?.failed
      && this.#current(view)
    ) {
      this.#showSource(view);
      return true;
    }
    if (!view?.failed || !this.#current(view)) return false;
    this.#documentLoad?.abort();
    view.failed = false;
    view.loadRevision = (view.loadRevision || 0) + 1;
    this.#showLoading(view);
    this.#load(view);
    return true;
  }

  /**
   * Снимает только метаданные повтора; успешное тело и журнал остаются прежними.
   * @returns {void} Без принятого view очищает прежнее состояние оболочки, чтобы новый адрес не показывал отказ старого; native dialog сохраняется до принятия или закрытия.
   */
  #clearPreparationRetry() {
    if (!this.#pendingRetry) return;
    this.#pendingRetry = null;
    if (!this.#view && this.#dom) {
      render(nothing, this.#elements.state);
      render(nothing, this.#elements.title);
      this.#elements.version.hidden = true;
    }
    this.#updateNavigationActions();
  }

  /**
   * Готовит понятную подпись точной цели R, не читая её текст или снимок доступа.
   * @param {PendingRetry} retry Проверенные метаданные прежнего отказа.
   * @returns {string} Подпись действия с репозиторием, путём и строкой/якорем, когда они есть.
   */
  #preparationRetryLabel(retry) {
    const target = retry.target;
    const path = target.kind === 'repository' ? target.origin.id : `${target.origin.id}/${target.path}`;
    const position = target.kind === 'source' && target.line !== null || target.kind === 'declaration'
      ? `#L${target.line}`
      : target.kind === 'document' && target.anchor
      ? `#${target.anchor}`
      : '';
    return `${labels.retry}: ${path}${position}`;
  }

  /**
   * Показывает прежнюю оболочку и действие повтора без создания failed ActiveView или успешного события каталога.
   * @returns {void} Только при отсутствии принятого view готовит метаданные заголовка и native размещение; курсор истории и нижний адрес не принимаются.
   */
  #showPreparationFailure() {
    const retry = this.#pendingRetry;
    if (!retry || this.#view) return;
    this.#catalogueParked = false;
    const { title, version, toolbar, tabs, sourceTabs, mode, body, dialog } = this.#elements;
    this.#motion?.finishAll();
    this.#closing = null;
    this.#leaveSource();
    const heading = targetTitle(retry.target, { type: 'repository', name: retry.target.origin.id });
    const icon = nodeIcon(heading, { repositories: true, directories: true, files: true, symbols: true });
    icon?.removeAttribute('data-icon-group');
    showDocumentHeading(title, version, {
      name: heading.name,
      label: `${heading.kind || heading.type} ${heading.name}`,
      icon,
      versionText: '',
    });
    toolbar.hidden = sourceTabs.hidden = mode.hidden = true;
    render(nothing, tabs);
    body.removeAttribute('role');
    body.removeAttribute('aria-labelledby');
    body.removeAttribute('aria-busy');
    this.#renderPreparationFailure();
    const entering = !dialog.open;
    this.#place();
    if (entering) {
      this.#motion?.play(dialog, [
        { opacity: 0, transform: this.#offset() },
        { opacity: 1, transform: 'translate(0)' },
      ]);
    }
  }

  /**
   * Обновляет отказ до истечения трёх секунд и оставляет только названный повтор после снятия сообщения.
   * @returns {void} Не меняет accepted view, метаданные адреса или готовые временные формы.
   */
  #renderPreparationFailure() {
    const retry = this.#pendingRetry;
    if (!retry || this.#view) return;
    const label = this.#preparationRetryLabel(retry);
    showPanelState(
      this.#elements,
      documentFailure({
        label: this.#navigationMessage ? labels.loadingFailed : label,
        message: this.#navigationMessage,
        icon: this.#navigationMessage ? controlIcon('error') : undefined,
        retry: {
          label,
          hint: navigationTooltip(label, 'R'),
          text: labels.retry,
          disabled: Boolean(this.#navigationRequest)
            || retry.visit === 'restore' && (!retry.recordId || !this.#journal.historyEntry(retry.recordId)),
          icon: controlIcon('reset'),
          run: () => {
            this.#retry();
          },
        },
      }),
      { centered: true, host: this },
    );
    if (this.#navigationRequest) this.#elements.body.setAttribute('aria-busy', 'true');
    else this.#elements.body.removeAttribute('aria-busy');
  }

  /**
   * Связывает прежнюю условную кнопку R с последним отказавшим адресом либо отказом raw нынешнего просмотра.
   * @returns {void} Подпись цели не подменяет заголовок старого успеха; кнопка не начинает вторую подготовку и не возвращает удалённую историю.
   */
  #updateRetryAction() {
    if (!this.#dom) return;
    const button = this.#elements.sourceRetry;
    const retry = this.#pendingRetry;
    const rawFailed = this.#view?.request.kind === 'source-file' && this.#view.sourceMode === 'source'
      && Boolean(this.#sourceRequest?.failed);
    const label = retry ? this.#preparationRetryLabel(retry) : ui.sourceViewer.retry;
    // Без accepted view единственный Retry уже расположен в состоянии оболочки; прежний успех получает действие в шапке.
    button.hidden = !(retry && this.#view) && !rawFailed;
    button.disabled = Boolean(this.#navigationRequest)
      || Boolean(retry?.visit === 'restore' && (!retry.recordId || !this.#journal.historyEntry(retry.recordId)));
    button.setAttribute('aria-label', label);
    button.dataset.tooltip = retry ? navigationTooltip(label, 'R') : ui.sourceViewer.retry;
    button.title = label;
    const text = button.querySelector('.source-retry-label');
    if (text) text.textContent = label;
  }

  /**
   * Показывает происхождение ожидания документов, не выбирая материал.
   * @param {ActiveView} view Нынешний documents-запрос с loadingSource site/github.
   * @returns {void} Отображает готовую область ожидания и busy; чужие виды запроса пропускает.
   */
  #showLoading(view) {
    if (view.request.kind !== 'documents') return;
    const github = view.request.loadingSource === 'github';
    this.#showState(
      documentLoading({
        label: labels.loadingInformation,
        message: github ? labels.loadingGithub : labels.loadingDocuments,
        icon: github ? undefined : controlIcon('document'),
        images: github
          ? {
            light: 'vendor/brand-assets/GitHub_Invertocat_Black.svg',
            dark: 'vendor/brand-assets/GitHub_Invertocat_White.svg',
          }
          : undefined,
      }),
      true,
    );
    this.#elements.body.setAttribute('aria-busy', 'true');
  }

  /**
   * Готовит вкладки принятого результата и выбирает реально читаемый документ.
   * @param {ActiveView} view Нынешний documents-просмотр с result.
   * @param {string|null} [selected] Ключ прежней вкладки, предпочтительный при восстановлении/обновлении.
   * @returns {void} Показывает разрешённую вкладку, отказ доступа или честное пустое состояние без выдуманного README; неполный публичный результат вызывает Error.
   */
  #renderTabs(view, selected = null) {
    const { result, request } = view;
    if (!result || request.kind !== 'documents') return;
    const types = (result.order || request.types).filter((type) => Object.hasOwn(result.documents, type));
    const labels = documentLabels(types, result);
    const { body, toolbar, tabs } = this.#elements;
    toolbar.hidden = types.length === 0;
    view.tabIds = new Map(types.map((type, index) => [type, `document-tab-${index}`]));
    renderDocumentTabs(
      tabs,
      types.map((type, index) => {
        const document = result.documents[type];
        const disabled = !Object.hasOwn(document, 'content');
        if (result.public && disabled) throw new Error('Public document content is missing');
        return {
          key: type,
          id: `document-tab-${index}`,
          label: labels[index],
          path: document.path,
          disabled,
          disabledLabel: disabled ? formatText(ui.documents.notAllowed, { type }) : undefined,
        };
      }),
      body.id,
    );
    const first = firstDocument(result, request.types, selected);
    if (first) this.#selectDocument(view, first);
    else if (!result.public && (types.length || result.documentsDenied)) {
      this.#showPrivate(result.reason, result.retryAvailable);
    } else {
      const description = request.description?.trim();
      const empty = documentMessage(formatText(ui.documents.noDocuments, { scope: request.scope }));
      this.#showState(description ? outlineDocument({ text: description, children: [empty] }) : empty);
    }
  }

  /**
   * Показывает готовое ограничение и действия прежнего владельца доступа.
   * @param {string} [reason] Готовое пояснение отсутствия разрешённого чтения.
   * @param {boolean} [retryAvailable] Разрешает повтор проверки того же репозитория кнопкой доступа.
   * @returns {void} Отображает управление токенами/повтор; ни текст, ни токен через компонент не читаются.
   */
  #showPrivate(reason = labels.privateData, retryAvailable = false) {
    /** @type {Array<{label:string,run:(event:MouseEvent)=>void}>} */
    const actions = [{
      label: labels.manageTokens,
      run: () => {
        this.dispatchEvent(new Event('tokens-request', { bubbles: true }));
      },
    }];
    if (retryAvailable) {
      actions.push({
        label: labels.retryAccess,
        run: (event) => {
          /** @type {HTMLButtonElement} */ (event.currentTarget).disabled = true;
          this.dispatchEvent(
            new CustomEvent('github-reconnect', {
              detail: { repository: this.#view?.request.repository },
              bubbles: true,
            }),
          );
        },
      });
    }
    this.#showState(documentAccess({ message: reason, actions }), true);
  }

  /**
   * Принимает доступную вкладку текущего набора и при явном выборе добавляет отдельное посещение.
   * @param {ActiveView} view Действующий documents-просмотр с картой кнопок вкладок.
   * @param {string} type Ключ выбираемого документа result.documents.
   * @param {boolean} [visit] true только для явного пользовательского выбора, не начальной/восстановленной вкладки.
   * @returns {void} Согласует документ и его вкладку; повтор того же type и чужой просмотр не меняют журнал.
   */
  #selectDocument(view, type, visit = false) {
    if (visit && this.#moving) return;
    const tabId = view.tabIds.get(type);
    if (!this.#displayCurrent(view) || view.type === type || !tabId) return;
    if (visit) this.#cancelNavigation();
    const recordVisit = visit && view.type !== null;
    if (recordVisit) this.#closePopup(false);
    if (view.type !== null) {
      this.#cancelPiPHold();
      if (recordVisit) this.#captureReading();
    }
    view.type = type;
    const { tabs, body, mode } = this.#elements;
    selectDocumentTab(tabs, type);
    body.setAttribute('role', 'tabpanel');
    body.setAttribute('aria-labelledby', tabId);
    mode.hidden = false;
    const suspended = this.#recordingSuspended;
    if (recordVisit) this.#recordingSuspended = true;
    try {
      this.#showDocument(view);
    } finally {
      this.#recordingSuspended = suspended;
    }
    if (recordVisit && !suspended) {
      view.historyId = this.#journal.accept(this.#entryData(view), 'push')?.id || null;
      this.#updateNavigationActions();
    }
  }

  /**
   * Отображает уже прочитанный документ в выбранном TEXT/HTML и сообщает его точный адрес.
   * @param {ActiveView} view Нынешний documents-просмотр с читаемой вкладкой и происхождением.
   * @returns {void} Обновляет DOM, footer и место чтения без нового посещения; отсутствующие content/source вызывают Error.
   */
  #showDocument(view) {
    if (!view.result || !view.type) return;
    const { body, state, document: content, mode } = this.#elements;
    const document = view.result.documents[view.type];
    const source = view.result.source;
    if (!source || typeof document?.content !== 'string') throw new Error('Document content or source is missing');
    view.target = documentTarget(view.target, document, source.ref);
    this.#releaseSearchProjection();
    body.classList.remove('is-private');
    state.hidden = document.content.length !== 0;
    showDocumentMessage(state, document.content.length ? null : labels.empty);
    content.hidden = false;
    showDocumentMode(mode, {
      mode: view.mode,
      label: view.mode === 'html' ? labels.showSource : labels.showHtml,
    });
    body.scrollTop = 0;
    renderDocumentContent(content, { ...document, content: document.content }, this.#contentOptions(view));
    this.#announceShown(view);
    this.#restoreReading(view);
    this.#recordShown(view);
    this.#reindexSearch();
    if (this.#popupKind === 'search') this.#renderPopup();
  }

  /**
   * Готовит отображение и маршрутизацию ссылок только нынешнего документа.
   * @param {ActiveView} view Нынешний documents-просмотр с адресом, ref и видом текста.
   * @returns {import('../../component/document-content/index.mjs').ContentOptions} Готовые подписи, разрешение href/якоря и действия владельца для пассивного renderer.
   */
  #contentOptions(view) {
    return {
      mode: view.mode,
      resolveHref: value => this.#settings.documentHref(value, view.target),
      internalLinks: this.#settings.getLinkMode() === 'internal',
      anchor: view.target.kind === 'document' ? view.target.anchor : null,
      onLink: (value, event) => this.#documentLink(view, value, event),
      imageLabel: ui.renderer.image,
      htmlUnavailable: ui.renderer.htmlUnavailable,
      columnLabel: (first, second) => formatText(ui.tables.resizeColumns, { first, second }),
    };
  }

  /**
   * Перехватывает лишь доказанную внутреннюю ссылку текущего документа, сохраняя назначение неизвестной.
   * @param {ActiveView} view Просмотр, создавший очищенную ссылку и её контекст.
   * @param {string} value Исходный href, переданный renderer после санитаризации.
   * @param {MouseEvent} event Обычное нажатие; проверка модификаторов выполняется renderer до этого действия.
   * @returns {boolean} true при принятом якоре или адресном переходе; false при чужом просмотре, внешнем режиме или недоказанном адресе.
   */
  #documentLink(view, value, event) {
    if (
      !this.#current(view) || this.#settings.getLinkMode() !== 'internal'
      || !this.#settings.shouldHandleLink(value, view.target)
    ) return false;
    if (value.startsWith('#') && view.request.kind === 'documents' && view.type && view.result?.source) {
      let anchor = value.slice(1);
      try {
        anchor = decodeURIComponent(anchor);
      } catch { /* Буквальный якорь проверяет отображение. */ }
      this.#captureReading();
      if (scrollDocumentAnchor(this.#elements.document, anchor)) {
        event.preventDefault();
        const document = view.result.documents[view.type];
        view.target = {
          kind: 'document',
          origin: view.target.origin,
          ref: view.result.source.ref,
          path: document.path,
          format: document.format,
          anchor,
        };
        this.#emit('document-select', {
          token: view.request.token,
          context: view.context,
          source: view.result.source,
          document: { path: document.path, url: githubHref(view.target) },
          target: view.target,
        });
        view.historyId = this.#journal.accept(this.#entryData(view), 'push')?.id || null;
        this.#updateNavigationActions();
        return true;
      }
    }
    event.preventDefault();
    // Каталог принимает намерение синхронно: поздний результат не зависит от старого view, который мог быть временно закрыт.
    void this.#settings.followLink(value, view.target);
    return true;
  }

  /**
   * Согласует modal/footer после изменения ширины нынешнего окна.
   * @returns {void} Меняет размещение только для открытой неподвижной панели; завершает прежнюю анимацию перед переносом.
   */
  refreshPlacement() {
    if (!this.#events || this.#moving || !this.#dom?.dialog.open) return;
    const modal = !this.#settings.standalone && this.#smallScreen;
    const parent = modal || this.#settings.standalone ? this.#elements.dialog : this.#settings.footerHome;
    if (modal !== this.#modal || this.#settings.footer.parentElement !== parent) {
      this.#motion?.finishAll();
      if (this.#elements.dialog.open) this.#place();
    }
  }

  /**
   * Выполняет перенос footer через прежнего владельца его фокуса, если он подключён.
   * @param {()=>void} operation Синхронный перенос единственного footer и размещения dialog.
   * @param {boolean} restoreFocus Разрешает обрамлению вернуть допустимый прежний фокус.
   * @returns {void} При отсутствии обрамления выполняет ту же операцию напрямую.
   */
  #withFooterMove(operation, restoreFocus) {
    if (this.#settings.withFooterMove) this.#settings.withFooterMove(operation, { restoreFocus });
    else operation();
  }

  /**
   * Размещает единственный dialog/footer в нынешнем modal или боковом режиме.
   * @param {boolean} [restoreFocus] Разрешает вернуть видимый прежний узел либо передать фокус телу modal.
   * @param {PopupPlacement|null} [popupPlacement] Прежний фокус/прокрутка временной области при переносе; по умолчанию захватываются до изменения слоёв.
   * @returns {void} Открывает прежний dialog подходящим native методом, затем popup поверх него; служебная смена слоёв не меняет соответствовавший материалу нижний адрес.
   */
  #place(restoreFocus = true, popupPlacement = this.#capturePopupPlacement()) {
    const { dialog, body } = this.#elements;
    const { footer, footerHome } = this.#settings;
    const focused = this.ownerDocument.activeElement;
    const modal = !this.#settings.standalone && this.#smallScreen;
    const parent = modal || this.#settings.standalone ? dialog : footerHome;
    const popup = this.#popupKind ? this.#popup : null;
    const footerView = this.#matchingFooterView();
    const place = () => {
      // Native showModal добавляет документ последним: временную область снимаем и возвращаем после него без очистки модели.
      if (popup?.open && (!dialog.open || this.#modal !== modal)) popup.close();
      // close/show могут вернуть фокус строке дерева и опубликовать её snapshot ref вместо готового адреса.
      if (dialog.open && this.#modal !== modal) dialog.close();
      this.#modal = modal;
      if (footer.parentElement !== parent) parent.append(footer);
      this.#panelWidth?.setEnabled(!modal && !this.#settings.standalone);
      if (!dialog.open) modal ? dialog.showModal() : dialog.show();
      if (!restoreFocus || popup) return;
      if (isHTMLElement(focused) && dialog.contains(focused) && focused.getClientRects().length) {
        focused.focus({ preventScroll: true });
      } else if (modal) body.focus({ preventScroll: true });
      else if (isHTMLElement(focused)) focused.focus({ preventScroll: true });
    };
    if (this.#modal !== modal || footer.parentElement !== parent) this.#withFooterMove(place, restoreFocus);
    else place();
    if (popup) this.#placePopup(popupPlacement);
    if (footerView && this.#current(footerView)) this.#announceShown(footerView);
    this.#notifyVisibility();
  }

  /**
   * Передаёт немодифицированную клавиатуру вкладок текущему documents-просмотру.
   * @param {KeyboardEvent} event Ввод области вкладок; перенос, чужой вид и модификаторы пропускаются.
   * @returns {void} Выбор пассивного компонента становится явным посещением доступного документа.
   */
  #tabsKey(event) {
    const view = this.#view;
    if (
      this.#moving || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
      || !view || view.request.kind !== 'documents'
    ) return;
    documentTabsKey(event, this.#elements.tabs, (type) => this.#selectDocument(view, type, true));
  }
  /**
   * Принимает допустимый выбор DOCUMENTATION/SOURCE CODE и при обычном действии сохраняет предпочтение.
   * @param {ActiveView} view Действующий source-file просмотр.
   * @param {string|undefined} mode Допустимое имя представления; undefined или другое имя отклоняется.
   * @param {boolean} [remember] Сохраняет обычный выбор основного окна; прямой переход к строке не меняет предпочтение.
   * @returns {void} Меняет вид только при различии; source читает raw лениво, documentation использует готовый HXDoc.
   */
  #selectSourceTab(view, mode, remember = false) {
    if (remember) this.#cancelNavigation();
    if (
      !this.#current(view) || view.request.kind !== 'source-file' || (mode !== 'documentation' && mode !== 'source')
    ) return;
    if (remember) {
      this.#sourceMode = mode;
      try {
        localStorage.setItem(sourceModeKey, mode);
      } catch {}
    }
    if (view.sourceMode === mode) return;
    if (remember) {
      this.#captureReading();
      view.pendingViewVisit = true;
    }
    this.#cancelPiPHold();
    view.restoreReading = null;
    if (mode === 'documentation') this.#showSourceDocumentation(view);
    else if (mode === 'source') this.#showSource(view);
    this.#recordShown(view);
    if (mode === 'documentation') this.#recordViewTransition(view);
  }

  /**
   * Передаёт немодифицированную клавиатуру переключателю Haxe нынешнего файла.
   * @param {KeyboardEvent} event Ввод двух вкладок нынешнего source-file.
   * @returns {void} Готовый выбор вызывает сохранённое обычное переключение; чужой просмотр/перенос пропускается.
   */
  #sourceTabsKey(event) {
    const view = this.#view;
    if (
      this.#moving || !view || view.request.kind !== 'source-file' || event.altKey || event.ctrlKey
      || event.metaKey || event.shiftKey
    ) return;
    sourceTabsKey(event, this.#elements.sourceTabs, (mode) => this.#selectSourceTab(view, mode, true));
  }
  /**
   * Привязывает единственную панель к фактическому окну и исходному документу команд.
   * @returns {void} Создаёт один срок слушателей/геометрии, применяет готовые действия и возвращает временную область после переноса; без оболочки ждёт подключения.
   */
  #connect() {
    if (this.#events || !this.#options || !this.isConnected) return;
    if (!this.#initialize()) return;
    const view = displayWindow(this);
    this.#boundView = view;
    this.#events = new view.AbortController();
    this.#motion = createMotion(view);
    const existingSearchLayer = this.#elements.body.querySelector('[data-search-current]');
    const searchLayer = isHTMLElement(existingSearchLayer)
      ? existingSearchLayer
      : this.ownerDocument.createElement('div');
    if (!isHTMLElement(existingSearchLayer)) {
      searchLayer.className = 'search-highlight-layer';
      searchLayer.setAttribute('data-search-current', '');
      searchLayer.setAttribute('aria-hidden', 'true');
      this.#elements.body.append(searchLayer);
    }
    this.#searchPainter = new CurrentSearchPainter(this.#elements.body, searchLayer);
    this.#mobile = view.matchMedia('(max-width: 760px)');
    const signal = this.#events.signal;
    const { dialog, tabs, sourceTabs, sourceRetry, mode } = this.#elements;
    this.#mobile.addEventListener('change', () => this.refreshPlacement(), { signal });
    view.addEventListener('resize', () => {
      if (!this.#moving) this.#motion?.finishAll();
    }, { signal });
    for (const document of new Set([this.ownerDocument, this.#commandHome])) {
      document.addEventListener('keydown', (event) => this.#navigationKey(event), { signal });
      document.defaultView?.addEventListener('pagehide', () => this.#captureReading(), { signal });
    }
    this.ownerDocument.addEventListener('keydown', (event) => this.#informationKey(event), { signal });
    this.ownerDocument.addEventListener('keyup', (event) => this.#informationKeyUp(event), { signal });
    this.ownerDocument.addEventListener('compositionstart', () => this.#cancelPiPHold(), { signal });
    this.ownerDocument.addEventListener('pointerdown', () => this.#cancelPiPHold(), { signal, capture: true });
    view.addEventListener('blur', () => this.#cancelPiPHold(), { signal });
    this.querySelector('#docs-close')?.addEventListener('click', () => {
      if (!this.#moving) this.#collapseInformation();
    }, { signal });
    const actions = this.#navigationActions;
    if (actions) {
      const names = {
        back: ui.navigation.back,
        forward: ui.navigation.forward,
        manualHistory: ui.navigation.historyAddFile,
        refresh: ui.navigation.refresh,
        linkMode: ui.navigation.linkMode,
        bookmarks: ui.navigation.bookmarks,
        search: ui.navigation.search,
      };
      for (const key of /** @type {Array<keyof typeof actions>} */ (Object.keys(actions))) {
        actions[key].setAttribute('aria-label', names[key]);
      }
      this.#bindHistoryArrow(actions.back, -1, signal);
      this.#bindHistoryArrow(actions.forward, 1, signal);
      actions.manualHistory.addEventListener('click', () => this.toggleManualHistory(), { signal });
      actions.refresh.addEventListener('click', () => {
        void this.refreshCurrent();
      }, { signal });
      actions.linkMode.setAttribute('aria-description', ui.navigation.linkModeHold);
      this.#bindHoldButton(
        actions.linkMode,
        () => {
          this.#settings.cycleLinkMode();
          this.refreshLinkMode();
        },
        () => this.showOrganizationRoot(),
        signal,
      );
      actions.bookmarks.addEventListener('click', () => this.showBookmarks(), { signal });
      actions.search.setAttribute('aria-keyshortcuts', 'F M');
      actions.search.setAttribute('aria-description', ui.navigation.searchHistoryHold);
      actions.search.dataset.tooltip = navigationTooltip(
        ui.navigation.search,
        'F / M',
        ui.navigation.searchHistoryHold,
      );
      this.#bindHoldButton(actions.search, () => this.showFind(), () => this.showSearchHistory(), signal);
    }
    this.#popup?.addEventListener('cancel', event => {
      event.preventDefault();
      this.#closePopup();
    }, { signal });
    this.#popup?.addEventListener('click', event => {
      if (event.target === this.#popup) this.#closePopup();
    }, { signal });
    this.ownerDocument.addEventListener('selectionchange', () => {
      if (!this.#searchOpen || this.#moving) return;
      const focused = deepFocus(this.ownerDocument);
      if (focused && (this.#searchBar?.contains(focused) || this.#popup?.contains(focused))) return;
      this.#captureSearchSelection();
      if (this.#searchSelectionOnly) this.#findSearchMatches();
      this.#renderSearch();
    }, { signal });
    this.addEventListener('pointerdown', event => {
      if (!this.#searchOpen || !isElement(event.target) || !event.target.closest('form.navigation-search')) return;
      this.#captureSearchSelection();
      if (this.#searchSelectionOnly) this.#findSearchMatches();
      this.#renderSearch();
    }, { signal, capture: true });
    this.#elements.sourceHost.addEventListener('click', event => {
      if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!isElement(event.target)) return;
      const marker = event.target.closest('[data-bookmark-line]');
      if (marker) {
        const line = Number(marker.getAttribute('data-bookmark-line'));
        if (Number.isSafeInteger(line)) this.#bookmarkSourceLine(line);
        return;
      }
      if (!event.target.closest('[data-source-gutter]')) return;
      const line = this.#sourceRequest?.lineAt(event.clientY, this.#display);
      if (line) this.#bookmarkSourceLine(line);
    }, { signal });
    this.#elements.sourceHost.addEventListener('keydown', event => this.#gutterKey(event), { signal });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (!this.#moving) this.#collapseInformation();
    }, { signal });
    this.#settings.eventRoot.addEventListener('keydown', (event) => {
      const escape = event.key === 'Escape' && !event.defaultPrevented && !event.repeat && !event.isComposing
        && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
      if (
        !this.#moving && !this.#popupKind && !this.#searchOpen && dialog.open && (escape || isCommandKey(event, 'KeyQ'))
      ) {
        event.preventDefault();
        this.#collapseInformation();
      }
    }, { signal });
    tabs.addEventListener('click', (event) => {
      const button = isElement(event.target) ? event.target.closest('button') : null;
      const type = button?.dataset.document;
      if (!this.#moving && button && !button.disabled && type && this.#view?.request.kind === 'documents') {
        this.#selectDocument(this.#view, type, true);
      }
    }, { signal });
    tabs.addEventListener('keydown', (event) => this.#tabsKey(event), { signal });
    sourceTabs.addEventListener('click', (event) => {
      const button = isElement(event.target) ? event.target.closest('button') : null;
      if (!this.#moving && button && this.#view?.request.kind === 'source-file') {
        this.#selectSourceTab(this.#view, button.dataset.sourceTab, true);
      }
    }, { signal });
    sourceTabs.addEventListener('keydown', (event) => this.#sourceTabsKey(event), { signal });
    sourceRetry.addEventListener('click', () => {
      if (!this.#moving) this.#retry();
    }, { signal });
    mode.addEventListener('click', () => {
      if (this.#moving) return;
      if (this.#view?.request.kind === 'source-file') this.#cycleSourcePin();
      else this.toggleCurrentViewMode();
    }, { signal });
    this.querySelector('.docs-heading')?.addEventListener('mousedown', (event) => {
      const pointer = /** @type {MouseEvent} */ (event);
      if (pointer.button === 0 && isElement(pointer.target) && pointer.target.closest('button')) {
        pointer.preventDefault();
      }
    }, { signal });
    this.#panelWidth?.bind(view, this.#settings.workspace, () => this.#motion?.finish(dialog));
    this.#panelWidth?.setEnabled(!this.#smallScreen && !this.#settings.standalone && !this.#closing);
    applyIcons(this, this.#icons);
    this.#updateNavigationActions();
    this.#bindBookmarkDrag();
    if (this.#popupKind && this.#popup) {
      // Формы сохраняют живой input/черновик; коллекциям после переноса нужны слушатели нового документа.
      if (!this.#moving || this.#popupKind === 'history' || this.#popupKind === 'bookmarks') this.#renderPopup();
      if (!this.#moving) this.#placePopup();
    }
  }

  /**
   * Снимает события и геометрию нынешнего окна, сохраняя runtime-просмотр для переноса.
   * @returns {void} Отменяет новые операции и местные жесты; текущий материал остаётся у панели до commit/rollback либо окончательной очистки.
   */
  #stopBindings() {
    this.#cancelPendingBookmarks();
    this.#cancelBookmarkDrag(false);
    this.#bookmarkDragStop?.();
    this.#bookmarkDragStop = null;
    this.#searchDragStop?.();
    this.#searchDragStop = null;
    this.#releaseSearchProjection();
    this.#searchPainter?.dispose();
    this.#searchPainter = null;
    this.#cancelNavigation();
    this.#collectionStop?.();
    this.#collectionStop = null;
    if (this.#popup?.open) this.#popup.close();
    this.#cancelPiPHold();
    this.#panelWidth?.stop();
    this.#sourceRequest?.stop();
    if (!this.#events) return;
    this.#events.abort();
    this.#events = null;
    this.#display.cancelAnimationFrame(this.#iconFrame);
    this.#iconFrame = 0;
    this.#motion?.dispose();
    this.#motion = null;
    this.#boundView = null;
  }
  /**
   * Окончательно очищает привязки, временную область и непринятые удаления при удалении панели.
   * @returns {void} Сохраняет допустимые метаданные чтения, отменяет запросы и закрывает dialog без возврата к строке.
   */
  #disconnect() {
    this.#setNavigationMessage('');
    this.#cancelPendingHistory();
    this.#captureReading();
    this.#closePopup(false);
    this.#stopBindings();
    this.close({ restore: false, immediate: true });
  }

  /**
   * Скрывает пункт верхнего меню вместе с условной кнопкой, сохраняя узлы каркаса.
   * @returns {void} Убирает скрытые flex-пункты и их gap; без меню ничего не делает.
   */
  #actionVisibility() {
    for (const menu of this.querySelectorAll('.docs-reading-controls, .docs-actions')) {
      if (isHTMLElement(menu)) showActionVisibility(menu);
    }
  }
}

/**
 * Готовит подписи вкладок, различая одинаковые имена публичных документов.
 * @param {string[]} types Ключи реально показанного набора в его порядке.
 * @param {DocumentsResult} result Принятый набор с именами/путями и признаком public.
 * @returns {string[]} Массив подписей в том же порядке; неоднозначное короткое имя заменяется путём.
 */
function documentLabels(types, result) {
  /**
   * Снимает известное расширение только для короткой подписи вкладки.
   * @param {string} name Имя или путь читаемого документа.
   * @returns {string} Прежнее имя без конечного .md, .markdown или .txt; другой суффикс сохраняется.
   */
  const stripExtension = (name) => name.replace(/\.(md|markdown|txt)$/i, '');
  /**
   * Выявляет повтор подписи, для которого требуется уточнение пути или формата.
   * @param {string[]} labels Все подписи текущего этапа в порядке вкладок.
   * @param {string} value Проверяемая подпись одной вкладки.
   * @returns {boolean} true, если одно значение встречается более одного раза.
   */
  const duplicates = (labels, value) => labels.indexOf(value) !== labels.lastIndexOf(value);
  const names = types.map((type) => stripExtension(result.public ? result.documents[type].name : type));
  const paths = names.map((name, index) =>
    duplicates(names, name) ? stripExtension(result.documents[types[index]].path) : name
  );
  const formats = paths.map((path, index) =>
    duplicates(paths, path)
      ? `${path} · ${result.documents[types[index]].format === 'markdown' ? labels.markdown : labels.text}`
      : path
  );
  /** @type {Map<string,number>} */
  const counts = new Map();
  return formats.map((label) => {
    if (!duplicates(formats, label)) return label;
    const count = (counts.get(label) || 0) + 1;
    counts.set(label, count);
    return `${label} ${count}`;
  });
}

customElements.define('document-panel', DocumentPanel);

/**
 * Находит фактический фокус, проходя открытые ShadowRoot нынешнего документа.
 * @param {Document} owner Документ, чьи узлы могут возвращаться в то же окно после временной области/переноса.
 * @returns {HTMLElement|null} Самый глубокий HTMLElement либо null, если фокус не является доступным HTML-узлом.
 */
function deepFocus(owner) {
  let focused = owner.activeElement;
  while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
  return isHTMLElement(focused) ? focused : null;
}
