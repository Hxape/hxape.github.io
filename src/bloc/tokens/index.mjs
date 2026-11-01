/** Показывает форму токенов и действия человека; списком и правом доступа владеет GithubAccess. */
import { passkeyForNewToken, unlockPasskey } from '../../auth/github/passkey.mjs';
import { OCTOCAT_AUTO_RESTORE_KEY, octocatAutoRestoreEnabled } from '../../auth/github/session-client.mjs';
import { controlIcon, renderControlIcons } from '../../common/ui/icons.mjs';
import { formatText, ui } from '../../common/ui/text.mjs';
import { isElement } from '../../common/ui/view-utils.mjs';

import {
  bindTokenDialog,
  showTokenDialogFailure,
  showTokenDialogLoading,
} from '../../component/token-dialog/index.mjs';
import { bindTokenForm, clearTokenForm, readTokenForm, showTokenForm } from '../../component/token-form/index.mjs';
import { renderTokenList } from '../../component/token-list/index.mjs';
import { showTokenManager } from '../../component/token-manager/index.mjs';
import { showTokenProtectionChoice } from '../../component/token-protection-choice/index.mjs';
import { showTokenRecoveryChoice } from '../../component/token-recovery-choice/index.mjs';
import { showTokenStatus } from '../../component/token-status/index.mjs';

const labels = ui.tokens;

/**
 * Только подписи поля пароля закрытой строки; введённое значение в этой модели не хранится.
 * @typedef {object} PasswordPrompt
 * @property {string} placeholder Подсказка пустого поля разблокировки.
 * @property {string} label Доступная подпись с коротким идентификатором нужной записи.
 */
const lastPasskeyIdKey = 'github-passkey-last-id';

/**
 * Уже загруженные владельцы формы; секретами и списком записей продолжает владеть GithubAccess.
 * @typedef {object} TokenManagerOptions
 * @property {HTMLElement} footer Нижняя панель с единственным token-dialog.
 * @property {import('../../auth/github/access.mjs').GithubAccess} access Владелец доступа, метаданных и операций воркера.
 * @property {typeof import('../../common/html/request.mjs').requestFragment} requestFragment Загрузчик разрешённого HTML формы с её сроком запроса.
 */
/**
 * Метаданные созданного ключа доступа до второго подтверждения; PRF-материал здесь не удерживается.
 * @typedef {object} PendingPasskey
 * @property {string} credentialId Идентификатор ключа, который нужно подтвердить повторно.
 * @property {string} prfSalt Соль повторного запроса материала шифрования.
 */
/**
 * Последний готовый ответ GithubAccess.status: метаданные, активная запись и состояние хранилища, без PAT.
 * @typedef {Awaited<ReturnType<import('../../auth/github/access.mjs').GithubAccess['status']>>} TokenManagerState
 */
/**
 * Сведения об отказе хранилища для видимого сообщения формы.
 * @typedef {object} TokenStorageFailure
 * @property {string} [storageReason] Причина от GithubAccess; отсутствие использует общую подпись словаря.
 */

/** HTML-фрагмент содержит элементы формы, коллекцией токенов владеет GithubAccess. */
export class GithubTokens {
  /**
   * Единственное окно формы в переносимом footer; содержимое загружается лениво один раз.
   * @type {HTMLDialogElement}
   */
  #dialog;
  /**
   * Владелец списка и операций доступа; форма получает метаданные и готовые результаты, не PAT воркера.
   * @type {import('../../auth/github/access.mjs').GithubAccess}
   */
  #access;
  /**
   * Переданный приложением загрузчик разрешённого HTML; используется только до готовности формы.
   * @type {typeof import('../../common/html/request.mjs').requestFragment}
   */
  #requestFragment;
  /**
   * Общее ожидание нынешней загрузки формы; null разрешает повтор после отказа.
   * @type {Promise<void>|null}
   */
  #loading = null;
  /**
   * Обязательные узлы формы уже проверены; готовый dialog повторно не заменяется.
   */
  #loaded = false;
  /**
   * Поколение открытия формы; закрытие делает ожидаемое добавление недействительным.
   */
  #generation = 0;
  /**
   * Идёт добавление/подтверждение записи; закрытие и выбор защиты временно запрещены.
   */
  #busy = false;
  /**
   * Последний показанный признак пустого списка; null заставляет согласовать раскрытие добавления при новом открытии.
   * @type {boolean|null}
   */
  #knownEmpty = null;
  /**
   * Созданный ключ ожидает второго подтверждения; метаданные очищаются при закрытии или смене защиты.
   * @type {PendingPasskey|null}
   */
  #pendingPasskey = null;
  /**
   * Отказ автоматического запроса ключа, показываемый при открытии формы до успешного действия.
   */
  #autoUnlockFailure = '';
  /**
   * Последние метаданные GithubAccess для подписей и действий строк; обновляются при каждом принятом status.
   * @type {TokenManagerState}
   */
  #lastState = { entries: [], activeId: null, storageError: false, storageReason: '', corrupted: false };

