/** Читает текст нынешнего представления и связывает его UTF-16 позиции с прежними Text-узлами без изменения материала. */

/**
 * Один непрерывный вклад Text-узла в поисковую строку.
 * @typedef {Object} SearchSegment
 * @property {Text} node Прежний текстовый узел; ссылка освобождается вместе с проекцией.
 * @property {number} start Начало вклада в общей строке, в UTF-16 единицах.
 * @property {number} end Конец вклада, не включаемый в совпадение.
 * @property {number} rawStart Начальная позиция в node.data при линейном соответствии.
 * @property {Uint32Array|null} offsets Позиции границ символов в исходном узле после схлопывания пробелов; null при линейном соответствии.
 */

/**
 * Производный индекс одного показанного материала, не запись журнала и не текстовый кэш.
 * @typedef {Object} SearchProjection
 * @property {Document|null} document Документ узлов; null после явного освобождения.
 * @property {string} text Строка нынешнего представления; пробелы PRE/HXDoc сохранены, обычного HTML схлопнуты.
 * @property {Uint32Array} blocks Пары start/end отдельных блоков и ячеек; поиск не пересекает их границы.
 * @property {SearchSegment[]} segments Карта строковых позиций к Text-узлам; не содержит диапазона на каждое совпадение.
 */

/**
 * Временное ограничение поиска в нынешней проекции; не переносится на другой текст или документ.
 * @typedef {Object} SearchBounds
 * @property {number} start Включаемое начало в общей строке проекции, в UTF-16 единицах.
 * @property {number} end Не включаемый конец в той же строке; границы блоков продолжают ограничивать совпадения.
 */

/**
 * CSS-свойства, значимые для текстовой проекции; читаются один раз на элемент за построение.
 * @typedef {Object} TextStyle
 * @property {string} display Значение display для разделения блоков и исключения скрытого содержимого.
 * @property {string} visibility Значение visibility для исключения невидимого текста.
 * @property {string} whiteSpace Правило сохранения или схлопывания пробелов.
 */

/**
 * Текст одного узла после применения normal либо pre/pre-wrap.
 * @typedef {Object} ProjectedNode
 * @property {string} text Вклад узла в нынешний логический блок.
 * @property {number} rawStart Начальная позиция исходного узла при линейном соответствии.
 * @property {Uint32Array|null} offsets Исходные позиции границ нормализованных символов либо null.
 */

const excluded =
  'script,style,template,svg,button,input,select,textarea,[hidden],[aria-hidden="true"],[data-source-gutter],[data-source-bookmarks],[data-search-current]';
const space = /[ \t\r\n\f]/;
const blockDisplays = new Set(['block', 'flow-root', 'list-item', 'table-cell', 'table-caption', 'flex', 'grid']);

/**
 * Схлопывает только HTML-пробелы normal, сохраняя позиции исходной строки.
 * @param {string} raw Текст одного узла, без преобразования регистра.
 * @param {boolean} leadingSpace Предыдущий вклад уже закончился пробелом или это начало блока.
 * @returns {ProjectedNode} Нормализованный текст и карта его границ; строка raw не меняется.
 */
function normalText(raw, leadingSpace) {
  let first = 0;
  if (leadingSpace) { while (first < raw.length && space.test(raw[first])) first++; }
  const remainder = raw.slice(first);
  if (!/[\t\r\n\f]| {2,}/.test(remainder)) return { text: remainder, rawStart: first, offsets: null };
  /**
   * Части нормализованной строки; объединяются только после прохода.
   * @type {string[]}
   */
  const parts = [];
  /**
   * Исходные позиции перед каждым символом результата и после последнего.
   * @type {number[]}
   */
  const offsets = [];
  for (let position = first; position < raw.length;) {
    if (space.test(raw[position])) {
      offsets.push(position);
      parts.push(' ');
      while (position < raw.length && space.test(raw[position])) position++;
    } else {
      const start = position;
      while (position < raw.length && !space.test(raw[position])) offsets.push(position++);
      parts.push(raw.slice(start, position));
    }
  }
  offsets.push(raw.length);
  return { text: parts.join(''), rawStart: first, offsets: Uint32Array.from(offsets) };
}

/**
 * Строит проекцию только указанного показанного корня; скрытые области и элементы управления не участвуют.
 * @param {HTMLElement} root Область текущего Markdown, HXDoc или code; выбирается Panel по готовому виду.
 * @returns {SearchProjection} Текст, границы блоков и карта прежних узлов; DOM и пользовательское выделение не меняются.
 */
