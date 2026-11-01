/*! Third-party material in this build: Marked (MIT), DOMPurify (Apache-2.0), github-slugger (ISC), Bootstrap Icons (MIT), VS Code Codicons (CC BY 4.0), HTMX 2.0.11 (0BSD, adapted). Licenses and sources: vendor/SOURCES.md. */

// src/common/network/request-lifetime.mjs
async function withinRequestTime(operation, { timeout = 15000, signal } = {}) {
  if (signal?.aborted)
    throw signal.reason ?? new DOMException("Request was cancelled.", "AbortError");
  const controller = new AbortController;
  let expired = false;
  const timeoutError = new Error("Request timed out. Try again.");
  let rejectCancellation = () => {};
  const cancellation = new Promise((_, reject) => {
    rejectCancellation = reject;
  });
  const cancelled = () => {
    const reason = signal?.reason ?? new DOMException("Request was cancelled.", "AbortError");
    controller.abort(reason);
    rejectCancellation(reason);
  };
  signal?.addEventListener("abort", cancelled, { once: true });
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      controller.abort();
      reject(timeoutError);
    }, timeout);
  });
  try {
    return await Promise.race([operation(controller.signal), deadline, cancellation]);
  } catch (error) {
    if (expired)
      throw timeoutError;
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancelled);
  }
}
// src/common/ui/json/ui-strings.json
var ui_strings_default = {
  appearance: {
    hints: {
      select: "Arrow Up / W and Arrow Down / S select the previous or next visible row.",
      expand: "Arrow Right / D opens the selected branch or selects its first child.",
      back: "Arrow Left / A collapses the selected branch or selects its parent.",
      open: "Press Enter or hold a row for the chosen duration to open its documents or HXDoc. A short click only expands or collapses it.",
      context: "Press E to open the selected information. Keep holding E for the chosen duration to open it in Picture-in-Picture.",
      close: "Q or Escape closes information and returns focus to its row. The Picture-in-Picture window stays open.",
      navigation: "Z goes back and X goes forward in site history. C refreshes the current material, V switches its view, and B cycles the link mode.",
      journal: "H opens history, N opens bookmarks, and F or M opens search. Hold Search to open query history. In bookmarks, V switches list and tree.",
      bookmarks: "< and > open the previous and next bookmark. / opens the last opened or created bookmark. Shift+/ removes the bookmark matching the bottom address.",
      "navigation-bookmarks": "TODO: 1 navigation-bookmarks",
      "navigation-history": "TODO: 1 navigation-history",
      "toggle-theme": "TODO: 1 toggle-theme",
      "toggle-view-mode": "TODO: 1 toggle-view-mode",
      "cycle-link-mode": "TODO: 1 cycle-link-mode",
      refresh: "TODO: 1 refresh",
      quit: "TODO: 1 quit",
      collapse: "TODO: 1 collapse",
      "open-search": "TODO: 1 open-search",
      "open-information": "TODO: 1 open-information",
      "open-information-in-pip": "TODO: 1 open-information-in-pip"
    },
    collapseBottomBar: "Collapse bottom bar",
    expandBottomBar: "Expand bottom bar",
    hideKeyboardHelp: "Hide keyboard help",
    showKeyboardHelp: "Show keyboard help",
    useWindowedView: "Use windowed view",
    fillViewport: "Fill viewport",
    pipUnavailable: "Document Picture-in-Picture is not available in this browser.",
    pipOpening: "Opening Picture-in-Picture…",
    pipOpen: "Open this window in Picture-in-Picture. P opens the current information panel, or this window if information is closed.",
    closeBrowsing: "Q or Escape returns to file browsing in this Picture-in-Picture window.",
    contextOpen: "Hold E for the chosen duration to open the current information in Picture-in-Picture.",
    browseFiles: "browse files",
    closeInfo: "uit",
    holdForPip: "hold for PiP",
    infoHoldForPip: "info",
    copied: "Copied",
    copyFailed: "Could not copy",
    privateDataFailed: "Could not load private data."
  },
  screens: {
    loading: "Loading interface…",
    failed: "Could not load interface.",
    retry: "Retry"
  },
  preferences: {
    appearance: "Appearance",
    textSize: "Text size",
    decreaseTextSize: "Decrease text size",
    increaseTextSize: "Increase text size",
    iconVisibilityHint: "I · Preferences",
    iconAndHold: "Preferences",
    iconVisibility: "Icon visibility",
    holdDuration: "Hold duration",
    icons: {
      repositories: "Repositories",
      directories: "Subdirectories",
      files: "File types",
      symbols: "Symbols"
    },
    colorsHint: "Colors",
    chooseColors: "Choose colors",
    colors: "Colors",
    accentColor: "Accent color",
    resetAccentColor: "Reset accent color",
    accentHexValue: "Accent hex value",
    hexHint: "Hex: #RRGGBB",
    markBackground: "Mark background",
    sourceHighlightTime: "Hide line highlight after",
    sourceHighlightSeconds: "{seconds} s",
    sourceHighlightInfinity: "Do not hide",
    resetMarkBackground: "Reset mark background",
    markBackgroundHex: "Mark background hex",
    manageTokens: "Manage GitHub tokens",
    switchLightHint: "T · Switch to light theme",
    switchDarkHint: "T · Switch to dark theme",
    switchLight: "Switch to light theme",
    switchDark: "Switch to dark theme",
    organizationRoot: "Organization directory",
    organizationRootHint: "Repositories and .haxelib are in this directory. Leave empty to disable VS Code links.",
    organizationRootPlaceholder: "Directory path",
    organizationRootInvalid: "Enter an absolute directory path.",
    organizationRootSave: "Save organization directory",
    organizationRootReset: "Clear organization directory setting",
    navigationStorageFailed: "Could not save these settings in this browser.",
    searchTree: {
      label: "Search tree expansion",
      hint: "Applies only to catalogue search. Branches you opened stay open.",
      none: "Do not expand",
      temporary: "Expand temporarily",
      always: "Keep expanded"
    },
    historyTree: {
      label: "History tree expansion",
      hint: "Applies only to history. Branches you opened stay open.",
      none: "Do not expand",
      temporary: "Expand temporarily",
      always: "Keep expanded"
    }
  },
  catalog: {
    privateData: "This data is private.",
    privateRepository: "Private repository",
    privateAccessConfirmed: "Private repository access confirmed",
    privateContentOpened: "Content opened in this site",
    privateTreeLoaded: "Private tree loaded in this site",
    savedChecking: "Saved tree · checking GitHub…",
    savedStale: "Saved tree · update could not be checked.",
    cacheWriteFailed: "Tree loaded · could not save a local copy.",
    loadingLibraries: "Loading libraries…",
    installedVersion: "{version}",
    installedHaxelib: "{version} [Haxelib]",
    installedGitHubBranch: "{version} [GitHub branch {ref}]",
    installedGitHubTag: "{version} [GitHub tag {ref}]",
    checkingVersion: "Checking version…",
    publishedHaxelib: "{version} [Haxelib]",
    publishedGitHub: "{version} [GitHub]",
    publicationCheckedAt: "Checked {date}",
    noLibraries: "No libraries are available.",
    librariesFailed: "Could not load the library catalogue. ",
    loadingSettings: "Loading site settings…",
    levelFourUnavailable: "Tree level 4 is not available yet.",
    settingsFailed: "Could not load site settings. Repositories remain closed. ",
    privateUpdateFailed: "Could not update private data.",
    loading: "Loading…",
    repositoryFailed: "Could not load the repository. Collapse and expand to retry.",
    retry: "Retry"
  },
  documents: {
    loadingFailed: "Document loading failed",
    repositoryFailed: "Could not load repository documents.",
    retryLoading: "Retry loading documents",
    retryLoadingHint: "R · Retry loading documents",
    retry: "Retry",
    loadingInformation: "Loading information",
    loadingGithub: "Loading from GitHub…",
    loadingDocuments: "Loading documents…",
    notAllowed: "{type}: not allowed",
    noDocuments: "No documents in this {scope}.",
    privateData: "This data is private.",
    manageTokens: "Manage tokens",
    retryAccess: "Retry access",
    empty: "Empty document.",
    showSource: "Show source",
    showHtml: "Show HTML",
    pipUnavailable: "Document Picture-in-Picture is not available in this browser.",
    pipHint: "P / hold E · Open information in Picture-in-Picture",
    pipOpen: "Open information in Picture-in-Picture",
    installed: "Installed {version}",
    markdown: "Markdown",
    text: "Text"
  },
  sourceViewer: {
    documentation: "DOCUMENTATION",
    sourceCode: "SOURCE CODE",
    loadingViewer: "Loading source viewer…",
    viewerFailed: "Could not load the source viewer.",
    loadingFile: "Loading source from GitHub…",
    fileFailed: "Could not load the source file.",
    tooLarge: "This source file is too large to display.",
    retry: "Retry",
    branchNote: "GitHub branch: {ref}",
    libraryNote: "GitHub branch: {ref}. This file may differ from installed version {version}."
  },
  renderer: {
    image: "Изображение",
    htmlUnavailable: "HTML недоступен; показан исходный текст."
  },
  tables: {
    resizeColumns: "Resize columns {first} and {second}"
  },
  pip: {
    returnControlsFailed: "The interface was moved back, but some controls could not be restored.",
    moveFailed: "Could not move the interface. Its previous position was restored.",
    unavailable: "Document Picture-in-Picture is not available in this browser.",
    restoredPartially: "The interface is on the page, but some controls could not be restored.",
    openFailed: "Could not open Picture-in-Picture. The interface remains on the page.",
    displayFailed: "The interface was returned after a Picture-in-Picture display error."
  },
  tokens: {
    autoRestoreOctocat: "Automatically start Octocat and ask to unlock a saved passkey",
    octocatReady: "Octocat is ready to start.",
    octocatConnecting: "Starting Octocat…",
    octocatReconnecting: "Reconnecting Octocat…",
    octocatSharedLocked: "Octocat is running in a shared worker. Token locked.",
    octocatSharedActive: "Octocat is running in a shared worker. Token active.",
    octocatDedicatedLocked: "Octocat is running in a dedicated worker. Token locked.",
    octocatDedicatedActive: "Octocat is running in a dedicated worker. Token active.",
    octocatUnavailable: "Octocat is unavailable in this browser.",
    octocatLost: "Octocat stopped. Unlock the token again.",
    autoUnlockFailed: "Passkey was not activated. Open token manager to retry.",
    preferenceSaveFailed: "This browser could not save the passkey preference.",
    add: "Add token",
    loading: "Loading token manager…",
    loadFailed: "Could not load token manager.",
    retry: "Retry",
    storageReadFailed: "Cannot read saved tokens from browser storage: {reason}.",
    unknownStorageReason: "the browser gave no error details",
    storageIncompatible: "Encrypted token storage is unavailable in this browser.",
    localStorageSeparate: "Tokens saved on hxape.github.io are separate from localhost. Add a token here.",
    storageUnavailable: "Token storage is unavailable.",
    enterLabelAndToken: "Enter a label and token.",
    passwordTooShort: "Use an encryption password of at least 12 characters.",
    confirmPasskey: "Confirm the passkey on your device…",
    setupCancelled: "Token setup was cancelled.",
    finishPasskey: "Finish with passkey",
    passkeyCreated: "Passkey created. Tap Finish with passkey to confirm it again and encrypt the token.",
    storageBecameUnavailable: "Encrypted token storage became unavailable. Try again.",
    checkingAndSaving: "Checking the token with GitHub and saving its encrypted copy…",
    savingFailed: "Saving the token: {reason}",
    failed: "Failed.",
    savedListUnavailable: "Token saved, but the saved-token list is unavailable.",
    added: "Token added.",
    passkey: "Passkey",
    token: "Token",
    addFailed: "Could not add token.",
    phaseFailed: "{phase}: {reason}",
    activeChanged: "Active token changed.",
    lock: "Lock active token",
    locked: "Token locked. Its encrypted copy remains on this device.",
    thisToken: "this token",
    removeConfirm: "Remove {name} from this device? The token will remain active on GitHub.",
    removed: "Token removed from this browser. Revoke it on GitHub to disable it everywhere.",
    passkeyDetailsMissing: "Passkey details are missing.",
    unlocked: "Token unlocked.",
    operationFailed: "Token operation failed.",
    addedDate: "Added {date}",
    addedDateUnknown: "Added date unavailable",
    unlockWithPasskey: "Unlock with passkey",
    unlockPassword: "Unlock password",
    unlockPasswordFor: "Unlock password for token {id}",
    unlockWithPassword: "Unlock with password",
    activate: "Activate token",
    savedToken: "saved token",
    remove: "Remove {name}",
    encryptedLocked: "Encrypted token {id} · locked",
    unlockedLabel: "{label} · {login}"
  },
  passkey: {
    secureOrigin: "Passkeys require HTTPS or localhost. Open the local site at {local}.",
    noPrf: "This passkey did not return an encryption key (PRF). Try again or use password storage.",
    unavailable: "Passkeys are unavailable in this browser.",
    mismatch: "The selected passkey does not match.",
    creationCancelled: "Passkey creation was cancelled.",
    providerNoPrf: "This browser or passkey provider cannot supply an encryption key (PRF). Use password storage.",
    relyingPartyName: "Hxape",
    vaultCredentialName: "Hxape local vault"
  },
  githubRequest: {
    invalid: "Invalid GitHub request.",
    unlockFirst: "Unlock a token first.",
    accessChanged: "GitHub access changed.",
    tokenRejected: "GitHub rejected this token.",
    rateLimited: "GitHub request limit reached. Try again later.",
    denied: "GitHub denied access. Check this token and repository permissions.",
    failed: "GitHub request failed ({status}).",
    timeout: "GitHub did not respond. Try again later.",
    invalidPath: "Invalid repository path.",
    invalidFile: "Invalid GitHub file.",
    responseTooLarge: "GitHub response is too large for this site to read.",
    fileUnavailable: "GitHub did not return file content."
  },
  access: {
    workerUnavailable: "Octocat is unavailable in this browser.",
    invalidRepository: "Invalid repository name.",
    invalidBranch: "Invalid repository branch.",
    invalidSnapshot: "Invalid private repository snapshot.",
    changedInOtherTab: "Private access changed in another tab. Check the token and retry.",
    accessChanged: "GitHub access changed.",
    tokenRemoved: "This token was removed from the browser.",
    invalidTokenDetails: "Token details or storage choice are invalid.",
    duplicateToken: "This token is already added.",
    validationFailed: "GitHub token validation failed.",
    setupChanged: "Access changed during setup.",
    savedTokenMissing: "Saved token was not found.",
    unlockFailed: "Could not unlock this token. Check its password or passkey.",
    unlockChanged: "Access changed during unlock.",
    unlockFirst: "Unlock this token first.",
    selectionChanged: "Access changed during selection.",
    noLongerUnlocked: "This token is no longer unlocked.",
    removeFailed: "Token stopped, but its encrypted copy could not be deleted. Retry removal or revoke it on GitHub.",
    invalidSavedHash: "Invalid saved hash.",
    privateChanged: "Private access changed in another tab.",
    defaultBranchMissing: "GitHub default branch is missing.",
    invalidCommit: "Invalid GitHub commit.",
    invalidPrivateHash: "Invalid private snapshot hash.",
    snapshotChanged: "Private snapshot changed in another tab.",
    snapshotHashMismatch: "Private snapshot hash does not match its JSON.",
    privateRequestFailed: "Private request failed.",
    checksumMissing: `Cannot read .private/site.sha256.
Check that the file is published and this token has Contents: Read-only access.`,
    snapshotMissing: `Cannot read .private/site.json.
Check that the file is published and this token has Contents: Read-only access.`,
    repositoryUnavailable: "GitHub returned 404 for Hxape/{repo} repository metadata with the selected token.",
    branchUnavailable: "Cannot read branch {branch}. Check the branch setting and this token's repository permissions.",
    emptyRepository: "GitHub reports that Hxape/{repo} has no commits. Publish branch {branch} with its .private site files.",
    branchConflict: "GitHub could not read branch {branch} of Hxape/{repo} (409).",
    accessRevisionChanged: "Access changed.",
    loadSnapshotFirst: "Load the private snapshot before its documents."
  },
  storage: {
    unavailable: "Neither IndexedDB nor localStorage is available in this browser.",
    tokenChanged: "Stored token changed.",
    snapshotChanged: "Private snapshot changed in another tab.",
    indexedDbOpenFailed: "IndexedDB open failed without a browser error.",
    blocked: "Another site tab is blocking the token database. Close it and retry.",
    transactionFailed: "IndexedDB transaction failed without a browser error.",
    interrupted: "Token storage was interrupted.",
    passkeyMissing: "Passkey key is missing.",
    invalidPasskey: "Invalid passkey key.",
    invalidToken: "Invalid saved token."
  },
  version: {
    unavailable: "unavailable",
    lastChecked: "Last installed commit: {sha}",
    desktopTooltip: `{action}
version: {sha} © 2026 Yerumaku`,
    check: "Check site version",
    checked: "Site version is current",
    download: "Download site update",
    checking: "Checking site version…",
    preparing: "Preparing site update…",
    progress: "Updating site… {finished}/{total}",
    cleaning: "Clearing old site cache…",
    waitForDeployment: `Waiting for the published update.
Try again shortly.`,
    invalidResources: "The published resource list is invalid.",
    resourceMismatch: "A site resource did not match the published version.",
    invalidCommit: "GitHub returned an invalid site version.",
    checkFailed: "Could not check the site version.",
    failed: "Could not install the site update.",
    retryCheck: "Retry check",
    retry: "Retry update"
  },
  navigation: {
    history: "History",
    bookmarks: "Bookmarks",
    search: "Search",
    searchPlaceholder: "Search…",
    close: "Close",
    back: "Back",
    forward: "Forward",
    refresh: "Refresh material",
    toggleView: "Switch view",
    linkMode: "Link mode",
    internal: "Open in this site",
    vscode: "Open in VS Code",
    github: "Open on GitHub",
    emptyHistory: "No history.",
    emptyBookmarks: "No bookmarks.",
    remove: "Remove",
    addBookmark: "Add bookmark",
    removeBookmark: "Remove bookmark",
    deleteBookmark: "Delete bookmark",
    bookmarkAdded: "Bookmark added.",
    historyRemoved: "History entry removed.",
    bookmarksList: "List",
    bookmarksTree: "Tree",
    reorder: "Drag to reorder",
    storageFailed: "Could not save in this browser.",
    storageCorrupt: "Saved navigation data is invalid.",
    refreshFailed: "Could not refresh material.",
    navigationFailed: "Could not open material.",
    repo: "Repository",
    repository: "Repository",
    directory: "Directory",
    file: "File",
    markdown: "Markdown",
    document: "Document",
    class: "Class",
    method: "Method",
    field: "Field",
    symbol: "Symbol",
    resetStorage: "Discard invalid saved navigation data",
    retryStorage: "Retry reading saved navigation data",
    sourceLine: "Line {line}. Use arrow keys to choose; Enter adds a bookmark.",
    searchPrevious: "Previous match",
    searchNext: "Next match",
    searchClear: "Clear query and remove it from history",
    searchCount: "Match {current} of {total}",
    searchInMaterial: "Find in current material",
    searchUnavailable: "No material is open.",
    showActions: "Show information commands",
    hideActions: "Hide information commands",
    historyHold: "Hold to open history",
    linkModeHold: "Hold to set the organization directory",
    organizationRoot: "Organization directory",
    undo: "Undo",
    historyCollect: "Automatically collect history",
    historyShowSettings: "Show history settings",
    historyHideSettings: "Hide history settings",
    historyPolicy: "History policy",
    historyAll: "All visits",
    historyMerge: "Merge consecutive visits",
    historyUnique: "Unique files",
    historyIncludeView: "Include view changes",
    historyLimit: "History limit",
    historyClear: "Clear history",
    bookmarkGroupSelect: "Choose bookmarks",
    bookmarkGroupName: "Name",
    bookmarkGroupCreate: "Create",
    bookmarkGroupRename: "Rename",
    bookmarkGroupDelete: "Delete",
    bookmarkGroupConfirmDelete: "Delete «{name}» and all its bookmarks?",
    bookmarkGroupInvalidName: "Enter a unique name using 1–100 characters without control characters.",
    bookmarkGroupAssign: "Move bookmark",
    bookmarkShowMove: "Show move actions",
    bookmarkShowDelete: "Show delete actions",
    bookmarkExport: "Export selected bookmarks",
    bookmarkImport: "Import bookmarks",
    bookmarksExportAll: "Export all bookmarks",
    bookmarksImportAll: "Import all bookmarks",
    historyExport: "Export history",
    historyImport: "Import history",
    confirmDelete: "Delete",
    cancel: "Cancel",
    jsonExportSelected: "Export «{name}»",
    jsonExportHint: "Copy the JSON below or select its text to copy manually.",
    jsonImportGroupHint: "The name in JSON chooses the destination. An unknown name creates a new destination. Existing bookmark addresses keep their current location.",
    jsonImportBookmarksHint: "Merge matches names and adds new bookmarks. Existing bookmark addresses keep their current location. Replace removes all current bookmarks and names.",
    jsonImportHistoryHint: "This replaces all visits and merges saved search queries. Your current queries stay first, with at most 50 unique queries.",
    jsonMerge: "Merge",
    jsonReplace: "Replace",
    jsonApply: "Import",
    jsonConfirmReplace: "Replace",
    jsonReplaceGroup: "Replace all bookmarks in «{name}»?",
    jsonReplaceBookmarks: "Replace all bookmark names and bookmarks?",
    jsonReplaceHistory: "Replace all visits and merge search queries?",
    jsonField: "JSON",
    jsonCopy: "Copy JSON",
    jsonDone: "Done",
    jsonInvalid: "The text is not valid JSON. Your data has not changed.",
    jsonWrongType: "This JSON belongs to another kind of export. Use the matching import button.",
    jsonUnsupportedVersion: "This JSON export version is not supported.",
    jsonInvalidBookmarks: "Check bookmark names, addresses and reading positions. Names and addresses must not repeat.",
    jsonInvalidHistory: "Check visit addresses, reading positions and the selected visit.",
    jsonInvalidQueries: "Search queries must be a list of at most 50 unique, nonempty strings.",
    jsonTooLarge: "The JSON exceeds the 5 MiB input limit. Your data has not changed.",
    jsonImported: "JSON imported.",
    jsonCopyFailed: "Could not copy. Select the JSON text and copy it manually.",
    historyAddFile: "Add file to history",
    historyRemoveFile: "Remove file from history",
    historyUndoRemoval: "Undo pending removal",
    sourcePinDocumentation: "Default view: documentation",
    sourcePinSource: "Default view: source code",
    sourcePinLast: "Default view: last selected view",
    sourcePinHint: "Choose the view for future file openings",
    historyExcludedRepositories: "Excluded repositories",
    historyNoExcludedRepositories: "No repositories are excluded.",
    historyUnblockRepository: "Allow automatic history",
    historyAllowRepository: "Collect history for this repository",
    historyExcludeRepository: "Exclude this repository from automatic history",
    searchSelection: "Search within file selection",
    searchWholeMaterial: "Search entire material",
    searchCollectingOn: "Query history collection: on",
    searchCollectingOff: "Query history collection: off",
    searchHistory: "File search history",
    catalogSearch: "Search catalogue",
    catalogSearchHistory: "Catalogue search history",
    searchHistoryExport: "Export search history",
    searchHistoryImport: "Import search history",
    searchHistoryInvalid: "The search history JSON is invalid. Your data has not changed.",
    searchHistoryEmpty: "No saved queries.",
    searchHistoryRemove: "Remove query from history",
    searchHistoryHold: "Hold to open query history",
    searchStorageFailed: "Could not save query history in this browser.",
    searchStorageCorrupt: "Saved query history is invalid."
  }
};

