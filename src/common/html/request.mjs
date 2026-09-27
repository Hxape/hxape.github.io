/*! Adapted from HTMX 2.0.11: verifyPath, issueAjaxRequest, handleAjaxResponse.
 * https://github.com/bigskysoftware/htmx/blob/v2.0.11/src/htmx.js
 * License: 0BSD, vendor/htmx-2.0.11/LICENSE. */

/** Загружает только перечисленные фрагменты сайта; готовностью и повтором владеет вызывающий компонент. */
import { insertFragment } from './fragment.mjs';

const fragments = new Set(
  [
    'header',
    'catalog',
    'footer',
    'document-panel',
    'token-manager',
    'source-view',
    'bookmarks',
    'history',
    'preferences',
    'search',
  ].map((name) => `public/html/${name}.html`),
);

/**
 * Читает один разрешённый HTML-файл без общей очереди и вставки в DOM.
 * Готовность, проверка разметки и повтор принадлежат вызывающему компоненту.
 * @param {string} path Один из разрешённых путей public/html относительно исходной страницы.
 * @returns {Promise<string>} Точный текст HTML; запрещённый путь, перенаправление, HTTP и срок отклоняют запрос.
 */
export function requestHTML(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, document.baseURI);
    if (!fragments.has(path) || url.origin !== location.origin) throw new Error('HTML fragment URL is not allowed.');
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url.href, true);
    xhr.overrideMimeType('text/html');
    xhr.timeout = 15_000;
    /**
     * Снимает обработчики одного XHR и завершает обещание вставки.
     * @param {unknown} [error] Отказ запроса или вставки; null означает успех.
     * @returns {void}
     */
    const finish = (/** @type {unknown} */ error = null, response = '') => {
      xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = null;
      if (error) reject(error);
      else resolve(response);
    };
    xhr.onload = () => {
      try {
        if (xhr.status < 200 || xhr.status >= 300 || xhr.status === 204) {
          throw new Error(`HTML fragment request failed: HTTP ${xhr.status}`);
        }
        if (xhr.responseURL && xhr.responseURL !== url.href) throw new Error('HTML fragment was redirected.');
        finish(null, xhr.responseText);
      } catch (error) {
        finish(error);
      }
    };
    xhr.onerror = () => finish(new Error('HTML fragment request failed.'));
    xhr.ontimeout = () => finish(new Error('HTML fragment request timed out.'));
    xhr.onabort = () => finish(new Error('HTML fragment request was aborted.'));
    try {
      xhr.send();
    } catch (error) {
      finish(error);
    }
  });
}

/**
 * Загружает разрешённый фрагмент и вставляет его в нынешний документ получателя.
 * @param {string} path Разрешённый путь public/html относительно исходной страницы.
 * @param {HTMLElement} target Подключённый узел, чьи дочерние узлы будут заменены.
 * @returns {Promise<void>} Завершается после вставки; отсоединённый узел, сеть и разбор HTML отклоняют запрос.
 */
export function requestFragment(path, target) {
  return requestHTML(path).then((response) => {
    if (!target.isConnected) throw new Error('HTML fragment target is detached.');
    insertFragment(target, response);
  });
}
