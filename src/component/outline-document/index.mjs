/** Показывает одну секцию структурированного текста с готовыми дочерними представлениями. */

/**
 * Готовая секция текста и дочерние представления.
 * @typedef {Object} OutlineContent
 * @property {OutlineHeading} [heading] Необязательный заголовок дочернего объявления.
 * @property {string} text Текст документации секции, без обхода предметной модели.
 * @property {ReadonlyArray<import('lit').TemplateResult>} children Уже построенные дочерние секции в порядке владельца.
 */

/**
 * Готовый заголовок секции без знания модели Haxe.
 * @typedef {Object} OutlineHeading
 * @property {string} name Видимое имя секции.
 * @property {string} [label] Необязательная подробная доступная подпись заголовка.
 * @property {Node|null} icon Готовый DOM-значок вида секции.
 * @property {string|null} [href] Необязательный адрес по нынешнему режиму ссылок.
 * @property {string} [target] Необязательные сериализованные метаданные адреса, созданные блоком.
 * @property {(event:MouseEvent)=>void} [onOpen] Необязательное действие открытия заголовка, уже связанное владельцем.
 */
import { html, nothing } from 'lit';

/**
 * Составляет секцию из готового заголовка, текста и дочерних секций.
 * @param {OutlineContent} content Подготовленная структура отображения; предметный обход выполняет блок.
 * @returns {import('lit').TemplateResult} Шаблон секции; пустой текст и отсутствующие дочерние секции не создают пустых областей.
 */
export function outlineDocument({ heading, text, children }) {
  return html`
    <section class="doc-section">
      ${heading
        ? html`
          <h3
            class      = "doc-heading label-row"
            aria-label = ${heading.label || nothing}
          >
            ${heading.icon}${heading.onOpen
              ? html`
                <a
                  class                = "node-label"
                  href                 = ${heading.href || nothing}
                  target               = "_blank"
                  rel                  = "noopener noreferrer"
                  data-material-target = ${heading.target || nothing}
                  @click               = ${heading.onOpen}
                >${heading.name}</a>
              `
              : html`<span class="node-label">${heading.name}</span>`}
          </h3>
        `
        : nothing}
      ${text.trim() ? html`<p class="doc-copy muted">${text}</p>` : nothing}
      ${children.length ? html`<div class="doc-children">${children}</div>` : nothing}
    </section>
  `;
}