export function createSearchProjection(root) {
  const owner = root.ownerDocument;
  const view = owner.defaultView;
  /**
   * Индекс создаётся заново после каждой замены материала или его вида.
   * @type {SearchProjection}
   */
  const projection = { document: owner, text: '', blocks: new Uint32Array(), segments: [] };
  if (!view) return projection;
  /**
   * Свойства элементов только на срок данного прохода.
   * @type {WeakMap<Element,TextStyle>}
   */
  const styles = new WeakMap();
  /**
   * Читает и запоминает три свойства элемента на срок текущего обхода.
   * @param {Element} element Элемент текущего документа.
   * @returns {TextStyle} Значимые свойства текущего CSS.
   */
  const styleOf = element => {
    let saved = styles.get(element);
    if (!saved) {
      const style = view.getComputedStyle(element);
      saved = { display: style.display, visibility: style.visibility, whiteSpace: style.whiteSpace };
      styles.set(element, saved);
    }
    return saved;
  };
  /**
   * Строковые вклады; никаких новых узлов в материале не создаётся.
   * @type {string[]}
   */
  const pieces = [];
  /**
   * Границы законченных непустых блоков.
   * @type {number[]}
   */
  const blocks = [];
  /**
   * Ближайший блочный предок предыдущего Text-узла.
   * @type {Element|null}
   */
  let block = null;
  let length = 0;
  let blockStart = 0;
  let lastNormalSpace = false;
  let leadingSpace = true;
  /** Завершает блок, удаляя невидимый завершающий normal-пробел и записывая только непустые границы. */
  const finishBlock = () => {
    if (lastNormalSpace && pieces.at(-1)?.endsWith(' ')) {
      const last = pieces.length - 1;
      pieces[last] = pieces[last].slice(0, -1);
      const segment = projection.segments.at(-1);
      if (segment) {
        segment.end--;
        if (segment.offsets) segment.offsets = segment.offsets.subarray(0, segment.end - segment.start + 1);
        if (segment.end === segment.start) projection.segments.pop();
      }
      length--;
    }
    if (length > blockStart) blocks.push(blockStart, length);
    blockStart = length;
    leadingSpace = true;
    lastNormalSpace = false;
  };
  const walker = owner.createTreeWalker(root, 5);
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    if (current.nodeType === 1) {
      const element = /** @type {Element} */ (current);
      if (element.tagName === 'BR') {
        let hidden = false;
        for (
          let parent = /** @type {Element|null} */ (element);
          parent && root.contains(parent);
          parent = parent.parentElement
        ) {
          const style = styleOf(parent);
          if (
            parent.matches(excluded) || style.display === 'none' || style.visibility === 'hidden'
            || style.visibility === 'collapse'
          ) {
            hidden = true;
            break;
          }
          if (parent === root) break;
        }
        if (!hidden) {
          finishBlock();
          block = null;
        }
      }
      continue;
    }
    const node = /** @type {Text} */ (current);
    if (!node.data || !node.parentElement) continue;
    /**
     * Предки текущего Text-узла до переданного корня.
     * @type {HTMLElement|null}
     */
    let parent = node.parentElement;
    /**
     * Блок либо сама переданная область у единого PRE/code.
     * @type {Element}
     */
    let nearest = root;
    let foundBlock = false;
    let hidden = false;
    while (parent && root.contains(parent)) {
      const style = styleOf(parent);
      if (
        parent.matches(excluded) || style.display === 'none' || style.visibility === 'hidden'
        || style.visibility === 'collapse'
      ) {
        hidden = true;
        break;
      }
      if (!foundBlock && (blockDisplays.has(style.display) || parent.matches('br,pre,td,th'))) {
        nearest = parent;
        foundBlock = true;
      }
      if (parent === root) break;
      parent = parent.parentElement;
    }
    if (hidden) continue;
    if (block !== nearest) {
      finishBlock();
      block = nearest;
    }
    const whiteSpace = styleOf(node.parentElement).whiteSpace;
    const exact = whiteSpace === 'pre' || whiteSpace === 'pre-wrap' || whiteSpace === 'break-spaces';
    const value = exact ? { text: node.data, rawStart: 0, offsets: null } : normalText(node.data, leadingSpace);
    if (!value.text) continue;
    projection.segments.push({
      node,
      start: length,
      end: length + value.text.length,
      rawStart: value.rawStart,
      offsets: value.offsets,
    });
    pieces.push(value.text);
    length += value.text.length;
    leadingSpace = space.test(value.text.at(-1) || '');
    lastNormalSpace = !exact && leadingSpace;
  }
  finishBlock();
  projection.text = pieces.join('');
  projection.blocks = Uint32Array.from(blocks);
  return projection;
}

