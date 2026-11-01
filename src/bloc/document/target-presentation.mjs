/** Готовит подписи и значки адресов журнала, не определяя доступ или принадлежность тела объявления. */
import { ui } from '../../common/ui/text.mjs';
import { nodeIcon, versionSourceIcon } from '../catalog/icons.mjs';

/**
 * Проверенный адрес материала, приходящий от владельца каталога и журнала.
 * @typedef {import('../catalog/material-target.mjs').MaterialTarget} MaterialTarget
 */
/**
 * Проверенный источник, из которого берётся только разрешённая подпись репозитория.
 * @typedef {import('../catalog/material-target.mjs').Origin} MaterialOrigin
 */
/**
 * Сохранённая подпись материала без runtime-узла и текста.
 * @typedef {import('./journal.mjs').Title} Title
 */
/**
 * Метаданные записи журнала с устойчивым id.
 * @typedef {import('./journal.mjs').JournalEntry} JournalEntry
 */
/**
 * Принятый результат документов, из которого выбирается читаемая вкладка.
 * @typedef {import('./index.mjs').DocumentsResult} DocumentsResult
 */
/**
 * Проверенный путь и формат документа с необязательным текстом текущего просмотра.
 * @typedef {import('./index.mjs').RepositoryDocument} RepositoryDocument
 */

/**
 * Находит читаемый выбранный документ либо первый разрешённый в порядке результата.
 * @param {DocumentsResult} result Принятые документы и их необязательный собственный порядок.
 * @param {ReadonlyArray<string>} requested Порядок запросившего просмотра, используемый без result.order.
 * @param {string|null} selected Желаемый ключ вкладки; null выбирает первый читаемый.
 * @returns {string|null} Ключ документа со строковым content либо null; строгий отказ исчезнувшего при C проверяет панель.
 */
export function firstDocument(result, requested, selected) {
  const types = (result.order || requested).filter(type => Object.hasOwn(result.documents, type));
  return selected && types.includes(selected) && typeof result.documents[selected].content === 'string'
    ? selected
    : types.find(type => typeof result.documents[type].content === 'string') || null;
}

/**
 * Готовит адрес реально показанного документа с фактическим ref.
 * @param {MaterialTarget} previous Прежний адрес контекста; сохраняет смысл README каталога и совпадающий исходный якорь.
 * @param {RepositoryDocument} document Проверенные путь и формат выбранного документа.
 * @param {string} ref Фактическая ветка чтения, полученная в принятом результате.
 * @returns {MaterialTarget} Адрес каталога для его README либо точный адрес документа; тексты в него не входят.
 */
export function documentTarget(previous, document, ref) {
  if (previous.kind === 'directory' && previous.readmePath === document.path) return { ...previous, ref };
  return {
    kind: 'document',
    origin: previous.origin,
    ref,
    path: document.path,
    format: document.format,
    anchor: previous.kind === 'document' && previous.path === document.path ? previous.anchor : null,
  };
}

/**
 * Выбирает подпись по точному виду адреса, не угадывая тело метода.
 * @param {MaterialTarget} target Адрес ныне показанного материала.
 * @param {Title} fallback Прежняя допустимая подпись для пустого или неизвестного конечного имени.
 * @returns {Title} Подпись репозитория, каталога, документа или точного объявления; произвольная строка остаётся файлом с номером.
 */
