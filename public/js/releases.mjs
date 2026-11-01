/*! Third-party material in this build: Marked (MIT), DOMPurify (Apache-2.0), github-slugger (ISC), Bootstrap Icons (MIT), VS Code Codicons (CC BY 4.0), HTMX 2.0.11 (0BSD, adapted). Licenses and sources: vendor/SOURCES.md. */
import {
  withinRequestTime,
  githubLocation
} from "./shared.mjs";

// src/bloc/catalog/releases.mjs
var versionPattern = /^[vV]?(\d+(?:\.\d+)*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
var maxCheckedTags = 5;
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parseVersion(value) {
  const match = versionPattern.exec(value);
  if (!match)
    return null;
  const parts = match[1].split(".");
  if (parts.some((part) => part.length > 1 && part.startsWith("0") || !Number.isSafeInteger(Number(part)))) {
    return null;
  }
  while (parts.length > 3 && parts.at(-1) === "0")
    parts.pop();
  if (parts.length > 3)
    return null;
  const prerelease = match[2]?.split(".") || null;
  if (prerelease?.some((part) => /^0\d+$/.test(part)))
    return null;
  return { parts: parts.map(Number), prerelease };
}
function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b)
    return null;
  for (let index = 0;index < 3; index++) {
    const x = a.parts[index] || 0;
    const y = b.parts[index] || 0;
    if (x !== y)
      return x < y ? -1 : 1;
  }
  if (!a.prerelease || !b.prerelease)
    return a.prerelease ? -1 : b.prerelease ? 1 : 0;
  for (let index = 0;index < Math.max(a.prerelease.length, b.prerelease.length); index++) {
    const x = a.prerelease[index];
    const y = b.prerelease[index];
    if (x === undefined || y === undefined)
      return x === undefined ? -1 : 1;
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric !== yNumeric)
      return xNumeric ? -1 : 1;
    const order = xNumeric ? x.length === y.length ? x < y ? -1 : x > y ? 1 : 0 : x.length < y.length ? -1 : 1 : x < y ? -1 : x > y ? 1 : 0;
    if (order)
      return order;
  }
  return 0;
}
var publications = null;
function publicationSnapshot() {
  if (!publications) {
    publications = withinRequestTime(async (signal) => {
      const response = await fetch("public/json/haxelib/publications.json", {
        credentials: "omit",
        cache: "no-cache",
        signal
      });
      if (!response.ok)
        throw new Error(`Publication snapshot failed: ${response.status}`);
      const data = await response.json();
      if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.libraries)) {
        throw new Error("Invalid publication snapshot");
      }
      return data.libraries;
    }).catch((error) => {
      publications = null;
      throw error;
    });
  }
  return publications;
}
async function haxelibPublication(library) {
  const entries = await publicationSnapshot();
  const entry = entries.find((value) => isRecord(value) && value.name === library.name);
  if (!isRecord(entry) || entry.installedVersion !== library.version || entry.installationSource !== "haxelib" || entry.repositoryUrl !== library.url || entry.packagePath !== library.packagePath || typeof entry.status !== "string" || !["confirmed", "github"].includes(entry.status) || typeof entry.checkedAt !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(entry.checkedAt) || !Number.isFinite(Date.parse(entry.checkedAt)))
    return null;
  const value = entry.publication;
  if (!isRecord(value) || typeof value.version !== "string" || compareVersions(value.version, library.version) === null || !(entry.status === "confirmed" && value.source === "haxelib" || entry.status === "github" && value.source === "github"))
    return null;
  if (value.source === "github" && (typeof value.tag !== "string" || compareVersions(value.tag, value.version) !== 0)) {
    return null;
  }
  const displayVersion = value.source === "github" ? value.tag : value.version;
  const source = value.source === "github" ? "github" : "haxelib";
  return {
    version: value.version,
    displayVersion,
    source,
    refKind: value.source === "github" ? "tag" : undefined,
    checkedAt: entry.checkedAt
  };
}
var githubResponses = new Map;
var githubRetryAt = 0;
function pauseGithub(response) {
  const now = Date.now();
  const retryAfter = response.headers.get("Retry-After");
  const seconds = Number(retryAfter);
  const after = retryAfter ? Number.isFinite(seconds) ? now + seconds * 1000 : Date.parse(retryAfter) : NaN;
  const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
  const deadlines = [after, reset].filter((time) => Number.isFinite(time) && time > now);
  githubRetryAt = Math.max(githubRetryAt, deadlines.length ? Math.max(...deadlines) : now + 300000);
}
function githubJson(url, signal) {
  const cached = githubResponses.get(url);
  if (cached)
    return cached;
  if (Date.now() < githubRetryAt)
    return Promise.reject(new Error("GitHub request paused"));
  const pending = fetch(url, {
    credentials: "omit",
    cache: "no-cache",
    headers: { Accept: "application/vnd.github+json" },
    signal
  }).then((response) => {
    if (response.status === 403 || response.status === 429)
      pauseGithub(response);
    if (response.status === 404)
      return null;
    if (!response.ok)
      throw new Error(`GitHub request failed: ${response.status}`);
    return response.json();
  }).catch((error) => {
    if (githubResponses.get(url) === pending)
      githubResponses.delete(url);
    throw error;
  });
  githubResponses.set(url, pending);
  return pending;
}
async function packageVersion(api, name, packagePath, ref, signal) {
  if (typeof packagePath !== "string" || packagePath !== "" && packagePath.split("/").some((part) => !part || part === "." || part === ".."))
    return null;
  const path = [...packagePath ? packagePath.split("/") : [], "haxelib.json"];
  const expectedPath = path.join("/");
  const data = await githubJson(`${api}/contents/${path.map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`, signal);
  if (!isRecord(data) || data.type !== "file" || data.path !== expectedPath || data.encoding !== "base64" || typeof data.size !== "number" || !Number.isInteger(data.size) || data.size < 0 || data.size > 65536 || typeof data.content !== "string" || data.content.length > 1e5)
    return null;
  try {
    const bytes = Uint8Array.from(atob(data.content.replace(/\s/g, "")), (character) => character.charCodeAt(0));
    if (bytes.length !== data.size)
      return null;
    const metadata = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return isRecord(metadata) && metadata.name === name && typeof metadata.version === "string" ? metadata.version : null;
  } catch {
    return null;
  }
}
async function githubPublication(library) {
  const installation = library.installation;
  if (installation.source !== "github" || !["branch", "tag"].includes(installation.refKind) || typeof installation.ref !== "string" || !installation.ref)
    return null;
  const api = githubLocation(library.url).api;
  return withinRequestTime(async (signal) => {
    if (installation.refKind === "branch") {
      const version = await packageVersion(api, library.name, library.packagePath, installation.ref, signal);
      return version ? { version, displayVersion: version, source: "github", refKind: "branch" } : null;
    }
    const tags = [];
    for (let page = 1;page <= 3; page++) {
      const values = await githubJson(`${api}/tags?per_page=100&page=${page}`, signal);
      if (values === null)
        break;
      if (!Array.isArray(values) || values.some((value) => !isRecord(value) || typeof value.name !== "string")) {
        throw new Error("Invalid GitHub tags");
      }
      for (const value of values)
        tags.push(value.name);
      if (values.length < 100)
        break;
      if (page === 3)
        throw new Error("Too many GitHub tags");
    }
    const candidates = [...new Set(tags)].filter((tag) => compareVersions(tag, library.version) === 1).sort((left, right) => compareVersions(right, left) || 0);
    for (const [index, tag] of candidates.entries()) {
      if (index === maxCheckedTags)
        throw new Error("Too many package tags to verify");
      const version = await packageVersion(api, library.name, library.packagePath, tag, signal);
      if (version && compareVersions(version, tag) === 0) {
        return { version, displayVersion: tag, source: "github", refKind: "tag" };
      }
    }
    return null;
  });
}
function publishedLibraryVersion(library) {
  if (library.installation.source === "haxelib")
    return haxelibPublication(library);
  if (library.installation.source === "github")
    return githubPublication(library);
  return Promise.resolve(null);
}
export {
  compareVersions,
  publishedLibraryVersion
};
