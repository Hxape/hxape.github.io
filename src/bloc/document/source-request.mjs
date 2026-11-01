/** Ведёт один запрос исходника и его ленивый интерфейс в пределах просмотра панели. */
import sourceLimits from '../../common/network/json/source-limits.json' with { type: 'json' };
import { ui } from '../../common/ui/text.mjs';
import { displayWindow } from '../../common/ui/view-utils.mjs';

/**
 * Успешный raw текущего просмотра; не является постоянной записью журнала.
 * @typedef {import('./index.mjs').SourceResult} SourceResult
 */
/**
 * Одна попытка ленивого отображения исходника, которую панель принимает только при том же поколении.
 * @typedef {Object} SourceAttempt
 * @property {number} revision Поколение, проверяемое current перед изменением текущего режима/footer.
 * @property {Promise<SourceResult|null>} promise Успешный текст/ref либо null при отмене или уже показанном отказе.
 */

/**
 * Сохранённый настройками срок полосы строки; null означает не гасить, а 0 не показывает её.
 * @typedef {import('../preferences/index.mjs').SourceHighlightDuration} SourceHighlightDuration
 */
/**
 * Только native таймер нынешнего окна; не содержит адреса, текста или места чтения.
 * @typedef {Object} SourceHighlightTimer
 * @property {import('../../common/ui/view-utils.mjs').DisplayWindow} view Окно, выдавшее id; отмена выполняется в этом же окне.
 * @property {number} id Native id срока снятия полосы.
 */
/**
 * Прежний визуальный выбор до pointer preview; существует только до commit/cancel того же жеста.
 * @typedef {Object} SourceHighlightPreview
 * @property {number|null} line Прежний семантический номер gutter; null до первого выбора строки.
 * @property {boolean} visible Полоса была ещё видимой до preview; перенос не воскрешает false.
 * @property {number|null} deadline Конечный Unix-срок прежней полосы в миллисекундах; null при бесконечном сроке либо погашенном выборе.
 */

/** Один текущий запрос исходника; открытый просмотр и история остаются у DocumentPanel. */
export class SourceRequest {
  /**
   * Прежняя область исходника единственной панели; сохраняется при переносе.
   * @type {HTMLElement}
   */
  #host;
  /**
   * Импортированное представление между чтениями; стили и статическая оболочка имеют отдельную проверку готовности.
   * @type {typeof import('./source-view.mjs')|null}
   */
  #module = null;
  /**
   * Отмена одной нынешней попытки чтения файла; null после завершения, clear или stop.
   * @type {AbortController|null}
   */
  #abort = null;
  /**
   * Поколение попытки; старый ответ не изменяет нынешний host после clear или stop.
   */
  #revision = 0;
  /**
   * Текст нынешней попытки успешно показан; stop сохраняет это содержимое при переносе.
   */
  #ready = false;
  /**
   * Нынешняя попытка завершилась отказом оболочки, импорта или чтения; clear снимает отказ.
   */
  #failed = false;
  /**
   * Одно native ожидание снятия визуальной полосы; снимается новым выбором, clear и переносом.
   * @type {SourceHighlightTimer|null}
   */
  #highlightTimer = null;
  /** Поколение визуального срока; поздний таймер не гасит более новый выбор строки. */
  #highlightRevision = 0;
  /** Нынешняя полоса разрешена владельцем; не является номером строки, адресом или состоянием закладки. */
  #highlightVisible = false;
  /**
   * Абсолютный срок оставшегося показа при PiP/rollback; null не создаёт timer у бесконечного выбора.
   * @type {number|null}
   */
  #highlightDeadline = null;
  /**
   * Прежний выбор до preview для отмены/переноса; постоянный журнал этого состояния не получает.
   * @type {SourceHighlightPreview|null}
   */
  #highlightPreview = null;

  /**
   * Создаёт одну операцию исходника для прежней области панели.
   * @param {HTMLElement} host Область единственного исходника, куда лениво вставляется статическая оболочка.
   */
  constructor(host) {
    this.#host = host;
  }

