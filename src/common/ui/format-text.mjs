/**
 * Подставляет именованные значения в текст интерфейса; отсутствие значения считается ошибкой словаря.
 * @param {string} template Строка словаря с именами в фигурных скобках.
 * @param {Record<string,string|number>} values Значения для каждого встреченного имени.
 * @returns {string} Строка с текстовыми подстановками, без разбора HTML.
 * @throws {Error} Если шаблон ссылается на отсутствующее значение.
 */
export function formatText(template, values) {
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (placeholder, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Missing text value: ${key}`);
    return String(values[key]);
  });
}
