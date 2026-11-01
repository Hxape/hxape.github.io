/** Лениво читает разметку экранов и поиска, связывая её с готовыми значениями Lit. */
import { html } from 'lit';
import { requestHTML } from './request.mjs';
import { ui } from '../ui/text.mjs';

/**
 * Имя одного экрана с отдельным исходным HTML.
 * @typedef {'bookmarks'|'history'|'preferences'|'search'} ScreenName
 */
/**
 * Постоянные строки одного представления и имена его подстановок.
 * @typedef {{strings:TemplateStringsArray,names:string[]}} ScreenTemplate
 */
/** @type {Map<ScreenName,Map<string,ScreenTemplate>>} Успешно прочитанная разметка на срок страницы. */
const screens = new Map();
/** @type {Map<ScreenName,Promise<void>>} Одна незавершённая попытка на экран; отказ разрешает повтор. */
const pending = new Map();

/**
 * Проверяет готовность представления, не начиная загрузку и не читая данные владельца.
 * @param {ScreenName} name Имя всплывающего экрана.
 * @returns {boolean} Разметка целиком прочитана и разобрана.
 */
export function screenReady(name) {
  return screens.has(name);
}

/**
 * Загружает разметку при открытии popup; поздний ответ сохраняет лишь разметку.
 * @param {ScreenName} name Имя отдельного HTML в public/html.
 * @returns {Promise<void>} Готовность разметки; отказ сети или неверный исходник разрешают следующую попытку.
 */
export function loadScreen(name) {
  if (screens.has(name)) return Promise.resolve();
  const previous = pending.get(name);
  if (previous) return previous;
  const promise = requestHTML(`public/html/${name}.html`)
    .then((source) => {
      /** @type {Map<string,ScreenTemplate>} */
      const templates = new Map();
      const sections = /<template id="([a-zA-Z][a-zA-Z0-9.-]*)">([\s\S]*?)<\/template>/g;
      let end = 0;
      for (const section of source.matchAll(sections)) {
        const [match, id, content] = section;
        if (source.slice(end, section.index).trim() || templates.has(id) || /<script\b/i.test(content)) {
          throw new Error(`Неверная разметка экрана: ${name}`);
        }
        const names = [...content.matchAll(/\$\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((part) => part[1]);
        const parts = content.split(/\$\{[a-zA-Z][a-zA-Z0-9]*\}/);
        if (parts.some((part) => part.includes('${'))) throw new Error(`Неверная подстановка: ${id}`);
        const strings = Object.freeze(Object.assign(parts, { raw: Object.freeze([...parts]) }));
        templates.set(id, { strings, names });
        end = section.index + match.length;
      }
      if (!end || source.slice(end).trim()) throw new Error(`Нет разметки экрана: ${name}`);
      screens.set(name, templates);
    })
    .finally(() => pending.delete(name));
  pending.set(name, promise);
  return promise;
}

/**
 * Подставляет готовые значения, действия и дочерние представления в HTML экрана.
 * @param {ScreenName} screen Экран, который владелец загружает при открытии popup.
 * @param {string} name Имя представления внутри HTML.
 * @param {Record<string,unknown>} values Готовые значения и обработчики; HTML не исполняет выражения JavaScript.
 * @returns {import('lit').TemplateResult} Представление Lit; отсутствие разметки даёт пустую область и не меняет данные.
 */
export function screenTemplate(screen, name, values) {
  const template = screens.get(screen)?.get(name);
  if (!template) return html``;
  return html(template.strings, ...template.names.map((key) => values[key]));
}

/**
 * Показывает ожидание или отказ разметки, сохраняя отдельные действия повтора и закрытия.
 * @param {boolean} failed Последняя попытка чтения не удалась.
 * @param {()=>void} retry Повтор владельца; выполняется только по нажатию.
 * @param {(()=>void)|null} [close] Закрытие popup; null оставляет управление у его прежнего контейнера.
 * @returns {import('lit').TemplateResult} Только состояние загрузки представления, без данных истории или преференсов.
 */
export function screenStatus(failed, retry, close = null) {
  return html`
    <p
      class="navigation-message muted"
      role="status"
    >
      ${failed ? ui.screens.failed : ui.screens.loading}
      ${failed
        ? html`
            <button
              type="button"
              class="control primary"
              @click=${retry}
            >
              ${ui.screens.retry}
            </button>
          `
        : ''}
      ${close
        ? html`
            <button
              type="button"
              class="control primary"
              @click=${close}
            >
              ${ui.navigation.close}
            </button>
          `
        : ''}
    </p>
  `;
}
