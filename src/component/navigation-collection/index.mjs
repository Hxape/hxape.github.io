/** Показывает подготовленные записи и ведёт один жест перестановки в текущем документе. */

/**
 * Один местный жест перестановки; очищается перед заменой или переносом области.
 * @typedef {Object} CollectionGesture
 * @property {string} id Устойчивый id переносимой записи, передаваемый владельцу.
 * @property {HTMLElement} handle Прежняя ручка текущего жеста и захвата указателя.
 * @property {number} pointer Id основного pointer этого жеста.
 * @property {number} x Начальная clientX для порога перетаскивания.
 * @property {number} y Начальная clientY для порога перетаскивания.
 * @property {boolean} moved Указатель прошёл порог и показывает перенос записи.
 * @property {string|null} before Id позиции вставки, пустая строка для конца; null без принятой позиции.
 */

/**
 * Только производная группировка готовых строк для дерева одной вставки, без предметного выбора.
 * @typedef {Object} CollectionGroup
 * @property {string} name Подпись группы репозитория или части пути.
 * @property {Map<string,CollectionGroup>} groups Дочерние группы в порядке появления готовых строк.
 * @property {CollectionRow[]} rows Исходные подготовленные записи, показанные на этом уровне.
 */

/**
 * Готовое представление списка или дерева журнала.
 * @typedef {Object} CollectionModel
 * @property {CollectionRow[]} rows Строки в порядке журнала.
 * @property {CollectionLabels} labels Заголовок, сообщения и имена команд.
 * @property {CollectionIcons} icons Подготовленные значки команд.
 * @property {boolean} tree Выбирает вложенное отображение вместо плоского списка.
 * @property {boolean} [historyGroups] Показывает готовые адреса истории раскрываемыми группами repo/ref/file.
 * @property {import('lit').TemplateResult|null} [controls] Готовые молекулы заголовка, составленные wrapper без владения их значениями.
 * @property {boolean} [controlsOpen] Открытость полей заголовка; отсутствие сохраняет видимость полей.
 * @property {import('../history-controls/index.mjs').HistoryControlsValues} [historyControls] Значения полей H, подготовленные Panel для wrapper истории.
 * @property {import('../bookmark-group-control/index.mjs').BookmarkGroupValues} [bookmarkGroups] Готовые именованные группы N, подтверждение удаления и режим действия строки.
 * @property {HistoryExclusionsValues} [historyExclusions] Готовые идентичности и подписи репозиториев, исключённых только из автоматической истории.
 * @property {CollectionTransfer} [transfer] Временная форма обмена JSON; заменяет список до завершения или отмены.
 */
import { screenTemplate } from '../../common/html/screen.mjs';
import { nothing, render } from 'lit';
import { isElement, isHTMLElement } from '../../common/ui/view-utils.mjs';

/**
 * Подготовленная строка представления истории или закладок, без доступа к материалу.
 * @typedef {Object} CollectionRow
 * @property {string} id Устойчивый id записи для действий и перестановки.
 * @property {string} name Видимое имя материала.
 * @property {string} repository Публикуемая подпись источника, включая сохранённые скрытые обозначения.
 * @property {string} kind Готовая подпись вида материала.
 * @property {string} path Готовый путь и позиция для пояснения строки.
 * @property {SVGSVGElement|HTMLSpanElement|null} [repositoryIcon] Готовый Git/branch значок нынешней вставки; отсутствие сохраняет прежнее текстовое представление истории.
 * @property {SVGSVGElement|HTMLSpanElement|null} [detailIcon] Готовый значок вида материала перед путём; не определяется из предметной модели внутри компонента.
 * @property {SVGSVGElement|HTMLSpanElement|null} [fileIcon] Готовый знак физического файла для заголовка группы; не заменяет знак метода в самой записи.
 * @property {string} [fileKey] Подготовленная identity физического файла/материала для группировки истории.
 * @property {string} [fileName] Готовое читаемое имя файловой группы.
 * @property {string} [ref] Фактический ref группы; пустая строка для материала без ref.
 * @property {string} [groupId] Постоянный id именованной группы закладки.
 * @property {boolean} active Принятое владельцем выделение нынешней записи.
 * @property {boolean} bookmarked Совпадает ли адрес с сохранённой закладкой.
 * @property {boolean} [pendingRemove] Запись ожидает удаления; её открытие остаётся доступным, справа показывается отмена.
 * @property {number} [removeSeconds] Оставшиеся секунды отмены закладки; отсутствие сохраняет прежнюю кнопку истории.
 */
