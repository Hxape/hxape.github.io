/*! Third-party material in this build: Marked (MIT), DOMPurify (Apache-2.0), github-slugger (ISC), Bootstrap Icons (MIT), VS Code Codicons (CC BY 4.0), HTMX 2.0.11 (0BSD, adapted). Licenses and sources: vendor/SOURCES.md. */
import {
  ui_strings_default,
  formatText,
  isHTMLElement,
  requestFragment,
  loadPublicSourceFile2
} from "./shared.mjs";

// src/component/source-view/index.mjs
import { html, nothing, render } from "lit";
function clearSourceContent(host) {
  const frame = host.querySelector("[data-source-frame]");
  const code = host.querySelector("[data-source-code]");
  const gutter = host.querySelector("[data-source-gutter]");
  const note = host.querySelector("[data-source-note]");
  const bookmarks = host.querySelector("[data-source-bookmarks]");
  if (code)
    code.textContent = "";
  if (gutter) {
    gutter.textContent = "";
    gutter.removeAttribute("data-selected-line");
  }
  if (note)
    note.textContent = "";
  if (isHTMLElement(bookmarks))
    render(nothing, bookmarks);
  if (frame) {
    frame.hidden = true;
    delete frame.dataset.lineCount;
    frame.style.removeProperty("--source-number-digits");
    frame.style.removeProperty("--source-highlight-top");
    frame.style.removeProperty("--source-line-height");
    frame.removeAttribute("data-source-highlight");
  }
}
function showSourceLoading(host, message) {
  clearSourceContent(host);
  const state = host.querySelector("[data-source-state]");
  if (state) {
    state.textContent = message;
    state.setAttribute("role", "status");
  }
}
function lineNumbers(content) {
  let count = 1;
  for (let index = 0;index < content.length; index++)
    if (content.charCodeAt(index) === 10)
      count++;
  const chunks = [];
  let chunk = "";
  for (let line = 1;line <= count; line++) {
    chunk += `${line}${line === count ? "" : `
`}`;
    if (line % 1024 === 0) {
      chunks.push(chunk);
      chunk = "";
    }
  }
  if (chunk)
    chunks.push(chunk);
  return { count, text: chunks.join("") };
}
function showSourceText(host, { content, note: noteText }) {
  const frame = host.querySelector("[data-source-frame]");
  const gutter = host.querySelector("[data-source-gutter]");
  const code = host.querySelector("[data-source-code]");
  const state = host.querySelector("[data-source-state]");
  const note = host.querySelector("[data-source-note]");
  if (!frame || !gutter || !code || !state || !note)
    throw new Error("Source view markup is missing");
  const lines = lineNumbers(content);
  code.textContent = content;
  gutter.textContent = lines.text;
  frame.dataset.lineCount = String(lines.count);
  frame.style.setProperty("--source-number-digits", String(String(lines.count).length));
  state.textContent = "";
  note.textContent = noteText;
  frame.hidden = false;
}
function showSourceFailure(host, message) {
  clearSourceContent(host);
  const state = host.querySelector("[data-source-state]");
  if (!state)
    throw new Error("Source view markup is missing");
  state.textContent = message;
  state.setAttribute("role", "alert");
}
function showShellFailure(host, text) {
  host.replaceChildren();
  const message = host.ownerDocument.createElement("p");
  message.className = "source-state";
  message.setAttribute("role", "alert");
  message.textContent = text;
  host.append(message);
}
function clearSourceView(host) {
  clearSourceContent(host);
  const state = host.querySelector("[data-source-state]");
  if (state)
    state.textContent = "";
}
function selectSourceLine(host, line, view) {
  const frame = host.querySelector("[data-source-frame]");
  const code = host.querySelector("[data-source-code]");
  const gutter = host.querySelector("[data-source-gutter]");
  if (!frame || !code || !isHTMLElement(gutter))
    return null;
  if (line === null) {
    gutter.removeAttribute("data-selected-line");
    frame.style.removeProperty("--source-highlight-top");
    frame.style.removeProperty("--source-line-height");
    return null;
  }
  const lineHeight = parseFloat(view.getComputedStyle(code).lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0)
    return null;
  const count = Number(frame.dataset.lineCount) || 1;
  const target = Math.max(1, Math.min(Number.isInteger(line) ? line : 1, count));
  gutter.dataset.selectedLine = String(target);
  frame.style.setProperty("--source-highlight-top", `${(target - 1) * lineHeight}px`);
  frame.style.setProperty("--source-line-height", `${lineHeight}px`);
  return target;
}
function showSourceHighlight(host, visible, fade = false) {
  const frame = host.querySelector("[data-source-frame]");
  const band = frame?.querySelector("[data-source-highlight-band]");
  const wasVisible = frame?.hasAttribute("data-source-highlight");
  band?.getAnimations().forEach((animation) => animation.cancel());
  frame?.toggleAttribute("data-source-highlight", visible);
  if (fade && !visible && wasVisible && band) {
    band.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360 });
  }
}
function scrollSourceLine(body, host, line, view) {
  const target = selectSourceLine(host, line, view);
  const frame = host.querySelector("[data-source-frame]");
  if (target === null || !frame)
    return;
  const lineHeight = parseFloat(frame.style.getPropertyValue("--source-line-height"));
  if (target === 1) {
    body.scrollTop = 0;
    return;
  }
  const top = frame.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
  body.scrollTop = Math.max(0, top + (target - 1) * lineHeight - Math.min(body.clientHeight / 4, 120));
}
function sourceLineAt(host, clientY, view) {
  const gutter = host.querySelector("[data-source-gutter]");
  const frame = host.querySelector("[data-source-frame]");
  if (!isHTMLElement(gutter) || !isHTMLElement(frame) || frame.hidden)
    return null;
  const height = parseFloat(view.getComputedStyle(gutter).lineHeight);
  const count = Number(frame.dataset.lineCount);
  if (!Number.isFinite(height) || height <= 0 || !Number.isSafeInteger(count) || count <= 0)
    return null;
  const line = Math.floor((clientY - gutter.getBoundingClientRect().top) / height) + 1;
  return line >= 1 && line <= count ? line : null;
}
function sourceLineCount(host) {
  const frame = host.querySelector("[data-source-frame]");
  const count = Number(frame?.getAttribute("data-line-count"));
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}
function showSourceBookmarks(host, lines, icon, view, label) {
  const container = host.querySelector("[data-source-bookmarks]");
  const gutter = host.querySelector("[data-source-gutter]");
  if (!isHTMLElement(container) || !gutter)
    return;
  const count = sourceLineCount(host);
  const shown = [...new Set(lines)].filter((line) => Number.isSafeInteger(line) && line > 0 && line <= count);
  render(html`
      ${shown.map((line) => html`
          <button
            type               = "button"
            class              = "source-line-bookmark control primary icon-button nonselectable"
            data-bookmark-line = ${line}
            aria-label         = ${label(line)}
            data-tooltip       = ${label(line)}
            style              = ${`--bookmark-line:${line - 1}`}
          >
            <span class="source-bookmark-icon">${icon}</span>
          </button>
        `)}
    `, container);
  for (const marker of container.querySelectorAll("[data-bookmark-line]")) {
    if (!isHTMLElement(marker))
      continue;
    const line = Number(marker.dataset.bookmarkLine);
    if (Number.isSafeInteger(line) && line > 0 && line <= count) {
      marker.style.setProperty("--bookmark-line", String(line - 1));
    }
    marker.removeAttribute("data-bookmark-removing");
  }
}
// src/bloc/document/source-shell.mjs
var labels = ui_strings_default.sourceViewer;
var sourceStylePath = "public/css/source.css";
var loadingShell = new WeakMap;
var loadingStyle = new WeakMap;
function requirePreparedSourceStyle(owner) {
  const href = new URL(sourceStylePath, owner.baseURI).href;
  const link = [...owner.querySelectorAll("link")].find((item) => item.rel === "stylesheet" && item.href === href);
  if (!link?.sheet || link.disabled)
    throw new Error("The source stylesheet is not prepared for this document");
}
function ensureSourceStyle(owner) {
  const href = new URL(sourceStylePath, owner.baseURI).href;
  const existing = [...owner.querySelectorAll("link")].find((link) => link.rel === "stylesheet" && link.href === href);
  const link = existing || owner.createElement("link");
  link.dataset.sourceViewStyle = "";
  if (link.sheet)
    return Promise.resolve(undefined);
  const current = loadingStyle.get(owner);
  if (current)
    return current;
  if (!existing) {
    link.rel = "stylesheet";
    link.href = href;
  }
  const pending = new Promise((resolve, reject) => {
    const finish = (error) => {
      clearTimeout(timer);
      link.removeEventListener("load", loaded);
      link.removeEventListener("error", failed);
      if (error) {
        link.remove();
        reject(error);
      } else
        resolve(undefined);
    };
    const loaded = () => finish(null);
    const failed = () => finish(new Error("Source style failed to load."));
    const timer = setTimeout(() => finish(new Error("Source style timed out.")), 15000);
    link.addEventListener("load", loaded, { once: true });
    link.addEventListener("error", failed, { once: true });
    if (!existing)
      owner.head.append(link);
    else if (link.sheet)
      loaded();
  }).finally(() => loadingStyle.delete(owner));
  loadingStyle.set(owner, pending);
  return pending;
}
async function ensureSourceShell(host) {
  await ensureSourceStyle(host.ownerDocument);
  if (host.querySelector("[data-source-code]"))
    return;
  const existing = loadingShell.get(host);
  if (existing)
    return existing;
  host.textContent = labels.loadingViewer;
  const pending = requestFragment("public/html/source-view.html", host).then(() => {
    if (![
      "[data-source-frame]",
      "[data-source-gutter]",
      "[data-source-code]",
      "[data-source-state]",
      "[data-source-note]"
    ].every((selector) => host.querySelector(selector)))
      throw new Error(labels.viewerFailed);
  }).finally(() => loadingShell.delete(host));
  loadingShell.set(host, pending);
  return pending;
}

