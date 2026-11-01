/** Загружает начальные фрагменты страницы и запускает приложение после их проверки. */
import { requestFragment } from '../common/html/request.mjs';
import { formatText } from '../common/ui/format-text.mjs';
import labels from './json/bootstrap-strings.json' with { type: 'json' };

const script = document.currentScript;
if (!(script instanceof HTMLScriptElement) || !script.dataset.main) throw new Error('Missing main entry URL');
const mainUrl = new URL(script.dataset.main, document.baseURI).href;

/**
 * Один из четырёх начальных HTML-фрагментов каркаса, необходимых до запуска приложения.
 * @typedef {'header'|'catalog'|'footer'|'document-panel'} FragmentName
 */
/**
 * Готовность одного фрагмента принадлежит PageFragments до запуска приложения; готовый host больше не заменяется.
 * @typedef {object} Fragment
 * @property {HTMLElement} host Постоянный узел-получатель исходного документа.
 * @property {string} url Разрешённый путь public/html из data-fragment-url.
 * @property {string} selector Обязательный узел, который должен появиться после вставки ответа.
 * @property {boolean} ready Содержимое успешно вставлено и проверено.
 * @property {boolean} loading Идёт одна попытка запроса; повтор до её завершения запрещён.
 * @property {boolean} error Последняя попытка завершилась отказом и может быть повторена человеком.
 */

/** Загружает каждый фрагмент один раз; повторная замена готового host могла бы уничтожить его текущее содержимое. */
class PageFragments {
  /**
   * Состояния четырёх фрагментов на срок начального запуска; каждая запись имеет отдельный запрос и повтор.
   * @type {Map<FragmentName,Fragment>}
   */
  #parts = new Map();
  /**
   * Единственная плашка начальной загрузки с повтором фрагментов и перезагрузкой страницы.
   */
  #status = /** @type {HTMLDivElement} */ (document.querySelector('#startup-status'));
  /**
   * Главный модуль уже запрошен; повторный запуск в том же PageFragments не разрешён.
   */
  #started = false;
  /**
   * Начальная проверка трёх обязательных CSS не прошла; продолжить можно после перезагрузки.
   */
  #styleError = false;
  /**
   * Ошибка или превышение ожидания импорта main; поздний успешный запуск может снять этот признак.
   */
  #applicationError = false;
  /**
   * Закреплённые ранние тексты, доступные до главного графа приложения.
   */
  #labels = labels;