// src/common/ui/format-text.mjs
function formatText(template, values) {
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (placeholder, key) => {
    if (!Object.hasOwn(values, key))
      throw new Error(`Missing text value: ${key}`);
    return String(values[key]);
  });
}
// src/common/ui/text.mjs
function navigationTooltip(label, shortcut, holdHint = "") {
  return [label, shortcut, holdHint].filter(Boolean).join(" · ");
}

// src/common/ui/view-utils.mjs
function element(tag, className, text) {
  const item = document.createElement(tag);
  item.className = className;
  if (text !== undefined)
    item.textContent = text;
  return item;
}
function isElement(value) {
  return typeof value === "object" && value !== null && "nodeType" in value && value.nodeType === 1 && "localName" in value;
}
function isHTMLElement(value) {
  return isElement(value) && value.namespaceURI === "http://www.w3.org/1999/xhtml";
}
function isDetails(value) {
  return isHTMLElement(value) && value.localName === "details";
}
function isCommandKey(event, code) {
  return event.code === code && !event.defaultPrevented && !event.repeat && !event.isComposing && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.composedPath().some((node) => isHTMLElement(node) && (node.matches("input, textarea, select") || node.isContentEditable));
}
function displayWindow(node) {
  const owner = node.nodeType === 9 ? node : node.ownerDocument;
  if (!owner?.defaultView)
    throw new Error("The displayed node has no window");
  return owner.defaultView;
}

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

