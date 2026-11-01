/** Создаёт значки управления из закреплённых контуров и проверяет доступность местных системных глифов. */
import { html, nothing, render, svg } from 'lit';
import iconData from './json/control-icons.json' with { type: 'json' };
import { displayWindow, isHTMLElement } from './view-utils.mjs';

/**
 * Закреплённые рисунки управляющих действий; code — доверенная строка U+HEX либо null для SVG.
 * Кодовая точка преобразуется только при показе и проверке глифа; состояние кнопок остаётся у вызывающих блоков.
 */
const controls = iconData.controls;
/**
 * Ключ известного управляющего рисунка из control-icons.json; не обозначает действие кнопки.
 * @typedef {keyof typeof controls} ControlIcon
 */

/**
 * Подготавливает местный SF-глиф и встроенную SVG-замену; выбор доступного рисунка задаётся CSS документа.
 * @param {ControlIcon} name Ключ закреплённого рисунка, включая состояния закладки или режима ссылок.
 * @returns {import("lit").TemplateResult} Недоступный SF остаётся заменён SVG без внешнего запроса.
 */
export function controlIcon(name) {
  const icon = controls[name];
  const cssName = name.replaceAll('.', '-');
  const key = name === 'key' || name === 'key-slash';
  const filled = 'paths' in icon;
  const paths = filled ? icon.paths : [icon.path];
  const native = icon.code === null
    ? nothing
    : html`
        <svg
          class       = "sf-glyph"
          viewBox     = "0 0 100 100"
        >
          <text
            x = "0"
            y = "0"
          >${String.fromCodePoint(Number.parseInt(icon.code.slice(2), 16))}</text>
        </svg>
      `;
  const badge = 'badgePaths' in icon
    ? svg`
        <circle
          cx   = "11.3"
          cy   = "11.3"
          r    = "4.7"
          fill = "var(--bar)"
        ></circle>
        <g
          transform = "translate(6.7 6.7) scale(.58)"
        >
          ${icon.badgePaths.map((path) => svg`
            <path
              d = ${path}
            ></path>
          `)}
        </g>
      `
    : nothing;
  const slash = name === 'key-slash' || name === 'bookmark-remove' || name === 'source-pin-last'
    ? svg`
        <path
          d            = "M1.5 1.5 14.5 14.5"
          fill         = "none"
          stroke       = "var(--bar)"
          stroke-width = "2.2"
        ></path>
        <path
          d            = "M1.5 1.5 14.5 14.5"
          fill         = "none"
          stroke       = "currentColor"
          stroke-width = "1.2"
        ></path>
      `
    : nothing;
  return html`
    <span
      class       = "control-icon"
      aria-hidden = "true"
      style       = ${`
        --native-display:var(--sf-${cssName},none);
        --fallback-display:var(--svg-${cssName},block);
        --native-size:var(--sf-${cssName}-size,100px);
        --native-x:var(--sf-${cssName}-x,0px);
        --native-y:var(--sf-${cssName}-y,0px)
      `}
    >${native}<svg
        class   = ${`svg-glyph${filled ? ' filled-glyph' : ''}${key ? ' key-glyph' : ''}`}
        viewBox = ${filled ? '0 0 16 16' : '0 0 24 24'}
      >
        ${paths.map((path) =>
          svg`
            <path
              d         = ${path}
              fill-rule = ${'evenOdd' in icon && icon.evenOdd ? 'evenodd' : nothing}
            ></path>
          `
        )}
        ${badge}${slash}</svg></span>
  `;
}

/**
 * Заполняет известные data-control в данном DOM, не выбирая состояние содержащих их кнопок.
 * @param {ParentNode} root Область уже подготовленных слотов действий.
 * @returns {void} Неизвестные ключи и не-HTML слоты игнорируются.
 */
export function renderControlIcons(root) {
  for (const slot of root.querySelectorAll('[data-control]')) {
    if (!isHTMLElement(slot)) continue;
    const name = slot.getAttribute('data-control');
    if (name && Object.hasOwn(controls, name)) render(controlIcon(/** @type {ControlIcon} */ (name)), slot);
  }
}