  /**
   * Проверяет начальный каркас, связывает повтор и начинает независимые запросы четырёх фрагментов.
   * @throws {Error} Если обязательный узел или путь фрагмента отсутствует.
   */
  constructor() {
    const styles = [...document.querySelectorAll('link[data-critical-style]')];
    this.#styleError = styles.length !== 3 || styles.some((link) => !(link instanceof HTMLLinkElement) || !link.sheet);
    /**
     * Минимальные обязательные узлы каждого фрагмента; host считается готовым только после их появления.
     * @type {Record<FragmentName,string>}
     */
    const selectors = {
      header: 'site-preferences',
      catalog: ':scope > .tree-list',
      footer: '#github-link',
      'document-panel': '#docs-document',
    };
    for (const [name, selector] of /** @type {[FragmentName,string][]} */ (Object.entries(selectors))) {
      const host = /** @type {HTMLElement} */ (document.querySelector(`[data-fragment="${name}"]`));
      const url = host.dataset.fragmentUrl;
      if (!url) throw new Error(`Missing fragment URL: ${name}`);
      this.#parts.set(name, { host, url, selector, ready: false, loading: false, error: false });
    }
    this.#status.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (button?.dataset.action === 'reload') location.reload();
      else if (button?.dataset.fragment) {
        this.#retry(this.#parts.get(/** @type {FragmentName} */ (button.dataset.fragment)));
      }
    });
    this.#showStatus();
    for (const part of this.#parts.values()) this.#retry(part);
  }

  /**
   * Фиксирует отказ только незавершённого фрагмента и показывает его явный повтор.
   * @param {Fragment|undefined} part Запись неудачной попытки; отсутствие и уже принятая ready-запись игнорируются.
   * @returns {void}
   */
  #fail(part) {
    if (!part || part.ready) return;
    part.loading = false;
    part.error = true;
    part.host.removeAttribute('aria-busy');
    this.#showStatus();
  }

  /**
   * Начинает одну попытку вставки и проверяет обязательный узел ответа до принятия готовности.
   * @param {Fragment|undefined} part Запись фрагмента, который ещё не готов и не загружается.
   * @returns {void} Запрос работает отдельно; любой отказ приводит к fail и не меняет готовые фрагменты.
   */
  #retry(part) {
    if (!part || part.ready || part.loading) return;
    part.loading = true;
    part.error = false;
    part.host.setAttribute('aria-busy', 'true');
    this.#showStatus();
    requestFragment(part.url, part.host).then(() => {
      if (!part.host.querySelector(part.selector)) throw new Error(`Missing fragment content: ${part.url}`);
      part.ready = true;
      part.loading = false;
      part.host.removeAttribute('aria-busy');
      part.host.dataset.fragmentReady = 'true';
      this.#showStatus();
      this.#startApplication();
    }).catch(() => this.#fail(part));
  }

  /**
   * Пересоздаёт только плашку загрузки: общий отказ предлагает reload, отказ отдельного фрагмента — retry.
   * @returns {void} Приложение и готовые host при этом не пересоздаются.
   */
  #showStatus() {
    const labels = this.#labels;
    if (!labels) return;
    const content = document.createDocumentFragment();
    if (this.#styleError || this.#applicationError) {
      const message = document.createElement('p');
      message.textContent = this.#styleError ? labels.stylesFailure : labels.applicationFailure;
      const reload = document.createElement('button');
      reload.type = 'button';
      reload.className = 'control primary';
      reload.dataset.action = 'reload';
      reload.textContent = labels.reload;
      message.append(reload);
      content.append(message);
    } else {
      const errors = [...this.#parts].filter(([, part]) => part.error);
      if (!errors.length) content.append(document.createTextNode(this.#started ? labels.starting : labels.loading));
      for (const [name, part] of errors) {
        const message = document.createElement('p');
        message.textContent = formatText(labels.fragmentFailure, { name });
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'control primary';
        retry.dataset.fragment = name;
        retry.textContent = labels.retry;
        retry.disabled = part.loading;
        message.append(retry);
        content.append(message);
      }
    }
    const link = document.createElement('a');
    link.href = 'https://github.com/Hxape';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = labels.github;
    content.append(link);
    this.#status.replaceChildren(content);
    this.#status.hidden = false;
  }

  /**
   * Импортирует main один раз, когда все фрагменты готовы и начальные CSS приняты.
   * @returns {void} Успех siteReady снимает плашку; отказ или 20 секунд ожидания скрывают каталог и показывают reload. Поздний успех остаётся допустим.
   */
  #startApplication() {
    if (this.#started || this.#styleError || !this.#labels || ![...this.#parts.values()].every((part) => part.ready)) {
      return;
    }
    this.#started = true;
    this.#showStatus();
    const catalog = this.#parts.get('catalog')?.host;
    catalog?.removeAttribute('hidden');
    const timeout = window.setTimeout(() => {
      // Таймер не отменяет import(): он показывает ошибку ожидания, а поздний ответ всё ещё может завершить запуск.
      console.error('Site startup timed out after 20 seconds:', mainUrl);
      this.#applicationError = true;
      catalog?.setAttribute('hidden', '');
      this.#showStatus();
    }, 20_000);
    import(mainUrl).then(({ siteReady }) => {
      if (typeof siteReady?.then !== 'function') throw new Error('Не подтверждена готовность сайта');
      return siteReady;
    }).then(() => {
      window.clearTimeout(timeout);
      this.#applicationError = false;
      catalog?.removeAttribute('hidden');
      this.#status.hidden = true;
      document.dispatchEvent(new CustomEvent('site:ready'));
    }).catch((error) => {
      console.error('Site startup failed:', error);
      window.clearTimeout(timeout);
      this.#applicationError = true;
      catalog?.setAttribute('hidden', '');
      this.#showStatus();
    });
  }
}

new PageFragments();
document.documentElement.dataset.bootstrapReady = 'true';