/**
 * Готовые подписи области списка и его действий.
 * @typedef {Object} CollectionLabels
 * @property {string} title Заголовок истории или закладок.
 * @property {string} empty Пояснение отсутствия записей.
 * @property {string} remove Доступная подпись удаления записи.
 * @property {string} addBookmark Подпись создания закладки из записи.
 * @property {string} removeBookmark Подпись удаления существующей закладки.
 * @property {string} reorder Подсказка перестановки записи.
 * @property {string} close Подпись закрытия временной области.
 * @property {string} [undo] Подпись отмены ещё не завершённого удаления.
 * @property {string} [toggleView] Необязательное имя следующего вида списка или дерева.
 * @property {string} [toggleControls] Имя действия показа или скрытия полей заголовка.
 * @property {string} [message] Необязательное сообщение операции или хранилища.
 * @property {string} [retry] Необязательная подпись повтора хранилища.
 * @property {string} [reset] Необязательная подпись явного удаления повреждённых записей.
 * @property {string} [exportAll] Подпись выгрузки всей коллекции.
 * @property {string} [importAll] Подпись загрузки всей коллекции.
 * @property {string} [actionMode] Подпись следующего режима удаления или переноса закладок.
 * @property {import('../history-controls/index.mjs').HistoryControlsLabels} [historyControls] Подписи полей сбора H.
 * @property {import('../bookmark-group-control/index.mjs').BookmarkGroupLabels} [bookmarkGroups] Подписи именованных групп N и переноса записи.
 * @property {HistoryExclusionsLabels} [historyExclusions] Подписи списка исключений автоматической истории.
 */
/**
 * Подготовленные действия владельца журнала; компонент не меняет записи самостоятельно.
 * @typedef {Object} CollectionActions
 * @property {(id:string)=>void} open Открывает материал выбранной записи.
 * @property {(id:string)=>void} remove Удаляет выбранную запись из нужного списка.
 * @property {(id:string)=>void} [bookmark] Переключает наличие закладки адреса выбранной истории; сама запись истории не удаляется. В области закладок не передаётся.
 * @property {(id:string,before:string)=>void} reorder Переставляет id перед before; пустой before означает конец списка.
 * @property {()=>void} close Закрывает временную область без нового просмотра.
 * @property {()=>void} [toggleView] Необязательное действие смены списка и дерева закладок.
 * @property {()=>void} [toggleControls] Передаёт владельцу переключение открытости полей заголовка.
 * @property {()=>void} [retry] Необязательный повтор чтения или сохранения хранилища.
 * @property {()=>void} [reset] Необязательное явное удаление повреждённого журнала.
 * @property {(id:string)=>void} [undo] Необязательная отмена удаления выбранной записи по id.
 * @property {(enabled:boolean)=>void} [autoCollect] Принимает переключение автоматического сбора через Journal.
 * @property {(policy:string)=>void} [policy] Проверяет и принимает выбранную политику истории.
 * @property {(enabled:boolean)=>void} [includeView] Принимает учёт смены представления.
 * @property {(limit:number)=>void} [limit] Проверяет и принимает предел числа записей.
 * @property {()=>void} [clear] Явно очищает накопленную историю.
 * @property {(id:string)=>void} [selectGroup] Выбирает именованную группу закладок.
 * @property {(name:string)=>void} [createGroup] Проверяет имя и создаёт группу.
 * @property {(id:string,name:string)=>void} [renameGroup] Проверяет id/имя и переименовывает группу.
 * @property {(mode:'create'|'rename')=>void} [editGroupName] Выбирает операцию и раскрывает её поле без изменения групп.
 * @property {()=>void} [cancelGroupName] Скрывает поле без применения черновика.
 * @property {(id:string)=>void} [deleteGroup] Запрашивает подтверждение удаления группы с её закладками.
 * @property {(id:string)=>void} [confirmDeleteGroup] Принимает удаление ранее подтверждённой группы.
 * @property {()=>void} [cancelDeleteGroup] Отменяет подтверждение, сохраняя группу.
 * @property {()=>void} [exportGroup] Открывает JSON выбранной группы.
 * @property {()=>void} [importGroup] Открывает вставку JSON в выбранную группу.
 * @property {()=>void} [exportAll] Открывает JSON всей коллекции.
 * @property {()=>void} [importAll] Открывает вставку JSON всей коллекции.
 * @property {()=>void} [toggleActionMode] Переключает подготовленный владельцем режим удаления и переноса.
 * @property {(value:string)=>void} [editJSON] Передаёт полный черновик вставленного JSON без принятия данных.
 * @property {(mode:string)=>void} [selectImportMode] Меняет режим объединения или замены черновика.
 * @property {()=>void} [applyJSON] Проверяет весь черновик и принимает его либо показывает подтверждение замены.
 * @property {()=>void} [closeJSON] Возвращается к коллекции без применения черновика.
 * @property {()=>void} [copyJSON] Копирует подготовленную выгрузку, обрабатывая отказ буфера.
 * @property {(recordId:string,groupId:string)=>void} [assignGroup] Переносит одну закладку в проверенную группу.
 * @property {(id:string)=>void} [unblockRepository] Возвращает готовый canonical ключ репозитория в автоматический сбор; не меняет GitHub-доступ.
 */