export function targetTitle(target, fallback) {
  if (target.kind === 'repository') return { type: 'repository', name: target.origin.id };
  if (target.kind === 'declaration') {
    return {
      type: 'symbol',
      name: target.symbolPath.split(/[.#]/).at(-1) || fallback.name,
      kind: target.symbolKind,
    };
  }
  if (target.kind === 'source') {
    return {
      type: 'file',
      name: `${target.path.split('/').at(-1) || fallback.name}${target.line === null ? '' : `:${target.line}`}`,
    };
  }
  if (target.kind === 'directory') return { type: 'directory', name: target.path.split('/').at(-1) || fallback.name };
  return { type: 'file', name: target.path.split('/').at(-1) || fallback.name };
}

/**
 * Проецирует запись журнала в готовую строку общего представления.
 * @param {JournalEntry} entry Метаданные истории или закладки.
 * @param {string|null} cursor Id нынешней истории для готового выделения.
 * @param {boolean} bookmarked Вычисленное владельцем наличие закладки данного адреса.
 * @returns {import('../../component/navigation-collection/index.mjs').CollectionRow} Строка подписей и состояний без запросов, права доступа или нового владельца данных.
 */
export function collectionRow(entry, cursor, bookmarked) {
  const target = entry.target;
  const labels = ui.navigation;
  const namedKind = entry.title.kind && Object.hasOwn(labels, entry.title.kind)
    ? labels[/** @type {keyof typeof labels} */ (entry.title.kind)]
    : entry.title.kind;
  const kind = target.kind === 'declaration'
    ? namedKind || labels.symbol
    : target.kind === 'directory'
    ? labels.directory
    : target.kind === 'document'
    ? target.format === 'markdown' ? labels.markdown : labels.document
    : target.kind === 'repository'
    ? labels.repository
    : labels.file;
  const path = target.kind === 'repository' ? '' : target.kind === 'directory'
    ? target.readmePath || target.path
    : `${target.path}${
      target.kind === 'declaration' || target.kind === 'source' && target.line !== null
        ? `#L${target.line}`
        : target.kind === 'document' && target.anchor
        ? `#${target.anchor}`
        : ''
    }`;
  return {
    id: entry.id,
    name: entry.title.name,
    repository: target.origin.id,
    kind,
    path,
    active: entry.id === cursor,
    bookmarked,
  };
}

/**
 * Дополняет строку истории или закладки готовыми значками репозитория и вида материала.
 * @param {JournalEntry} entry Проверенные метаданные журнала без SVG, текста или доказательства доступа.
 * @param {string|null} cursor Нынешний курсор истории для начального выделения готовой строки.
 * @param {boolean} bookmarked Наличие закладки того же адреса, вычисленное владельцем журнала.
 * @param {boolean} branch Catalog подтвердил принадлежность нынешнего ref источнику ветки; false сохраняет обычный Git.
 * @param {Document} owner Фактический документ popup, включая PiP; созданные значки принадлежат только этой вставке.
 * @returns {import('../../component/navigation-collection/index.mjs').CollectionRow} Строка с действительным GitHub-именем библиотеки и прежним alias проекта; исходная запись не меняется.
 */
export function bookmarkRow(entry, cursor, bookmarked, branch, owner) {
  const row = collectionRow(entry, cursor, bookmarked);
  const target = entry.target;
  row.repository = repositoryName(target.origin);
  const settings = { repositories: true, directories: true, files: true, symbols: true };
  row.repositoryIcon = branch
    ? versionSourceIcon({ source: 'github', refKind: 'branch' }, owner)
    : nodeIcon({ type: 'repository', name: row.repository }, settings);
  const title = target.kind === 'document'
    ? { type: 'file', name: target.format === 'markdown' ? 'document.md' : 'document' }
    : target.kind === 'source'
    ? { type: 'file', name: target.path.split('/').at(-1) || entry.title.name }
    : targetTitle(target, entry.title);
  row.detailIcon = nodeIcon(title, settings);
  for (const icon of [row.repositoryIcon, row.detailIcon]) {
    if (!icon) continue;
    icon.removeAttribute('data-icon-group');
    if (icon.ownerDocument !== owner) owner.adoptNode(icon);
  }
  return row;
}

/**
 * Выбирает действительное GitHub-имя библиотеки либо сохранённый alias проекта без раскрытия скрытых названий.
 * @param {MaterialOrigin} origin Проверенная регистрация источника из адреса или журнала.
 * @returns {string} Имя репозитория haxelib из URL; для проекта — прежняя разрешённая подпись id.
 */
export function repositoryName(origin) {
  return origin.kind === 'haxelib' ? origin.url.split('/').at(-1) || origin.id : origin.id;
}
