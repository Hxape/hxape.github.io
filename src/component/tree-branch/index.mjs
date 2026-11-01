/** Создаёт сворачиваемую ветвь с одной строкой и местом для дочернего содержимого. */
import { createTreeRow } from '../tree-row/index.mjs';

/**
 * Создаёт ветвь details с одной управляющей строкой summary.
 * @param {Document} owner Документ, создающий li, details и summary ветви.
 * @returns {HTMLLIElement} Новый li с закрытым details; предметные подписи и потомки добавляет вызывающая сторона.
 */
export function cloneBranch(owner) {
  const entry = owner.createElement('li');
  const details = owner.createElement('details');
  details.append(createTreeRow(owner, true));
  entry.append(details);
  return entry;
}
