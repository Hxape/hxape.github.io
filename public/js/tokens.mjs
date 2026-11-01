/*! Third-party material in this build: Marked (MIT), DOMPurify (Apache-2.0), github-slugger (ISC), Bootstrap Icons (MIT), VS Code Codicons (CC BY 4.0), HTMX 2.0.11 (0BSD, adapted). Licenses and sources: vendor/SOURCES.md. */
import {
  ui_strings_default,
  formatText,
  isElement,
  controlIcon,
  renderControlIcons,
  OCTOCAT_AUTO_RESTORE_KEY,
  octocatAutoRestoreEnabled,
  bindTokenDialog,
  showTokenDialogLoading,
  showTokenDialogFailure
} from "./shared.mjs";

// src/auth/github/passkey.mjs
function requirePasskeyOrigin() {
  if (!isSecureContext || location.protocol === "http:" && location.hostname !== "localhost") {
    const local = `http://localhost${location.port ? `:${location.port}` : ""}${location.pathname}`;
    throw new Error(formatText(ui_strings_default.passkey.secureOrigin, { local }));
  }
}
function encode(bytes) {
  let text = "";
  for (const byte of bytes)
    text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decode(text) {
  const value = text.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(value.padEnd(Math.ceil(value.length / 4) * 4, "=")), (character) => character.charCodeAt(0));
}
function secret(credential) {
  const extensions = credential.getClientExtensionResults();
  const result = extensions.prf?.results?.first;
  const bytes = result instanceof ArrayBuffer ? new Uint8Array(result) : ArrayBuffer.isView(result) ? new Uint8Array(result.buffer, result.byteOffset, result.byteLength) : null;
  if (bytes?.byteLength !== 32)
    throw new Error(ui_strings_default.passkey.noPrf);
  return new Uint8Array(bytes);
}
async function unlockPasskey(saved, signal) {
  requirePasskeyOrigin();
  if (!navigator.credentials?.get)
    throw new Error(ui_strings_default.passkey.unavailable);
  const credentialId = decode(saved.credentialId);
  const salt = decode(saved.prfSalt);
  const credential = await navigator.credentials.get({
    signal,
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: "public-key", id: credentialId }],
      userVerification: "required",
      extensions: { prf: { eval: { first: salt } } }
    }
  });
  if (!credential || encode(new Uint8Array(credential.rawId)) !== saved.credentialId) {
    throw new Error(ui_strings_default.passkey.mismatch);
  }
  return { ...saved, material: secret(credential) };
}
async function passkeyForNewToken(entries) {
  requirePasskeyOrigin();
  const existing = entries.find((entry) => entry.credentialId && entry.prfSalt);
  if (existing)
    return unlockPasskey(existing);
  if (!navigator.credentials?.create)
    throw new Error(ui_strings_default.passkey.unavailable);
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: ui_strings_default.passkey.relyingPartyName },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: ui_strings_default.passkey.vaultCredentialName,
        displayName: ui_strings_default.passkey.vaultCredentialName
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      extensions: { prf: { eval: { first: salt } } }
    }
  });
  if (!credential)
    throw new Error(ui_strings_default.passkey.creationCancelled);
  if (credential.getClientExtensionResults?.().prf?.enabled !== true) {
    throw new Error(ui_strings_default.passkey.providerNoPrf);
  }
  const saved = { credentialId: encode(new Uint8Array(credential.rawId)), prfSalt: encode(salt) };
  try {
    return { ...saved, material: secret(credential) };
  } catch {
    return { ...saved, needsUnlock: true };
  }
}

