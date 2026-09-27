/** Показывает флаги видимости подготовленных групп значков. */
import { screenTemplate } from '../../common/html/screen.mjs';
import { nothing } from 'lit';

/**
 * Подготовленные группы видимости и обработчик их переключения.
 * @typedef {Object} IconOptionsModel
 * @property {string} label Доступное имя fieldset настроек значков.
 * @property {boolean} enabled Разрешает изменение всех флагов; false отключает fieldset.
 * @property {ReadonlyArray<IconOption>} items Группы в заданном владельцем порядке.
 * @property {(event:Event)=>void} onChange Обработчик изменения checkbox; владелец определяет ключ и применяет флаг.
 */

/**
 * Одна подготовленная группа значков в списке видимости.
 * @typedef {Object} IconOption
 * @property {string} name Ключ настройки, передаваемый через data-icon-setting.
 * @property {string} label Видимая подпись группы.
 * @property {boolean} checked Нынешний флаг видимости этой группы.
 * @property {SVGSVGElement|null} [icon] Готовый значок соответствующего вида узлов; показывается при включённом флаге.
 */

/**
 * Показывает checkbox подготовленных групп, не разбирая виды узлов каталога.
 * @param {IconOptionsModel} model Подготовленные группы видимости и обработчик их переключения.
 * @returns {import('lit').TemplateResult} Шаблон флагов видимости; вычисление состава групп и сохранение принадлежат владельцу.
 */
export function renderIconOptions(model) {
  return screenTemplate('preferences', 'icon-options.fieldset', {
    label: model.label,
    disabled: !model.enabled,
    onChange: model.onChange,
    itemsContent: model.items.map((item) =>
      screenTemplate('preferences', 'icon-options.controlRow', {
        dataIconSetting: item.name,
        checked: item.checked,
        icon: item.checked ? item.icon : nothing,
        content: item.label,
      }),
    ),
  });
}
