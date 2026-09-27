/** Управляет краткими анимациями интерфейса и завершает их при выборе уменьшенного движения. */
import interaction from './json/interaction.json' with { type: 'json' };

/**
 * Ключ одного эффекта: элемент по умолчанию либо имя согласованной анимации рамки.
 * @typedef {Element|string} MotionKey
 */
/**
 * Дополнение к одному эффекту; отмена и принятие завершения различаются.
 * @typedef {object} MotionOptions
 * @property {MotionKey} [key] Общий ключ для замены прежнего эффекта; по умолчанию target.
 * @property {()=>void} [finish] Принимает конечное состояние при успехе или явном finish, но не при cancel.
 */
/**
 * Эффекты одного окна, которыми владеет вызвавший блок до dispose.
 * @typedef {object} MotionController
 * @property {(target:Element,frames:Keyframe[],options?:MotionOptions)=>void} play Заменяет эффект с тем же ключом; при уменьшенном движении сразу принимает finish.
 * @property {(key:MotionKey)=>void} cancel Снимает эффект без принятия конечного состояния.
 * @property {(key:MotionKey)=>void} finish Снимает эффект и один раз вызывает его завершитель.
 * @property {()=>void} finishAll Принимает все нынешние эффекты из снимка ключей.
 * @property {()=>void} dispose Снимает media-listener и отменяет оставшиеся эффекты без завершителей.
 */
/**
 * Один действующий эффект и его необязательное принятие; удаляется до вызова завершителя.
 * @typedef {object} RunningMotion
 * @property {Animation} animation Эффект Web Animations нынешнего окна.
 * @property {()=>void} [finish] Действие принятия конечного состояния, предоставленное владельцем.
 */

/**
 * Создаёт независимые эффекты одного окна; dispose снимает наблюдение движения и отменяет остаток без finish.
 * @param {import("./view-utils.mjs").DisplayWindow} [view] Окно владельца эффектов; по умолчанию исходное окно модуля.
 * @returns {MotionController} Управление до явного dispose вызывающим блоком.
 */
export function createMotion(view = window) {
  /**
   * Нынешние эффекты по ключам на срок этого контроллера; завершители могут менять эту карту.
   * @type {Map<MotionKey,RunningMotion>}
   */
  const running = new Map();
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  /**
   * Удаляет один эффект и его обработчики, не принимая конечное состояние.
   * @param {MotionKey} key Ключ эффекта, который заменяется либо больше не нужен.
   * @returns {void} Отсутствующий ключ игнорируется.
   */
  function cancel(key) {
    const entry = running.get(key);
    if (!entry) return;
    running.delete(key);
    entry.animation.onfinish = entry.animation.oncancel = null;
    entry.animation.cancel();
  }
  /**
   * Удаляет эффект и принимает его конечное состояние ровно один раз.
   * @param {MotionKey} key Ключ завершаемого эффекта.
   * @returns {void} Отсутствующий ключ игнорируется; отказ завершителя передаётся вызывающему.
   */
  function finish(key) {
    const entry = running.get(key);
    if (!entry) return;
    cancel(key);
    entry.finish?.();
  }
  /**
   * Принимает эффекты из снимка ключей, поскольку завершители меняют нынешнюю карту.
   * @returns {void}
   */
  function finishAll() {
    [...running.keys()].forEach(finish);
  }
  /**
   * Заменяет эффект по ключу; без анимации или при уменьшенном движении сразу принимает конечное состояние.
   * @param {Element} target Живой элемент, к которому применяются кадры.
   * @param {Keyframe[]} frames Начальные и конечные значения анимируемых свойств.
   * @param {MotionOptions} [options] Ключ замены и необязательное принятие конечного состояния.
   * @returns {void} Поздний onfinish сверяет принадлежность эффекта нынешнему ключу.
   * @throws {Error} Отказ Web Animations или синхронного завершителя передаётся владельцу.
   */
  function play(target, frames, { key = target, finish: done } = {}) {
    cancel(key);
    if (reduced.matches || !target.animate) {
      done?.();
      return;
    }
    const animation = target.animate(frames, {
      duration: interaction.motion.duration,
      easing: interaction.motion.easing,
    });
    const entry = { animation, finish: done };
    running.set(key, entry);
    animation.onfinish = () => {
      if (running.get(key) === entry) finish(key);
    };
    animation.oncancel = () => {
      if (running.get(key) === entry) running.delete(key);
    };
  }
  /**
   * При переходе к уменьшенному движению принимает все уже начатые эффекты.
   * @returns {void}
   */
  const change = () => {
    if (reduced.matches) finishAll();
  };
  reduced.addEventListener('change', change);
  return {
    play,
    cancel,
    finish,
    finishAll,
    /**
     * Снимает наблюдение предпочтений и отменяет все нынешние эффекты без завершителей.
     * @returns {void} После завершения блока контроллер больше не следует изменениям среды.
     */
    dispose() {
      reduced.removeEventListener('change', change);
      [...running.keys()].forEach(cancel);
    },
  };
}