// src/component/token-form/index.mjs
function bindTokenForm(dialog, handlers) {
  dialog.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.onSubmit();
  });
  dialog.addEventListener("change", handlers.onChange);
}
function readTokenForm(form) {
  const label = form.querySelector('input[name="label"]');
  const token = form.querySelector('input[name="token"]');
  const password = form.querySelector('input[name="passphrase"]');
  const mode = form.querySelector('input[name="storage"]:checked');
  return { label: label.value, token: token.value, password: password.value, mode: mode?.value || "" };
}
function showTokenForm(dialog, model) {
  const submit = dialog.querySelector('#token-form button[type="submit"]');
  const choices = dialog.querySelector("#token-form fieldset");
  const close = dialog.querySelector('button[data-token-action="close"]');
  if (submit && model.submitDisabled !== undefined)
    submit.disabled = model.submitDisabled;
  if (submit && model.submitLabel !== undefined)
    submit.textContent = model.submitLabel;
  if (choices && model.choicesDisabled !== undefined)
    choices.disabled = model.choicesDisabled;
  if (close && model.closeDisabled !== undefined)
    close.disabled = model.closeDisabled;
}
function clearTokenForm(dialog, submitLabel) {
  const token = dialog.querySelector('input[name="token"]');
  if (token)
    token.value = "";
  for (const input of dialog.querySelectorAll('input[type="password"]')) {
    input.value = "";
  }
  showTokenForm(dialog, { submitLabel });
}

// src/component/token-row/index.mjs
import { render } from "lit";
function actionButton(owner, model) {
  const button = owner.createElement("button");
  button.type = "button";
  button.dataset.tokenAction = model.action;
  if (model.icon) {
    button.className = "token-icon-button icon-button muted";
    button.setAttribute("aria-label", model.label);
    button.title = model.label;
    render(model.icon, button);
  } else {
    button.className = "control primary";
    button.textContent = model.label;
  }
  return button;
}
function renderTokenRow(owner, model) {
  const row = owner.createElement("li");
  row.dataset.tokenId = model.id;
  row.className = "control-row";
  const info = owner.createElement("span");
  info.className = "token-info";
  const label = owner.createElement("span");
  label.className = "token-label";
  label.textContent = model.label;
  const added = owner.createElement("time");
  added.className = "token-added muted";
  if (model.added.dateTime)
    added.dateTime = model.added.dateTime;
  added.textContent = model.added.text;
  info.append(label, added);
  row.append(actionButton(owner, model.primary), info);
  if (model.password) {
    const password = owner.createElement("input");
    password.type = "password";
    password.className = "field primary";
    password.autocomplete = "off";
    password.placeholder = model.password.placeholder;
    password.setAttribute("aria-label", model.password.label);
    row.append(password);
  }
  row.append(actionButton(owner, model.remove));
  return row;
}

// src/component/token-list/index.mjs
function renderTokenList(list, rows) {
  const fragment = list.ownerDocument.createDocumentFragment();
  for (const row of rows)
    fragment.append(renderTokenRow(list.ownerDocument, row));
  list.replaceChildren(fragment);
}

// src/component/token-manager/index.mjs
function showTokenManager(dialog, model = {}) {
  const details = dialog.querySelector("#token-add-details");
  const list = dialog.querySelector("#token-list");
  if (details && model.addExpanded !== undefined)
    details.open = model.addExpanded;
  if (list)
    list.hidden = Boolean(details?.open);
}

// src/component/token-protection-choice/index.mjs
function showTokenProtectionChoice(form, model) {
  const row = form.querySelector("#token-passphrase-row");
  const passwordHint = form.querySelector(".token-hint");
  const passkeyHint = form.querySelector(".token-passkey-hint");
  const password = form.querySelector('input[name="passphrase"]');
  if (row)
    row.hidden = !model.passwordVisible;
  if (passwordHint)
    passwordHint.hidden = !model.passwordVisible;
  if (passkeyHint)
    passkeyHint.hidden = !model.passkeyHintVisible;
  if (password)
    password.required = model.passwordRequired;
}

// src/component/token-recovery-choice/index.mjs
function showTokenRecoveryChoice(dialog, model) {
  const input = dialog.querySelector("#octocat-auto-restore");
  const label = dialog.querySelector("[data-octocat-auto-restore-label]");
  if (input)
    input.checked = model.checked;
  if (label && model.label !== undefined)
    label.textContent = model.label;
}

