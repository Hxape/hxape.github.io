/*! Adapted from HTMX 2.0.11 (0BSD). Licenses and sources: vendor/SOURCES.md. */
(() => {

  // src/common/html/fragment.mjs
  /*! Adapted from HTMX 2.0.11: makeFragment, normalizeScriptTags, swapInnerHTML.
   * https://github.com/bigskysoftware/htmx/blob/v2.0.11/src/htmx.js
   * License: 0BSD, vendor/htmx-2.0.11/LICENSE. */
  function removeScripts(fragment) {
    for (const script of fragment.querySelectorAll("script"))
      script.remove();
    for (const template of fragment.querySelectorAll("template"))
      removeScripts(template.content);
  }
  function insertFragment(target, response) {
    const range = target.ownerDocument.createRange();
    range.selectNodeContents(target);
    const fragment = range.createContextualFragment(response);
    removeScripts(fragment);
    target.replaceChildren(fragment);
  }

  // src/common/html/request.mjs
  /*! Adapted from HTMX 2.0.11: verifyPath, issueAjaxRequest, handleAjaxResponse.
   * https://github.com/bigskysoftware/htmx/blob/v2.0.11/src/htmx.js
   * License: 0BSD, vendor/htmx-2.0.11/LICENSE. */
  var fragments = new Set([
    "header",
    "catalog",
    "footer",
    "document-panel",
    "token-manager",
    "source-view",
    "bookmarks",
    "history",
    "preferences",
    "search"
  ].map((name) => `public/html/${name}.html`));
  function requestHTML(path) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, document.baseURI);
      if (!fragments.has(path) || url.origin !== location.origin)
        throw new Error("HTML fragment URL is not allowed.");
      const xhr = new XMLHttpRequest;
      xhr.open("GET", url.href, true);
      xhr.overrideMimeType("text/html");
      xhr.timeout = 15000;
      const finish = (error = null, response = "") => {
        xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = null;
        if (error)
          reject(error);
        else
          resolve(response);
      };
      xhr.onload = () => {
        try {
          if (xhr.status < 200 || xhr.status >= 300 || xhr.status === 204) {
            throw new Error(`HTML fragment request failed: HTTP ${xhr.status}`);
          }
          if (xhr.responseURL && xhr.responseURL !== url.href)
            throw new Error("HTML fragment was redirected.");
          finish(null, xhr.responseText);
        } catch (error) {
          finish(error);
        }
      };
      xhr.onerror = () => finish(new Error("HTML fragment request failed."));
      xhr.ontimeout = () => finish(new Error("HTML fragment request timed out."));
      xhr.onabort = () => finish(new Error("HTML fragment request was aborted."));
      try {
        xhr.send();
      } catch (error) {
        finish(error);
      }
    });
  }
  function requestFragment(path, target) {
    return requestHTML(path).then((response) => {
      if (!target.isConnected)
        throw new Error("HTML fragment target is detached.");
      insertFragment(target, response);
    });
  }

  // src/common/ui/format-text.mjs
  function formatText(template, values) {
    return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (placeholder, key) => {
      if (!Object.hasOwn(values, key))
        throw new Error(`Missing text value: ${key}`);
      return String(values[key]);
    });
  }
  // src/app/json/bootstrap-strings.json
  var bootstrap_strings_default = {
    loaderFailure: "Could not load the page loader.",
    stylesFailure: "Could not load page styles.",
    applicationFailure: "Could not load the interface.",
    fragmentFailure: "Could not load {name}.",
    loading: "Loading page… ",
    starting: "Starting interface… ",
    reload: "Reload page",
    retry: "Retry",
    github: "Hxape on GitHub"
  };

  // src/app/bootstrap.mjs
  var script = document.currentScript;
  if (!(script instanceof HTMLScriptElement) || !script.dataset.main)
    throw new Error("Missing main entry URL");
  var mainUrl = new URL(script.dataset.main, document.baseURI).href;

  class PageFragments {
    #parts = new Map;
    #status = document.querySelector("#startup-status");
    #started = false;
    #styleError = false;
    #applicationError = false;
    #labels = bootstrap_strings_default;
    constructor() {
      const styles = [...document.querySelectorAll("link[data-critical-style]")];
      this.#styleError = styles.length !== 3 || styles.some((link) => !(link instanceof HTMLLinkElement) || !link.sheet);
      const selectors = {
        header: "site-preferences",
        catalog: ":scope > .tree-list",
        footer: "#github-link",
        "document-panel": "#docs-document"
      };
      for (const [name, selector] of Object.entries(selectors)) {
        const host = document.querySelector(`[data-fragment="${name}"]`);
        const url = host.dataset.fragmentUrl;
        if (!url)
          throw new Error(`Missing fragment URL: ${name}`);
        this.#parts.set(name, { host, url, selector, ready: false, loading: false, error: false });
      }
      this.#status.addEventListener("click", (event) => {
        const button = event.target instanceof Element ? event.target.closest("button") : null;
        if (button?.dataset.action === "reload")
          location.reload();
        else if (button?.dataset.fragment) {
          this.#retry(this.#parts.get(button.dataset.fragment));
        }
      });
      this.#showStatus();
      for (const part of this.#parts.values())
        this.#retry(part);
    }
    #fail(part) {
      if (!part || part.ready)
        return;
      part.loading = false;
      part.error = true;
      part.host.removeAttribute("aria-busy");
      this.#showStatus();
    }
    #retry(part) {
      if (!part || part.ready || part.loading)
        return;
      part.loading = true;
      part.error = false;
      part.host.setAttribute("aria-busy", "true");
      this.#showStatus();
      requestFragment(part.url, part.host).then(() => {
        if (!part.host.querySelector(part.selector))
          throw new Error(`Missing fragment content: ${part.url}`);
        part.ready = true;
        part.loading = false;
        part.host.removeAttribute("aria-busy");
        part.host.dataset.fragmentReady = "true";
        this.#showStatus();
        this.#startApplication();
      }).catch(() => this.#fail(part));
    }
    #showStatus() {
      const labels = this.#labels;
      if (!labels)
        return;
      const content = document.createDocumentFragment();
      if (this.#styleError || this.#applicationError) {
        const message = document.createElement("p");
        message.textContent = this.#styleError ? labels.stylesFailure : labels.applicationFailure;
        const reload = document.createElement("button");
        reload.type = "button";
        reload.className = "control primary";
        reload.dataset.action = "reload";
        reload.textContent = labels.reload;
        message.append(reload);
        content.append(message);
      } else {
        const errors = [...this.#parts].filter(([, part]) => part.error);
        if (!errors.length)
          content.append(document.createTextNode(this.#started ? labels.starting : labels.loading));
        for (const [name, part] of errors) {
          const message = document.createElement("p");
          message.textContent = formatText(labels.fragmentFailure, { name });
          const retry = document.createElement("button");
          retry.type = "button";
          retry.className = "control primary";
          retry.dataset.fragment = name;
          retry.textContent = labels.retry;
          retry.disabled = part.loading;
          message.append(retry);
          content.append(message);
        }
      }
      const link = document.createElement("a");
      link.href = "https://github.com/Hxape";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = labels.github;
      content.append(link);
      this.#status.replaceChildren(content);
      this.#status.hidden = false;
    }
    #startApplication() {
      if (this.#started || this.#styleError || !this.#labels || ![...this.#parts.values()].every((part) => part.ready)) {
        return;
      }
      this.#started = true;
      this.#showStatus();
      const catalog = this.#parts.get("catalog")?.host;
      catalog?.removeAttribute("hidden");
      const timeout = window.setTimeout(() => {
        console.error("Site startup timed out after 20 seconds:", mainUrl);
        this.#applicationError = true;
        catalog?.setAttribute("hidden", "");
        this.#showStatus();
      }, 20000);
      import(mainUrl).then(({ siteReady }) => {
        if (typeof siteReady?.then !== "function")
          throw new Error("Не подтверждена готовность сайта");
        return siteReady;
      }).then(() => {
        window.clearTimeout(timeout);
        this.#applicationError = false;
        catalog?.removeAttribute("hidden");
        this.#status.hidden = true;
        document.dispatchEvent(new CustomEvent("site:ready"));
      }).catch((error) => {
        console.error("Site startup failed:", error);
        window.clearTimeout(timeout);
        this.#applicationError = true;
        catalog?.setAttribute("hidden", "");
        this.#showStatus();
      });
    }
  }
  new PageFragments;
  document.documentElement.dataset.bootstrapReady = "true";
})();
