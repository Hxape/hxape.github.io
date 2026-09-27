/** Символьное ожидание дерева; состояние запроса остаётся у каталога. */
export class TreeLoader extends HTMLElement {
  /** Наблюдает только доступную подпись; список постоянен для класса индикатора. */
  static observedAttributes = ['label'];

  /**
   * Создаёт открытый Shadow DOM одного индикатора; запросом каталога он не владеет.
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  /**
   * При подключении обновляет доступную подпись и возобновляет символьные кадры.
   * @returns {void} Перестраивает только локальное отображение индикатора.
   */
  connectedCallback() {
    this.#label();
    this.restart();
  }

  /**
   * Отражает изменение наблюдаемого атрибута label в доступном имени.
   * @returns {void} Назначает или снимает role=img и aria-label по нынешнему label.
   */
  attributeChangedCallback() {
    this.#label();
  }

  /**
   * Согласует доступное имя индикатора с его атрибутом label.
   * @returns {void} Без непустого label снимает имя и роль; состояние сетевого запроса не проверяется.
   */
  #label() {
    const label = this.getAttribute('label');
    if (label) {
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', label);
    } else {
      this.removeAttribute('role');
      this.removeAttribute('aria-label');
    }
  }

  /**
   * Пересоздаёт CSS-кадры после отмены анимации, в том числе при откате PiP.
   * @returns {void} Обновляет стили и четыре символа в прежнем Shadow DOM; без shadowRoot ничего не меняет.
   */
  restart() {
    const root = this.shadowRoot;
    if (!root) return;
    const style = this.ownerDocument.createElement('style');
    style.textContent = `
      :host { display: inline-grid; width: 1ch; font: inherit; }
      span { grid-area: 1 / 1; opacity: 0; animation: frame 1s steps(1, end) infinite; }
      span:nth-child(3) { animation-delay: .25s; }
      span:nth-child(4) { animation-delay: .5s; }
      span:nth-child(5) { animation-delay: .75s; }
      @keyframes frame { 0% { opacity: 1; } 25%, 100% { opacity: 0; } }
      @media (prefers-reduced-motion: reduce) {
        span { animation: none; }
        span:nth-child(2) { opacity: 1; }
      }
    `;
    const frames = ['|', '/', '–', '\\'].map((symbol) => {
      const frame = this.ownerDocument.createElement('span');
      frame.textContent = symbol;
      frame.setAttribute('aria-hidden', 'true');
      return frame;
    });
    root.replaceChildren(style, ...frames);
  }
}

customElements.define('tree-loader', TreeLoader);