// src/common/ui/icons.mjs
import { html, nothing, render, svg } from "lit";
// src/common/ui/json/control-icons.json
var control_icons_default = {
  controls: {
    back: {
      code: "U+100BF6",
      paths: [
        "M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"
      ],
      evenOdd: true
    },
    "text-smaller": {
      code: null,
      path: "m4 20 6-16 6 16M6 15h8m4-7h5"
    },
    "text-larger": {
      code: null,
      path: "m3 21 7-18 7 18M5.5 15h9m4-7h5m-2.5-2.5v5"
    },
    copy: {
      code: "U+100405",
      paths: [
        "M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"
      ],
      evenOdd: true
    },
    "update-check": {
      code: "U+100BF4",
      path: "M6 9H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2M12 2v13m-4-4 4 4 4-4"
    },
    "update-download": {
      code: "U+100BF5",
      paths: [
        "M3.5 6a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 1 0-1h2A1.5 1.5 0 0 1 14 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-8A1.5 1.5 0 0 1 3.5 5h2a.5.5 0 0 1 0 1z",
        "M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"
      ],
      evenOdd: true
    },
    "source-retry": {
      code: "U+10023E",
      paths: [
        "M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1m-1 4v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 11.293V7.5a.5.5 0 0 1 1 0"
      ]
    },
    "update-success": {
      code: "U+1010A1",
      path: "M4 3h13a2 2 0 0 1 2 2v8M4 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2m-13 0h6m3-7 3 3 5-6"
    },
    up: {
      code: "U+100128",
      paths: [
        "M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5"
      ],
      evenOdd: true
    },
    down: {
      code: "U+100129",
      paths: [
        "M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1"
      ],
      evenOdd: true
    },
    left: {
      code: "U+10012A",
      paths: [
        "M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
      ],
      evenOdd: true
    },
    right: {
      code: "U+10012B",
      paths: [
        "M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"
      ],
      evenOdd: true
    },
    chevron: {
      code: "U+100187",
      paths: [
        "M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"
      ],
      evenOdd: true
    },
    error: {
      code: "U+10005E",
      paths: [
        "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16",
        "M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"
      ]
    },
    sun: {
      code: "U+1001AD",
      paths: [
        "M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"
      ]
    },
    moon: {
      code: "U+1001B9",
      paths: [
        "M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278M4.858 1.311A7.27 7.27 0 0 0 1.025 7.71c0 4.02 3.279 7.276 7.319 7.276a7.32 7.32 0 0 0 5.205-2.162q-.506.063-1.029.063c-4.61 0-8.343-3.714-8.343-8.29 0-1.167.242-2.278.681-3.286"
      ]
    },
    key: {
      code: "U+1007D6",
      paths: [
        "M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1-1-1 1H6.663a3.5 3.5 0 0 1-3.163 2M2.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2"
      ]
    },
    "key-slash": {
      code: "U+102167",
      paths: [
        "M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1-1-1 1H6.663a3.5 3.5 0 0 1-3.163 2M2.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2"
      ]
    },
    passkey: {
      code: "U+101395",
      paths: [
        "M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1-1-1 1H6.663a3.5 3.5 0 0 1-3.163 2M2.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2"
      ]
    },
    "lock-closed": {
      code: "U+1003A1",
      paths: [
        "M8 0a4 4 0 0 1 4 4v2.05a2.5 2.5 0 0 1 2 2.45v5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 13.5v-5a2.5 2.5 0 0 1 2-2.45V4a4 4 0 0 1 4-4m0 1a3 3 0 0 0-3 3v2h6V4a3 3 0 0 0-3-3"
      ],
      evenOdd: true
    },
    "lock-open": {
      code: "U+1003A5",
      paths: [
        "M12 0a4 4 0 0 1 4 4v2.5h-1V4a3 3 0 1 0-6 0v2h.5A2.5 2.5 0 0 1 12 8.5v5A2.5 2.5 0 0 1 9.5 16h-7A2.5 2.5 0 0 1 0 13.5v-5A2.5 2.5 0 0 1 2.5 6H8V4a4 4 0 0 1 4-4"
      ],
      evenOdd: true
    },
    trash: {
      code: "U+100212",
      paths: [
        "M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"
      ]
    },
    keyboard: {
      code: "U+1001F3",
      paths: [
        "M14 5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM2 4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z",
        "M13 10.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm0-2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm-5 0A.25.25 0 0 1 8.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 8 8.75zm2 0a.25.25 0 0 1 .25-.25h1.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25zm1 2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm-5-2A.25.25 0 0 1 6.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 6 8.75zm-2 0A.25.25 0 0 1 4.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 4 8.75zm-2 0A.25.25 0 0 1 2.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 2 8.75zm11-2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm-2 0a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm-2 0A.25.25 0 0 1 9.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 9 6.75zm-2 0A.25.25 0 0 1 7.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 7 6.75zm-2 0A.25.25 0 0 1 5.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 5 6.75zm-3 0A.25.25 0 0 1 2.25 6h1.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-1.5A.25.25 0 0 1 2 6.75zm0 4a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm2 0a.25.25 0 0 1 .25-.25h5.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-5.5a.25.25 0 0 1-.25-.25z"
      ]
    },
    reset: {
      code: "U+100149",
      paths: [
        "M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z",
        "M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"
      ],
      evenOdd: true
    },
    icons: {
      symbol: "gear",
      code: "U+10035F",
      paths: [
        "M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"
      ],
      evenOdd: true
    },
    expand: {
      code: "U+10014A",
      paths: [
        "M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707m4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707m0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707m-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707"
      ],
      evenOdd: true
    },
    contract: {
      code: "U+10014B",
      paths: [
        "M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5m5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5M0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5m10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0z"
      ]
    },
    window: {
      code: "U+1003DC",
      paths: [
        "M2.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1m2-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m1 .5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1",
        "M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm13 2v2H1V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1M2 14a1 1 0 0 1-1-1V6h14v7a1 1 0 0 1-1 1z"
      ]
    },
    code: {
      code: "U+10065A",
      paths: [
        "M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0m6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0"
      ]
    },
    document: {
      code: "U+100237",
      paths: [
        "M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"
      ]
    },
    html: {
      code: "U+10023F",
      paths: [
        "M14 4.5V11h-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zm-9.736 7.35v3.999h-.791v-1.714H1.79v1.714H1V11.85h.791v1.626h1.682V11.85h.79Zm2.251.662v3.337h-.794v-3.337H4.588v-.662h3.064v.662zm2.176 3.337v-2.66h.038l.952 2.159h.516l.946-2.16h.038v2.661h.715V11.85h-.8l-1.14 2.596H9.93L8.79 11.85h-.805v3.999zm4.71-.674h1.696v.674H12.61V11.85h.79v3.325Z"
      ],
      evenOdd: true
    },
    close: {
      code: "U+100184",
      path: "m6 6 12 12M18 6 6 18"
    },
    minus: {
      code: "U+10017D",
      path: "M5 12h14"
    },
    pip: {
      code: "U+100833",
      path: "M3 4h16v10H3ZM12 11h10v10H12Z"
    },
    "pip-enter": {
      code: "U+100468",
      path: "M3 4h17v15H3ZM13 12h9v9h-9M6 7l5 5m-5 0h5V7"
    },
    "pip-exit": {
      code: "U+100467",
      path: "M3 4h17v15H3ZM13 12h9v9h-9M11 12 6 7m0 5V7h5"
    },
    "history-back": {
      code: "U+100C0C",
      paths: [
        "M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"
      ],
      evenOdd: true,
      symbol: "arrow.backward"
    },
    "history-forward": {
      code: "U+100C11",
      paths: [
        "M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"
      ],
      evenOdd: true,
      symbol: "arrow.forward"
    },
    "refresh-file": {
      code: "U+10023D",
      paths: [
        "M8.5 6.5a.5.5 0 0 0-1 0v3.793L6.354 9.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 10.293z",
        "M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"
      ],
      symbol: "arrow.down.document"
    },
    "link-internal": {
      code: "U+100183",
      symbol: "number",
      paths: [
        "M8.39 12.648a1 1 0 0 0-.015.18c0 .305.21.508.5.508.266 0 .492-.172.555-.477l.554-2.703h1.204c.421 0 .617-.234.617-.547 0-.312-.188-.53-.617-.53h-.985l.516-2.524h1.265c.43 0 .618-.227.618-.547 0-.313-.188-.524-.618-.524h-1.046l.476-2.304a1 1 0 0 0 .016-.164.51.51 0 0 0-.516-.516.54.54 0 0 0-.539.43l-.523 2.554H7.617l.477-2.304c.008-.04.015-.118.015-.164a.51.51 0 0 0-.523-.516.54.54 0 0 0-.531.43L6.53 5.484H5.414c-.43 0-.617.22-.617.532s.187.539.617.539h.906l-.515 2.523H4.609c-.421 0-.609.219-.609.531s.188.547.61.547h.976l-.516 2.492c-.008.04-.015.125-.015.18 0 .305.21.508.5.508.265 0 .492-.172.554-.477l.555-2.703h2.242zm-1-6.109h2.266l-.515 2.563H6.859l.532-2.563z"
      ]
    },
    "link-vscode": {
      code: null,
      paths: [
        "M15.434 1.72887L12.14 0.144875C12.002 0.078875 11.855 0.046875 11.709 0.046875C11.353 0.046875 11.18 0.211875 11.155 0.228875C11.073 0.270875 11.005 0.337875 11.004 0.338875L4.698 6.08888L1.951 4.00488C1.832 3.91388 1.69 3.86987 1.548 3.86987C1.387 3.86987 1.226 3.92788 1.1 4.04288L0.219 4.84387C0.074 4.97587 0.001 5.15688 0.001 5.33687C0.001 5.51687 0.073 5.69688 0.218 5.82888L2.6 8.00088L0.217 10.1719C0.072 10.3039 0 10.4839 0 10.6639C0 10.8439 0.073 11.0249 0.218 11.1569L1.099 11.9579C1.226 12.0729 1.386 12.1309 1.547 12.1309C1.688 12.1309 1.83 12.0859 1.95 11.9959L4.697 9.91187L11.003 15.6619C11.003 15.6619 11.072 15.7299 11.155 15.7719C11.179 15.7889 11.353 15.9529 11.709 15.9529C11.855 15.9529 12.003 15.9209 12.141 15.8549L15.435 14.2709C15.781 14.1049 16.001 13.7539 16.001 13.3699V2.62888C16.001 2.24487 15.781 1.89488 15.435 1.72787L15.434 1.72887ZM7.217 7.99988L12.002 4.36987V11.6299L7.217 7.99988Z"
      ]
    },
    "link-github": {
      code: null,
      paths: [
        "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"
      ]
    },
    history: {
      code: "U+100A73",
      paths: [
        "M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2z",
        "M5 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 5 8m0-2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m0 5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-1-5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0M4 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0m0 2.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0"
      ],
      symbol: "list.bullet.rectangle"
    },
    bookmarks: {
      code: "U+10025E",
      paths: [
        "M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"
      ],
      symbol: "bookmark"
    },
    bookmark: {
      code: "U+10025E",
      paths: [
        "M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"
      ],
      symbol: "bookmark"
    },
    search: {
      code: "U+1002AB",
      paths: [
        "M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"
      ],
      symbol: "magnifyingglass"
    },
    "bookmark-added": {
      code: "U+10025F",
      paths: [
        "M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2"
      ],
      symbol: "bookmark.fill"
    },
    "bookmark-remove": {
      code: "U+1007CE",
      paths: [
        "M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2"
      ],
      symbol: "bookmark.slash.fill"
    },
    "bookmarks-list": {
      code: null,
      paths: [
        "M2 3.5C2 3.224 2.224 3 2.5 3H10.5C10.776 3 11 3.224 11 3.5C11 3.776 10.776 4 10.5 4H2.5C2.224 4 2 3.776 2 3.5ZM13.5 6H2.5C2.224 6 2 6.224 2 6.5C2 6.776 2.224 7 2.5 7H13.5C13.776 7 14 6.776 14 6.5C14 6.224 13.776 6 13.5 6ZM9.5 9H2.5C2.224 9 2 9.224 2 9.5C2 9.776 2.224 10 2.5 10H9.5C9.776 10 10 9.776 10 9.5C10 9.224 9.776 9 9.5 9Z",
        "M2.5 12H11.5C11.776 12 12 12.224 12 12.5C12 12.776 11.776 13 11.5 13H2.5C2.224 13 2 12.776 2 12.5C2 12.224 2.224 12 2.5 12Z"
      ]
    },
    "bookmarks-tree": {
      code: null,
      paths: [
        "M2 3.5C2 3.22386 2.22386 3 2.5 3H13.5C13.7761 3 14 3.22386 14 3.5C14 3.77614 13.7761 4 13.5 4H6V6H13.5C13.7761 6 14 6.22386 14 6.5C14 6.77614 13.7761 7 13.5 7H6V9H13.5C13.7761 9 14 9.22386 14 9.5C14 9.77614 13.7761 10 13.5 10H6V12H13.5C13.7761 12 14 12.2239 14 12.5C14 12.7761 13.7761 13 13.5 13H5.5C5.22386 13 5 12.7761 5 12.5V4H2.5C2.22386 4 2 3.77614 2 3.5Z"
      ]
    },
    "search-previous": {
      code: "U+100187",
      paths: [
        "M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"
      ],
      evenOdd: true,
      symbol: "chevron.up"
    },
    "search-next": {
      code: "U+100188",
      paths: [
        "M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"
      ],
      evenOdd: true,
      symbol: "chevron.down"
    },
    "actions-show": {
      code: "U+100192",
      symbol: "chevron.compact.left",
      paths: [
        "M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"
      ],
      evenOdd: true
    },
    "actions-hide": {
      code: "U+100193",
      symbol: "chevron.compact.right",
      paths: [
        "M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
      ],
      evenOdd: true
    },
    "close-info-left": {
      code: null,
      paths: [
        "M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"
      ],
      evenOdd: true
    },
    "close-info-right": {
      code: null,
      paths: [
        "M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
      ],
      evenOdd: true
    },
    infinity: {
      code: "U+100BE0",
      symbol: "infinity",
      paths: [
        "M5.68 5.792 7.345 7.75 5.681 9.708a2.75 2.75 0 1 1 0-3.916ZM8 6.978 6.416 5.113l-.014-.015a3.75 3.75 0 1 0 0 5.304l.014-.015L8 8.522l1.584 1.865.014.015a3.75 3.75 0 1 0 0-5.304l-.014.015zm.656.772 1.663-1.958a2.75 2.75 0 1 1 0 3.916z"
      ]
    },
    "history-add": {
      code: "U+10017C",
      symbol: "plus",
      paths: [
        "M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"
      ]
    },
    "history-subtract": {
      code: "U+10017D",
      symbol: "minus",
      paths: [
        "M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"
      ]
    },
    "source-pin": {
      code: "U+1003A6",
      symbol: "pin",
      paths: [
        "M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A6 6 0 0 1 5 6.708V2.277a3 3 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354m1.58 1.408-.002-.001zm-.002-.001.002.001A.5.5 0 0 1 6 2v5a.5.5 0 0 1-.276.447h-.002l-.012.007-.054.03a5 5 0 0 0-.827.58c-.318.278-.585.596-.725.936h7.792c-.14-.34-.407-.658-.725-.936a5 5 0 0 0-.881-.61l-.012-.006h-.002A.5.5 0 0 1 10 7V2a.5.5 0 0 1 .295-.458 1.8 1.8 0 0 0 .351-.271c.08-.08.155-.17.214-.271H5.14q.091.15.214.271a1.8 1.8 0 0 0 .37.282"
      ]
    },
    "source-pin-last": {
      code: "U+1003A8",
      symbol: "pin.slash",
      paths: [
        "M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A6 6 0 0 1 5 6.708V2.277a3 3 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354m1.58 1.408-.002-.001zm-.002-.001.002.001A.5.5 0 0 1 6 2v5a.5.5 0 0 1-.276.447h-.002l-.012.007-.054.03a5 5 0 0 0-.827.58c-.318.278-.585.596-.725.936h7.792c-.14-.34-.407-.658-.725-.936a5 5 0 0 0-.881-.61l-.012-.006h-.002A.5.5 0 0 1 10 7V2a.5.5 0 0 1 .295-.458 1.8 1.8 0 0 0 .351-.271c.08-.08.155-.17.214-.271H5.14q.091.15.214.271a1.8 1.8 0 0 0 .37.282"
      ]
    },
    "history-allow-repository": {
      code: "U+10087F",
      symbol: "plus.diamond",
      paths: [
        "M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z",
        "M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"
      ]
    },
    "history-exclude-repository": {
      code: "U+100881",
      symbol: "minus.diamond",
      paths: [
        "M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.48 1.48 0 0 1 0-2.098zm1.4.7a.495.495 0 0 0-.7 0L1.134 7.65a.495.495 0 0 0 0 .7l6.516 6.516a.495.495 0 0 0 .7 0l6.516-6.516a.495.495 0 0 0 0-.7L8.35 1.134z",
        "M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"
      ]
    },
    "organization-root-save": {
      code: "U+100A50",
      symbol: "externaldrive.badge.checkmark",
      paths: [
        "M4.5 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M3 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0",
        "M16 11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V9.51c0-.418.105-.83.305-1.197l2.472-4.531A1.5 1.5 0 0 1 4.094 3h7.812a1.5 1.5 0 0 1 1.317.782l2.472 4.53c.2.368.305.78.305 1.198zM3.655 4.26 1.592 8.043Q1.79 8 2 8h12q.21 0 .408.042L12.345 4.26a.5.5 0 0 0-.439-.26H4.094a.5.5 0 0 0-.44.26zM1 10v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1"
      ],
      badgePaths: [
        "M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"
      ]
    },
    "organization-root-reset": {
      code: "U+100A51",
      symbol: "externaldrive.badge.xmark",
      paths: [
        "M4.5 11a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M3 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0",
        "M16 11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V9.51c0-.418.105-.83.305-1.197l2.472-4.531A1.5 1.5 0 0 1 4.094 3h7.812a1.5 1.5 0 0 1 1.317.782l2.472 4.53c.2.368.305.78.305 1.198zM3.655 4.26 1.592 8.043Q1.79 8 2 8h12q.21 0 .408.042L12.345 4.26a.5.5 0 0 0-.439-.26H4.094a.5.5 0 0 0-.44.26zM1 10v1a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1"
      ],
      badgePaths: [
        "M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
      ]
    },
    "search-clear": {
      code: "U+10019B",
      symbol: "delete.left",
      paths: [
        "M5.83 5.146a.5.5 0 0 0 0 .708L7.975 8l-2.147 2.146a.5.5 0 0 0 .707.708l2.147-2.147 2.146 2.147a.5.5 0 0 0 .707-.708L9.39 8l2.146-2.146a.5.5 0 0 0-.707-.708L8.683 7.293 6.536 5.146a.5.5 0 0 0-.707 0z",
        "M13.683 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7.08a2 2 0 0 1-1.519-.698L.241 8.65a1 1 0 0 1 0-1.302L5.084 1.7A2 2 0 0 1 6.603 1zm-7.08 1a1 1 0 0 0-.76.35L1 8l4.844 5.65a1 1 0 0 0 .759.35h7.08a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"
      ]
    },
    "search-collect-on": {
      code: "U+102040",
      symbol: "circle.badge.plus",
      paths: [
        "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"
      ],
      badgePaths: [
        "M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"
      ]
    },
    "search-collect-off": {
      code: "U+102044",
      symbol: "circle.badge.minus",
      paths: [
        "M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"
      ],
      badgePaths: [
        "M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"
      ]
    },
    "search-selection": {
      code: null,
      paths: [
        "M1.5 2.5A1.5 1.5 0 0 1 3 1h10a1.5 1.5 0 0 1 1.5 1.5v3.563a2 2 0 0 1 0 3.874V13.5A1.5 1.5 0 0 1 13 15H3a1.5 1.5 0 0 1-1.5-1.5V9.937a2 2 0 0 1 0-3.874zm1 3.563a2 2 0 0 1 0 3.874V13.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V9.937a2 2 0 0 1 0-3.874V2.5A.5.5 0 0 0 13 2H3a.5.5 0 0 0-.5.5zM2 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2m12 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2",
        "M11.434 4H4.566L4.5 5.994h.386c.21-1.252.612-1.446 2.173-1.495l.343-.011v6.343c0 .537-.116.665-1.049.748V12h3.294v-.421c-.938-.083-1.054-.21-1.054-.748V4.488l.348.01c1.56.05 1.963.244 2.173 1.496h.386z"
      ]
    },
    "xmark.bin": {
      code: "U+100231",
      symbol: "xmark.bin",
      paths: [
        "M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5V5a1 1 0 0 1-1-1zm2 3v7.5A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V5zm13-3H1v2h14z",
        "M 5.3168 6.8168 a 0.4 0.4 0 0 1 0.5664 0 L 8 8.9344 l 2.1168 -2.1176 a 0.4 0.4 0 0 1 0.5664 0.5664 L 8.5656 9.5 l 2.1176 2.1168 a 0.4 0.4 0 0 1 -0.5664 0.5664 L 8 10.0656 l -2.1168 2.1176 a 0.4 0.4 0 0 1 -0.5664 -0.5664 L 7.4344 9.5 L 5.3168 7.3832 a 0.4 0.4 0 0 1 0 -0.5664"
      ]
    },
    archivebox: {
      code: "U+10022D",
      symbol: "archivebox",
      paths: [
        "M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5V5a1 1 0 0 1-1-1zm2 3v7.5A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V5zm13-3H1v2h14zM5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"
      ]
    },
    "square.and.arrow.up": {
      code: "U+100202",
      symbol: "square.and.arrow.up",
      paths: [
        "M3.5 6a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 1 0-1h2A1.5 1.5 0 0 1 14 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-8A1.5 1.5 0 0 1 3.5 5h2a.5.5 0 0 1 0 1z",
        "M7.646.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 1.707V10.5a.5.5 0 0 1-1 0V1.707L5.354 3.854a.5.5 0 1 1-.708-.708z"
      ],
      evenOdd: true
    },
    "square.and.arrow.down": {
      code: "U+100204",
      symbol: "square.and.arrow.down",
      paths: [
        "M3.5 6a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-2a.5.5 0 0 1 0-1h2A1.5 1.5 0 0 1 14 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-8A1.5 1.5 0 0 1 3.5 5h2a.5.5 0 0 1 0 1z",
        "M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"
      ],
      evenOdd: true
    },
    "xmark.square": {
      code: "U+1000F0",
      symbol: "xmark.square",
      paths: [
        "M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z",
        "M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
      ]
    },
    "square.badge.plus": {
      code: "U+101949",
      symbol: "square.badge.plus",
      paths: [
        "M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"
      ],
      badgePaths: [
        "M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"
      ]
    },
    "bookmark.square": {
      code: "U+100F39",
      symbol: "bookmark.square",
      paths: [
        "M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z",
        "M 4.88 4.88 v 7.02 a 0.26 0.26 0 0 0 0.3848 0.22828 L 8 10.63588 l 2.7352 1.4924 A 0.26 0.26 0 0 0 11.12 11.9 V 4.88 a 1.04 1.04 0 0 0 -1.04 -1.04 H 5.92 a 1.04 1.04 0 0 0 -1.04 1.04"
      ]
    },
    "trash.square": {
      code: "U+100F3D",
      symbol: "trash.square",
      paths: [
        "M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z",
        "M 6.7 6.7 A 0.26 0.26 0 0 1 6.96 6.96 v 3.12 a 0.26 0.26 0 0 1 -0.52 0 V 6.96 a 0.26 0.26 0 0 1 0.26 -0.26 m 1.3 0 a 0.26 0.26 0 0 1 0.26 0.26 v 3.12 a 0.26 0.26 0 0 1 -0.52 0 V 6.96 a 0.26 0.26 0 0 1 0.26 -0.26 m 1.56 0.26 a 0.26 0.26 0 0 0 -0.52 0 v 3.12 a 0.26 0.26 0 0 0 0.52 0 z",
        "M 11.38 5.4 a 0.52 0.52 0 0 1 -0.52 0.52 H 10.6 v 4.68 a 1.04 1.04 0 0 1 -1.04 1.04 H 6.44 a 1.04 1.04 0 0 1 -1.04 -1.04 V 5.92 h -0.26 a 0.52 0.52 0 0 1 -0.52 -0.52 V 4.88 a 0.52 0.52 0 0 1 0.52 -0.52 H 6.96 a 0.52 0.52 0 0 1 0.52 -0.52 h 1.04 a 0.52 0.52 0 0 1 0.52 0.52 h 1.82 a 0.52 0.52 0 0 1 0.52 0.52 z M 5.98136 5.92 L 5.92 5.95068 V 10.6 a 0.52 0.52 0 0 0 0.52 0.52 h 3.12 a 0.52 0.52 0 0 0 0.52 -0.52 V 5.95068 L 10.01864 5.92 z M 5.14 5.4 h 5.72 V 4.88 h -5.72 z"
      ]
    },
    "square.and.arrow.up.on.square": {
      code: "U+100206",
      symbol: "square.and.arrow.up.on.square",
      paths: [
        "M 14 5 a 1 1 0 0 1 1 1 v 8 a 1 1 0 0 1 -1 1 h -8 a 1 1 0 0 1 -1 -1 v -1 h -1 v 1 a 2 2 0 0 0 2 2 H 14 a 2 2 0 0 0 2 -2 V 6 a 2 2 0 0 0 -2 -2 h -1 v 1 z",
        "M 4.125 4.5 a 0.375 0.375 0 0 0 -0.375 0.375 v 6 a 0.375 0.375 0 0 0 0.375 0.375 h 6.75 a 0.375 0.375 0 0 0 0.375 -0.375 v -6 a 0.375 0.375 0 0 0 -0.375 -0.375 h -1.5 a 0.375 0.375 0 0 1 0 -0.75 h 1.5 A 1.125 1.125 0 0 1 12 4.875 v 6 a 1.125 1.125 0 0 1 -1.125 1.125 h -6.75 A 1.125 1.125 0 0 1 3 10.875 v -6 A 1.125 1.125 0 0 1 4.125 3.75 h 1.5 a 0.375 0.375 0 0 1 0 0.75 z",
        "M 7.2345 0.1095 a 0.375 0.375 0 0 1 0.531 0 l 2.25 2.25 a 0.375 0.375 0 0 1 -0.531 0.531 L 7.875 1.28025 V 7.875 a 0.375 0.375 0 0 1 -0.75 0 V 1.28025 L 5.5155 2.8905 a 0.375 0.375 0 1 1 -0.531 -0.531 z"
      ],
      evenOdd: true
    },
    "square.and.arrow.down.on.square": {
      code: "U+100208",
      symbol: "square.and.arrow.down.on.square",
      paths: [
        "M 14 5 a 1 1 0 0 1 1 1 v 8 a 1 1 0 0 1 -1 1 h -8 a 1 1 0 0 1 -1 -1 v -1 h -1 v 1 a 2 2 0 0 0 2 2 H 14 a 2 2 0 0 0 2 -2 V 6 a 2 2 0 0 0 -2 -2 h -1 v 1 z",
        "M 4.125 4.5 a 0.375 0.375 0 0 0 -0.375 0.375 v 6 a 0.375 0.375 0 0 0 0.375 0.375 h 6.75 a 0.375 0.375 0 0 0 0.375 -0.375 v -6 a 0.375 0.375 0 0 0 -0.375 -0.375 h -1.5 a 0.375 0.375 0 0 1 0 -0.75 h 1.5 A 1.125 1.125 0 0 1 12 4.875 v 6 a 1.125 1.125 0 0 1 -1.125 1.125 h -6.75 A 1.125 1.125 0 0 1 3 10.875 v -6 A 1.125 1.125 0 0 1 4.125 3.75 h 1.5 a 0.375 0.375 0 0 1 0 0.75 z",
        "M 7.2345 8.8905 a 0.375 0.375 0 0 0 0.531 0 l 2.25 -2.25 a 0.375 0.375 0 0 0 -0.531 -0.531 L 7.875 7.71975 V 1.125 a 0.375 0.375 0 0 0 -0.75 0 v 6.59475 L 5.5155 6.1095 a 0.375 0.375 0 1 0 -0.531 0.531 z"
      ],
      evenOdd: true
    },
    "square.and.pencil": {
      code: "U+10020E",
      symbol: "square.and.pencil",
      paths: [
        "M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z",
        "M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"
      ],
      evenOdd: true
    },
    "tray.and.arrow.up": {
      code: "U+100225",
      symbol: "tray.and.arrow.up",
      paths: [
        "M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5",
        "M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"
      ]
    },
    "tray.and.arrow.down": {
      code: "U+100227",
      symbol: "tray.and.arrow.down",
      paths: [
        "M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5",
        "M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"
      ]
    }
  }
};

