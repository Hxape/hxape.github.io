/** Показывает готовый заголовок просмотра, значок и необязательную приписку версии. */

/**
 * Готовая подпись материала, его значок, версия и необязательный переход к объявлению.
 * @typedef {Object} DocumentHeadingContent
 * @property {string} name Видимое имя материала или объявления.
 * @property {string} label Полное доступное имя заголовка, включая вид материала.
 * @property {Node|null} icon Готовый DOM-значок вида материала либо его отсутствие.
 * @property {string} versionText Приписка установленной версии; пустая строка скрывает её.
 * @property {string|null} [href] Необязательный адрес по нынешнему режиму ссылок; null оставляет ссылку без href.
 * @property {(event:MouseEvent)=>void} [onOpen] Необязательный обработчик открытия объявления; проверку режима выполняет владелец.
 */
import { html, nothing, render } from 'lit';

/**
 * Обновляет название, значок, версию и действие заголовка без смены просмотра.
 * @param {HTMLElement} title Контейнер названия с доступной подписью.
 * @param {HTMLElement} version Отдельный узел приписки версии.
 * @param {DocumentHeadingContent} content Готовая подпись материала, его значок, версия и необязательный переход к объявлению.
 * @returns {void} Меняет только узлы заголовка и версии; пустая версия скрывается.
 */
export function showDocumentHeading(title, version, { name, label, icon, versionText, href, onOpen }) {
  title.setAttribute('aria-label', label);
  render(
    html`
      ${icon}${
      onOpen
        ? html`<a
            class     = "node-label"
            href      = ${
          href || nothing
        }
            target    = "_blank"
            rel       = "noopener noreferrer"
            @click    = ${onOpen}
          >${name}</a>`
        : html`<span class="node-label">${name}</span>`
    }`,
    title,
  );
  version.hidden = !versionText;
  version.textContent = versionText;
}
