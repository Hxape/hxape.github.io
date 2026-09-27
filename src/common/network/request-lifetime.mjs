/**
 * Срок одной операции, чьими адресом, правами и повтором владеет вызывающий модуль.
 * @typedef {object} RequestLifetimeOptions
 * @property {number} [timeout=15000] Миллисекунды до отказа ожидания и abort операции.
 * @property {AbortSignal} [signal] Внешняя отмена владельца; её reason сохраняется.
 */

/**
 * Ограничивает ожидание операции, включая чтение тела внутри неё; abort сообщает отмену, но фактическая остановка принадлежит операции.
 * @template T Результат операции после её собственной проверки.
 * @param {(signal:AbortSignal)=>Promise<T>} operation Действие, получающее общий сигнал внешней отмены и срока.
 * @param {RequestLifetimeOptions} [options] Срок и отмена вызывающего владельца.
 * @returns {Promise<T>} Первое успешное завершение операции.
 * @throws {unknown} Отказ операции или внешний reason; окончание срока выдаёт отдельную Error.
 */
export async function withinRequestTime(operation, { timeout = 15_000, signal } = {}) {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Request was cancelled.', 'AbortError');
  const controller = new AbortController();
  /**
   * Срок этой попытки истёк; отличает её ошибку от внешней отмены при гонке ответов.
   */
  let expired = false;
  const timeoutError = new Error('Request timed out. Try again.');
  /**
   * Отклоняет единственное ожидание внешней отмены, созданное для этой операции.
   * @type {(reason?: unknown) => void}
   */
  let rejectCancellation = () => {};
  /**
   * Ожидание только внешней отмены; собственного успешного результата у него нет.
   * @type {Promise<never>}
   */
  const cancellation = new Promise((_, reject) => {
    rejectCancellation = reject;
  });
  /**
   * Переносит внешний reason в сигнал операции и отклоняет ожидание этой попытки.
   */
  const cancelled = () => {
    const reason = signal?.reason ?? new DOMException('Request was cancelled.', 'AbortError');
    controller.abort(reason);
    rejectCancellation(reason);
  };
  signal?.addEventListener('abort', cancelled, { once: true });
  /**
   * Таймер срока нынешней операции; снимается в finally независимо от результата.
   */
  let timer = 0;
  /**
   * Ожидание только окончания срока; при срабатывании посылает abort и выдаёт timeoutError.
   * @type {Promise<never>}
   */
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      controller.abort();
      reject(timeoutError);
    }, timeout);
  });
  try {
    return await Promise.race([operation(controller.signal), deadline, cancellation]);
  } catch (error) {
    // Таймаут выдаём отдельно; внешняя отмена сохраняет исходную ошибку вызывающей стороны.
    if (expired) throw timeoutError;
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancelled);
  }
}
