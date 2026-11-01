(() => {
  // src/app/theme-boot.mjs
  try {
    const theme = localStorage.getItem("theme");
    if (theme === "light" || theme === "dark")
      document.documentElement.dataset.theme = theme;
    const current = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const accent = localStorage.getItem(`accent-${current}`);
    if (accent && /^#[0-9a-f]{6}$/i.test(accent))
      document.documentElement.style.setProperty("--accent-override", accent);
    const mark = localStorage.getItem(`mark-${current}`);
    if (mark && /^#[0-9a-f]{6}$/i.test(mark))
      document.documentElement.style.setProperty("--mark-background", mark);
  } catch {}
  document.addEventListener("DOMContentLoaded", () => {
    if (document.documentElement.dataset.bootstrapReady === "true")
      return;
    const status = document.querySelector("#startup-status");
    const fallback = document.querySelector("#startup-fallback");
    if (!(status instanceof HTMLElement) || !(fallback instanceof HTMLTemplateElement))
      return;
    status.replaceChildren(fallback.content.cloneNode(true));
    status.hidden = false;
    status.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest('[data-action="reload"]'))
        location.reload();
    });
  }, { once: true });
})();