// src/bloc/document/source-view.mjs
var labels2 = ui_strings_default.sourceViewer;
function showSourceLoading2(host) {
  showSourceLoading(host, labels2.loadingFile);
}
function showSourceText2(host, result, library, version = "") {
  showSourceText(host, {
    content: result.content,
    note: library ? formatText(labels2.libraryNote, { ref: result.ref, version }) : formatText(labels2.branchNote, { ref: result.ref })
  });
}
function showSourceFailure2(host, error) {
  const tooLarge = error && typeof error === "object" && "code" in error && error.code === "source-too-large";
  showSourceFailure(host, tooLarge ? labels2.tooLarge : labels2.fileFailed);
}
function showShellFailure2(host) {
  showShellFailure(host, labels2.viewerFailed);
}
export {
  clearSourceView,
  ensureSourceShell,
  ensureSourceStyle,
  loadPublicSourceFile2 as loadPublicSourceFile,
  requirePreparedSourceStyle,
  scrollSourceLine,
  selectSourceLine,
  showShellFailure2 as showShellFailure,
  showSourceBookmarks,
  showSourceFailure2 as showSourceFailure,
  showSourceHighlight,
  showSourceLoading2 as showSourceLoading,
  showSourceText2 as showSourceText,
  sourceLineAt,
  sourceLineCount
};
