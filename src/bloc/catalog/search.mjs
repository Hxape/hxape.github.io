/** Ведёт поиск по уже загруженным строкам каталога, независимо от поиска текущего файла. */
import { render, nothing } from 'lit';
import { SearchState } from '../../common/search/state.mjs';
import { loadScreen, screenReady, screenStatus } from '../../common/html/screen.mjs';
import { controlIcon } from '../../common/ui/icons.mjs';
import { formatText, ui } from '../../common/ui/text.mjs';
import { displayWindow, isHTMLElement } from '../../common/ui/view-utils.mjs';
import { renderSearch, renderSearchHistory, resetSearchHistory } from '../../component/search/index.mjs';

/** Один экземпляр поиска каталога; открытие узлов и логический выбор остаются у ProjectCatalog. */
export class CatalogSearch {
  /** @type {HTMLElement} Живой каталог, который может переноситься в PiP. */
  #root;
  /** @type {()=>HTMLElement[]} Готовые строки загруженного дерева, включая свёрнутые ветви. */
  #rows;
  /** @type {(row:HTMLElement|null)=>void} Выбор совпадения либо завершение раскрытия у владельца дерева. */
  #select;
  /** @type {SearchState} Отдельные запрос и история каталога. */
  #state;
  /** @type {HTMLElement} Собственная полоса; не контейнер поиска файла. */
  #bar;
  /** @type {HTMLDialogElement} История запросов этого экземпляра. */
  #dialog;
  /** @type {HTMLElement} Представление истории и черновика обмена JSON. */
  #history;
  /** @type {HTMLElement[]} Нынешние совпадающие строки в порядке дерева. */
  #matches = [];
  /** Индекс выбранной строки; -1 до явного перехода. */
  #current = -1;
  /** Индекс обхода сохранённых запросов; черновик сохраняется отдельно от истории. */
  #recall = -1;
  #draft = '';
  /** @type {string|null} Явно удалённый запрос не добавляется заново при закрытии. */
  #deleted = null;
  #open = false;
  #loading = false;
  #failed = false;
  /** @type {MutationObserver|null} Наблюдает только дерево, не собственную форму. */
  #observer = null;
  /** @type {ResizeObserver|null} Следит за доступной шириной дерева рядом с документом. */
  #layoutObserver = null;
  /** @type {MutationObserver|null} Открытие и ручная ширина панели меняют только расположение полосы. */
  #panelObserver = null;
  /** @type {HTMLElement|null} Строка выбора перед фокусом формы. */
  #focus = null;
  /** Срок событий нынешнего окна; снимается перед переносом. @type {AbortController|null} */
  #events = null;
  #resumeDialog = false;
  #historyOpen = false;

