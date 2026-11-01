/** Показывает историю одного поиска и местную форму её обмена JSON; строки хранит владелец. */
import { nothing, render } from 'lit';
import { controlIcon } from '../../common/ui/icons.mjs';
import { ui } from '../../common/ui/text.mjs';
import { displayWindow } from '../../common/ui/view-utils.mjs';
import { screenTemplate } from '../../common/html/screen.mjs';

/**
 * Подготовленные строки и подписи одного экземпляра поиска.
 * @typedef {Object} SearchHistoryModel
 * @property {readonly string[]} queries История в порядке владельца.
 * @property {string} current Текущий запрос для обозначения совпадающей строки.
 * @property {{title:string,empty:string,remove:string,close:string,message?:string,retry?:string}} labels Подписи и отказ хранения.
 * @property {{remove:import('lit').TemplateResult,close:import('lit').TemplateResult}} icons Значки команд списка.
 */
/**
 * Действия владельца истории без доступа компонента к его хранилищу.
 * @typedef {Object} SearchHistoryActions
 * @property {(query:string)=>void} select Принимает запрос и открывает поиск этой области.
 * @property {(query:string)=>void} remove Удаляет одну строку.
 * @property {()=>void} close Закрывает popup.
 * @property {()=>void} [retry] Повторяет хранение.
 * @property {()=>unknown} exportData Готовит снимок истории этого экземпляра.
 * @property {(value:unknown)=>boolean} importData Проверяет и объединяет импорт, не меняя данных при отказе.
 * @property {()=>void} refresh Заново передаёт готовые строки после принятия импорта.
 */
/**
 * Только временный редактор JSON; модель и действия заменяются при каждом render.
 * @typedef {{model:SearchHistoryModel,actions:SearchHistoryActions,transfer:{importing:boolean,value:string,message:string}|null}} HistoryView
 */
/** @type {WeakMap<HTMLElement,HistoryView>} Отдельное временное представление для каждого контейнера. */
const views = new WeakMap();

/**
 * Освобождает черновик обмена при закрытии или смене popup, сохраняя историю у владельца.
 * @param {HTMLElement} container Контейнер завершённого представления.
 * @returns {void}
 */
export function resetSearchHistory(container) {
  views.delete(container);
}

/**
 * Показывает готовую историю либо её местный черновик JSON.
 * @param {HTMLElement} container Живой контейнер истории одного поиска, включая PiP.
 * @param {SearchHistoryModel} model Строки и подписи этого владельца.
 * @param {SearchHistoryActions} actions Действия только этого экземпляра.
 * @returns {void} Проверка и сохранение строк остаются у владельца.
 */
export function renderSearchHistory(container, model, actions) {
  const view = views.get(container) || { model, actions, transfer: null };
  view.model = model;
  view.actions = actions;
  views.set(container, view);
  const repaint = () => renderSearchHistory(container, view.model, view.actions);
  const exchange = (/** @type {boolean} */ importing) => {
    view.transfer = {
      importing,
      value: importing ? '' : JSON.stringify(view.actions.exportData(), null, 2),
      message: '',
    };
    repaint();
    const field = container.querySelector('textarea');
    field?.focus({ preventScroll: true });
    if (!importing) field?.select();
  };
  const transfer = view.transfer;
  const content = transfer
    ? screenTemplate('search', 'search.transfer', {
        importing: transfer.importing,
        exporting: !transfer.importing,
        readonly: !transfer.importing,
        title: transfer.importing ? ui.navigation.searchHistoryImport : ui.navigation.searchHistoryExport,
        value: transfer.value,
        field: ui.navigation.jsonField,
        message: transfer.message,
        onInput: (/** @type {Event} */ event) => {
          transfer.value = /** @type {HTMLTextAreaElement} */ (event.currentTarget).value;
        },
        onSubmit: (/** @type {Event} */ event) => {
          event.preventDefault();
          /** @type {unknown} */ let value;
          try {
            value = JSON.parse(transfer.value);
          } catch {
            transfer.message = ui.navigation.jsonInvalid;
            repaint();
            return;
          }
          if (!view.actions.importData(value)) {
            transfer.message = ui.navigation.searchHistoryInvalid;
            repaint();
            return;
          }
          view.transfer = null;
          view.actions.refresh();
        },
        onCopy: () => {
          void Promise.resolve()
            .then(() => displayWindow(container).navigator.clipboard.writeText(transfer.value))
            .then(() => {
              if (views.get(container) !== view || view.transfer !== transfer) return;
              transfer.message = ui.appearance.copied;
              repaint();
            })
            .catch(() => {
              if (views.get(container) !== view || view.transfer !== transfer) return;
              transfer.message = ui.navigation.jsonCopyFailed;
              repaint();
            });
        },
        onBack: () => {
          view.transfer = null;
          repaint();
        },
        apply: ui.navigation.jsonApply,
        copy: ui.navigation.jsonCopy,
        back: ui.navigation.jsonDone,
      })
    : screenTemplate('search', 'search.historyList', {
        empty: model.labels.empty,
        isEmpty: !model.queries.length,
        hasQueries: Boolean(model.queries.length),
        entries: model.queries.map((query) =>
          screenTemplate('search', 'search.query', {
            query,
            current: query === model.current ? 'true' : nothing,
            onSelect: () => view.actions.select(query),
            onRemove: () => view.actions.remove(query),
            removeLabel: model.labels.remove,
            removeIcon: model.icons.remove,
          }),
        ),
      });
  render(
    screenTemplate('search', 'search.history', {
      title: model.labels.title,
      closeLabel: model.labels.close,
      onClose: () => view.actions.close(),
      closeIcon: model.icons.close,
      onExport: () => exchange(false),
      onImport: () => exchange(true),
      exchangeHidden: Boolean(transfer),
      exportLabel: ui.navigation.searchHistoryExport,
      importLabel: ui.navigation.searchHistoryImport,
      exportIcon: controlIcon('tray.and.arrow.up'),
      importIcon: controlIcon('tray.and.arrow.down'),
      message: model.labels.message || '',
      messageHidden: !model.labels.message,
      retryLabel: model.labels.retry || '',
      retryHidden: !actions.retry,
      onRetry: () => view.actions.retry?.(),
      content,
    }),
    container,
  );
}