/**
 * Разрешённая подпись одного исключения из сбора, без ссылки или доказательства доступа.
 * @typedef {Object} HistoryExclusionRow
 * @property {string} id Готовый canonical ключ origin для снятия запрета у Journal.
 * @property {string} name Читаемая разрешённая подпись источника либо сохранённый alias.
 */
/**
 * Готовые метаданные исключений нынешнего журнала.
 * @typedef {Object} HistoryExclusionsValues
 * @property {HistoryExclusionRow[]} repositories Источники, для которых запрещены только новые автоматические посещения.
 */
/**
 * Подписи раскрываемого списка запретов истории.
 * @typedef {Object} HistoryExclusionsLabels
 * @property {string} label Имя списка исключённых репозиториев.
 * @property {string} empty Пояснение отсутствия исключений.
 * @property {string} unblock Подпись действия разрешения новых автоматических записей источника.
 */
/**
 * Готовые знаки действий списка, выбранные вызывающим блоком.
 * @typedef {Object} CollectionIcons
 * @property {import('lit').TemplateResult} bookmark Создание отсутствующей закладки.
 * @property {import('lit').TemplateResult} bookmarked Знак наличия закладки для обычного состояния кнопки.
 * @property {import('lit').TemplateResult} bookmarkRemove Знак удаления имеющейся закладки при наведении.
 * @property {import('lit').TemplateResult} remove Удаление записи нужного списка.
 * @property {import('lit').TemplateResult} close Закрытие временной области.
 * @property {import('lit').TemplateResult} view Переход к следующему виду закладок.
 * @property {import('lit').TemplateResult} [controls] Знак показа или скрытия полей заголовка.
 * @property {import('lit').TemplateResult} [exportAll] Выгрузка всей коллекции.
 * @property {import('lit').TemplateResult} [importAll] Загрузка всей коллекции.
 * @property {import('lit').TemplateResult} [assign] Перенос закладки в другую группу.
 * @property {import('../bookmark-group-control/index.mjs').BookmarkGroupIcons} [groups] Знаки команд выбранной группы.
 */
/**
 * Только готовые значения временного окна JSON; данные принимает их прежний владелец.
 * @typedef {Object} CollectionTransfer
 * @property {string} title Выгрузка либо загрузка с указанием нынешней области.
 * @property {string} value Форматированный JSON выгрузки либо полный черновик вставки.
 * @property {boolean} importing Поле доступно для ввода; false означает выгрузку только для чтения.
 * @property {boolean} allowMerge Показывает отдельный выбор объединения или замены закладок.
 * @property {'merge'|'replace'} mode Выбранный режим вставки.
 * @property {boolean} confirming Проверенный черновик ожидает явного подтверждения замены.
 * @property {string} message Ошибка формы или результат копирования, без изменения введённого текста.
 * @property {string} hint Объяснение действия выбранной области.
 * @property {string} field Доступное имя поля JSON.
 * @property {string} merge Подпись объединения.
 * @property {string} replace Подпись замены.
 * @property {string} confirmation Полная подпись подтверждения замены.
 * @property {string} apply Подпись проверки и принятия.
 * @property {string} confirm Подпись принятия подтверждённой замены.
 * @property {string} copy Подпись копирования.
 * @property {string} cancel Подпись возврата без применения.
 */

