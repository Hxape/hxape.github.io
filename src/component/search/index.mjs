/** Показывает готовый поисковый запрос, счётчик и действия; совпадения и подсветка остаются у владельца просмотра. */
import { render } from 'lit';
import { screenTemplate } from '../../common/html/screen.mjs';
export { renderSearchHistory, resetSearchHistory } from './history.mjs';

/**
 * Подписи одной формы поиска в нынешнем материале.
 * @typedef {object} SearchLabels
 * @property {string} label Доступное имя поля запроса.
 * @property {string} placeholder Подсказка пустого поля.
 * @property {string} previous Предыдущее совпадение.
 * @property {string} next Следующее совпадение.
 * @property {string} clear Очистка запроса и его записи в истории.
 * @property {string} count Готовая доступная подпись нынешнего номера и общего числа.
 * @property {string} selection Подпись готового действия поиска в выделении либо во всём материале.
 * @property {string} collecting Подпись нынешнего режима сбора запросов и действия его переключения.
 * @property {string} close Закрытие формы с фиксацией завершённого запроса у владельца.
 * @property {string} history Открытие истории этого экземпляра поиска.
 */
/**
 * Принятые знаки действий формы; лупа принадлежит CSS семантического поля поиска.
 * @typedef {object} SearchIcons
 * @property {import('lit').TemplateResult} previous Знак перехода к предыдущему совпадению.
 * @property {import('lit').TemplateResult} next Знак перехода к следующему совпадению.
 * @property {import('lit').TemplateResult} clear Знак очистки поля и удаления именно этого запроса из истории.
 * @property {import('lit').TemplateResult} selection Готовый знак поиска в выделении файла.
 * @property {import('lit').TemplateResult} collecting Знак нынешнего режима сбора запросов.
 * @property {import('lit').TemplateResult} close Знак закрытия формы.
 * @property {import('lit').TemplateResult} history Знак истории запросов этой области.
 */
/**
 * Готовое состояние от владельца поиска; компонент не вычисляет и не сохраняет запрос или совпадения.
 * @typedef {object} SearchModel
 * @property {string} [id] Уникальное имя поля при нескольких экземплярах.
 * @property {boolean} [showSelection] false скрывает действие выделения у поиска каталога.
 * @property {string} query Нынешний запрос, который отражается в input.
 * @property {number} current Номер выбранного совпадения от 1; 0 при отсутствии.
 * @property {number} total Число совпадений нынешнего материала.
 * @property {boolean} embedded Форма показана полосой внутри готового документа; false означает прежний popup.
 * @property {boolean} collecting Владелец разрешает сбор завершённых запросов; не влияет на поле latest.
 * @property {boolean} selectionOnly Поиск ограничен подготовленными границами выделения нынешнего материала.
 * @property {boolean} canSelection Владелец разрешает действие изменения области поиска.
 * @property {SearchLabels} labels Подписи поля, счётчика и действий.
 * @property {SearchIcons} icons Подготовленные знаки действий.
 */
/**
 * Действия владельца поиска; форма не выбирает срок хранения или область native Range.
 * @typedef {object} SearchActions
 * @property {(query:string)=>void} input Принимает полный запрос из поля, включая собственную очистку браузера.
 * @property {(direction:-1|1)=>void} recall Выбирает прежний запрос вверх либо вниз; текущий черновик и MRU принадлежат владельцу.
 * @property {()=>void} submit Фиксирует завершённый запрос по Enter и выполняет согласованный переход к совпадению.
 * @property {()=>void} previous Выбирает предыдущее совпадение нынешнего материала.
 * @property {()=>void} next Выбирает следующее совпадение нынешнего материала.
 * @property {()=>void} clear Очищает latest и удаляет прежний непустой запрос из истории через владельца.
 * @property {()=>void} toggleSelection Меняет область поиска по подготовленным границам без чтения Selection внутри формы.
 * @property {()=>void} toggleCollecting Меняет сбор завершённых запросов, сохраняя накопленные записи.
 * @property {()=>void} close Закрывает форму; срок запроса и его фиксация остаются у Panel.
 * @property {()=>void} history Открывает историю этого экземпляра.
 */