  /**
   * Создаёт отдельный поиск с прежними владельцами дерева и хранилища.
   * @param {HTMLElement} root Живой каталог.
   * @param {()=>HTMLElement[]} rows Только уже загруженные строки; вызов не делает запросов.
   * @param {(row:HTMLElement|null)=>void} select Выбор строки либо завершение раскрытия, без открытия документа.
   */
  constructor(root, rows, select) {
    this.#root = root;
    this.#rows = rows;
    this.#select = select;
    /** @type {Storage|null} */ let storage = null;
    try {
      storage = displayWindow(root).localStorage;
    } catch {}
    this.#state = new SearchState(storage, 'site-catalog-search-state');
    this.#bar = root.ownerDocument.createElement('div');
    this.#bar.className = 'catalog-search-bar';
    this.#bar.hidden = true;
    root.prepend(this.#bar);
    this.#dialog = root.ownerDocument.createElement('dialog');
    this.#dialog.className = 'navigation-popup surface';
    this.#dialog.setAttribute('aria-label', ui.navigation.catalogSearchHistory);
    this.#history = root.ownerDocument.createElement('div');
    this.#dialog.append(this.#history);
    root.append(this.#dialog);
  }

  /**
   * Перепривязывает события в фактическом окне после подключения или PiP.
   * @returns {void} Запрос и история экземпляра не меняются.
   */
  connect() {
    if (this.#events) return;
    const view = displayWindow(this.#root);
    this.#events = new view.AbortController();
    const signal = this.#events.signal;
    this.#root.addEventListener(
      'keydown',
      (event) => {
        if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
        if (
          event.key === 'Escape' &&
          (this.#dialog.open || (this.#open && isHTMLElement(event.target) && this.#bar.contains(event.target)))
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (this.#dialog.open) this.closeHistory();
          else this.close();
          return;
        }
        if (
          event.shiftKey ||
          event
            .composedPath()
            .some((node) => isHTMLElement(node) && node.matches('input,textarea,select,[contenteditable]'))
        )
          return;
        if (event.code === 'KeyF' || event.code === 'KeyM') {
          event.preventDefault();
          event.stopPropagation();
          this.show();
        }
      },
      { capture: true, signal },
    );
    this.#dialog.addEventListener(
      'cancel',
      (event) => {
        event.preventDefault();
        this.closeHistory();
      },
      { signal },
    );
    this.#dialog.addEventListener(
      'click',
      (event) => {
        if (event.target === this.#dialog) this.closeHistory();
      },
      { signal },
    );
    const tree = this.#root.querySelector(':scope > .tree-list');
    if (tree) {
      this.#observer = new view.MutationObserver(() => {
        if (this.#open) this.#refresh();
      });
      this.#observer.observe(tree, { childList: true, subtree: true, characterData: true });
    }
    const panel = this.#root.parentElement?.querySelector('#hxdoc');
    this.#layoutObserver = new view.ResizeObserver(() => this.#layout());
    this.#layoutObserver.observe(this.#root);
    if (panel) {
      this.#layoutObserver.observe(panel);
      this.#panelObserver = new view.MutationObserver(() => this.#layout());
      this.#panelObserver.observe(panel, { attributes: true, attributeFilter: ['open', 'style', 'class'] });
    }
    if (this.#open) this.#refresh();
    if (this.#resumeDialog) {
      this.#resumeDialog = false;
      this.showHistory();
    }
  }

  /**
   * Снимает наблюдение и native popup перед отсоединением или переносом.
   * @returns {void} Живые поля и постоянные запросы не уничтожаются.
   */
  pause() {
    this.#events?.abort();
    this.#events = null;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#layoutObserver?.disconnect();
    this.#layoutObserver = null;
    this.#panelObserver?.disconnect();
    this.#panelObserver = null;
    this.#resumeDialog = this.#dialog.open;
    if (this.#dialog.open) this.#dialog.close();
  }

  /** Открывает собственную полосу и фокусирует её ввод. @returns {void} */
  show() {
    const active = this.#root.ownerDocument.activeElement;
    if (!this.#open && isHTMLElement(active)) this.#focus = active;
    this.#open = true;
    this.#bar.hidden = false;
    this.#ensure(() => {
      if (!this.#open || !this.#events) return;
      this.#refresh();
      this.#bar.querySelector('input')?.focus({ preventScroll: true });
    });
  }

  /** Закрывает полосу, сохраняя завершённый запрос только в своей истории. @returns {void} */
  close() {
    if (this.#state.latest !== this.#deleted) this.#state.commit();
    const selected = this.#matches[this.#current];
    this.#matches.forEach((row) => row.classList.remove('catalog-search-current'));
    this.#open = false;
    this.#bar.hidden = true;
    this.#select(null);
    let focus = selected?.isConnected ? selected : this.#focus;
    while (focus && !focus.getBoundingClientRect().height) {
      let branch = focus.closest('details');
      if (branch?.querySelector(':scope > summary') === focus)
        branch = branch.parentElement?.closest('details') || null;
      focus = branch?.querySelector(':scope > summary') || null;
    }
    focus?.focus({ preventScroll: true });
  }

  /** Открывает отдельную историю каталога без изменения истории файла. @returns {void} */
  showHistory() {
    this.#historyOpen = true;
    this.#ensure(() => {
      if (!this.#historyOpen || !this.#events) return;
      this.#renderHistory();
      if (!this.#dialog.open) this.#dialog.showModal();
    });
  }

  /** Освобождает местный JSON-черновик и возвращает фокус своей полосе. @returns {void} */
  closeHistory() {
    this.#historyOpen = false;
    if (this.#dialog.open) this.#dialog.close();
    resetSearchHistory(this.#history);
    render(nothing, this.#history);
    if (this.#open) this.#bar.querySelector('input')?.focus({ preventScroll: true });
  }

  /**
   * Читает общий HTML только при открытии; отказ допускает явный повтор.
   * @param {()=>void} ready Действие этого владельца после готовности разметки.
   * @returns {void}
   */
  #ensure(ready) {
    if (screenReady('search')) {
      ready();
      return;
    }
    const target = this.#historyOpen ? this.#history : this.#bar;
    if (this.#historyOpen && !this.#dialog.open) this.#dialog.showModal();
    render(
      screenStatus(this.#failed, () => {
        this.#failed = false;
        this.#ensure(ready);
      }),
      target,
    );
    if (this.#loading) return;
    this.#loading = true;
    void loadScreen('search')
      .then(() => {
        if (!this.#events) return;
        if (this.#open) this.#refresh();
        if (this.#historyOpen) {
          this.#renderHistory();
          if (!this.#dialog.open) this.#dialog.showModal();
        }
        ready();
      })
      .catch(() => {
        this.#failed = true;
        if (this.#events)
          render(
            screenStatus(true, () => {
              this.#failed = false;
              this.#ensure(ready);
            }),
            target,
          );
      })
      .finally(() => {
        this.#loading = false;
      });
  }

  /** Пересчитывает только строки уже загруженного дерева, без сетевых запросов. */
  #refresh() {
    const selected = this.#matches[this.#current];
    this.#matches.forEach((row) => row.classList.remove('catalog-search-current'));
    const query = this.#state.latest.toLowerCase();
    this.#matches = query
      ? this.#rows().filter((row) => {
          const label = row.querySelector('.node-label')?.textContent || row.textContent || '';
          return label.toLowerCase().includes(query);
        })
      : [];
    this.#current = selected ? this.#matches.indexOf(selected) : -1;
    if (selected && this.#current < 0) this.#select(null);
    this.#matches[this.#current]?.classList.add('catalog-search-current');
    this.#render();
  }

  /**
   * Выбирает соседнюю строку по кругу и передаёт раскрытие владельцу дерева.
   * @param {-1|1} direction Направление перехода.
   */
  #step(direction) {
    this.#state.commit();
    if (!this.#matches.length) return;
    this.#matches[this.#current]?.classList.remove('catalog-search-current');
    this.#current =
      this.#current < 0
        ? direction === 1
          ? 0
          : this.#matches.length - 1
        : (this.#current + direction + this.#matches.length) % this.#matches.length;
    const row = this.#matches[this.#current];
    row.classList.add('catalog-search-current');
    this.#select(row);
    this.#render();
  }

  /**
   * Обходит MRU с возвращением к прежнему черновику.
   * @param {-1|1} direction Предыдущий либо следующий запрос.
   */
  #historyStep(direction) {
    if (!this.#state.queries.length) return;
    if (this.#recall < 0) this.#draft = this.#state.latest;
    this.#recall = Math.max(-1, Math.min(this.#state.queries.length - 1, this.#recall - direction));
    this.#state.setLatest(this.#recall < 0 ? this.#draft : this.#state.queries[this.#recall]);
    this.#current = -1;
    this.#select(null);
    this.#refresh();
  }

  /** Передаёт общее представление поиска только готовые значения и действия каталога. */
  #render() {
    if (!this.#open || !screenReady('search')) return;
    this.#layout();
    renderSearch(
      this.#bar,
      {
        id: 'catalog-search-input',
        showSelection: false,
        embedded: true,
        query: this.#state.latest,
        current: this.#current + 1,
        total: this.#matches.length,
        collecting: this.#state.collecting,
        selectionOnly: false,
        canSelection: false,
        labels: {
          label: ui.navigation.catalogSearch,
          placeholder: ui.navigation.searchPlaceholder,
          previous: ui.navigation.searchPrevious,
          next: ui.navigation.searchNext,
          clear: ui.navigation.searchClear,
          count: formatText(ui.navigation.searchCount, { current: this.#current + 1, total: this.#matches.length }),
          selection: ui.navigation.searchSelection,
          collecting: this.#state.collecting ? ui.navigation.searchCollectingOn : ui.navigation.searchCollectingOff,
          close: ui.navigation.close,
          history: ui.navigation.catalogSearchHistory,
        },
        icons: {
          previous: controlIcon('search-previous'),
          next: controlIcon('search-next'),
          clear: controlIcon('search-clear'),
          selection: controlIcon('search-selection'),
          collecting: controlIcon(this.#state.collecting ? 'search-collect-on' : 'search-collect-off'),
          close: controlIcon('close'),
          history: controlIcon('history'),
        },
      },
      {
        input: (query) => {
          this.#deleted = null;
          this.#recall = -1;
          this.#state.setLatest(query);
          this.#current = -1;
          this.#select(null);
          this.#refresh();
        },
        recall: (direction) => this.#historyStep(direction),
        submit: () => this.#step(1),
        previous: () => this.#step(-1),
        next: () => this.#step(1),
        clear: () => {
          this.#deleted = this.#state.latest;
          this.#state.remove(this.#state.latest);
          this.#state.setLatest('');
          this.#recall = -1;
          this.#current = -1;
          this.#select(null);
          this.#refresh();
        },
        toggleSelection: () => {},
        toggleCollecting: () => {
          this.#state.setCollecting(!this.#state.collecting);
          this.#render();
        },
        close: () => this.close(),
        history: () => this.showHistory(),
      },
    );
  }

  /** Полоса занимает только видимую часть дерева и не перекрывает соседний документ. */
  #layout() {
    if (!this.#open) return;
    const view = displayWindow(this.#root);
    const box = this.#root.getBoundingClientRect();
    const style = view.getComputedStyle(this.#root);
    const left = box.left + parseFloat(style.paddingLeft);
    const right = box.right - parseFloat(style.paddingRight);
    const panel = this.#root.parentElement?.querySelector('#hxdoc[open]');
    const end = panel && !panel.matches(':modal') ? Math.min(right, panel.getBoundingClientRect().left - 4) : right;
    const width = `${Math.max(0, end - left)}px`;
    if (this.#bar.style.width !== width) this.#bar.style.width = width;
  }

  /** Показывает строки и обмен JSON только своей истории. */
  #renderHistory() {
    renderSearchHistory(
      this.#history,
      {
        queries: this.#state.queries,
        current: this.#state.latest,
        labels: {
          title: ui.navigation.catalogSearchHistory,
          empty: ui.navigation.searchHistoryEmpty,
          remove: ui.navigation.searchHistoryRemove,
          close: ui.navigation.close,
          message: this.#state.failure ? ui.navigation.storageFailed : '',
          retry: ui.navigation.retryStorage,
        },
        icons: { remove: controlIcon('trash'), close: controlIcon('close') },
      },
      {
        select: (query) => {
          this.#state.setLatest(query);
          this.#recall = -1;
          this.#current = -1;
          this.#select(null);
          this.closeHistory();
          this.show();
        },
        remove: (query) => {
          if (query === this.#state.latest) this.#deleted = query;
          this.#state.remove(query);
          this.#renderHistory();
        },
        close: () => this.closeHistory(),
        retry: () => {
          this.#state.retryStorage();
          this.#renderHistory();
        },
        exportData: () => this.#state.exportData(),
        importData: (value) => this.#state.importData(value),
        refresh: () => {
          this.#recall = -1;
          this.#renderHistory();
        },
      },
    );
  }
}