/**
 * Составляет одну строку списка с её готовыми действиями.
 * @param {CollectionRow} row Подготовленные подписи и состояния одной записи.
 * @param {CollectionLabels} labels Готовые имена действий для вспомогательного чтения.
 * @param {CollectionActions} actions Действия владельца по устойчивому id записи.
 * @param {CollectionIcons} icons Готовые знаки команд строки.
 * @param {import('../bookmark-group-control/index.mjs').BookmarkGroupValues|null} [groups] Доступные именованные группы N; null не показывает перенос записи.
 * @param {'bookmarks'|'history'} [screen] Экран, чья HTML-разметка используется для строки.
 * @returns {import('lit').TemplateResult} Шаблон li с переходом, перестановкой, закладкой и удалением.
 */
function entry(row, labels, actions, icons, groups = null, screen = 'bookmarks') {
  const hasIcons = Boolean(row.repositoryIcon || row.detailIcon);
  const name = `${row.name} · ${row.repository} · ${row.kind}${row.path ? ` · ${row.path}` : ''}`;
  /**
   * Передаёт назначение одной записи другой группе через владельца.
   * @param {Event} event Change select группы этой строки.
   * @returns {void} Проверка id, перенос и новый набор строк остаются у Journal/Panel.
   */
  const assign = (event) => actions.assignGroup?.(row.id, /** @type {HTMLSelectElement} */ (event.currentTarget).value);
  return screenTemplate(screen, 'navigation-collection.entry', {
    id: row.id,
    ariaCurrent: row.active ? 'true' : nothing,
    reorderLabel: labels.reorder,
    ariaLabel: hasIcons ? name : nothing,
    onOpen: () => actions.open(row.id),
    name: row.name,
    content: hasIcons
      ? screenTemplate(screen, 'navigation-collection.detailsWithIcons', {
          repositoryIconContent: row.repositoryIcon || nothing,
          repository: row.repository,
          pathContent: row.path
            ? screenTemplate(screen, 'navigation-collection.pathDetail', {
                detailIconContent: row.detailIcon || nothing,
                path: row.path,
              })
            : nothing,
        })
      : screenTemplate(screen, 'navigation-collection.detailsText', {
          repository: row.repository,
          kind: row.kind,
          pathContent: row.path ? ` · ${row.path}` : '',
        }),
    content2: actions.bookmark
      ? screenTemplate(screen, 'navigation-collection.bookmark', {
          ariaPressed: String(row.bookmarked),
          ariaLabel: row.bookmarked ? labels.removeBookmark : labels.addBookmark,
          onBookmark: () => actions.bookmark?.(row.id),
          bookmarkedContent: row.bookmarked ? icons.bookmarked : icons.bookmark,
          bookmarkRemoveIcon: icons.bookmarkRemove,
        })
      : nothing,
    pendingRemoveContent:
      row.pendingRemove && actions.undo
        ? row.removeSeconds !== undefined
          ? screenTemplate(screen, 'navigation-collection.pendingBookmarkRemoval', {
              undoLabel: labels.undo || '',
              onUndo: () => actions.undo?.(row.id),
              removeIcon: icons.remove,
              removeSeconds: row.removeSeconds,
            })
          : screenTemplate(screen, 'navigation-collection.undoHistory', {
              undoLabel: labels.undo || '',
              onUndo: () => actions.undo?.(row.id),
              undoLabel2: labels.undo,
            })
        : groups?.moveMode && groups.groups.length > 1 && actions.assignGroup
          ? screenTemplate(screen, 'navigation-collection.groupAssignment', {
              bookmarkGroupsLabel: labels.bookmarkGroups?.assign || '',
              assignIcon: icons.assign || nothing,
              value: row.groupId || '',
              onChange: assign,
              items: groups.groups.map((group) =>
                screenTemplate(screen, 'navigation-collection.groupOption', {
                  id: group.id,
                  selected: group.id === row.groupId,
                  name: group.name,
                }),
              ),
            })
          : screenTemplate(screen, 'navigation-collection.remove', {
              removeLabel: labels.remove,
              onRemove: () => actions.remove(row.id),
              removeIcon: icons.remove,
            }),
  });
}

