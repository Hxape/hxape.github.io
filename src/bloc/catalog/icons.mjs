/**
 * Создаёт значки узлов и источников версий; видимость групп задаёт каталог.
 */
import codicons from './json/codicons.json' with { type: 'json' };

/**
 * Нынешние флаги видимости SVG-групп, отдельные от доступа и состава дерева.
 * @typedef {Object} IconSettings
 * @property {boolean} repositories Показывать значки репозиториев; не меняет сами строки.
 * @property {boolean} directories Показывать значки каталогов; не меняет раскрытие.
 * @property {boolean} files Показывать значки файлов; не меняет разрешение просмотра.
 * @property {boolean} symbols Показывать значки объявлений; не меняет доступ к HXDoc.
 */

/**
 * Встроенная геометрия и правила выбора цветных значков дерева.
 * @typedef {Object} CodiconData
 * @property {Record<string,Array<[string,string|null]>>} paths Встроенные SVG-контуры по имени asset, с необязательным fill-rule.
 * @property {Record<string,[string,string]>} definitions Соответствие вида узла группе цвета и имени встроенной SVG-геометрии.
 */
const { paths, definitions } = /** @type {CodiconData} */ (/** @type {unknown} */ (codicons));

/**
 * Создаёт встроенный SVG вида узла, подставляя общий symbol для неизвестного вида.
 * @param {string} kind Ключ встроенной геометрии; неизвестный ключ получает symbol-misc.
 * @returns {SVGSVGElement} Новый SVG без сети и без состояния каталога.
 */
function kindIcon(kind) {
  const [color, asset] = Object.hasOwn(definitions, kind) ? definitions[kind] : ['symbol', 'symbol-misc'];
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 16 16');
  icon.setAttribute('class', `kind-icon icon-${color}`);
  icon.setAttribute('aria-hidden', 'true');
  for (const [shape, rule] of paths[asset]) {
    const path = document.createElementNS(icon.namespaceURI, 'path');
    path.setAttribute('d', shape);
    if (rule) path.setAttribute('fill-rule', rule);
    icon.append(path);
  }
  return icon;
}

/**
 * Отдаёт начальные флаги групп значков до применения настроек сайта и браузера.
 * @returns {IconSettings} Новый объект флагов видимости.
 */
export function defaultIcons() {
  return { repositories: false, directories: false, files: true, symbols: true };
}

/**
 * Меняет видимость существующих значков без пересоздания дерева.
 * @param {ParentNode} root DOM-область, в которой меняется видимость существующих значков.
 * @param {IconSettings} settings Проверяемые настройки соответствующего владельца.
 */
export function applyIcons(root, settings) {
  for (const icon of root.querySelectorAll('svg[data-icon-group]')) {
    const group = /** @type {keyof IconSettings} */ (/** @type {SVGSVGElement} */ (icon).dataset.iconGroup);
    icon.toggleAttribute('hidden', !settings[group]);
  }
}

/**
 * Создаёт значок и отмечает группу для последующей смены видимости.
 * @param {string} kind Вид данных или объявления, для которого выбирается правило.
 * @param {keyof IconSettings} group Группа видимости значка в настройках каталога.
 * @param {IconSettings} settings Проверяемые настройки соответствующего владельца.
 * @returns {SVGSVGElement} Новый SVG с data-icon-group и нынешним hidden.
 */
export function groupedIcon(kind, group, settings) {
  const icon = kindIcon(kind);
  icon.dataset.iconGroup = group;
  icon.toggleAttribute('hidden', !settings[group]);
  return icon;
}

/**
 * Выбирает группу по виду узла, а для файла — по расширению.
 * @param {NodeIconNode} node Узел дерева, чей вид и путь определяют действие.
 * @param {IconSettings} settings Проверяемые настройки соответствующего владельца.
 * @returns {SVGSVGElement|null} Значок группы либо null для неизвестного вида узла.
 */
export function nodeIcon(node, settings) {
  if (node.type === 'repository') return groupedIcon('repository', 'repositories', settings);
  if (node.type === 'symbol') return groupedIcon(node.kind || 'symbol', 'symbols', settings);
  if (node.type === 'directory') return groupedIcon('directory', 'directories', settings);
  if (node.type === 'file') {
    const extension = (node.name.split('.').pop() || '').toLowerCase();
    return groupedIcon(extension === 'hx' || extension === 'md' ? `file-${extension}` : 'file', 'files', settings);
  }
  return null;
}

/**
 * Создаёт выбранный lock-small для краткого отказа раскрытия строки.
 * @returns {SVGSVGElement} Новый SVG замка, не состояние подтверждённого доступа.
 */
export function unavailableLock() {
  return kindIcon('lock');
}

/**
 * Геометрия знака Haxe без цветных граней и папки из vscode-icons.
 */
const haxeOutline = 'M2 2 16 5.5 30 2 26.5 16 30 30 16 26.5 2 30 5.5 16Z M16 5.5 26.5 16 16 26.5 5.5 16Z';

/**
 * Создаёт готовую геометрию знака источника в указанном документе.
 * @param {Document} owner Документ создаваемого SVG, включая нынешний документ PiP.
 * @param {string} viewBox Система координат встроенного контура.
 * @param {string} shape Данные d единственного SVG path.
 * @param {number} size Размер квадратного SVG в CSS-пикселях.
 * @param {boolean} [outline] Использовать обводку вместо заливки для знака Haxe.
 * @returns SVG с заданным размером и заливкой либо обводкой.
 */
function sourceGlyph(owner, viewBox, shape, size, outline = false) {
  const svg = owner.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', outline ? 'none' : 'currentColor');
  if (outline) {
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linejoin', 'round');
  }
  const path = owner.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', shape);
  svg.append(path);
  return svg;
}

/**
 * Показывает источник установленной или опубликованной версии; неизвестный источник не получает значок.
 * @param {VersionIconSource|undefined} installation Подтверждённый источник версии; неизвестный источник не получает знак.
 * @param {Document} [owner] Документ, в котором создаётся отображаемый узел.
 * @returns {HTMLSpanElement|null} Знак Haxelib/GitHub либо null для неизвестного источника.
 */
export function versionSourceIcon(installation, owner = document) {
  const source = installation?.source;
  if (source !== 'haxelib' && source !== 'github') return null;
  const mark = owner.createElement('span');
  mark.className = `version-source-icon version-source-${source}`;
  mark.setAttribute('aria-hidden', 'true');
  if (source === 'haxelib') {
    const glyph = sourceGlyph(owner, '0 0 32 32', haxeOutline, 16, true);
    glyph.classList.add('version-haxe-mark');
    mark.append(glyph);
  } else {
    mark.append(sourceGlyph(owner, '0 0 16 16', paths['version-branch'][0][0], 16));
  }
  return mark;
}

/**
 * Данные, достаточные для выбора группы значка: вид узла, имя файла и вид объявления.
 * @typedef {Object} NodeIconNode
 * @property {string} type Вид узла каталога, определяющий путь и возможность просмотра.
 * @property {string} name Имя узла, файла или библиотеки для отображения и сопоставления.
 * @property {string} [kind] Вид объявления Haxe для выбора Codicon, например class, method или field.
 */

/**
 * Происхождение версии для знака Haxelib/GitHub; unknown не получает знак.
 * @typedef {Object} VersionIconSource
 * @property {string} source Происхождение версии или адреса; неизвестное происхождение не подтверждает выпуск.
 * @property {string} [refKind] Ref обозначает ветку либо тег; выбирает правило проверки публикации.
 */
