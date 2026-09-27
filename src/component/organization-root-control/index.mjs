/** Выводит поле местного пути организации и передаёт сохранение либо сброс его владельцу. */
import { screenTemplate } from '../../common/html/screen.mjs';

/**
 * Местный путь, пояснения и обработчик завершения его ввода.
 * @typedef {Object} OrganizationRootModel
 * @property {string} label Подпись поля корня организации.
 * @property {string} hint Пояснение назначения местного пути.
 * @property {string} placeholder Подсказка пустого поля.
 * @property {string} value Нынешний местный путь либо пустая строка.
 * @property {string} message Готовый результат проверки или сохранения в role=status.
 * @property {string} [id] Префикс id поля и его подписей; по умолчанию organization-root в меню настроек.
 * @property {(event:Event)=>void} [onChange] Немедленная проверка и сохранение change в обычном меню настроек; popup сохраняет только по submit.
 * @property {(value:string)=>boolean} [save] Принимает строку поля по submit; true означает принятый местный путь, false — отказ проверки.
 * @property {()=>void} [reset] Очищает путь у владельца и тем самым выключает режим VS Code.
 * @property {string} [saveLabel] Доступная подпись явного сохранения местного пути.
 * @property {string} [resetLabel] Подпись очистки местного пути.
 * @property {import('lit').TemplateResult} [saveIcon] Готовый знак сохранения настройки, без видимого текста команды.
 * @property {import('lit').TemplateResult} [resetIcon] Готовый знак очистки настройки браузера, а не удаления каталога.
 * @property {string} [invalidMessage] Текст нативной ошибки поля при отказе save.
 */

/**
 * Показывает поле местного пути и сообщения его владельца.
 * @param {OrganizationRootModel} model Местный путь, пояснения и обработчик завершения его ввода.
 * @returns {import('lit').TemplateResult} Шаблон настройки пути; компонент не обращается к файловой системе и не сохраняет ввод.
 */
export function renderOrganizationRootControl(model) {
  const id = model.id || 'organization-root';
  /**
   * Передаёт нынешний ввод владельцу по Enter или кнопке сохранения; черновик остаётся только в input.
   * @param {Event} event Submit единственной формы этого поля.
   * @returns {void} Стандартная отправка формы отменяется; неверный путь получает доступное нативное сообщение.
   */
  const save = (event) => {
    event.preventDefault();
    const form = /** @type {HTMLFormElement} */ (event.currentTarget);
    const input = form.querySelector('input');
    if (!input || !model.save) return;
    input.setCustomValidity('');
    if (!model.save(input.value)) {
      input.setCustomValidity(model.invalidMessage || model.message);
      input.reportValidity();
    }
  };
  /**
   * Сбрасывает сохранённый путь и видимый черновик одной готовой командой владельца.
   * @param {MouseEvent} event Нажатие кнопки сброса внутри той же формы.
   * @returns {void} Очищает нативную ошибку поля; запись и сообщения выполняет переданный reset.
   */
  const reset = (event) => {
    const button = /** @type {HTMLButtonElement} */ (event.currentTarget);
    const input = button.form?.querySelector('input');
    model.reset?.();
    if (input) {
      input.value = '';
      input.setCustomValidity('');
    }
  };
  /**
   * Снимает прежнюю нативную ошибку при новом вводе, чтобы следующая отправка снова дошла до проверки владельца.
   * @param {Event} event Ввод в единственное текстовое поле формы.
   * @returns {void} Не сохраняет черновик и не меняет готовое сообщение модели.
   */
  const edited = (event) => {
    /** @type {HTMLInputElement} */ (event.currentTarget).setCustomValidity('');
  };
  return screenTemplate('preferences', 'organization-root-control.organizationControl', {
    ariaLabelledby: `${id}-label`,
    onSubmit: save,
    id,
    label: model.label,
    placeholder: model.placeholder,
    value: model.value,
    ariaDescribedby: `${id}-hint ${id}-status`,
    onChange: model.onChange,
    onInput: edited,
    id2: `${id}-hint`,
    hint: model.hint,
    id3: `${id}-status`,
    message: model.message,
    saveContent:
      model.save && model.reset
        ? screenTemplate('preferences', 'organization-root-control.organizationActions', {
            saveLabel: model.saveLabel,
            saveIcon: model.saveIcon,
            resetLabel: model.resetLabel,
            onClick: reset,
            resetIcon: model.resetIcon,
          })
        : '',
  });
}