// src/common/ui/icons.mjs
var controls = control_icons_default.controls;
function controlIcon(name) {
  const icon = controls[name];
  const cssName = name.replaceAll(".", "-");
  const key = name === "key" || name === "key-slash";
  const filled = "paths" in icon;
  const paths = filled ? icon.paths : [icon.path];
  const native = icon.code === null ? nothing : html`
        <svg
          class       = "sf-glyph"
          viewBox     = "0 0 100 100"
        >
          <text
            x = "0"
            y = "0"
          >${String.fromCodePoint(Number.parseInt(icon.code.slice(2), 16))}</text>
        </svg>
      `;
  const badge = "badgePaths" in icon ? svg`
        <circle
          cx   = "11.3"
          cy   = "11.3"
          r    = "4.7"
          fill = "var(--bar)"
        ></circle>
        <g
          transform = "translate(6.7 6.7) scale(.58)"
        >
          ${icon.badgePaths.map((path) => svg`
            <path
              d = ${path}
            ></path>
          `)}
        </g>
      ` : nothing;
  const slash = name === "key-slash" || name === "bookmark-remove" || name === "source-pin-last" ? svg`
        <path
          d            = "M1.5 1.5 14.5 14.5"
          fill         = "none"
          stroke       = "var(--bar)"
          stroke-width = "2.2"
        ></path>
        <path
          d            = "M1.5 1.5 14.5 14.5"
          fill         = "none"
          stroke       = "currentColor"
          stroke-width = "1.2"
        ></path>
      ` : nothing;
  return html`
    <span
      class       = "control-icon"
      aria-hidden = "true"
      style       = ${`
        --native-display:var(--sf-${cssName},none);
        --fallback-display:var(--svg-${cssName},block);
        --native-size:var(--sf-${cssName}-size,100px);
        --native-x:var(--sf-${cssName}-x,0px);
        --native-y:var(--sf-${cssName}-y,0px)
      `}
    >${native}<svg
        class   = ${`svg-glyph${filled ? " filled-glyph" : ""}${key ? " key-glyph" : ""}`}
        viewBox = ${filled ? "0 0 16 16" : "0 0 24 24"}
      >
        ${paths.map((path) => svg`
            <path
              d         = ${path}
              fill-rule = ${"evenOdd" in icon && icon.evenOdd ? "evenodd" : nothing}
            ></path>
          `)}
        ${badge}${slash}</svg></span>
  `;
}
function renderControlIcons(root) {
  for (const slot of root.querySelectorAll("[data-control]")) {
    if (!isHTMLElement(slot))
      continue;
    const name = slot.getAttribute("data-control");
    if (name && Object.hasOwn(controls, name))
      render(controlIcon(name), slot);
  }
}
async function enableSystemSymbols(owner) {
  if (owner.documentElement.dataset.systemSymbols)
    return;
  owner.documentElement.dataset.systemSymbols = "loading";
  const view = displayWindow(owner);
  try {
    const face = new view.FontFace("Hxape System Symbols", 'local("SFProDisplay-Regular"), local("SF Pro Display Regular")');
    await face.load();
    if (view.closed)
      return;
    owner.fonts.add(face);
    const canvas = owner.createElement("canvas");
    canvas.width = canvas.height = 80;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error("Glyph raster is unavailable");
    const raster = (font, glyph) => {
      context.clearRect(0, 0, 80, 80);
      context.font = `40px ${font}`;
      context.fillText(glyph, 10, 58);
      return context.getImageData(0, 0, 80, 80).data;
    };
    const equal = (a, b) => a.every((value, index) => value === b[index]);
    const sample = owner.createElementNS("http://www.w3.org/2000/svg", "svg");
    const sampleText = owner.createElementNS("http://www.w3.org/2000/svg", "text");
    sample.setAttribute("style", "position:absolute;left:-10000px;top:0;width:100px;height:100px;overflow:visible;visibility:hidden");
    sampleText.setAttribute("style", "font:100px 'Hxape System Symbols'");
    sample.append(sampleText);
    owner.body.append(sample);
    let available = 0;
    try {
      for (const [name, icon] of Object.entries(controls)) {
        if (icon.code === null)
          continue;
        const cssName = name.replaceAll(".", "-");
        const glyph = String.fromCodePoint(Number.parseInt(icon.code.slice(2), 16));
        const native = raster('"Hxape System Symbols", monospace', glyph);
        if (!native.some(Boolean) || !equal(native, raster('"Hxape System Symbols", serif', glyph)) || equal(native, raster("monospace", glyph)) || equal(native, raster("serif", glyph)))
          continue;
        sampleText.textContent = glyph;
        const bounds = sampleText.getBBox();
        if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0)
          continue;
        const scale = 82 / Math.max(bounds.width, bounds.height);
        owner.documentElement.style.setProperty(`--sf-${cssName}-size`, `${100 * scale}px`);
        owner.documentElement.style.setProperty(`--sf-${cssName}-x`, `${(100 - bounds.width * scale) / 2 - bounds.x * scale}px`);
        owner.documentElement.style.setProperty(`--sf-${cssName}-y`, `${(100 - bounds.height * scale) / 2 - bounds.y * scale}px`);
        owner.documentElement.style.setProperty(`--sf-${cssName}`, "block");
        owner.documentElement.style.setProperty(`--svg-${cssName}`, "none");
        available++;
      }
    } finally {
      sample.remove();
    }
    owner.documentElement.dataset.systemSymbols = available ? "ready" : "unavailable";
  } catch {
    owner.documentElement.dataset.systemSymbols = "unavailable";
  }
}
// src/bloc/catalog/json/rules.json
var rules_default = {
  documentTypes: ["README", "CONTRIBUTING", "AGENTS", "LICENSE"],
  directoryDocumentTypes: ["README", "AGENTS"],
  navigationKeys: {
    KeyW: "ArrowUp",
    KeyS: "ArrowDown",
    KeyA: "ArrowLeft",
    KeyD: "ArrowRight"
  },
  captionAttributes: ["data-directory-name", "data-directory-path", "data-file-path", "data-symbol-path"],
  captionTags: ["span", "mark", "b", "i", "strong", "em", "code", "small", "s", "u", "a"],
  captionLinkAttributes: ["href", "title"]
};

