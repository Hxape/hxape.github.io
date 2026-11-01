/** Предоставляет словарь, подстановку параметров и единый порядок частей подсказки команды. */
import ui from './json/ui-strings.json' with { type: 'json' };

/** Статический словарь общих видимых строк; загрузки и пользовательского состояния здесь нет. */
export { ui };
export { formatText } from './format-text.mjs';

/**
 * Собирает одну подсказку команды для панели и её копии в настройках.
 * @param {string} label Имя нынешнего действия, например конкретный режим открытия ссылок.
 * @param {string} shortcut Физическая клавиша; пустая строка пропускает эту часть.
 * @param {string} [holdHint=''] Пояснение второго действия удержанием; пустая строка оставляет короткую команду.
 * @returns {string} Непустые части в порядке действие, клавиша, удержание, разделённые средней точкой.
 */
export function navigationTooltip(label, shortcut, holdHint = '') {
  return [label, shortcut, holdHint].filter(Boolean).join(' · ');
}
