/** Показывает готовые именованные группы закладок и команды их владельца. */
import { screenTemplate } from '../../common/html/screen.mjs';
import { nothing } from 'lit';

/**
 * Подпись одной постоянной группы, подготовленная владельцем закладок.
 * @typedef {Object} BookmarkGroupOption
 * @property {string} id Устойчивый id группы для выбора и переименования.
 * @property {string} name Проверенное видимое имя группы.
 */
/**
 * Готовые группы и доступность удаления, без самих записей закладок.
 * @typedef {Object} BookmarkGroupValues
 * @property {BookmarkGroupOption[]} groups Группы в порядке владельца.
 * @property {string} currentGroup Id выбранной группы.
 * @property {boolean} canDeleteGroup Есть другая группа; последнюю группу удалить нельзя.
 * @property {boolean} confirmDelete Владелец ожидает явного подтверждения удаления текущей группы с закладками.
 * @property {boolean} moveMode Вместо удаления строка предлагает перенос закладки.
 * @property {'create'|'rename'|null} nameMode Выбранная операция поля имени; null скрывает поле и освобождает его черновик.
 */
/**
 * Подписи поля группы и его команд.
 * @typedef {Object} BookmarkGroupLabels
 * @property {string} select Подпись выбора существующей группы.
 * @property {string} name Подпись черновика имени группы.
 * @property {string} create Создание группы с введённым именем.
 * @property {string} rename Переименование выбранной группы.
 * @property {string} delete Удаление выбранной группы с подтверждением.
 * @property {string} confirmDelete Полная подпись подтверждения с нынешним именем группы.
 * @property {string} confirm Подпись явного подтверждения удаления.
 * @property {string} cancel Отмена удаления группы.
 * @property {string} export Выгрузка выбранной группы.
 * @property {string} import Загрузка JSON в выбранную группу.
 * @property {string} assign Доступная подпись переноса одной закладки в группу.
 */
/**
 * Действия единственного владельца групп.
 * @typedef {Object} BookmarkGroupActions
 * @property {(id:string)=>void} selectGroup Выбирает проверенный id группы.
 * @property {(name:string)=>void} createGroup Проверяет имя и создаёт группу.
 * @property {(id:string,name:string)=>void} renameGroup Проверяет id/имя и переименовывает группу.
 * @property {(id:string)=>void} deleteGroup Запрашивает подтверждение удаления выбранной группы.
 * @property {(id:string)=>void} confirmDeleteGroup Удаляет подтверждённую группу через владельца.
 * @property {()=>void} cancelDeleteGroup Снимает подтверждение, сохраняя группу и закладки.
 * @property {()=>void} exportGroup Выгружает выбранную группу через владельца.
 * @property {()=>void} importGroup Открывает проверяемую вставку JSON в выбранную группу.
 * @property {()=>void} cancelGroupName Скрывает поле без применения его черновика.
 */
/**
 * Готовые знаки команд именованной группы.
 * @typedef {Object} BookmarkGroupIcons
 * @property {import('lit').TemplateResult} create Создать группу с введённым именем.
 * @property {import('lit').TemplateResult} rename Переименовать выбранную группу.
 * @property {import('lit').TemplateResult} remove Удалить выбранную группу.
 * @property {import('lit').TemplateResult} export Выгрузить выбранную группу.
 * @property {import('lit').TemplateResult} import Загрузить выбранную группу.
 * @property {import('lit').TemplateResult} cancel Отменить выбранную операцию поля имени.
 */

/**
 * Показывает выбор группы и один черновик имени для создания или переименования.
 * @param {BookmarkGroupValues} values Подготовленные группы и доступность удаления.
 * @param {BookmarkGroupLabels} labels Доступные подписи полей и команд.
 * @param {BookmarkGroupActions} actions Проверяющие действия владельца групп.
 * @param {BookmarkGroupIcons} icons Готовые знаки команд группы.
 * @returns {import('lit').TemplateResult} Молекула формы; черновик остаётся в input, группы и записи здесь не сохраняются.
 */
export function renderBookmarkGroupControl(values, labels, actions, icons) {
  const current = values.groups.find((group) => group.id === values.currentGroup);
  /**
   * Передаёт выбранный id владельцу, который готовит строки только этой группы.
   * @param {Event} event Change select групп.
   * @returns {void} Местной копии выбранной группы не создаёт.
   */
  const select = (event) => actions.selectGroup(/** @type {HTMLSelectElement} */ (event.currentTarget).value);
  /**
   * Читает нынешний черновик соседнего поля без отдельного состояния представления.
   * @param {HTMLFormElement|null} form Форма нажатой кнопки либо отправки.
   * @returns {string} Строка поля; пустая строка при отсутствии формы передаётся владельцу для отказа.
   */
  const name = (form) => form?.querySelector('input')?.value || '';
  /**
   * Выполняет только выбранную владельцем операцию при отправке поля по Enter или кнопке применения.
   * @param {Event} event Submit одной формы имени.
   * @returns {void} Отменяет стандартную отправку и передаёт черновик владельцу.
   */
  const apply = (event) => {
    event.preventDefault();
    const draft = name(/** @type {HTMLFormElement} */ (event.currentTarget));
    if (values.nameMode === 'create') actions.createGroup(draft);
    else if (values.nameMode === 'rename') actions.renameGroup(values.currentGroup, draft);
  };
  return screenTemplate('bookmarks', 'bookmark-group-control.bookmarkGroupControl', {
    selectLabel: labels.select,
    hidden: Boolean(values.nameMode),
    currentGroup: values.currentGroup,
    onChange: select,
    groupsContent: values.groups.map((group) =>
      screenTemplate('bookmarks', 'bookmark-group-control.option', {
        id: group.id,
        selected: group.id === values.currentGroup,
        name: group.name,
      }),
    ),
    exportLabel: labels.export,
    onExportGroup: actions.exportGroup,
    exportIcon: icons.export,
    importLabel: labels.import,
    onImportGroup: actions.importGroup,
    importIcon: icons.import,
    nameModeContent: values.nameMode
      ? screenTemplate('bookmarks', 'bookmark-group-control.bookmarkGroupForm', {
          ariaLabel: values.nameMode === 'create' ? labels.create : labels.rename,
          onSubmit: apply,
          nameLabel: labels.name,
          value: values.nameMode === 'create' ? '' : current?.name || '',
          nameModeContent: values.nameMode === 'create' ? icons.create : icons.rename,
          cancelLabel: labels.cancel,
          onCancelGroupName: actions.cancelGroupName,
          cancelIcon: icons.cancel,
        })
      : nothing,
    confirmDeleteContent: values.confirmDelete
      ? screenTemplate('bookmarks', 'bookmark-group-control.confirm', {
          confirmDeleteLabel: labels.confirmDelete,
          onConfirmDeleteGroup: () => actions.confirmDeleteGroup(values.currentGroup),
          confirmLabel: labels.confirm,
          onCancelDeleteGroup: actions.cancelDeleteGroup,
          cancelLabel: labels.cancel,
        })
      : nothing,
  });
}
