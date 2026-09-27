/** Находит буквальные совпадения в проекции нынешнего текста без DOM, запросов и изменения регистра исходной строки. */

/**
 * Компактные границы всех совпадений без отдельного объекта или Range на каждое.
 * @typedef {Object} SearchMatches
 * @property {Uint32Array} starts Включаемые UTF-16 начала в исходной строке проекции; длина даёт точное число совпадений.
 * @property {Uint32Array} ends Не включаемые UTF-16 концы тех же совпадений, учитывающие длину найденного текста.
 */

/**
 * Ищет без регистра и перекрытий; каждую пару блочных границ рассматривает отдельно.
 * @param {string} text Строка показанного материала, без toLowerCase и смены UTF-16 смещений.
 * @param {Uint32Array} blocks Пары start/end независимых блоков и ячеек.
 * @param {string} query Буквальный запрос; метасимволы экранируются, пробелы не обрезаются.
 * @param {import('./search-projection.mjs').SearchBounds|null} [bounds] Ограничение выделением в абсолютных позициях; undefined означает всю проекцию, null — недоступное выделение.
 * @returns {SearchMatches} Точный индекс с абсолютными UTF-16 позициями; пустой запрос, null или неверные bounds дают пустые массивы.
 */
export function findSearchMatches(text, blocks, query, bounds) {
  if (
    !query || bounds === null || bounds && (!Number.isSafeInteger(bounds.start) || !Number.isSafeInteger(bounds.end)
        || bounds.start < 0 || bounds.end <= bounds.start || bounds.end > text.length)
  ) return { starts: new Uint32Array(), ends: new Uint32Array() };
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escaped, 'giu');
  let starts = new Uint32Array(64);
  let ends = new Uint32Array(64);
  let count = 0;
  for (let block = 0; block + 1 < blocks.length; block += 2) {
    const blockStart = blocks[block];
    const blockEnd = blocks[block + 1];
    if (blockEnd <= blockStart || blockEnd > text.length) continue;
    const begin = bounds ? Math.max(blockStart, bounds.start) : blockStart;
    const finish = bounds ? Math.min(blockEnd, bounds.end) : blockEnd;
    if (finish <= begin) continue;
    // Каждый блок просматривается один раз; отсутствующий запрос не сканирует оставшиеся блоки повторно.
    const blockText = text.slice(begin, finish);
    pattern.lastIndex = 0;
    for (let match = pattern.exec(blockText); match; match = pattern.exec(blockText)) {
      if (count === starts.length) {
        const nextStarts = new Uint32Array(starts.length * 2);
        const nextEnds = new Uint32Array(ends.length * 2);
        nextStarts.set(starts);
        nextEnds.set(ends);
        starts = nextStarts;
        ends = nextEnds;
      }
      starts[count] = begin + match.index;
      ends[count++] = begin + match.index + match[0].length;
    }
  }
  return { starts: starts.subarray(0, count), ends: ends.subarray(0, count) };
}

/**
 * Выбирает соседнее совпадение по кругу без изменения адреса материала.
 * @param {number} current Нынешний индекс от 0; -1 означает отсутствие выбранного совпадения.
 * @param {number} total Точное число найденных совпадений.
 * @param {-1|1} direction Предыдущее либо следующее совпадение.
 * @returns {number} Индекс от 0 до total-1 либо -1 для пустого результата.
 */
export function circularSearchIndex(current, total, direction) {
  if (!Number.isSafeInteger(total) || total <= 0) return -1;
  if (current < 0 || current >= total) return direction === 1 ? 0 : total - 1;
  return (current + direction + total) % total;
}
