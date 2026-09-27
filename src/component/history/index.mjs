/** Показывает подготовленную историю без открытия материалов и хранения записей. */
import { screenTemplate } from '../../common/html/screen.mjs';
import { nothing } from 'lit';
import { renderHistoryControls } from '../history-controls/index.mjs';
import { renderCollection } from '../navigation-collection/index.mjs';

/**
 * Показывает готовую историю по repo/ref/file и составляет поля её сбора, не открывая материал самостоятельно.
 * @param {HTMLElement} container Прежняя область временной панели истории.
 * @param {Omit<Parameters<typeof renderCollection>[1],'tree'>} model Подготовленные строки истории, состояния и подписи.
 * @param {Parameters<typeof renderCollection>[2]} actions Действия владельца истории и закладок по id.
 * @returns {()=>void} Очистка местного жеста и слушателей перед заменой или переносом области.
 */
export function renderHistory(container, model, actions) {
  const values = model.historyControls;
  const labels = model.labels.historyControls;
  const settings =
    values && labels && actions.autoCollect && actions.policy && actions.includeView && actions.limit
      ? renderHistoryControls(values, labels, {
          autoCollect: actions.autoCollect,
          policy: actions.policy,
          includeView: actions.includeView,
          limit: actions.limit,
        })
      : null;
  const exclusions = model.historyExclusions;
  const exclusionLabels = model.labels.historyExclusions;
  const controls = screenTemplate('history', 'history.controls', {
    content: settings || nothing,
    items:
      exclusions && exclusionLabels && actions.unblockRepository
        ? screenTemplate('history', 'history.historyExclusions', {
            labelLabel: exclusionLabels.label,
            content: exclusions.repositories.length,
            items: exclusions.repositories.length
              ? screenTemplate('history', 'history.historyExclusionList', {
                  items: exclusions.repositories.map((repository) =>
                    screenTemplate('history', 'history.historyExclusionRow', {
                      name: repository.name,
                      ariaLabel: `${exclusionLabels.unblock} · ${repository.name}`,
                      unblockLabel: exclusionLabels.unblock,
                      onUnblockRepository: () => actions.unblockRepository?.(repository.id),
                    }),
                  ),
                })
              : screenTemplate('history', 'history.muted', {
                  emptyLabel: exclusionLabels.empty,
                }),
          })
        : nothing,
  });
  return renderCollection(container, { ...model, controls, tree: false, historyGroups: true }, actions);
}