/**
 * Один раз проверяет местное семейство SF и каждый глиф по независимому растру, затем задаёт его размеры в CSS документа.
 * @param {Document} owner Основной либо PiP документ, которому принадлежат кнопки.
 * @returns {Promise<void>} При отказе шрифта/растра остаются SVG; шрифт и контуры Apple с сайта не загружаются.
 */
export async function enableSystemSymbols(owner) {
  if (owner.documentElement.dataset.systemSymbols) return;
  owner.documentElement.dataset.systemSymbols = 'loading';
  const view = displayWindow(owner);
  try {
    const face = new view.FontFace(
      'Hxape System Symbols',
      'local("SFProDisplay-Regular"), local("SF Pro Display Regular")',
    );
    await face.load();
    if (view.closed) return;
    owner.fonts.add(face);
    const canvas = owner.createElement('canvas');
    canvas.width = canvas.height = 80;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Glyph raster is unavailable');
    // Сравнение с двумя запасными шрифтами отличает настоящий SF-глиф от подменённого символа.
    /**
     * Получает независимый растр одного глифа с заданным запасным семейством для проверки подмены.
     * @param {string} font Список семейств Canvas, включая проверяемый местный SF.
     * @param {string} glyph Единственная строка Unicode проверяемого символа.
     * @returns {Uint8ClampedArray} Копия RGBA-пикселей нынешнего рисунка на Canvas.
     */
    const raster = (font, glyph) => {
      context.clearRect(0, 0, 80, 80);
      context.font = `40px ${font}`;
      context.fillText(glyph, 10, 58);
      return context.getImageData(0, 0, 80, 80).data;
    };
    /**
     * Сравнивает растр SF с запасными шрифтами по точным RGBA-байтам.
     * @param {Uint8ClampedArray} a Растр проверяемого глифа.
     * @param {Uint8ClampedArray} b Растр для сравнения той же области.
     * @returns {boolean} true только при равенстве всех байтов первой области.
     */
    const equal = (a, b) => a.every((value, index) => value === b[index]);
    const sample = owner.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const sampleText = owner.createElementNS('http://www.w3.org/2000/svg', 'text');
    sample.setAttribute(
      'style',
      'position:absolute;left:-10000px;top:0;width:100px;height:100px;overflow:visible;visibility:hidden',
    );
    sampleText.setAttribute('style', "font:100px 'Hxape System Symbols'");
    sample.append(sampleText);
    owner.body.append(sample);
    let available = 0;
    try {
      // У подтверждённого глифа измеряем контур отдельно, чтобы не менять размеры кнопок с размером шрифта.
      for (const [name, icon] of Object.entries(controls)) {
        if (icon.code === null) continue;
        const cssName = name.replaceAll('.', '-');
        const glyph = String.fromCodePoint(Number.parseInt(icon.code.slice(2), 16));
        const native = raster('"Hxape System Symbols", monospace', glyph);
        if (
          !native.some(Boolean) || !equal(native, raster('"Hxape System Symbols", serif', glyph))
          || equal(native, raster('monospace', glyph)) || equal(native, raster('serif', glyph))
        ) continue;
        sampleText.textContent = glyph;
        const bounds = sampleText.getBBox();
        if (
          ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) || bounds.width <= 0
          || bounds.height <= 0
        ) continue;
        const scale = 82 / Math.max(bounds.width, bounds.height);
        owner.documentElement.style.setProperty(`--sf-${cssName}-size`, `${100 * scale}px`);
        owner.documentElement.style.setProperty(
          `--sf-${cssName}-x`,
          `${(100 - bounds.width * scale) / 2 - bounds.x * scale}px`,
        );
        owner.documentElement.style.setProperty(
          `--sf-${cssName}-y`,
          `${(100 - bounds.height * scale) / 2 - bounds.y * scale}px`,
        );
        owner.documentElement.style.setProperty(`--sf-${cssName}`, 'block');
        owner.documentElement.style.setProperty(`--svg-${cssName}`, 'none');
        available++;
      }
    } finally {
      sample.remove();
    }
    owner.documentElement.dataset.systemSymbols = available ? 'ready' : 'unavailable';
  } catch {
    owner.documentElement.dataset.systemSymbols = 'unavailable';
  }
}
