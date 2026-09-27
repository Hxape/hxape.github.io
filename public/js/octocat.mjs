(() => {
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

  // src/auth/github/crypto.mjs
  var encoder = new TextEncoder;
  var decoder = new TextDecoder;
  function invalid(code) {
    return Object.assign(new Error(code), { code });
  }
  function bytes(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  }
  function base64(value) {
    let output = "";
    for (let offset = 0;offset < value.length; offset += 32768) {
      output += String.fromCharCode(...value.subarray(offset, offset + 32768));
    }
    return btoa(output);
  }
  async function keys(materialBytes) {
    if (!(materialBytes instanceof Uint8Array) || materialBytes.byteLength !== 32)
      throw invalid("invalid-passkey");
    const copy = new Uint8Array(materialBytes);
    let material;
    try {
      material = await crypto.subtle.importKey("raw", copy.buffer, "HKDF", false, ["deriveKey"]);
    } finally {
      copy.fill(0);
      materialBytes.fill(0);
    }
    const derive = (purpose) => crypto.subtle.deriveKey({
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("Hxape local GitHub storage v1"),
      info: encoder.encode(purpose)
    }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    return { token: await derive("PAT"), cache: await derive("snapshot") };
  }
  async function passwordKeys(passwordBytes, salt) {
    if (!(passwordBytes instanceof Uint8Array))
      throw invalid("invalid-password");
    let material;
    try {
      material = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, [
        "deriveBits"
      ]);
    } finally {
      passwordBytes.fill(0);
    }
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new Uint8Array(salt).buffer, iterations: 600000, hash: "SHA-256" }, material, 256);
    return keys(new Uint8Array(bits));
  }
  async function seal(entry, input) {
    const salt = entry.storage === "encrypted" ? crypto.getRandomValues(new Uint8Array(16)) : null;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const secret = salt ? await passwordKeys(input.passwordBytes, salt) : await keys(input.material);
    const content = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(entry.id) }, secret.token, encoder.encode(JSON.stringify(entry)));
    return {
      record: {
        id: entry.id,
        storage: entry.storage,
        salt: salt ? base64(salt) : undefined,
        credentialId: input.credentialId,
        prfSalt: input.prfSalt,
        addedAt: entry.addedAt,
        iv: base64(iv),
        ciphertext: base64(new Uint8Array(content))
      },
      cacheKey: secret.cache
    };
  }
  async function unseal(record, input) {
    let secret;
    if (record.storage === "passkey")
      secret = await keys(input.material);
    else {
      if (typeof record.salt !== "string")
        throw invalid("invalid-record");
      secret = await passwordKeys(input.passwordBytes, bytes(record.salt));
    }
    const content = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(record.iv), additionalData: encoder.encode(record.id) }, secret.token, bytes(record.ciphertext));
    const value = JSON.parse(decoder.decode(content));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw invalid("invalid-token");
    const entry = value;
    if (entry.id !== record.id || typeof entry.token !== "string" || typeof entry.label !== "string" || typeof entry.login !== "string" || typeof entry.storage !== "string" || ["addedAt", "credentialId", "prfSalt"].some((key) => entry[key] !== undefined && typeof entry[key] !== "string")) {
      throw invalid("invalid-token");
    }
    return {
      entry,
      cacheKey: secret.cache
    };
  }
  async function sealSnapshot(entry, key, identity) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const content = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(identity) }, key, encoder.encode(JSON.stringify(entry)));
    return { iv: base64(iv), ciphertext: base64(new Uint8Array(content)) };
  }
  async function unsealSnapshot(record, key, identity) {
    const content = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(record.iv), additionalData: encoder.encode(identity) }, key, bytes(record.ciphertext));
    return JSON.parse(decoder.decode(content));
  }

  // src/common/network/document-path.mjs
  function linkedDocumentPath(path) {
    return typeof path === "string" && path.length > 0 && path.length <= 1024 && !/[\\\u0000-\u001f\u007f]/.test(path) && path.split("/").every((part) => part && part !== "." && part !== ".." && !part.startsWith(".")) && /(?:\.(?:md|markdown)$|(?:^|\/)(?:README|CONTRIBUTING|AGENTS|LICENSE)(?:\.txt)?$)/i.test(path);
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

  // src/auth/github/interceptor.mjs
  var policy = source_limits_default.privateRequest;
  var decoder2 = new TextDecoder("utf-8", { fatal: true });
  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function failure(code, status = 0) {
    return Object.assign(new Error(code), { code, status });
  }
  function repositoryName(repo) {
    if (typeof repo !== "string" || !/^[a-z\d][a-z\d._-]{0,99}$/i.test(repo) || repo === "." || repo === "..") {
      throw failure("invalid-repository");
    }
    return repo;
  }
  function refName(value) {
    if (typeof value !== "string" || !/^[a-z\d][a-z\d._/-]{0,99}$/i.test(value) || value.includes("..") || value.includes("//") || value.endsWith("/") || value.endsWith(".") || value.split("/").some((part) => part.startsWith(".") || part.endsWith(".lock"))) {
      throw failure("invalid-ref");
    }
    return value;
  }
  function filePath(path, kind) {
    if (kind === "linked-document" && linkedDocumentPath(path))
      return path;
    if (typeof path !== "string" || !path || path.length > 1000 || path.split("/").some((part) => !part || part === "." || part === ".." || /[\\?#\x00-\x1f]/.test(part))) {
      throw failure("invalid-path");
    }
    if (kind === "checksum" && path === ".private/site.sha256")
      return path;
    if (kind === "snapshot" && path === ".private/site.json")
      return path;
    if (path.split("/").some((part) => part.startsWith(".")))
      throw failure("invalid-path");
    if (kind === "source" && path.endsWith(".hx"))
      return path;
    if (kind === "document" && /(?:^|\/)(?:README|CONTRIBUTING|AGENTS|LICENSE)(?:\.(?:md|markdown|txt))?$/i.test(path)) {
      return path;
    }
    throw failure("invalid-path");
  }
  async function readBytes(response, maxBytes) {
    const length = Number(response.headers.get("Content-Length"));
    if (Number.isFinite(length) && length > maxBytes)
      throw failure("response-too-large", response.status);
    if (!response.body) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > maxBytes)
        throw failure("response-too-large", response.status);
      return bytes;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          break;
        size += value.byteLength;
        if (size > maxBytes)
          throw failure("response-too-large", response.status);
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }
  async function requestError(response) {
    let detail = "";
    try {
      const data = JSON.parse(decoder2.decode(await readBytes(response, policy.maxErrorBytes)));
      if (isRecord(data) && typeof data.message === "string")
        detail = data.message.slice(0, 200);
    } catch {}
    const rateLimited = [403, 429].includes(response.status) && (response.headers.get("X-RateLimit-Remaining") === "0" || Boolean(response.headers.get("Retry-After")) || /rate limit/i.test(detail));
    const code = response.status === 401 ? "token-rejected" : rateLimited ? "rate-limited" : response.status === 403 ? "github-denied" : "github-failed";
    return Object.assign(failure(code, response.status), {
      denied: response.status === 403 && !rateLimited,
      rateLimited,
      detail
    });
  }

  class GithubTransport {
    async#json(path, token, maxBytes, signal) {
      if (!token)
        throw failure("session-lost");
      if (signal?.aborted)
        throw signal.reason ?? failure("cancelled");
      const request = new AbortController;
      const cancel = () => request.abort(signal?.reason);
      signal?.addEventListener("abort", cancel, { once: true });
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        request.abort();
      }, octocat_default.workerRequestTimeoutMs);
      try {
        const response = await fetch(`https://api.github.com${path}`, {
          method: "GET",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": octocat_default.apiVersion
          },
          credentials: "omit",
          cache: "no-store",
          redirect: "error",
          signal: request.signal
        });
        if (!response.ok)
          throw await requestError(response);
        const data = JSON.parse(decoder2.decode(await readBytes(response, maxBytes)));
        return data;
      } catch (error) {
        if (timedOut)
          throw failure("timeout");
        if (signal?.aborted)
          throw failure("cancelled");
        throw error;
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", cancel);
      }
    }
    async user(token, signal) {
      const data = await this.#json("/user", token, policy.maxJsonBytes, signal);
      if (!isRecord(data) || typeof data.login !== "string" || !data.login)
        throw failure("invalid-user");
      return { login: data.login };
    }
    async repository(repo, token, signal) {
      repo = repositoryName(repo);
      const data = await this.#json(`/repos/Hxape/${encodeURIComponent(repo)}`, token, policy.maxJsonBytes, signal);
      if (!isRecord(data) || typeof data.default_branch !== "string" || !data.default_branch) {
        throw failure("invalid-repository");
      }
      return { default_branch: data.default_branch };
    }
    async commit(repo, branch, token, signal) {
      repo = repositoryName(repo);
      branch = refName(branch);
      const ref = `refs/heads/${branch}`;
      const path = branch.split("/").map(encodeURIComponent).join("/");
      const data = await this.#json(`/repos/Hxape/${encodeURIComponent(repo)}/git/ref/heads/${path}`, token, policy.maxJsonBytes, signal);
      const object = isRecord(data) ? data.object : null;
      if (!isRecord(data) || data.ref !== ref || !isRecord(object) || object.type !== "commit" || typeof object.sha !== "string" || !/^[0-9a-f]{40}$/i.test(object.sha))
        throw failure("invalid-commit");
      return { sha: object.sha };
    }
    async content(repo, path, ref, kind, token, signal) {
      repo = repositoryName(repo);
      path = filePath(path, kind);
      ref = refName(ref);
      const maxBytes = kind === "checksum" ? policy.maxChecksumBytes : kind === "snapshot" ? policy.maxSnapshotBytes : kind === "source" ? source_limits_default.maxSourceBytes : policy.maxDocumentBytes;
      const maxEncoded = Math.ceil(maxBytes / 3) * 4 + source_limits_default.maxMetadataBytes;
      const base = `/repos/Hxape/${encodeURIComponent(repo)}`;
      const metadata = await this.#json(`${base}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`, token, maxEncoded, signal);
      if (!isRecord(metadata) || metadata.type !== "file" || typeof metadata.sha !== "string" || !/^[0-9a-f]{40}$/i.test(metadata.sha)) {
        throw failure("invalid-file");
      }
      if (typeof metadata.size !== "number" || !Number.isInteger(metadata.size) || metadata.size < 0 || metadata.size > maxBytes) {
        throw failure(kind === "source" ? "source-too-large" : "response-too-large");
      }
      const source = metadata.encoding === "base64" && typeof metadata.content === "string" ? metadata : await this.#json(`${base}/git/blobs/${encodeURIComponent(metadata.sha)}`, token, maxEncoded, signal);
      if (!isRecord(source) || source.encoding !== "base64" || typeof source.content !== "string") {
        throw failure("invalid-file");
      }
      const encoded = source.content.replace(/\s/g, "");
      if (encoded.length > Math.ceil(maxBytes / 3) * 4 + 4) {
        throw failure(kind === "source" ? "source-too-large" : "response-too-large");
      }
      let decoded;
      try {
        decoded = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      } catch {
        throw failure("invalid-file");
      }
      if (decoded.byteLength > maxBytes)
        throw failure(kind === "source" ? "source-too-large" : "response-too-large");
      return decoder2.decode(decoded);
    }
  }

  // src/auth/github/octocat.mjs
  var protocol = octocat_default.protocol;
  var policy2 = octocat_default;
  var maxSnapshotBytes = source_limits_default.privateRequest.maxSnapshotBytes;
  var github = new GithubTransport;
  var sessions = new Map;
  var stages = new Map;
  var encoder2 = new TextEncoder;
  function sweepStages() {
    const now = Date.now();
    for (const [id, stage] of stages)
      if (now > stage.expiresAt)
        stages.delete(id);
  }
  function rememberStage(id, stage) {
    sweepStages();
    while (stages.size >= policy2.maxStages) {
      const oldest = stages.keys().next().value;
      if (oldest === undefined)
        break;
      stages.delete(oldest);
    }
    stages.set(id, stage);
  }
  function failure2(code) {
    return Object.assign(new Error(code), { code });
  }
  function randomId() {
    return [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  function metadata(entry) {
    return {
      id: entry.id,
      label: entry.label,
      login: entry.login,
      storage: entry.storage,
      addedAt: entry.addedAt,
      credentialId: entry.credentialId,
      prfSalt: entry.prfSalt
    };
  }
  function validRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record))
      throw failure2("invalid-record");
    const value = record;
    const storage = value.storage;
    if (storage !== "encrypted" && storage !== "passkey")
      throw failure2("invalid-record");
    if (typeof value.id !== "string" || !/^[0-9a-f-]{36}$/i.test(value.id) || typeof value.iv !== "string" || typeof value.ciphertext !== "string" || value.iv.length > 64 || value.salt !== undefined && (typeof value.salt !== "string" || value.salt.length > 64) || value.ciphertext.length > 8192 || !value.ciphertext)
      throw failure2("invalid-record");
    return { id: value.id, storage, iv: value.iv, ciphertext: value.ciphertext, salt: value.salt };
  }
  function requireSession(binding) {
    const session = binding.session;
    if (!binding.hello || !session || session.owner !== binding || binding.released)
      throw failure2("session-lost");
    return session;
  }
  function currentSecret(binding) {
    const session = requireSession(binding);
    const secret = session.activeId ? session.entries.get(session.activeId) : undefined;
    if (!secret)
      throw failure2("session-lost");
    return { session, secret };
  }
  function stopRequests(binding) {
    for (const request of binding.requests.values())
      request.abort();
    binding.requests.clear();
  }
  function dropSession(session) {
    if (session.handle)
      sessions.delete(session.handle);
    for (const [stageId, stage] of stages)
      if (stage.session === session)
        stages.delete(stageId);
    session.entries.clear();
    session.activeId = null;
    session.generation++;
    if (session.owner) {
      stopRequests(session.owner);
      session.owner.session = null;
    }
    if (session.previousOwner)
      session.previousOwner.session = null;
    session.owner = session.previousOwner = null;
  }
  function rotateHandle(session) {
    if (session.handle)
      sessions.delete(session.handle);
    session.handle = session.mode === "shared" && session.entries.size ? randomId() : null;
    if (session.handle)
      sessions.set(session.handle, session);
    session.generation++;
    return session.handle;
  }
  function adoptForUnlock(binding) {
    if (!binding.pendingResume)
      return requireSession(binding);
    const session = binding.session;
    if (!session || session.owner)
      throw failure2("session-lost");
    if (Date.now() > session.resumeUntil) {
      dropSession(session);
      throw failure2("session-lost");
    }
    session.entries.clear();
    session.activeId = null;
    session.previousOwner = null;
    session.owner = binding;
    session.resumeUntil = 0;
    session.preserveBfcache = false;
    session.generation++;
    binding.pendingResume = false;
    return session;
  }
  function hello(binding, payload) {
    if (binding.hello)
      throw failure2("already-connected");
    let session = null;
    const proposed = payload?.handle;
    if (binding.mode === "shared" && typeof proposed === "string" && /^[0-9a-f]{64}$/.test(proposed)) {
      const old = sessions.get(proposed);
      if (old && !old.owner && Date.now() <= old.resumeUntil)
        session = old;
      else if (old && !old.owner && Date.now() > old.resumeUntil)
        dropSession(old);
    }
    if (!session) {
      const handle = binding.mode === "shared" ? randomId() : null;
      session = {
        mode: binding.mode,
        handle,
        entries: new Map,
        activeId: null,
        owner: binding,
        previousOwner: null,
        resumeUntil: 0,
        preserveBfcache: false,
        generation: 0
      };
    } else
      binding.pendingResume = true;
    binding.session = session;
    binding.hello = true;
    return { mode: binding.mode, handle: session.handle };
  }
  function resume(binding) {
    const session = binding.session;
    if (!binding.pendingResume || !session || session.owner)
      return null;
    if (Date.now() > session.resumeUntil) {
      dropSession(session);
      return null;
    }
    const secret = session.activeId ? session.entries.get(session.activeId) : undefined;
    return secret ? { entry: secret.entry, ciphertext: secret.ciphertext } : null;
  }
  function resumeConfirm(binding, payload) {
    const session = binding.session;
    if (!binding.pendingResume || !session || session.owner)
      throw failure2("session-lost");
    if (Date.now() > session.resumeUntil) {
      dropSession(session);
      throw failure2("session-lost");
    }
    if (typeof payload.id !== "string")
      throw failure2("session-lost");
    const secret = session.entries.get(payload.id);
    if (!secret || session.activeId !== payload.id || secret.ciphertext !== payload.ciphertext) {
      throw failure2("session-lost");
    }
    for (const id of session.entries.keys())
      if (id !== payload.id)
        session.entries.delete(id);
    if (session.previousOwner)
      session.previousOwner.session = null;
    session.previousOwner = null;
    session.owner = binding;
    session.resumeUntil = 0;
    session.preserveBfcache = false;
    session.generation++;
    binding.pendingResume = false;
    return { entry: secret.entry, handle: session.handle };
  }
  function abandonResume(binding) {
    const session = binding.session;
    if (!binding.pendingResume || !session || session.owner)
      throw failure2("session-lost");
    dropSession(session);
    binding.session = null;
    binding.pendingResume = false;
    return { handle: null };
  }
  async function stageAdd(binding, payload, signal) {
    try {
      const session = adoptForUnlock(binding);
      const generation = session.generation;
      const input = payload.entry && typeof payload.entry === "object" && !Array.isArray(payload.entry) ? payload.entry : null;
      const id = input?.id;
      const label = input?.label;
      const storage = input?.storage;
      const addedAt = input?.addedAt;
      const credentialId = input?.credentialId;
      const prfSalt = input?.prfSalt;
      const token = payload.token;
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || typeof label !== "string" || !label.trim() || label.length > 40 || storage !== "encrypted" && storage !== "passkey" || typeof addedAt !== "string" || addedAt.length > 64 || credentialId !== undefined && (typeof credentialId !== "string" || credentialId.length > 512) || prfSalt !== undefined && (typeof prfSalt !== "string" || prfSalt.length > 512) || payload?.passwordBytes instanceof Uint8Array && payload.passwordBytes.byteLength > 1024 || typeof token !== "string" || !token || token.length > 500 || /\s/.test(token))
        throw failure2("invalid-token");
      const duplicate = () => [...session.entries.values()].some((entry) => entry.token === token) || [...stages.values()].some((stage) => stage.session === session && stage.entry.token === token);
      if (duplicate())
        throw failure2("duplicate-token");
      const user = await github.user(token, signal);
      if (session.generation !== generation || session.owner !== binding || signal.aborted)
        throw failure2("cancelled");
      if (duplicate())
        throw failure2("duplicate-token");
      const entry = { id, label, login: user.login, token, storage, addedAt, credentialId, prfSalt };
      const sealed = await seal(entry, {
        passwordBytes: payload.passwordBytes instanceof Uint8Array ? payload.passwordBytes : undefined,
        material: payload.material instanceof Uint8Array ? payload.material : undefined,
        credentialId,
        prfSalt
      });
      if (session.generation !== generation || session.owner !== binding || signal.aborted)
        throw failure2("cancelled");
      const stageId = randomId();
      rememberStage(stageId, {
        binding,
        session,
        generation,
        entry,
        cacheKey: sealed.cacheKey,
        ciphertext: sealed.record.ciphertext,
        expiresAt: Date.now() + policy2.stageTtlMs
      });
      setTimeout(() => {
        const stage = stages.get(stageId);
        if (stage && Date.now() >= stage.expiresAt)
          stages.delete(stageId);
      }, policy2.stageTtlMs + 10);
      return { stageId, record: sealed.record, entry: metadata(entry) };
    } finally {
      if (payload?.passwordBytes instanceof Uint8Array && payload.passwordBytes.byteLength)
        payload.passwordBytes.fill(0);
      if (payload?.material instanceof Uint8Array && payload.material.byteLength)
        payload.material.fill(0);
    }
  }
  async function stageUnlock(binding, payload) {
    try {
      const session = adoptForUnlock(binding);
      const generation = session.generation;
      const record = validRecord(payload?.record);
      let opened;
      try {
        opened = await unseal(record, {
          passwordBytes: payload.passwordBytes instanceof Uint8Array ? payload.passwordBytes : undefined,
          material: payload.material instanceof Uint8Array ? payload.material : undefined
        });
      } catch {
        throw failure2("unlock-failed");
      }
      if (session.generation !== generation || session.owner !== binding)
        throw failure2("cancelled");
      const stageId = randomId();
      rememberStage(stageId, {
        binding,
        session,
        generation,
        entry: opened.entry,
        cacheKey: opened.cacheKey,
        ciphertext: record.ciphertext,
        expiresAt: Date.now() + policy2.stageTtlMs
      });
      setTimeout(() => {
        const stage = stages.get(stageId);
        if (stage && Date.now() >= stage.expiresAt)
          stages.delete(stageId);
      }, policy2.stageTtlMs + 10);
      return { stageId, entry: metadata(opened.entry) };
    } finally {
      if (payload?.passwordBytes instanceof Uint8Array && payload.passwordBytes.byteLength)
        payload.passwordBytes.fill(0);
      if (payload?.material instanceof Uint8Array && payload.material.byteLength)
        payload.material.fill(0);
    }
  }
  function activate(binding, payload) {
    const session = requireSession(binding);
    if (typeof payload.stageId !== "string")
      throw failure2("stage-expired");
    const stage = stages.get(payload.stageId);
    if (!stage || stage.binding !== binding || stage.session !== session || stage.generation !== session.generation || Date.now() > stage.expiresAt || stage.ciphertext !== payload?.ciphertext)
      throw failure2("stage-expired");
    stages.delete(payload.stageId);
    const entry = metadata(stage.entry);
    session.entries.set(entry.id, {
      entry,
      token: stage.entry.token,
      cacheKey: stage.cacheKey,
      ciphertext: stage.ciphertext
    });
    session.activeId = entry.id;
    session.generation++;
    if (session.mode === "shared" && !session.handle)
      rotateHandle(session);
    else if (session.handle)
      sessions.set(session.handle, session);
    return { entry, handle: session.handle };
  }
  function select(binding, payload) {
    const session = requireSession(binding);
    if (typeof payload.id !== "string")
      throw failure2("session-lost");
    const secret = session.entries.get(payload.id);
    if (!secret || secret.ciphertext !== payload?.ciphertext)
      throw failure2("session-lost");
    stopRequests(binding);
    session.activeId = payload.id;
    session.generation++;
    return { entry: secret.entry, handle: session.handle };
  }
  function lock(binding, payload) {
    const session = requireSession(binding);
    if (typeof payload.id !== "string")
      throw failure2("session-lost");
    if (session.activeId !== payload?.id || !session.entries.has(payload.id))
      throw failure2("session-lost");
    stopRequests(binding);
    for (const [stageId, stage] of stages) {
      if (stage.session === session && stage.entry.id === payload.id)
        stages.delete(stageId);
    }
    session.entries.delete(payload.id);
    session.activeId = null;
    return { handle: rotateHandle(session) };
  }
  function remove(binding, payload) {
    const id = payload?.id;
    if (typeof id !== "string")
      throw failure2("invalid-token");
    for (const session of new Set(sessions.values())) {
      if (!session.entries.delete(id))
        continue;
      if (session.activeId === id)
        session.activeId = null;
      if (session.owner)
        stopRequests(session.owner);
      const handle = rotateHandle(session);
      if (session.owner && session.owner !== binding) {
        try {
          session.owner.port.postMessage({ v: protocol, event: "handle-rotated", handle, activeId: session.activeId });
        } catch {}
      }
    }
    if (binding.mode === "dedicated" && binding.session?.entries.delete(id)) {
      if (binding.session.activeId === id) {
        binding.session.activeId = null;
        stopRequests(binding);
      }
      binding.session.generation++;
    }
    for (const [stageId, stage] of stages)
      if (stage.entry.id === id)
        stages.delete(stageId);
    const session = binding.session;
    return { handle: session?.handle || null };
  }
  function release(binding, payload) {
    const session = requireSession(binding);
    stopRequests(binding);
    session.owner = null;
    session.previousOwner = binding;
    session.resumeUntil = Date.now() + policy2.reloadGraceMs;
    session.preserveBfcache = false;
    binding.released = true;
    setTimeout(() => {
      if (!session.owner && Date.now() > session.resumeUntil)
        dropSession(session);
    }, policy2.reloadGraceMs + 10);
    return { handle: session.handle };
  }
  function renew(binding) {
    const session = binding.session;
    if (!session)
      return { active: false, handle: null };
    if (session.owner === binding && !binding.released)
      return { active: true, handle: session.handle };
    if (session.previousOwner !== binding || session.owner)
      return { active: false, handle: null };
    if (Date.now() > session.resumeUntil) {
      dropSession(session);
      return { active: false, handle: null };
    }
    session.owner = binding;
    session.previousOwner = null;
    session.resumeUntil = 0;
    session.preserveBfcache = false;
    binding.released = false;
    return { active: true, handle: session.handle };
  }
  async function authenticated(binding, payload, operation, signal) {
    const { session, secret } = currentSecret(binding);
    const generation = session.generation;
    let body;
    if (typeof payload.repo !== "string")
      throw failure2("invalid-repository");
    if (operation === "repository")
      body = await github.repository(payload.repo, secret.token, signal);
    else if (operation === "commit") {
      if (typeof payload.branch !== "string")
        throw failure2("invalid-ref");
      body = await github.commit(payload.repo, payload.branch, secret.token, signal);
    } else {
      if (typeof payload.path !== "string" || typeof payload.kind !== "string" || !["checksum", "snapshot", "document", "linked-document", "source"].includes(payload.kind))
        throw failure2("invalid-path");
      if (typeof payload.ref !== "string")
        throw failure2("invalid-ref");
      body = await github.content(payload.repo, payload.path, payload.ref, payload.kind, secret.token, signal);
    }
    if (session.generation !== generation || session.owner !== binding || signal.aborted)
      throw failure2("cancelled");
    return body;
  }
  async function snapshotCrypto(binding, payload, opening) {
    const { session, secret } = currentSecret(binding);
    const generation = session.generation;
    const identity = payload?.identity;
    if (typeof identity !== "string" || identity.length > 300 || !identity.startsWith(`${session.activeId}:`)) {
      throw failure2("invalid-identity");
    }
    if (opening) {
      const record = payload?.record;
      if (!record || typeof record !== "object" || !("ciphertext" in record) || typeof record.ciphertext !== "string" || !("iv" in record) || typeof record.iv !== "string" || record.ciphertext.length > Math.ceil(maxSnapshotBytes / 3) * 4 + 128)
        throw failure2("response-too-large");
      const body = await unsealSnapshot({ iv: record.iv, ciphertext: record.ciphertext }, secret.cacheKey, identity);
      if (session.generation !== generation || session.owner !== binding)
        throw failure2("session-lost");
      return body;
    }
    const entry = payload?.entry;
    if (!entry || encoder2.encode(JSON.stringify(entry)).byteLength > maxSnapshotBytes) {
      throw failure2("response-too-large");
    }
    const body = await sealSnapshot(entry, secret.cacheKey, identity);
    if (session.generation !== generation || session.owner !== binding)
      throw failure2("session-lost");
    return body;
  }
  async function operation(binding, message) {
    sweepStages();
    const payload = message.payload || {};
    switch (message.op) {
      case "hello":
        return hello(binding, payload);
      case "resume":
        return resume(binding);
      case "resume-confirm":
        return resumeConfirm(binding, payload);
      case "abandon-resume":
        return abandonResume(binding);
      case "renew":
        return renew(binding);
      case "release":
        return release(binding, payload);
      case "stage-unlock":
        return stageUnlock(binding, payload);
      case "activate":
        return activate(binding, payload);
      case "discard":
        if (typeof payload.stageId === "string")
          stages.delete(payload.stageId);
        return null;
      case "select":
        return select(binding, payload);
      case "lock":
        return lock(binding, payload);
      case "remove":
        return remove(binding, payload);
      case "seal-snapshot":
        return snapshotCrypto(binding, payload, false);
      case "unseal-snapshot":
        return snapshotCrypto(binding, payload, true);
      case "cancel":
        if (typeof payload.id === "number")
          binding.requests.get(payload.id)?.abort();
        return null;
      case "cancel-all":
        stopRequests(binding);
        return null;
      case "stage-add":
      case "repository":
      case "commit":
      case "content": {
        const controller = new AbortController;
        binding.requests.set(message.id, controller);
        try {
          return message.op === "stage-add" ? await stageAdd(binding, payload, controller.signal) : await authenticated(binding, payload, message.op, controller.signal);
        } finally {
          binding.requests.delete(message.id);
        }
      }
      default:
        throw failure2("invalid-operation");
    }
  }
  function errorValue(cause) {
    const error = cause && typeof cause === "object" ? cause : {};
    const code = typeof error.code === "string" ? error.code : "worker-failed";
    return {
      code,
      message: code,
      status: typeof error.status === "number" && Number.isInteger(error.status) ? error.status : 0,
      denied: error.denied === true,
      rateLimited: error.rateLimited === true,
      detail: typeof error.detail === "string" ? error.detail.slice(0, 200) : ""
    };
  }
  async function dispatch(binding, event) {
    const value = event.data;
    if (!value || typeof value !== "object" || Array.isArray(value))
      return;
    const message = value;
    if (typeof message.id !== "number" || !Number.isSafeInteger(message.id) || message.id <= 0)
      return;
    if (message.v !== protocol) {
      binding.port.postMessage({
        v: protocol,
        id: message.id,
        ok: false,
        error: errorValue(failure2("protocol-mismatch"))
      });
      return;
    }
    try {
      if (typeof message.op !== "string" || message.payload !== undefined && (!message.payload || typeof message.payload !== "object" || Array.isArray(message.payload))) {
        throw failure2("invalid-operation");
      }
      const result = await operation(binding, message);
      try {
        binding.port.postMessage({ v: protocol, id: message.id, ok: true, result });
      } catch {}
    } catch (error) {
      try {
        binding.port.postMessage({ v: protocol, id: message.id, ok: false, error: errorValue(error) });
      } catch {}
    }
  }
  function attach(port, mode) {
    const binding = {
      port,
      mode,
      hello: false,
      pendingResume: false,
      released: false,
      session: null,
      requests: new Map
    };
    port.addEventListener("message", (event) => {
      if ("data" in event)
        dispatch(binding, event);
    });
    if ("start" in port && typeof port.start === "function")
      port.start();
  }
  if ("onconnect" in self) {
    self.onconnect = (event) => {
      for (const port of event.ports)
        attach(port, "shared");
    };
  } else
    attach(self, "dedicated");
})();
