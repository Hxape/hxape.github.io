/** Показывает готовое действие раскрытия меню; состояние и срок раскрытия принадлежат вызывающей стороне. */
import { html } from 'lit';

/**
 * Готовое состояние отдельного действия раскрытия; компонент не хранит выбранное значение.
 * @typedef {Object} MenuDisclosureModel
 * @property {string} id Id кнопки в оболочке будущего потребителя.
 * @property {string} controls Id управляемого меню для доступной связи.
 * @property {boolean} expanded Нынешняя открытость меню, принятая его владельцем.
 * @property {string} label Готовые доступное имя и подсказка следующего действия.
 * @property {import('lit').TemplateResult} showIcon Знак раскрытия закрытого меню.
 * @property {import('lit').TemplateResult} hideIcon Знак сворачивания открытого меню.
 * @property {(event:MouseEvent)=>void} toggle Действие владельца при обычном нажатии; локальный toggle-state не создаётся.
 */

/**
 * Составляет одну кнопку раскрытия из готовых значений и действия.
 * @param {MenuDisclosureModel} model Принятые открытость, подпись, связь с меню и знаки.
 * @returns {import('lit').TemplateResult} Native button с aria-expanded/controls; вставку и события жизненного цикла ведёт потребитель.
 */
export function menuDisclosure(model) {
  return html`
    <button
      type          = "button"
      id            = ${model.id}
      class         = "menu-disclosure icon-button muted"
      aria-label    = ${model.label}
      aria-expanded = ${
    String(model.expanded)
      }
      aria-controls = ${model.controls}
      data-tooltip  = ${model.label}
      @click        = ${model.toggle}
    >
      <span
        class    = "menu-disclosure-show"
        ?hidden  = ${model.expanded}
      >${model.showIcon}</span>
      <span
        class    = "menu-disclosure-hide"
        ?hidden  = ${!model.expanded}
      >${model.hideIcon}</span>
    </button>`;
}
