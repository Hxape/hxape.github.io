/** Составляет строки в показанном списке без владения коллекцией или выбором. */
import { renderTokenRow } from '../token-row/index.mjs';

/**
 * Создаёт и вставляет строки принятого владельцем списка токенов.
 * @param {Element} list Прежний контейнер списка в нынешнем документе.
 * @param {ReadonlyArray<import('../token-row/index.mjs').TokenRowModel>} rows Подготовленные метаданные и действия строк в порядке владельца; PAT в модели отсутствует.
 * @returns {void} Заменяет дочерние li списка; выбор токена и обработку команд не выполняет.
 */
export function renderTokenList(list, rows) {
  const fragment = list.ownerDocument.createDocumentFragment();
  for (const row of rows) fragment.append(renderTokenRow(list.ownerDocument, row));
  list.replaceChildren(fragment);
}
