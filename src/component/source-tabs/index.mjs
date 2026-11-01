/** Показывает переключатель представлений одного файла отдельно от вкладок документов. */
import { isElement } from '../../common/ui/view-utils.mjs';

/**
 * Обновляет готовые подписи двух прежних кнопок представления файла.
 * @param {HTMLElement} tabs Область с прежними кнопками DOCUMENTATION/SOURCE CODE.
 * @param {ReadonlyArray<string>} labels Подписи в порядке кнопок; число должно совпадать с оболочкой.
 * @returns {void} При совпавшем количестве заменяет текст; несовпадение сохраняет прежние подписи.
 */
export function labelSourceTabs(tabs, labels) {
  const buttons = tabs.querySelectorAll('button');
  if (buttons.length !== labels.length) return;
  buttons.forEach((button, index) => {
    button.textContent = labels[index];
  });
}

/**
 * Отмечает принятый вид файла и связывает выбранную кнопку с прежней областью чтения.
 * @param {HTMLElement} tabs Переключатель с ключами data-source-tab.
 * @param {HTMLElement} body Прежняя область чтения, которая получает aria-labelledby выбранной вкладки.
 * @param {string} mode Принятый владельцем ключ documentation либо source.
 * @returns {void} Обновляет aria-selected/tabIndex и связь tabpanel; сам режим или тексты не хранит.
 */
export function selectSourceTab(tabs, body, mode) {
  tabs.querySelectorAll('button').forEach((button) => {
    const selected = button.dataset.sourceTab === mode;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected) body.setAttribute('aria-labelledby', button.id);
  });
  body.setAttribute('role', 'tabpanel');
}

/**
 * Передаёт намерение выбора вида файла при движении клавиатурой по двум кнопкам.
 * @param {KeyboardEvent} event Ввод одной прежней кнопки; другой элемент пропускается.
 * @param {HTMLElement} tabs Область кнопок с готовыми ключами вида.
 * @param {(key:string|undefined)=>void} choose Действие владельца по ключу выбранной кнопки; undefined сохраняет точную форму внешнего DOM.
 * @returns {void} Стрелки/Home/End передают готовый ключ и фокусируют выбранную кнопку; иные клавиши пропускаются.
 */
export function sourceTabsKey(event, tabs, choose) {
  const buttons = [...tabs.querySelectorAll('button')];
  const target = isElement(event.target) ? event.target.closest('button') : null;
  if (!target || !buttons.includes(target)) return;
  let index = buttons.indexOf(target);
  if (event.key === 'ArrowRight') index = (index + 1) % buttons.length;
  else if (event.key === 'ArrowLeft') index = (index - 1 + buttons.length) % buttons.length;
  else if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = buttons.length - 1;
  else return;
  event.preventDefault();
  choose(buttons[index].dataset.sourceTab);
  buttons[index].focus();
}