// src/bloc/catalog/model.mjs
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
var documentTypes = Object.freeze([...rules_default.documentTypes]);
var directoryDocumentTypes = Object.freeze([...rules_default.directoryDocumentTypes]);
var noDocuments = Object.freeze(Object.fromEntries(documentTypes.map((type) => [type, false])));
var navigationKeys = Object.freeze(rules_default.navigationKeys);
function repositoryPath(...paths) {
  return paths.flatMap((path) => path.split("/")).filter((part) => part && part !== ".").join("/");
}
function encodedPath(path) {
  return repositoryPath(path).split("/").map(encodeURIComponent).join("/");
}
function filterDocuments(documents, permissions, types = documentTypes) {
  if (!isRecord(documents))
    throw new Error("Document metadata is missing");
  const result = {};
  for (const type of types) {
    if (!Object.hasOwn(documents, type))
      continue;
    const document2 = documents[type];
    if (!isRecord(document2) || typeof document2.path !== "string" || !document2.path || typeof document2.format !== "string" || !["markdown", "text"].includes(document2.format))
      throw new Error("Invalid document metadata");
    result[type] = { path: document2.path, format: document2.format };
    if (permissions[type] && typeof document2.content === "string")
      result[type].content = document2.content;
  }
  return result;
}
function limitNodes(nodes, policy) {
  if (!Array.isArray(nodes))
    throw new Error("Invalid outline nodes");
  const { level } = policy;
  const result = [];
  for (const node of nodes) {
    if (!isRecord(node) || typeof node.type !== "string" || !["directory", "file", "symbol"].includes(node.type)) {
      throw new Error("Invalid node type");
    }
    if (level === 1 && node.type !== "directory" || level === 2 && node.type === "symbol")
      continue;
    if (typeof node.name !== "string" || !Array.isArray(node.children) || node.type !== "symbol" && typeof node.path !== "string")
      throw new Error("Invalid outline node");
    const entry = node.type === "symbol" ? { type: "symbol", name: node.name, children: [] } : node.type === "directory" ? {
      type: "directory",
      name: node.name,
      path: node.path,
      children: [],
      documents: filterDocuments(node.documents, policy.documents, directoryDocumentTypes)
    } : { type: "file", name: node.name, path: node.path, children: [] };
    if (node.type === "directory" || level >= 3)
      entry.children = limitNodes(node.children, policy);
    if (level >= 3) {
      if (typeof node.doc === "string")
        entry.doc = node.doc;
      if (typeof node.kind === "string")
        entry.kind = node.kind;
      if (typeof node.line === "number" && Number.isInteger(node.line) && node.line > 0)
        entry.line = node.line;
    }
    result.push(entry);
  }
  return result;
}
function readPolicy(defaults, entry = {}) {
  if (!isRecord(entry))
    throw new Error("Invalid repository settings");
  const policy = { ...defaults, ...entry };
  if (typeof policy.private !== "boolean" || typeof policy.level !== "number" || !Number.isInteger(policy.level) || policy.level < 0 || policy.level > 4 || typeof policy.branch !== "string" || !/^[a-z\d][a-z\d._/-]{0,99}$/i.test(policy.branch) || policy.branch.includes("..") || policy.branch.includes("//") || policy.branch.endsWith("/") || policy.branch.endsWith(".") || policy.branch.split("/").some((part) => part.startsWith(".") || part.endsWith(".lock")) || entry.documents !== undefined && !isRecord(entry.documents)) {
    throw new Error("Invalid access settings");
  }
  const documentSettings = isRecord(entry.documents) ? entry.documents : {};
  const documents = { ...noDocuments };
  for (const type of documentTypes) {
    const value = documentSettings[type];
    if (Object.hasOwn(documentSettings, type) && typeof value !== "boolean") {
      throw new Error("Invalid document permissions");
    }
    documents[type] = typeof value === "boolean" ? value : defaults.documents[type];
  }
  return { private: policy.private, branch: policy.branch, level: policy.level, documents };
}
function githubLocation(value) {
  const url = new URL(value);
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.origin !== "https://github.com" || parts.length !== 2 || url.search || url.hash) {
    throw new Error("Invalid GitHub repository");
  }
  return {
    url: `${url.origin}/${parts.join("/")}`,
    api: `https://api.github.com/repos/${parts.map(encodeURIComponent).join("/")}`
  };
}
function readSnapshot(name, fallbackUrl, data, policy, library, privateSource) {
  if (!isRecord(data))
    throw new Error("Invalid repository snapshot");
  const value = data;
  if (value.repository !== name || typeof value.root !== "string" || !library && !value.root || !Array.isArray(value.children)) {
    throw new Error("Invalid repository snapshot");
  }
  if (library && (value.version !== library.version || value.root !== library.root || value.ref !== library.ref)) {
    throw new Error("Library catalogue and outline do not match");
  }
  const visiblePolicy = privateSource ? { ...policy, level: 3, documents: { README: true, CONTRIBUTING: true, AGENTS: true, LICENSE: true } } : policy;
  return {
    url: library?.url || (typeof value.url === "string" && value.url.startsWith("https://github.com/") ? value.url.replace(/\/+$/, "") : fallbackUrl),
    ref: library?.ref || policy.branch,
    root: library ? library.root : value.root,
    level: visiblePolicy.level,
    privateSource,
    documents: library ? {} : filterDocuments(value.documents, visiblePolicy.documents),
    children: visiblePolicy.level > 0 ? limitNodes(value.children, library ? { ...policy, documents: noDocuments } : visiblePolicy) : []
  };
}
// src/common/network/json/source-limits.json
var source_limits_default = {
  maxSourceBytes: 1048576,
  maxMetadataBytes: 65536,
  privateRequest: {
    maxChecksumBytes: 256,
    maxSnapshotBytes: 4194304,
    maxDocumentBytes: 1048576,
    maxErrorBytes: 4096,
    maxJsonBytes: 2097152
  },
  publicCache: {
    maxEntries: 8,
    maxBytes: 4194304,
    ttlMs: 120000
  },
  privateCache: {
    maxEntries: 8,
    maxBytes: 4194304,
    ttlMs: 120000
  }
};