/**
 * Согласует форму с готовым состоянием, сохраняя прежний input при повторном render.
 * @param {HTMLElement} container Область готовой встроенной полосы либо временной панели поиска.
 * @param {SearchModel} model Нынешние запрос, номер, число и готовые подписи.
 * @param {SearchActions} actions Действия владельца запроса и подсветки.
 * @returns {HTMLInputElement} Поле для немедленного фокуса после открытия панели.
 * @throws {Error} Если после вставки отсутствует обязательный input.
 */
export function renderSearch(container, model, actions) {
  /**
   * Передаёт новое значение поля без локального нормализования запроса.
   * @param {Event} event Событие input только созданного поля.
   * @returns {void} Передаёт query владельцу; компонент не нормализует его.
   */
  const inputChanged = (event) => actions.input(/** @type {HTMLInputElement} */ (event.currentTarget).value);
  /**
   * Передаёт стрелки поля истории запросов; обычный ввод и изменённые модификаторами команды пропускаются.
   * @param {KeyboardEvent} event Клавиша поискового input.
   * @returns {void} Стрелки выбирают прежние запросы; Shift+Enter выбирает предыдущее совпадение.
   */
  const keyPressed = (event) => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      event.stopPropagation();
      actions.recall(event.key === 'ArrowUp' ? -1 : 1);
    } else if (event.key === 'Enter' && event.shiftKey && model.total) {
      event.preventDefault();
      event.stopPropagation();
      actions.previous();
    }
  };
  /**
   * Не допускает перехода формы по URL; Enter передаёт завершённый запрос владельцу даже без совпадений.
   * @param {SubmitEvent} event Отправка семантической формы поиска.
   * @returns {void} Фиксацию истории и переход выполняет один prepared submit.
   */
  const submitted = (event) => {
    event.preventDefault();
    actions.submit();
  };
  /**
   * Передаёт стрелки сфокусированных кнопок переходам по совпадениям.
   * @param {KeyboardEvent} event Клавиша внутри меню действий формы.
   * @returns {void} При отсутствии результата и модификаторах сохраняет нативное действие кнопки.
   */
  const actionKey = (event) => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !model.total) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'ArrowUp') actions.previous();
    else actions.next();
  };
  /**
   * Просит очистить запрос и возвращает ввод полю, как собственное действие очистки браузера.
   * @returns {void} Запрос и результаты меняет только actions.clear.
   */
  const cleared = () => {
    actions.clear();
    container.querySelector('input')?.focus({ preventScroll: true });
  };
  render(
    screenTemplate('search', 'search.form', {
      id: model.id || 'navigation-search-input',
      selectionHidden: model.showSelection === false,
      historyLabel: model.labels.history,
      historyIcon: model.icons.history,
      onHistory: actions.history,
      class: `navigation-search${model.embedded ? ' is-embedded' : ''}`,
      onSubmit: submitted,
      label: model.labels.label,
      query: model.query,
      placeholder: model.labels.placeholder,
      onInput: inputChanged,
      onKeydown: keyPressed,
      clearLabel: model.labels.clear,
      clearDisabled: !model.query,
      onClear: cleared,
      clearIcon: model.icons.clear,
      countLabel: model.labels.count,
      current: model.current,
      total: model.total,
      onActionKeydown: actionKey,
      previousLabel: model.labels.previous,
      noMatches: !model.total,
      onPrevious: actions.previous,
      previousIcon: model.icons.previous,
      nextLabel: model.labels.next,
      onNext: actions.next,
      nextIcon: model.icons.next,
      selectionLabel: model.labels.selection,
      selectionPressed: String(model.selectionOnly),
      selectionDisabled: !model.canSelection,
      onToggleSelection: actions.toggleSelection,
      selectionIcon: model.icons.selection,
      collectingLabel: model.labels.collecting,
      collectingPressed: String(model.collecting),
      onToggleCollecting: actions.toggleCollecting,
      collectingIcon: model.icons.collecting,
      closeLabel: model.labels.close,
      onClose: actions.close,
      closeIcon: model.icons.close,
    }),
    container,
  );
  const input = container.querySelector('input');
  if (!input) throw new Error('Search input is missing');
  return input;
}