/**
 * Освобождает строку и ссылки на текстовые узлы перед сменой материала, отзывом или переносом.
 * @param {SearchProjection} projection Производные данные прежнего отображения.
 * @returns {void} После освобождения новый диапазон из этой проекции создать нельзя.
 */
export function releaseSearchProjection(projection) {
  projection.text = '';
  projection.blocks = new Uint32Array();
  projection.segments.length = 0;
  projection.document = null;
}

/**
 * Находит проецируемую границу, сравнивая исходные позиции с выбранным DOM-диапазоном.
 * @param {SearchSegment} segment Вклад нынешнего Text-узла с монотонной картой исходных границ.
 * @param {Range} range Непустое выделение того же документа; границы у элементов сохраняют смысл индекса дочернего узла.
 * @param {boolean} afterEnd false ищет первую границу не раньше начала выделения, true — первую строго после его конца.
 * @returns {number} Местный индекс границы от 0 до длины вклада либо длина + 1, если подходящей границы нет.
 */
function selectedBoundary(segment, range, afterEnd) {
  let low = 0;
  let high = segment.end - segment.start + 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const offset = segment.offsets?.[middle] ?? segment.rawStart + middle;
    const relative = range.comparePoint(segment.node, offset);
    if (relative < (afterEnd ? 1 : 0)) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * Пересекает выделение браузера с допустимым текстом проекции, не изменяя Selection или сам Range.
 * @param {SearchProjection} projection Производные данные нынешнего показанного материала; освобождённые или перенесённые узлы недопустимы.
 * @param {Range} range Выделение того же документа до перевода фокуса; Ctrl+A может иметь обе границы у предка материала.
 * @returns {SearchBounds|null} Абсолютные UTF-16 границы полностью выбранных исходных интервалов; частичный схлопнутый пробел округляется внутрь. Чужой, пустой или устаревший диапазон даёт null.
 */
export function searchBoundsForRange(projection, range) {
  const owner = projection.document;
  if (
    !owner || range.collapsed || !range.startContainer.isConnected || !range.endContainer.isConnected
    || (range.startContainer.ownerDocument || range.startContainer) !== owner
    || (range.endContainer.ownerDocument || range.endContainer) !== owner
  ) return null;
  let start = -1;
  let end = -1;
  try {
    for (const segment of projection.segments) {
      const length = segment.end - segment.start;
      const rawEnd = segment.offsets?.[length] ?? segment.rawStart + length;
      if (segment.node.ownerDocument !== owner || !segment.node.isConnected || rawEnd > segment.node.data.length) {
        return null;
      }
      // Обе исходные границы символа должны попасть внутрь Range, включая весь схлопнутый пробел.
      const first = selectedBoundary(segment, range, false);
      const last = selectedBoundary(segment, range, true) - 1;
      if (first >= last) continue;
      if (start < 0) start = segment.start + first;
      end = segment.start + last;
    }
  } catch {
    return null;
  }
  return start >= 0 && end > start ? { start, end } : null;
}

/**
 * Создаёт один диапазон текущего совпадения по исходным UTF-16 границам, не меняя материал.
 * @param {SearchProjection} projection Проекция нынешнего документа; после release непригодна.
 * @param {number} start Включаемое начало совпадения в строке проекции.
 * @param {number} end Не включаемый конец совпадения в строке проекции.
 * @returns {Range|null} Один диапазон прежних Text-узлов либо null для отсутствующей/устаревшей проекции.
 */
export function rangeForSearchMatch(projection, start, end) {
  const owner = projection.document;
  if (
    !owner || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0
    || end <= start || end > projection.text.length
  ) return null;
  const segments = projection.segments;
  /**
   * Находит вклад Text-узла по позиции символа бинарным поиском упорядоченных границ.
   * @param {number} offset Позиция символа, лежащая внутри вклада.
   * @returns {SearchSegment|undefined} Сегмент этой позиции.
   */
  const at = offset => {
    let low = 0;
    let high = segments.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (segments[middle].end <= offset) low = middle + 1;
      else high = middle;
    }
    return segments[low];
  };
  const first = at(start);
  const last = at(end - 1);
  if (
    !first || !last || first.node.ownerDocument !== owner || last.node.ownerDocument !== owner
    || !first.node.isConnected || !last.node.isConnected
  ) return null;
  const range = owner.createRange();
  const firstOffset = first.offsets?.[start - first.start] ?? first.rawStart + start - first.start;
  const lastOffset = last.offsets?.[end - last.start] ?? last.rawStart + end - last.start;
  if (firstOffset > first.node.data.length || lastOffset > last.node.data.length) return null;
  range.setStart(first.node, firstOffset);
  range.setEnd(last.node, lastOffset);
  return range;
}