  /**
   * Связывает единственный dialog с действиями формы и изменениями доступа; HTML загружается при первом открытии.
   * @param {TokenManagerOptions} options Нижняя панель, владелец доступа и загрузчик HTML.
   * @throws {Error} Если в footer отсутствует token-dialog.
   */
  constructor({ footer, access, requestFragment }) {
    const dialog = footer.querySelector('#token-dialog');
    if (!(dialog instanceof HTMLDialogElement)) throw new Error('Token dialog is missing');
    this.#dialog = dialog;
    this.#access = access;
    this.#requestFragment = requestFragment;
    bindTokenDialog(dialog, {
      onBackdrop: () => this.close(),
      onClick: event => {
        void this.#click(event);
      },
      onCancel: event => {
        if (this.#busy) event.preventDefault();
      },
      onClose: () => {
        ++this.#generation;
        this.#clearInputs();
      },
    });
    bindTokenForm(dialog, {
      onSubmit: () => {
        void this.#add();
      },
      onChange: event => {
        this.#storageChanged();
        if (isElement(event.target) && event.target.id === 'octocat-auto-restore') this.#saveAutoRestore(event.target);
      },
    });
    access.addEventListener('change', () => {
      if (dialog.open && this.#loaded) void this.#refresh();
    });
    access.addEventListener('list-change', () => {
      if (dialog.open && this.#loaded) void this.#refresh();
    });
    access.addEventListener('worker-state', () => {
      if (dialog.open && this.#loaded) this.#workerStatus();
    });
  }

  /**
   * Открывает форму, при необходимости начинает Octocat и загружает её HTML, затем перечитывает метаданные записей.
   * @returns {Promise<void>} Отказ загрузки показывает повтор в dialog; ошибка showModal может отклонить обещание.
   */
  async open() {
    if (!this.#dialog.open) {
      this.#knownEmpty = null;
      this.#dialog.showModal();
    }
    if (['lost', 'unavailable'].includes(this.#access.workerStatus.phase)) {
      void this.#access.restartWorker().catch(() => {});
    }
    if (!this.#loaded) await this.#load();
    if (this.#loaded) await this.#refresh();
  }

  /**
   * Закрывает форму и очищает введённые секреты и метаданные неподтверждённого ключа.
   * @returns {void} Во время добавления закрытие игнорируется.
   */
  close() {
    if (this.#busy) return;
    ++this.#generation;
    if (this.#dialog.open) this.#dialog.close();
    this.#clearInputs();
  }

  /**
   * При включённой настройке предлагает сохранённый ключ, только если доступа ещё нет и человек не управляет формой.
   * @returns {Promise<void>} Нет подходящей записи — нет запроса; отказ сохраняет видимое сообщение. Материал PRF очищается после передачи.
   */
  async autoUnlockSavedPasskey() {
    if (!octocatAutoRestoreEnabled()) return;
    let state;
    try {
      state = await this.#access.status();
    } catch {
      return;
    }
    // Не открываем системный запрос, если уже есть активный доступ или человек управляет формой.
    if (state.storageError || state.activeId || this.#dialog.open) return;
    const entries = state.entries.filter((entry) => entry.storage === 'passkey' && entry.credentialId && entry.prfSalt);
    if (!entries.length) return;
    let preferred = '';
    try {
      preferred = localStorage.getItem(lastPasskeyIdKey) || '';
    } catch {}
    const entry = entries.find((item) => item.id === preferred)
      || entries.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))[0];
    try {
      const request = new AbortController();
      const timeout = setTimeout(() => request.abort(), 60_000);
      let passkey;
      try {
        passkey = await unlockPasskey(
          { credentialId: entry.credentialId || '', prfSalt: entry.prfSalt || '' },
          request.signal,
        );
      } finally {
        clearTimeout(timeout);
      }
      try {
        if (this.#access.active || this.#dialog.open) return;
        await this.#access.unlock(entry.id, '', passkey.material);
        try {
          localStorage.setItem(lastPasskeyIdKey, entry.id);
        } catch {}
        this.#autoUnlockFailure = '';
      } finally {
        if (passkey.material.byteLength) passkey.material.fill(0);
      }
    } catch {
      this.#autoUnlockFailure = labels.autoUnlockFailed;
    }
  }

  /**
   * Сохраняет флажок автоматического запуска и запроса ключа; отказ возвращает прежний выбор в форму.
   * @param {Element} target Изменённый input настройки восстановления; другой элемент игнорируется.
   * @returns {void} Отказ записи показывается в статусе формы.
   */
  #saveAutoRestore(target) {
    if (target.localName !== 'input') return;
    const input = /** @type {HTMLInputElement} */ (target);
    const previous = octocatAutoRestoreEnabled();
    try {
      localStorage.setItem(OCTOCAT_AUTO_RESTORE_KEY, String(input.checked));
    } catch {
      showTokenRecoveryChoice(this.#dialog, { checked: previous });
      this.#status(labels.preferenceSaveFailed);
    }
  }

  /**
   * Удаляет введённые PAT/пароль из формы и сбрасывает ожидание второго подтверждения ключа.
   * @returns {void} Сохранённые зашифрованные записи остаются у GithubAccess.
   */
  #clearInputs() {
    this.#pendingPasskey = null;
    clearTokenForm(this.#dialog, labels.add);
  }

  /**
   * Загружает HTML формы один раз и проверяет обязательные узлы; параллельные вызовы используют одно ожидание.
   * @returns {Promise<void>} Отказ показывает повтор и снимает loading, успех фиксирует loaded.
   */
  async #load() {
    if (this.#loading) return this.#loading;
    const dialog = this.#dialog;
    showTokenDialogLoading(dialog, labels.loading);
    this.#loading = (async () => {
      try {
        await this.#requestFragment('public/html/token-manager.html', dialog);
        if (
          !dialog.querySelector('#token-form') || !dialog.querySelector('#token-list')
          || !dialog.querySelector('#octocat-status') || !dialog.querySelector('#octocat-auto-restore')
        ) {
          throw new Error('Token form is missing.');
        }
        this.#loaded = true;
        this.#knownEmpty = null;
        showTokenRecoveryChoice(dialog, { checked: octocatAutoRestoreEnabled(), label: labels.autoRestoreOctocat });
        dialog.querySelector('#token-add-details')?.addEventListener('toggle', () => this.#syncDetails());
        renderControlIcons(dialog);
        this.#storageChanged();
        this.#workerStatus();
      } catch {
        showTokenDialogFailure(dialog, { message: labels.loadFailed, retryLabel: labels.retry, retryAction: 'retry' });
      } finally {
        this.#loading = null;
      }
    })();
    return this.#loading;
  }

  /**
   * Согласует видимость и обязательность пароля с выбранным способом защиты; пароль снимает ожидание passkey.
   * @returns {void} До появления формы ничего не меняет.
   */
  #storageChanged() {
    const form = /** @type {HTMLFormElement|null} */ (this.#dialog.querySelector('#token-form'));
    if (form?.localName !== 'form') return;
    const encrypted =
      /** @type {HTMLInputElement|null} */ (form.querySelector('input[name="storage"][value="encrypted"]'))?.checked;
    if (encrypted) this.#pendingPasskey = null;
    showTokenProtectionChoice(form, {
      passwordVisible: Boolean(encrypted),
      passwordRequired: Boolean(encrypted),
      passkeyHintVisible: Boolean(
        /** @type {HTMLInputElement|null} */ (form.querySelector('input[name="storage"][value="passkey"]'))?.checked,
      ),
    });
    showTokenForm(this.#dialog, { submitLabel: this.#pendingPasskey ? labels.finishPasskey : labels.add });
  }

  /**
   * Согласует оформление раскрытых блоков управления готовой формы.
   * @returns {void}
   */
  #syncDetails() {
    showTokenManager(this.#dialog);
  }

  /**
   * Передаёт готовое сообщение доступной области статуса формы.
   * @param {string} message Видимое сообщение операции либо пустая строка для очистки.
   * @returns {void}
   */
  #status(message) {
    showTokenStatus(this.#dialog, { message });
  }

  /**
   * Показывает фазу и вид Octocat отдельно от активности токена и доступности хранилища.
   * @returns {void} Недоступный воркер или хранилище выключает добавление; без области статуса ничего не меняется.
   */
  #workerStatus() {
    const target = this.#dialog.querySelector('#octocat-status');
    if (!target) return;
    const { phase, mode, active } = this.#access.workerStatus;
    const workerMessage = phase === 'ready'
      ? labels.octocatReady
      : phase === 'connecting'
      ? labels.octocatConnecting
      : phase === 'reconnecting'
      ? labels.octocatReconnecting
      : phase === 'lost'
      ? labels.octocatLost
      : phase === 'unavailable'
      ? labels.octocatUnavailable
      : mode === 'shared'
      ? (active ? labels.octocatSharedActive : labels.octocatSharedLocked)
      : (active ? labels.octocatDedicatedActive : labels.octocatDedicatedLocked);
    showTokenStatus(this.#dialog, { workerMessage });
    showTokenForm(this.#dialog, {
      submitDisabled: this.#busy || this.#lastState.storageError || !this.#access.compatible,
    });
  }

  /**
   * Подставляет причину отказа хранилища в сообщение; отсутствующая причина заменяется подписью словаря.
   * @param {TokenStorageFailure} state Готовое описание отказа от владельца доступа.
   * @returns {string} Текст для статуса формы.
   */
  #storageFailure(state) {
    return formatText(labels.storageReadFailed, { reason: state.storageReason || labels.unknownStorageReason });
  }

  /**
   * Перечитывает метаданные и согласует список, доступность добавления, повтор чтения и сообщения.
   * @returns {Promise<void>} Отказ status показывается в форме и не выбрасывается дальше.
   */
  async #refresh() {
    try {
      const state = await this.#access.status();
      this.#render(state);
      this.#workerStatus();
      showTokenForm(this.#dialog, { submitDisabled: this.#busy || state.storageError || !this.#access.compatible });
      showTokenStatus(this.#dialog, { storageRetryVisible: state.storageError });
      if (state.storageError) this.#status(this.#storageFailure(state));
      else if (state.corrupted) this.#status(ui.storage.invalidToken);
      else if (!this.#access.compatible) {
        this.#status(
          this.#access.workerStatus.phase === 'unavailable'
            ? ui.access.workerUnavailable
            : labels.storageIncompatible,
        );
      } else if (
        !this.#busy && !state.entries.length
        && ['localhost', '127.0.0.1'].includes(this.#dialog.ownerDocument.defaultView?.location.hostname || '')
      ) {
        this.#status(labels.localStorageSeparate);
      } else if (!this.#busy) this.#status(this.#autoUnlockFailure);
    } catch (error) {
      this.#status(error instanceof Error ? error.message : labels.storageUnavailable);
    }
  }

  /**
   * Проверяет ввод, получает пароль/материал ключа и передаёт добавление GithubAccess; закрытие запрещено до завершения.
   * @returns {Promise<void>} Отказ показывается в форме. Успех очищает ввод; PRF-материал очищается и после отказа.
   */
  async #add() {
    const form = /** @type {HTMLFormElement|null} */ (this.#dialog.querySelector('#token-form'));
    if (form?.localName !== 'form') return;
    const values = readTokenForm(form);
    const label = values.label.trim();
    const tokenInput = /** @type {HTMLInputElement} */ (form.querySelector('input[name="token"]'));
    const passwordInput = /** @type {HTMLInputElement} */ (form.querySelector('input[name="passphrase"]'));
    let token = values.token.trim();
    const password = values.password;
    values.token = values.password = '';
    const storage = values.mode === 'passkey' ? 'passkey' : 'encrypted';
    if (this.#lastState.storageError) {
      this.#status(this.#storageFailure(this.#lastState));
      return;
    }
    if (!this.#access.compatible) {
      this.#status(labels.storageIncompatible);
      return;
    }
    if (!label || !token) {
      this.#status(labels.enterLabelAndToken);
      return;
    }
    if (storage === 'encrypted' && password.length < 12) {
      this.#status(labels.passwordTooShort);
      return;
    }
    const submit = /** @type {HTMLButtonElement} */ (form.querySelector('button[type="submit"]'));
    if (submit.disabled) return;
    this.#busy = true;
    showTokenForm(this.#dialog, { submitDisabled: true, closeDisabled: true, choicesDisabled: true });
    let passkey = null;
    const generation = this.#generation;
    try {
      if (storage === 'passkey') {
        this.#status(labels.confirmPasskey);
        passkey = this.#pendingPasskey
          ? await unlockPasskey(this.#pendingPasskey)
          : await passkeyForNewToken(this.#lastState.entries);
        if (generation !== this.#generation) throw new Error(labels.setupCancelled);
        if (passkey.needsUnlock) {
          this.#pendingPasskey = { credentialId: passkey.credentialId, prfSalt: passkey.prfSalt };
          showTokenForm(this.#dialog, { submitLabel: labels.finishPasskey });
          this.#status(labels.passkeyCreated);
          return;
        }
      }
      if (generation !== this.#generation) throw new Error(labels.setupCancelled);
      if (!this.#access.compatible) throw new Error(labels.storageBecameUnavailable);
      this.#status(labels.checkingAndSaving);
      const operation = this.#access.add(label, token, storage, password, passkey);
      const state = await operation.catch((error) => {
        throw new Error(
          formatText(labels.savingFailed, { reason: error instanceof Error ? error.message : labels.failed }),
        );
      });
      tokenInput.value = '';
      passwordInput.value = '';
      token = '';
      this.#pendingPasskey = null;
      form.reset();
      this.#storageChanged();
      this.#autoUnlockFailure = '';
      this.#render(state);
      this.#status(state.storageError ? labels.savedListUnavailable : labels.added);
    } catch (error) {
      if (!this.#dialog.open && generation === this.#generation && this.#dialog.isConnected) this.#dialog.showModal();
      const phase = storage === 'passkey' && !passkey ? labels.passkey : labels.token;
      this.#status(
        formatText(labels.phaseFailed, { phase, reason: error instanceof Error ? error.message : labels.addFailed }),
      );
    } finally {
      token = '';
      if (passkey && 'material' in passkey && passkey.material.byteLength) passkey.material.fill(0);
      this.#busy = false;
      showTokenForm(this.#dialog, {
        submitDisabled: Boolean(this.#lastState.storageError || !this.#access.compatible),
        closeDisabled: false,
        choicesDisabled: false,
      });
    }
  }

  /**
   * Исполняет действие указанной строки через GithubAccess; удаление требует подтверждения человека.
   * @param {Event} event Нажатие на button с data-token-action и идентификатором записи.
   * @returns {Promise<void>} Неизвестная кнопка/запись игнорируется; отказ операции показывается, её кнопка снова включается.
   */
  async #click(event) {
    const button = isElement(event.target)
      ? /** @type {HTMLButtonElement|null} */ (event.target.closest('button[data-token-action]'))
      : null;
    if (!button) return;
    const action = button.dataset.tokenAction;
    const id = button.closest('li')?.dataset.tokenId;
    if (action === 'close') {
      if (!this.#busy) this.close();
      return;
    }
    if (action === 'retry') {
      await this.#load();
      await this.#refresh();
      return;
    }
    if (action === 'retry-storage') {
      await this.#refresh();
      return;
    }
    if (this.#busy) return;
    if (!id) return;
    button.disabled = true;
    try {
      let state;
      if (action === 'use') {
        state = await this.#access.select(id);
        this.#status(labels.activeChanged);
      } else if (action === 'lock') {
        state = await this.#access.lock(id);
        this.#status(labels.locked);
      } else if (action === 'remove') {
        const name = this.#lastState.entries.find((entry) => entry.id === id)?.label || labels.thisToken;
        if (!this.#dialog.ownerDocument.defaultView?.confirm(formatText(labels.removeConfirm, { name }))) return;
        state = await this.#access.remove(id);
        this.#status(labels.removed);
      } else if (action === 'unlock-passkey') {
        const entry = this.#lastState.entries.find((entry) => entry.id === id);
        if (!entry?.credentialId || !entry?.prfSalt) throw new Error(labels.passkeyDetailsMissing);
        const passkey = await unlockPasskey({ credentialId: entry.credentialId, prfSalt: entry.prfSalt });
        try {
          state = await this.#access.unlock(id, '', passkey.material);
        } finally {
          if (passkey.material.byteLength) passkey.material.fill(0);
        }
        this.#status(labels.unlocked);
      } else if (action === 'unlock') {
        const input =
          /** @type {HTMLInputElement|null} */ (button.closest('li')?.querySelector('input[type="password"]'));
        if (!input) return;
        const password = input.value;
        input.value = '';
        state = await this.#access.unlock(id, password);
        this.#status(labels.unlocked);
      }
      if (state) {
        this.#autoUnlockFailure = '';
        this.#render(state);
        if (action === 'unlock-passkey' || action === 'unlock') this.close();
      }
    } catch (error) {
      this.#status(error instanceof Error ? error.message : labels.operationFailed);
    } finally {
      button.disabled = false;
    }
  }

  /**
   * Сохраняет готовые метаданные и передаёт представлению строки, даты и допустимые действия без секретов.
   * @param {TokenManagerState} state Нынешний ответ GithubAccess.status.
   * @returns {void} Пустота списка согласует раскрытие добавления; отсутствующий список не меняется.
   */
  #render(state) {
    this.#lastState = state;
    const active = state.entries.find((entry) => entry.id === state.activeId);
    if (active?.storage === 'passkey') {
      try {
        localStorage.setItem(lastPasskeyIdKey, active.id);
      } catch {}
    }
    const details = /** @type {HTMLDetailsElement|null} */ (this.#dialog.querySelector('#token-add-details'));
    if (details && !state.storageError) {
      const empty = state.entries.length === 0;
      if (this.#knownEmpty === null || this.#knownEmpty !== empty) {
        showTokenManager(this.#dialog, { addExpanded: empty });
      }
      this.#knownEmpty = empty;
    }
    const list = this.#dialog.querySelector('#token-list');
    if (!list) return;
    renderTokenList(
      list,
      state.entries.map(entry => {
        const date = entry.addedAt ? new Date(entry.addedAt) : null;
        const dateValid = date !== null && Number.isFinite(date.getTime());
        const added = {
          text: dateValid
            ? formatText(labels.addedDate, {
              date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            })
            : labels.addedDateUnknown,
          dateTime: dateValid ? entry.addedAt : undefined,
        };
        /**
         * Нынешнее главное действие строки, выбранное по её защите, открытости и активности.
         * @type {import('../../component/token-row/index.mjs').TokenRowAction}
         */
        let primary;
        /**
         * Подписи поля ручной разблокировки паролем; отсутствуют для passkey и открытых записей.
         * @type {PasswordPrompt|undefined}
         */
        let password;
        if (!entry.unlocked) {
          if (entry.storage === 'passkey') {
            primary = this.#action('unlock-passkey', labels.unlockWithPasskey, 'passkey');
          } else {
            primary = this.#action('unlock', labels.unlockWithPassword, 'keyboard');
            password = {
              placeholder: labels.unlockPassword,
              label: formatText(labels.unlockPasswordFor, { id: entry.id.slice(0, 8) }),
            };
          }
        } else if (entry.id !== state.activeId) primary = this.#action('use', labels.activate, 'lock-closed');
        else primary = this.#action('lock', labels.lock, 'lock-open');
        return {
          id: entry.id,
          label: entry.unlocked
            ? formatText(labels.unlockedLabel, { label: entry.label || '', login: entry.login || '' })
            : formatText(labels.encryptedLocked, { id: entry.id.slice(0, 8) }),
          added,
          primary,
          password,
          remove: this.#action(
            'remove',
            formatText(labels.remove, { name: entry.label || labels.savedToken }),
            'trash',
          ),
        };
      }),
    );
    this.#syncDetails();
  }

  /**
   * Подготавливает действие строки; право исполнить его остаётся у GithubAccess.
   * @param {string} action Имя действия для data-token-action.
   * @param {string} label Готовая доступная подпись кнопки.
   * @param {'passkey'|'keyboard'|'trash'|'lock-closed'|'lock-open'} icon Значок способа открытия, блокировки или удаления.
   * @returns {import("../../component/token-row/index.mjs").TokenRowAction} Данные представления, не исполняющаяся операция.
   */
  #action(action, label, icon) {
    return { action, label, icon: controlIcon(icon) };
  }
}