/**
 * Группирует готовые строки только для вложенного отображения репозиториев и путей.
 * @param {CollectionRow[]} rows Готовые строки в порядке владельца; исходная коллекция не изменяется.
 * @param {CollectionLabels} labels Подписи действий вложенных строк.
 * @param {CollectionActions} actions Действия владельца по id исходных записей.
 * @param {CollectionIcons} icons Готовые знаки строк.
 * @param {import('../bookmark-group-control/index.mjs').BookmarkGroupValues|null} groups Готовые именованные группы N либо null.
 * @returns {import('lit').TemplateResult} Шаблон ul с раскрываемыми группами; предметное состояние дерева не сохраняется.
 */
function tree(rows, labels, actions, icons, groups) {
  const screen = 'bookmarks';
  /** @type {CollectionGroup} */
  const root = { name: '', groups: new Map(), rows: [] };
  for (const row of rows) {
    const path = row.path.split('#')[0].split('/').filter(Boolean);
    const parts = [row.repository, ...path.slice(0, -1)];
    let parent = root;
    for (const name of parts) {
      let child = parent.groups.get(name);
      if (!child) {
        child = { name, groups: new Map(), rows: [] };
        parent.groups.set(name, child);
      }
      parent = child;
    }
    parent.rows.push(row);
  }
  /**
   * Составляет готовую группу и её дочерние строки без изменения исходного порядка.
   * @param {CollectionGroup} group Производная группа одной вставки списка.
   * @returns {import('lit').TemplateResult} Native ul/details со строками исходного журнала.
   */
  const branch = (group) =>
    screenTemplate(screen, 'navigation-collection.bookmarkTree', {
      entries: [...group.groups.values()].map((child) =>
        screenTemplate(screen, 'navigation-collection.bookmarkBranch', {
          name: child.name,
          content: branch(child),
        }),
      ),
      rowsContent: group.rows.map((row) => entry(row, labels, actions, icons, groups)),
    });
  return branch(root);
}

/**
 * Готовая файловая группа одной вставки H; узел значка является отдельной копией представления.
 * @typedef {Object} HistoryFileGroup
 * @property {string} key Подготовленный fileKey владельца, без собственного разбора адреса.
 * @property {string} name Подготовленное имя физического файла либо материала.
 * @property {Node|null} icon Копия готового знака файла для заголовка; исходный знак записи не перемещается.
 * @property {CollectionRow[]} rows Записи файла с прежними устойчивыми visit id.
 */
/**
 * Производная группа ref внутри одного репозитория.
 * @typedef {Object} HistoryRefGroup
 * @property {string} name Фактическая подпись ref; пустая строка не создаёт отдельный заголовок.
 * @property {Map<string,HistoryFileGroup>} files Файлы в порядке появления готовых строк.
 */
/**
 * Производная группа источника для отображения H.
 * @typedef {Object} HistoryRepositoryGroup
 * @property {string} name Готовая читаемая подпись источника.
 * @property {Node|null} icon Копия подготовленного знака репозитория или ветки.
 * @property {Map<string,HistoryRefGroup>} refs Группы ref в порядке появления готовых строк.
 */

/**
 * Составляет раскрываемые repo/ref/file по готовым ключам, чтобы длинные цепочки строк файла сворачивались.
 * @param {CollectionRow[]} rows Подготовленные записи истории с fileKey/fileName/ref.
 * @param {CollectionLabels} labels Подписи действий записей.
 * @param {CollectionActions} actions Действия владельца по visit id.
 * @param {CollectionIcons} icons Готовые знаки команд записей.
 * @returns {import('lit').TemplateResult} Дерево H; раскрытие файлов остаётся в native details, а не в Journal.
 */