// src/common/network/text-cache.mjs
class TextCache {
  #entries = new Map;
  #usedBytes = 0;
  #maxEntries;
  #maxBytes;
  #ttlMs;
  #encoder = new TextEncoder;
  constructor({ maxEntries, maxBytes, ttlMs }) {
    if (![maxEntries, maxBytes, ttlMs].every((value) => Number.isSafeInteger(value) && value > 0)) {
      throw new TypeError("Text cache limits must be positive integers.");
    }
    this.#maxEntries = maxEntries;
    this.#maxBytes = maxBytes;
    this.#ttlMs = ttlMs;
  }
  get(key) {
    const entry = this.#entries.get(key);
    if (!entry)
      return;
    if (entry.expiresAt <= Date.now()) {
      this.#remove(key);
      return;
    }
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    return entry.text;
  }
  set(key, text) {
    if (typeof key !== "string" || typeof text !== "string") {
      throw new TypeError("Text cache accepts string keys and values.");
    }
    this.#remove(key);
    const bytes = this.#encoder.encode(text).byteLength;
    if (bytes > this.#maxBytes)
      return;
    const now = Date.now();
    for (const [saved, entry] of this.#entries)
      if (entry.expiresAt <= now)
        this.#remove(saved);
    while (this.#entries.size >= this.#maxEntries || this.#usedBytes + bytes > this.#maxBytes) {
      const oldest = this.#entries.keys().next().value;
      if (oldest === undefined)
        break;
      this.#remove(oldest);
    }
    this.#entries.set(key, { text, bytes, expiresAt: now + this.#ttlMs });
    this.#usedBytes += bytes;
  }
  clear() {
    this.#entries.clear();
    this.#usedBytes = 0;
  }
  #remove(key) {
    const entry = this.#entries.get(key);
    if (!entry)
      return;
    this.#usedBytes -= entry.bytes;
    this.#entries.delete(key);
  }
}

// src/bloc/catalog/public-source.mjs
var MAX_SOURCE_BYTES = source_limits_default.maxSourceBytes;
var publicSources = new TextCache(source_limits_default.publicCache);
function tooLarge() {
  return Object.assign(new Error("Source file is too large."), { code: "source-too-large" });
}
function safePath(value) {
  return typeof value === "string" && value.endsWith(".hx") && value.length <= 1024 && !value.split("/").some((part) => !part || part === "." || part === ".." || /[\\\u0000-\u001f]/.test(part));
}
function safeRef(value) {
  return typeof value === "string" && /^[a-z\d][a-z\d._/-]{0,99}$/i.test(value) && !value.includes("..") && !value.includes("//") && !value.endsWith("/") && !value.endsWith(".") && !value.split("/").some((part) => part.startsWith(".") || part.endsWith(".lock"));
}
function githubRepository(value) {
  const url = new URL(value);
  const match = url.pathname.match(/^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/);
  if (url.origin !== "https://github.com" || url.username || url.password || url.search || url.hash || !match) {
    throw new Error("Invalid GitHub repository.");
  }
  return { owner: match[1], repository: match[2] };
}
async function readBytes(response, limit) {
  const length = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(length) && length > limit)
    throw tooLarge();
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limit)
      throw tooLarge();
    return bytes;
  }
  const reader = response.body.getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        break;
      size += value.byteLength;
      if (size > limit)
        throw tooLarge();
      parts.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}
