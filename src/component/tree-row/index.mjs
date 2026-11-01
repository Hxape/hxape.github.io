/** Создаёт строки дерева из готовых подписей и показывает недоступное действие. */

/**
 * Готовое содержимое одной строки без выбора и карты предметных узлов.
 * @typedef {Object} TreeRowContent
 * @property {string} name Видимое имя строки.
 * @property {Node|null} [icon] Готовый DOM-значок либо отсутствие значка.
 * @property {HTMLElement} [caption] Очищенная приписка, клонируемая при заполнении строки.
 * @property {string} [accessibleName] Полное доступное имя; отсутствие снимает прежний aria-label.
 * @property {boolean} [hasPopup] Указывает, что действие строки открывает диалог информации.
 */

/**
 * Создаёт summary ветви либо фокусируемую строку конечного узла.
 * @param {Document} owner Документ дерева, создающий управляющий элемент.
 * @param {boolean} [branch] true создаёт summary для details; false создаёт native button в местной обёртке с отдельной припиской.
 * @returns {HTMLElement} Новая пустая строка; leaf parentElement переносится в li вместе с ней, содержимое и обработчики назначает владелец дерева.
 */
export function createTreeRow(owner, branch = false) {
  const row = owner.createElement(branch ? 'summary' : 'button');
  row.className = `tree-row label-row nonselectable ${branch ? 'strong' : 'control primary'}`;
  if (!branch) {
    /** @type {HTMLButtonElement} */ (row).type = 'button';
    const leaf = owner.createElement('div');
    leaf.className = 'tree-leaf label-row';
    leaf.append(row);
  }
  showTreeRow(row, { name: '' });
  return row;
}

/**
 * Заполняет подписи и знаки прежней строки без смены её выбора или обработчиков.
 * @param {HTMLElement} row Прежний summary или конечная строка дерева.
 * @param {TreeRowContent} content Имя, готовые значок и приписка, доступная подпись и признак диалога.
 * @returns {void} Заменяет только дочернее содержимое и атрибуты подписи; карту узлов не хранит.
 */
export function showTreeRow(row, { name, icon = null, caption, accessibleName, hasPopup = false }) {
  const label = /** @type {HTMLSpanElement} */ (row.querySelector(':scope > .node-label'))
    || row.ownerDocument.createElement('span');
  label.className = 'node-label';
  label.textContent = name;
  const leaf = row.localName === 'button' && row.parentElement?.classList.contains('tree-leaf')
    ? row.parentElement
    : null;
  row.replaceChildren(...(icon ? [icon] : []), label, ...(!leaf && caption ? [caption.cloneNode(true)] : []));
  if (leaf) {
    leaf.querySelector(':scope > .catalog-caption')?.remove();
    if (caption) leaf.append(caption.cloneNode(true));
    leaf.classList.toggle('has-catalog-caption', Boolean(caption));
  }
  row.classList.toggle('has-catalog-caption', Boolean(caption));
  if (accessibleName) row.setAttribute('aria-label', accessibleName);
  else row.removeAttribute('aria-label');
  if (hasPopup) row.setAttribute('aria-haspopup', 'dialog');
  else row.removeAttribute('aria-haspopup');
}

/**
 * Даёт краткий цветовой отклик и замок для недоступного действия строки.
 * @param {HTMLElement} row Строка, действие которой отвергнуто владельцем.
 * @param {()=>SVGSVGElement} createLock Фабрика готового SVG-замка; вызывается только без прежнего знака.
 * @returns {void} Запускает местную анимацию; при отсутствии подписи не добавляет замок, выбор и раскрытие не меняет.
 */
export function flashUnavailable(row, createLock) {
  row.getAnimations().forEach((animation) => animation.cancel());
  row.animate([
    { backgroundColor: 'transparent' },
    { backgroundColor: 'color-mix(in srgb, currentColor 22%, transparent)' },
    { backgroundColor: 'transparent' },
  ], { duration: 360 });
  const content = row.querySelector(':scope > h2') || row;
  const label = content.querySelector(':scope > .node-label');
  if (!label) return;
  let lock = row.querySelector(':scope > .unavailable-lock');
  if (!lock) {
    lock = createLock();
    lock.classList.add('unavailable-lock');
    (content === row ? label : content).after(lock);
  }
  lock.getAnimations().forEach((animation) => animation.cancel());
  lock.animate([{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: 900 }).onfinish = () =>
    lock.remove();
}