function historyTree(rows, labels, actions, icons) {
  const screen = 'history';
  /** @type {Map<string,HistoryRepositoryGroup>} */
  const repositories = new Map();
  for (const row of rows) {
    let repository = repositories.get(row.repository);
    if (!repository) {
      repository = { name: row.repository, icon: row.repositoryIcon?.cloneNode(true) || null, refs: new Map() };
      repositories.set(row.repository, repository);
    }
    const refName = row.ref || '';
    let ref = repository.refs.get(refName);
    if (!ref) {
      ref = { name: refName, files: new Map() };
      repository.refs.set(refName, ref);
    }
    const key = row.fileKey || row.id;
    let file = ref.files.get(key);
    if (!file) {
      file = { key, name: row.fileName || row.name, icon: row.fileIcon?.cloneNode(true) || null, rows: [] };
      ref.files.set(key, file);
    }
    file.rows.push(row);
  }
  /**
   * Составляет закрытые по умолчанию файловые группы одного ref.
   * @param {HistoryRefGroup} ref Подготовленные файлы одной ссылки Git.
   * @returns {import('lit').TemplateResult} Список native details с прежними действиями каждой записи.
   */
  const files = (ref) =>
    screenTemplate(screen, 'navigation-collection.historyFiles', {
      entries: [...ref.files.values()].map((file) =>
        screenTemplate(screen, 'navigation-collection.historyFile', {
          key: file.key,
          iconContent: file.icon || nothing,
          name: file.name,
          rowsContent: file.rows.length,
          rowsContent2: file.rows.map((row) => entry(row, labels, actions, icons, null, 'history')),
        }),
      ),
    });
  return screenTemplate(screen, 'navigation-collection.historyRepositories', {
    items: [...repositories.values()].map((repository) =>
      screenTemplate(screen, 'navigation-collection.historyRepository', {
        iconContent: repository.icon || nothing,
        name: repository.name,
        items: [...repository.refs.values()].map((ref) =>
          ref.name
            ? screenTemplate(screen, 'navigation-collection.historyRef', {
                name: ref.name,
                content: files(ref),
              })
            : files(ref),
        ),
      }),
    ),
  });
}

/**
 * Отображает подготовленные записи и связывает один местный жест перестановки.
 * @param {HTMLElement} container Прежний контейнер временной области; его DOM может переноситься в PiP.
 * @param {CollectionModel} model Готовые строки, подписи, знаки и выбранный вид.
 * @param {CollectionActions} actions Действия владельца записи; локальные события передают только id и позицию.
 * @returns {()=>void} Функция очистки pointer capture и слушателей перед заменой DOM или переносом; коллекцией компонент не владеет.
 */