  /**
   * Предоставляет готовность реально показанного текста текущей попытки.
   * @returns {boolean} true только после успешного showSourceText.
   */
  get ready() {
    return this.#ready;
  }
  /**
   * Предоставляет отказ нынешней попытки для кнопки повтора панели.
   * @returns {boolean} true после отказа импорта, оболочки или чтения; новая попытка сбрасывает флаг.
   */
  get failed() {
    return this.#failed;
  }

  /**
   * Готовит статическую оболочку до raw-чтения без отмены нынешнего файла.
   * @param {Document} owner Документ нынешнего host; перенос делает подготовку недействительной.
   * @param {AbortSignal} signal Отмена перехода панели; общий запрос статических стилей или HTML не отзывает.
   * @param {Document} [returnDocument] Исходный документ возврата; его CSS должен быть готов до принятия raw в другом окне.
   * @returns {Promise<void>} Обещание готовых CSS обоих документов и безопасно подготовленного скрытого/прежнего host; видимый отказ без оболочки сохраняется.
   * @throws {Error} Отмена, смена документа или отказ статического ресурса не принимают новый материал.
   */
  async prepareShell(owner, signal, returnDocument = owner) {
    /**
     * Отвергает подготовку, которая уже отменена или принадлежала прежнему документу.
     * @returns {void} При действующем owner ничего не меняет; иначе бросает отмену до принятия материала.
     */
    const check = () => {
      if (signal.aborted) throw signal.reason ?? new DOMException('Source preparation cancelled.', 'AbortError');
      if (this.#host.ownerDocument !== owner) throw new DOMException('Source display changed.', 'AbortError');
    };
    check();
    const source = await import('./source-view.mjs');
    check();
    this.#module = source;
    if (returnDocument !== owner) {
      await source.ensureSourceStyle(returnDocument);
      check();
    }
    await source.ensureSourceStyle(owner);
    check();
    // Скрытая область DOC безопасна для первой оболочки; готовый code не пересоздаётся.
    // Видимый отказ без оболочки сохраняется до принятия нового материала.
    if (this.#host.hidden || this.#host.querySelector('[data-source-code]')) {
      await source.ensureSourceShell(this.#host);
      check();
    }
  }

  /**
   * Предоставляет число строк нынешнего показанного frame.
   * @returns {number} Положительное целое число либо 0 до готовности оболочки/счётчика.
   */
  get lineCount() {
    return this.#module?.sourceLineCount(this.#host) || 0;
  }

  /**
   * Определяет строку нажатия только для успешно показанного текста.
   * @param {number} clientY Координата указателя в фактическом окне исходника.
   * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Окно отображения для геометрии и проверки realm.
   * @returns {number|null} Допустимый номер строки либо null без готового текста или вне колонки.
   */
  lineAt(clientY, view) {
    return this.#ready ? this.#module?.sourceLineAt(this.#host, clientY, view) || null : null;
  }

  /**
   * Передаёт готовые номера закладок и знак общему представлению.
   * @param {ReadonlyArray<number>} lines Номера адресов, уже сопоставленные панелью с нынешними файлом и ref.
   * @param {import('lit').TemplateResult} icon Знак добавленной закладки.
   * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Фактическое окно отображения исходника.
   * @param {(line:number)=>string} label Готовая доступная подпись метки, не содержащая текста файла.
   * @returns {void} Обновляет отдельный слой меток только при ready; журнал здесь не читается.
   */
  showBookmarks(lines, icon, view, label) {
    if (this.#ready) this.#module?.showSourceBookmarks(this.#host, lines, icon, view, label);
  }

  /**
   * Пересчитывает только полосу прежнего номера после изменения высоты строк.
   * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Окно применённого шрифта нынешнего host.
   * @returns {void} При ready обновляет top/height без scroll, deadline, видимости или чтения; отсутствие номера оставляет обычный файл без полосы.
   */
  refreshGeometry(view) {
    const line = this.#selectedLine();
    if (this.#ready && this.#module && line !== null && this.#host.ownerDocument.defaultView === view) {
      this.#module.selectSourceLine(this.#host, line, view);
    }
  }

  /**
   * Снимает позицию при переходе к тому же готовому файлу без адреса строки, сохраняя его Text и frame.
   * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Нынешнее окно готового исходника.
   * @returns {void} Отменяет только визуальный срок и семантический номер; текст, оболочка и счётчик строк не пересоздаются.
   */
  clearSelection(view) {
    this.#stopHighlightTimer();
    this.#highlightPreview = null;
    this.#highlightVisible = false;
    this.#highlightDeadline = null;
    this.#module?.selectSourceLine(this.#host, null, view);
    this.#module?.showSourceHighlight(this.#host, false);
  }

  /**
   * Передаёт прокрутку строки представлению и запускает только её визуальный срок.
   * @param {HTMLElement} body Общая прокручиваемая область чтения панели.
   * @param {number} line Запрошенная строка начиная с 1.
   * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Фактическое окно измерения строки.
   * @param {SourceHighlightDuration} [duration] Задержка до снятия фона; null без timer, 0 без видимой полосы.
   * @param {boolean} [preview] Pointer preview сохраняет фон без expiry до commit/cancel, независимо от выбранного срока.
   * @returns {void} Для ready выбирает и прокручивает строку; stale expiry не меняет новый выбор, target или reading. Без текста ничего не делает.
   */
  scrollLine(body, line, view, duration = 3000, preview = false) {
    if (!this.#ready || !this.#module) return;
    if (preview && !this.#highlightPreview) {
      this.#highlightPreview = {
        line: this.#selectedLine(),
        visible: this.#highlightVisible,
        deadline: this.#highlightDeadline,
      };
    }
    this.#module.scrollSourceLine(body, this.#host, line, view);
    if (preview) {
      this.#stopHighlightTimer();
      this.#highlightVisible = true;
      this.#highlightDeadline = null;
      this.#module.showSourceHighlight(this.#host, true);
    } else this.refreshHighlight(duration, view);
  }

  /**
   * Перезапускает срок нынешней выбранной строки после commit, удаления метки или явного изменения настройки.
   * @param {SourceHighlightDuration} duration Принятый срок Preferences; 0/null сохраняются как самостоятельные значения.
   * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Нынешнее окно native таймера.
   * @returns {void} Меняет только полосу; без ready/выбранной строки не создаёт подсветку первой строки или timer.
   */
  refreshHighlight(duration, view) {
    if (!this.#ready || !this.#selectedLine()) return;
    this.#highlightPreview = null;
    this.#highlightVisible = duration !== 0;
    this.#highlightDeadline = duration === null ? null : view.Date.now() + duration;
    this.resumeHighlight(view);
  }

  /**
   * Возвращает прежний семантический выбор и визуальный срок после отмены preview при переносе.
   * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Фактическое окно прежнего host до или после переноса.
   * @param {boolean} [schedule] false восстанавливает только состояние перед pause, не создавая timer старого окна.
   * @returns {void} Восстанавливает номер без прокрутки/публикации адреса; уже погашенный до preview фон остаётся погашенным.
   */
  cancelPreview(view, schedule = true) {
    const preview = this.#highlightPreview;
    if (!preview || !this.#module) return;
    this.#highlightPreview = null;
    this.#module.selectSourceLine(this.#host, preview.line, view);
    this.#highlightVisible = preview.visible;
    this.#highlightDeadline = preview.deadline;
    this.resumeHighlight(view, schedule);
  }

  /**
   * Продолжает остаток того же визуального срока в actual window после PiP/rollback.
   * @param {import('../../common/ui/view-utils.mjs').DisplayWindow} view Окно нынешнего ownerDocument для native timer и clock.
   * @param {boolean} [schedule] false только применяет остаток до переноса; true связывает ожидание с этим окном.
   * @returns {void} Истёкший/погашенный выбор остаётся скрытым, бесконечный не получает timer; номер gutter и reading не меняются.
   */
  resumeHighlight(view, schedule = true) {
    this.#stopHighlightTimer();
    if (!this.#ready || !this.#module || this.#host.ownerDocument.defaultView !== view) return;
    const remaining = this.#highlightDeadline === null ? null : this.#highlightDeadline - view.Date.now();
    if (!this.#highlightVisible || remaining !== null && remaining <= 0) {
      this.#highlightVisible = false;
      this.#highlightDeadline = null;
      this.#module.showSourceHighlight(this.#host, false);
      return;
    }
    this.#module.showSourceHighlight(this.#host, true);
    if (remaining === null || !schedule) return;
    const revision = this.#highlightRevision;
    const id = view.setTimeout(() => {
      if (
        revision !== this.#highlightRevision || !this.#ready || this.#highlightPreview
        || this.#host.ownerDocument.defaultView !== view
      ) return;
      this.#highlightTimer = null;
      this.#highlightVisible = false;
      this.#highlightDeadline = null;
      this.#module?.showSourceHighlight(this.#host, false, true);
    }, remaining);
    this.#highlightTimer = { view, id };
  }

  /**
   * Читает только семантический номер gutter нынешнего ready frame.
   * @returns {number|null} Положительный целый номер либо null без выбранной строки; погашенный фон этот номер не снимает.
   */
  #selectedLine() {
    const line = Number(this.#host.querySelector('[data-source-gutter]')?.getAttribute('data-selected-line'));
    return Number.isSafeInteger(line) && line > 0 ? line : null;
  }

  /**
   * Снимает один native таймер через создавшее его окно и отвергает поздний callback.
   * @returns {void} Визуальный выбор и deadline остаются у прежнего owner для допустимого переноса.
   */
  #stopHighlightTimer() {
    ++this.#highlightRevision;
    if (this.#highlightTimer) this.#highlightTimer.view.clearTimeout(this.#highlightTimer.id);
    this.#highlightTimer = null;
  }

  /**
   * Проверяет поколение завершённой попытки перед принятием её результата панелью.
   * @param {number} revision Номер попытки, ранее выданный start.
   * @returns {boolean} true при том же поколении; false после clear, stop или нового start.
   */
  current(revision) {
    return this.#revision === revision;
  }

  /**
   * Отменяет нынешнее чтение и удаляет показанный текст при смене материала.
   * @returns {void} Увеличивает поколения чтения/полосы, снимает timer и preview, скрывает host и сбрасывает ready/failed; модуль и оболочка могут использоваться повторно.
   */
  clear() {
    this.#stopHighlightTimer();
    this.#highlightVisible = false;
    this.#highlightDeadline = null;
    this.#highlightPreview = null;
    ++this.#revision;
    this.#abort?.abort();
    this.#abort = null;
    this.#ready = false;
    this.#failed = false;
    this.#module?.clearSourceView(this.#host);
    this.#host.hidden = true;
  }

  /**
   * Снимает сроки прежнего окна и незавершённое чтение при временном переносе.
   * @returns {void} Готовый текст и остаток визуального срока остаются у owner; preview отменён, поздние callbacks отвергаются. resumeHighlight связывает остаток с новым окном.
   */
  stop() {
    this.cancelPreview(displayWindow(this.#host), false);
    this.#stopHighlightTimer();
    if (!this.#abort || this.#ready) return;
    ++this.#revision;
    this.#abort.abort();
    this.#abort = null;
  }

  /**
   * Синхронно возвращает готовый исходник только в документ с уже подготовленным CSS.
   * @param {Document} owner Документ, куда перенесён прежний host.
   * @returns {void} Без ready ничего не меняет; сохраняет Text, frame, deadline и место чтения без скрытия на время Promise.
   * @throws {Error} Другой owner либо неготовый CSS отвергают resume до commit; сеть и чтение текста не запускаются.
   */
  restoreStyle(owner) {
    if (!this.#module || !this.#ready) return;
    if (this.#host.ownerDocument !== owner) throw new Error('The source display belongs to another document');
    this.#module.requirePreparedSourceStyle(owner);
    this.#host.hidden = false;
  }

  /**
   * Создаёт новую попытку чтения в единственном host и возвращает её поколение.
   * @param {(signal:AbortSignal)=>Promise<{content:string,ref:string}>} load Подготовленный владельцем доступа загрузчик, принимающий сигнал отмены этой попытки.
   * @param {boolean} library Нужно ли пояснение отличия от установленной библиотеки.
   * @param {string} [version] Показываемая версия установки для приписки библиотеки.
   * @param {Document} [returnDocument] Неподвижный документ возврата панели; CSS готовится до ready также при первом raw внутри PiP.
   * @returns {SourceAttempt} Номер попытки и Promise успешного content/ref после CSS обоих документов либо null при отмене или отображённом отказе.
   */
  start(load, library, version = '', returnDocument = this.#host.ownerDocument) {
    this.clear();
    this.#host.hidden = false;
    const controller = new AbortController();
    this.#abort = controller;
    // Ответы прежнего запроса после clear/stop не имеют права менять этот host.
    const revision = ++this.#revision;
    return { revision, promise: this.#run(load, library, version, revision, controller, returnDocument) };
  }

  /**
   * Проверяет право одной попытки изменять нынешний host.
   * @param {number} revision Поколение выполняемой попытки.
   * @param {AbortController} controller Отмена этой попытки, не слушателей панели.
   * @param {Document} owner Документ host, захваченный до первого await попытки.
   * @returns {boolean} true только при том же поколении, неотменённом сигнале и неизменённом владельце host.
   */
  #current(revision, controller, owner) {
    return this.#revision === revision && !controller.signal.aborted && this.#host.ownerDocument === owner;
  }

  /**
   * Показывает локальный отказ, когда модуль представления не удалось импортировать.
   * @returns {void} Заменяет host одним абзацем role=alert без текстов файла.
   */
  #showImportFailure() {
    this.#host.replaceChildren();
    const message = this.#host.ownerDocument.createElement('p');
    message.className = 'source-state';
    message.setAttribute('role', 'alert');
    message.textContent = ui.sourceViewer.viewerFailed;
    this.#host.append(message);
  }

  /**
   * Последовательно готовит интерфейс, читает файл и принимает только действующую попытку.
   * @param {(signal:AbortSignal)=>Promise<{content:string,ref:string}>} load Загрузчик разрешённого файла с отменой владельца доступа.
   * @param {boolean} library Выбирает подпись библиотеки вместо обычной ветки.
   * @param {string} version Версия установки для приписки библиотеки.
   * @param {number} revision Поколение, полученное в start.
   * @param {AbortController} controller Сигнал одной выполняемой попытки.
   * @param {Document} returnDocument Исходный документ возврата, чей CSS готовится ещё до приёма raw.
   * @returns {Promise<{content:string,ref:string}|null>} Успешные content/ref только после CSS текущего и исходного документов; отмена не меняет DOM, отказ показывает повторяемое сообщение.
   */
  async #run(load, library, version, revision, controller, returnDocument) {
    const owner = this.#host.ownerDocument;
    try {
      const source = await import('./source-view.mjs');
      if (!this.#current(revision, controller, owner)) return null;
      this.#module = source;
      if (returnDocument !== owner) {
        await source.ensureSourceStyle(returnDocument);
        if (!this.#current(revision, controller, owner)) return null;
      }
      await source.ensureSourceShell(this.#host);
      if (!this.#current(revision, controller, owner)) return null;
      source.showSourceLoading(this.#host);
      const result = await load(controller.signal);
      if (!this.#current(revision, controller, owner)) return null;
      if (
        typeof result?.content !== 'string' || typeof result.ref !== 'string'
        || result.content.length > sourceLimits.maxSourceBytes
      ) {
        throw new Error('Invalid source file.');
      }
      source.showSourceText(this.#host, result, library, version);
      this.#ready = true;
      this.#failed = false;
      this.#abort = null;
      return result;
    } catch (error) {
      if (!this.#current(revision, controller, owner)) return null;
      this.#failed = true;
      this.#abort = null;
      if (!this.#module) this.#showImportFailure();
      else if (this.#host.querySelector('[data-source-code]')) this.#module.showSourceFailure(this.#host, error);
      else this.#module.showShellFailure(this.#host);
      return null;
    }
  }
}
