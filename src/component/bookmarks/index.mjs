/** Показывает готовые закладки списком либо деревом, сохраняя выбор представления у владельца. */
import { renderBookmarkGroupControl } from '../bookmark-group-control/index.mjs';
import { renderCollection } from '../navigation-collection/index.mjs';

/**
 * Показывает готовые закладки в выбранном списке или дереве.
 * @param {HTMLElement} container Прежняя временная область закладок.
 * @param {Parameters<typeof renderCollection>[1]} model Строки закладок, подписи, значки и выбранный вид.
 * @param {Parameters<typeof renderCollection>[2]} actions Действия владельца записей и представления.
 * @returns {()=>void} Очистка местного жеста и слушателей; ни порядок, ни вид здесь не сохраняются.
 */
export function renderBookmarks(container, model, actions) {
  const values = model.bookmarkGroups;
  const labels = model.labels.bookmarkGroups;
  const icons = model.icons.groups;
  const controls = values && labels && actions.selectGroup && actions.createGroup && actions.renameGroup
      && actions.deleteGroup && actions.confirmDeleteGroup && actions.cancelDeleteGroup && actions.exportGroup
      && actions.importGroup && actions.cancelGroupName && icons
    ? renderBookmarkGroupControl(values, labels, {
      selectGroup: actions.selectGroup,
      createGroup: actions.createGroup,
      renameGroup: actions.renameGroup,
      deleteGroup: actions.deleteGroup,
      confirmDeleteGroup: actions.confirmDeleteGroup,
      cancelDeleteGroup: actions.cancelDeleteGroup,
      exportGroup: actions.exportGroup,
      importGroup: actions.importGroup,
      cancelGroupName: actions.cancelGroupName,
    }, icons)
    : null;
  return renderCollection(container, { ...model, controls }, actions);
}