export function renderCollection(
  container,
  {
    rows,
    labels,
    icons,
    tree: asTree,
    controls,
    controlsOpen,
    historyControls,
    historyGroups,
    bookmarkGroups,
    transfer,
  },
  actions,
) {
  const screen = historyGroups ? 'history' : 'bookmarks';
  render(
    screenTemplate(screen, 'navigation-collection.page', {
      titleLabel: labels.title,
      groupActions:
        !transfer && bookmarkGroups && labels.bookmarkGroups && icons.groups && actions.editGroupName
          ? screenTemplate(screen, 'navigation-collection.groupActions', {
              bookmarkGroupsLabel: labels.bookmarkGroups.create,
              ariaExpanded: String(bookmarkGroups.nameMode === 'create'),
              onEditGroupName: () => actions.editGroupName?.('create'),
              groupsIcon: icons.groups.create,
              bookmarkGroupsLabel2: labels.bookmarkGroups.rename,
              ariaExpanded2: String(bookmarkGroups.nameMode === 'rename'),
              onEditGroupName2: () => actions.editGroupName?.('rename'),
              groupsIcon2: icons.groups.rename,
              bookmarkGroupsLabel3: labels.bookmarkGroups.delete,
              disabled: !bookmarkGroups.canDeleteGroup,
              onDeleteGroup: () => actions.deleteGroup?.(bookmarkGroups.currentGroup),
              groupsIcon3: icons.groups.remove,
            })
          : nothing,
      toggleControls:
        !transfer && controls && actions.toggleControls
          ? screenTemplate(screen, 'navigation-collection.controlsToggle', {
              toggleControlsLabel: labels.toggleControls || '',
              ariaExpanded: String(controlsOpen !== false),
              onToggleControls: actions.toggleControls,
              controlsIcon: icons.controls || nothing,
            })
          : nothing,
      clearHistory:
        !transfer && historyControls && labels.historyControls && actions.clear
          ? screenTemplate(screen, 'navigation-collection.historyClear', {
              historyControlsLabel: labels.historyControls.clear,
              disabled: historyControls.empty,
              onClear: actions.clear,
              removeIcon: icons.remove,
            })
          : nothing,
      exportAll:
        !transfer && actions.exportAll
          ? screenTemplate(screen, 'navigation-collection.exportAll', {
              exportAllLabel: labels.exportAll || '',
              onExportAll: actions.exportAll,
              exportAllIcon: icons.exportAll || nothing,
            })
          : nothing,
      importAll:
        !transfer && actions.importAll
          ? screenTemplate(screen, 'navigation-collection.importAll', {
              importAllLabel: labels.importAll || '',
              onImportAll: actions.importAll,
              importAllIcon: icons.importAll || nothing,
            })
          : nothing,
      actionMode:
        !transfer && bookmarkGroups && bookmarkGroups.groups.length > 1 && actions.toggleActionMode
          ? screenTemplate(screen, 'navigation-collection.actionMode', {
              actionModeLabel: labels.actionMode || '',
              ariaPressed: String(bookmarkGroups.moveMode),
              onToggleActionMode: actions.toggleActionMode,
              content: bookmarkGroups.moveMode ? icons.remove : icons.assign || nothing,
            })
          : nothing,
      toggleView:
        !transfer && actions.toggleView
          ? screenTemplate(screen, 'navigation-collection.toggleView', {
              toggleViewLabel: labels.toggleView || '',
              onToggleView: actions.toggleView,
              viewIcon: icons.view,
            })
          : nothing,
      closeLabel: labels.close,
      onClose: actions.close,
      closeIcon: icons.close,
      controlsSection:
        !transfer && controls
          ? screenTemplate(screen, 'navigation-collection.controls', {
              hidden: controlsOpen === false,
              controls,
            })
          : nothing,
      transferForm: transfer
        ? screenTemplate(screen, 'navigation-collection.transfer', {
            onApplyJSON: (/** @type {Event} */ event) => {
              event.preventDefault();
              actions.applyJSON?.();
            },
            title: transfer.title,
            hint: transfer.hint,
            importingContent:
              transfer.importing && transfer.allowMerge
                ? screenTemplate(screen, 'navigation-collection.importMode', {
                    checked: transfer.mode === 'merge',
                    onSelectImportMode: () => actions.selectImportMode?.('merge'),
                    merge: transfer.merge,
                    checked2: transfer.mode === 'replace',
                    onSelectImportMode2: () => actions.selectImportMode?.('replace'),
                    replace: transfer.replace,
                  })
                : nothing,
            field: transfer.field,
            readonly: !transfer.importing,
            value: transfer.value,
            onEditJSON: (/** @type {Event} */ event) =>
              actions.editJSON?.(/** @type {HTMLTextAreaElement} */ (event.currentTarget).value),
            messageContent: transfer.message
              ? screenTemplate(screen, 'navigation-collection.transferMessage', {
                  message: transfer.message,
                })
              : nothing,
            confirmingContent: transfer.confirming
              ? screenTemplate(screen, 'navigation-collection.transferConfirmation', {
                  confirmation: transfer.confirmation,
                })
              : nothing,
            importingContent2: transfer.importing
              ? screenTemplate(screen, 'navigation-collection.applyTransfer', {
                  confirmingContent: transfer.confirming ? transfer.confirm : transfer.apply,
                })
              : screenTemplate(screen, 'navigation-collection.copyTransfer', {
                  onCopyJSON: actions.copyJSON,
                  copy: transfer.copy,
                }),
            onCloseJSON: actions.closeJSON,
            cancel: transfer.cancel,
          })
        : nothing,
      storageMessage:
        !transfer && labels.message
          ? screenTemplate(screen, 'navigation-collection.storageMessage', {
              messageLabel: labels.message,
              content: actions.retry
                ? screenTemplate(screen, 'navigation-collection.retryStorage', {
                    onRetry: actions.retry,
                    retryLabel: labels.retry,
                  })
                : nothing,
              content2: actions.reset
                ? screenTemplate(screen, 'navigation-collection.resetStorage', {
                    onReset: actions.reset,
                    resetLabel: labels.reset,
                  })
                : nothing,
            })
          : nothing,
      entries: transfer
        ? nothing
        : rows.length
          ? historyGroups
            ? historyTree(rows, labels, actions, icons)
            : asTree
              ? tree(rows, labels, actions, icons, bookmarkGroups || null)
              : screenTemplate(screen, 'navigation-collection.list', {
                  items: rows.map((row) => entry(row, labels, actions, icons, bookmarkGroups || null)),
                })
          : screenTemplate(screen, 'navigation-collection.empty', {
              emptyLabel: labels.empty,
            }),
    }),
    container,
  );
  const controller = new AbortController();
  /** @type {CollectionGesture|null} */
  let gesture = null;
  /**
   * Завершает местный жест перед заменой, отменой или передачей готового намерения владельцу.
   * @returns {void} Освобождает захват и временные классы, не меняя порядок исходной коллекции.
   */
  const stop = () => {
    if (gesture?.handle.hasPointerCapture(gesture.pointer)) gesture.handle.releasePointerCapture(gesture.pointer);
    container.querySelector('.is-dragging')?.classList.remove('is-dragging');
    container.querySelector('.drop-before')?.classList.remove('drop-before');
    gesture = null;
  };
  container.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const handle = isElement(event.target) ? event.target.closest('[data-drag-record]') : null;
    if (!isHTMLElement(handle) || !handle.dataset.dragRecord) return;
    event.preventDefault();
    gesture = {
      id: handle.dataset.dragRecord,
      handle,
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      before: null,
    };
    handle.setPointerCapture(event.pointerId);
  }, { signal: controller.signal });
  container.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    if (!gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 6) return;
    gesture.moved = true;
    gesture.handle.closest('.navigation-entry')?.classList.add('is-dragging');
    const point = container.ownerDocument.elementFromPoint(event.clientX, event.clientY);
    const destination = point?.closest('[data-record-id]');
    container.querySelector('.drop-before')?.classList.remove('drop-before');
    gesture.before = null;
    if (isHTMLElement(destination) && destination.dataset.recordId !== gesture.id) {
      const shown = [...container.querySelectorAll('[data-record-id]')].filter(isHTMLElement).filter(row =>
        row.getClientRects().length
      );
      const bounds = destination.getBoundingClientRect();
      gesture.before = event.clientY < bounds.top + bounds.height / 2
        ? destination.dataset.recordId || null
        : shown[shown.indexOf(destination) + 1]?.dataset.recordId || '';
      const before = gesture.before && shown.find(row => row.dataset.recordId === gesture?.before);
      if (before) before.classList.add('drop-before');
    }
  }, { signal: controller.signal });
  container.addEventListener('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const { id, before, moved } = gesture;
    stop();
    if (moved && before !== null) actions.reorder(id, before);
  }, { signal: controller.signal });
  container.addEventListener('pointercancel', stop, { signal: controller.signal });
  container.addEventListener('lostpointercapture', stop, { signal: controller.signal });
  container.addEventListener('keydown', event => {
    const handle = isElement(event.target) ? event.target.closest('[data-drag-record]') : null;
    if (
      !isHTMLElement(handle) || !handle.dataset.dragRecord || event.altKey || event.ctrlKey || event.metaKey
      || !['ArrowUp', 'ArrowDown'].includes(event.key)
    ) return;
    const index = rows.findIndex(row => row.id === handle.dataset.dragRecord);
    const before = event.key === 'ArrowUp' ? rows[index - 1]?.id : rows[index + 2]?.id || '';
    if (index < 0 || before === undefined || event.key === 'ArrowDown' && index === rows.length - 1) return;
    event.preventDefault();
    actions.reorder(handle.dataset.dragRecord, before);
  }, { signal: controller.signal });
  return () => {
    stop();
    controller.abort();
  };
}
