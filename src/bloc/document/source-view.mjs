/** Связывает ленивое представление исходника с подписью GitHub и публичным загрузчиком. */
import { formatText, ui } from '../../common/ui/text.mjs';
import {
  showShellFailure as renderShellFailure,
  showSourceFailure as renderSourceFailure,
  showSourceLoading as renderSourceLoading,
  showSourceText as renderSourceText,
} from '../../component/source-view/index.mjs';

export {
  clearSourceView,
  scrollSourceLine,
  selectSourceLine,
  showSourceBookmarks,
  showSourceHighlight,
  sourceLineAt,
  sourceLineCount,
} from '../../component/source-view/index.mjs';
export { loadPublicSourceFile } from '../catalog/public-source.mjs';
export { ensureSourceShell, ensureSourceStyle, requirePreparedSourceStyle } from './source-shell.mjs';

/** Готовые подписи ожидания, отказа и происхождения raw для пассивного компонента. */
const labels = ui.sourceViewer;

/**
 * Передаёт представлению готовое сообщение ожидания GitHub-исходника.
 * @param {HTMLElement} host Подготовленная оболочка нынешнего исходника.
 * @returns {void} Показывает ожидание без запуска сети или хранения запроса.
 */
export function showSourceLoading(host) {
  renderSourceLoading(host, labels.loadingFile);
}

/**
 * Выбирает подпись фактически прочитанной ветки и передаёт текст общему представлению.
 * @param {HTMLElement} host Оболочка нынешнего файла.
 * @param {{content:string,ref:string}} result Успешно прочитанные content и фактический ref.
 * @param {boolean} library true добавляет пояснение отличия от установленной библиотеки.
 * @param {string} [version] Показываемая версия установки для пояснения библиотеки.
 * @returns {void} Выводит текст и номера; отдельный кэш текста здесь не создаётся.
 */
export function showSourceText(host, result, library, version = '') {
  renderSourceText(host, {
    content: result.content,
    note: library
      ? formatText(labels.libraryNote, { ref: result.ref, version })
      : formatText(labels.branchNote, { ref: result.ref }),
  });
}

/**
 * Преобразует отказ загрузчика в готовое сообщение размера или чтения.
 * @param {HTMLElement} host Прежняя оболочка отказавшего чтения.
 * @param {unknown} error Неизвестный отказ; только code=source-too-large выбирает сообщение размера.
 * @returns {void} Очищает показанный исходник и передаёт одно сообщение представлению.
 */
export function showSourceFailure(host, error) {
  const tooLarge = error && typeof error === 'object' && 'code' in error && error.code === 'source-too-large';
  renderSourceFailure(host, tooLarge ? labels.tooLarge : labels.fileFailed);
}

/**
 * Показывает отказ ленивой оболочки с общим пояснением.
 * @param {HTMLElement} host Область, где обязательные узлы исходника не готовы.
 * @returns {void} Заменяет частичную оболочку локальным сообщением отказа.
 */
export function showShellFailure(host) {
  renderShellFailure(host, labels.viewerFailed);
}