function loadPublicSourceFile2(source, signal, { refresh = false } = {}) {
  if (!safePath(source.path) || typeof source.library !== "boolean" || source.private) {
    throw new Error("Invalid source path.");
  }
  const { owner, repository } = githubRepository(source.url);
  return withinRequestTime(async (requestSignal) => {
    let ref = source.ref;
    if (source.library) {
      const metadataUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
      const response = await fetch(metadataUrl, {
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        headers: { Accept: "application/vnd.github+json" },
        signal: requestSignal
      });
      if (!response.ok)
        throw new Error(`GitHub repository request failed: HTTP ${response.status}`);
      const metadata = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readBytes(response, source_limits_default.maxMetadataBytes)));
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || !("default_branch" in metadata) || typeof metadata.default_branch !== "string")
        throw new Error("GitHub returned an invalid branch.");
      ref = metadata.default_branch;
    }
    if (!safeRef(ref))
      throw new Error("GitHub returned an invalid branch.");
    const key = JSON.stringify([owner, repository, ref, source.path]);
    const cached = refresh ? undefined : publicSources.get(key);
    if (cached !== undefined)
      return { content: cached, ref };
    const path = source.path.split("/").map(encodeURIComponent).join("/");
    const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/${encodeURIComponent(ref)}/${path}`;
    const response = await fetch(url, {
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: requestSignal
    });
    if (!response.ok || response.headers.get("Content-Type")?.toLowerCase().startsWith("text/html")) {
      throw new Error(`GitHub source request failed: HTTP ${response.status}`);
    }
    const content = new TextDecoder("utf-8", { fatal: true }).decode(await readBytes(response, MAX_SOURCE_BYTES));
    if (requestSignal.aborted)
      throw requestSignal.reason ?? new DOMException("Request cancelled.", "AbortError");
    publicSources.set(key, content);
    return { content, ref };
  }, { timeout: 20000, signal });
}
// src/auth/github/json/octocat.json
var octocat_default = {
  protocol: 1,
  name: "octocat",
  output: "public/js/octocat.mjs",
  apiVersion: "2022-11-28",
  sessionStorageKey: "github-octocat-session-v1",
  autoRestoreStorageKey: "github-octocat-auto-restore",
  dedicatedSessionMarkerKey: "github-octocat-dedicated-active-v1",
  helloTimeoutMs: 3000,
  requestTimeoutMs: 25000,
  cryptoTimeoutMs: 60000,
  renewTimeoutMs: 3000,
  workerRequestTimeoutMs: 20000,
  stageTtlMs: 30000,
  reloadGraceMs: 30000,
  maxStages: 8
};

// src/auth/github/session-client.mjs
var VERSION = octocat_default.protocol;
var WORKER_URL = octocat_default.output;
var SESSION_KEY = octocat_default.sessionStorageKey;
var OCTOCAT_AUTO_RESTORE_KEY = octocat_default.autoRestoreStorageKey;
var LEGACY_PASSKEY_ON_OPEN_KEY = "github-passkey-on-open";
var FETCH_TIMEOUT = octocat_default.requestTimeoutMs;
var CRYPTO_TIMEOUT = octocat_default.cryptoTimeoutMs;
function octocatAutoRestoreEnabled() {
  try {
    const current = localStorage.getItem(OCTOCAT_AUTO_RESTORE_KEY);
    const previous = localStorage.getItem(LEGACY_PASSKEY_ON_OPEN_KEY);
    if (current !== null) {
      if (previous !== null) {
        try {
          localStorage.removeItem(LEGACY_PASSKEY_ON_OPEN_KEY);
        } catch {}
      }
      return current !== "false";
    }
    if (previous !== null) {
      const enabled = previous !== "false";
      try {
        localStorage.setItem(OCTOCAT_AUTO_RESTORE_KEY, String(enabled));
        localStorage.removeItem(LEGACY_PASSKEY_ON_OPEN_KEY);
      } catch {}
      return enabled;
    }
    return localStorage.getItem(OCTOCAT_AUTO_RESTORE_KEY) !== "false";
  } catch {
    return true;
  }
}
function responseObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(ui_strings_default.access.accessChanged);
  return value;
}
function responseEntry(value) {
  const entry = responseObject(value);
  if (typeof entry.id !== "string" || typeof entry.label !== "string" || typeof entry.login !== "string" || typeof entry.storage !== "string" || ["addedAt", "credentialId", "prfSalt"].some((key) => entry[key] !== undefined && typeof entry[key] !== "string")) {
    throw new Error(ui_strings_default.access.accessChanged);
  }
  return entry;
}
function responseRecord(value) {
  const record = responseObject(value);
  if (typeof record.id !== "string" || typeof record.storage !== "string" || typeof record.iv !== "string" || typeof record.ciphertext !== "string" || ["salt", "addedAt", "credentialId", "prfSalt"].some((key) => record[key] !== undefined && typeof record[key] !== "string")) {
    throw new Error(ui_strings_default.access.accessChanged);
  }
  return record;
}
function responseHandle(value) {
  if (value !== null && typeof value !== "string")
    throw new Error(ui_strings_default.access.accessChanged);
  return value;
}

class GithubSessionClient extends EventTarget {
  #worker = null;
  #port = null;
  #mode = null;
  #connecting = null;
  #pending = new Map;
  #nextId = 0;
  #generation = 0;
  #connected = false;
  #leaving = false;
  #renewPending = null;
  #state = "ready";
  #activeId = null;
  #handle = null;
  #hadDedicatedSession = false;
  constructor() {
    super();
    if (!this.compatible)
      this.#state = "unavailable";
    try {
      this.#handle = sessionStorage.getItem(SESSION_KEY);
    } catch {}
    try {
      this.#hadDedicatedSession = sessionStorage.getItem(octocat_default.dedicatedSessionMarkerKey) === "true";
      sessionStorage.removeItem(octocat_default.dedicatedSessionMarkerKey);
    } catch {}
    window.addEventListener("pagehide", (event) => {
      this.#leaving = true;
      if (this.#connected)
        this.#fire("release", { persisted: event.persisted === true });
      if (!this.#activeId)
        this.#saveHandle(this.#handle, false);
    });
    window.addEventListener("pageshow", () => {
      this.#leaving = false;
      if (this.#state === "lost")
        this.dispatchEvent(new Event("lost"));
      else if (this.#connected)
        this.renew().catch(() => {});
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.#connected)
        this.renew().catch(() => {});
    });
  }
  get compatible() {
    return Boolean(globalThis.SharedWorker || globalThis.Worker);
  }
  get mode() {
    return this.#mode;
  }
  get handle() {
    return this.#handle;
  }
  get hadDedicatedSession() {
    return this.#hadDedicatedSession;
  }
  get state() {
    return this.#state;
  }
  get status() {
    return { phase: this.#state, mode: this.#mode, active: Boolean(this.#activeId) };
  }
  #setState(state, force = false) {
    if (this.#state === state && !force)
      return;
    this.#state = state;
    this.dispatchEvent(new Event("state-change"));
  }
  #saveHandle(handle, persist = Boolean(this.#activeId)) {
    this.#handle = typeof handle === "string" && handle ? handle : null;
    try {
      if (this.#handle && persist)
        sessionStorage.setItem(SESSION_KEY, this.#handle);
      else
        sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }
  #saveDedicatedMarker() {
    try {
      if (this.#mode === "dedicated" && this.#activeId) {
        sessionStorage.setItem(octocat_default.dedicatedSessionMarkerKey, "true");
      } else
        sessionStorage.removeItem(octocat_default.dedicatedSessionMarkerKey);
    } catch {}
  }
  #close(reason, notify = true) {
    const error = reason instanceof Error ? reason : new Error(ui_strings_default.access.accessChanged);
    const wasConnected = this.#connected;
    if (wasConnected && !this.#leaving && this.#port) {
      try {
        this.#port.postMessage({ v: VERSION, id: ++this.#nextId, op: "release", payload: { persisted: false } });
      } catch {}
    }
    for (const [id, pending] of this.#pending) {
      clearTimeout(pending.timer);
      if (pending.signal && pending.abort)
        pending.signal.removeEventListener("abort", pending.abort);
      pending.reject(error);
      this.#pending.delete(id);
    }
    if (this.#mode === "shared")
      this.#port?.close();
    if (this.#mode === "dedicated")
      this.#worker?.terminate();
    this.#port = this.#worker = null;
    this.#mode = null;
    this.#activeId = null;
    ++this.#generation;
    this.#connected = false;
    if (wasConnected) {
      if (!this.#leaving)
        this.#saveHandle(null);
      this.#setState(notify ? "lost" : "ready");
      if (notify && !this.#leaving)
        this.dispatchEvent(new Event("lost"));
    }
  }
  #receive(event, generation) {
    if (generation !== this.#generation)
      return;
    const reply = event.data && typeof event.data === "object" && !Array.isArray(event.data) ? event.data : null;
    if (reply?.v === VERSION && reply.event === "handle-rotated") {
      if (typeof reply.handle !== "string" && reply.handle !== null || typeof reply.activeId !== "string" && reply.activeId !== null) {
        this.#close(new Error(ui_strings_default.access.accessChanged));
        return;
      }
      this.#activeId = reply.activeId;
      this.#saveHandle(reply.handle);
      this.#setState("connected", true);
      return;
    }
    if (reply?.v !== VERSION || typeof reply.id !== "number" || !Number.isSafeInteger(reply.id)) {
      this.#close(new Error(ui_strings_default.access.accessChanged));
      return;
    }
    const pending = this.#pending.get(reply.id);
    if (!pending)
      return;
    this.#pending.delete(reply.id);
    clearTimeout(pending.timer);
    if (pending.signal && pending.abort)
      pending.signal.removeEventListener("abort", pending.abort);
    if (reply.ok === true) {
      pending.resolve(reply.result);
      return;
    }
    const rawError = reply.error && typeof reply.error === "object" && !Array.isArray(reply.error) ? reply.error : {};
    const response = {
      code: typeof rawError.code === "string" ? rawError.code : undefined,
      status: typeof rawError.status === "number" ? rawError.status : undefined,
      denied: rawError.denied === true,
      rateLimited: rawError.rateLimited === true,
      detail: typeof rawError.detail === "string" ? rawError.detail : undefined
    };
    const error = new Error(this.#errorMessage(response));
    Object.assign(error, response);
    pending.reject(error);
    if (response.code === "session-lost")
      this.#close(error);
  }
  #errorMessage(error) {
    if (error.code === "github-denied")
      return ui_strings_default.githubRequest.denied;
    if (error.code === "token-rejected")
      return ui_strings_default.githubRequest.tokenRejected;
    if (error.code === "rate-limited")
      return ui_strings_default.githubRequest.rateLimited;
    if (error.code === "github-failed")
      return formatText(ui_strings_default.githubRequest.failed, { status: error.status || 0 });
    if (error.code === "timeout")
      return ui_strings_default.githubRequest.timeout;
    if (error.code === "session-lost" || error.code === "protocol-mismatch")
      return ui_strings_default.access.accessChanged;
    if (error.code === "duplicate-token")
      return ui_strings_default.access.duplicateToken;
    if (error.code === "unlock-failed")
      return ui_strings_default.access.unlockFailed;
    if (error.code === "invalid-record")
      return ui_strings_default.storage.invalidToken;
    if (error.code === "invalid-token")
      return ui_strings_default.access.invalidTokenDetails;
    if (error.code === "stage-expired")
      return ui_strings_default.access.setupChanged;
    if (error.code === "invalid-repository")
      return ui_strings_default.access.invalidRepository;
    if (error.code === "invalid-ref")
      return ui_strings_default.access.invalidBranch;
    if (error.code === "invalid-path")
      return ui_strings_default.githubRequest.invalidPath;
    if (error.code === "invalid-file")
      return ui_strings_default.githubRequest.invalidFile;
    if (error.code === "response-too-large")
      return ui_strings_default.githubRequest.responseTooLarge;
    return ui_strings_default.access.privateRequestFailed;
  }
  #fire(op, payload = {}) {
    if (!this.#port)
      return;
    try {
      this.#port.postMessage({ v: VERSION, id: ++this.#nextId, op, payload });
    } catch {
      this.#close(new Error(ui_strings_default.access.accessChanged));
    }
  }
  #send(op, payload, { timeout = FETCH_TIMEOUT, transfer = [], signal } = {}) {
    const port = this.#port;
    if (!port)
      return Promise.reject(new Error(ui_strings_default.access.accessChanged));
    if (signal?.aborted)
      return Promise.reject(signal.reason ?? new DOMException("Request cancelled.", "AbortError"));
    const id = ++this.#nextId;
    return new Promise((resolve, reject) => {
      const abort = () => {
        const pending = this.#pending.get(id);
        if (!pending)
          return;
        this.#pending.delete(id);
        clearTimeout(pending.timer);
        signal?.removeEventListener("abort", abort);
        reject(signal?.reason ?? new DOMException("Request cancelled.", "AbortError"));
        this.#fire("cancel", { id });
      };
      const timer = window.setTimeout(() => {
        this.#close(new Error(ui_strings_default.githubRequest.timeout));
      }, timeout);
      this.#pending.set(id, { resolve, reject, timer, signal, abort });
      signal?.addEventListener("abort", abort, { once: true });
      try {
        port.postMessage({ v: VERSION, id, op, payload }, transfer);
      } catch (error) {
        for (const item of transfer)
          if (item instanceof ArrayBuffer && item.byteLength)
            new Uint8Array(item).fill(0);
        this.#close(error);
      }
    });
  }
  async#open(mode) {
    const url = new URL(WORKER_URL, document.baseURI).href;
    const worker = mode === "shared" ? new SharedWorker(url, {
      name: octocat_default.name,
      type: "classic",
      extendedLifetime: true
    }) : new Worker(url, { type: "classic" });
    const port = mode === "shared" ? worker.port : worker;
    this.#worker = worker;
    this.#port = port;
    this.#mode = mode;
    const generation = ++this.#generation;
    port.addEventListener("message", (event) => {
      if ("data" in event)
        this.#receive(event, generation);
    });
    port.addEventListener("messageerror", () => {
      if (generation === this.#generation)
        this.#close(new Error(ui_strings_default.access.accessChanged));
    });
    worker.addEventListener("error", () => {
      if (generation === this.#generation)
        this.#close(new Error(ui_strings_default.access.accessChanged));
    });
    if (mode === "shared")
      port.start();
    try {
      const hello = responseObject(await this.#send("hello", { handle: this.#handle }, { timeout: octocat_default.helloTimeoutMs }));
      if (hello.mode !== mode)
        throw new Error(ui_strings_default.access.accessChanged);
      this.#connected = true;
      this.#saveHandle(responseHandle(hello.handle));
      this.#saveDedicatedMarker();
      this.#setState("connected");
      return mode;
    } catch (error) {
      this.#close(error);
      throw error;
    }
  }
  connect(reconnecting = false) {
    if (this.#connected && this.#mode)
      return Promise.resolve(this.#mode);
    if (this.#connecting)
      return this.#connecting;
    this.#setState(reconnecting ? "reconnecting" : "connecting");
    this.#connecting = (async () => {
      if (globalThis.SharedWorker) {
        try {
          return await this.#open("shared");
        } catch {}
      }
      if (globalThis.Worker)
        return this.#open("dedicated");
      throw new Error(ui_strings_default.access.workerUnavailable);
    })().catch((error) => {
      this.#setState("unavailable");
      throw error;
    }).finally(() => {
      this.#connecting = null;
    });
    return this.#connecting;
  }
  async restart() {
    if (this.#connecting) {
      try {
        await this.#connecting;
      } catch {}
    }
    if (this.#connected && this.#mode)
      return this.#mode;
    return this.connect(true);
  }
  async#request(op, payload = {}, options = {}) {
    await this.connect();
    return this.#send(op, payload, options);
  }
  async resume() {
    const result = await this.#request("resume");
    if (!result)
      this.#saveHandle(null);
    if (!result)
      return null;
    const candidate = responseObject(result);
    if (typeof candidate.ciphertext !== "string")
      throw new Error(ui_strings_default.access.accessChanged);
    return { entry: responseEntry(candidate.entry), ciphertext: candidate.ciphertext };
  }
  async abandonResume() {
    this.#saveHandle(null);
    if (!this.#connected)
      return;
    await this.#send("abandon-resume", {}, { timeout: octocat_default.helloTimeoutMs });
    this.#close(new Error(ui_strings_default.access.accessChanged), false);
  }
  async resumeConfirm(id, ciphertext) {
    const result = responseObject(await this.#request("resume-confirm", { id, ciphertext }));
    const entry = responseEntry(result.entry);
    this.#activeId = entry.id;
    this.#saveHandle(responseHandle(result.handle));
    this.#saveDedicatedMarker();
    this.#setState("connected", true);
    return entry;
  }
  async stageAdd(entry, token, password, material) {
    await this.connect();
    const secret = this.#secret(password, material);
    const result = responseObject(await this.#send("stage-add", { entry, token, ...secret.payload }, {
      timeout: CRYPTO_TIMEOUT,
      transfer: secret.transfer
    }));
    if (typeof result.stageId !== "string")
      throw new Error(ui_strings_default.access.accessChanged);
    return { stageId: result.stageId, record: responseRecord(result.record), entry: responseEntry(result.entry) };
  }
  async stageUnlock(record, password, material) {
    await this.connect();
    const secret = this.#secret(password, material);
    const result = responseObject(await this.#send("stage-unlock", { record, ...secret.payload }, {
      timeout: CRYPTO_TIMEOUT,
      transfer: secret.transfer
    }));
    if (typeof result.stageId !== "string")
      throw new Error(ui_strings_default.access.accessChanged);
    return { stageId: result.stageId, entry: responseEntry(result.entry) };
  }
  #secret(password, material) {
    if (material)
      return { payload: { material }, transfer: [material.buffer] };
    const passwordBytes = new TextEncoder().encode(password);
    return { payload: { passwordBytes }, transfer: [passwordBytes.buffer] };
  }
  async activate(stageId, ciphertext) {
    const result = responseObject(await this.#request("activate", { stageId, ciphertext }));
    const entry = responseEntry(result.entry);
    this.#activeId = entry.id;
    this.#saveHandle(responseHandle(result.handle));
    this.#saveDedicatedMarker();
    this.#setState("connected", true);
    return entry;
  }
  discard(stageId) {
    if (this.#connected)
      this.#fire("discard", { stageId });
  }
  async select(id, ciphertext) {
    const result = responseObject(await this.#request("select", { id, ciphertext }));
    const entry = responseEntry(result.entry);
    this.#activeId = entry.id;
    this.#saveHandle(responseHandle(result.handle));
    this.#saveDedicatedMarker();
    this.#setState("connected", true);
    return entry;
  }
  async lock(id) {
    this.#saveHandle(null);
    if (this.#activeId === id)
      this.#activeId = null;
    this.#saveDedicatedMarker();
    this.#setState("connected", true);
    const result = responseObject(await this.#request("lock", { id }));
    const handle = responseHandle(result.handle);
    this.#saveHandle(handle);
    return { handle };
  }
  async remove(id) {
    const result = responseObject(await this.#request("remove", { id }));
    const handle = responseHandle(result.handle);
    if (this.#activeId === id)
      this.#activeId = null;
    this.#saveHandle(handle);
    this.#saveDedicatedMarker();
    this.#setState("connected", true);
    return { handle };
  }
  async sealSnapshot(identity, entry) {
    const result = responseObject(await this.#request("seal-snapshot", { identity, entry }, { timeout: CRYPTO_TIMEOUT }));
    if (typeof result.iv !== "string" || typeof result.ciphertext !== "string") {
      throw new Error(ui_strings_default.access.accessChanged);
    }
    return { iv: result.iv, ciphertext: result.ciphertext };
  }
  unsealSnapshot(identity, record) {
    return this.#request("unseal-snapshot", { identity, record }, { timeout: CRYPTO_TIMEOUT });
  }
  async repository(repo) {
    const result = responseObject(await this.#request("repository", { repo }));
    if (typeof result.default_branch !== "string")
      throw new Error(ui_strings_default.access.accessChanged);
    return { default_branch: result.default_branch };
  }
  async commit(repo, branch) {
    const result = responseObject(await this.#request("commit", { repo, branch }));
    if (typeof result.sha !== "string")
      throw new Error(ui_strings_default.access.accessChanged);
    return { sha: result.sha };
  }
  async content(repo, path, ref, kind, signal) {
    const result = await this.#request("content", { repo, path, ref, kind }, { signal });
    if (typeof result !== "string")
      throw new Error(ui_strings_default.access.accessChanged);
    return result;
  }
  cancelAll() {
    if (!this.#connected)
      return;
    this.#fire("cancel-all");
  }
  renew() {
    if (!this.#connected || this.#leaving)
      return Promise.resolve();
    if (this.#renewPending)
      return this.#renewPending;
    this.#setState("reconnecting");
    this.#renewPending = (async () => {
      const result = responseObject(await this.#send("renew", {}, { timeout: octocat_default.renewTimeoutMs }));
      if (this.#leaving)
        return;
      if (!result?.active || result.handle !== this.#handle)
        this.#close(new Error(ui_strings_default.access.accessChanged));
      else
        this.#setState("connected");
    })().finally(() => {
      this.#renewPending = null;
    });
    return this.#renewPending;
  }
}

// src/component/token-dialog/index.mjs
function bindTokenDialog(dialog, handlers) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)
        handlers.onBackdrop();
      return;
    }
    handlers.onClick(event);
  });
  dialog.addEventListener("cancel", handlers.onCancel);
  dialog.addEventListener("close", handlers.onClose);
}
function showTokenDialogLoading(dialog, message) {
  dialog.textContent = message;
}
function showTokenDialogFailure(dialog, model) {
  const message = dialog.ownerDocument.createElement("p");
  message.textContent = model.message;
  const retry = dialog.ownerDocument.createElement("button");
  retry.type = "button";
  retry.textContent = model.retryLabel;
  if (model.retryAction)
    retry.dataset.tokenAction = model.retryAction;
  if (model.onRetry)
    retry.addEventListener("click", model.onRetry);
  dialog.replaceChildren(message, retry);
}

export { withinRequestTime, ui_strings_default, formatText, navigationTooltip, element, isElement, isHTMLElement, isDetails, isCommandKey, displayWindow, requestHTML, requestFragment, controlIcon, renderControlIcons, enableSystemSymbols, rules_default, documentTypes, directoryDocumentTypes, noDocuments, navigationKeys, repositoryPath, encodedPath, readPolicy, githubLocation, readSnapshot, source_limits_default, TextCache, loadPublicSourceFile2, OCTOCAT_AUTO_RESTORE_KEY, octocatAutoRestoreEnabled, GithubSessionClient, bindTokenDialog, showTokenDialogLoading, showTokenDialogFailure };