// src/component/token-status/index.mjs
function showTokenStatus(dialog, model) {
  const status = dialog.querySelector("#token-status");
  const worker = dialog.querySelector("#octocat-status");
  const retry = dialog.querySelector('button[data-token-action="retry-storage"]');
  if (status && model.message !== undefined)
    status.textContent = model.message;
  if (worker && model.workerMessage !== undefined)
    worker.textContent = model.workerMessage;
  if (retry && model.storageRetryVisible !== undefined)
    retry.hidden = !model.storageRetryVisible;
}

// src/bloc/tokens/index.mjs
var labels = ui_strings_default.tokens;
var lastPasskeyIdKey = "github-passkey-last-id";

class GithubTokens {
  #dialog;
  #access;
  #requestFragment;
  #loading = null;
  #loaded = false;
  #generation = 0;
  #busy = false;
  #knownEmpty = null;
  #pendingPasskey = null;
  #autoUnlockFailure = "";
  #lastState = { entries: [], activeId: null, storageError: false, storageReason: "", corrupted: false };
  constructor({ footer, access, requestFragment }) {
    const dialog = footer.querySelector("#token-dialog");
    if (!(dialog instanceof HTMLDialogElement))
      throw new Error("Token dialog is missing");
    this.#dialog = dialog;
    this.#access = access;
    this.#requestFragment = requestFragment;
    bindTokenDialog(dialog, {
      onBackdrop: () => this.close(),
      onClick: (event) => {
        this.#click(event);
      },
      onCancel: (event) => {
        if (this.#busy)
          event.preventDefault();
      },
      onClose: () => {
        ++this.#generation;
        this.#clearInputs();
      }
    });
    bindTokenForm(dialog, {
      onSubmit: () => {
        this.#add();
      },
      onChange: (event) => {
        this.#storageChanged();
        if (isElement(event.target) && event.target.id === "octocat-auto-restore")
          this.#saveAutoRestore(event.target);
      }
    });
    access.addEventListener("change", () => {
      if (dialog.open && this.#loaded)
        this.#refresh();
    });
    access.addEventListener("list-change", () => {
      if (dialog.open && this.#loaded)
        this.#refresh();
    });
    access.addEventListener("worker-state", () => {
      if (dialog.open && this.#loaded)
        this.#workerStatus();
    });
  }
  async open() {
    if (!this.#dialog.open) {
      this.#knownEmpty = null;
      this.#dialog.showModal();
    }
    if (["lost", "unavailable"].includes(this.#access.workerStatus.phase)) {
      this.#access.restartWorker().catch(() => {});
    }
    if (!this.#loaded)
      await this.#load();
    if (this.#loaded)
      await this.#refresh();
  }
  close() {
    if (this.#busy)
      return;
    ++this.#generation;
    if (this.#dialog.open)
      this.#dialog.close();
    this.#clearInputs();
  }
  async autoUnlockSavedPasskey() {
    if (!octocatAutoRestoreEnabled())
      return;
    let state;
    try {
      state = await this.#access.status();
    } catch {
      return;
    }
    if (state.storageError || state.activeId || this.#dialog.open)
      return;
    const entries = state.entries.filter((entry) => entry.storage === "passkey" && entry.credentialId && entry.prfSalt);
    if (!entries.length)
      return;
    let preferred = "";
    try {
      preferred = localStorage.getItem(lastPasskeyIdKey) || "";
    } catch {}
    const entry = entries.find((item) => item.id === preferred) || entries.sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""))[0];
    try {
      const request = new AbortController;
      const timeout = setTimeout(() => request.abort(), 60000);
      let passkey;
      try {
        passkey = await unlockPasskey({ credentialId: entry.credentialId || "", prfSalt: entry.prfSalt || "" }, request.signal);
      } finally {
        clearTimeout(timeout);
      }
      try {
        if (this.#access.active || this.#dialog.open)
          return;
        await this.#access.unlock(entry.id, "", passkey.material);
        try {
          localStorage.setItem(lastPasskeyIdKey, entry.id);
        } catch {}
        this.#autoUnlockFailure = "";
      } finally {
        if (passkey.material.byteLength)
          passkey.material.fill(0);
      }
    } catch {
      this.#autoUnlockFailure = labels.autoUnlockFailed;
    }
  }
  #saveAutoRestore(target) {
    if (target.localName !== "input")
      return;
    const input = target;
    const previous = octocatAutoRestoreEnabled();
    try {
      localStorage.setItem(OCTOCAT_AUTO_RESTORE_KEY, String(input.checked));
    } catch {
      showTokenRecoveryChoice(this.#dialog, { checked: previous });
      this.#status(labels.preferenceSaveFailed);
    }
  }
  #clearInputs() {
    this.#pendingPasskey = null;
    clearTokenForm(this.#dialog, labels.add);
  }
  async#load() {
    if (this.#loading)
      return this.#loading;
    const dialog = this.#dialog;
    showTokenDialogLoading(dialog, labels.loading);
    this.#loading = (async () => {
      try {
        await this.#requestFragment("public/html/token-manager.html", dialog);
        if (!dialog.querySelector("#token-form") || !dialog.querySelector("#token-list") || !dialog.querySelector("#octocat-status") || !dialog.querySelector("#octocat-auto-restore")) {
          throw new Error("Token form is missing.");
        }
        this.#loaded = true;
        this.#knownEmpty = null;
        showTokenRecoveryChoice(dialog, { checked: octocatAutoRestoreEnabled(), label: labels.autoRestoreOctocat });
        dialog.querySelector("#token-add-details")?.addEventListener("toggle", () => this.#syncDetails());
        renderControlIcons(dialog);
        this.#storageChanged();
        this.#workerStatus();
      } catch {
        showTokenDialogFailure(dialog, { message: labels.loadFailed, retryLabel: labels.retry, retryAction: "retry" });
      } finally {
        this.#loading = null;
      }
    })();
    return this.#loading;
  }
  #storageChanged() {
    const form = this.#dialog.querySelector("#token-form");
    if (form?.localName !== "form")
      return;
    const encrypted = form.querySelector('input[name="storage"][value="encrypted"]')?.checked;
    if (encrypted)
      this.#pendingPasskey = null;
    showTokenProtectionChoice(form, {
      passwordVisible: Boolean(encrypted),
      passwordRequired: Boolean(encrypted),
      passkeyHintVisible: Boolean(form.querySelector('input[name="storage"][value="passkey"]')?.checked)
    });
    showTokenForm(this.#dialog, { submitLabel: this.#pendingPasskey ? labels.finishPasskey : labels.add });
  }
  #syncDetails() {
    showTokenManager(this.#dialog);
  }
  #status(message) {
    showTokenStatus(this.#dialog, { message });
  }
  #workerStatus() {
    const target = this.#dialog.querySelector("#octocat-status");
    if (!target)
      return;
    const { phase, mode, active } = this.#access.workerStatus;
    const workerMessage = phase === "ready" ? labels.octocatReady : phase === "connecting" ? labels.octocatConnecting : phase === "reconnecting" ? labels.octocatReconnecting : phase === "lost" ? labels.octocatLost : phase === "unavailable" ? labels.octocatUnavailable : mode === "shared" ? active ? labels.octocatSharedActive : labels.octocatSharedLocked : active ? labels.octocatDedicatedActive : labels.octocatDedicatedLocked;
    showTokenStatus(this.#dialog, { workerMessage });
    showTokenForm(this.#dialog, {
      submitDisabled: this.#busy || this.#lastState.storageError || !this.#access.compatible
    });
  }
  #storageFailure(state) {
    return formatText(labels.storageReadFailed, { reason: state.storageReason || labels.unknownStorageReason });
  }
  async#refresh() {
    try {
      const state = await this.#access.status();
      this.#render(state);
      this.#workerStatus();
      showTokenForm(this.#dialog, { submitDisabled: this.#busy || state.storageError || !this.#access.compatible });
      showTokenStatus(this.#dialog, { storageRetryVisible: state.storageError });
      if (state.storageError)
        this.#status(this.#storageFailure(state));
      else if (state.corrupted)
        this.#status(ui_strings_default.storage.invalidToken);
      else if (!this.#access.compatible) {
        this.#status(this.#access.workerStatus.phase === "unavailable" ? ui_strings_default.access.workerUnavailable : labels.storageIncompatible);
      } else if (!this.#busy && !state.entries.length && ["localhost", "127.0.0.1"].includes(this.#dialog.ownerDocument.defaultView?.location.hostname || "")) {
        this.#status(labels.localStorageSeparate);
      } else if (!this.#busy)
        this.#status(this.#autoUnlockFailure);
    } catch (error) {
      this.#status(error instanceof Error ? error.message : labels.storageUnavailable);
    }
  }
  async#add() {
    const form = this.#dialog.querySelector("#token-form");
    if (form?.localName !== "form")
      return;
    const values = readTokenForm(form);
    const label = values.label.trim();
    const tokenInput = form.querySelector('input[name="token"]');
    const passwordInput = form.querySelector('input[name="passphrase"]');
    let token = values.token.trim();
    const password = values.password;
    values.token = values.password = "";
    const storage = values.mode === "passkey" ? "passkey" : "encrypted";
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
    if (storage === "encrypted" && password.length < 12) {
      this.#status(labels.passwordTooShort);
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    if (submit.disabled)
      return;
    this.#busy = true;
    showTokenForm(this.#dialog, { submitDisabled: true, closeDisabled: true, choicesDisabled: true });
    let passkey = null;
    const generation = this.#generation;
    try {
      if (storage === "passkey") {
        this.#status(labels.confirmPasskey);
        passkey = this.#pendingPasskey ? await unlockPasskey(this.#pendingPasskey) : await passkeyForNewToken(this.#lastState.entries);
        if (generation !== this.#generation)
          throw new Error(labels.setupCancelled);
        if (passkey.needsUnlock) {
          this.#pendingPasskey = { credentialId: passkey.credentialId, prfSalt: passkey.prfSalt };
          showTokenForm(this.#dialog, { submitLabel: labels.finishPasskey });
          this.#status(labels.passkeyCreated);
          return;
        }
      }
      if (generation !== this.#generation)
        throw new Error(labels.setupCancelled);
      if (!this.#access.compatible)
        throw new Error(labels.storageBecameUnavailable);
      this.#status(labels.checkingAndSaving);
      const operation = this.#access.add(label, token, storage, password, passkey);
      const state = await operation.catch((error) => {
        throw new Error(formatText(labels.savingFailed, { reason: error instanceof Error ? error.message : labels.failed }));
      });
      tokenInput.value = "";
      passwordInput.value = "";
      token = "";
      this.#pendingPasskey = null;
      form.reset();
      this.#storageChanged();
      this.#autoUnlockFailure = "";
      this.#render(state);
      this.#status(state.storageError ? labels.savedListUnavailable : labels.added);
    } catch (error) {
      if (!this.#dialog.open && generation === this.#generation && this.#dialog.isConnected)
        this.#dialog.showModal();
      const phase = storage === "passkey" && !passkey ? labels.passkey : labels.token;
      this.#status(formatText(labels.phaseFailed, { phase, reason: error instanceof Error ? error.message : labels.addFailed }));
    } finally {
      token = "";
      if (passkey && "material" in passkey && passkey.material.byteLength)
        passkey.material.fill(0);
      this.#busy = false;
      showTokenForm(this.#dialog, {
        submitDisabled: Boolean(this.#lastState.storageError || !this.#access.compatible),
        closeDisabled: false,
        choicesDisabled: false
      });
    }
  }
  async#click(event) {
    const button = isElement(event.target) ? event.target.closest("button[data-token-action]") : null;
    if (!button)
      return;
    const action = button.dataset.tokenAction;
    const id = button.closest("li")?.dataset.tokenId;
    if (action === "close") {
      if (!this.#busy)
        this.close();
      return;
    }
    if (action === "retry") {
      await this.#load();
      await this.#refresh();
      return;
    }
    if (action === "retry-storage") {
      await this.#refresh();
      return;
    }
    if (this.#busy)
      return;
    if (!id)
      return;
    button.disabled = true;
    try {
      let state;
      if (action === "use") {
        state = await this.#access.select(id);
        this.#status(labels.activeChanged);
      } else if (action === "lock") {
        state = await this.#access.lock(id);
        this.#status(labels.locked);
      } else if (action === "remove") {
        const name = this.#lastState.entries.find((entry) => entry.id === id)?.label || labels.thisToken;
        if (!this.#dialog.ownerDocument.defaultView?.confirm(formatText(labels.removeConfirm, { name })))
          return;
        state = await this.#access.remove(id);
        this.#status(labels.removed);
      } else if (action === "unlock-passkey") {
        const entry = this.#lastState.entries.find((entry) => entry.id === id);
        if (!entry?.credentialId || !entry?.prfSalt)
          throw new Error(labels.passkeyDetailsMissing);
        const passkey = await unlockPasskey({ credentialId: entry.credentialId, prfSalt: entry.prfSalt });
        try {
          state = await this.#access.unlock(id, "", passkey.material);
        } finally {
          if (passkey.material.byteLength)
            passkey.material.fill(0);
        }
        this.#status(labels.unlocked);
      } else if (action === "unlock") {
        const input = button.closest("li")?.querySelector('input[type="password"]');
        if (!input)
          return;
        const password = input.value;
        input.value = "";
        state = await this.#access.unlock(id, password);
        this.#status(labels.unlocked);
      }
      if (state) {
        this.#autoUnlockFailure = "";
        this.#render(state);
        if (action === "unlock-passkey" || action === "unlock")
          this.close();
      }
    } catch (error) {
      this.#status(error instanceof Error ? error.message : labels.operationFailed);
    } finally {
      button.disabled = false;
    }
  }
  #render(state) {
    this.#lastState = state;
    const active = state.entries.find((entry) => entry.id === state.activeId);
    if (active?.storage === "passkey") {
      try {
        localStorage.setItem(lastPasskeyIdKey, active.id);
      } catch {}
    }
    const details = this.#dialog.querySelector("#token-add-details");
    if (details && !state.storageError) {
      const empty = state.entries.length === 0;
      if (this.#knownEmpty === null || this.#knownEmpty !== empty) {
        showTokenManager(this.#dialog, { addExpanded: empty });
      }
      this.#knownEmpty = empty;
    }
    const list = this.#dialog.querySelector("#token-list");
    if (!list)
      return;
    renderTokenList(list, state.entries.map((entry) => {
      const date = entry.addedAt ? new Date(entry.addedAt) : null;
      const dateValid = date !== null && Number.isFinite(date.getTime());
      const added = {
        text: dateValid ? formatText(labels.addedDate, {
          date: date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        }) : labels.addedDateUnknown,
        dateTime: dateValid ? entry.addedAt : undefined
      };
      let primary;
      let password;
      if (!entry.unlocked) {
        if (entry.storage === "passkey") {
          primary = this.#action("unlock-passkey", labels.unlockWithPasskey, "passkey");
        } else {
          primary = this.#action("unlock", labels.unlockWithPassword, "keyboard");
          password = {
            placeholder: labels.unlockPassword,
            label: formatText(labels.unlockPasswordFor, { id: entry.id.slice(0, 8) })
          };
        }
      } else if (entry.id !== state.activeId)
        primary = this.#action("use", labels.activate, "lock-closed");
      else
        primary = this.#action("lock", labels.lock, "lock-open");
      return {
        id: entry.id,
        label: entry.unlocked ? formatText(labels.unlockedLabel, { label: entry.label || "", login: entry.login || "" }) : formatText(labels.encryptedLocked, { id: entry.id.slice(0, 8) }),
        added,
        primary,
        password,
        remove: this.#action("remove", formatText(labels.remove, { name: entry.label || labels.savedToken }), "trash")
      };
    }));
    this.#syncDetails();
  }
  #action(action, label, icon) {
    return { action, label, icon: controlIcon(icon) };
  }
}
export {
  GithubTokens
};
