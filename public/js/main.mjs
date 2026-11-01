/*! Third-party material in this build: Marked (MIT), DOMPurify (Apache-2.0), github-slugger (ISC), Bootstrap Icons (MIT), VS Code Codicons (CC BY 4.0), HTMX 2.0.11 (0BSD, adapted). Licenses and sources: vendor/SOURCES.md. */
import {
  withinRequestTime,
  ui_strings_default,
  formatText,
  navigationTooltip,
  element,
  isElement,
  isHTMLElement,
  isDetails,
  isCommandKey,
  displayWindow,
  requestHTML,
  requestFragment,
  controlIcon,
  renderControlIcons,
  enableSystemSymbols,
  rules_default,
  documentTypes,
  directoryDocumentTypes,
  noDocuments,
  navigationKeys,
  repositoryPath,
  encodedPath,
  readPolicy,
  githubLocation,
  readSnapshot,
  source_limits_default,
  TextCache,
  loadPublicSourceFile2,
  octocatAutoRestoreEnabled,
  GithubSessionClient,
  showTokenDialogFailure
} from "./shared.mjs";

// src/component/footer-address/index.mjs
function showContext(link, { url, path = url }) {
  link.href = url;
  link.setAttribute("aria-label", url);
  const address = link.ownerDocument.createElement("span");
  address.className = "github-address";
  address.textContent = url;
  const compact = link.ownerDocument.createElement("bdi");
  compact.className = "github-path";
  compact.dir = "ltr";
  compact.textContent = path;
  link.replaceChildren(address, compact);
}
function showLock(link, model) {
  if (model.state === null) {
    link.removeAttribute("data-lock-state");
    link.removeAttribute("aria-description");
    return;
  }
  link.dataset.lockState = model.state;
  if (model.description !== undefined)
    link.setAttribute("aria-description", model.description);
}
function fitAddress(link, model) {
  const address = link.querySelector(".github-address");
  if (!isHTMLElement(address))
    return;
  const url = link.href;
  if (address.textContent !== url)
    address.textContent = url;
  if (!model.shorten)
    return;
  const available = link.getBoundingClientRect().width;
  if (!available || address.getBoundingClientRect().width <= available)
    return;
  const parts = url.replace(/^[a-z][a-z\d+.-]*:\/\//i, "").match(/[^/]+\/*/g) || [];
  for (let start = 0;start < parts.length; start++) {
    address.textContent = `…/${parts.slice(start).join("")}`;
    if (address.getBoundingClientRect().width <= available)
      break;
  }
}
function bindFooterAddress(root, onCopy, on) {
  const copy = root.querySelector("#github-copy");
  if (isHTMLElement(copy))
    on(copy, "click", onCopy);
}
function showCopyFeedback(feedback, message) {
  feedback.textContent = message;
}

// src/component/installed-version/index.mjs
function installedVersion(owner, { text, icon, label }) {
  const caption = owner.createElement("span");
  caption.className = "library-version muted";
  caption.textContent = text;
  if (icon)
    caption.prepend(icon);
  if (label) {
    caption.setAttribute("aria-label", label);
    caption.title = label;
  }
  return caption;
}

// src/component/published-version/index.mjs
function publishedVersion(owner, { text, icon, label, newer }) {
  const caption = owner.createElement("span");
  caption.className = "library-release muted";
  caption.textContent = text;
  if (icon)
    caption.prepend(icon);
  caption.classList.toggle("is-newer", newer);
  if (label) {
    caption.setAttribute("aria-label", label);
    caption.title = label;
  }
  return caption;
}

// src/component/tree-row/index.mjs
function createTreeRow(owner, branch = false) {
  const row = owner.createElement(branch ? "summary" : "button");
  row.className = `tree-row label-row nonselectable ${branch ? "strong" : "control primary"}`;
  if (!branch) {
    row.type = "button";
    const leaf = owner.createElement("div");
    leaf.className = "tree-leaf label-row";
    leaf.append(row);
  }
  showTreeRow(row, { name: "" });
  return row;
}
function showTreeRow(row, { name, icon = null, caption, accessibleName, hasPopup = false }) {
  const label = row.querySelector(":scope > .node-label") || row.ownerDocument.createElement("span");
  label.className = "node-label";
  label.textContent = name;
  const leaf = row.localName === "button" && row.parentElement?.classList.contains("tree-leaf") ? row.parentElement : null;
  row.replaceChildren(...icon ? [icon] : [], label, ...!leaf && caption ? [caption.cloneNode(true)] : []);
  if (leaf) {
    leaf.querySelector(":scope > .catalog-caption")?.remove();
    if (caption)
      leaf.append(caption.cloneNode(true));
    leaf.classList.toggle("has-catalog-caption", Boolean(caption));
  }
  row.classList.toggle("has-catalog-caption", Boolean(caption));
  if (accessibleName)
    row.setAttribute("aria-label", accessibleName);
  else
    row.removeAttribute("aria-label");
  if (hasPopup)
    row.setAttribute("aria-haspopup", "dialog");
  else
    row.removeAttribute("aria-haspopup");
}
function flashUnavailable(row, createLock) {
  row.getAnimations().forEach((animation) => animation.cancel());
  row.animate([
    { backgroundColor: "transparent" },
    { backgroundColor: "color-mix(in srgb, currentColor 22%, transparent)" },
    { backgroundColor: "transparent" }
  ], { duration: 360 });
  const content = row.querySelector(":scope > h2") || row;
  const label = content.querySelector(":scope > .node-label");
  if (!label)
    return;
  let lock = row.querySelector(":scope > .unavailable-lock");
  if (!lock) {
    lock = createLock();
    lock.classList.add("unavailable-lock");
    (content === row ? label : content).after(lock);
  }
  lock.getAnimations().forEach((animation) => animation.cancel());
  lock.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 900 }).onfinish = () => lock.remove();
}

// src/component/tree-branch/index.mjs
function cloneBranch(owner) {
  const entry = owner.createElement("li");
  const details = owner.createElement("details");
  details.append(createTreeRow(owner, true));
  entry.append(details);
  return entry;
}

// vendor/dompurify-3.4.16/purify.es.mjs
/*! @license DOMPurify 3.4.16 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.16/LICENSE */
function _OverloadYield(e, d) {
  this.v = e, this.k = d;
}
function _arrayLikeToArray(r, a) {
  (a == null || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a);e < a; e++)
    n[e] = r[e];
  return n;
}
function _arrayWithHoles(r) {
  if (Array.isArray(r))
    return r;
}
function _iterableToArrayLimit(r, l) {
  var t = r == null ? null : typeof Symbol != "undefined" && r[Symbol.iterator] || r["@@iterator"];
  if (t != null) {
    var e, n, i, u, a = [], f = true, o = false;
    try {
      if (i = (t = t.call(r)).next, l === 0) {
        if (Object(t) !== t)
          return;
        f = false;
      } else
        for (;!(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true)
          ;
    } catch (r) {
      o = true, n = r;
    } finally {
      try {
        if (!f && t.return != null && (u = t.return(), Object(u) !== u))
          return;
      } finally {
        if (o)
          throw n;
      }
    }
    return a;
  }
}
function _nonIterableRest() {
  throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
/*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */
function _slicedToArray(r, e) {
  return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if (typeof r == "string")
      return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return t === "Object" && r.constructor && (t = r.constructor.name), t === "Map" || t === "Set" ? Array.from(r) : t === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : undefined;
  }
}
function AsyncGenerator(e) {
  var t, n;
  function resume(t, n) {
    try {
      var r = e[t](n), o = r.value, u = o instanceof _OverloadYield;
      Promise.resolve(u ? o.v : o).then(function(n) {
        if (u) {
          var i = t === "return" && o.k ? t : "next";
          if (!o.k || n.done)
            return resume(i, n);
          n = e[i](n).value;
        }
        settle(!!r.done, n);
      }, function(e) {
        resume("throw", e);
      });
    } catch (e) {
      settle(2, e);
    }
  }
  function settle(e, r) {
    e === 2 ? t.reject(r) : t.resolve({
      value: r,
      done: e
    }), (t = t.next) ? resume(t.key, t.arg) : n = null;
  }
  this._invoke = function(e, r) {
    return new Promise(function(o, u) {
      var i = {
        key: e,
        arg: r,
        resolve: o,
        reject: u,
        next: null
      };
      n ? n = n.next = i : (t = n = i, resume(e, r));
    });
  }, typeof e.return != "function" && (this.return = undefined);
}
AsyncGenerator.prototype[typeof Symbol == "function" && Symbol.asyncIterator || "@@asyncIterator"] = function() {
  return this;
}, AsyncGenerator.prototype.next = function(e) {
  return this._invoke("next", e);
}, AsyncGenerator.prototype.throw = function(e) {
  return this._invoke("throw", e);
}, AsyncGenerator.prototype.return = function(e) {
  return this._invoke("return", e);
};
var entries = Object.entries;
var setPrototypeOf = Object.setPrototypeOf;
var isFrozen = Object.isFrozen;
var getPrototypeOf = Object.getPrototypeOf;
var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var freeze = Object.freeze;
var seal = Object.seal;
var create = Object.create;
var _ref = typeof Reflect !== "undefined" && Reflect;
var apply = _ref.apply;
var construct = _ref.construct;
if (!freeze)
  freeze = function freeze(x) {
    return x;
  };
if (!seal)
  seal = function seal(x) {
    return x;
  };
if (!apply)
  apply = function apply(func, thisArg) {
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2;_key < _len; _key++)
      args[_key - 2] = arguments[_key];
    return func.apply(thisArg, args);
  };
if (!construct)
  construct = function construct(Func) {
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1;_key2 < _len2; _key2++)
      args[_key2 - 1] = arguments[_key2];
    return new Func(...args);
  };
var arrayForEach = unapply(Array.prototype.forEach);
Array.prototype.indexOf;
var arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
var arrayPop = unapply(Array.prototype.pop);
var arrayPush = unapply(Array.prototype.push);
Array.prototype.slice;
var arraySplice = unapply(Array.prototype.splice);
var arrayIsArray = Array.isArray;
var stringToLowerCase = unapply(String.prototype.toLowerCase);
var stringToString = unapply(String.prototype.toString);
var stringMatch = unapply(String.prototype.match);
var stringReplace = unapply(String.prototype.replace);
var stringIndexOf = unapply(String.prototype.indexOf);
var stringTrim = unapply(String.prototype.trim);
var numberToString = unapply(Number.prototype.toString);
var booleanToString = unapply(Boolean.prototype.toString);
var bigintToString = typeof BigInt === "undefined" ? null : unapply(BigInt.prototype.toString);
var symbolToString = typeof Symbol === "undefined" ? null : unapply(Symbol.prototype.toString);
var objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
var objectToString = unapply(Object.prototype.toString);
var regExpTest = unapply(RegExp.prototype.test);
var typeErrorCreate = unconstruct(TypeError);
function unapply(func) {
  return function(thisArg) {
    if (thisArg instanceof RegExp)
      thisArg.lastIndex = 0;
    for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1;_key3 < _len3; _key3++)
      args[_key3 - 1] = arguments[_key3];
    return apply(func, thisArg, args);
  };
}
function unconstruct(Func) {
  return function() {
    for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0;_key4 < _len4; _key4++)
      args[_key4] = arguments[_key4];
    return construct(Func, args);
  };
}
function addToSet(set, array) {
  let transformCaseFunc = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : stringToLowerCase;
  if (setPrototypeOf)
    setPrototypeOf(set, null);
  if (!arrayIsArray(array))
    return set;
  let l = array.length;
  while (l--) {
    let element = array[l];
    if (typeof element === "string") {
      const lcElement = transformCaseFunc(element);
      if (lcElement !== element) {
        if (!isFrozen(array))
          array[l] = lcElement;
        element = lcElement;
      }
    }
    set[element] = true;
  }
  return set;
}
function cleanArray(array) {
  for (let index = 0;index < array.length; index++)
    if (!objectHasOwnProperty(array, index))
      array[index] = null;
  return array;
}
function clone(object) {
  const newObject = create(null);
  for (const _ref2 of entries(object)) {
    var _ref3 = _slicedToArray(_ref2, 2);
    const property = _ref3[0];
    const value = _ref3[1];
    if (objectHasOwnProperty(object, property)) {
      if (arrayIsArray(value))
        newObject[property] = cleanArray(value);
      else if (value && typeof value === "object" && value.constructor === Object)
        newObject[property] = clone(value);
      else
        newObject[property] = value;
    }
  }
  return newObject;
}
function stringifyValue(value) {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
      return numberToString(value);
    case "boolean":
      return booleanToString(value);
    case "bigint":
      return bigintToString ? bigintToString(value) : "0";
    case "symbol":
      return symbolToString ? symbolToString(value) : "Symbol()";
    case "undefined":
      return objectToString(value);
    case "function":
    case "object": {
      if (value === null)
        return objectToString(value);
      const valueAsRecord = value;
      const valueToString = lookupGetter(valueAsRecord, "toString");
      if (typeof valueToString === "function") {
        const stringified = valueToString(valueAsRecord);
        return typeof stringified === "string" ? stringified : objectToString(stringified);
      }
      return objectToString(value);
    }
    default:
      return objectToString(value);
  }
}
function lookupGetter(object, prop) {
  while (object !== null) {
    const desc = getOwnPropertyDescriptor(object, prop);
    if (desc) {
      if (desc.get)
        return unapply(desc.get);
      if (typeof desc.value === "function")
        return unapply(desc.value);
    }
    object = getPrototypeOf(object);
  }
  function fallbackValue() {
    return null;
  }
  return fallbackValue;
}
function isRegex(value) {
  try {
    regExpTest(value, "");
    return true;
  } catch (_unused) {
    return false;
  }
}
var html$1 = freeze([
  "a",
  "abbr",
  "acronym",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "bdi",
  "bdo",
  "big",
  "blink",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "center",
  "cite",
  "code",
  "col",
  "colgroup",
  "content",
  "data",
  "datalist",
  "dd",
  "decorator",
  "del",
  "details",
  "dfn",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "element",
  "em",
  "fieldset",
  "figcaption",
  "figure",
  "font",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "main",
  "map",
  "mark",
  "marquee",
  "menu",
  "menuitem",
  "meter",
  "nav",
  "nobr",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "search",
  "section",
  "select",
  "shadow",
  "slot",
  "small",
  "source",
  "spacer",
  "span",
  "strike",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "track",
  "tt",
  "u",
  "ul",
  "var",
  "video",
  "wbr"
]);
var svg$1 = freeze([
  "svg",
  "a",
  "altglyph",
  "altglyphdef",
  "altglyphitem",
  "animatecolor",
  "animatemotion",
  "animatetransform",
  "circle",
  "clippath",
  "defs",
  "desc",
  "ellipse",
  "enterkeyhint",
  "exportparts",
  "filter",
  "font",
  "g",
  "glyph",
  "glyphref",
  "hkern",
  "image",
  "inputmode",
  "line",
  "lineargradient",
  "marker",
  "mask",
  "metadata",
  "mpath",
  "part",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "radialgradient",
  "rect",
  "stop",
  "style",
  "switch",
  "symbol",
  "text",
  "textpath",
  "title",
  "tref",
  "tspan",
  "view",
  "vkern"
]);
var svgFilters = freeze([
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence"
]);
var svgDisallowed = freeze([
  "animate",
  "color-profile",
  "cursor",
  "discard",
  "font-face",
  "font-face-format",
  "font-face-name",
  "font-face-src",
  "font-face-uri",
  "foreignobject",
  "hatch",
  "hatchpath",
  "mesh",
  "meshgradient",
  "meshpatch",
  "meshrow",
  "missing-glyph",
  "script",
  "set",
  "solidcolor",
  "unknown",
  "use"
]);
var mathMl$1 = freeze([
  "math",
  "menclose",
  "merror",
  "mfenced",
  "mfrac",
  "mglyph",
  "mi",
  "mlabeledtr",
  "mmultiscripts",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mroot",
  "mrow",
  "ms",
  "mspace",
  "msqrt",
  "mstyle",
  "msub",
  "msup",
  "msubsup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
  "mprescripts"
]);
var mathMlDisallowed = freeze([
  "maction",
  "maligngroup",
  "malignmark",
  "mlongdiv",
  "mscarries",
  "mscarry",
  "msgroup",
  "mstack",
  "msline",
  "msrow",
  "semantics",
  "annotation",
  "annotation-xml",
  "mprescripts",
  "none"
]);
var text = freeze(["#text"]);
var html = freeze([
  "accept",
  "action",
  "align",
  "alt",
  "autocapitalize",
  "autocomplete",
  "autopictureinpicture",
  "autoplay",
  "background",
  "bgcolor",
  "border",
  "capture",
  "cellpadding",
  "cellspacing",
  "checked",
  "cite",
  "class",
  "clear",
  "color",
  "cols",
  "colspan",
  "command",
  "commandfor",
  "controls",
  "controlslist",
  "coords",
  "crossorigin",
  "datetime",
  "decoding",
  "default",
  "dir",
  "disabled",
  "disablepictureinpicture",
  "disableremoteplayback",
  "download",
  "draggable",
  "enctype",
  "enterkeyhint",
  "exportparts",
  "face",
  "for",
  "headers",
  "height",
  "hidden",
  "high",
  "href",
  "hreflang",
  "id",
  "inert",
  "inputmode",
  "integrity",
  "ismap",
  "kind",
  "label",
  "lang",
  "list",
  "loading",
  "loop",
  "low",
  "max",
  "maxlength",
  "media",
  "method",
  "min",
  "minlength",
  "multiple",
  "muted",
  "name",
  "nonce",
  "noshade",
  "novalidate",
  "nowrap",
  "open",
  "optimum",
  "part",
  "pattern",
  "placeholder",
  "playsinline",
  "popover",
  "popovertarget",
  "popovertargetaction",
  "poster",
  "preload",
  "pubdate",
  "radiogroup",
  "readonly",
  "rel",
  "required",
  "rev",
  "reversed",
  "role",
  "rows",
  "rowspan",
  "spellcheck",
  "scope",
  "selected",
  "shape",
  "size",
  "sizes",
  "slot",
  "span",
  "srclang",
  "start",
  "src",
  "srcset",
  "step",
  "style",
  "summary",
  "tabindex",
  "title",
  "translate",
  "type",
  "usemap",
  "valign",
  "value",
  "width",
  "wrap",
  "xmlns"
]);
var svg = freeze([
  "accent-height",
  "accumulate",
  "additive",
  "alignment-baseline",
  "amplitude",
  "ascent",
  "attributename",
  "attributetype",
  "azimuth",
  "basefrequency",
  "baseline-shift",
  "begin",
  "bias",
  "by",
  "class",
  "clip",
  "clippathunits",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "cx",
  "cy",
  "d",
  "dx",
  "dy",
  "diffuseconstant",
  "direction",
  "display",
  "divisor",
  "dominant-baseline",
  "dur",
  "edgemode",
  "elevation",
  "end",
  "exponent",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "filterunits",
  "flood-color",
  "flood-opacity",
  "font-family",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "fx",
  "fy",
  "g1",
  "g2",
  "glyph-name",
  "glyphref",
  "gradientunits",
  "gradienttransform",
  "height",
  "href",
  "id",
  "image-rendering",
  "in",
  "in2",
  "intercept",
  "k",
  "k1",
  "k2",
  "k3",
  "k4",
  "kerning",
  "keypoints",
  "keysplines",
  "keytimes",
  "lang",
  "lengthadjust",
  "letter-spacing",
  "kernelmatrix",
  "kernelunitlength",
  "lighting-color",
  "local",
  "marker-end",
  "marker-mid",
  "marker-start",
  "markerheight",
  "markerunits",
  "markerwidth",
  "maskcontentunits",
  "maskunits",
  "max",
  "mask",
  "mask-type",
  "media",
  "method",
  "mode",
  "min",
  "name",
  "numoctaves",
  "offset",
  "operator",
  "opacity",
  "order",
  "orient",
  "orientation",
  "origin",
  "overflow",
  "paint-order",
  "path",
  "pathlength",
  "patterncontentunits",
  "patterntransform",
  "patternunits",
  "pointer-events",
  "points",
  "preservealpha",
  "preserveaspectratio",
  "primitiveunits",
  "r",
  "rx",
  "ry",
  "radius",
  "refx",
  "refy",
  "repeatcount",
  "repeatdur",
  "restart",
  "result",
  "rotate",
  "scale",
  "seed",
  "shape-rendering",
  "slope",
  "specularconstant",
  "specularexponent",
  "spreadmethod",
  "startoffset",
  "stddeviation",
  "stitchtiles",
  "stop-color",
  "stop-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke",
  "stroke-width",
  "style",
  "surfacescale",
  "systemlanguage",
  "tabindex",
  "tablevalues",
  "targetx",
  "targety",
  "transform",
  "transform-origin",
  "text-anchor",
  "text-decoration",
  "text-orientation",
  "text-rendering",
  "textlength",
  "type",
  "u1",
  "u2",
  "unicode",
  "values",
  "vector-effect",
  "viewbox",
  "visibility",
  "version",
  "vert-adv-y",
  "vert-origin-x",
  "vert-origin-y",
  "width",
  "word-spacing",
  "wrap",
  "writing-mode",
  "xchannelselector",
  "ychannelselector",
  "x",
  "x1",
  "x2",
  "xmlns",
  "y",
  "y1",
  "y2",
  "z",
  "zoomandpan"
]);
var mathMl = freeze([
  "accent",
  "accentunder",
  "align",
  "bevelled",
  "close",
  "columnalign",
  "columnlines",
  "columnspacing",
  "columnspan",
  "denomalign",
  "depth",
  "dir",
  "display",
  "displaystyle",
  "encoding",
  "fence",
  "frame",
  "height",
  "href",
  "id",
  "largeop",
  "length",
  "linethickness",
  "lquote",
  "lspace",
  "mathbackground",
  "mathcolor",
  "mathsize",
  "mathvariant",
  "maxsize",
  "minsize",
  "movablelimits",
  "notation",
  "numalign",
  "open",
  "rowalign",
  "rowlines",
  "rowspacing",
  "rowspan",
  "rspace",
  "rquote",
  "scriptlevel",
  "scriptminsize",
  "scriptsizemultiplier",
  "selection",
  "separator",
  "separators",
  "stretchy",
  "subscriptshift",
  "supscriptshift",
  "symmetric",
  "voffset",
  "width",
  "xmlns"
]);
var xml = freeze([
  "xlink:href",
  "xml:id",
  "xlink:title",
  "xml:space",
  "xmlns:xlink"
]);
var MUSTACHE_EXPR = seal(/{{[\w\W]*|^[\w\W]*}}/g);
var ERB_EXPR = seal(/<%[\w\W]*|^[\w\W]*%>/g);
var TMPLIT_EXPR = seal(/\${[\w\W]*/g);
var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/);
var ARIA_ATTR = seal(/^aria-[\-\w]+$/);
var IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i);
var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
var ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g);
var DOCTYPE_NAME = seal(/^html$/i);
var CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
var ELEMENT_MARKUP_PROBE = seal(/<[/\w!]/g);
var COMMENT_MARKUP_PROBE = seal(/<[/\w]/g);
var FALLBACK_TAG_CLOSE = seal(/<\/no(script|embed|frames)/i);
var SELF_CLOSING_TAG = seal(/\/>/i);
var NODE_TYPE = {
  element: 1,
  attribute: 2,
  text: 3,
  cdataSection: 4,
  entityReference: 5,
  entityNode: 6,
  processingInstruction: 7,
  comment: 8,
  document: 9,
  documentType: 10,
  documentFragment: 11,
  notation: 12
};
var LITERAL_TEXT_ELEMENT_NAMES = [
  "style",
  "script",
  "xmp",
  "iframe",
  "noembed",
  "noframes",
  "plaintext",
  "noscript"
];
var LITERAL_TEXT_ELEMENTS = freeze(addToSet({}, LITERAL_TEXT_ELEMENT_NAMES));
var LITERAL_TEXT_CLOSE = function() {
  const map = {};
  arrayForEach(LITERAL_TEXT_ELEMENT_NAMES, (name) => {
    map[name] = seal(new RegExp("</" + name + "(?=[\\t\\n\\f\\r />])", "i"));
  });
  return freeze(map);
}();
var getGlobal = function getGlobal() {
  return typeof window === "undefined" ? null : window;
};
var _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, purifyHostElement) {
  if (typeof trustedTypes !== "object" || typeof trustedTypes.createPolicy !== "function")
    return null;
  let suffix = null;
  const ATTR_NAME = "data-tt-policy-suffix";
  if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME))
    suffix = purifyHostElement.getAttribute(ATTR_NAME);
  const policyName = "dompurify" + (suffix ? "#" + suffix : "");
  try {
    return trustedTypes.createPolicy(policyName, {
      createHTML(html) {
        return html;
      },
      createScriptURL(scriptUrl) {
        return scriptUrl;
      }
    });
  } catch (_) {
    console.warn("TrustedTypes policy " + policyName + " could not be created.");
    return null;
  }
};
var _createHooksMap = function _createHooksMap() {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
};
var _resolveSetOption = function _resolveSetOption(cfg, key, fallback, options) {
  return objectHasOwnProperty(cfg, key) && arrayIsArray(cfg[key]) ? addToSet(options.base ? clone(options.base) : {}, cfg[key], options.transform) : fallback;
};
var _resolveObjectOption = function _resolveObjectOption(cfg, key, makeFallback) {
  const value = objectHasOwnProperty(cfg, key) ? cfg[key] : undefined;
  return value && typeof value === "object" ? clone(value) : makeFallback();
};
function createDOMPurify() {
  let window2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getGlobal();
  const DOMPurify = (root) => createDOMPurify(root);
  DOMPurify.version = "3.4.16";
  DOMPurify.removed = [];
  if (!window2 || !window2.document || window2.document.nodeType !== NODE_TYPE.document || !window2.Element) {
    DOMPurify.isSupported = false;
    return DOMPurify;
  }
  let document2 = window2.document;
  const originalDocument = document2;
  const currentScript = originalDocument.currentScript;
  window2.DocumentFragment;
  const { HTMLTemplateElement, Node, Element, NodeFilter } = window2;
  window2.NamedNodeMap === undefined && (window2.NamedNodeMap || window2.MozNamedAttrMap);
  window2.HTMLFormElement;
  const { DOMParser, trustedTypes } = window2;
  const ElementPrototype = Element.prototype;
  const cloneNode = lookupGetter(ElementPrototype, "cloneNode");
  const remove = lookupGetter(ElementPrototype, "remove");
  const removeAttributeNode = lookupGetter(ElementPrototype, "removeAttributeNode");
  const getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
  const getChildNodes = lookupGetter(ElementPrototype, "childNodes");
  const getParentNode = lookupGetter(ElementPrototype, "parentNode");
  const getShadowRoot = lookupGetter(ElementPrototype, "shadowRoot");
  const getAttributes = lookupGetter(ElementPrototype, "attributes");
  const getNodeType = Node && Node.prototype ? lookupGetter(Node.prototype, "nodeType") : null;
  const getNodeName = Node && Node.prototype ? lookupGetter(Node.prototype, "nodeName") : null;
  const getOwnerDocument = Node && Node.prototype ? lookupGetter(Node.prototype, "ownerDocument") : null;
  const _readNodeType = function _readNodeType(node) {
    return getNodeType ? getNodeType(node) : node.nodeType;
  };
  const _readNodeName = function _readNodeName(node) {
    return getNodeName ? getNodeName(node) : node.nodeName;
  };
  if (typeof HTMLTemplateElement === "function") {
    const template = document2.createElement("template");
    if (template.content && template.content.ownerDocument)
      document2 = template.content.ownerDocument;
  }
  let trustedTypesPolicy;
  let emptyHTML = "";
  let defaultTrustedTypesPolicy;
  let defaultTrustedTypesPolicyResolved = false;
  let IN_TRUSTED_TYPES_POLICY = 0;
  const _assertNotInTrustedTypesPolicy = function _assertNotInTrustedTypesPolicy() {
    if (IN_TRUSTED_TYPES_POLICY > 0)
      throw typeErrorCreate('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.');
  };
  const _createTrustedHTML = function _createTrustedHTML(html) {
    _assertNotInTrustedTypesPolicy();
    IN_TRUSTED_TYPES_POLICY++;
    try {
      return trustedTypesPolicy.createHTML(html);
    } finally {
      IN_TRUSTED_TYPES_POLICY--;
    }
  };
  const _createTrustedScriptURL = function _createTrustedScriptURL(scriptUrl) {
    _assertNotInTrustedTypesPolicy();
    IN_TRUSTED_TYPES_POLICY++;
    try {
      return trustedTypesPolicy.createScriptURL(scriptUrl);
    } finally {
      IN_TRUSTED_TYPES_POLICY--;
    }
  };
  const _getDefaultTrustedTypesPolicy = function _getDefaultTrustedTypesPolicy() {
    if (!defaultTrustedTypesPolicyResolved) {
      defaultTrustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
      defaultTrustedTypesPolicyResolved = true;
    }
    return defaultTrustedTypesPolicy;
  };
  const _document = document2, { implementation, createNodeIterator, createDocumentFragment, getElementsByTagName } = _document;
  const importNode = originalDocument.importNode;
  let hooks = _createHooksMap();
  DOMPurify.isSupported = typeof entries === "function" && typeof getParentNode === "function" && implementation && implementation.createHTMLDocument !== undefined;
  const MUSTACHE_EXPR$1 = MUSTACHE_EXPR, ERB_EXPR$1 = ERB_EXPR, TMPLIT_EXPR$1 = TMPLIT_EXPR, DATA_ATTR$1 = DATA_ATTR, ARIA_ATTR$1 = ARIA_ATTR, IS_SCRIPT_OR_DATA$1 = IS_SCRIPT_OR_DATA, ATTR_WHITESPACE$1 = ATTR_WHITESPACE, CUSTOM_ELEMENT$1 = CUSTOM_ELEMENT;
  let IS_ALLOWED_URI$1 = IS_ALLOWED_URI;
  let ALLOWED_TAGS = null;
  const DEFAULT_ALLOWED_TAGS = addToSet({}, [
    ...html$1,
    ...svg$1,
    ...svgFilters,
    ...mathMl$1,
    ...text
  ]);
  let ALLOWED_ATTR = null;
  const DEFAULT_ALLOWED_ATTR = addToSet({}, [
    ...html,
    ...svg,
    ...mathMl,
    ...xml
  ]);
  let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
    tagNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: false
    }
  }));
  let FORBID_TAGS = null;
  let FORBID_ATTR = null;
  const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
    tagCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    }
  }));
  let ALLOW_ARIA_ATTR = true;
  let ALLOW_DATA_ATTR = true;
  let ALLOW_UNKNOWN_PROTOCOLS = false;
  let ALLOW_SELF_CLOSE_IN_ATTR = true;
  let SAFE_FOR_TEMPLATES = false;
  let SAFE_FOR_XML = true;
  let WHOLE_DOCUMENT = false;
  let SET_CONFIG = false;
  let SET_CONFIG_ALLOWED_TAGS = null;
  let SET_CONFIG_ALLOWED_ATTR = null;
  let FORCE_BODY = false;
  let RETURN_DOM = false;
  let RETURN_DOM_FRAGMENT = false;
  let RETURN_TRUSTED_TYPE = false;
  let SANITIZE_DOM = true;
  let SANITIZE_NAMED_PROPS = false;
  const SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
  let KEEP_CONTENT = true;
  let IN_PLACE = false;
  let USE_PROFILES = {};
  let FORBID_CONTENTS = null;
  const DEFAULT_FORBID_CONTENTS = addToSet({}, [
    "annotation-xml",
    "audio",
    "colgroup",
    "desc",
    "foreignobject",
    "head",
    "iframe",
    "math",
    "mi",
    "mn",
    "mo",
    "ms",
    "mtext",
    "noembed",
    "noframes",
    "noscript",
    "plaintext",
    "script",
    "selectedcontent",
    "style",
    "svg",
    "template",
    "thead",
    "title",
    "video",
    "xmp"
  ]);
  let DATA_URI_TAGS = null;
  const DEFAULT_DATA_URI_TAGS = addToSet({}, [
    "audio",
    "video",
    "img",
    "source",
    "image",
    "track"
  ]);
  let URI_SAFE_ATTRIBUTES = null;
  const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, [
    "alt",
    "class",
    "for",
    "id",
    "label",
    "name",
    "pattern",
    "placeholder",
    "role",
    "summary",
    "title",
    "value",
    "style",
    "xmlns"
  ]);
  const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
  let NAMESPACE = HTML_NAMESPACE;
  let IS_EMPTY_INPUT = false;
  let ALLOWED_NAMESPACES = null;
  const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [
    MATHML_NAMESPACE,
    SVG_NAMESPACE,
    HTML_NAMESPACE
  ], stringToString);
  const DEFAULT_MATHML_TEXT_INTEGRATION_POINTS = freeze([
    "mi",
    "mo",
    "mn",
    "ms",
    "mtext"
  ]);
  let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS);
  const DEFAULT_HTML_INTEGRATION_POINTS = freeze(["annotation-xml"]);
  let HTML_INTEGRATION_POINTS = addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS);
  const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, [
    "title",
    "style",
    "font",
    "a",
    "script"
  ]);
  let PARSER_MEDIA_TYPE = null;
  const SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
  const DEFAULT_PARSER_MEDIA_TYPE = "text/html";
  let transformCaseFunc = null;
  let CONFIG = null;
  const formElement = document2.createElement("form");
  const isRegexOrFunction = function isRegexOrFunction(testValue) {
    return testValue instanceof RegExp || testValue instanceof Function;
  };
  const _parseConfig = function _parseConfig() {
    let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    if (CONFIG && CONFIG === cfg)
      return;
    if (!cfg || typeof cfg !== "object")
      cfg = {};
    cfg = clone(cfg);
    PARSER_MEDIA_TYPE = SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
    transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
    ALLOWED_TAGS = _resolveSetOption(cfg, "ALLOWED_TAGS", DEFAULT_ALLOWED_TAGS, { transform: transformCaseFunc });
    ALLOWED_ATTR = _resolveSetOption(cfg, "ALLOWED_ATTR", DEFAULT_ALLOWED_ATTR, { transform: transformCaseFunc });
    ALLOWED_NAMESPACES = _resolveSetOption(cfg, "ALLOWED_NAMESPACES", DEFAULT_ALLOWED_NAMESPACES, { transform: stringToString });
    URI_SAFE_ATTRIBUTES = _resolveSetOption(cfg, "ADD_URI_SAFE_ATTR", DEFAULT_URI_SAFE_ATTRIBUTES, {
      transform: transformCaseFunc,
      base: DEFAULT_URI_SAFE_ATTRIBUTES
    });
    DATA_URI_TAGS = _resolveSetOption(cfg, "ADD_DATA_URI_TAGS", DEFAULT_DATA_URI_TAGS, {
      transform: transformCaseFunc,
      base: DEFAULT_DATA_URI_TAGS
    });
    FORBID_CONTENTS = _resolveSetOption(cfg, "FORBID_CONTENTS", DEFAULT_FORBID_CONTENTS, { transform: transformCaseFunc });
    FORBID_TAGS = _resolveSetOption(cfg, "FORBID_TAGS", clone({}), { transform: transformCaseFunc });
    FORBID_ATTR = _resolveSetOption(cfg, "FORBID_ATTR", clone({}), { transform: transformCaseFunc });
    USE_PROFILES = objectHasOwnProperty(cfg, "USE_PROFILES") ? cfg.USE_PROFILES && typeof cfg.USE_PROFILES === "object" ? clone(cfg.USE_PROFILES) : cfg.USE_PROFILES : false;
    ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
    ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
    ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
    ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false;
    SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
    SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false;
    WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
    RETURN_DOM = cfg.RETURN_DOM || false;
    RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
    RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
    FORCE_BODY = cfg.FORCE_BODY || false;
    SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
    SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
    KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
    IN_PLACE = cfg.IN_PLACE || false;
    IS_ALLOWED_URI$1 = isRegex(cfg.ALLOWED_URI_REGEXP) ? cfg.ALLOWED_URI_REGEXP : IS_ALLOWED_URI;
    NAMESPACE = typeof cfg.NAMESPACE === "string" ? cfg.NAMESPACE : HTML_NAMESPACE;
    MATHML_TEXT_INTEGRATION_POINTS = _resolveObjectOption(cfg, "MATHML_TEXT_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS));
    HTML_INTEGRATION_POINTS = _resolveObjectOption(cfg, "HTML_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS));
    const customElementHandling = _resolveObjectOption(cfg, "CUSTOM_ELEMENT_HANDLING", () => create(null));
    CUSTOM_ELEMENT_HANDLING = create(null);
    if (objectHasOwnProperty(customElementHandling, "tagNameCheck") && isRegexOrFunction(customElementHandling.tagNameCheck))
      CUSTOM_ELEMENT_HANDLING.tagNameCheck = customElementHandling.tagNameCheck;
    if (objectHasOwnProperty(customElementHandling, "attributeNameCheck") && isRegexOrFunction(customElementHandling.attributeNameCheck))
      CUSTOM_ELEMENT_HANDLING.attributeNameCheck = customElementHandling.attributeNameCheck;
    if (objectHasOwnProperty(customElementHandling, "allowCustomizedBuiltInElements") && typeof customElementHandling.allowCustomizedBuiltInElements === "boolean")
      CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = customElementHandling.allowCustomizedBuiltInElements;
    seal(CUSTOM_ELEMENT_HANDLING);
    if (SAFE_FOR_TEMPLATES)
      ALLOW_DATA_ATTR = false;
    if (RETURN_DOM_FRAGMENT)
      RETURN_DOM = true;
    if (USE_PROFILES) {
      ALLOWED_TAGS = addToSet({}, text);
      ALLOWED_ATTR = create(null);
      if (USE_PROFILES.html === true) {
        addToSet(ALLOWED_TAGS, html$1);
        addToSet(ALLOWED_ATTR, html);
      }
      if (USE_PROFILES.svg === true) {
        addToSet(ALLOWED_TAGS, svg$1);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.svgFilters === true) {
        addToSet(ALLOWED_TAGS, svgFilters);
        addToSet(ALLOWED_ATTR, svg);
        addToSet(ALLOWED_ATTR, xml);
      }
      if (USE_PROFILES.mathMl === true) {
        addToSet(ALLOWED_TAGS, mathMl$1);
        addToSet(ALLOWED_ATTR, mathMl);
        addToSet(ALLOWED_ATTR, xml);
      }
    }
    EXTRA_ELEMENT_HANDLING.tagCheck = null;
    EXTRA_ELEMENT_HANDLING.attributeCheck = null;
    if (objectHasOwnProperty(cfg, "ADD_TAGS")) {
      if (typeof cfg.ADD_TAGS === "function")
        EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
      else if (arrayIsArray(cfg.ADD_TAGS)) {
        if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS)
          ALLOWED_TAGS = clone(ALLOWED_TAGS);
        addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
      }
    }
    if (objectHasOwnProperty(cfg, "ADD_ATTR")) {
      if (typeof cfg.ADD_ATTR === "function")
        EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
      else if (arrayIsArray(cfg.ADD_ATTR)) {
        if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR)
          ALLOWED_ATTR = clone(ALLOWED_ATTR);
        addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
      }
    }
    if (objectHasOwnProperty(cfg, "ADD_FORBID_CONTENTS") && arrayIsArray(cfg.ADD_FORBID_CONTENTS)) {
      if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS)
        FORBID_CONTENTS = clone(FORBID_CONTENTS);
      addToSet(FORBID_CONTENTS, cfg.ADD_FORBID_CONTENTS, transformCaseFunc);
    }
    if (KEEP_CONTENT)
      ALLOWED_TAGS["#text"] = true;
    if (WHOLE_DOCUMENT)
      addToSet(ALLOWED_TAGS, [
        "html",
        "head",
        "body"
      ]);
    if (ALLOWED_TAGS.table) {
      addToSet(ALLOWED_TAGS, ["tbody"]);
      delete FORBID_TAGS.tbody;
    }
    if (cfg.TRUSTED_TYPES_POLICY) {
      if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== "function")
        throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
      if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== "function")
        throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
      const previousTrustedTypesPolicy = trustedTypesPolicy;
      trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
      try {
        emptyHTML = _createTrustedHTML("");
      } catch (error) {
        trustedTypesPolicy = previousTrustedTypesPolicy;
        throw error;
      }
    } else if (cfg.TRUSTED_TYPES_POLICY === null) {
      trustedTypesPolicy = undefined;
      emptyHTML = "";
    } else {
      if (trustedTypesPolicy === undefined)
        trustedTypesPolicy = _getDefaultTrustedTypesPolicy();
      if (trustedTypesPolicy && typeof emptyHTML === "string")
        emptyHTML = _createTrustedHTML("");
    }
    if (freeze)
      freeze(cfg);
    CONFIG = cfg;
  };
  const ALL_SVG_TAGS = addToSet({}, [
    ...svg$1,
    ...svgFilters,
    ...svgDisallowed
  ]);
  const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
  const _checkSvgNamespace = function _checkSvgNamespace(tagName, parent, parentTagName) {
    if (parent.namespaceURI === HTML_NAMESPACE)
      return tagName === "svg";
    if (parent.namespaceURI === MATHML_NAMESPACE)
      return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
    return Boolean(ALL_SVG_TAGS[tagName]);
  };
  const _checkMathMlNamespace = function _checkMathMlNamespace(tagName, parent, parentTagName) {
    if (parent.namespaceURI === HTML_NAMESPACE)
      return tagName === "math";
    if (parent.namespaceURI === SVG_NAMESPACE)
      return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
    return Boolean(ALL_MATHML_TAGS[tagName]);
  };
  const _checkHtmlNamespace = function _checkHtmlNamespace(tagName, parent, parentTagName) {
    if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName])
      return false;
    if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName])
      return false;
    return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
  };
  const _checkValidNamespace = function _checkValidNamespace(element) {
    let parent = getParentNode(element);
    if (!parent || !parent.tagName)
      parent = {
        namespaceURI: NAMESPACE,
        tagName: "template"
      };
    const tagName = stringToLowerCase(element.tagName);
    const parentTagName = stringToLowerCase(parent.tagName);
    if (!ALLOWED_NAMESPACES[element.namespaceURI])
      return false;
    if (element.namespaceURI === SVG_NAMESPACE)
      return _checkSvgNamespace(tagName, parent, parentTagName);
    if (element.namespaceURI === MATHML_NAMESPACE)
      return _checkMathMlNamespace(tagName, parent, parentTagName);
    if (element.namespaceURI === HTML_NAMESPACE)
      return _checkHtmlNamespace(tagName, parent, parentTagName);
    if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[element.namespaceURI])
      return true;
    return false;
  };
  const _forceRemove = function _forceRemove(node) {
    arrayPush(DOMPurify.removed, { element: node });
    try {
      getParentNode(node).removeChild(node);
    } catch (_) {
      remove(node);
      if (!getParentNode(node))
        throw typeErrorCreate("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
    }
  };
  const _stripAttributeNode = function _stripAttributeNode(element, attribute, name) {
    try {
      removeAttributeNode(element, attribute);
    } catch (_) {
      try {
        element.removeAttribute(name);
      } catch (_) {}
    }
  };
  const _neutralizeRoot = function _neutralizeRoot(root) {
    _neutralizeSubtree(root);
    const childNodes = getChildNodes(root);
    if (childNodes) {
      const snapshot = [];
      arrayForEach(childNodes, (child) => {
        arrayPush(snapshot, child);
      });
      arrayForEach(snapshot, (child) => {
        try {
          remove(child);
        } catch (_) {}
      });
    }
    const attributes = getAttributes(root);
    if (attributes)
      for (let i = attributes.length - 1;i >= 0; --i) {
        const attribute = attributes[i];
        const name = attribute && attribute.name;
        if (typeof name === "string")
          _stripAttributeNode(root, attribute, name);
      }
  };
  const _removeAttribute = function _removeAttribute(name, element, attr) {
    if (!attr)
      try {
        attr = element.getAttributeNode(name);
      } catch (_) {
        attr = null;
      }
    arrayPush(DOMPurify.removed, {
      attribute: attr || null,
      from: element
    });
    try {
      if (attr)
        removeAttributeNode(element, attr);
      else
        element.removeAttribute(name);
    } catch (_) {
      try {
        element.removeAttribute(name);
      } catch (_) {}
    }
    if (name === "is") {
      if (RETURN_DOM || RETURN_DOM_FRAGMENT)
        try {
          _forceRemove(element);
        } catch (_) {}
      else
        try {
          element.setAttribute(name, "");
        } catch (_) {}
    }
  };
  const _stripDisallowedAttributes = function _stripDisallowedAttributes(element) {
    const attributes = getAttributes(element);
    if (!attributes)
      return;
    for (let i = attributes.length - 1;i >= 0; --i) {
      const attribute = attributes[i];
      const name = attribute && attribute.name;
      if (typeof name !== "string" || ALLOWED_ATTR[transformCaseFunc(name)])
        continue;
      _stripAttributeNode(element, attribute, name);
    }
  };
  const _neutralizeSubtree = function _neutralizeSubtree(root) {
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (_readNodeType(node) === NODE_TYPE.element)
        _stripDisallowedAttributes(node);
      const childNodes = getChildNodes(node);
      if (childNodes)
        for (let i = childNodes.length - 1;i >= 0; --i)
          stack.push(childNodes[i]);
    }
  };
  const _isPatchLinkageAttribute = function _isPatchLinkageAttribute(lcName, lcTag) {
    if (!SAFE_FOR_XML)
      return false;
    if (lcName === "patchsrc")
      return true;
    return lcName === "for" && lcTag !== "label" && lcTag !== "output";
  };
  const _neutralizePatchLinkage = function _neutralizePatchLinkage(root) {
    if (!SAFE_FOR_XML)
      return;
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      const nodeType = _readNodeType(node);
      if (nodeType === NODE_TYPE.processingInstruction || nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, node.data)) {
        try {
          remove(node);
        } catch (_) {}
        continue;
      }
      if (nodeType === NODE_TYPE.element) {
        const element = node;
        const lcTag = transformCaseFunc(_readNodeName(node));
        try {
          if (element.hasAttribute && element.hasAttribute("patchsrc"))
            element.removeAttribute("patchsrc");
          if (element.hasAttribute && element.hasAttribute("for") && _isPatchLinkageAttribute("for", lcTag))
            element.removeAttribute("for");
        } catch (_) {}
      }
      const childNodes = getChildNodes(node);
      if (childNodes)
        for (let i = childNodes.length - 1;i >= 0; --i)
          stack.push(childNodes[i]);
    }
  };
  const _initDocument = function _initDocument(dirty) {
    let doc = null;
    let leadingWhitespace = null;
    if (FORCE_BODY)
      dirty = "<remove></remove>" + dirty;
    else {
      const matches = stringMatch(dirty, /^[\r\n\t ]+/);
      leadingWhitespace = matches && matches[0];
    }
    if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE)
      dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + "</body></html>";
    const dirtyPayload = trustedTypesPolicy ? _createTrustedHTML(dirty) : dirty;
    if (NAMESPACE === HTML_NAMESPACE)
      try {
        doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
      } catch (_) {}
    if (!doc || !doc.documentElement) {
      doc = implementation.createDocument(NAMESPACE, "template", null);
      try {
        doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
      } catch (_) {}
    }
    const body = doc.body || doc.documentElement;
    if (dirty && leadingWhitespace)
      body.insertBefore(document2.createTextNode(leadingWhitespace), body.childNodes[0] || null);
    if (NAMESPACE === HTML_NAMESPACE)
      return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
    return WHOLE_DOCUMENT ? doc.documentElement : body;
  };
  const _createNodeIterator = function _createNodeIterator(root) {
    const doc = getOwnerDocument ? getOwnerDocument(root) : root.ownerDocument;
    return createNodeIterator.call(doc || root, root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION, null);
  };
  const _stripTemplateExpressions = function _stripTemplateExpressions(value) {
    value = stringReplace(value, MUSTACHE_EXPR$1, " ");
    value = stringReplace(value, ERB_EXPR$1, " ");
    value = stringReplace(value, TMPLIT_EXPR$1, " ");
    return value;
  };
  const _scrubTemplateExpressions2 = function _scrubTemplateExpressions(node) {
    var _node$querySelectorAl;
    node.normalize();
    const doc = getOwnerDocument ? getOwnerDocument(node) : node.ownerDocument;
    const walker = createNodeIterator.call(doc || node, node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_PROCESSING_INSTRUCTION, null);
    let currentNode = walker.nextNode();
    while (currentNode) {
      currentNode.data = _stripTemplateExpressions(currentNode.data);
      currentNode = walker.nextNode();
    }
    const templates = (_node$querySelectorAl = node.querySelectorAll) === null || _node$querySelectorAl === undefined ? undefined : _node$querySelectorAl.call(node, "template");
    if (templates)
      arrayForEach(templates, (tmpl) => {
        if (_isDocumentFragment(tmpl.content))
          _scrubTemplateExpressions2(tmpl.content);
      });
  };
  const _isClobbered = function _isClobbered(element) {
    const realTagName = getNodeName ? getNodeName(element) : null;
    if (typeof realTagName !== "string")
      return false;
    if (transformCaseFunc(realTagName) !== "form")
      return false;
    return typeof element.nodeName !== "string" || typeof element.textContent !== "string" || typeof element.removeChild !== "function" || element.attributes !== getAttributes(element) || typeof element.removeAttribute !== "function" || typeof element.removeAttributeNode !== "function" || typeof element.getAttributeNode !== "function" || typeof element.setAttribute !== "function" || typeof element.namespaceURI !== "string" || typeof element.insertBefore !== "function" || typeof element.hasChildNodes !== "function" || element.nodeType !== getNodeType(element) || element.childNodes !== getChildNodes(element);
  };
  const _isDocumentFragment = function _isDocumentFragment(value) {
    if (!getNodeType || typeof value !== "object" || value === null)
      return false;
    try {
      return getNodeType(value) === NODE_TYPE.documentFragment;
    } catch (_) {
      return false;
    }
  };
  const _isNode = function _isNode(value) {
    if (!getNodeType || typeof value !== "object" || value === null)
      return false;
    try {
      return typeof getNodeType(value) === "number";
    } catch (_) {
      return false;
    }
  };
  function _executeHooks(hooks, currentNode, data) {
    if (hooks.length === 0)
      return;
    arrayForEach(hooks, (hook) => {
      hook.call(DOMPurify, currentNode, data, CONFIG);
    });
  }
  const _isUnsafeNode = function _isUnsafeNode(currentNode, tagName) {
    if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.textContent) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.innerHTML))
      return true;
    if (SAFE_FOR_XML && currentNode.namespaceURI === HTML_NAMESPACE && LITERAL_TEXT_ELEMENTS[tagName] && (_isNode(currentNode.firstElementChild) || typeof currentNode.textContent === "string" && regExpTest(LITERAL_TEXT_CLOSE[tagName], currentNode.textContent)))
      return true;
    if (currentNode.nodeType === NODE_TYPE.processingInstruction)
      return true;
    if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, currentNode.data))
      return true;
    return false;
  };
  const _matchesNameCheck = function _matchesNameCheck(check, name) {
    if (check instanceof RegExp)
      return regExpTest(check, name);
    if (check instanceof Function) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2;_key < _len; _key++)
        args[_key - 2] = arguments[_key];
      return Boolean(check(name, ...args));
    }
    return false;
  };
  const _sanitizeDisallowedNode = function _sanitizeDisallowedNode(currentNode, tagName, root) {
    if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName))
      return false;
    if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
      const parentNode = getParentNode(currentNode);
      const childNodes = getChildNodes(currentNode);
      if (childNodes && parentNode) {
        const childCount = childNodes.length;
        for (let i = childCount - 1;i >= 0; --i) {
          const hoisted = currentNode === root ? cloneNode(childNodes[i], true) : childNodes[i];
          parentNode.insertBefore(hoisted, getNextSibling(currentNode));
        }
      }
    }
    _forceRemove(currentNode);
    return true;
  };
  const _forkSharedAllowlist = function _forkSharedAllowlist(hookList, set, defaultSet, setConfigSet) {
    if (hookList.length === 0)
      return set;
    return set === defaultSet || set === setConfigSet ? clone(set) : set;
  };
  const _handleHookDetachedNode = function _handleHookDetachedNode(currentNode, root) {
    if (currentNode === root || getParentNode(currentNode) !== null)
      return false;
    if (IN_PLACE)
      _neutralizeSubtree(currentNode);
    return true;
  };
  const _sanitizeElements = function _sanitizeElements(currentNode, root) {
    _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
    if (_handleHookDetachedNode(currentNode, root))
      return true;
    if (_isClobbered(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    const tagName = transformCaseFunc(_readNodeName(currentNode));
    ALLOWED_TAGS = _forkSharedAllowlist(hooks.uponSanitizeElement, ALLOWED_TAGS, DEFAULT_ALLOWED_TAGS, SET_CONFIG_ALLOWED_TAGS);
    _executeHooks(hooks.uponSanitizeElement, currentNode, {
      tagName,
      allowedTags: ALLOWED_TAGS
    });
    if (_handleHookDetachedNode(currentNode, root))
      return true;
    if (_isUnsafeNode(currentNode, tagName)) {
      _forceRemove(currentNode);
      return true;
    }
    if (FORBID_TAGS[tagName] || !(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && !ALLOWED_TAGS[tagName]) {
      const removed = _sanitizeDisallowedNode(currentNode, tagName, root);
      if (removed === false) {
        _executeHooks(hooks.afterSanitizeElements, currentNode, null);
        if (_handleHookDetachedNode(currentNode, root))
          return true;
      }
      return removed;
    }
    if (_readNodeType(currentNode) === NODE_TYPE.element && !_checkValidNamespace(currentNode)) {
      _forceRemove(currentNode);
      return true;
    }
    if ((tagName === "noscript" || tagName === "noembed" || tagName === "noframes") && regExpTest(FALLBACK_TAG_CLOSE, currentNode.innerHTML)) {
      _forceRemove(currentNode);
      return true;
    }
    if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
      const content = _stripTemplateExpressions(currentNode.textContent);
      if (currentNode.textContent !== content) {
        arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
        currentNode.textContent = content;
      }
    }
    _executeHooks(hooks.afterSanitizeElements, currentNode, null);
    return _handleHookDetachedNode(currentNode, root);
  };
  const _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
    if (FORBID_ATTR[lcName])
      return false;
    if (_isPatchLinkageAttribute(lcName, lcTag))
      return false;
    if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && ((value in document2) || (value in formElement)))
      return false;
    const nameIsPermitted = ALLOWED_ATTR[lcName] || EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag);
    if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$1, lcName))
      return true;
    if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$1, lcName))
      return true;
    if (!nameIsPermitted)
      return _isBasicCustomElement(lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName, lcTag) || lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value);
    if (URI_SAFE_ATTRIBUTES[lcName])
      return true;
    if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE$1, "")))
      return true;
    if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag])
      return true;
    if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$1, stringReplace(value, ATTR_WHITESPACE$1, "")))
      return true;
    return !value;
  };
  const RESERVED_CUSTOM_ELEMENT_NAMES = addToSet({}, [
    "annotation-xml",
    "color-profile",
    "font-face",
    "font-face-format",
    "font-face-name",
    "font-face-src",
    "font-face-uri",
    "missing-glyph"
  ]);
  const _isBasicCustomElement = function _isBasicCustomElement(tagName) {
    return !RESERVED_CUSTOM_ELEMENT_NAMES[stringToLowerCase(tagName)] && regExpTest(CUSTOM_ELEMENT$1, tagName);
  };
  const _applyTrustedTypesToAttribute = function _applyTrustedTypesToAttribute(lcTag, lcName, namespaceURI, value) {
    if (trustedTypesPolicy && typeof trustedTypes === "object" && typeof trustedTypes.getAttributeType === "function" && !namespaceURI)
      switch (trustedTypes.getAttributeType(lcTag, lcName)) {
        case "TrustedHTML":
          return _createTrustedHTML(value);
        case "TrustedScriptURL":
          return _createTrustedScriptURL(value);
      }
    return value;
  };
  const _setAttributeValue = function _setAttributeValue(currentNode, name, namespaceURI, value) {
    try {
      if (namespaceURI)
        currentNode.setAttributeNS(namespaceURI, name, value);
      else
        currentNode.setAttribute(name, value);
      if (_isClobbered(currentNode)) {
        _forceRemove(currentNode);
        return false;
      }
      return true;
    } catch (_) {
      _removeAttribute(name, currentNode);
      return false;
    }
  };
  const _sanitizeAttributes = function _sanitizeAttributes(currentNode, root) {
    _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
    if (_handleHookDetachedNode(currentNode, root))
      return;
    const attributes = currentNode.attributes;
    if (!attributes || _isClobbered(currentNode))
      return;
    ALLOWED_ATTR = _forkSharedAllowlist(hooks.uponSanitizeAttribute, ALLOWED_ATTR, DEFAULT_ALLOWED_ATTR, SET_CONFIG_ALLOWED_ATTR);
    const hookEvent = {
      attrName: "",
      attrValue: "",
      keepAttr: true,
      allowedAttributes: ALLOWED_ATTR,
      forceKeepAttr: undefined
    };
    let l = attributes.length;
    const lcTag = transformCaseFunc(currentNode.nodeName);
    while (l--) {
      const attr = attributes[l];
      const { name, namespaceURI, value: attrValue } = attr;
      const lcName = transformCaseFunc(name);
      const initValue = attrValue;
      let value = name === "value" ? initValue : stringTrim(initValue);
      let recreatedNamedProp = false;
      hookEvent.attrName = lcName;
      hookEvent.attrValue = value;
      hookEvent.keepAttr = true;
      hookEvent.forceKeepAttr = undefined;
      _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
      value = hookEvent.attrValue;
      if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name") && stringIndexOf(value, SANITIZE_NAMED_PROPS_PREFIX) !== 0) {
        _removeAttribute(name, currentNode, attr);
        value = SANITIZE_NAMED_PROPS_PREFIX + value;
        recreatedNamedProp = true;
      }
      if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, value)) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (lcName === "attributename" && stringMatch(value, "href")) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (hookEvent.forceKeepAttr)
        continue;
      if (!hookEvent.keepAttr) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(SELF_CLOSING_TAG, value)) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      if (SAFE_FOR_TEMPLATES)
        value = _stripTemplateExpressions(value);
      if (!_isValidAttribute(lcTag, lcName, value)) {
        _removeAttribute(name, currentNode, attr);
        continue;
      }
      value = _applyTrustedTypesToAttribute(lcTag, lcName, namespaceURI, value);
      if (value !== initValue) {
        if (_setAttributeValue(currentNode, name, namespaceURI, value) && recreatedNamedProp)
          arrayPop(DOMPurify.removed);
      }
    }
    _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
    _handleHookDetachedNode(currentNode, root);
  };
  const _sanitizeShadowDOM2 = function _sanitizeShadowDOM(fragment) {
    let shadowNode = null;
    const shadowIterator = _createNodeIterator(fragment);
    _executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
    while (shadowNode = shadowIterator.nextNode()) {
      _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
      _sanitizeElements(shadowNode, fragment);
      _sanitizeAttributes(shadowNode, fragment);
      if (_isDocumentFragment(shadowNode.content))
        _sanitizeShadowDOM2(shadowNode.content);
      if (_readNodeType(shadowNode) === NODE_TYPE.element) {
        const innerSr = getShadowRoot(shadowNode);
        if (_isDocumentFragment(innerSr)) {
          _sanitizeAttachedShadowRoots(innerSr);
          _sanitizeShadowDOM2(innerSr);
        }
      }
    }
    _executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
  };
  const _sanitizeAttachedShadowRoots = function _sanitizeAttachedShadowRoots(root) {
    const stack = [{
      node: root,
      shadow: null
    }];
    while (stack.length > 0) {
      const item = stack.pop();
      if (item.shadow) {
        _sanitizeShadowDOM2(item.shadow);
        continue;
      }
      const node = item.node;
      const isElement = _readNodeType(node) === NODE_TYPE.element;
      const childNodes = getChildNodes(node);
      if (childNodes)
        for (let i = childNodes.length - 1;i >= 0; --i)
          stack.push({
            node: childNodes[i],
            shadow: null
          });
      if (isElement) {
        const rootName = getNodeName ? getNodeName(node) : null;
        if (typeof rootName === "string" && transformCaseFunc(rootName) === "template") {
          const content = node.content;
          if (_isDocumentFragment(content))
            stack.push({
              node: content,
              shadow: null
            });
        }
      }
      if (isElement) {
        const sr = getShadowRoot(node);
        if (_isDocumentFragment(sr))
          stack.push({
            node: null,
            shadow: sr
          }, {
            node: sr,
            shadow: null
          });
      }
    }
  };
  DOMPurify.sanitize = function(dirty) {
    let cfg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let body = null;
    let importedNode = null;
    let currentNode = null;
    let returnNode = null;
    IS_EMPTY_INPUT = !dirty;
    if (IS_EMPTY_INPUT)
      dirty = "<!-->";
    if (typeof dirty !== "string" && !_isNode(dirty)) {
      dirty = stringifyValue(dirty);
      if (typeof dirty !== "string")
        throw typeErrorCreate("dirty is not a string, aborting");
    }
    if (!DOMPurify.isSupported)
      return dirty;
    if (SET_CONFIG) {
      ALLOWED_TAGS = SET_CONFIG_ALLOWED_TAGS;
      ALLOWED_ATTR = SET_CONFIG_ALLOWED_ATTR;
    } else
      _parseConfig(cfg);
    if (hooks.uponSanitizeElement.length > 0 || hooks.uponSanitizeAttribute.length > 0)
      ALLOWED_TAGS = clone(ALLOWED_TAGS);
    if (hooks.uponSanitizeAttribute.length > 0)
      ALLOWED_ATTR = clone(ALLOWED_ATTR);
    DOMPurify.removed = [];
    const inPlace = IN_PLACE && typeof dirty !== "string" && _isNode(dirty);
    if (inPlace) {
      _neutralizePatchLinkage(dirty);
      const nn = _readNodeName(dirty);
      if (typeof nn === "string") {
        const tagName = transformCaseFunc(nn);
        if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
          _neutralizeRoot(dirty);
          throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
        }
      }
      if (_isClobbered(dirty)) {
        _neutralizeRoot(dirty);
        throw typeErrorCreate("root node is clobbered and cannot be sanitized in-place");
      }
      try {
        _sanitizeAttachedShadowRoots(dirty);
      } catch (error) {
        _neutralizeRoot(dirty);
        throw error;
      }
    } else if (_isNode(dirty)) {
      body = _initDocument("<!---->");
      importedNode = body.ownerDocument.importNode(dirty, true);
      if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === "BODY")
        body = importedNode;
      else if (importedNode.nodeName === "HTML")
        body = importedNode;
      else
        body.appendChild(importedNode);
      _sanitizeAttachedShadowRoots(body);
    } else {
      if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && dirty.indexOf("<") === -1)
        return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(dirty) : dirty;
      body = _initDocument(dirty);
      if (!body)
        return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
    }
    if (body && FORCE_BODY)
      _forceRemove(body.firstChild);
    const walkRoot = inPlace ? dirty : body;
    try {
      const nodeIterator = _createNodeIterator(walkRoot);
      while (currentNode = nodeIterator.nextNode()) {
        _sanitizeElements(currentNode, walkRoot);
        _sanitizeAttributes(currentNode, walkRoot);
        if (_isDocumentFragment(currentNode.content))
          _sanitizeShadowDOM2(currentNode.content);
      }
    } catch (error) {
      if (inPlace) {
        _neutralizeRoot(dirty);
        arrayForEach(DOMPurify.removed, (entry) => {
          if (entry.element)
            _neutralizeSubtree(entry.element);
        });
      }
      throw error;
    }
    if (inPlace) {
      let rootWasRemoved = false;
      arrayForEach(DOMPurify.removed, (entry) => {
        if (entry.element) {
          if (entry.element === dirty)
            rootWasRemoved = true;
          _neutralizeSubtree(entry.element);
        }
      });
      if (rootWasRemoved)
        throw typeErrorCreate("a node selected for removal could not be safely returned; refusing to sanitize in place");
      if (SAFE_FOR_TEMPLATES)
        _scrubTemplateExpressions2(dirty);
      return dirty;
    }
    if (RETURN_DOM) {
      if (SAFE_FOR_TEMPLATES)
        _scrubTemplateExpressions2(body);
      if (RETURN_DOM_FRAGMENT) {
        returnNode = createDocumentFragment.call(body.ownerDocument);
        while (body.firstChild)
          returnNode.appendChild(body.firstChild);
      } else
        returnNode = body;
      if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode)
        returnNode = importNode.call(originalDocument, returnNode, true);
      return returnNode;
    }
    let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
    if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name))
      serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + `>
` + serializedHTML;
    if (SAFE_FOR_TEMPLATES)
      serializedHTML = _stripTemplateExpressions(serializedHTML);
    return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(serializedHTML) : serializedHTML;
  };
  DOMPurify.setConfig = function() {
    let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _parseConfig(cfg);
    SET_CONFIG = true;
    SET_CONFIG_ALLOWED_TAGS = ALLOWED_TAGS;
    SET_CONFIG_ALLOWED_ATTR = ALLOWED_ATTR;
  };
  DOMPurify.clearConfig = function() {
    CONFIG = null;
    SET_CONFIG = false;
    SET_CONFIG_ALLOWED_TAGS = null;
    SET_CONFIG_ALLOWED_ATTR = null;
    trustedTypesPolicy = defaultTrustedTypesPolicy;
    emptyHTML = "";
  };
  DOMPurify.isValidAttribute = function(tag, attr, value) {
    if (!CONFIG)
      _parseConfig({});
    const lcTag = transformCaseFunc(tag);
    const lcName = transformCaseFunc(attr);
    return _isValidAttribute(lcTag, lcName, value);
  };
  DOMPurify.addHook = function(entryPoint, hookFunction) {
    if (typeof hookFunction !== "function")
      return;
    if (!objectHasOwnProperty(hooks, entryPoint))
      return;
    arrayPush(hooks[entryPoint], hookFunction);
  };
  DOMPurify.removeHook = function(entryPoint, hookFunction) {
    if (!objectHasOwnProperty(hooks, entryPoint))
      return;
    if (hookFunction !== undefined) {
      const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
      return index === -1 ? undefined : arraySplice(hooks[entryPoint], index, 1)[0];
    }
    return arrayPop(hooks[entryPoint]);
  };
  DOMPurify.removeHooks = function(entryPoint) {
    if (!objectHasOwnProperty(hooks, entryPoint))
      return;
    hooks[entryPoint] = [];
  };
  DOMPurify.removeAllHooks = function() {
    hooks = _createHooksMap();
  };
  return DOMPurify;
}
var purify_default = createDOMPurify();

// src/component/tree-caption/index.mjs
function captionElement(template, policy) {
  const caption = template.ownerDocument.createElement("span");
  caption.append(template.content.cloneNode(true));
  purify_default.sanitize(caption, {
    IN_PLACE: true,
    ALLOWED_TAGS: policy.tags,
    ALLOWED_ATTR: policy.attributes,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true
  });
  caption.className = "catalog-caption muted";
  for (const link of caption.querySelectorAll("a")) {
    const value = link.getAttribute("href");
    let url = null;
    try {
      if (value) {
        const candidate = new URL(value, template.ownerDocument.baseURI);
        if (candidate.protocol === "http:" || candidate.protocol === "https:")
          url = candidate.href;
      }
    } catch {}
    if (!url)
      link.replaceWith(...link.childNodes);
    else {
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  }
  return caption;
}
function showCaptionLinkIcon(link, visible) {
  const current = link.querySelector(":scope > .navigation-link-icon");
  if (!visible) {
    current?.remove();
    return;
  }
  if (current)
    return;
  const icon = link.ownerDocument.createElement("span");
  icon.className = "navigation-link-icon";
  icon.setAttribute("aria-hidden", "true");
  link.prepend(icon);
}

// src/component/tree-loader/index.mjs
class TreeLoader extends HTMLElement {
  static observedAttributes = ["label"];
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this.#label();
    this.restart();
  }
  attributeChangedCallback() {
    this.#label();
  }
  #label() {
    const label = this.getAttribute("label");
    if (label) {
      this.setAttribute("role", "img");
      this.setAttribute("aria-label", label);
    } else {
      this.removeAttribute("role");
      this.removeAttribute("aria-label");
    }
  }
  restart() {
    const root = this.shadowRoot;
    if (!root)
      return;
    const style = this.ownerDocument.createElement("style");
    style.textContent = `
      :host { display: inline-grid; width: 1ch; font: inherit; }
      span { grid-area: 1 / 1; opacity: 0; animation: frame 1s steps(1, end) infinite; }
      span:nth-child(3) { animation-delay: .25s; }
      span:nth-child(4) { animation-delay: .5s; }
      span:nth-child(5) { animation-delay: .75s; }
      @keyframes frame { 0% { opacity: 1; } 25%, 100% { opacity: 0; } }
      @media (prefers-reduced-motion: reduce) {
        span { animation: none; }
        span:nth-child(2) { opacity: 1; }
      }
    `;
    const frames = ["|", "/", "–", "\\"].map((symbol) => {
      const frame = this.ownerDocument.createElement("span");
      frame.textContent = symbol;
      frame.setAttribute("aria-hidden", "true");
      return frame;
    });
    root.replaceChildren(style, ...frames);
  }
}
customElements.define("tree-loader", TreeLoader);

// src/component/tree-retry/index.mjs
function treeRetry(owner, label, action) {
  const button = owner.createElement("button");
  button.className = "document-retry control primary";
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  return button;
}

// src/bloc/catalog/search.mjs
import { render as render3, nothing as nothing2 } from "lit";

// src/common/search/state.mjs
var queryLimit = 50;
function emptyMetadata() {
  return { latest: "", collecting: true, queries: Object.freeze([]) };
}
function readMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("latest" in value) || typeof value.latest !== "string" || !("collecting" in value) || typeof value.collecting !== "boolean" || !("queries" in value))
    return null;
  const queries = readSearchQueries(value.queries);
  return queries ? { latest: value.latest, collecting: value.collecting, queries: Object.freeze(queries) } : null;
}
function readSearchQueries(value) {
  if (!Array.isArray(value) || value.length > queryLimit)
    return null;
  const entries = value;
  const queries = [];
  const seen = new Set;
  for (const query of entries) {
    if (typeof query !== "string" || !query || seen.has(query))
      return null;
    seen.add(query);
    queries.push(query);
  }
  return queries;
}

class SearchState {
  #key;
  #storage;
  #state = emptyMetadata();
  #blockedWrite = false;
  #failure = null;
  constructor(storage, key = "site-search-state") {
    this.#storage = storage;
    this.#key = key;
    this.#read();
  }
  get latest() {
    return this.#state.latest;
  }
  get collecting() {
    return this.#state.collecting;
  }
  get queries() {
    return this.#state.queries;
  }
  exportData() {
    return { version: 1, queries: [...this.#state.queries] };
  }
  importData(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || !("version" in value) || value.version !== 1 || !("queries" in value))
      return false;
    return this.mergeQueries(value.queries);
  }
  mergeQueries(value) {
    const incoming = readSearchQueries(value);
    if (!incoming)
      return false;
    const queries = [...this.#state.queries, ...incoming.filter((query) => !this.#state.queries.includes(query))].slice(0, queryLimit);
    this.#state = { ...this.#state, queries: Object.freeze(queries) };
    this.#save();
    return true;
  }
  get failure() {
    return this.#failure;
  }
  setLatest(query) {
    if (query === this.#state.latest)
      return;
    this.#state = { ...this.#state, latest: query };
    this.#save();
  }
  commit() {
    const { latest, collecting, queries } = this.#state;
    if (!collecting || !latest || queries[0] === latest)
      return;
    this.#state = {
      ...this.#state,
      queries: Object.freeze([latest, ...queries.filter((query) => query !== latest)].slice(0, queryLimit))
    };
    this.#save();
  }
  remove(query) {
    if (!this.#state.queries.includes(query))
      return;
    this.#state = { ...this.#state, queries: Object.freeze(this.#state.queries.filter((value) => value !== query)) };
    this.#save();
  }
  setCollecting(value) {
    if (value === this.#state.collecting)
      return;
    this.#state = { ...this.#state, collecting: value };
    this.#save();
  }
  retryStorage() {
    if (this.#blockedWrite)
      this.#read();
    else if (this.#failure === "storage")
      this.#save();
  }
  #read() {
    try {
      if (!this.#storage)
        throw new Error("Browser storage is unavailable");
      const source = this.#storage.getItem(this.#key);
      let value;
      try {
        value = source === null ? null : JSON.parse(source);
      } catch {
        this.#failure = "corrupt";
        this.#blockedWrite = true;
        return;
      }
      const state = source === null ? emptyMetadata() : readMetadata(value);
      if (!state) {
        this.#failure = "corrupt";
        this.#blockedWrite = true;
        return;
      }
      this.#state = state;
      this.#blockedWrite = false;
      this.#failure = null;
    } catch {
      this.#failure = "storage";
      this.#blockedWrite = true;
    }
  }
  #save() {
    if (this.#blockedWrite)
      return;
    try {
      if (!this.#storage)
        throw new Error("Browser storage is unavailable");
      this.#storage.setItem(this.#key, JSON.stringify(this.#state));
      this.#failure = null;
    } catch {
      this.#failure = "storage";
    }
  }
}

// src/common/html/screen.mjs
import { html as html2 } from "lit";
var screens = new Map;
var pending = new Map;
function screenReady(name) {
  return screens.has(name);
}
function loadScreen(name) {
  if (screens.has(name))
    return Promise.resolve();
  const previous = pending.get(name);
  if (previous)
    return previous;
  const promise = requestHTML(`public/html/${name}.html`).then((source) => {
    const templates = new Map;
    const sections = /<template id="([a-zA-Z][a-zA-Z0-9.-]*)">([\s\S]*?)<\/template>/g;
    let end = 0;
    for (const section of source.matchAll(sections)) {
      const [match, id, content] = section;
      if (source.slice(end, section.index).trim() || templates.has(id) || /<script\b/i.test(content)) {
        throw new Error(`Неверная разметка экрана: ${name}`);
      }
      const names = [...content.matchAll(/\$\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((part) => part[1]);
      const parts = content.split(/\$\{[a-zA-Z][a-zA-Z0-9]*\}/);
      if (parts.some((part) => part.includes("${")))
        throw new Error(`Неверная подстановка: ${id}`);
      const strings = Object.freeze(Object.assign(parts, { raw: Object.freeze([...parts]) }));
      templates.set(id, { strings, names });
      end = section.index + match.length;
    }
    if (!end || source.slice(end).trim())
      throw new Error(`Нет разметки экрана: ${name}`);
    screens.set(name, templates);
  }).finally(() => pending.delete(name));
  pending.set(name, promise);
  return promise;
}
function screenTemplate(screen, name, values) {
  const template = screens.get(screen)?.get(name);
  if (!template)
    return html2``;
  return html2(template.strings, ...template.names.map((key) => values[key]));
}
function screenStatus(failed, retry, close = null) {
  return html2`
    <p
      class="navigation-message muted"
      role="status"
    >
      ${failed ? ui_strings_default.screens.failed : ui_strings_default.screens.loading}
      ${failed ? html2`
            <button
              type="button"
              class="control primary"
              @click=${retry}
            >
              ${ui_strings_default.screens.retry}
            </button>
          ` : ""}
      ${close ? html2`
            <button
              type="button"
              class="control primary"
              @click=${close}
            >
              ${ui_strings_default.navigation.close}
            </button>
          ` : ""}
    </p>
  `;
}

// src/component/search/index.mjs
import { render as render2 } from "lit";

// src/component/search/history.mjs
import { nothing, render } from "lit";
var views = new WeakMap;
function resetSearchHistory(container) {
  views.delete(container);
}
function renderSearchHistory(container, model, actions) {
  const view = views.get(container) || { model, actions, transfer: null };
  view.model = model;
  view.actions = actions;
  views.set(container, view);
  const repaint = () => renderSearchHistory(container, view.model, view.actions);
  const exchange = (importing) => {
    view.transfer = {
      importing,
      value: importing ? "" : JSON.stringify(view.actions.exportData(), null, 2),
      message: ""
    };
    repaint();
    const field = container.querySelector("textarea");
    field?.focus({ preventScroll: true });
    if (!importing)
      field?.select();
  };
  const transfer = view.transfer;
  const content = transfer ? screenTemplate("search", "search.transfer", {
    importing: transfer.importing,
    exporting: !transfer.importing,
    readonly: !transfer.importing,
    title: transfer.importing ? ui_strings_default.navigation.searchHistoryImport : ui_strings_default.navigation.searchHistoryExport,
    value: transfer.value,
    field: ui_strings_default.navigation.jsonField,
    message: transfer.message,
    onInput: (event) => {
      transfer.value = event.currentTarget.value;
    },
    onSubmit: (event) => {
      event.preventDefault();
      let value;
      try {
        value = JSON.parse(transfer.value);
      } catch {
        transfer.message = ui_strings_default.navigation.jsonInvalid;
        repaint();
        return;
      }
      if (!view.actions.importData(value)) {
        transfer.message = ui_strings_default.navigation.searchHistoryInvalid;
        repaint();
        return;
      }
      view.transfer = null;
      view.actions.refresh();
    },
    onCopy: () => {
      Promise.resolve().then(() => displayWindow(container).navigator.clipboard.writeText(transfer.value)).then(() => {
        if (views.get(container) !== view || view.transfer !== transfer)
          return;
        transfer.message = ui_strings_default.appearance.copied;
        repaint();
      }).catch(() => {
        if (views.get(container) !== view || view.transfer !== transfer)
          return;
        transfer.message = ui_strings_default.navigation.jsonCopyFailed;
        repaint();
      });
    },
    onBack: () => {
      view.transfer = null;
      repaint();
    },
    apply: ui_strings_default.navigation.jsonApply,
    copy: ui_strings_default.navigation.jsonCopy,
    back: ui_strings_default.navigation.jsonDone
  }) : screenTemplate("search", "search.historyList", {
    empty: model.labels.empty,
    isEmpty: !model.queries.length,
    hasQueries: Boolean(model.queries.length),
    entries: model.queries.map((query) => screenTemplate("search", "search.query", {
      query,
      current: query === model.current ? "true" : nothing,
      onSelect: () => view.actions.select(query),
      onRemove: () => view.actions.remove(query),
      removeLabel: model.labels.remove,
      removeIcon: model.icons.remove
    }))
  });
  render(screenTemplate("search", "search.history", {
    title: model.labels.title,
    closeLabel: model.labels.close,
    onClose: () => view.actions.close(),
    closeIcon: model.icons.close,
    onExport: () => exchange(false),
    onImport: () => exchange(true),
    exchangeHidden: Boolean(transfer),
    exportLabel: ui_strings_default.navigation.searchHistoryExport,
    importLabel: ui_strings_default.navigation.searchHistoryImport,
    exportIcon: controlIcon("tray.and.arrow.up"),
    importIcon: controlIcon("tray.and.arrow.down"),
    message: model.labels.message || "",
    messageHidden: !model.labels.message,
    retryLabel: model.labels.retry || "",
    retryHidden: !actions.retry,
    onRetry: () => view.actions.retry?.(),
    content
  }), container);
}

// src/component/search/index.mjs
function renderSearch(container, model, actions) {
  const inputChanged = (event) => actions.input(event.currentTarget.value);
  const keyPressed = (event) => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey)
      return;
    if (!event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      event.stopPropagation();
      actions.recall(event.key === "ArrowUp" ? -1 : 1);
    } else if (event.key === "Enter" && event.shiftKey && model.total) {
      event.preventDefault();
      event.stopPropagation();
      actions.previous();
    }
  };
  const submitted = (event) => {
    event.preventDefault();
    actions.submit();
  };
  const actionKey = (event) => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !model.total)
      return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
      return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "ArrowUp")
      actions.previous();
    else
      actions.next();
  };
  const cleared = () => {
    actions.clear();
    container.querySelector("input")?.focus({ preventScroll: true });
  };
  render2(screenTemplate("search", "search.form", {
    id: model.id || "navigation-search-input",
    selectionHidden: model.showSelection === false,
    historyLabel: model.labels.history,
    historyIcon: model.icons.history,
    onHistory: actions.history,
    class: `navigation-search${model.embedded ? " is-embedded" : ""}`,
    onSubmit: submitted,
    label: model.labels.label,
    query: model.query,
    placeholder: model.labels.placeholder,
    onInput: inputChanged,
    onKeydown: keyPressed,
    clearLabel: model.labels.clear,
    clearDisabled: !model.query,
    onClear: cleared,
    clearIcon: model.icons.clear,
    countLabel: model.labels.count,
    current: model.current,
    total: model.total,
    onActionKeydown: actionKey,
    previousLabel: model.labels.previous,
    noMatches: !model.total,
    onPrevious: actions.previous,
    previousIcon: model.icons.previous,
    nextLabel: model.labels.next,
    onNext: actions.next,
    nextIcon: model.icons.next,
    selectionLabel: model.labels.selection,
    selectionPressed: String(model.selectionOnly),
    selectionDisabled: !model.canSelection,
    onToggleSelection: actions.toggleSelection,
    selectionIcon: model.icons.selection,
    collectingLabel: model.labels.collecting,
    collectingPressed: String(model.collecting),
    onToggleCollecting: actions.toggleCollecting,
    collectingIcon: model.icons.collecting,
    closeLabel: model.labels.close,
    onClose: actions.close,
    closeIcon: model.icons.close
  }), container);
  const input = container.querySelector("input");
  if (!input)
    throw new Error("Search input is missing");
  return input;
}

// src/bloc/catalog/search.mjs
class CatalogSearch {
  #root;
  #rows;
  #select;
  #state;
  #bar;
  #dialog;
  #history;
  #matches = [];
  #current = -1;
  #recall = -1;
  #draft = "";
  #deleted = null;
  #open = false;
  #loading = false;
  #failed = false;
  #observer = null;
  #layoutObserver = null;
  #panelObserver = null;
  #focus = null;
  #events = null;
  #resumeDialog = false;
  #historyOpen = false;
  constructor(root, rows, select) {
    this.#root = root;
    this.#rows = rows;
    this.#select = select;
    let storage = null;
    try {
      storage = displayWindow(root).localStorage;
    } catch {}
    this.#state = new SearchState(storage, "site-catalog-search-state");
    this.#bar = root.ownerDocument.createElement("div");
    this.#bar.className = "catalog-search-bar";
    this.#bar.hidden = true;
    root.prepend(this.#bar);
    this.#dialog = root.ownerDocument.createElement("dialog");
    this.#dialog.className = "navigation-popup surface";
    this.#dialog.setAttribute("aria-label", ui_strings_default.navigation.catalogSearchHistory);
    this.#history = root.ownerDocument.createElement("div");
    this.#dialog.append(this.#history);
    root.append(this.#dialog);
  }
  connect() {
    if (this.#events)
      return;
    const view = displayWindow(this.#root);
    this.#events = new view.AbortController;
    const signal = this.#events.signal;
    this.#root.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey)
        return;
      if (event.key === "Escape" && (this.#dialog.open || this.#open && isHTMLElement(event.target) && this.#bar.contains(event.target))) {
        event.preventDefault();
        event.stopPropagation();
        if (this.#dialog.open)
          this.closeHistory();
        else
          this.close();
        return;
      }
      if (event.shiftKey || event.composedPath().some((node) => isHTMLElement(node) && node.matches("input,textarea,select,[contenteditable]")))
        return;
      if (event.code === "KeyF" || event.code === "KeyM") {
        event.preventDefault();
        event.stopPropagation();
        this.show();
      }
    }, { capture: true, signal });
    this.#dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.closeHistory();
    }, { signal });
    this.#dialog.addEventListener("click", (event) => {
      if (event.target === this.#dialog)
        this.closeHistory();
    }, { signal });
    const tree = this.#root.querySelector(":scope > .tree-list");
    if (tree) {
      this.#observer = new view.MutationObserver(() => {
        if (this.#open)
          this.#refresh();
      });
      this.#observer.observe(tree, { childList: true, subtree: true, characterData: true });
    }
    const panel = this.#root.parentElement?.querySelector("#hxdoc");
    this.#layoutObserver = new view.ResizeObserver(() => this.#layout());
    this.#layoutObserver.observe(this.#root);
    if (panel) {
      this.#layoutObserver.observe(panel);
      this.#panelObserver = new view.MutationObserver(() => this.#layout());
      this.#panelObserver.observe(panel, { attributes: true, attributeFilter: ["open", "style", "class"] });
    }
    if (this.#open)
      this.#refresh();
    if (this.#resumeDialog) {
      this.#resumeDialog = false;
      this.showHistory();
    }
  }
  pause() {
    this.#events?.abort();
    this.#events = null;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#layoutObserver?.disconnect();
    this.#layoutObserver = null;
    this.#panelObserver?.disconnect();
    this.#panelObserver = null;
    this.#resumeDialog = this.#dialog.open;
    if (this.#dialog.open)
      this.#dialog.close();
  }
  show() {
    const active = this.#root.ownerDocument.activeElement;
    if (!this.#open && isHTMLElement(active))
      this.#focus = active;
    this.#open = true;
    this.#bar.hidden = false;
    this.#ensure(() => {
      if (!this.#open || !this.#events)
        return;
      this.#refresh();
      this.#bar.querySelector("input")?.focus({ preventScroll: true });
    });
  }
  close() {
    if (this.#state.latest !== this.#deleted)
      this.#state.commit();
    const selected = this.#matches[this.#current];
    this.#matches.forEach((row) => row.classList.remove("catalog-search-current"));
    this.#open = false;
    this.#bar.hidden = true;
    this.#select(null);
    let focus = selected?.isConnected ? selected : this.#focus;
    while (focus && !focus.getBoundingClientRect().height) {
      let branch = focus.closest("details");
      if (branch?.querySelector(":scope > summary") === focus)
        branch = branch.parentElement?.closest("details") || null;
      focus = branch?.querySelector(":scope > summary") || null;
    }
    focus?.focus({ preventScroll: true });
  }
  showHistory() {
    this.#historyOpen = true;
    this.#ensure(() => {
      if (!this.#historyOpen || !this.#events)
        return;
      this.#renderHistory();
      if (!this.#dialog.open)
        this.#dialog.showModal();
    });
  }
  closeHistory() {
    this.#historyOpen = false;
    if (this.#dialog.open)
      this.#dialog.close();
    resetSearchHistory(this.#history);
    render3(nothing2, this.#history);
    if (this.#open)
      this.#bar.querySelector("input")?.focus({ preventScroll: true });
  }
  #ensure(ready) {
    if (screenReady("search")) {
      ready();
      return;
    }
    const target = this.#historyOpen ? this.#history : this.#bar;
    if (this.#historyOpen && !this.#dialog.open)
      this.#dialog.showModal();
    render3(screenStatus(this.#failed, () => {
      this.#failed = false;
      this.#ensure(ready);
    }), target);
    if (this.#loading)
      return;
    this.#loading = true;
    loadScreen("search").then(() => {
      if (!this.#events)
        return;
      if (this.#open)
        this.#refresh();
      if (this.#historyOpen) {
        this.#renderHistory();
        if (!this.#dialog.open)
          this.#dialog.showModal();
      }
      ready();
    }).catch(() => {
      this.#failed = true;
      if (this.#events)
        render3(screenStatus(true, () => {
          this.#failed = false;
          this.#ensure(ready);
        }), target);
    }).finally(() => {
      this.#loading = false;
    });
  }
  #refresh() {
    const selected = this.#matches[this.#current];
    this.#matches.forEach((row) => row.classList.remove("catalog-search-current"));
    const query = this.#state.latest.toLowerCase();
    this.#matches = query ? this.#rows().filter((row) => {
      const label = row.querySelector(".node-label")?.textContent || row.textContent || "";
      return label.toLowerCase().includes(query);
    }) : [];
    this.#current = selected ? this.#matches.indexOf(selected) : -1;
    if (selected && this.#current < 0)
      this.#select(null);
    this.#matches[this.#current]?.classList.add("catalog-search-current");
    this.#render();
  }
  #step(direction) {
    this.#state.commit();
    if (!this.#matches.length)
      return;
    this.#matches[this.#current]?.classList.remove("catalog-search-current");
    this.#current = this.#current < 0 ? direction === 1 ? 0 : this.#matches.length - 1 : (this.#current + direction + this.#matches.length) % this.#matches.length;
    const row = this.#matches[this.#current];
    row.classList.add("catalog-search-current");
    this.#select(row);
    this.#render();
  }
  #historyStep(direction) {
    if (!this.#state.queries.length)
      return;
    if (this.#recall < 0)
      this.#draft = this.#state.latest;
    this.#recall = Math.max(-1, Math.min(this.#state.queries.length - 1, this.#recall - direction));
    this.#state.setLatest(this.#recall < 0 ? this.#draft : this.#state.queries[this.#recall]);
    this.#current = -1;
    this.#select(null);
    this.#refresh();
  }
  #render() {
    if (!this.#open || !screenReady("search"))
      return;
    this.#layout();
    renderSearch(this.#bar, {
      id: "catalog-search-input",
      showSelection: false,
      embedded: true,
      query: this.#state.latest,
      current: this.#current + 1,
      total: this.#matches.length,
      collecting: this.#state.collecting,
      selectionOnly: false,
      canSelection: false,
      labels: {
        label: ui_strings_default.navigation.catalogSearch,
        placeholder: ui_strings_default.navigation.searchPlaceholder,
        previous: ui_strings_default.navigation.searchPrevious,
        next: ui_strings_default.navigation.searchNext,
        clear: ui_strings_default.navigation.searchClear,
        count: formatText(ui_strings_default.navigation.searchCount, { current: this.#current + 1, total: this.#matches.length }),
        selection: ui_strings_default.navigation.searchSelection,
        collecting: this.#state.collecting ? ui_strings_default.navigation.searchCollectingOn : ui_strings_default.navigation.searchCollectingOff,
        close: ui_strings_default.navigation.close,
        history: ui_strings_default.navigation.catalogSearchHistory
      },
      icons: {
        previous: controlIcon("search-previous"),
        next: controlIcon("search-next"),
        clear: controlIcon("search-clear"),
        selection: controlIcon("search-selection"),
        collecting: controlIcon(this.#state.collecting ? "search-collect-on" : "search-collect-off"),
        close: controlIcon("close"),
        history: controlIcon("history")
      }
    }, {
      input: (query) => {
        this.#deleted = null;
        this.#recall = -1;
        this.#state.setLatest(query);
        this.#current = -1;
        this.#select(null);
        this.#refresh();
      },
      recall: (direction) => this.#historyStep(direction),
      submit: () => this.#step(1),
      previous: () => this.#step(-1),
      next: () => this.#step(1),
      clear: () => {
        this.#deleted = this.#state.latest;
        this.#state.remove(this.#state.latest);
        this.#state.setLatest("");
        this.#recall = -1;
        this.#current = -1;
        this.#select(null);
        this.#refresh();
      },
      toggleSelection: () => {},
      toggleCollecting: () => {
        this.#state.setCollecting(!this.#state.collecting);
        this.#render();
      },
      close: () => this.close(),
      history: () => this.showHistory()
    });
  }
  #layout() {
    if (!this.#open)
      return;
    const view = displayWindow(this.#root);
    const box = this.#root.getBoundingClientRect();
    const style = view.getComputedStyle(this.#root);
    const left = box.left + parseFloat(style.paddingLeft);
    const right = box.right - parseFloat(style.paddingRight);
    const panel = this.#root.parentElement?.querySelector("#hxdoc[open]");
    const end = panel && !panel.matches(":modal") ? Math.min(right, panel.getBoundingClientRect().left - 4) : right;
    const width = `${Math.max(0, end - left)}px`;
    if (this.#bar.style.width !== width)
      this.#bar.style.width = width;
  }
  #renderHistory() {
    renderSearchHistory(this.#history, {
      queries: this.#state.queries,
      current: this.#state.latest,
      labels: {
        title: ui_strings_default.navigation.catalogSearchHistory,
        empty: ui_strings_default.navigation.searchHistoryEmpty,
        remove: ui_strings_default.navigation.searchHistoryRemove,
        close: ui_strings_default.navigation.close,
        message: this.#state.failure ? ui_strings_default.navigation.storageFailed : "",
        retry: ui_strings_default.navigation.retryStorage
      },
      icons: { remove: controlIcon("trash"), close: controlIcon("close") }
    }, {
      select: (query) => {
        this.#state.setLatest(query);
        this.#recall = -1;
        this.#current = -1;
        this.#select(null);
        this.closeHistory();
        this.show();
      },
      remove: (query) => {
        if (query === this.#state.latest)
          this.#deleted = query;
        this.#state.remove(query);
        this.#renderHistory();
      },
      close: () => this.closeHistory(),
      retry: () => {
        this.#state.retryStorage();
        this.#renderHistory();
      },
      exportData: () => this.#state.exportData(),
      importData: (value) => this.#state.importData(value),
      refresh: () => {
        this.#recall = -1;
        this.#renderHistory();
      }
    });
  }
}

// src/component/tree/index.mjs
function createTreeList(owner) {
  const list = owner.createElement("ul");
  list.className = "tree-list plain-list";
  return list;
}
function statusBody(status) {
  return status.querySelector(":scope > .description-text") || status;
}
function setStatus(status, ...content) {
  status.removeAttribute("data-loading");
  status.classList.remove("tree-content");
  statusBody(status).replaceChildren(...content.filter((item) => item !== ""));
}
function setLoading(status, label, continueBranch = false) {
  const loader = new TreeLoader;
  loader.setAttribute("label", label);
  setStatus(status, loader);
  status.setAttribute("data-loading", "");
  status.classList.toggle("tree-content", continueBranch);
}
function drawGuides(row, text) {
  const lines = [];
  for (const [index, glyph] of [...text].entries()) {
    if (!"│├└".includes(glyph))
      continue;
    const height = glyph === "└" ? "50%" : "100%";
    lines.push(`linear-gradient(var(--muted) 0 0) calc(${index + 0.5}ch - .5px) 0 / 1px ${height} no-repeat`);
  }
  row.style.setProperty("--tree-guides", lines.join(", "));
}
function refreshTree(list, ancestors = []) {
  const entries = [...list.children];
  entries.forEach((entry, index) => {
    const item = entry.firstElementChild;
    const row = item.matches("details") ? item.querySelector(":scope > summary") : item.querySelector(":scope > .tree-row") || item;
    const content = row.querySelector(":scope > h2") || row;
    let prefix = content.querySelector(":scope > .tree-prefix");
    if (!prefix) {
      prefix = Object.assign(row.ownerDocument.createElement("span"), { className: "tree-prefix muted" });
      prefix.setAttribute("aria-hidden", "true");
      content.prepend(prefix);
    }
    const last = index === entries.length - 1;
    const first = ancestors.map((last) => last ? "   " : "│  ").join("") + (last ? "└─" : "├─");
    const descendants = [...ancestors, last].map((last) => last ? "   " : "│  ").join("");
    const continuation = descendants.slice(0, -1);
    prefix.dataset.first = first;
    prefix.dataset.continuation = continuation;
    prefix.textContent = first;
    drawGuides(row, first);
    item.style.setProperty("--prefix-width", `${first.length}ch`);
    const hasChildren = Boolean(item.querySelector(":scope > .tree-list:not([hidden]) > li:not([hidden])"));
    item.querySelectorAll(":scope > .description").forEach((description) => {
      let guide = description.querySelector(":scope > .tree-prefix");
      if (!guide) {
        guide = Object.assign(description.ownerDocument.createElement("span"), { className: "tree-prefix muted" });
        guide.setAttribute("aria-hidden", "true");
        description.prepend(guide);
      }
      if (!description.querySelector(":scope > .description-text")) {
        const text = Object.assign(description.ownerDocument.createElement("span"), { className: "description-text" });
        text.append(...[...description.childNodes].filter((child) => child !== guide));
        description.append(text);
      }
      const contentGuide = description.classList.contains("tree-content") && (hasChildren || description.hasAttribute("data-loading")) ? `${descendants}│ ` : continuation;
      if (isHTMLElement(description)) {
        if (description.classList.contains("tree-content")) {
          description.style.setProperty("--prefix-width", `${contentGuide.length}ch`);
        } else
          description.style.removeProperty("--prefix-width");
      }
      guide.dataset.first = guide.dataset.continuation = contentGuide;
      guide.textContent = contentGuide;
      drawGuides(description, contentGuide);
    });
    const children = item.querySelector(":scope > .tree-list");
    if (children)
      refreshTree(children, [...ancestors, last]);
  });
}
function* visibleTreeContent(list) {
  if (!list || list.hidden)
    return;
  for (const entry of list.children) {
    const item = entry.firstElementChild;
    if (!item || entry.hidden || item.hidden)
      continue;
    const row = isDetails(item) ? item.firstElementChild : item.querySelector(":scope > .tree-row") || item;
    if (!row)
      continue;
    if (!row.hidden)
      yield row;
    if (!isDetails(item) || !item.open)
      continue;
    for (const child of item.children) {
      if (child.hidden)
        continue;
      if (child.classList.contains("description"))
        yield child;
      else if (child.classList.contains("tree-list")) {
        yield* visibleTreeContent(child);
      }
    }
  }
}
function updatePrefixes(list, view) {
  const updates = [];
  for (const row of visibleTreeContent(list)) {
    const content = row.querySelector(":scope > h2") || row;
    const prefix = content.querySelector(":scope > .tree-prefix");
    const text = content.querySelector(":scope > .node-label, :scope > .description-text");
    if (!prefix || !text)
      continue;
    const { first, continuation } = prefix.dataset;
    if (first === undefined || continuation === undefined)
      continue;
    const lineHeight = parseFloat(view.getComputedStyle(text).lineHeight);
    const height = text.getBoundingClientRect().height;
    let lines = 1;
    if (Number.isFinite(lineHeight) && lineHeight > 0 && Number.isFinite(height)) {
      const count = Math.ceil(height / lineHeight - 0.01);
      if (Number.isFinite(count))
        lines = Math.max(1, count);
    }
    updates.push([prefix, first + `
${continuation}`.repeat(lines - 1)]);
  }
  for (const [prefix, text] of updates)
    if (prefix.textContent !== text)
      prefix.textContent = text;
}

// src/bloc/catalog/material-target.mjs
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function readOrganizationRoot(value) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value))
    return null;
  if (value.trim().startsWith("\\"))
    return null;
  const path = value.trim().replace(/\\/g, "/");
  if (!path)
    return "";
  if (!/^(?:\/(?!\/)|[a-z]:\/)/i.test(path) || path.split("/").some((part) => part === "." || part === ".."))
    return null;
  return /^[a-z]:\/$/i.test(path) ? path : path.replace(/\/+$/, "") || "/";
}
function materialPath(value, empty = false) {
  return typeof value === "string" && value.length <= 1024 && (empty && value === "" || Boolean(value)) && !/[\\\u0000-\u001f\u007f]/.test(value) && (value === "" || value.split("/").every((part) => part && part !== "." && part !== ".."));
}
function materialRef(value) {
  return typeof value === "string" && /^[a-z\d][a-z\d._/-]{0,99}$/i.test(value) && !value.includes("..") && !value.includes("//") && !value.endsWith("/") && !value.endsWith(".") && !value.split("/").some((part) => part.startsWith(".") || part.endsWith(".lock"));
}
function repositoryUrl(value) {
  if (typeof value !== "string" || /[\\\u0000-\u001f\u007f]/.test(value))
    return null;
  try {
    const url = new URL(value);
    if (url.origin !== "https://github.com" || url.username || url.password || url.search || url.hash || !/^\/[a-z\d_.-]+\/[a-z\d_.-]+\/?$/i.test(url.pathname))
      return null;
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}
function readMaterialOrigin(value) {
  if (!record(value) || typeof value.kind !== "string" || !["repository", "haxelib"].includes(value.kind) || typeof value.id !== "string" || !/^[a-z\d][a-z\d._-]{0,99}$/i.test(value.id))
    return null;
  const url = repositoryUrl(value.url);
  return url ? { kind: value.kind === "haxelib" ? "haxelib" : "repository", id: value.id, url } : null;
}
function readMaterialTarget(value) {
  if (!record(value))
    return null;
  const origin = readMaterialOrigin(value.origin);
  if (!origin)
    return null;
  if (value.kind === "repository")
    return { kind: "repository", origin };
  if (!materialRef(value.ref) || !materialPath(value.path, value.kind === "directory"))
    return null;
  const base = { origin, ref: value.ref, path: value.path };
  if (value.kind === "directory" && (value.readmePath === null || materialPath(value.readmePath))) {
    return { ...base, kind: "directory", readmePath: value.readmePath };
  }
  if (value.kind === "document" && typeof value.format === "string" && ["markdown", "text"].includes(value.format) && (value.anchor === null || typeof value.anchor === "string" && value.anchor.length <= 1024 && !/[\u0000-\u001f\u007f]/.test(value.anchor))) {
    return { ...base, kind: "document", format: value.format === "text" ? "text" : "markdown", anchor: value.anchor };
  }
  const line = value.line;
  if (value.kind === "source" && (line === null || typeof line === "number" && Number.isSafeInteger(line) && line > 0)) {
    return { ...base, kind: "source", line };
  }
  if (value.kind === "declaration" && typeof line === "number" && Number.isSafeInteger(line) && line > 0 && typeof value.symbolPath === "string" && value.symbolPath.length > 0 && value.symbolPath.length <= 1024 && typeof value.symbolKind === "string" && value.symbolKind.length > 0 && value.symbolKind.length <= 100 && !/[\u0000-\u001f\u007f]/.test(value.symbolPath + value.symbolKind)) {
    return { ...base, kind: "declaration", line, symbolPath: value.symbolPath, symbolKind: value.symbolKind };
  }
  return null;
}
function targetKey(target) {
  if (target.kind === "repository")
    return JSON.stringify([target.origin.url.toLowerCase()]);
  const path = target.kind === "directory" ? target.readmePath || target.path : target.path;
  const position = target.kind === "source" || target.kind === "declaration" ? target.line : target.kind === "document" ? target.anchor || null : null;
  const route = target.kind === "directory" && target.readmePath === null ? "tree" : "blob";
  return JSON.stringify([target.origin.url.toLowerCase(), target.ref, path, position, route]);
}
function githubHref(target) {
  if (target.kind === "repository")
    return target.origin.url;
  const path = target.kind === "directory" ? target.readmePath || target.path : target.path;
  const route = target.kind === "directory" && target.readmePath === null ? "tree" : "blob";
  const hash = target.kind === "source" || target.kind === "declaration" ? target.line === null ? "" : `#L${target.line}` : target.kind === "document" && target.anchor ? `#${encodeURIComponent(target.anchor)}` : "";
  return `${target.origin.url}/${route}/${encodeURIComponent(target.ref)}/${path.split("/").map(encodeURIComponent).join("/")}${hash}`;
}

// src/bloc/document/href-resolver.mjs
function relativeMaterialPath(value, basePath) {
  if (!materialPath(basePath) || !value || /[\\\u0000-\u001f\u007f]/.test(value) || /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("/") || value.includes("?"))
    return null;
  const split = value.indexOf("#");
  const pathname = split < 0 ? value : value.slice(0, split);
  let anchor = split < 0 ? null : value.slice(split + 1);
  const parts = pathname ? basePath.split("/").slice(0, -1) : basePath.split("/");
  try {
    if (anchor !== null)
      anchor = decodeURIComponent(anchor);
    for (const part of pathname.split("/")) {
      const decoded = decodeURIComponent(part);
      if (/[\/\\\u0000-\u001f\u007f]/.test(decoded))
        return null;
      if (!decoded || decoded === ".")
        continue;
      if (decoded === "..") {
        if (!parts.length)
          return null;
        parts.pop();
      } else
        parts.push(decoded);
    }
  } catch {
    return null;
  }
  const path = parts.join("/");
  if (!materialPath(path, true))
    return null;
  return { path, anchor, directory: /\/$|(?:^|\/)\.{1,2}$/.test(pathname) };
}
// src/bloc/catalog/json/codicons.json
var codicons_default = {
  paths: {
    "git-logo": [
      [
        "M15.698 7.287 8.712.302a1.03 1.03 0 0 0-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 0 1 1.55 1.56l1.773 1.774a1.224 1.224 0 0 1 1.267 2.025 1.226 1.226 0 0 1-2.002-1.334L8.58 5.963v4.353a1.226 1.226 0 1 1-1.008-.036V5.887a1.226 1.226 0 0 1-.666-1.608L5.093 2.465l-4.79 4.79a1.03 1.03 0 0 0 0 1.457l6.986 6.986a1.03 1.03 0 0 0 1.457 0l6.953-6.953a1.03 1.03 0 0 0 0-1.457",
        null
      ]
    ],
    "version-branch": [
      [
        "M14 5.5C14 4.121 12.879 3 11.5 3C10.121 3 9 4.121 9 5.5C9 6.682 9.826 7.669 10.93 7.928C10.744 8.546 10.177 9 9.5 9H6.5C5.935 9 5.419 9.195 5 9.512V4.949C6.14 4.717 7 3.707 7 2.5C7 1.121 5.879 0 4.5 0C3.121 0 2 1.121 2 2.5C2 3.708 2.86 4.717 4 4.949V11.05C2.86 11.282 2 12.292 2 13.499C2 14.878 3.121 15.999 4.5 15.999C5.879 15.999 7 14.878 7 13.499C7 12.317 6.174 11.33 5.07 11.071C5.256 10.453 5.823 9.999 6.5 9.999H9.5C10.723 9.999 11.74 9.115 11.954 7.953C13.116 7.738 14 6.723 14 5.5ZM3 2.5C3 1.673 3.673 1 4.5 1C5.327 1 6 1.673 6 2.5C6 3.327 5.327 4 4.5 4C3.673 4 3 3.327 3 2.5ZM6 13.5C6 14.327 5.327 15 4.5 15C3.673 15 3 14.327 3 13.5C3 12.673 3.673 12 4.5 12C5.327 12 6 12.673 6 13.5ZM11.5 7C10.673 7 10 6.327 10 5.5C10 4.673 10.673 4 11.5 4C12.327 4 13 4.673 13 5.5C13 6.327 12.327 7 11.5 7Z",
        null
      ]
    ],
    folder: [
      [
        "M2 4.5V6H5.58579C5.71839 6 5.84557 5.94732 5.93934 5.85355L7.29289 4.5L5.93934 3.14645C5.84557 3.05268 5.71839 3 5.58579 3H3.5C2.67157 3 2 3.67157 2 4.5ZM1 4.5C1 3.11929 2.11929 2 3.5 2H5.58579C5.98361 2 6.36514 2.15804 6.64645 2.43934L8.20711 4H12.5C13.8807 4 15 5.11929 15 6.5V11.5C15 12.8807 13.8807 14 12.5 14H3.5C2.11929 14 1 12.8807 1 11.5V4.5ZM2 7V11.5C2 12.3284 2.67157 13 3.5 13H12.5C13.3284 13 14 12.3284 14 11.5V6.5C14 5.67157 13.3284 5 12.5 5H8.20711L6.64645 6.56066C6.36514 6.84197 5.98361 7 5.58579 7H2Z",
        null
      ]
    ],
    "file-code": [
      [
        "M13.56 4.35L10.65 1.44C10.368 1.16009 9.98732 1.00208 9.58998 1H5.99998C5.47003 1.00158 4.96224 1.2128 4.58751 1.58753C4.21278 1.96227 4.00156 2.47005 3.99998 3V8.83C4.28127 8.9031 4.53719 9.05181 4.73998 9.26C4.84686 9.3602 4.93492 9.47874 4.99998 9.61V3C4.99998 2.73478 5.10534 2.48043 5.29287 2.29289C5.48041 2.10536 5.73476 2 5.99998 2H8.99998V4.5C8.99998 4.89782 9.15801 5.27936 9.43932 5.56066C9.72062 5.84196 10.1022 6 10.5 6H13V13C13 13.2652 12.8946 13.5196 12.7071 13.7071C12.5195 13.8946 12.2652 14 12 14H10.48L9.46998 15H12C12.5299 14.9984 13.0377 14.7872 13.4124 14.4125C13.7872 14.0377 13.9984 13.5299 14 13V5.41C13.9979 5.01266 13.8399 4.63202 13.56 4.35ZM10.5 5C10.3674 5 10.2402 4.94732 10.1464 4.85355C10.0527 4.75979 9.99998 4.63261 9.99998 4.5V2.21L12.79 5H10.5Z",
        null
      ],
      [
        "M3.47798 14.978C3.34548 14.9777 3.21852 14.9248 3.12498 14.831L1.14598 12.854C1.09942 12.8076 1.06247 12.7524 1.03727 12.6916C1.01206 12.6309 0.999084 12.5658 0.999084 12.5C0.999084 12.4342 1.01206 12.3691 1.03727 12.3084C1.06247 12.2476 1.09942 12.1924 1.14598 12.146L3.14598 10.146C3.23986 10.0521 3.3672 9.99937 3.49998 9.99937C3.63275 9.99937 3.76009 10.0521 3.85398 10.146C3.94787 10.2399 4.00061 10.3672 4.00061 10.5C4.00061 10.6328 3.94787 10.7601 3.85398 10.854L2.20698 12.5L3.83198 14.124C3.90209 14.1939 3.94985 14.2831 3.96922 14.3802C3.98858 14.4773 3.97868 14.578 3.94076 14.6695C3.90284 14.7609 3.83862 14.8391 3.75623 14.894C3.67384 14.9489 3.577 14.9782 3.47798 14.978Z",
        null
      ],
      [
        "M7.52198 14.978C7.42296 14.9782 7.32611 14.9489 7.24372 14.894C7.16134 14.8391 7.09711 14.7609 7.05919 14.6695C7.02128 14.578 7.01137 14.4773 7.03074 14.3802C7.05011 14.2831 7.09787 14.1939 7.16798 14.124L8.79298 12.5L7.14598 10.854C7.05209 10.7601 6.99935 10.6328 6.99935 10.5C6.99935 10.3672 7.05209 10.2399 7.14598 10.146C7.23986 10.0521 7.3672 9.99937 7.49998 9.99937C7.63275 9.99937 7.76009 10.0521 7.85398 10.146L9.85398 12.146C9.90054 12.1924 9.93748 12.2476 9.96269 12.3084C9.9879 12.3691 10.0009 12.4342 10.0009 12.5C10.0009 12.5658 9.9879 12.6309 9.96269 12.6916C9.93748 12.7524 9.90054 12.8076 9.85398 12.854L7.87498 14.831C7.78144 14.9248 7.65447 14.9777 7.52198 14.978Z",
        null
      ]
    ],
    "file-text": [
      [
        "M3 3C3 1.89543 3.89543 1 5 1H8.58579C8.98361 1 9.36514 1.15804 9.64645 1.43934L12.5607 4.35355C12.842 4.63486 13 5.01639 13 5.41421V13C13 14.1046 12.1046 15 11 15H5C3.89543 15 3 14.1046 3 13V3ZM5 2C4.44772 2 4 2.44772 4 3V13C4 13.5523 4.44772 14 5 14H11C11.5523 14 12 13.5523 12 13V6H9.5C8.67157 6 8 5.32843 8 4.5V2H5ZM9.5 5H11.7929L9 2.20711V4.5C9 4.77614 9.22386 5 9.5 5ZM5.5 8C5.22386 8 5 8.22386 5 8.5C5 8.77614 5.22386 9 5.5 9H10.5C10.7761 9 11 8.77614 11 8.5C11 8.22386 10.7761 8 10.5 8H5.5ZM5 10.5C5 10.2239 5.22386 10 5.5 10H10.5C10.7761 10 11 10.2239 11 10.5C11 10.7761 10.7761 11 10.5 11H5.5C5.22386 11 5 10.7761 5 10.5ZM5.5 12C5.22386 12 5 12.2239 5 12.5C5 12.7761 5.22386 13 5.5 13H10.5C10.7761 13 11 12.7761 11 12.5C11 12.2239 10.7761 12 10.5 12H5.5Z",
        null
      ]
    ],
    file: [
      [
        "M5 1C3.89543 1 3 1.89543 3 3V13C3 14.1046 3.89543 15 5 15H11C12.1046 15 13 14.1046 13 13V5.41421C13 5.01639 12.842 4.63486 12.5607 4.35355L9.64645 1.43934C9.36514 1.15804 8.98361 1 8.58579 1H5ZM4 3C4 2.44772 4.44772 2 5 2H8V4.5C8 5.32843 8.67157 6 9.5 6H12V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V3ZM11.7929 5H9.5C9.22386 5 9 4.77614 9 4.5V2.20711L11.7929 5Z",
        null
      ]
    ],
    "symbol-class": [
      [
        "M13.2069 10.4999C13.0194 10.3125 12.7651 10.2072 12.4999 10.2072C12.2348 10.2072 11.9805 10.3125 11.7929 10.4999L11.2929 10.9999H8.99994V6.99994H10.3629C10.2479 7.1876 10.1989 7.40832 10.2238 7.62701C10.2486 7.84571 10.3458 8.04983 10.4999 8.20694L11.2929 8.99994C11.4805 9.18741 11.7348 9.29273 11.9999 9.29273C12.2651 9.29273 12.5194 9.18741 12.7069 8.99994L13.9999 7.70694C14.1874 7.51941 14.2927 7.2651 14.2927 6.99994C14.2927 6.73478 14.1874 6.48047 13.9999 6.29294L13.2069 5.49994C13.0194 5.31247 12.7651 5.20715 12.4999 5.20715C12.2348 5.20715 11.9805 5.31247 11.7929 5.49994L11.2929 5.99994H6.70694L7.49994 5.20694C7.68741 5.01941 7.79273 4.7651 7.79273 4.49994C7.79273 4.23478 7.68741 3.98047 7.49994 3.79294L6.20694 2.49994C6.01941 2.31247 5.7651 2.20715 5.49994 2.20715C5.23478 2.20715 4.98047 2.31247 4.79294 2.49994L1.49994 5.79294C1.31247 5.98047 1.20715 6.23478 1.20715 6.49994C1.20715 6.7651 1.31247 7.01941 1.49994 7.20694L2.79294 8.49994C2.98047 8.68741 3.23478 8.79273 3.49994 8.79273C3.7651 8.79273 4.01941 8.68741 4.20694 8.49994L5.70694 6.99994H7.99994V11.4999C7.99994 11.6325 8.05262 11.7597 8.14639 11.8535C8.24015 11.9473 8.36733 11.9999 8.49994 11.9999H10.3629C10.2479 12.1876 10.1989 12.4083 10.2238 12.627C10.2486 12.8457 10.3458 13.0498 10.4999 13.2069L11.2929 13.9999C11.4805 14.1874 11.7348 14.2927 11.9999 14.2927C12.2651 14.2927 12.5194 14.1874 12.7069 13.9999L13.9999 12.7069C14.1874 12.5194 14.2927 12.2651 14.2927 11.9999C14.2927 11.7348 14.1874 11.4805 13.9999 11.2929L13.2069 10.4999ZM3.49994 7.79294L2.20694 6.49994L5.49994 3.20694L6.79294 4.49994L3.49994 7.79294ZM13.2929 6.99994L11.9999 8.29294L11.2069 7.49994L12.4999 6.20694L13.2929 6.99994ZM11.9999 13.2929L11.2069 12.4999L12.4999 11.2069L13.2929 11.9999L11.9999 13.2929Z",
        null
      ]
    ],
    "symbol-interface": [
      [
        "M11.5 4.5C9.742 4.5 8.296 5.808 8.051 7.5H4.929C4.705 6.64 3.929 6 3 6C1.897 6 1 6.897 1 8C1 9.103 1.897 10 3 10C3.929 10 4.705 9.36 4.929 8.5H8.051C8.296 10.192 9.742 11.5 11.5 11.5C13.43 11.5 15 9.93 15 8C15 6.07 13.43 4.5 11.5 4.5ZM3 9C2.448 9 2 8.551 2 8C2 7.449 2.448 7 3 7C3.552 7 4 7.449 4 8C4 8.551 3.552 9 3 9ZM11.5 10.5C10.121 10.5 9 9.378 9 8C9 6.622 10.121 5.5 11.5 5.5C12.879 5.5 14 6.622 14 8C14 9.378 12.879 10.5 11.5 10.5Z",
        null
      ]
    ],
    "symbol-enum": [
      [
        "M15 3.5V7.5C15 7.9 14.85 8.28 14.56 8.56C14.28 8.84 13.9 9 13.5 9H11V8.5C11 8.33 10.98 8.16 10.95 8H13.5C13.63 8 13.76 7.95 13.85 7.85C13.95 7.76 14 7.63 14 7.5V3.5C14 3.37 13.95 3.24 13.85 3.15C13.76 3.05 13.63 3 13.5 3H7.5C7.37 3 7.24 3.05 7.15 3.15C7.05 3.24 7 3.37 7 3.5V6H6V3.5C6 3.1 6.16 2.72 6.44 2.44C6.72 2.16 7.1 2 7.5 2H13.5C13.9 2 14.28 2.16 14.56 2.44C14.84 2.72 15 3.1 15 3.5ZM12.5 5C12.776 5 13 4.776 13 4.5C13 4.224 12.776 4 12.5 4H8.5C8.224 4 8 4.224 8 4.5C8 4.776 8.224 5 8.5 5H12.5ZM13 6.5C13 6.22 12.78 6 12.5 6H8.5C9.32 6 10.04 6.39 10.5 7H12.5C12.78 7 13 6.78 13 6.5ZM7.5 9H3.5C3.224 9 3 9.224 3 9.5C3 9.776 3.224 10 3.5 10H7.5C7.776 10 8 9.776 8 9.5C8 9.224 7.776 9 7.5 9ZM7.5 11H3.5C3.224 11 3 11.224 3 11.5C3 11.776 3.224 12 3.5 12H7.5C7.776 12 8 11.776 8 11.5C8 11.224 7.776 11 7.5 11ZM10 8.5V12.5C10 13.327 9.327 14 8.5 14H2.5C1.673 14 1 13.327 1 12.5V8.5C1 7.673 1.673 7 2.5 7H8.5C9.327 7 10 7.673 10 8.5ZM9 8.5C9 8.225 8.775 8 8.5 8H2.5C2.225 8 2 8.225 2 8.5V12.5C2 12.775 2.225 13 2.5 13H8.5C8.775 13 9 12.775 9 12.5V8.5Z",
        null
      ]
    ],
    "symbol-enum-member": [
      [
        "M15 3.5V7.5C15 7.9 14.85 8.28 14.56 8.56C14.28 8.84 13.9 9 13.5 9H11V8.5C11 8.33 10.98 8.16 10.95 8H13.5C13.63 8 13.76 7.95 13.85 7.85C13.95 7.76 14 7.63 14 7.5V3.5C14 3.37 13.95 3.24 13.85 3.15C13.76 3.05 13.63 3 13.5 3H7.5C7.37 3 7.24 3.05 7.15 3.15C7.05 3.24 7 3.37 7 3.5V6H6V3.5C6 3.1 6.16 2.72 6.44 2.44C6.72 2.16 7.1 2 7.5 2H13.5C13.9 2 14.28 2.16 14.56 2.44C14.84 2.72 15 3.1 15 3.5ZM12.5 5C12.776 5 13 4.776 13 4.5C13 4.224 12.776 4 12.5 4H8.5C8.224 4 8 4.224 8 4.5C8 4.776 8.224 5 8.5 5H12.5ZM13 6.5C13 6.22 12.78 6 12.5 6H8.5C9.32 6 10.04 6.39 10.5 7H12.5C12.78 7 13 6.78 13 6.5ZM7.5 10H3.5C3.224 10 3 10.224 3 10.5C3 10.776 3.224 11 3.5 11H7.5C7.776 11 8 10.776 8 10.5C8 10.224 7.776 10 7.5 10ZM10 8.5V12.5C10 13.327 9.327 14 8.5 14H2.5C1.673 14 1 13.327 1 12.5V8.5C1 7.673 1.673 7 2.5 7H8.5C9.327 7 10 7.673 10 8.5Z",
        null
      ]
    ],
    "symbol-structure": [
      [
        "M1 3C1 2.44772 1.44772 2 2 2H14C14.5523 2 15 2.44772 15 3V6C15 6.55228 14.5523 7 14 7H2C1.44772 7 1 6.55228 1 6V3ZM2 3H14V6H2L2 3Z",
        "evenodd"
      ],
      [
        "M2 9C1.44772 9 1 9.44772 1 10V13C1 13.5523 1.44772 14 2 14H5C5.55228 14 6 13.5523 6 13V10C6 9.44772 5.55228 9 5 9H2ZM5 10H2V13H5V10Z",
        "evenodd"
      ],
      [
        "M11 9C10.4477 9 10 9.44772 10 10V13C10 13.5523 10.4477 14 11 14H14C14.5523 14 15 13.5523 15 13V10C15 9.44772 14.5523 9 14 9H11ZM14 10H11V13H14V10Z",
        "evenodd"
      ]
    ],
    "symbol-field": [
      [
        "M11.967 6.08899C11.9907 6.15031 12.0021 6.2157 12.0005 6.28143C11.9989 6.34715 11.9843 6.41191 11.9577 6.47201C11.931 6.5321 11.8928 6.58635 11.8451 6.63165C11.7975 6.67695 11.7414 6.7124 11.68 6.73599L7.5 8.34399V10.02C7.5 10.1526 7.44732 10.2798 7.35355 10.3735C7.25979 10.4673 7.13261 10.52 7 10.52C6.86739 10.52 6.74021 10.4673 6.64645 10.3735C6.55268 10.2798 6.5 10.1526 6.5 10.02V8.34299L4.32 7.50499C4.25874 7.48135 4.20273 7.44588 4.15518 7.40059C4.10763 7.35531 4.06946 7.30111 4.04286 7.24107C4.01625 7.18104 4.00173 7.11635 4.00013 7.05071C3.99852 6.98507 4.00986 6.91975 4.0335 6.85849C4.05714 6.79722 4.09261 6.74122 4.13789 6.69367C4.18318 6.64611 4.23738 6.60795 4.29741 6.58134C4.35745 6.55474 4.42213 6.54022 4.48778 6.53861C4.55342 6.53701 4.61874 6.54835 4.68 6.57199L7 7.46399L11.32 5.79999C11.3814 5.77634 11.447 5.76505 11.5128 5.76678C11.5786 5.76852 11.6434 5.78323 11.7035 5.81008C11.7636 5.83694 11.8179 5.8754 11.8631 5.92326C11.9083 5.97112 11.9436 6.02744 11.967 6.08899ZM15 5.79999V9.42899C14.9986 9.73191 14.9061 10.0274 14.7345 10.2771C14.563 10.5268 14.3203 10.7191 14.038 10.829L7.538 13.329C7.19108 13.4626 6.80692 13.4626 6.46 13.329L1.961 11.6C1.67891 11.4899 1.43643 11.2975 1.26506 11.0479C1.09369 10.7982 1.00134 10.5028 1 10.2V6.57099C1.00155 6.26809 1.0941 5.97265 1.26565 5.72301C1.43719 5.47336 1.6798 5.28104 1.962 5.17099L8.462 2.67099C8.80902 2.53798 9.19298 2.53798 9.54 2.67099L14.04 4.40199C14.3215 4.51223 14.5635 4.70438 14.7346 4.95361C14.9058 5.20283 14.9982 5.49766 15 5.79999ZM14 5.79999C14 5.69881 13.9694 5.6 13.912 5.51662C13.8547 5.43324 13.7735 5.36921 13.679 5.33299L9.179 3.60299C9.06398 3.55763 8.93602 3.55763 8.821 3.60299L2.321 6.10299C2.22637 6.13927 2.145 6.20345 2.08767 6.28703C2.03034 6.37061 1.99977 6.46964 2 6.57099V10.2C2.0001 10.3009 2.03071 10.3994 2.08782 10.4825C2.14494 10.5657 2.22587 10.6297 2.32 10.666L6.82 12.398C6.93524 12.4422 7.06276 12.4422 7.178 12.398L13.678 9.89799C13.773 9.8618 13.8547 9.79754 13.9122 9.71375C13.9697 9.62996 14.0004 9.53062 14 9.42899V5.79999Z",
        null
      ]
    ],
    "symbol-property": [
      [
        "M6.99989 5C6.99989 2.79086 8.79075 1 10.9999 1C11.5087 1 11.9964 1.09524 12.4454 1.26931C12.603 1.3304 12.719 1.46698 12.7539 1.63235C12.7888 1.79773 12.7377 1.96953 12.6182 2.08904L10.7072 4.00012L12.0001 5.29302L13.911 3.38207C14.0305 3.26254 14.2023 3.2115 14.3677 3.24637C14.5331 3.28125 14.6697 3.39732 14.7307 3.55493C14.9047 4.0038 14.9999 4.49138 14.9999 5C14.9999 7.20914 13.209 9 10.9999 9C10.6198 9 10.2514 8.94684 9.90215 8.84736L4.89566 13.9192C4.18171 14.6425 3.03692 14.7101 2.24289 14.0757C1.32876 13.3455 1.24088 11.9872 2.05327 11.1453L7.10411 5.91061C7.03588 5.61771 6.99989 5.31279 6.99989 5ZM10.9999 2C9.34303 2 7.99989 3.34315 7.99989 5C7.99989 5.31548 8.04841 5.61868 8.13805 5.90305C8.19313 6.07781 8.14821 6.26869 8.02099 6.40054L2.7729 11.8396C2.3696 12.2576 2.41323 12.9319 2.86703 13.2944C3.26123 13.6093 3.82955 13.5758 4.18398 13.2167L9.40817 7.9243C9.54702 7.78364 9.75569 7.73797 9.9406 7.80777C10.2693 7.93186 10.6261 8 10.9999 8C12.6567 8 13.9999 6.65685 13.9999 5C13.9999 4.9056 13.9955 4.81228 13.987 4.72023L12.3537 6.35368C12.2599 6.44745 12.1327 6.50013 12.0001 6.50013C11.8675 6.50013 11.7403 6.44745 11.6466 6.35368L9.64655 4.35368C9.45129 4.15842 9.45129 3.84185 9.64655 3.64658L11.2802 2.01289C11.188 2.00436 11.0945 2 10.9999 2Z",
        null
      ]
    ],
    "symbol-method": [
      [
        "M4.69684 5.04043C4.44303 4.93166 4.14909 5.04923 4.04031 5.30305C3.93153 5.55686 4.04911 5.8508 4.30292 5.95958L7.49988 7.3297V10.5C7.49988 10.7761 7.72374 11 7.99988 11C8.27603 11 8.49988 10.7761 8.49988 10.5V7.3297L11.6968 5.95958C11.9507 5.8508 12.0682 5.55686 11.9595 5.30305C11.8507 5.04923 11.5567 4.93166 11.3029 5.04043L7.99988 6.45602L4.69684 5.04043ZM9.07694 1.37855C8.38373 1.11193 7.61627 1.11193 6.92306 1.37855L1.96153 3.28683C1.38224 3.50964 1 4.06619 1 4.68685V11.3133C1 11.9339 1.38224 12.4905 1.96153 12.7133L6.92306 14.6216C7.61627 14.8882 8.38373 14.8882 9.07694 14.6216L14.0385 12.7133C14.6178 12.4905 15 11.9339 15 11.3133V4.68685C15 4.06619 14.6178 3.50964 14.0385 3.28683L9.07694 1.37855ZM7.28204 2.3119C7.74418 2.13415 8.25582 2.13415 8.71796 2.3119L13.6795 4.22018C13.8726 4.29445 14 4.47997 14 4.68685V11.3133C14 11.5201 13.8726 11.7057 13.6795 11.7799L8.71796 13.6882C8.25582 13.866 7.74418 13.866 7.28204 13.6882L2.32051 11.7799C2.12741 11.7057 2 11.5201 2 11.3133V4.68685C2 4.47997 2.12741 4.29445 2.32051 4.22018L7.28204 2.3119Z",
        null
      ]
    ],
    "symbol-method-arrow": [
      [
        "M13.502 11.0081C13.6318 11.0081 13.7576 11.0579 13.8506 11.1487L15.8506 13.1487C15.8975 13.1937 15.9359 13.2479 15.9619 13.3089C15.9879 13.3689 16.001 13.4343 16.001 13.4993C16.0009 13.5641 15.9878 13.6289 15.9619 13.6887C15.9359 13.7487 15.8976 13.8029 15.8506 13.8489L13.8496 15.8499C13.8047 15.8967 13.7513 15.9352 13.6904 15.9612C13.6304 15.9872 13.565 16.0003 13.5 16.0003C13.435 16.0003 13.3696 15.9872 13.3096 15.9612C13.2497 15.9352 13.1963 15.8967 13.1504 15.8499C13.1034 15.8049 13.0651 15.7507 13.0391 15.6897C13.0132 15.6299 13 15.5651 13 15.5003C13 15.4353 13.0131 15.3698 13.0391 15.3098C13.0651 15.2499 13.1034 15.1956 13.1504 15.1497L14.29 14.0003H9.5C9.36706 14.0003 9.24047 13.9467 9.14648 13.8538C9.05255 13.7608 9.00007 13.6332 9 13.5003C9 13.3673 9.05348 13.2398 9.14648 13.1458C9.24045 13.052 9.36717 13.0003 9.5 13.0003H14.29L13.1504 11.8499C13.0594 11.7569 13.0079 11.6311 13.0088 11.5012C13.0088 11.3712 13.0623 11.2456 13.1543 11.1526C13.2463 11.0608 13.3711 11.0091 13.502 11.0081Z",
        null
      ],
      [
        "M6.92285 1.37819C7.61606 1.11157 8.38394 1.11157 9.07715 1.37819L14.0381 3.28639C14.6173 3.50918 15 4.06616 15 4.68678V10.886L14.5762 10.4622C14.4372 10.3162 14.2699 10.2003 14.085 10.1214C14.0571 10.1094 14.0285 10.0993 14 10.0891V4.68678C14 4.47997 13.8727 4.29427 13.6797 4.21998L8.71777 2.31178C8.25576 2.13414 7.74424 2.13414 7.28223 2.31178L2.32031 4.21998C2.1273 4.29426 2.00004 4.47997 2 4.68678V11.3137C2.00019 11.5203 2.12753 11.7053 2.32031 11.7796L7.28223 13.6878C7.52443 13.7809 7.78001 13.8241 8.03516 13.8196C8.09589 14.098 8.23497 14.3556 8.43945 14.5608C8.50829 14.6294 8.58267 14.691 8.66211 14.7444C8.08569 14.875 7.48048 14.8358 6.92285 14.6214L1.96191 12.7131C1.38277 12.4904 1.00019 11.9342 1 11.3137V4.68678C1.00004 4.06616 1.38266 3.50918 1.96191 3.28639L6.92285 1.37819Z",
        null
      ],
      [
        "M4.04004 5.30299C4.14882 5.04918 4.44345 4.93152 4.69727 5.0403L8 6.45631L11.3027 5.0403C11.5565 4.93155 11.8501 5.04934 11.959 5.30299C12.0677 5.55664 11.9507 5.8503 11.6973 5.95924L8.5 7.32936V10.5003C8.49987 10.7763 8.27601 11.0002 8 11.0003C7.72394 11.0003 7.50013 10.7763 7.5 10.5003V7.32936L4.30273 5.95924C4.04913 5.85037 3.93133 5.5567 4.04004 5.30299Z",
        null
      ]
    ],
    "symbol-misc": [
      [
        "M11.9999 3C10.1399 3 8.56988 4.27 8.12988 6H9.17988C9.58988 4.84 10.6999 4 11.9999 4C13.6499 4 14.9999 5.35 14.9999 7C14.9999 8.3 14.1599 9.41 12.9999 9.82V10.87C14.7299 10.43 15.9999 8.86 15.9999 7C15.9999 4.79 14.2099 3 11.9999 3Z",
        null
      ],
      [
        "M10.5 15H5.5C4.673 15 4 14.327 4 13.5V8.5C4 7.673 4.673 7 5.5 7H10.5C11.327 7 12 7.673 12 8.5V13.5C12 14.327 11.327 15 10.5 15ZM5.5 8C5.224 8 5 8.225 5 8.5V13.5C5 13.775 5.224 14 5.5 14H10.5C10.776 14 11 13.775 11 13.5V8.5C11 8.225 10.776 8 10.5 8H5.5Z",
        null
      ],
      [
        "M4.42973 2.25008C4.24973 1.94008 3.74973 1.94008 3.56973 2.25008L0.0997266 8.25008C0.00972656 8.40008 0.00972656 8.60008 0.0997266 8.75008C0.189727 8.90008 0.359727 9.00008 0.539727 9.00008H2.99973V8.50008C2.99973 8.33008 3.01973 8.16008 3.04973 8.00008H1.39973L3.99973 3.50008L5.44973 6.00008H6.59973L4.42973 2.25008Z",
        null
      ]
    ],
    "lock-small": [
      [
        "M11 7V5C11 3.346 9.654 2 8 2C6.346 2 5 3.346 5 5V7C3.897 7 3 7.897 3 9V12C3 13.103 3.897 14 5 14H11C12.103 14 13 13.103 13 12V9C13 7.897 12.103 7 11 7ZM6 5C6 3.897 6.897 3 8 3C9.103 3 10 3.897 10 5V7H6V5ZM12 12C12 12.551 11.551 13 11 13H5C4.449 13 4 12.551 4 12V9C4 8.449 4.449 8 5 8H11C11.551 8 12 8.449 12 9V12ZM9 10C9 10.552 8.552 11 8 11C7.448 11 7 10.552 7 10C7 9.448 7.448 9 8 9C8.552 9 9 9.448 9 10Z",
        null
      ]
    ]
  },
  definitions: {
    repository: [
      "repository",
      "git-logo"
    ],
    directory: [
      "folder",
      "folder"
    ],
    "file-hx": [
      "file-code",
      "file-code"
    ],
    "file-md": [
      "file-text",
      "file-text"
    ],
    file: [
      "file",
      "file"
    ],
    class: [
      "class",
      "symbol-class"
    ],
    interface: [
      "interface",
      "symbol-interface"
    ],
    enum: [
      "enum",
      "symbol-enum"
    ],
    "enum abstract": [
      "enum",
      "symbol-enum"
    ],
    abstract: [
      "class",
      "symbol-structure"
    ],
    typedef: [
      "class",
      "symbol-structure"
    ],
    field: [
      "field",
      "symbol-field"
    ],
    property: [
      "property",
      "symbol-property"
    ],
    method: [
      "method",
      "symbol-method"
    ],
    constructor: [
      "constructor",
      "symbol-method-arrow"
    ],
    "enum-value": [
      "enum-member",
      "symbol-enum-member"
    ],
    lock: [
      "lock",
      "lock-small"
    ]
  }
};

// src/bloc/catalog/icons.mjs
var { paths, definitions } = codicons_default;
function kindIcon(kind) {
  const [color, asset] = Object.hasOwn(definitions, kind) ? definitions[kind] : ["symbol", "symbol-misc"];
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 16 16");
  icon.setAttribute("class", `kind-icon icon-${color}`);
  icon.setAttribute("aria-hidden", "true");
  for (const [shape, rule] of paths[asset]) {
    const path = document.createElementNS(icon.namespaceURI, "path");
    path.setAttribute("d", shape);
    if (rule)
      path.setAttribute("fill-rule", rule);
    icon.append(path);
  }
  return icon;
}
function defaultIcons() {
  return { repositories: false, directories: false, files: true, symbols: true };
}
function applyIcons(root, settings) {
  for (const icon of root.querySelectorAll("svg[data-icon-group]")) {
    const group = icon.dataset.iconGroup;
    icon.toggleAttribute("hidden", !settings[group]);
  }
}
function groupedIcon(kind, group, settings) {
  const icon = kindIcon(kind);
  icon.dataset.iconGroup = group;
  icon.toggleAttribute("hidden", !settings[group]);
  return icon;
}
function nodeIcon(node, settings) {
  if (node.type === "repository")
    return groupedIcon("repository", "repositories", settings);
  if (node.type === "symbol")
    return groupedIcon(node.kind || "symbol", "symbols", settings);
  if (node.type === "directory")
    return groupedIcon("directory", "directories", settings);
  if (node.type === "file") {
    const extension = (node.name.split(".").pop() || "").toLowerCase();
    return groupedIcon(extension === "hx" || extension === "md" ? `file-${extension}` : "file", "files", settings);
  }
  return null;
}
function unavailableLock() {
  return kindIcon("lock");
}
var haxeOutline = "M2 2 16 5.5 30 2 26.5 16 30 30 16 26.5 2 30 5.5 16Z M16 5.5 26.5 16 16 26.5 5.5 16Z";
function sourceGlyph(owner, viewBox, shape, size, outline = false) {
  const svg = owner.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", outline ? "none" : "currentColor");
  if (outline) {
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linejoin", "round");
  }
  const path = owner.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", shape);
  svg.append(path);
  return svg;
}
function versionSourceIcon(installation, owner = document) {
  const source = installation?.source;
  if (source !== "haxelib" && source !== "github")
    return null;
  const mark = owner.createElement("span");
  mark.className = `version-source-icon version-source-${source}`;
  mark.setAttribute("aria-hidden", "true");
  if (source === "haxelib") {
    const glyph = sourceGlyph(owner, "0 0 32 32", haxeOutline, 16, true);
    glyph.classList.add("version-haxe-mark");
    mark.append(glyph);
  } else {
    mark.append(sourceGlyph(owner, "0 0 16 16", paths["version-branch"][0][0], 16));
  }
  return mark;
}

// src/common/network/document-path.mjs
function linkedDocumentPath(path) {
  return typeof path === "string" && path.length > 0 && path.length <= 1024 && !/[\\\u0000-\u001f\u007f]/.test(path) && path.split("/").every((part) => part && part !== "." && part !== ".." && !part.startsWith(".")) && /(?:\.(?:md|markdown)$|(?:^|\/)(?:README|CONTRIBUTING|AGENTS|LICENSE)(?:\.txt)?$)/i.test(path);
}

// src/bloc/catalog/public-document.mjs
var documents = new TextCache(source_limits_default.publicCache);
function publicDocumentPath(path) {
  return linkedDocumentPath(path) || materialPath(path) && /(?:^|\/)(?:LICENSE|LICENCE|COPYING|COPYRIGHT|NOTICE|UNLICENSE)[^/]*$/i.test(path) && !path.split("/").some((part) => part.startsWith("."));
}
async function readText(response, limit) {
  const length = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(length) && length > limit)
    throw new Error("Document is too large.");
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limit)
      throw new Error("Document is too large.");
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
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
      if (size > limit)
        throw new Error("Document is too large.");
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
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
function publicDefaultRef(url, signal) {
  const repository = repositoryUrl(url);
  if (!repository)
    throw new Error("Invalid GitHub repository.");
  return withinRequestTime(async (requestSignal) => {
    const response = await fetch(`https://api.github.com/repos/${repository.slice("https://github.com/".length)}`, {
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: requestSignal,
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok)
      throw new Error(`GitHub repository request failed: HTTP ${response.status}`);
    const data = JSON.parse(await readText(response, source_limits_default.maxMetadataBytes));
    if (!data || typeof data !== "object" || !("default_branch" in data) || !materialRef(data.default_branch)) {
      throw new Error("GitHub returned an invalid branch.");
    }
    return data.default_branch;
  }, { signal });
}
function loadPublicDocument(location2, signal, { refresh = false } = {}) {
  const repository = repositoryUrl(location2.url);
  if (!repository || !materialRef(location2.ref) || !publicDocumentPath(location2.path)) {
    throw new Error("Invalid document address.");
  }
  return withinRequestTime(async (requestSignal) => {
    const key = JSON.stringify([repository.toLowerCase(), location2.ref, location2.path]);
    const saved = refresh ? undefined : documents.get(key);
    if (saved !== undefined)
      return saved;
    const url = `https://raw.githubusercontent.com/${repository.slice("https://github.com/".length)}/${encodeURIComponent(location2.ref)}/${location2.path.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetch(url, {
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: requestSignal
    });
    if (!response.ok || response.headers.get("Content-Type")?.toLowerCase().startsWith("text/html")) {
      throw new Error(`GitHub document request failed: HTTP ${response.status}`);
    }
    const text = await readText(response, source_limits_default.privateRequest.maxDocumentBytes);
    if (requestSignal.aborted)
      throw requestSignal.reason;
    documents.set(key, text);
    return text;
  }, { signal, timeout: 20000 });
}

// src/bloc/catalog/tree-view.mjs
var captionTemplateSelector = `template:is(${rules_default.captionAttributes.map((name) => `[${name}]`).join(", ")})`;
function readCaptions(repository) {
  const captions = {
    directoryNames: new Map,
    directoryPaths: new Map,
    filePaths: new Map,
    symbolPaths: new Map
  };
  repository.querySelectorAll(`:scope > ${captionTemplateSelector}`).forEach((node) => {
    const template = node;
    const caption = captionElement(template, { tags: rules_default.captionTags, attributes: rules_default.captionLinkAttributes });
    if (template.dataset.directoryName)
      captions.directoryNames.set(template.dataset.directoryName, caption);
    if (template.dataset.directoryPath)
      captions.directoryPaths.set(template.dataset.directoryPath, caption);
    if (template.dataset.filePath)
      captions.filePaths.set(template.dataset.filePath, caption);
    if (template.dataset.symbolPath)
      captions.symbolPaths.set(template.dataset.symbolPath, caption);
  });
  return captions;
}
function nodeCaption(node, captions, filePath, parentSymbolPath) {
  if (node.type === "directory") {
    return captions.directoryPaths.get(node.path) ?? captions.directoryNames.get(node.name);
  }
  if (node.type === "file")
    return captions.filePaths.get(node.path);
  const path = parentSymbolPath ? `${parentSymbolPath}.${node.name}` : `${filePath}#${node.name}`;
  return captions.symbolPaths.get(path);
}
function renderNodes(nodes, repository, captions, settings, owner) {
  const rows = [];
  const renderList = (children, filePath = "", parentSymbolPath = "") => {
    const list = createTreeList(owner);
    const captioned = children.filter((node) => nodeCaption(node, captions, filePath, parentSymbolPath));
    if (captioned.length) {
      list.style.setProperty("--catalog-caption-label-width", `${Math.max(...captioned.map((node) => node.name.length)) + 2}ch`);
    }
    for (const node of children) {
      const branch = node.type === "directory" || node.children.length > 0;
      const entry = branch ? cloneBranch(owner) : owner.createElement("li");
      const item = branch ? entry.firstElementChild : createTreeRow(owner);
      const row = branch ? item.querySelector("summary") : item;
      row.classList.add("outline-row");
      row.dataset.type = node.type;
      if (!branch)
        entry.append(row.parentElement || row);
      const caption = nodeCaption(node, captions, filePath, parentSymbolPath);
      const docs = repository.level >= 3 && (node.type === "file" || node.type === "symbol");
      showTreeRow(row, {
        name: node.name,
        icon: nodeIcon(node, settings),
        caption,
        accessibleName: node.type === "symbol" && typeof node.kind === "string" ? `${node.kind} ${node.name}${caption ? `; ${caption.textContent}` : ""}` : undefined,
        hasPopup: docs || node.type === "directory"
      });
      const path = node.type === "symbol" ? filePath : node.path;
      const kind = node.type === "directory" ? "tree" : "blob";
      const sourcePath = encodedPath(repositoryPath(repository.root, path));
      let url = `${repository.url}/${kind}/${encodeURIComponent(repository.ref)}/${sourcePath}`;
      const line = node.type === "symbol" && typeof node.line === "number" && Number.isInteger(node.line) && node.line > 0 ? `#L${node.line}` : "";
      url += line;
      rows.push({
        row,
        node,
        link: {
          url,
          path: path + line,
          filePath: node.type === "file" || node.type === "symbol" ? path : "",
          symbolPath: node.type === "symbol" ? parentSymbolPath ? `${parentSymbolPath}.${node.name}` : `${filePath}#${node.name}` : ""
        },
        docs
      });
      if (node.children.length) {
        const symbolPath = node.type === "symbol" ? parentSymbolPath ? `${parentSymbolPath}.${node.name}` : `${filePath}#${node.name}` : "";
        item.append(renderList(node.children, node.type === "file" ? node.path : filePath, symbolPath));
      }
      list.append(entry);
    }
    return list;
  };
  return { list: renderList(nodes), rows };
}

// src/bloc/catalog/index.mjs
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function eventRow(event) {
  return isElement(event.target) ? event.target.closest(".tree-row") : null;
}
function localResource(path) {
  const url = new URL(path, document.baseURI);
  if (url.origin !== location.origin)
    throw new Error("Expected a local JSON resource");
  return url.href;
}
async function githubJson(url, externalSignal) {
  return withinRequestTime(async (signal) => {
    const response = await fetch(url, {
      credentials: "omit",
      headers: { Accept: "application/vnd.github+json" },
      signal
    });
    if (!response.ok)
      throw new Error(`GitHub request failed: ${response.status}`);
    return response.json();
  }, { signal: externalSignal });
}
function legalDocument(name) {
  return /^(LICENSE|LICENCE|COPYING|COPYRIGHT|NOTICE|UNLICENSE)/i.test(name);
}
function publicDocument(name, directory) {
  if (/\.hx$/i.test(name))
    return false;
  if (directory)
    return /^(README|AGENTS)(?:\.(md|markdown|txt))?$/i.test(name);
  return /\.(md|markdown)$/i.test(name) || legalDocument(name) || /^(README|CONTRIBUTING|AGENTS|CHANGE)/i.test(name);
}
function documentPriority(name) {
  if (/^README/i.test(name))
    return 0;
  if (/^CHANGE/i.test(name))
    return 1;
  if (/^CONTRIBUTING/i.test(name))
    return 2;
  if (/^AGENTS/i.test(name))
    return 3;
  return legalDocument(name) ? 4 : 5;
}
function sourceHasLine(content, line) {
  if (line === null || line === 1)
    return true;
  let count = 1;
  for (let index = 0;index < content.length; index++) {
    if (content.charCodeAt(index) === 10 && ++count >= line)
      return true;
  }
  return false;
}

class ProjectCatalog extends HTMLElement {
  #search = null;
  #docsNodes = new WeakMap;
  #rowNodes = new WeakMap;
  #rowSnapshots = new WeakMap;
  #nodeLinks = new WeakMap;
  #librarySources = new WeakMap;
  #releasePending = new WeakMap;
  #releaseKnown = new WeakSet;
  #repositoryVisibility = new Map;
  #policies = new Map;
  #repositoryCache = new WeakMap;
  #repositoryLoading = new WeakMap;
  #loadingDetached = false;
  #iconSettings = defaultIcons();
  #options = null;
  #events = null;
  #observer = null;
  #observedWidth = null;
  #initialized = false;
  #didFocus = false;
  #prefixFrame = 0;
  #iconFrame = 0;
  #sitePromise = null;
  #libraryPromise = null;
  #librarySettings = null;
  #libraryState = "idle";
  #organization = "https://github.com/Hxape";
  #siteState = "loading";
  #footerContext = null;
  #footerRepository = null;
  #footerFileOpened = false;
  #selected = null;
  #repositories = [];
  #treeList = null;
  #siteStatus = null;
  #libraryList = null;
  #libraryStatus = null;
  #githubLink = null;
  #press = null;
  #touchScroll = null;
  #lockedScrollAxis = null;
  #holdDuration = 500;
  #scrollEndTimer = 0;
  #suppressReleaseClick = false;
  #display = null;
  #moving = false;
  #environment = 0;
  #privateAccess = null;
  #accessRevision = 0;
  #blockedPrivate = new Set;
  #informationKeyHold = null;
  #footerTarget = null;
  #preparing = new Map;
  #defaultRefs = new Map;
  #treeNavigation = null;
  #treeNavigationEpoch = 0;
  #historyPath = null;
  #temporaryHistoryBranches = new Set;
  #searchPath = null;
  #temporarySearchBranches = new Set;
  #historyToggles = new WeakMap;
  #branchPath(row) {
    const path = new Set;
    for (let parent = row.closest("details");parent && this.contains(parent); parent = parent.parentElement?.closest("details") || null)
      path.add(parent);
    return path;
  }
  #setHistoryBranchOpen(branch, open) {
    if (branch.open === open)
      return;
    this.#historyToggles.set(branch, open);
    branch.open = open;
  }
  #acceptHistoryPath(path, history, refresh) {
    if (refresh) {
      if (this.#historyPath)
        this.#historyPath = path;
      return;
    }
    const mode = history ? this.#options?.getHistoryTreeMode?.() || "temporary" : "always";
    for (const branch of this.#temporaryHistoryBranches) {
      if (!this.contains(branch)) {
        this.#temporaryHistoryBranches.delete(branch);
        continue;
      }
      if (mode === "none" || !path.has(branch) && !(history && mode === "always")) {
        if (!this.#searchPath?.has(branch) || this.#options?.getSearchTreeMode?.() === "none") {
          this.#setHistoryBranchOpen(branch, false);
        }
        this.#temporaryHistoryBranches.delete(branch);
      }
    }
    if (!history || mode !== "temporary")
      this.#temporaryHistoryBranches.clear();
    this.#historyPath = history ? path : null;
    if (mode === "none")
      return;
    for (const branch of path) {
      if ((!branch.open || this.#temporarySearchBranches.has(branch)) && history && mode === "temporary") {
        this.#temporaryHistoryBranches.add(branch);
      }
      if (mode === "always")
        this.#temporarySearchBranches.delete(branch);
      this.#setHistoryBranchOpen(branch, true);
    }
  }
  #clearHistoryPath() {
    this.#historyPath = null;
    for (const branch of this.#temporaryHistoryBranches) {
      if (this.contains(branch) && (!this.#searchPath?.has(branch) || this.#options?.getSearchTreeMode?.() === "none")) {
        this.#setHistoryBranchOpen(branch, false);
      }
    }
    this.#temporaryHistoryBranches.clear();
  }
  refreshHistoryTreeMode() {
    if (!this.#historyPath)
      return;
    this.#acceptHistoryPath(this.#historyPath, true, false);
    this.#refreshTree();
  }
  refreshSearchTreeMode() {
    if (this.#searchPath)
      this.#acceptSearchPath(this.#searchPath);
  }
  #acceptSearchPath(path) {
    const mode = this.#options?.getSearchTreeMode?.() || "temporary";
    for (const branch of this.#temporarySearchBranches) {
      if (!path?.has(branch) || mode === "none") {
        if (this.contains(branch) && (!this.#historyPath?.has(branch) || this.#options?.getHistoryTreeMode?.() === "none")) {
          this.#setHistoryBranchOpen(branch, false);
        }
        this.#temporarySearchBranches.delete(branch);
      }
    }
    this.#searchPath = path;
    if (path && mode !== "none") {
      for (const branch of path) {
        if (mode === "temporary" && (!branch.open || this.#temporaryHistoryBranches.has(branch))) {
          this.#temporarySearchBranches.add(branch);
        }
        if (mode === "always") {
          this.#temporarySearchBranches.delete(branch);
          this.#temporaryHistoryBranches.delete(branch);
        }
        this.#setHistoryBranchOpen(branch, true);
      }
    }
    this.#refreshTree();
  }
  #branchKey(branch) {
    const row = branch.querySelector(":scope > summary");
    if (!isHTMLElement(row))
      return null;
    const node = this.#rowNodes.get(row);
    const snapshot = this.#rowSnapshots.get(row);
    if (!node || !snapshot)
      return null;
    const link = this.#nodeLinks.get(row);
    return JSON.stringify([
      node.type,
      repositoryPath(snapshot.root, node.type === "symbol" ? link?.filePath || "" : node.path),
      node.type === "symbol" ? link?.symbolPath || "" : null
    ]);
  }
  #captureBranchExpansion(list) {
    const states = new Map;
    for (const branch of list?.querySelectorAll("details") || []) {
      const key = this.#branchKey(branch);
      if (key) {
        states.set(key, {
          open: branch.open,
          temporary: this.#temporaryHistoryBranches.has(branch),
          historyPath: this.#historyPath?.has(branch) || false,
          searchTemporary: this.#temporarySearchBranches.has(branch),
          searchPath: this.#searchPath?.has(branch) || false
        });
      }
      this.#temporaryHistoryBranches.delete(branch);
      this.#historyPath?.delete(branch);
      this.#temporarySearchBranches.delete(branch);
      this.#searchPath?.delete(branch);
      this.#historyToggles.delete(branch);
    }
    return states;
  }
  #restoreBranchExpansion(list, states) {
    for (const branch of list.querySelectorAll("details")) {
      const key = this.#branchKey(branch);
      const saved = key ? states.get(key) : null;
      if (!saved)
        continue;
      const open = saved.open && (!saved.temporary && !saved.searchTemporary || saved.temporary && this.#historyPath !== null || saved.searchTemporary && this.#searchPath !== null);
      this.#setHistoryBranchOpen(branch, open);
      if (saved.temporary && open)
        this.#temporaryHistoryBranches.add(branch);
      if (saved.historyPath)
        this.#historyPath?.add(branch);
      if (saved.searchTemporary && open)
        this.#temporarySearchBranches.add(branch);
      if (saved.searchPath)
        this.#searchPath?.add(branch);
    }
  }
  #cancelTreeNavigation() {
    const intent = this.#treeNavigation;
    if (!intent)
      return;
    this.#treeNavigation = null;
    ++this.#treeNavigationEpoch;
    intent.controller.abort();
    this.#endRepositoryLoading(intent.repository, "navigation", intent.loadingToken);
  }
  #treeNavigationCurrent(intent) {
    return this.#treeNavigation === intent && intent.epoch === this.#treeNavigationEpoch && !intent.controller.signal.aborted && intent.accessRevision === this.#accessRevision && this.#connected() && (intent.handedOff || this.#options?.panel.navigationRevision === intent.panelRevision) && (intent.committing || this.#selected === intent.row && this.ownerDocument.activeElement === intent.row);
  }
  async#stageTreeNavigation(origin, target, raw, context, information, treeOnly, options = {}) {
    const repository = this.#repositoryFor(origin);
    const panel = this.#options?.panel;
    if (!repository || !panel || !this.#connected())
      return false;
    const summary = repository.querySelector(":scope > summary");
    const startingRow = options.row || summary;
    if (!startingRow.isConnected || !repository.contains(startingRow))
      return false;
    this.#cancelTreeNavigation();
    panel.beginCatalogueNavigation();
    this.#selected?.classList.remove("is-selected");
    this.#selected = startingRow;
    startingRow.classList.add("is-selected");
    startingRow.focus({ preventScroll: true });
    for (const parent of this.#branchPath(startingRow)) {
      this.#temporaryHistoryBranches.delete(parent);
      this.#temporarySearchBranches.delete(parent);
      this.#historyToggles.delete(parent);
      parent.open = true;
    }
    startingRow.scrollIntoView({ block: "nearest", inline: "nearest" });
    this.#updateLink(startingRow);
    this.#refreshTree();
    const loadingToken = this.#beginRepositoryLoading(repository, "navigation", ui_strings_default.catalog.loading);
    const intent = {
      epoch: ++this.#treeNavigationEpoch,
      accessRevision: this.#accessRevision,
      repository,
      row: startingRow,
      target,
      raw,
      context,
      loadingToken,
      controller: new AbortController,
      panelRevision: panel.navigationRevision,
      handedOff: false,
      committing: false
    };
    this.#treeNavigation = intent;
    try {
      const state = this.#repositoryCache.get(repository);
      const rootOnly = target?.kind === "repository" || raw !== null && !this.#linkLocation(raw, context)?.path;
      if (!rootOnly || this.#repositoryLevel(repository) > 0) {
        let snapshot = await this.#loadRepository(repository);
        if (state?.privatePromise)
          await state.privatePromise;
        if (!this.#treeNavigationCurrent(intent))
          return false;
        snapshot = state?.data || snapshot;
        this.#renderRepositoryTree(repository, snapshot, true);
      }
      if (!this.#treeNavigationCurrent(intent))
        return false;
      const resolved = target || (raw !== null ? this.#linkTarget(raw, context) : null);
      if (!resolved)
        throw new Error("Linked material is absent from the current catalogue.");
      intent.target = resolved;
      if (resolved.kind === "repository" && !information)
        return true;
      const node = state?.data ? this.#targetNode(state.data, resolved) : null;
      const row = this.#targetRow(repository, state?.data || null, resolved);
      if (resolved.kind === "directory" && treeOnly && (node?.type !== "directory" || row === summary)) {
        throw new Error("Linked directory is absent from the current catalogue.");
      }
      intent.row = row;
      intent.committing = true;
      try {
        this.#selected?.classList.remove("is-selected");
        this.#selected = row;
        row.classList.add("is-selected");
        for (let parent = row.closest("details");parent && this.contains(parent); parent = parent.parentElement?.closest("details") || null) {
          this.#temporaryHistoryBranches.delete(parent);
          this.#temporarySearchBranches.delete(parent);
          this.#historyToggles.delete(parent);
          parent.open = true;
        }
        row.focus({ preventScroll: true });
        row.scrollIntoView({ block: "nearest", inline: "nearest" });
        if (resolved.kind === "directory" && treeOnly) {
          this.#footerTarget = { ...resolved, readmePath: null };
          this.#setFooter(githubHref(this.#footerTarget), repository, row, resolved.path);
        } else
          this.#updateLink(row);
        this.#refreshTree();
      } finally {
        intent.committing = false;
      }
      if (!this.#treeNavigationCurrent(intent))
        return false;
      if (resolved.kind === "directory" && treeOnly)
        return true;
      intent.handedOff = true;
      const accepted = await panel.navigate(resolved, {
        signal: intent.controller.signal,
        guard: () => this.#treeNavigationCurrent(intent),
        defaultBranch: options.defaultBranch,
        applySourcePin: options.applySourcePin,
        initialMode: options.initialMode || (resolved.kind === "declaration" || resolved.kind === "source" && resolved.line !== null ? "source" : undefined)
      });
      if (!accepted && this.#treeNavigationCurrent(intent)) {
        this.#showTreeNavigationFailure(intent, information, treeOnly, options);
      }
      return accepted;
    } catch {
      if (this.#treeNavigationCurrent(intent))
        this.#showTreeNavigationFailure(intent, information, treeOnly, options);
      return false;
    } finally {
      this.#endRepositoryLoading(repository, "navigation", loadingToken);
      if (this.#treeNavigation === intent)
        this.#treeNavigation = null;
    }
  }
  #showTreeNavigationFailure(intent, information, treeOnly, options) {
    const repository = intent.repository;
    const state = this.#repositoryCache.get(repository);
    if (!state)
      return;
    const retry = treeRetry(this.ownerDocument, ui_strings_default.catalog.retry, "retry-navigation");
    retry.addEventListener("click", () => {
      this.#stageTreeNavigation(this.#origin(repository), intent.target, intent.raw, intent.context, information, treeOnly, {
        ...options,
        row: options.row && intent.target ? this.#targetRow(repository, state.data, intent.target) : undefined
      });
    }, { signal: this.#events?.signal });
    setStatus(state.notice, this.#privateAccess?.failure(repository.dataset.repository || "") || ui_strings_default.catalog.repositoryFailed, retry);
    repository.insertBefore(state.notice, repository.querySelector(":scope > .tree-list"));
    this.#refreshTree();
  }
  configure(next) {
    if (this.#options && (this.#options.panel !== next.panel || this.#options.footer !== next.footer)) {
      this.disconnect();
    }
    this.#options = next;
    this.connect();
  }
  showFind() {
    if (!this.#moving && this.#events)
      this.#search?.show();
  }
  showSearchHistory() {
    if (!this.#moving && this.#events)
      this.#search?.showHistory();
  }
  #selectSearchRow(row) {
    if (!row) {
      this.#acceptSearchPath(null);
      return;
    }
    if (this.#moving || !this.#treeList?.contains(row) || !row.isConnected)
      return;
    const path = new Set;
    for (let parent = row.parentElement;parent && parent !== this.#treeList; parent = parent.parentElement) {
      if (isDetails(parent) && parent.querySelector(":scope > summary") !== row)
        path.add(parent);
    }
    this.#acceptSearchPath(path);
    this.#selected?.classList.remove("is-selected");
    this.#selected = row;
    row.classList.add("is-selected");
    this.#updateLink(row);
    this.#refreshTree();
    if (row.getBoundingClientRect().height)
      row.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  get footerTarget() {
    return this.#footerTarget ? readMaterialTarget(this.#footerTarget) : null;
  }
  #origin(repository) {
    return {
      kind: this.#librarySources.has(repository) ? "haxelib" : "repository",
      id: repository.dataset.repository || "",
      url: this.#librarySources.get(repository)?.url || repository.dataset.url || ""
    };
  }
  #repositoryFor(origin) {
    return [...this.#policies.keys()].find((repository) => {
      const known = this.#origin(repository);
      return known.kind === origin.kind && known.id === origin.id && known.url.toLowerCase() === origin.url.toLowerCase();
    }) || null;
  }
  async#readyRepository(origin, signal) {
    if (signal.aborted)
      throw signal.reason;
    if (this.#siteState !== "ready")
      await (this.#sitePromise || this.#loadSite());
    if (signal.aborted)
      throw signal.reason;
    if (this.#siteState !== "ready")
      throw new Error("Site settings are unavailable.");
    if (origin.kind === "haxelib" && this.#libraryState !== "ready") {
      await (this.#libraryPromise || this.#loadLibraryCatalogue(this.#librarySettings));
    }
    if (signal.aborted)
      throw signal.reason;
    const repository = this.#repositoryFor(origin);
    if (!repository)
      throw new Error("Repository is not registered.");
    return repository;
  }
  #targetNode(snapshot, target) {
    if (target.kind === "repository" || target.kind === "document")
      return null;
    const visit = (nodes, file = "", symbol = "") => {
      for (const node of nodes) {
        const path = node.type === "symbol" ? file : node.path;
        const fullPath = repositoryPath(snapshot.root, path);
        const entity = node.type === "symbol" ? symbol ? `${symbol}.${node.name}` : `${file}#${node.name}` : "";
        if (target.kind === "directory" && node.type === "directory" && target.path === fullPath)
          return node;
        if (target.kind === "source" && node.type === "file" && target.path === fullPath)
          return node;
        if (target.kind === "declaration" && node.type === "symbol" && target.path === fullPath && target.symbolPath === entity)
          return node;
        const found = visit(node.children, node.type === "file" ? node.path : file, entity);
        if (found)
          return found;
      }
      return null;
    };
    return visit(snapshot.children);
  }
  #targetRow(repository, snapshot, target) {
    let row = repository.querySelector(":scope > summary");
    const node = snapshot ? this.#targetNode(snapshot, target) : null;
    let parentLength = -1;
    for (const candidate of repository.querySelectorAll(".tree-row")) {
      const element = candidate;
      if (node && this.#rowNodes.get(element) === node)
        return element;
      const address = this.#targetForRow(element);
      if (target.kind !== "repository" && address?.kind === "directory" && target.path.startsWith(`${address.path}/`) && address.path.length > parentLength) {
        row = element;
        parentLength = address.path.length;
      }
    }
    return row;
  }
  #targetForRow(row) {
    const repository = row.closest("details[data-repository]");
    if (!repository)
      return null;
    const origin = this.#origin(repository);
    const node = this.#rowNodes.get(row);
    if (!node)
      return readMaterialTarget({ kind: "repository", origin });
    const snapshot = this.#rowSnapshots.get(row) || this.#repositoryCache.get(repository)?.data;
    const link = this.#nodeLinks.get(row);
    if (!snapshot)
      return null;
    const ref = snapshot.ref;
    if (node.type === "directory") {
      const readme = node.documents.README;
      return readMaterialTarget({
        kind: "directory",
        origin,
        ref,
        path: repositoryPath(snapshot.root, node.path),
        readmePath: readme?.path || null
      });
    }
    const path = repositoryPath(snapshot.root, node.type === "file" ? node.path : link?.filePath || "");
    return node.type === "symbol" && link?.symbolPath && node.line ? readMaterialTarget({
      kind: "declaration",
      origin,
      ref,
      path,
      symbolPath: link.symbolPath,
      symbolKind: node.kind || "symbol",
      line: node.line
    }) : readMaterialTarget({ kind: "source", origin, ref, path, line: null });
  }
  #deniedRepository(target, repository, policy, accessRevision) {
    const result = {
      public: false,
      documents: {},
      documentsDenied: true,
      reason: this.#privateAccess?.failure(target.origin.id) || undefined,
      retryAvailable: Boolean(this.#privateAccess?.active)
    };
    const request = {
      target,
      token: repository.querySelector(":scope > summary"),
      title: { type: "repository", name: target.origin.id },
      repository: target.origin.id,
      kind: "documents",
      scope: "repository",
      types: documentTypes,
      loadingSource: "site",
      readyDocuments: result,
      load: async (signal) => {
        if (signal.aborted)
          throw signal.reason;
        return result;
      }
    };
    return {
      target,
      request,
      repository,
      snapshot: null,
      accessRevision,
      privateSource: false,
      accessProof: null,
      ref: policy.branch,
      allowCached: false,
      denied: true
    };
  }
  async prepareTarget(input, { signal, refresh = false, sourceMode, defaultBranch = false, currentSource }) {
    const parsed = readMaterialTarget(input);
    if (!parsed)
      throw new Error("Invalid material address.");
    let target = parsed;
    const repository = await this.#readyRepository(target.origin, signal);
    const policy = this.#policies.get(repository);
    const state = this.#repositoryCache.get(repository);
    if (!policy || !state)
      throw new Error("Repository is unavailable.");
    const accessRevision = this.#accessRevision;
    const library = this.#librarySources.get(repository);
    if (target.kind === "repository" && !library && !refresh && !this.#privateAccess?.active && !documentTypes.some((type) => policy.documents[type])) {
      return this.#deniedRepository(target, repository, policy, accessRevision);
    }
    this.#preparing.set(repository, (this.#preparing.get(repository) || 0) + 1);
    try {
      let snapshot;
      try {
        snapshot = await this.#loadRepository(repository);
      } catch (error) {
        if (signal.aborted)
          throw signal.reason;
        if (accessRevision !== this.#accessRevision)
          throw new Error("Repository access changed.");
        if (target.kind === "repository" && !library && !refresh && (!this.#privateAccess?.active || this.#privateAccess.failure(target.origin.id))) {
          return this.#deniedRepository(target, repository, policy, accessRevision);
        }
        throw error;
      }
      if (state.privatePromise)
        await state.privatePromise;
      snapshot = state.data || snapshot;
      const privateSource = !library && Boolean(snapshot.privateSource);
      const allowCached = !refresh && (target.kind === "source" || target.kind === "declaration") && (sourceMode || (target.kind === "declaration" || target.line !== null ? "source" : "documentation")) === "documentation";
      if (privateSource && this.#privateAccess && (refresh || !allowCached && !this.#privateAccess.confirmed(target.origin.id))) {
        const data = await this.#privateAccess.refresh(target.origin.id, policy.branch);
        snapshot = this.#readSnapshot(repository, data, policy, undefined, true);
        state.data = snapshot;
        state.rendered = false;
        if (state.privatePromise)
          await state.privatePromise;
        snapshot = state.data || snapshot;
      }
      if (signal.aborted)
        throw signal.reason;
      if (accessRevision !== this.#accessRevision)
        throw new Error("Repository access changed.");
      const summary = repository.querySelector(":scope > summary");
      const node = this.#targetNode(snapshot, target);
      if (target.kind === "directory" && node?.type === "directory" && target.readmePath === null) {
        target = { ...target, readmePath: node.documents.README?.path || null };
      }
      const common = {
        target,
        token: summary,
        title: { type: node?.type || "repository", name: node?.name || target.origin.id, kind: node?.kind },
        version: library?.version,
        repository: library ? undefined : target.origin.id
      };
      let ref = target.kind === "repository" ? library?.ref || policy.branch : target.ref;
      if (library && (target.kind === "repository" || defaultBranch)) {
        ref = await publicDefaultRef(library.url, signal);
        if (signal.aborted)
          throw signal.reason;
        if (accessRevision !== this.#accessRevision || state.data !== snapshot) {
          throw new Error("Repository access changed.");
        }
        this.#defaultRefs.set(library.url.toLowerCase(), ref);
      }
      if (!library && ref !== policy.branch) {
        throw new Error("The material ref does not match the repository snapshot.");
      }
      if (target.kind !== "repository")
        target = { ...target, ref };
      const source = { url: snapshot.url, ref };
      let accessProof = privateSource ? this.#privateAccess?.snapshotRevision(target.origin.id, ref, { allowCached }) || null : null;
      if (privateSource && !accessProof)
        throw new Error("A confirmed repository snapshot is required.");
      const readDocument = async (path) => {
        if (privateSource && this.#privateAccess) {
          return this.#privateAccess.linkedDocument(target.origin.id, path, ref, signal, { refresh });
        }
        return loadPublicDocument({ ...source, path }, signal, { refresh });
      };
      let request;
      if (target.kind === "source" || target.kind === "declaration") {
        if (!target.path.endsWith(".hx") || this.#repositoryLevel(repository) < 3) {
          throw new Error("Source file is unavailable.");
        }
        if (target.kind === "declaration" && !node)
          throw new Error("Declaration is absent from the current snapshot.");
        const information = node || { type: "file", name: target.path.split("/").at(-1) || "", path: target.path, children: [] };
        if (this.#repositoryLevel(repository) < 4) {
          if (!node || sourceMode === "source")
            throw new Error("Source view is unavailable.");
          request = {
            ...common,
            target,
            title: { type: information.type, name: information.name, kind: information.kind },
            kind: "hxdoc",
            node: information
          };
        } else {
          const location2 = { ...source, path: target.path, library: Boolean(library), private: privateSource };
          const loadSource = async (loadSignal) => {
            if (privateSource && this.#privateAccess) {
              return {
                content: await this.#privateAccess.sourceFile(target.origin.id, location2.path, ref, loadSignal, {
                  refresh
                }),
                ref
              };
            }
            return loadPublicSourceFile2({ ...location2, library: false }, loadSignal, { refresh });
          };
          const mode = sourceMode || (target.kind === "declaration" || target.line !== null ? "source" : "documentation");
          const currentRequest = currentSource?.request;
          const previousReady = !refresh && currentSource && currentRequest?.kind === "source-file" && this.targetIsCurrent(currentSource) && currentSource.repository === repository && currentSource.snapshot === snapshot && currentSource.accessRevision === accessRevision && currentSource.privateSource === privateSource && currentSource.accessProof === accessProof && currentSource.ref === ref && currentRequest.source.url === source.url && currentRequest.source.path === target.path && currentRequest.readySource?.ref === ref ? currentRequest.readySource : undefined;
          const readySource = mode === "source" ? previousReady || await loadSource(signal) : undefined;
          if (readySource && !sourceHasLine(readySource.content, target.line)) {
            throw new Error("Source line is absent from the current file.");
          }
          request = {
            ...common,
            target,
            title: { type: information.type, name: information.name, kind: information.kind },
            kind: "source-file",
            node: information,
            source: location2,
            initialMode: mode,
            line: target.line,
            readySource,
            load: async (loadSignal) => {
              if (loadSignal.aborted)
                throw loadSignal.reason;
              if (accessRevision !== this.#accessRevision || state.data !== snapshot || privateSource && this.#privateAccess?.snapshotRevision(target.origin.id, ref, { allowCached }) !== accessProof) {
                throw new Error("Repository access changed.");
              }
              return readySource || loadSource(loadSignal);
            }
          };
        }
      } else {
        let result;
        let types;
        if (target.kind === "document") {
          const content = await readDocument(target.path);
          result = {
            source,
            public: false,
            documents: {
              [target.path]: { name: target.path.split("/").at(-1), path: target.path, format: target.format, content }
            },
            order: [target.path]
          };
          types = [target.path];
          common.title = { type: "file", name: target.path.split("/").at(-1) || "", kind: undefined };
        } else if (library) {
          const documents = await this.#loadPublicDocuments(library, node || { type: "repository", name: library.name }, signal, ref, refresh);
          result = {
            source: { url: documents.url, ref: documents.ref },
            public: true,
            documents: documents.documents,
            order: documents.order
          };
          types = documents.order;
        } else {
          types = target.kind === "directory" ? directoryDocumentTypes : documentTypes;
          const metadata = node?.type === "directory" ? node.documents : snapshot.documents;
          const documents = {};
          for (const type of types) {
            const document2 = metadata[type];
            if (!document2 || !privateSource && !policy.documents[type])
              continue;
            try {
              documents[type] = { ...document2, content: await readDocument(document2.path) };
            } catch (error) {
              if (refresh || privateSource || signal.aborted || typeof document2.content !== "string")
                throw error;
              documents[type] = document2;
            }
          }
          if (!Object.keys(documents).length && target.kind !== "directory") {
            if (target.kind === "repository" && !refresh) {
              return this.#deniedRepository(target, repository, policy, accessRevision);
            }
            throw new Error("No readable repository document.");
          }
          result = { source, public: false, documents };
        }
        if (target.kind === "directory" && (node?.type !== "directory" || target.readmePath !== null && node.documents.README?.path !== target.readmePath)) {
          throw new Error("Directory README is absent from the current snapshot.");
        }
        request = {
          ...common,
          target,
          kind: "documents",
          readyDocuments: result,
          types,
          scope: target.kind === "directory" ? "directory" : "repository",
          loadingSource: "github",
          description: node?.doc || (target.kind === "repository" ? repository.querySelector(":scope > .description.tree-content")?.textContent?.trim() || undefined : undefined),
          load: async (loadSignal) => {
            if (loadSignal.aborted)
              throw loadSignal.reason;
            return result;
          }
        };
      }
      accessProof = privateSource ? this.#privateAccess?.snapshotRevision(target.origin.id, ref, { allowCached }) || null : null;
      const prepared = {
        target,
        request,
        repository,
        snapshot,
        accessRevision,
        privateSource,
        accessProof,
        ref,
        allowCached
      };
      if (signal.aborted)
        throw signal.reason;
      if (!this.targetIsCurrent(prepared))
        throw new Error("Repository access changed.");
      return prepared;
    } finally {
      const count = (this.#preparing.get(repository) || 1) - 1;
      if (count)
        this.#preparing.set(repository, count);
      else
        this.#preparing.delete(repository);
    }
  }
  targetIsCurrent(prepared) {
    return prepared.accessRevision === this.#accessRevision && this.#repositoryFor(prepared.target.origin) === prepared.repository && (prepared.denied || this.#repositoryCache.get(prepared.repository)?.data === prepared.snapshot) && (!prepared.privateSource || prepared.accessProof !== null && prepared.accessProof === this.#privateAccess?.snapshotRevision(prepared.target.origin.id, prepared.ref, {
      allowCached: prepared.allowCached
    }));
  }
  acceptTarget(prepared, shownTarget, { history = false, refresh = false } = {}) {
    const intent = this.#treeNavigation;
    if (intent && intent.repository === prepared.repository && this.#treeNavigationCurrent(intent)) {
      intent.committing = true;
    }
    const repository = prepared.repository;
    if (prepared.snapshot) {
      this.#renderRepositoryTree(repository, prepared.snapshot, true);
    }
    const row = this.#targetRow(repository, prepared.snapshot, prepared.target);
    prepared.request.token = row;
    this.#selected?.classList.remove("is-selected");
    this.#selected = row;
    row.classList.add("is-selected");
    this.#acceptHistoryPath(this.#branchPath(row), history, refresh);
    if (history && !refresh && (this.#options?.getHistoryTreeMode?.() || "temporary") !== "none") {
      row.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    this.#footerTarget = readMaterialTarget(shownTarget);
    this.#setFooter(githubHref(shownTarget), repository, row, shownTarget.kind === "repository" ? shownTarget.origin.id : shownTarget.kind === "directory" ? shownTarget.readmePath || shownTarget.path : shownTarget.path, !prepared.denied);
    this.#refreshTree();
  }
  async revealRepository(input) {
    const origin = readMaterialOrigin(input);
    if (!origin)
      return false;
    try {
      const repository = await this.#readyRepository(origin, new AbortController().signal);
      if (this.#repositoryLevel(repository) > 0)
        await this.#loadRepository(repository);
      const state = this.#repositoryCache.get(repository);
      if (state?.data)
        this.#renderRepositoryTree(repository, state.data);
      const row = repository.querySelector(":scope > summary");
      for (let parent = repository;parent && this.contains(parent); parent = parent.parentElement?.closest("details")) {
        this.#temporaryHistoryBranches.delete(parent);
        this.#temporarySearchBranches.delete(parent);
        this.#historyToggles.delete(parent);
        parent.open = true;
      }
      this.#selected?.classList.remove("is-selected");
      this.#selected = row;
      row.classList.add("is-selected");
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: "nearest", inline: "nearest" });
      this.#updateLink(row);
      this.#refreshTree();
      return true;
    } catch {
      return false;
    }
  }
  async revealDirectory(target) {
    try {
      const repository = await this.#readyRepository(target.origin, new AbortController().signal);
      const revision = this.#accessRevision;
      let snapshot = await this.#loadRepository(repository);
      const state = this.#repositoryCache.get(repository);
      if (state?.privatePromise)
        await state.privatePromise;
      snapshot = state?.data || snapshot;
      if (revision !== this.#accessRevision)
        return false;
      const node = this.#targetNode(snapshot, target);
      if (node?.type !== "directory")
        return false;
      this.#renderRepositoryTree(repository, snapshot);
      const row = [...repository.querySelectorAll(".tree-row")].find((element) => this.#rowNodes.get(element) === node);
      if (!isHTMLElement(row))
        return false;
      this.#selected?.classList.remove("is-selected");
      this.#selected = row;
      row.classList.add("is-selected");
      for (let parent = row.closest("details");parent && this.contains(parent); parent = parent.parentElement?.closest("details") || null) {
        this.#temporaryHistoryBranches.delete(parent);
        this.#temporarySearchBranches.delete(parent);
        this.#historyToggles.delete(parent);
        parent.open = true;
      }
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: "nearest", inline: "nearest" });
      this.#footerTarget = { ...target, readmePath: null };
      this.#setFooter(githubHref(this.#footerTarget), repository, row, target.path);
      this.#refreshTree();
      return true;
    } catch {
      return false;
    }
  }
  #pathTarget(origin, ref, path, anchor, directory) {
    if (!materialRef(ref) || !materialPath(path, true))
      return null;
    if (!path)
      return { kind: "repository", origin };
    if (!directory && (linkedDocumentPath(path) || origin.kind === "haxelib" && publicDocumentPath(path))) {
      return readMaterialTarget({
        kind: "document",
        origin,
        ref,
        path,
        format: /\.(?:md|markdown)$/i.test(path) ? "markdown" : "text",
        anchor
      });
    }
    if (!directory && path.endsWith(".hx")) {
      const line = anchor === null || anchor === "" ? null : /^L[1-9]\d*$/.test(anchor) ? Number(anchor.slice(1)) : -1;
      return readMaterialTarget({ kind: "source", origin, ref, path, line });
    }
    const repository = this.#repositoryFor(origin);
    const snapshot = repository && this.#repositoryCache.get(repository)?.data;
    if (!snapshot)
      return directory ? { kind: "directory", origin, ref, path, readmePath: null } : null;
    const node = this.#targetNode(snapshot, { kind: "directory", origin, ref, path, readmePath: null });
    if (node?.type === "directory") {
      return readMaterialTarget({
        kind: "directory",
        origin,
        ref,
        path,
        readmePath: node.documents.README?.path || null
      });
    }
    return null;
  }
  #linkLocation(value, context) {
    if (!value || /[\\\u0000-\u001f\u007f]/.test(value))
      return null;
    const current = context && readMaterialTarget(context);
    if (!/^[a-z][a-z\d+.-]*:/i.test(value)) {
      if (!current || current.kind === "repository")
        return null;
      const base = current.kind === "directory" ? current.readmePath : current.path;
      if (!base)
        return null;
      const relative = relativeMaterialPath(value, base);
      return relative ? { origin: current.origin, ref: current.ref, ...relative } : null;
    }
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (url.origin !== "https://github.com" || url.username || url.password)
      return null;
    const match = /^\/([a-z\d_.-]+)\/([a-z\d_.-]+)(?:\/(blob|tree)\/(.*))?\/?$/i.exec(url.pathname);
    if (!match)
      return null;
    const base = `https://github.com/${match[1]}/${match[2]}`;
    const repository = [...this.#policies.keys()].find((item) => this.#origin(item).url.toLowerCase() === base.toLowerCase());
    if (!repository)
      return null;
    const origin = this.#origin(repository);
    if (!match[3])
      return { origin, ref: null, path: "", anchor: null, directory: true };
    const library = this.#librarySources.get(repository);
    const snapshot = this.#repositoryCache.get(repository)?.data;
    const refs = new Set([
      library?.ref,
      this.#policies.get(repository)?.branch,
      snapshot?.ref,
      this.#defaultRefs.get(origin.url.toLowerCase()),
      library?.installation.source === "github" ? library.installation.ref : undefined
    ].filter((ref) => typeof ref === "string"));
    const tail = (match[4] || "").replace(/%[a-f\d]{2}/gi, (encoded) => encoded.toUpperCase());
    const candidates = [];
    for (const ref of refs) {
      if (!ref || !materialRef(ref) || library && ref === this.#policies.get(repository)?.branch && ref !== this.#defaultRefs.get(origin.url.toLowerCase()) && ref !== library.ref)
        continue;
      const prefixes = new Set([encodeURIComponent(ref), ref.split("/").map(encodeURIComponent).join("/")]);
      for (const prefix of prefixes) {
        if (tail === prefix || tail.startsWith(`${prefix}/`)) {
          const rawPath = tail.slice(prefix.length).replace(/^\//, "").replace(/\/$/, "");
          try {
            const parts = rawPath ? rawPath.split("/").map((part) => decodeURIComponent(part)) : [];
            if (parts.some((part) => !part || /[\/\\\u0000-\u001f\u007f]/.test(part)))
              continue;
            if (!candidates.some((candidate) => candidate.ref === ref && candidate.path === parts.join("/"))) {
              candidates.push({ ref, path: parts.join("/") });
            }
          } catch {}
        }
      }
    }
    if (candidates.length !== 1)
      return null;
    let anchor = url.hash ? url.hash.slice(1) : null;
    try {
      if (anchor !== null)
        anchor = decodeURIComponent(anchor);
    } catch {
      return null;
    }
    return { origin, ref: candidates[0].ref, path: candidates[0].path, anchor, directory: match[3] === "tree" };
  }
  #linkTarget(value, context) {
    const location2 = this.#linkLocation(value, context);
    if (!location2)
      return null;
    return location2.ref === null ? { kind: "repository", origin: location2.origin } : this.#pathTarget(location2.origin, location2.ref, location2.path, location2.anchor, location2.directory);
  }
  canRouteLink(value, contextTarget = null) {
    if (this.#linkTarget(value.trim(), contextTarget))
      return true;
    const location2 = this.#linkLocation(value.trim(), contextTarget);
    return Boolean(location2 && (location2.path === "" || location2.directory || linkedDocumentPath(location2.path) || location2.path.endsWith(".hx")));
  }
  async routeLink(value, contextTarget = null) {
    if (this.#siteState !== "ready")
      await (this.#sitePromise || this.#loadSite());
    if (this.#libraryState !== "ready" && this.#librarySettings) {
      await (this.#libraryPromise || this.#loadLibraryCatalogue(this.#librarySettings));
    }
    let target = this.#linkTarget(value.trim(), contextTarget);
    if (target)
      return target;
    const location2 = this.#linkLocation(value.trim(), contextTarget);
    if (location2) {
      const repository = this.#repositoryFor(location2.origin);
      if (repository) {
        try {
          await this.#loadRepository(repository);
        } catch {
          return null;
        }
        target = this.#linkTarget(value.trim(), contextTarget);
      }
    }
    return target;
  }
  targetHref(target, mode, organizationRoot) {
    const parsed = readMaterialTarget(target);
    if (!parsed)
      return null;
    if (mode !== "vscode")
      return githubHref(parsed);
    const root = readOrganizationRoot(organizationRoot);
    const repository = this.#repositoryFor(parsed.origin);
    if (!root || !repository)
      return null;
    const library = this.#librarySources.get(repository);
    const localRoot = library?.localPath || (parsed.origin.kind === "repository" ? parsed.origin.id : "");
    if (!materialPath(localRoot))
      return null;
    const path = parsed.kind === "repository" ? "" : parsed.kind === "directory" ? parsed.path : parsed.path;
    const absolute = `${root.replace(/\/$/, "")}/${localRoot}${path ? `/${path}` : ""}`;
    const line = parsed.kind === "source" || parsed.kind === "declaration" ? parsed.line : null;
    const encoded = absolute.split("/").map((part, index) => index === 0 && /^[a-z]:$/i.test(part) ? part : encodeURIComponent(part)).join("/");
    const suffix = parsed.kind === "repository" || parsed.kind === "directory" ? "/" : line ? `:${line}:1` : "";
    return `vscode://file/${encoded.replace(/^\//, "")}${suffix}`;
  }
  targetUsesBranch(input) {
    const target = readMaterialTarget(input);
    if (!target || target.kind === "repository")
      return false;
    const repository = this.#repositoryFor(target.origin);
    if (!repository)
      return false;
    const library = this.#librarySources.get(repository);
    if (library) {
      return this.#defaultRefs.get(library.url.toLowerCase()) === target.ref || library.installation.source === "github" && library.installation.refKind === "branch" && library.installation.ref === target.ref;
    }
    const snapshot = this.#repositoryCache.get(repository)?.data;
    if (!snapshot || snapshot.ref !== target.ref || this.#policies.get(repository)?.branch !== target.ref) {
      return false;
    }
    return !snapshot.privateSource || !this.#blockedPrivate.has(target.origin.id) && Boolean(this.#privateAccess?.confirmed(target.origin.id) && this.#privateAccess.snapshotRevision(target.origin.id, target.ref));
  }
  linkHref(value, contextTarget, mode, organizationRoot) {
    const target = this.#linkTarget(value.trim(), contextTarget);
    if (target)
      return this.targetHref(target, mode, organizationRoot);
    if (!/^https?:\/\//i.test(value) || /[\\\u0000-\u001f\u007f]/.test(value))
      return null;
    try {
      const url = new URL(value);
      return url.username || url.password ? null : url.href;
    } catch {
      return null;
    }
  }
  async followTarget(target) {
    const mode = this.#options?.getLinkMode?.() || "internal";
    if (mode === "internal") {
      return this.#stageTreeNavigation(target.origin, target, null, null, false, target.kind === "directory" && target.readmePath === null);
    }
    const href = this.targetHref(target, mode, this.#options?.getOrganizationRoot?.() || "");
    if (!href)
      return false;
    displayWindow(this).open(href, "_blank", "noopener,noreferrer");
    return true;
  }
  async followLink(value, contextTarget = null, information = false) {
    const raw = value.trim();
    const mode = information ? "internal" : this.#options?.getLinkMode?.() || "internal";
    if (mode !== "internal") {
      const href = this.linkHref(raw, contextTarget, mode, this.#options?.getOrganizationRoot?.() || "");
      if (!href)
        return false;
      displayWindow(this).open(href, "_blank", "noopener,noreferrer");
      return true;
    }
    const location2 = this.#linkLocation(raw, contextTarget);
    if (!location2)
      return false;
    return this.#stageTreeNavigation(location2.origin, null, raw, contextTarget, information, !information && contextTarget === null && location2.directory);
  }
  refreshLinkMode() {
    const mode = this.#options?.getLinkMode?.() || "internal";
    const root = this.#options?.getOrganizationRoot?.() || "";
    if (this.#githubLink && this.#footerTarget) {
      const href = this.targetHref(this.#footerTarget, mode, root);
      if (href)
        this.#githubLink.href = href;
      else
        this.#githubLink.removeAttribute("href");
    }
    for (const element of this.querySelectorAll(".description a, .catalog-caption a")) {
      const link = element;
      const original = link.dataset.originalHref || link.getAttribute("href") || "";
      if (!original)
        continue;
      link.dataset.originalHref = original;
      const target = this.#linkTarget(original, null);
      const location2 = this.#linkLocation(original, null);
      if (location2) {
        const kind = !location2.path ? "repository" : location2.directory ? "directory" : location2.anchor && /^L[1-9]\d*$/.test(location2.anchor) ? "line" : "file";
        link.dataset.navigationLink = kind;
        link.dataset.navigationKind = kind;
        const extension = /\.([a-z\d]+)$/i.exec(location2.path)?.[1]?.toLowerCase();
        if (extension && (kind === "file" || kind === "line"))
          link.dataset.navigationFileKind = extension;
        else
          delete link.dataset.navigationFileKind;
      } else {
        delete link.dataset.navigationLink;
        delete link.dataset.navigationKind;
        delete link.dataset.navigationFileKind;
      }
      showCaptionLinkIcon(link, Boolean(location2));
      const href = this.linkHref(original, null, mode, root);
      if (href)
        link.href = href;
      else
        link.removeAttribute("href");
    }
  }
  setPrivateAccess(access) {
    this.#privateAccess = access;
    access.addEventListener("change", () => this.#forgetPrivateData());
    access.addEventListener("snapshot-state", (event) => {
      const { repo, state } = event.detail;
      const repository = this.#repositories.find((item) => item.dataset.repository === repo);
      if (!repository)
        return;
      if (state === "revoked" || state === "missing") {
        this.#blockedPrivate.add(repo);
        this.#restorePublic(repository);
      } else if (state === "updated") {
        const pending = this.#repositoryCache.get(repository)?.privatePromise;
        if (pending)
          pending.then(() => this.#upgradePrivate(repository, this.#accessRevision, true));
        else
          this.#upgradePrivate(repository, this.#accessRevision, true);
      } else {
        repository.dataset.level = String(this.#repositoryLevel(repository));
        this.#showFreshness(repository, state);
        if (this.#footerRepository === repository)
          this.#updatePrivateLock(repository);
      }
    });
  }
  #forgetPrivateData() {
    this.#cancelTreeNavigation();
    this.#clearHistoryPath();
    ++this.#accessRevision;
    this.#cancelGesture();
    this.#blockedPrivate.clear();
    for (const repository of this.#repositories)
      this.#options?.panel.forgetRepository(repository);
    for (const repository of this.#repositories) {
      this.#clearRepositoryLoading(repository);
      repository.dataset.level = String(this.#repositoryLevel(repository));
      const state = this.#repositoryCache.get(repository);
      if (!state)
        continue;
      if (this.#selected && repository.contains(this.#selected) && this.#selected !== repository.querySelector(":scope > summary")) {
        this.#selected.classList.remove("is-selected");
        this.#selected = repository.querySelector(":scope > summary");
        this.#selected?.classList.add("is-selected");
      }
      repository.querySelector(":scope > .tree-list")?.remove();
      state.notice.remove();
      state.data = null;
      state.promise = null;
      state.privatePromise = null;
      state.rendered = false;
      state.presenting = false;
      delete repository.dataset.loaded;
      delete repository.dataset.loading;
      repository.removeAttribute("aria-busy");
    }
    this.#footerContext = null;
    this.#updateLink(this.#selected);
    this.#refreshTree();
    for (const repository of this.#repositories)
      if (repository.open)
        this.#ensureRepository(repository);
  }
  #beginRepositoryLoading(repository, reason, label) {
    let reasons = this.#repositoryLoading.get(repository);
    if (!reasons) {
      reasons = new Map;
      this.#repositoryLoading.set(repository, reasons);
    }
    const token = {};
    reasons.set(reason, { token, label });
    this.#showRepositoryLoading(repository);
    return token;
  }
  #endRepositoryLoading(repository, reason, token) {
    const reasons = this.#repositoryLoading.get(repository);
    if (!reasons?.has(reason) || token && reasons.get(reason)?.token !== token)
      return;
    reasons.delete(reason);
    if (!reasons.size)
      this.#repositoryLoading.delete(repository);
    this.#showRepositoryLoading(repository);
  }
  #clearRepositoryLoading(repository) {
    this.#repositoryLoading.delete(repository);
    this.#showRepositoryLoading(repository);
  }
  #showRepositoryLoading(repository) {
    const row = repository.querySelector(":scope > summary");
    if (!row)
      return;
    const label = row.querySelector(":scope > .node-label");
    const icon = row.querySelector(':scope > svg[data-icon-group="repositories"]');
    let loader = row.querySelector(":scope > tree-loader.repository-loader");
    const reasons = this.#repositoryLoading.get(repository);
    if (!reasons && !loader)
      return;
    const active = this.#loadingDetached ? undefined : reasons;
    if (active?.size) {
      icon?.remove();
      if (!loader) {
        loader = new TreeLoader;
        loader.className = "repository-loader";
        row.insertBefore(loader, label);
      }
      const reason = active.get("navigation") || active.get("outline") || active.get("freshness") || active.get("version");
      if (reason)
        loader.setAttribute("label", reason.label);
    } else {
      loader?.remove();
      if (!icon)
        row.insertBefore(groupedIcon("repository", "repositories", this.#iconSettings), label);
    }
  }
  #showFreshness(repository, freshness) {
    const state = this.#repositoryCache.get(repository);
    if (!state?.data?.privateSource || !repository.open) {
      this.#endRepositoryLoading(repository, "freshness");
      return;
    }
    const text = freshness === "checking" ? ui_strings_default.catalog.savedChecking : freshness === "stale" ? ui_strings_default.catalog.savedStale : freshness === "cache-error" ? ui_strings_default.catalog.cacheWriteFailed : "";
    if (freshness === "checking") {
      if (!this.#repositoryLoading.get(repository)?.has("freshness")) {
        this.#beginRepositoryLoading(repository, "freshness", text);
      }
      setStatus(state.notice);
      state.notice.remove();
    } else {
      this.#endRepositoryLoading(repository, "freshness");
      setStatus(state.notice, text);
    }
    if (text && freshness !== "checking") {
      repository.insertBefore(state.notice, repository.querySelector(":scope > .tree-list"));
    } else
      state.notice.remove();
    this.#refreshTree();
  }
  #restorePublic(repository) {
    const state = this.#repositoryCache.get(repository);
    if (!state)
      return;
    if (this.#historyPath?.has(repository))
      this.#clearHistoryPath();
    this.#clearRepositoryLoading(repository);
    this.#cancelGesture();
    const name = repository.dataset.repository || "";
    const reopen = this.#options?.panel.showRepositoryUnavailable(repository, this.#privateAccess?.failure(name) || ui_strings_default.catalog.privateData);
    if (this.#selected && repository.contains(this.#selected) && this.#selected !== repository.querySelector(":scope > summary")) {
      this.#selected.classList.remove("is-selected");
      this.#selected = repository.querySelector(":scope > summary");
      this.#selected?.classList.add("is-selected");
    }
    repository.querySelector(":scope > .tree-list")?.remove();
    state.notice.remove();
    state.data = null;
    state.promise = null;
    state.privatePromise = null;
    state.rendered = false;
    state.presenting = false;
    delete repository.dataset.loaded;
    if (repository.open)
      this.#ensureRepository(repository);
    this.#updateLink(this.#selected);
    this.#refreshTree();
    if (reopen) {
      const summary = repository.querySelector(":scope > summary");
      if (summary && isHTMLElement(summary))
        this.#openPreview(summary);
    }
  }
  setIcons(settings) {
    Object.assign(this.#iconSettings, settings);
    const scroll = this.scrollTop;
    applyIcons(this, this.#iconSettings);
    this.scrollTop = scroll;
    this.#schedulePrefixes();
    if (!this.#connected())
      return;
    const view = this.#display || displayWindow(this);
    const environment = this.#environment;
    view.cancelAnimationFrame(this.#iconFrame);
    this.#iconFrame = view.requestAnimationFrame(() => {
      if (environment !== this.#environment)
        return;
      this.#iconFrame = 0;
      if (this.#connected())
        this.scrollTop = scroll;
    });
  }
  setHoldDuration(duration) {
    if (Number.isInteger(duration) && duration >= 250 && duration <= 500)
      this.#holdDuration = duration;
  }
  prepareMove({ restoreFocus = true, rollbackFocus = true } = {}) {
    this.#cancelTreeNavigation();
    if (this.#moving)
      throw new Error("The catalogue is already being moved");
    const scrollTop = this.scrollTop;
    const scrollLeft = this.scrollLeft;
    const active = this.ownerDocument.activeElement;
    const focused = isHTMLElement(active) && this.contains(active) ? active : null;
    const wasBound = Boolean(this.#events);
    let finished = false;
    const resume = (focus) => {
      if (finished)
        return;
      try {
        if (wasBound)
          this.#bind(true);
        this.scrollTop = scrollTop;
        this.scrollLeft = scrollLeft;
        if (focus && focused?.isConnected)
          focused.focus({ preventScroll: true });
      } catch (error) {
        this.#unbind();
        throw error;
      }
    };
    const rollback = () => {
      if (finished)
        return;
      try {
        this.#unbind();
        resume(rollbackFocus);
      } finally {
        this.querySelectorAll("tree-loader").forEach((loader) => loader.restart());
        this.#moving = false;
        finished = true;
      }
    };
    this.#moving = true;
    try {
      this.#unbind();
    } catch (error) {
      try {
        rollback();
      } catch (failure) {
        throw new AggregateError([error, failure], "Could not restore the catalogue after preparation failed");
      }
      throw error;
    }
    return {
      resume: () => resume(restoreFocus),
      rollback,
      commit: () => {
        this.#moving = false;
        finished = true;
      }
    };
  }
  #connected() {
    return Boolean(this.#events && this.isConnected);
  }
  #emitIcons() {
    if (this.#connected() && this.#siteState === "ready") {
      this.dispatchEvent(new CustomEvent("icons-ready", { detail: { ...this.#iconSettings }, bubbles: true }));
    }
  }
  #initialize() {
    if (this.#initialized)
      return true;
    this.#treeList = this.querySelector(":scope > .tree-list");
    if (!this.#treeList)
      return false;
    this.#repositories = [
      ...this.querySelectorAll("details[data-repository]")
    ];
    this.#siteStatus = this.querySelector("#site-status");
    this.#libraryList = this.querySelector("#haxelib-list");
    this.#libraryStatus = this.querySelector("#haxelib-status");
    if (!this.#siteStatus || !this.#libraryList || !this.#libraryStatus)
      return false;
    this.#repositories.forEach((repository) => this.#registerRepository(repository));
    this.#selected = this.querySelector(".tree-row");
    this.#selected?.classList.add("is-selected");
    this.#initialized = true;
    return true;
  }
  connect() {
    if (!this.#moving)
      this.#bind(false);
  }
  #bind(preserve) {
    if (this.#events || !this.#options || !this.isConnected || !this.#initialize())
      return;
    const document2 = this.ownerDocument;
    const view = displayWindow(this);
    const environment = ++this.#environment;
    this.#display = view;
    this.#events = new view.AbortController;
    if (!this.#search) {
      this.#search = new CatalogSearch(this, () => [...this.#treeList?.querySelectorAll(".tree-row") || []].filter(isHTMLElement), (row) => this.#selectSearchRow(row));
    }
    this.#search.connect();
    this.#githubLink = this.#options.footer.querySelector("#github-link");
    const help = this.#options.footer.querySelector("#keyboard-help");
    if (help?.ownerDocument === document2) {
      this.setAttribute("aria-describedby", help.id);
      this.removeAttribute("aria-description");
    } else {
      this.removeAttribute("aria-describedby");
      const description = help?.getAttribute("aria-label") || help?.textContent?.replace(/\s+/g, " ").trim();
      if (description)
        this.setAttribute("aria-description", description);
      else
        this.removeAttribute("aria-description");
    }
    this.#listen(this, "toggle", this.#onToggle, { capture: true });
    this.#listen(this, "focusin", this.#onFocus);
    this.#listen(this.#options.panel, "view-open", this.#onViewOpen);
    this.#listen(this.#options.panel, "document-select", this.#onDocumentSelect);
    this.#listen(this.#options.panel, "view-close", this.#onViewClose);
    if (this.#githubLink) {
      this.#listen(this.#githubLink, "click", (event) => {
        const click = event;
        if (click.button !== 0 || click.ctrlKey || click.metaKey || click.altKey || click.shiftKey)
          return;
        if ((this.#options?.getLinkMode?.() || "internal") === "internal" && this.#footerTarget) {
          event.preventDefault();
          this.followTarget(this.#footerTarget);
        }
      });
    }
    this.#listen(document2, "pointerdown", (event) => {
      this.#cancelTreeNavigation();
      const pointer = event;
      if (pointer.isPrimary && pointer.button === 0) {
        this.#suppressReleaseClick = false;
        this.#cancelPress();
      } else
        this.#cancelGesture();
      this.#cancelInformationKey();
    }, { capture: true });
    this.#listen(document2, "focusin", (event) => {
      const intent = this.#treeNavigation;
      if (intent && !intent.committing && event.target !== intent.row)
        this.#cancelTreeNavigation();
    }, { capture: true });
    this.#listen(this, "pointerdown", this.#onPointerDown);
    this.#listen(document2, "pointermove", this.#onPointerMove, { passive: true });
    this.#listen(document2, "pointerup", this.#onPointerUp, { passive: true });
    this.#listen(document2, "pointercancel", this.#cancelGesture, { passive: true });
    this.#listen(this, "touchstart", this.#onTouchStart, { passive: true });
    this.#listen(this, "touchmove", this.#onTouchMove, { passive: false });
    this.#listen(this, "touchend", this.#endTouchScroll, { passive: true });
    this.#listen(this, "touchcancel", (event) => {
      this.#cancelGesture();
      this.#endTouchScroll(event);
    }, { passive: true });
    this.#listen(this, "scroll", this.#cancelGesture, { capture: true, passive: true });
    if (this.#supportsScrollEnd())
      this.#listen(this, "scrollend", this.#onScrollEnd, { passive: true });
    else
      this.#listen(this, "scroll", this.#onLegacyScroll, { passive: true });
    this.#listen(view, "blur", () => {
      this.#cancelGesture();
      this.#cancelTreeNavigation();
    });
    this.#listen(this, "focusout", this.#onHoldFocusOut);
    this.#listen(document2, "click", (event) => {
      if (this.#suppressReleaseClick && event.detail > 0) {
        event.preventDefault();
        event.stopPropagation();
        this.#suppressReleaseClick = false;
      }
    }, { capture: true });
    this.#listen(this, "contextmenu", (event) => {
      if (this.#press || this.#suppressReleaseClick)
        event.preventDefault();
    });
    this.#listen(this, "click", this.#onClick);
    this.#listen(document2, "keydown", this.#onKeydown);
    this.#listen(document2, "keyup", this.#onInformationKeyUp);
    this.#observedWidth = null;
    this.#observer = new view.ResizeObserver(([entry]) => {
      if (environment !== this.#environment || this.#moving || !this.#connected())
        return;
      const width = entry.contentRect.width;
      if (!Number.isFinite(width) || width === this.#observedWidth)
        return;
      this.#observedWidth = width;
      this.#schedulePrefixes();
    });
    this.#observer.observe(this);
    this.#loadingDetached = false;
    this.querySelectorAll("details[data-repository]").forEach((repository) => this.#showRepositoryLoading(repository));
    if (preserve) {
      this.#schedulePrefixes();
      return;
    }
    this.#refreshTree();
    this.#updateLink(this.#selected);
    this.#emitIcons();
    for (const repository of this.querySelectorAll("details[data-repository][open]")) {
      this.#ensureRepository(repository);
    }
    if (!this.#didFocus && this.#selected) {
      this.#selected.focus({ preventScroll: true });
      this.#didFocus = true;
    }
    if (!this.#sitePromise && this.#siteState !== "ready")
      this.#sitePromise = this.#loadSite();
    else if (this.#siteState === "ready" && this.#libraryState === "idle") {
      this.#loadLibraryCatalogue(this.#librarySettings);
    }
  }
  disconnect() {
    if (this.#moving || !this.#events)
      return;
    this.#clearHistoryPath();
    this.#unbind();
    this.#loadingDetached = true;
    this.querySelectorAll("details[data-repository]").forEach((repository) => this.#showRepositoryLoading(repository));
    this.#options?.panel.close({ restore: false });
  }
  #unbind() {
    this.#search?.pause();
    this.#cancelTreeNavigation();
    ++this.#environment;
    this.#events?.abort();
    this.#events = null;
    this.#cancelGesture();
    this.#touchScroll = null;
    this.#lockedScrollAxis = null;
    this.#display?.clearTimeout(this.#scrollEndTimer);
    this.#scrollEndTimer = 0;
    this.#suppressReleaseClick = false;
    this.#display?.cancelAnimationFrame(this.#prefixFrame);
    this.#display?.cancelAnimationFrame(this.#iconFrame);
    this.#prefixFrame = this.#iconFrame = 0;
    this.#observer?.disconnect();
    this.#observer = null;
    this.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
  }
  #listen(target, type, listener, settings = {}) {
    if (!this.#events)
      return;
    const bound = listener.bind(this);
    target.addEventListener(type, (event) => {
      if (!this.#moving)
        bound(event);
    }, { ...settings, signal: this.#events.signal });
  }
  #refreshTree() {
    if (!this.#treeList)
      return;
    refreshTree(this.#treeList);
    this.#schedulePrefixes();
  }
  #schedulePrefixes() {
    if (this.#prefixFrame || !this.#connected())
      return;
    const view = this.#display || displayWindow(this);
    const environment = this.#environment;
    this.#prefixFrame = view.requestAnimationFrame(() => {
      if (environment !== this.#environment)
        return;
      this.#prefixFrame = 0;
      if (this.#connected())
        updatePrefixes(this.#treeList, view);
    });
  }
  refreshTextSize() {
    this.#schedulePrefixes();
  }
  #updateLink(row) {
    if (!row || !this.#connected())
      return;
    const repository = row.closest("details[data-repository]");
    const link = this.#nodeLinks.get(row);
    this.#footerTarget = this.#targetForRow(row);
    const url = row.dataset.url || link?.url || repository?.dataset.url || this.#organization;
    this.#setFooter(url, repository, row, link?.path);
  }
  #setFooter(url, repository, context, path = url, fileOpened = false) {
    if (!this.#githubLink)
      return;
    showContext(this.#githubLink, { url, path });
    this.#footerRepository = repository;
    this.#footerFileOpened = fileOpened;
    this.#footerContext = context;
    this.#updatePrivateLock(repository);
    this.#checkPublicRepository(repository);
    this.refreshLinkMode();
  }
  #checkPublicRepository(repository) {
    const name = repository?.dataset.repository;
    if (!repository || !name || this.#librarySources.has(repository) || this.#repositoryVisibility.has(name))
      return;
    this.#repositoryVisibility.set(name, "checking");
    githubJson(`https://api.github.com/repos/Hxape/${encodeURIComponent(name)}`).then((value) => {
      const data = isRecord(value) ? value : null;
      this.#repositoryVisibility.set(name, data?.private === false && typeof data.full_name === "string" && data.full_name.toLowerCase() === `hxape/${name}`.toLowerCase() ? "public" : "unknown");
    }).catch(() => {
      this.#repositoryVisibility.set(name, "unknown");
    }).finally(() => {
      if (this.#footerRepository === repository)
        this.#updatePrivateLock(repository);
    });
  }
  #updatePrivateLock(repository) {
    if (!this.#githubLink)
      return;
    const name = repository?.dataset.repository;
    const privateRepository = Boolean(repository && !this.#librarySources.has(repository) && this.#policies.get(repository)?.private && (!name || this.#repositoryVisibility.get(name) !== "public"));
    const confirmed = privateRepository && Boolean(repository?.dataset.repository && this.#privateAccess?.confirmed(repository.dataset.repository));
    const privateTreeLoaded = Boolean(privateRepository && repository && name && this.#privateAccess?.active && !this.#blockedPrivate.has(name) && this.#repositoryCache.get(repository)?.data?.privateSource);
    if (!privateRepository) {
      showLock(this.#githubLink, { state: null });
      return;
    }
    const state = confirmed || this.#footerFileOpened || privateTreeLoaded ? "open" : "closed";
    const label = confirmed ? ui_strings_default.catalog.privateAccessConfirmed : this.#footerFileOpened ? ui_strings_default.catalog.privateContentOpened : privateTreeLoaded ? ui_strings_default.catalog.privateTreeLoaded : ui_strings_default.catalog.privateRepository;
    showLock(this.#githubLink, { state, description: label });
  }
  #canPreview(row) {
    return Boolean(this.#siteState === "ready" && row && (this.#docsNodes.has(row) || this.#rowNodes.get(row)?.type === "directory" || row.matches("summary") && row.parentElement?.matches("details[data-repository]")));
  }
  async#openPreview(row, initialMode = "documentation", applySourcePin = false) {
    if (!this.#connected() || !this.#canPreview(row) || !this.#options)
      return false;
    const target = this.#targetForRow(row);
    if (!target)
      return false;
    const pinnedFile = applySourcePin && this.#rowNodes.get(row)?.type === "file";
    if (target.origin.kind === "haxelib") {
      return this.#stageTreeNavigation(target.origin, target, null, null, true, false, { row, initialMode, defaultBranch: true, applySourcePin: pinnedFile });
    }
    return this.#options.panel.navigate(target, { initialMode, applySourcePin: pinnedFile });
  }
  #repositoryLevel(repository) {
    const level = this.#policies.get(repository)?.level || 0;
    if (this.#privateAccess?.active && !this.#librarySources.has(repository)) {
      if (this.#privateAccess.confirmed(repository.dataset.repository || ""))
        return 4;
      return this.#repositoryCache.get(repository)?.data?.privateSource ? 3 : Math.max(level, 3);
    }
    return level;
  }
  #unavailable(row) {
    const repository = row.parentElement;
    return row.matches("summary") && isDetails(repository) && repository.hasAttribute("data-repository") && (this.#siteState !== "ready" || this.#repositoryLevel(repository) === 0 && !repository.querySelector(":scope > .description.tree-content"));
  }
  #loadLibraryCatalogue(settings) {
    if (this.#libraryPromise)
      return this.#libraryPromise;
    const status = this.#libraryStatus;
    const libraryList = this.#libraryList;
    if (!status || !libraryList)
      return Promise.reject(new Error("The library catalogue is not initialized"));
    this.#libraryState = "loading";
    status.hidden = false;
    setLoading(status, ui_strings_default.catalog.loadingLibraries, true);
    this.#refreshTree();
    this.#libraryPromise = Promise.resolve().then(async () => {
      if (!isRecord(settings) || typeof settings.catalog !== "string") {
        throw new Error("Library catalogue is not configured");
      }
      const catalogueUrl = settings.catalog;
      const data = await withinRequestTime(async (signal) => {
        const response = await fetch(localResource(catalogueUrl), { credentials: "omit", cache: "no-cache", signal });
        if (!response.ok)
          throw new Error("Library catalogue request failed");
        return response.json();
      });
      if (!isRecord(data) || !Array.isArray(data.libraries))
        throw new Error("Invalid library catalogue");
      const names = new Set;
      const fields = ["name", "version", "url", "ref", "root", "documentsPath", "outline", "packagePath", "localPath"];
      const libraries = data.libraries.filter((entry) => {
        if (!isRecord(entry))
          throw new Error("Invalid library entry");
        const librarySettings = isRecord(settings.libraries) ? settings.libraries[String(entry.name)] : null;
        return !isRecord(librarySettings) || librarySettings.visible !== false;
      }).map((entry) => {
        if (!isRecord(entry))
          throw new Error("Invalid library entry");
        const installation = entry.installation;
        if (!fields.every((key) => typeof entry[key] === "string") || entry.dev !== undefined && typeof entry.dev !== "boolean" || !isRecord(installation) || typeof installation.source !== "string" || !["haxelib", "github", "unknown"].includes(installation.source) || installation.source === "github" && (typeof installation.refKind !== "string" || !["branch", "tag"].includes(installation.refKind) || typeof installation.ref !== "string" || !installation.ref || typeof installation.sha !== "string" || !/^[0-9a-f]{40}$/.test(installation.sha)) || typeof entry.name !== "string" || !entry.name || typeof entry.version !== "string" || !entry.version || typeof entry.ref !== "string" || !entry.ref || names.has(entry.name) || !materialPath(entry.localPath) || !entry.localPath.startsWith(".haxelib/"))
          throw new Error("Invalid library entry");
        names.add(entry.name);
        const library = entry;
        return { ...library, url: githubLocation(library.url).url, outline: localResource(library.outline) };
      }).sort((a, b) => a.name.localeCompare(b.name));
      libraryList.style.setProperty("--library-name-width", `${Math.max(0, ...libraries.map((library) => library.name.length)) + 2}ch`);
      const list = this.ownerDocument.createDocumentFragment();
      for (const library of libraries) {
        const entry = cloneBranch(this.ownerDocument);
        const repository = entry.firstElementChild;
        repository.dataset.repository = library.name;
        repository.dataset.library = library.name;
        repository.dataset.url = library.url;
        const row = repository.querySelector("summary");
        row.classList.add("repository-row");
        row.querySelector(".node-label").textContent = library.name;
        row.prepend(groupedIcon("repository", "repositories", this.#iconSettings));
        const source = versionSourceIcon(library.installation, this.ownerDocument);
        const installation = library.installation;
        const label = !source ? undefined : installation.source === "haxelib" ? formatText(ui_strings_default.catalog.installedHaxelib, { version: library.version }) : installation.source === "github" ? formatText(installation.refKind === "branch" ? ui_strings_default.catalog.installedGitHubBranch : ui_strings_default.catalog.installedGitHubTag, { version: library.version, ref: installation.ref }) : undefined;
        const installed = installedVersion(this.ownerDocument, {
          text: formatText(ui_strings_default.catalog.installedVersion, { version: library.version }),
          icon: source,
          label
        });
        row.append(installed);
        this.#librarySources.set(repository, library);
        this.#registerRepository(repository, {
          private: false,
          branch: "main",
          level: 4,
          documents: { README: true, CONTRIBUTING: true, AGENTS: true, LICENSE: true }
        });
        list.append(entry);
      }
      libraryList.replaceChildren(list);
      setStatus(status, libraries.length ? "" : ui_strings_default.catalog.noLibraries);
      status.hidden = libraries.length > 0;
      this.#libraryState = "ready";
      this.#refreshTree();
      this.refreshLinkMode();
    }).catch(() => {
      this.#libraryState = "error";
      const retry = treeRetry(status.ownerDocument, ui_strings_default.catalog.retry, "retry-libraries");
      setStatus(status, status.ownerDocument.createTextNode(ui_strings_default.catalog.librariesFailed), retry);
      this.#refreshTree();
    }).finally(() => {
      this.#libraryPromise = null;
    });
    return this.#libraryPromise;
  }
  #checkLibraryRelease(repository) {
    const library = this.#librarySources.get(repository);
    if (!library || this.#releaseKnown.has(repository) || this.#releasePending.has(repository))
      return;
    if (library.installation.source === "unknown") {
      this.#releaseKnown.add(repository);
      return;
    }
    const row = repository.querySelector(":scope > summary");
    const token = this.#beginRepositoryLoading(repository, "version", ui_strings_default.catalog.checkingVersion);
    const pending = import("./releases.mjs").then(async ({ publishedLibraryVersion, compareVersions }) => ({
      release: await publishedLibraryVersion(library),
      compareVersions
    })).then(({ release, compareVersions }) => {
      this.#releaseKnown.add(repository);
      if (!release || !repository.isConnected || this.#librarySources.get(repository) !== library)
        return;
      const order = compareVersions(library.version, release.version);
      if (order === null || order === 0)
        return;
      const label = formatText(release.source === "haxelib" ? ui_strings_default.catalog.publishedHaxelib : ui_strings_default.catalog.publishedGitHub, { version: release.displayVersion });
      const newer = order < 0;
      const checked = release.checkedAt ? formatText(ui_strings_default.catalog.publicationCheckedAt, { date: release.checkedAt.slice(0, 10) }) : "";
      const badge = publishedVersion(this.ownerDocument, {
        text: newer ? label : release.displayVersion,
        icon: versionSourceIcon({ source: release.source, refKind: release.refKind }, this.ownerDocument),
        newer,
        label: checked ? `${label}. ${checked}` : !newer ? label : undefined
      });
      row?.append(badge);
    }).catch(() => {}).finally(() => {
      this.#endRepositoryLoading(repository, "version", token);
      if (this.#releasePending.get(repository) === pending)
        this.#releasePending.delete(repository);
    });
    this.#releasePending.set(repository, pending);
  }
  #loadPublicDocuments(library, node, signal, ref, refresh) {
    const directory = node.type === "directory";
    const path = directory ? repositoryPath(library.root, node.path) : repositoryPath(library.documentsPath);
    const location2 = githubLocation(library.url);
    return (async () => {
      if (signal.aborted)
        throw signal.reason;
      async function listAt(path) {
        const entries = await githubJson(`${location2.api}/contents${path ? `/${encodedPath(path)}` : ""}?ref=${encodeURIComponent(ref)}`, signal);
        if (!Array.isArray(entries))
          throw new Error("Expected a GitHub directory");
        const files = [];
        for (const entry of entries) {
          if (!entry || typeof entry !== "object")
            throw new Error("Invalid GitHub entry");
          if (!("type" in entry) || entry.type !== "file")
            continue;
          if (!("name" in entry) || typeof entry.name !== "string" || !entry.name || !("path" in entry) || typeof entry.path !== "string" || !entry.path || !("download_url" in entry) || typeof entry.download_url !== "string" && entry.download_url !== null) {
            throw new Error("Invalid GitHub file");
          }
          const file = { type: "file", name: entry.name, path: entry.path, download_url: entry.download_url };
          if ("html_url" in entry && typeof entry.html_url === "string")
            file.html_url = entry.html_url;
          files.push(file);
        }
        return files;
      }
      const [entries, rootEntries] = await Promise.all([
        listAt(path),
        !directory && path ? listAt("") : Promise.resolve([])
      ]);
      if (signal.aborted)
        throw signal.reason;
      const files = new Map;
      for (const file of entries.filter((entry) => publicDocument(entry.name, directory)))
        files.set(file.path, file);
      for (const file of rootEntries.filter((entry) => legalDocument(entry.name) && !/\.hx$/i.test(entry.name))) {
        files.set(file.path, file);
      }
      const ordered = [...files.values()].sort((a, b) => documentPriority(a.name) - documentPriority(b.name) || a.path.localeCompare(b.path));
      const documents = await Promise.all(ordered.map(async (file) => {
        if (typeof file.download_url !== "string")
          throw new Error("Invalid GitHub document");
        const download = new URL(file.download_url);
        if (download.origin !== "https://raw.githubusercontent.com" || download.username || download.password) {
          throw new Error("Unexpected document host");
        }
        const content = await loadPublicDocument({ url: location2.url, ref, path: file.path }, signal, { refresh });
        const document2 = {
          name: file.name,
          path: file.path,
          format: /\.(md|markdown)$/i.test(file.name) ? "markdown" : "text",
          content
        };
        if (typeof file.html_url === "string" && file.html_url.startsWith(`${location2.url}/blob/`)) {
          document2.url = file.html_url;
        }
        return [file.path, document2];
      }));
      return {
        url: location2.url,
        ref,
        documents: Object.fromEntries(documents),
        order: ordered.map((file) => file.path)
      };
    })();
  }
  async#loadSite() {
    const status = this.#siteStatus;
    if (!status)
      return;
    this.#siteState = "loading";
    setLoading(status, ui_strings_default.catalog.loadingSettings);
    status.hidden = false;
    try {
      const settings = await withinRequestTime(async (signal) => {
        const response = await fetch("public/json/site.json", { signal, cache: "no-cache" });
        if (!response.ok)
          throw new Error("Settings request failed");
        return response.json();
      });
      if (!isRecord(settings) || typeof settings.organization !== "string" || !/^https:\/\/github\.com\/[a-z0-9-]+\/?$/i.test(settings.organization) || !isRecord(settings.repositories)) {
        throw new Error("Invalid site settings");
      }
      const defaults = readPolicy({ private: true, branch: "main", level: 0, documents: noDocuments }, settings.defaults);
      const entries = new Map(Object.entries(settings.repositories).map(([name, entry]) => [name, readPolicy(defaults, entry)]));
      if (settings.icons !== undefined && !isRecord(settings.icons)) {
        throw new Error("Invalid icon settings");
      }
      const rawIcons = isRecord(settings.icons) ? settings.icons : {};
      const icons = { ...this.#iconSettings };
      for (const name of Object.keys(icons)) {
        if (!Object.hasOwn(rawIcons, name))
          continue;
        const value = rawIcons[name];
        if (typeof value !== "boolean")
          throw new Error("Invalid icon settings");
        icons[name] = value;
      }
      this.#organization = settings.organization.replace(/\/$/, "");
      Object.assign(this.#iconSettings, icons);
      for (const repository of this.#repositories) {
        const name = repository.dataset.repository;
        const policy = entries.get(name) || defaults;
        this.#policies.set(repository, policy);
        repository.dataset.level = String(this.#repositoryLevel(repository));
        repository.dataset.url = `${this.#organization}/${encodeURIComponent(name)}`;
        const row = repository.querySelector(":scope > summary");
        row.removeAttribute("aria-disabled");
        row.setAttribute("aria-haspopup", "dialog");
        row.querySelector(':scope > [data-icon-group="repositories"]')?.remove();
        row.insertBefore(groupedIcon("repository", "repositories", this.#iconSettings), row.querySelector(".node-label"));
      }
      setStatus(status);
      status.hidden = true;
      this.#siteState = "ready";
      this.#librarySettings = settings.haxelib || null;
      this.setIcons(this.#iconSettings);
      this.#emitIcons();
      this.#updateLink(this.#selected);
      this.refreshLinkMode();
      if (this.#connected())
        this.#loadLibraryCatalogue(this.#librarySettings);
    } catch {
      this.#siteState = "error";
      this.#repositories.forEach((repository) => {
        this.#policies.set(repository, { private: true, branch: "main", level: 0, documents: noDocuments });
        repository.dataset.level = "0";
        repository.open = false;
        repository.querySelector("summary")?.setAttribute("aria-disabled", "true");
      });
      const retry = treeRetry(status.ownerDocument, ui_strings_default.catalog.retry, "retry-site");
      setStatus(status, status.ownerDocument.createTextNode(ui_strings_default.catalog.settingsFailed), retry);
      status.hidden = false;
      this.#sitePromise = null;
    }
  }
  #loadRepository(repository) {
    if (this.#siteState !== "ready")
      return Promise.reject(new Error("Site settings are unavailable"));
    const state = this.#repositoryCache.get(repository);
    const policy = this.#policies.get(repository);
    const name = repository.dataset.repository;
    if (!state || !policy || !name)
      return Promise.reject(new Error("Repository is not registered"));
    if (state.data)
      return Promise.resolve(state.data);
    if (state.promise)
      return state.promise;
    repository.dataset.loading = "true";
    const revision = this.#accessRevision;
    const pending = Promise.resolve().then(async () => {
      const library = this.#librarySources.get(repository);
      if (library)
        this.#checkLibraryRelease(repository);
      const response = await withinRequestTime(async (signal) => {
        const result = await fetch(library ? library.outline : `public/json/repositories/${encodeURIComponent(name)}.json`, { credentials: library ? "omit" : "same-origin", cache: "no-cache", signal });
        return { status: result.status, data: result.ok ? await result.json() : null };
      });
      let data = response.data;
      if (!data && (library || response.status !== 404 || !this.#privateAccess?.active || this.#blockedPrivate.has(name)))
        throw new Error("Repository request failed");
      let privateSource = false;
      if (!data && this.#privateAccess) {
        data = await this.#privateAccess.snapshot(name, false, policy.branch);
        privateSource = true;
      }
      if (revision !== this.#accessRevision)
        throw new Error("Repository access changed");
      const snapshot = this.#readSnapshot(repository, data, policy, library, privateSource);
      if (revision !== this.#accessRevision)
        throw new Error("Repository access changed");
      state.data = snapshot;
      repository.dataset.url = snapshot.url;
      if (!library && !privateSource && this.#privateAccess?.active && !this.#blockedPrivate.has(name)) {
        this.#upgradePrivate(repository, revision);
      }
      return snapshot;
    }).finally(() => {
      if (state.promise === pending) {
        state.promise = null;
        delete repository.dataset.loading;
      }
    });
    state.promise = pending;
    return pending;
  }
  #readSnapshot(repository, data, policy, library, privateSource) {
    return readSnapshot(repository.dataset.repository || "", repository.dataset.url || "", data, policy, library, privateSource);
  }
  async retryPrivate(name) {
    const revision = this.#accessRevision;
    const repository = this.#repositories.find((item) => item.dataset.repository === name);
    if (!repository || !this.#privateAccess?.active)
      return false;
    const pending = this.#repositoryCache.get(repository)?.privatePromise;
    if (pending)
      await pending;
    if (revision !== this.#accessRevision || !this.#privateAccess?.active)
      return false;
    this.#blockedPrivate.delete(name);
    return this.#upgradePrivate(repository, revision, false, true);
  }
  async#upgradePrivate(repository, revision, cachedOnly = false, force = false) {
    const state = this.#repositoryCache.get(repository);
    const policy = this.#policies.get(repository);
    const name = repository.dataset.repository;
    if (!state || !policy || !name || state.privatePromise || !this.#privateAccess?.active || this.#blockedPrivate.has(name))
      return false;
    const pending = (force ? this.#privateAccess.refresh(name, policy.branch) : this.#privateAccess.snapshot(name, cachedOnly, policy.branch)).then((data) => {
      if (revision !== this.#accessRevision || this.#blockedPrivate.has(name))
        return false;
      const snapshot = this.#readSnapshot(repository, data, policy, undefined, true);
      if (this.#preparing.has(repository)) {
        state.data = snapshot;
        state.rendered = false;
        return true;
      }
      if (this.#selected && repository.contains(this.#selected) && this.#selected !== repository.querySelector(":scope > summary")) {
        this.#selected.classList.remove("is-selected");
        this.#selected = repository.querySelector(":scope > summary");
        this.#selected?.classList.add("is-selected");
      }
      this.#options?.panel.forgetDetachedRows(repository);
      state.data = snapshot;
      state.rendered = false;
      repository.dataset.level = String(this.#repositoryLevel(repository));
      repository.dataset.url = snapshot.url;
      setStatus(state.notice);
      state.notice.remove();
      this.#renderRepositoryTree(repository, snapshot);
      this.#showFreshness(repository, this.#privateAccess?.freshness(name) || "current");
      this.#updateLink(this.#selected);
      return true;
    }).catch((error) => {
      if (revision !== this.#accessRevision)
        return false;
      setStatus(state.notice, this.#privateAccess?.failure(name) || (error instanceof Error ? error.message : ui_strings_default.catalog.privateUpdateFailed));
      if (repository.open)
        repository.insertBefore(state.notice, repository.querySelector(":scope > .tree-list"));
      this.#refreshTree();
      return false;
    }).finally(() => {
      if (state.privatePromise === pending)
        state.privatePromise = null;
    });
    state.privatePromise = pending;
    return pending;
  }
  #renderRepositoryTree(repository, snapshot, preserveView = false) {
    const state = this.#repositoryCache.get(repository);
    if (!state || state.rendered || state.data !== snapshot || this.#repositoryLevel(repository) === 0)
      return;
    const { list, rows } = renderNodes(snapshot.children, snapshot, readCaptions(repository), this.#iconSettings, this.ownerDocument);
    for (const { row, node, link, docs } of rows) {
      this.#rowNodes.set(row, node);
      this.#rowSnapshots.set(row, snapshot);
      this.#nodeLinks.set(row, link);
      if (docs)
        this.#docsNodes.set(row, node);
    }
    const previous = repository.querySelector(":scope > .tree-list");
    const expansion = this.#captureBranchExpansion(previous);
    if (previous) {
      if (this.#selected && previous.contains(this.#selected)) {
        this.#selected.classList.remove("is-selected");
        this.#selected = repository.querySelector(":scope > summary");
        this.#selected?.classList.add("is-selected");
      }
      if (!preserveView)
        this.#options?.panel.forgetDetachedRows(repository);
      previous.remove();
    }
    this.#restoreBranchExpansion(list, expansion);
    if (list.childElementCount)
      repository.append(list);
    if (!state.notice.hasAttribute("data-loading") && statusBody(state.notice).hasChildNodes()) {
      repository.insertBefore(state.notice, repository.querySelector(":scope > .tree-list"));
    } else {
      state.notice.remove();
      setStatus(state.notice);
    }
    state.rendered = true;
    repository.dataset.loaded = "true";
    this.#refreshTree();
    this.refreshLinkMode();
    if (snapshot.privateSource) {
      this.#showFreshness(repository, this.#privateAccess?.freshness(repository.dataset.repository || "") || "current");
    }
    if (repository.contains(this.#selected) && this.#footerContext === this.#selected)
      this.#updateLink(this.#selected);
  }
  #registerRepository(repository, policy = { private: true, branch: "main", level: 0, documents: noDocuments }) {
    if (this.#repositoryCache.has(repository))
      return;
    this.#policies.set(repository, policy);
    repository.dataset.level = String(this.#repositoryLevel(repository));
    repository.open = false;
    const row = repository.querySelector(":scope > summary");
    if (!row)
      throw new Error("Repository summary is missing");
    if (this.#siteState === "ready")
      row.setAttribute("aria-haspopup", "dialog");
    else
      row.setAttribute("aria-disabled", "true");
    [...repository.children].filter((child) => child !== row && !child.matches(`p.description.tree-content, ${captionTemplateSelector}`)).forEach((child) => child.remove());
    const notice = element("p", "description label-row muted nonselectable");
    notice.setAttribute("role", "status");
    this.#repositoryCache.set(repository, {
      data: null,
      promise: null,
      privatePromise: null,
      rendered: false,
      presenting: false,
      notice
    });
  }
  async#ensureRepository(repository) {
    const state = this.#repositoryCache.get(repository);
    if (!state)
      return;
    if (this.#siteState !== "ready" || this.#repositoryLevel(repository) === 0) {
      if (this.#siteState !== "ready" || !repository.querySelector(":scope > .description.tree-content")) {
        repository.open = false;
      }
      return;
    }
    if (!this.#connected() || !repository.open || state.rendered || state.presenting)
      return;
    state.presenting = true;
    const revision = this.#accessRevision;
    const { notice } = state;
    const token = this.#beginRepositoryLoading(repository, "outline", ui_strings_default.catalog.loading);
    setStatus(notice);
    notice.remove();
    repository.setAttribute("aria-busy", "true");
    this.#refreshTree();
    try {
      const snapshot = await this.#loadRepository(repository);
      if (revision !== this.#accessRevision || this.#repositoryLoading.get(repository)?.get("outline")?.token !== token)
        return;
      if (this.#connected() && repository.open && !this.#preparing.has(repository)) {
        this.#renderRepositoryTree(repository, snapshot);
      } else {
        notice.remove();
        setStatus(notice);
      }
    } catch {
      if (revision !== this.#accessRevision || this.#repositoryLoading.get(repository)?.get("outline")?.token !== token)
        return;
      setStatus(notice, this.#privateAccess?.failure(repository.dataset.repository || "") || ui_strings_default.catalog.repositoryFailed);
      if (repository.open)
        repository.insertBefore(notice, repository.querySelector(":scope > .tree-list"));
      if (this.#connected())
        this.#refreshTree();
    } finally {
      const current = this.#repositoryLoading.get(repository)?.get("outline")?.token === token;
      this.#endRepositoryLoading(repository, "outline", token);
      if (revision === this.#accessRevision && current) {
        state.presenting = false;
        repository.removeAttribute("aria-busy");
      }
    }
  }
  #cancelPress() {
    if (this.#press) {
      this.#display?.clearTimeout(this.#press.timer);
      this.#press.row.removeAttribute("data-hold-ready");
    }
    this.#press = null;
  }
  #cancelInformationKey() {
    if (!this.#informationKeyHold)
      return;
    this.#informationKeyHold = null;
    this.#options?.panel.cancelPiPHold();
  }
  #cancelGesture() {
    if (this.#press)
      this.#suppressReleaseClick = true;
    this.#cancelPress();
    this.#cancelInformationKey();
  }
  #onHoldFocusOut(event) {
    const next = event.relatedTarget;
    if (this.#press && (!isElement(next) || !this.#press.row.contains(next))) {
      this.#suppressReleaseClick = true;
      this.#cancelPress();
    }
    const hold = this.#informationKeyHold;
    if (hold && next !== hold.row && (!isElement(next) || !this.#options?.panel.contains(next)))
      this.#cancelInformationKey();
  }
  #onInformationKeyUp(event) {
    if (event.code !== "KeyE" || !this.#informationKeyHold)
      return;
    this.#informationKeyHold = null;
    if (isCommandKey(event, "KeyE")) {
      if (this.#options?.panel.finishPiPHold())
        event.preventDefault();
    } else
      this.#options?.panel.cancelPiPHold();
  }
  #onToggle(event) {
    this.#schedulePrefixes();
    if (isDetails(event.target)) {
      const branch = event.target;
      if (this.#historyToggles.get(branch) !== branch.open) {
        this.#temporaryHistoryBranches.delete(branch);
        this.#temporarySearchBranches.delete(branch);
      }
      this.#historyToggles.delete(branch);
      if (this.#repositoryCache.has(branch)) {
        if (branch.open)
          this.#checkLibraryRelease(branch);
        this.#ensureRepository(branch);
      }
    }
  }
  #onFocus(event) {
    if (this.#moving)
      return;
    if (isElement(event.target) && event.target.closest(".description a, .catalog-caption a"))
      return;
    const row = eventRow(event);
    if (!row)
      return;
    this.#selected?.classList.remove("is-selected");
    this.#selected = row;
    this.#selected.classList.add("is-selected");
    this.#updateLink(row);
  }
  #onViewOpen(event) {
    const { token, target } = event.detail;
    if (!this.contains(token))
      return;
    if (!target) {
      this.#updateLink(token);
      return;
    }
    this.#footerTarget = readMaterialTarget(target);
    const repository = token.closest("details[data-repository]");
    this.#setFooter(githubHref(target), repository, token, target.kind === "repository" ? target.origin.id : target.kind === "directory" ? target.readmePath || target.path : target.path);
  }
  #onDocumentSelect(event) {
    const { token, context, source, document: document2, target } = event.detail;
    if (!this.contains(token))
      return;
    const url = document2.url || `${source.url}/blob/${encodeURIComponent(source.ref)}/${encodedPath(document2.path)}`;
    const repository = token.closest("details[data-repository]");
    const root = repository && (this.#librarySources.get(repository)?.root ?? this.#repositoryCache.get(repository)?.data?.root);
    const path = root && document2.path.startsWith(`${root}/`) ? document2.path.slice(root.length + 1) : document2.path;
    this.#footerTarget = target ? readMaterialTarget(target) : readMaterialTarget({
      kind: "document",
      origin: repository ? this.#origin(repository) : null,
      ref: source.ref,
      path: document2.path,
      format: /\.(?:md|markdown)$/i.test(document2.path) ? "markdown" : "text",
      anchor: null
    });
    this.#setFooter(url, repository, context, path, true);
  }
  #onViewClose(event) {
    const { token, restore } = event.detail;
    if (!this.contains(token))
      return;
    const history = this.#historyPath !== null;
    this.#clearHistoryPath();
    if (restore) {
      if (history) {
        let row = token;
        for (let parent = token.closest("details");parent && this.contains(parent); parent = parent.parentElement?.closest("details") || null) {
          const summary = parent.querySelector(":scope > summary");
          if (!parent.open && summary !== token && isHTMLElement(summary))
            row = summary;
        }
        row.focus({ preventScroll: true });
        row.scrollIntoView({ block: "nearest", inline: "nearest" });
        this.#updateLink(row);
        this.#refreshTree();
        return;
      }
      const container = token.matches("summary") ? token.parentElement : token;
      for (let parent = container?.parentElement?.closest("details");parent && this.contains(parent); parent = parent.parentElement?.closest("details"))
        parent.open = true;
      token.focus({ preventScroll: true });
      token.scrollIntoView({ block: "nearest", inline: "nearest" });
      this.#updateLink(token);
    } else
      this.#updateLink(this.#selected);
  }
  #onPointerDown(event) {
    if (!event.isPrimary || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const link = isElement(event.target) ? event.target.closest(".description a, .catalog-caption a") : null;
    const row = isHTMLElement(link) ? link : eventRow(event);
    const raw = isHTMLElement(link) ? link.dataset.originalHref || link.getAttribute("href") || "" : null;
    if (!row || (raw !== null ? !this.canRouteLink(raw, null) : !this.#canPreview(row)))
      return;
    if (raw === null)
      row.focus({ preventScroll: true });
    const pending = {
      row,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: this.scrollLeft,
      top: this.scrollTop,
      raw,
      armed: false
    };
    pending.timer = displayWindow(this).setTimeout(() => {
      if (this.#press !== pending)
        return;
      if (!row.isConnected || !this.contains(row) || this.scrollLeft !== pending.left || this.scrollTop !== pending.top) {
        this.#cancelGesture();
        return;
      }
      pending.armed = true;
      row.setAttribute("data-hold-ready", "");
      this.#suppressReleaseClick = true;
    }, this.#holdDuration);
    this.#press = pending;
  }
  #onPointerUp(event) {
    const pending = this.#press;
    if (!pending || event.pointerId !== pending.pointerId)
      return;
    if (!pending.row.isConnected || !this.contains(pending.row) || !this.#connected() || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 8 || this.scrollLeft !== pending.left || this.scrollTop !== pending.top) {
      this.#cancelGesture();
      return;
    }
    this.#cancelPress();
    if (!pending.armed)
      return;
    this.#suppressReleaseClick = true;
    if (pending.raw !== null)
      this.followLink(pending.raw, null, true);
    else
      this.#openPreview(pending.row, "documentation", true);
  }
  #onPointerMove(event) {
    if (this.#press && event.pointerId === this.#press.pointerId && Math.hypot(event.clientX - this.#press.x, event.clientY - this.#press.y) > 8) {
      this.#cancelGesture();
    }
  }
  #onTouchStart(event) {
    if (!this.#display?.matchMedia("(max-width: 760px)").matches)
      return;
    if (event.touches.length !== 1) {
      this.#touchScroll = null;
      this.#cancelGesture();
      return;
    }
    const touch = event.touches[0];
    this.#touchScroll = {
      id: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
      left: this.scrollLeft,
      top: this.scrollTop,
      axis: this.#lockedScrollAxis
    };
  }
  #onTouchMove(event) {
    const gesture = this.#touchScroll;
    if (!gesture)
      return;
    if (event.touches.length !== 1) {
      this.#touchScroll = null;
      this.#cancelGesture();
      return;
    }
    const touch = event.touches[0];
    if (touch.identifier !== gesture.id)
      return;
    const dx = touch.clientX - gesture.x;
    const dy = touch.clientY - gesture.y;
    if (!gesture.axis && this.scrollTop !== gesture.top)
      gesture.axis = "y";
    if (!gesture.axis && Math.hypot(dx, dy) > 8)
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (gesture.axis)
      this.#cancelGesture();
    if (gesture.axis !== "x")
      return;
    event.preventDefault();
    this.scrollLeft = gesture.left - dx;
    this.#suppressReleaseClick = true;
    this.#cancelPress();
  }
  #endTouchScroll(event) {
    const gesture = this.#touchScroll;
    if (!gesture || ![...event.changedTouches].some((touch) => touch.identifier === gesture.id))
      return;
    if (gesture.axis === "y" && this.scrollTop !== gesture.top) {
      this.#lockedScrollAxis = "y";
      if (!this.#supportsScrollEnd())
        this.#onLegacyScroll();
    }
    this.#touchScroll = null;
  }
  #supportsScrollEnd() {
    return "onscrollend" in this;
  }
  #onScrollEnd(event) {
    if (event.target === this)
      this.#lockedScrollAxis = null;
  }
  #onLegacyScroll() {
    if (!this.#lockedScrollAxis)
      return;
    this.#display?.clearTimeout(this.#scrollEndTimer);
    this.#scrollEndTimer = this.#display?.setTimeout(() => {
      this.#lockedScrollAxis = null;
      this.#scrollEndTimer = 0;
    }, 100) || 0;
  }
  #onClick(event) {
    const link = isElement(event.target) ? event.target.closest(".description a, .catalog-caption a") : null;
    const row = link ? null : eventRow(event);
    if (row?.matches("summary") && isDetails(row.parentElement) && !this.#unavailable(row)) {
      this.#temporaryHistoryBranches.delete(row.parentElement);
      this.#temporarySearchBranches.delete(row.parentElement);
      this.#historyToggles.delete(row.parentElement);
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (link) {
      const element = link;
      const raw = element.dataset.originalHref || element.getAttribute("href") || "";
      if (this.canRouteLink(raw, null)) {
        event.preventDefault();
        this.followLink(raw, null);
      }
      return;
    }
    if (isElement(event.target) && event.target.closest('[data-action="retry-site"]')) {
      if (this.#siteState === "error" && !this.#sitePromise)
        this.#sitePromise = this.#loadSite();
      return;
    }
    if (isElement(event.target) && event.target.closest('[data-action="retry-libraries"]')) {
      this.#loadLibraryCatalogue(this.#librarySettings);
      return;
    }
    row?.focus({ preventScroll: true });
    if (row && this.#unavailable(row)) {
      event.preventDefault();
      flashUnavailable(row, unavailableLock);
    }
  }
  #keepsArrowInput(event) {
    const panel = this.#options?.panel;
    const focused = this.ownerDocument.activeElement;
    if (focused && panel?.contains(focused))
      return true;
    const path = event.composedPath();
    for (let active = focused;active; active = active.shadowRoot?.activeElement || null)
      path.push(active);
    for (const target of path) {
      if (target === panel)
        return true;
      if (!isElement(target))
        continue;
      if (target.closest("form, input, textarea, select") || isHTMLElement(target) && target.isContentEditable) {
        return true;
      }
    }
    const selection = this.ownerDocument.getSelection();
    return Boolean(selection && !selection.isCollapsed && selection.toString().length);
  }
  #onKeydown(event) {
    if (this.#press)
      this.#cancelGesture();
    if (event.code !== "KeyE")
      this.#cancelInformationKey();
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (isElement(event.target) && event.target.closest(".catalog-caption a"))
      return;
    if (event.code === "KeyE") {
      const panel = this.#options?.panel;
      if (!panel || !isCommandKey(event, "KeyE") || this.#keepsArrowInput(event))
        return;
      const row = this.#selected;
      if (row && this.#canPreview(row)) {
        event.preventDefault();
        const hold = { row };
        this.#informationKeyHold = hold;
        this.#openPreview(row).then((opened) => {
          if (opened && this.#informationKeyHold === hold && panel.isOpen)
            panel.beginPiPHold(row);
        });
      }
      return;
    }
    const key = navigationKeys[event.code] || event.key;
    const arrow = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key);
    if (!arrow) {
      const row = eventRow(event);
      if (!row || !this.contains(row))
        return;
      if (event.key === "Enter" && this.#canPreview(row)) {
        event.preventDefault();
        this.#openPreview(row, "documentation", true);
      } else if (this.#unavailable(row) && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        flashUnavailable(row, unavailableLock);
      }
      return;
    }
    if (this.#keepsArrowInput(event))
      return;
    const row = this.#selected;
    if (!row)
      return;
    event.preventDefault();
    row.focus({ preventScroll: true });
    const rows = [...visibleTreeContent(this.#treeList)].filter((item) => item.classList.contains("tree-row"));
    const index = rows.indexOf(row);
    const directory = row.matches("summary") && isDetails(row.parentElement) ? row.parentElement : null;
    let next = row;
    if (key === "ArrowDown")
      next = rows[index + 1] || row;
    if (key === "ArrowUp")
      next = rows[index - 1] || row;
    if (key === "ArrowRight") {
      const repository = directory?.matches("[data-repository]");
      const pending = directory !== null && repository && this.#repositoryLevel(directory) > 0 && !directory.dataset.loaded;
      if (repository && this.#siteState === "loading")
        return;
      const node = this.#docsNodes.get(row);
      const parent = row.closest("details[data-repository]");
      if (!directory && node?.type === "symbol" && !node.children.length && parent && this.#repositoryLevel(parent) === 4) {
        this.#openPreview(row, "source");
        return;
      }
      if (this.#unavailable(row))
        flashUnavailable(row, unavailableLock);
      else if (!directory) {
        if (node?.type !== "symbol")
          flashUnavailable(row, unavailableLock);
      } else if (!directory.open) {
        if (pending || directory.querySelector(":scope > .tree-list > li, :scope > .description")) {
          this.#temporaryHistoryBranches.delete(directory);
          this.#temporarySearchBranches.delete(directory);
          this.#historyToggles.delete(directory);
          directory.open = true;
        } else
          flashUnavailable(row, unavailableLock);
      } else if (directory.contains(rows[index + 1]))
        next = rows[index + 1];
      else if (!pending)
        flashUnavailable(row, unavailableLock);
    }
    if (key === "ArrowLeft") {
      if (directory?.open) {
        this.#temporaryHistoryBranches.delete(directory);
        this.#temporarySearchBranches.delete(directory);
        this.#historyToggles.delete(directory);
        directory.open = false;
      } else
        next = (directory || row).parentElement?.closest("details")?.querySelector("summary") || row;
    }
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  connectedCallback() {
    this.connect();
  }
  disconnectedCallback() {
    this.disconnect();
  }
}
customElements.define("project-catalog", ProjectCatalog);

// src/bloc/document/index.mjs
import { html as html10, nothing as nothing11, render as render9 } from "lit";
// src/common/ui/json/interaction.json
var interaction_default = {
  motion: {
    duration: 180,
    easing: "cubic-bezier(.2,.7,.2,1)"
  },
  tooltip: {
    desktopMedia: "(hover: hover) and (pointer: fine)",
    delay: 420,
    viewportPadding: 8,
    targetGap: 8,
    alternateGap: 10
  }
};

// src/common/ui/motion.mjs
function createMotion(view = window) {
  const running = new Map;
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  function cancel(key) {
    const entry = running.get(key);
    if (!entry)
      return;
    running.delete(key);
    entry.animation.onfinish = entry.animation.oncancel = null;
    entry.animation.cancel();
  }
  function finish(key) {
    const entry = running.get(key);
    if (!entry)
      return;
    cancel(key);
    entry.finish?.();
  }
  function finishAll() {
    [...running.keys()].forEach(finish);
  }
  function play(target, frames, { key = target, finish: done } = {}) {
    cancel(key);
    if (reduced.matches || !target.animate) {
      done?.();
      return;
    }
    const animation = target.animate(frames, {
      duration: interaction_default.motion.duration,
      easing: interaction_default.motion.easing
    });
    const entry = { animation, finish: done };
    running.set(key, entry);
    animation.onfinish = () => {
      if (running.get(key) === entry)
        finish(key);
    };
    animation.oncancel = () => {
      if (running.get(key) === entry)
        running.delete(key);
    };
  }
  const change = () => {
    if (reduced.matches)
      finishAll();
  };
  reduced.addEventListener("change", change);
  return {
    play,
    cancel,
    finish,
    finishAll,
    dispose() {
      reduced.removeEventListener("change", change);
      [...running.keys()].forEach(cancel);
    }
  };
}

// src/component/bookmark-group-control/index.mjs
import { nothing as nothing3 } from "lit";
function renderBookmarkGroupControl(values, labels, actions, icons) {
  const current = values.groups.find((group) => group.id === values.currentGroup);
  const select = (event) => actions.selectGroup(event.currentTarget.value);
  const name = (form) => form?.querySelector("input")?.value || "";
  const apply = (event) => {
    event.preventDefault();
    const draft = name(event.currentTarget);
    if (values.nameMode === "create")
      actions.createGroup(draft);
    else if (values.nameMode === "rename")
      actions.renameGroup(values.currentGroup, draft);
  };
  return screenTemplate("bookmarks", "bookmark-group-control.bookmarkGroupControl", {
    selectLabel: labels.select,
    hidden: Boolean(values.nameMode),
    currentGroup: values.currentGroup,
    onChange: select,
    groupsContent: values.groups.map((group) => screenTemplate("bookmarks", "bookmark-group-control.option", {
      id: group.id,
      selected: group.id === values.currentGroup,
      name: group.name
    })),
    exportLabel: labels.export,
    onExportGroup: actions.exportGroup,
    exportIcon: icons.export,
    importLabel: labels.import,
    onImportGroup: actions.importGroup,
    importIcon: icons.import,
    nameModeContent: values.nameMode ? screenTemplate("bookmarks", "bookmark-group-control.bookmarkGroupForm", {
      ariaLabel: values.nameMode === "create" ? labels.create : labels.rename,
      onSubmit: apply,
      nameLabel: labels.name,
      value: values.nameMode === "create" ? "" : current?.name || "",
      nameModeContent: values.nameMode === "create" ? icons.create : icons.rename,
      cancelLabel: labels.cancel,
      onCancelGroupName: actions.cancelGroupName,
      cancelIcon: icons.cancel
    }) : nothing3,
    confirmDeleteContent: values.confirmDelete ? screenTemplate("bookmarks", "bookmark-group-control.confirm", {
      confirmDeleteLabel: labels.confirmDelete,
      onConfirmDeleteGroup: () => actions.confirmDeleteGroup(values.currentGroup),
      confirmLabel: labels.confirm,
      onCancelDeleteGroup: actions.cancelDeleteGroup,
      cancelLabel: labels.cancel
    }) : nothing3
  });
}

// src/component/navigation-collection/index.mjs
import { nothing as nothing4, render as render4 } from "lit";
function entry(row, labels, actions, icons, groups = null, screen = "bookmarks") {
  const hasIcons = Boolean(row.repositoryIcon || row.detailIcon);
  const name = `${row.name} · ${row.repository} · ${row.kind}${row.path ? ` · ${row.path}` : ""}`;
  const assign = (event) => actions.assignGroup?.(row.id, event.currentTarget.value);
  return screenTemplate(screen, "navigation-collection.entry", {
    id: row.id,
    ariaCurrent: row.active ? "true" : nothing4,
    reorderLabel: labels.reorder,
    ariaLabel: hasIcons ? name : nothing4,
    onOpen: () => actions.open(row.id),
    name: row.name,
    content: hasIcons ? screenTemplate(screen, "navigation-collection.detailsWithIcons", {
      repositoryIconContent: row.repositoryIcon || nothing4,
      repository: row.repository,
      pathContent: row.path ? screenTemplate(screen, "navigation-collection.pathDetail", {
        detailIconContent: row.detailIcon || nothing4,
        path: row.path
      }) : nothing4
    }) : screenTemplate(screen, "navigation-collection.detailsText", {
      repository: row.repository,
      kind: row.kind,
      pathContent: row.path ? ` · ${row.path}` : ""
    }),
    content2: actions.bookmark ? screenTemplate(screen, "navigation-collection.bookmark", {
      ariaPressed: String(row.bookmarked),
      ariaLabel: row.bookmarked ? labels.removeBookmark : labels.addBookmark,
      onBookmark: () => actions.bookmark?.(row.id),
      bookmarkedContent: row.bookmarked ? icons.bookmarked : icons.bookmark,
      bookmarkRemoveIcon: icons.bookmarkRemove
    }) : nothing4,
    pendingRemoveContent: row.pendingRemove && actions.undo ? row.removeSeconds !== undefined ? screenTemplate(screen, "navigation-collection.pendingBookmarkRemoval", {
      undoLabel: labels.undo || "",
      onUndo: () => actions.undo?.(row.id),
      removeIcon: icons.remove,
      removeSeconds: row.removeSeconds
    }) : screenTemplate(screen, "navigation-collection.undoHistory", {
      undoLabel: labels.undo || "",
      onUndo: () => actions.undo?.(row.id),
      undoLabel2: labels.undo
    }) : groups?.moveMode && groups.groups.length > 1 && actions.assignGroup ? screenTemplate(screen, "navigation-collection.groupAssignment", {
      bookmarkGroupsLabel: labels.bookmarkGroups?.assign || "",
      assignIcon: icons.assign || nothing4,
      value: row.groupId || "",
      onChange: assign,
      items: groups.groups.map((group) => screenTemplate(screen, "navigation-collection.groupOption", {
        id: group.id,
        selected: group.id === row.groupId,
        name: group.name
      }))
    }) : screenTemplate(screen, "navigation-collection.remove", {
      removeLabel: labels.remove,
      onRemove: () => actions.remove(row.id),
      removeIcon: icons.remove
    })
  });
}
function tree(rows, labels, actions, icons, groups) {
  const screen = "bookmarks";
  const root = { name: "", groups: new Map, rows: [] };
  for (const row of rows) {
    const path = row.path.split("#")[0].split("/").filter(Boolean);
    const parts = [row.repository, ...path.slice(0, -1)];
    let parent = root;
    for (const name of parts) {
      let child = parent.groups.get(name);
      if (!child) {
        child = { name, groups: new Map, rows: [] };
        parent.groups.set(name, child);
      }
      parent = child;
    }
    parent.rows.push(row);
  }
  const branch = (group) => screenTemplate(screen, "navigation-collection.bookmarkTree", {
    entries: [...group.groups.values()].map((child) => screenTemplate(screen, "navigation-collection.bookmarkBranch", {
      name: child.name,
      content: branch(child)
    })),
    rowsContent: group.rows.map((row) => entry(row, labels, actions, icons, groups))
  });
  return branch(root);
}
function historyTree(rows, labels, actions, icons) {
  const screen = "history";
  const repositories = new Map;
  for (const row of rows) {
    let repository = repositories.get(row.repository);
    if (!repository) {
      repository = { name: row.repository, icon: row.repositoryIcon?.cloneNode(true) || null, refs: new Map };
      repositories.set(row.repository, repository);
    }
    const refName = row.ref || "";
    let ref = repository.refs.get(refName);
    if (!ref) {
      ref = { name: refName, files: new Map };
      repository.refs.set(refName, ref);
    }
    const key = row.fileKey || row.id;
    let file = ref.files.get(key);
    if (!file) {
      file = { key, name: row.fileName || row.name, icon: row.fileIcon?.cloneNode(true) || null, rows: [] };
      ref.files.set(key, file);
    }
    file.rows.push(row);
  }
  const files = (ref) => screenTemplate(screen, "navigation-collection.historyFiles", {
    entries: [...ref.files.values()].map((file) => screenTemplate(screen, "navigation-collection.historyFile", {
      key: file.key,
      iconContent: file.icon || nothing4,
      name: file.name,
      rowsContent: file.rows.length,
      rowsContent2: file.rows.map((row) => entry(row, labels, actions, icons, null, "history"))
    }))
  });
  return screenTemplate(screen, "navigation-collection.historyRepositories", {
    items: [...repositories.values()].map((repository) => screenTemplate(screen, "navigation-collection.historyRepository", {
      iconContent: repository.icon || nothing4,
      name: repository.name,
      items: [...repository.refs.values()].map((ref) => ref.name ? screenTemplate(screen, "navigation-collection.historyRef", {
        name: ref.name,
        content: files(ref)
      }) : files(ref))
    }))
  });
}
function renderCollection(container, {
  rows,
  labels,
  icons,
  tree: asTree,
  controls,
  controlsOpen,
  historyControls,
  historyGroups,
  bookmarkGroups,
  transfer
}, actions) {
  const screen = historyGroups ? "history" : "bookmarks";
  render4(screenTemplate(screen, "navigation-collection.page", {
    titleLabel: labels.title,
    groupActions: !transfer && bookmarkGroups && labels.bookmarkGroups && icons.groups && actions.editGroupName ? screenTemplate(screen, "navigation-collection.groupActions", {
      bookmarkGroupsLabel: labels.bookmarkGroups.create,
      ariaExpanded: String(bookmarkGroups.nameMode === "create"),
      onEditGroupName: () => actions.editGroupName?.("create"),
      groupsIcon: icons.groups.create,
      bookmarkGroupsLabel2: labels.bookmarkGroups.rename,
      ariaExpanded2: String(bookmarkGroups.nameMode === "rename"),
      onEditGroupName2: () => actions.editGroupName?.("rename"),
      groupsIcon2: icons.groups.rename,
      bookmarkGroupsLabel3: labels.bookmarkGroups.delete,
      disabled: !bookmarkGroups.canDeleteGroup,
      onDeleteGroup: () => actions.deleteGroup?.(bookmarkGroups.currentGroup),
      groupsIcon3: icons.groups.remove
    }) : nothing4,
    toggleControls: !transfer && controls && actions.toggleControls ? screenTemplate(screen, "navigation-collection.controlsToggle", {
      toggleControlsLabel: labels.toggleControls || "",
      ariaExpanded: String(controlsOpen !== false),
      onToggleControls: actions.toggleControls,
      controlsIcon: icons.controls || nothing4
    }) : nothing4,
    clearHistory: !transfer && historyControls && labels.historyControls && actions.clear ? screenTemplate(screen, "navigation-collection.historyClear", {
      historyControlsLabel: labels.historyControls.clear,
      disabled: historyControls.empty,
      onClear: actions.clear,
      removeIcon: icons.remove
    }) : nothing4,
    exportAll: !transfer && actions.exportAll ? screenTemplate(screen, "navigation-collection.exportAll", {
      exportAllLabel: labels.exportAll || "",
      onExportAll: actions.exportAll,
      exportAllIcon: icons.exportAll || nothing4
    }) : nothing4,
    importAll: !transfer && actions.importAll ? screenTemplate(screen, "navigation-collection.importAll", {
      importAllLabel: labels.importAll || "",
      onImportAll: actions.importAll,
      importAllIcon: icons.importAll || nothing4
    }) : nothing4,
    actionMode: !transfer && bookmarkGroups && bookmarkGroups.groups.length > 1 && actions.toggleActionMode ? screenTemplate(screen, "navigation-collection.actionMode", {
      actionModeLabel: labels.actionMode || "",
      ariaPressed: String(bookmarkGroups.moveMode),
      onToggleActionMode: actions.toggleActionMode,
      content: bookmarkGroups.moveMode ? icons.remove : icons.assign || nothing4
    }) : nothing4,
    toggleView: !transfer && actions.toggleView ? screenTemplate(screen, "navigation-collection.toggleView", {
      toggleViewLabel: labels.toggleView || "",
      onToggleView: actions.toggleView,
      viewIcon: icons.view
    }) : nothing4,
    closeLabel: labels.close,
    onClose: actions.close,
    closeIcon: icons.close,
    controlsSection: !transfer && controls ? screenTemplate(screen, "navigation-collection.controls", {
      hidden: controlsOpen === false,
      controls
    }) : nothing4,
    transferForm: transfer ? screenTemplate(screen, "navigation-collection.transfer", {
      onApplyJSON: (event) => {
        event.preventDefault();
        actions.applyJSON?.();
      },
      title: transfer.title,
      hint: transfer.hint,
      importingContent: transfer.importing && transfer.allowMerge ? screenTemplate(screen, "navigation-collection.importMode", {
        checked: transfer.mode === "merge",
        onSelectImportMode: () => actions.selectImportMode?.("merge"),
        merge: transfer.merge,
        checked2: transfer.mode === "replace",
        onSelectImportMode2: () => actions.selectImportMode?.("replace"),
        replace: transfer.replace
      }) : nothing4,
      field: transfer.field,
      readonly: !transfer.importing,
      value: transfer.value,
      onEditJSON: (event) => actions.editJSON?.(event.currentTarget.value),
      messageContent: transfer.message ? screenTemplate(screen, "navigation-collection.transferMessage", {
        message: transfer.message
      }) : nothing4,
      confirmingContent: transfer.confirming ? screenTemplate(screen, "navigation-collection.transferConfirmation", {
        confirmation: transfer.confirmation
      }) : nothing4,
      importingContent2: transfer.importing ? screenTemplate(screen, "navigation-collection.applyTransfer", {
        confirmingContent: transfer.confirming ? transfer.confirm : transfer.apply
      }) : screenTemplate(screen, "navigation-collection.copyTransfer", {
        onCopyJSON: actions.copyJSON,
        copy: transfer.copy
      }),
      onCloseJSON: actions.closeJSON,
      cancel: transfer.cancel
    }) : nothing4,
    storageMessage: !transfer && labels.message ? screenTemplate(screen, "navigation-collection.storageMessage", {
      messageLabel: labels.message,
      content: actions.retry ? screenTemplate(screen, "navigation-collection.retryStorage", {
        onRetry: actions.retry,
        retryLabel: labels.retry
      }) : nothing4,
      content2: actions.reset ? screenTemplate(screen, "navigation-collection.resetStorage", {
        onReset: actions.reset,
        resetLabel: labels.reset
      }) : nothing4
    }) : nothing4,
    entries: transfer ? nothing4 : rows.length ? historyGroups ? historyTree(rows, labels, actions, icons) : asTree ? tree(rows, labels, actions, icons, bookmarkGroups || null) : screenTemplate(screen, "navigation-collection.list", {
      items: rows.map((row) => entry(row, labels, actions, icons, bookmarkGroups || null))
    }) : screenTemplate(screen, "navigation-collection.empty", {
      emptyLabel: labels.empty
    })
  }), container);
  const controller = new AbortController;
  let gesture = null;
  const stop = () => {
    if (gesture?.handle.hasPointerCapture(gesture.pointer))
      gesture.handle.releasePointerCapture(gesture.pointer);
    container.querySelector(".is-dragging")?.classList.remove("is-dragging");
    container.querySelector(".drop-before")?.classList.remove("drop-before");
    gesture = null;
  };
  container.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0)
      return;
    const handle = isElement(event.target) ? event.target.closest("[data-drag-record]") : null;
    if (!isHTMLElement(handle) || !handle.dataset.dragRecord)
      return;
    event.preventDefault();
    gesture = {
      id: handle.dataset.dragRecord,
      handle,
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      before: null
    };
    handle.setPointerCapture(event.pointerId);
  }, { signal: controller.signal });
  container.addEventListener("pointermove", (event) => {
    if (!gesture || event.pointerId !== gesture.pointer)
      return;
    if (!gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 6)
      return;
    gesture.moved = true;
    gesture.handle.closest(".navigation-entry")?.classList.add("is-dragging");
    const point = container.ownerDocument.elementFromPoint(event.clientX, event.clientY);
    const destination = point?.closest("[data-record-id]");
    container.querySelector(".drop-before")?.classList.remove("drop-before");
    gesture.before = null;
    if (isHTMLElement(destination) && destination.dataset.recordId !== gesture.id) {
      const shown = [...container.querySelectorAll("[data-record-id]")].filter(isHTMLElement).filter((row) => row.getClientRects().length);
      const bounds = destination.getBoundingClientRect();
      gesture.before = event.clientY < bounds.top + bounds.height / 2 ? destination.dataset.recordId || null : shown[shown.indexOf(destination) + 1]?.dataset.recordId || "";
      const before = gesture.before && shown.find((row) => row.dataset.recordId === gesture?.before);
      if (before)
        before.classList.add("drop-before");
    }
  }, { signal: controller.signal });
  container.addEventListener("pointerup", (event) => {
    if (!gesture || event.pointerId !== gesture.pointer)
      return;
    const { id, before, moved } = gesture;
    stop();
    if (moved && before !== null)
      actions.reorder(id, before);
  }, { signal: controller.signal });
  container.addEventListener("pointercancel", stop, { signal: controller.signal });
  container.addEventListener("lostpointercapture", stop, { signal: controller.signal });
  container.addEventListener("keydown", (event) => {
    const handle = isElement(event.target) ? event.target.closest("[data-drag-record]") : null;
    if (!isHTMLElement(handle) || !handle.dataset.dragRecord || event.altKey || event.ctrlKey || event.metaKey || !["ArrowUp", "ArrowDown"].includes(event.key))
      return;
    const index = rows.findIndex((row) => row.id === handle.dataset.dragRecord);
    const before = event.key === "ArrowUp" ? rows[index - 1]?.id : rows[index + 2]?.id || "";
    if (index < 0 || before === undefined || event.key === "ArrowDown" && index === rows.length - 1)
      return;
    event.preventDefault();
    actions.reorder(handle.dataset.dragRecord, before);
  }, { signal: controller.signal });
  return () => {
    stop();
    controller.abort();
  };
}

// src/component/bookmarks/index.mjs
function renderBookmarks(container, model, actions) {
  const values = model.bookmarkGroups;
  const labels = model.labels.bookmarkGroups;
  const icons = model.icons.groups;
  const controls = values && labels && actions.selectGroup && actions.createGroup && actions.renameGroup && actions.deleteGroup && actions.confirmDeleteGroup && actions.cancelDeleteGroup && actions.exportGroup && actions.importGroup && actions.cancelGroupName && icons ? renderBookmarkGroupControl(values, labels, {
    selectGroup: actions.selectGroup,
    createGroup: actions.createGroup,
    renameGroup: actions.renameGroup,
    deleteGroup: actions.deleteGroup,
    confirmDeleteGroup: actions.confirmDeleteGroup,
    cancelDeleteGroup: actions.cancelDeleteGroup,
    exportGroup: actions.exportGroup,
    importGroup: actions.importGroup,
    cancelGroupName: actions.cancelGroupName
  }, icons) : null;
  return renderCollection(container, { ...model, controls }, actions);
}

// src/component/document-access/index.mjs
import { html as html3 } from "lit";
function documentAccess({ message, actions }) {
  return html3`
    <div class="document-private">
      <svg
        class       = "private-lock muted"
        viewBox     = "0 0 24 24"
        aria-hidden = "true"
      >
        <rect
          x      = "5"
          y      = "10"
          width  = "14"
          height = "11"
          rx     = "2"
        />
        <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
      </svg>
      <p class="document-state muted">${message}</p>
      <div class="document-access-actions">${actions.map((action) => html3`<button
        type    = "button"
        class   = "document-retry control primary"
        @click  = ${action.run}
      >${action.label}</button>`)}</div>
    </div>`;
}

// vendor/github-slugger-2.0.0/regex.js
var regex = /[\0-\x1F!-,\.\/:-@\[-\^`\{-\xA9\xAB-\xB4\xB6-\xB9\xBB-\xBF\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0378\u0379\u037E\u0380-\u0385\u0387\u038B\u038D\u03A2\u03F6\u0482\u0530\u0557\u0558\u055A-\u055F\u0589-\u0590\u05BE\u05C0\u05C3\u05C6\u05C8-\u05CF\u05EB-\u05EE\u05F3-\u060F\u061B-\u061F\u066A-\u066D\u06D4\u06DD\u06DE\u06E9\u06FD\u06FE\u0700-\u070F\u074B\u074C\u07B2-\u07BF\u07F6-\u07F9\u07FB\u07FC\u07FE\u07FF\u082E-\u083F\u085C-\u085F\u086B-\u089F\u08B5\u08C8-\u08D2\u08E2\u0964\u0965\u0970\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09F2-\u09FB\u09FD\u09FF\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A76-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF0-\u0AF8\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B54\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B70\u0B72-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BF0-\u0BFF\u0C0D\u0C11\u0C29\u0C3A-\u0C3C\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5B-\u0C5F\u0C64\u0C65\u0C70-\u0C7F\u0C84\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDD\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0CFF\u0D0D\u0D11\u0D45\u0D49\u0D4F-\u0D53\u0D58-\u0D5E\u0D64\u0D65\u0D70-\u0D79\u0D80\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DE5\u0DF0\u0DF1\u0DF4-\u0E00\u0E3B-\u0E3F\u0E4F\u0E5A-\u0E80\u0E83\u0E85\u0E8B\u0EA4\u0EA6\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F01-\u0F17\u0F1A-\u0F1F\u0F2A-\u0F34\u0F36\u0F38\u0F3A-\u0F3D\u0F48\u0F6D-\u0F70\u0F85\u0F98\u0FBD-\u0FC5\u0FC7-\u0FFF\u104A-\u104F\u109E\u109F\u10C6\u10C8-\u10CC\u10CE\u10CF\u10FB\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u1360-\u137F\u1390-\u139F\u13F6\u13F7\u13FE-\u1400\u166D\u166E\u1680\u169B-\u169F\u16EB-\u16ED\u16F9-\u16FF\u170D\u1715-\u171F\u1735-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17D4-\u17D6\u17D8-\u17DB\u17DE\u17DF\u17EA-\u180A\u180E\u180F\u181A-\u181F\u1879-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191F\u192C-\u192F\u193C-\u1945\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DA-\u19FF\u1A1C-\u1A1F\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1AA6\u1AA8-\u1AAF\u1AC1-\u1AFF\u1B4C-\u1B4F\u1B5A-\u1B6A\u1B74-\u1B7F\u1BF4-\u1BFF\u1C38-\u1C3F\u1C4A-\u1C4C\u1C7E\u1C7F\u1C89-\u1C8F\u1CBB\u1CBC\u1CC0-\u1CCF\u1CD3\u1CFB-\u1CFF\u1DFA\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FBD\u1FBF-\u1FC1\u1FC5\u1FCD-\u1FCF\u1FD4\u1FD5\u1FDC-\u1FDF\u1FED-\u1FF1\u1FF5\u1FFD-\u203E\u2041-\u2053\u2055-\u2070\u2072-\u207E\u2080-\u208F\u209D-\u20CF\u20F1-\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F-\u215F\u2189-\u24B5\u24EA-\u2BFF\u2C2F\u2C5F\u2CE5-\u2CEA\u2CF4-\u2CFF\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D70-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E00-\u2E2E\u2E30-\u3004\u3008-\u3020\u3030\u3036\u3037\u303D-\u3040\u3097\u3098\u309B\u309C\u30A0\u30FB\u3100-\u3104\u3130\u318F-\u319F\u31C0-\u31EF\u3200-\u33FF\u4DC0-\u4DFF\u9FFD-\u9FFF\uA48D-\uA4CF\uA4FE\uA4FF\uA60D-\uA60F\uA62C-\uA63F\uA673\uA67E\uA6F2-\uA716\uA720\uA721\uA789\uA78A\uA7C0\uA7C1\uA7CB-\uA7F4\uA828-\uA82B\uA82D-\uA83F\uA874-\uA87F\uA8C6-\uA8CF\uA8DA-\uA8DF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA954-\uA95F\uA97D-\uA97F\uA9C1-\uA9CE\uA9DA-\uA9DF\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A-\uAA5F\uAA77-\uAA79\uAAC3-\uAADA\uAADE\uAADF\uAAF0\uAAF1\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB5B\uAB6A-\uAB6F\uABEB\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uD7FF\uE000-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB29\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBB2-\uFBD2\uFD3E-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFC-\uFDFF\uFE10-\uFE1F\uFE30-\uFE32\uFE35-\uFE4C\uFE50-\uFE6F\uFE75\uFEFD-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF3E\uFF40\uFF5B-\uFF65\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFFF]|\uD800[\uDC0C\uDC27\uDC3B\uDC3E\uDC4E\uDC4F\uDC5E-\uDC7F\uDCFB-\uDD3F\uDD75-\uDDFC\uDDFE-\uDE7F\uDE9D-\uDE9F\uDED1-\uDEDF\uDEE1-\uDEFF\uDF20-\uDF2C\uDF4B-\uDF4F\uDF7B-\uDF7F\uDF9E\uDF9F\uDFC4-\uDFC7\uDFD0\uDFD6-\uDFFF]|\uD801[\uDC9E\uDC9F\uDCAA-\uDCAF\uDCD4-\uDCD7\uDCFC-\uDCFF\uDD28-\uDD2F\uDD64-\uDDFF\uDF37-\uDF3F\uDF56-\uDF5F\uDF68-\uDFFF]|\uD802[\uDC06\uDC07\uDC09\uDC36\uDC39-\uDC3B\uDC3D\uDC3E\uDC56-\uDC5F\uDC77-\uDC7F\uDC9F-\uDCDF\uDCF3\uDCF6-\uDCFF\uDD16-\uDD1F\uDD3A-\uDD7F\uDDB8-\uDDBD\uDDC0-\uDDFF\uDE04\uDE07-\uDE0B\uDE14\uDE18\uDE36\uDE37\uDE3B-\uDE3E\uDE40-\uDE5F\uDE7D-\uDE7F\uDE9D-\uDEBF\uDEC8\uDEE7-\uDEFF\uDF36-\uDF3F\uDF56-\uDF5F\uDF73-\uDF7F\uDF92-\uDFFF]|\uD803[\uDC49-\uDC7F\uDCB3-\uDCBF\uDCF3-\uDCFF\uDD28-\uDD2F\uDD3A-\uDE7F\uDEAA\uDEAD-\uDEAF\uDEB2-\uDEFF\uDF1D-\uDF26\uDF28-\uDF2F\uDF51-\uDFAF\uDFC5-\uDFDF\uDFF7-\uDFFF]|\uD804[\uDC47-\uDC65\uDC70-\uDC7E\uDCBB-\uDCCF\uDCE9-\uDCEF\uDCFA-\uDCFF\uDD35\uDD40-\uDD43\uDD48-\uDD4F\uDD74\uDD75\uDD77-\uDD7F\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDFF\uDE12\uDE38-\uDE3D\uDE3F-\uDE7F\uDE87\uDE89\uDE8E\uDE9E\uDEA9-\uDEAF\uDEEB-\uDEEF\uDEFA-\uDEFF\uDF04\uDF0D\uDF0E\uDF11\uDF12\uDF29\uDF31\uDF34\uDF3A\uDF45\uDF46\uDF49\uDF4A\uDF4E\uDF4F\uDF51-\uDF56\uDF58-\uDF5C\uDF64\uDF65\uDF6D-\uDF6F\uDF75-\uDFFF]|\uD805[\uDC4B-\uDC4F\uDC5A-\uDC5D\uDC62-\uDC7F\uDCC6\uDCC8-\uDCCF\uDCDA-\uDD7F\uDDB6\uDDB7\uDDC1-\uDDD7\uDDDE-\uDDFF\uDE41-\uDE43\uDE45-\uDE4F\uDE5A-\uDE7F\uDEB9-\uDEBF\uDECA-\uDEFF\uDF1B\uDF1C\uDF2C-\uDF2F\uDF3A-\uDFFF]|\uD806[\uDC3B-\uDC9F\uDCEA-\uDCFE\uDD07\uDD08\uDD0A\uDD0B\uDD14\uDD17\uDD36\uDD39\uDD3A\uDD44-\uDD4F\uDD5A-\uDD9F\uDDA8\uDDA9\uDDD8\uDDD9\uDDE2\uDDE5-\uDDFF\uDE3F-\uDE46\uDE48-\uDE4F\uDE9A-\uDE9C\uDE9E-\uDEBF\uDEF9-\uDFFF]|\uD807[\uDC09\uDC37\uDC41-\uDC4F\uDC5A-\uDC71\uDC90\uDC91\uDCA8\uDCB7-\uDCFF\uDD07\uDD0A\uDD37-\uDD39\uDD3B\uDD3E\uDD48-\uDD4F\uDD5A-\uDD5F\uDD66\uDD69\uDD8F\uDD92\uDD99-\uDD9F\uDDAA-\uDEDF\uDEF7-\uDFAF\uDFB1-\uDFFF]|\uD808[\uDF9A-\uDFFF]|\uD809[\uDC6F-\uDC7F\uDD44-\uDFFF]|[\uD80A\uD80B\uD80E-\uD810\uD812-\uD819\uD824-\uD82B\uD82D\uD82E\uD830-\uD833\uD837\uD839\uD83D\uD83F\uD87B-\uD87D\uD87F\uD885-\uDB3F\uDB41-\uDBFF][\uDC00-\uDFFF]|\uD80D[\uDC2F-\uDFFF]|\uD811[\uDE47-\uDFFF]|\uD81A[\uDE39-\uDE3F\uDE5F\uDE6A-\uDECF\uDEEE\uDEEF\uDEF5-\uDEFF\uDF37-\uDF3F\uDF44-\uDF4F\uDF5A-\uDF62\uDF78-\uDF7C\uDF90-\uDFFF]|\uD81B[\uDC00-\uDE3F\uDE80-\uDEFF\uDF4B-\uDF4E\uDF88-\uDF8E\uDFA0-\uDFDF\uDFE2\uDFE5-\uDFEF\uDFF2-\uDFFF]|\uD821[\uDFF8-\uDFFF]|\uD823[\uDCD6-\uDCFF\uDD09-\uDFFF]|\uD82C[\uDD1F-\uDD4F\uDD53-\uDD63\uDD68-\uDD6F\uDEFC-\uDFFF]|\uD82F[\uDC6B-\uDC6F\uDC7D-\uDC7F\uDC89-\uDC8F\uDC9A-\uDC9C\uDC9F-\uDFFF]|\uD834[\uDC00-\uDD64\uDD6A-\uDD6C\uDD73-\uDD7A\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDE41\uDE45-\uDFFF]|\uD835[\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3\uDFCC\uDFCD]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85-\uDE9A\uDEA0\uDEB0-\uDFFF]|\uD838[\uDC07\uDC19\uDC1A\uDC22\uDC25\uDC2B-\uDCFF\uDD2D-\uDD2F\uDD3E\uDD3F\uDD4A-\uDD4D\uDD4F-\uDEBF\uDEFA-\uDFFF]|\uD83A[\uDCC5-\uDCCF\uDCD7-\uDCFF\uDD4C-\uDD4F\uDD5A-\uDFFF]|\uD83B[\uDC00-\uDDFF\uDE04\uDE20\uDE23\uDE25\uDE26\uDE28\uDE33\uDE38\uDE3A\uDE3C-\uDE41\uDE43-\uDE46\uDE48\uDE4A\uDE4C\uDE50\uDE53\uDE55\uDE56\uDE58\uDE5A\uDE5C\uDE5E\uDE60\uDE63\uDE65\uDE66\uDE6B\uDE73\uDE78\uDE7D\uDE7F\uDE8A\uDE9C-\uDEA0\uDEA4\uDEAA\uDEBC-\uDFFF]|\uD83C[\uDC00-\uDD2F\uDD4A-\uDD4F\uDD6A-\uDD6F\uDD8A-\uDFFF]|\uD83E[\uDC00-\uDFEF\uDFFA-\uDFFF]|\uD869[\uDEDE-\uDEFF]|\uD86D[\uDF35-\uDF3F]|\uD86E[\uDC1E\uDC1F]|\uD873[\uDEA2-\uDEAF]|\uD87A[\uDFE1-\uDFFF]|\uD87E[\uDE1E-\uDFFF]|\uD884[\uDF4B-\uDFFF]|\uDB40[\uDC00-\uDCFF\uDDF0-\uDFFF]/g;

// vendor/github-slugger-2.0.0/index.js
var own = Object.hasOwnProperty;

class BananaSlug {
  constructor() {
    this.occurrences;
    this.reset();
  }
  slug(value, maintainCase) {
    const self = this;
    let result = slug(value, maintainCase === true);
    const originalSlug = result;
    while (own.call(self.occurrences, result)) {
      self.occurrences[originalSlug]++;
      result = originalSlug + "-" + self.occurrences[originalSlug];
    }
    self.occurrences[result] = 0;
    return result;
  }
  reset() {
    this.occurrences = Object.create(null);
  }
}
function slug(value, maintainCase) {
  if (typeof value !== "string")
    return "";
  if (!maintainCase)
    value = value.toLowerCase();
  return value.replace(regex, "").replace(/ /g, "-");
}

// vendor/marked-18.0.14/marked.esm.js
function I() {
  return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
}
var y = I();
function W(l) {
  y = l;
}
var A = { exec: () => null };
function C(l) {
  let e = [];
  return (t) => {
    let n = Math.max(0, Math.min(3, t - 1)), s = e[n];
    return s || (s = l(n), e[n] = s), s;
  };
}
function h(l, e = "") {
  let t = typeof l == "string" ? l : l.source, n = { replace: (s, r) => {
    let o = typeof r == "string" ? r : r.source;
    return o = o.replace(x.caret, "$1"), t = t.replace(s, o), n;
  }, getRegex: () => new RegExp(t, e) };
  return n;
}
var _e = ((l = "") => {
  try {
    return !!new RegExp("(?<=1)(?<!1)" + l);
  } catch {
    return false;
  }
})();
var x = { codeRemoveIndent: /^(?: {0,3}\t| {1,4})/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, endingSpaceTabChar: /[ \t]$/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, leadingSpaceTab: /^[ \t]+/, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, numericCharacterReference: /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/g, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (l) => new RegExp(`^( {0,3}${l})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: C((l) => new RegExp(`^ {0,${l}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)), hrRegex: C((l) => new RegExp(`^ {0,${l}}((?:-[ 	]*){3,}|(?:_[ 	]*){3,}|(?:\\*[ 	]*){3,})(?:\\n+|$)`)), fencesBeginRegex: C((l) => new RegExp(`^ {0,${l}}(?:\`\`\`|~~~)`)), headingBeginRegex: C((l) => new RegExp(`^ {0,${l}}#`)), htmlBeginRegex: C((l) => new RegExp(`^ {0,${l}}(?:</?(?:${N})(?: +|$|/?>)|<(?:script|pre|style|textarea|!--))`, "i")), blockquoteBeginRegex: C((l) => new RegExp(`^ {0,${l}}>`)) };
var $e = /^(?:[ \t]*(?:\n|$))+/;
var Le = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
var ze = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
var G = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
var Ae = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
var J = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
var ce = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |fences|blockquote|heading|hr|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
var he = h(ce).replace(/bull/g, J).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
var Ee = h(ce).replace(/bull/g, J).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}(?:\s|$)/).replace(/hr/g, / {0,3}(?:(?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
var V = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table|[ \t]+\n)[^\n]+)*)/;
var Me = /^[^\n]+/;
var Y = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
var Ie = h(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", Y).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
var Ce = h(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g, J).getRegex();
var N = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
var ee = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
var Be = h("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n*|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][a-z0-9-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$))", "i").replace("comment", ee).replace("tag", N).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
var de = (l) => h(V).replace("hr", G).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", l).replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", N).getRegex();
var De = de(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/);
var qe = de(/ {0,3}(?:[*+-]|\d{1,9}[.)])(?:[ \t]|\n|$)/);
var ve = h(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", qe).getRegex();
var te = { blockquote: ve, code: Le, def: Ie, fences: ze, heading: Ae, hr: G, html: Be, lheading: he, list: Ce, newline: $e, paragraph: De, table: A, text: Me };
var le = h("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", G).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}\t)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", N).getRegex();
var Ze = { ...te, lheading: Ee, table: le, paragraph: h(V).replace("hr", G).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", le).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", N).getRegex() };
var He = { ...te, html: h(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", ee).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: A, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: h(V).replace("hr", G).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", he).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
var Ge = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
var Ne = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
var ke = /^( {2,}|\\)\n(?!\s*$)[ \t]*/;
var Qe = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
var $ = /[\p{P}\p{S}]/u;
var B = /[\s\p{P}\p{S}]/u;
var Q = /[^\s\p{P}\p{S}]/u;
var je = h(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, B).getRegex();
var Fe = /[\p{Pi}\p{Ps}"']/u;
var ge = /(?!~)[\p{P}\p{S}]/u;
var Ue = /(?!~)[\s\p{P}\p{S}]/u;
var Ke = /(?:[^\s\p{P}\p{S}]|~)/u;
var We = h(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", _e ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
var fe = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/;
var Xe = h(fe, "u").replace(/punct/g, $).getRegex();
var Je = h(fe, "u").replace(/punct/g, ge).getRegex();
var Ve = /^(?:\*+(?:((?!\*)(?!openQuote)punct)|([^\s*]))?)|^_+(?:((?!_)(?!openQuote)punct)|([^\s_]))?/;
var Ye = h(Ve, "u").replace(/openQuote/g, Fe).replace(/punct/g, $).getRegex();
var me = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
var et = h(me, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
var tt = h(me, "gu").replace(/notPunctSpace/g, Ke).replace(/punctSpace/g, Ue).replace(/punct/g, ge).getRegex();
var nt = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)[\\s](\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|(?:(?!\\*)punct|notPunctSpace)(\\*+)(?!\\*)(?=notPunctSpace)";
var rt = h(nt, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
var st = h("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
var it = "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)[\\s](_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)|(?:(?!_)punct|notPunctSpace)(_+)(?!_)(?=notPunctSpace)";
var ot = h(it, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
var at = h(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, $).getRegex();
var lt = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)";
var ut = h(lt, "gu").replace(/notPunctSpace/g, Q).replace(/punctSpace/g, B).replace(/punct/g, $).getRegex();
var pt = h(/\\(punct)/, "gu").replace(/punct/g, $).getRegex();
var ct = h(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
var ht = h(ee).replace("(?:-->|$)", "-->").getRegex();
var dt = h("^comment|^</[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", ht).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
var xe = /\[(?:\\[\s\S]|[^\[\]\\])*\]/;
var U = h(/(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/).replace("brackets", xe).getRegex();
var kt = h(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", U).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
var gt = h(/^!?\[(label)\]\[(ref)\]/).replace("label", U).replace("ref", Y).getRegex();
var ft = h(/^!?\[(ref)\](?:\[\])?/).replace("ref", Y).getRegex();
var ue = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\]){1,999}/;
var mt = h(/(?:[^\[\]\\`]*(?:\[(?:brackets|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\]))){0,999}?[^\[\]\\`]*?/).replace("brackets", xe).getRegex();
var xt = h("reflink|nolink(?!\\()", "g").replace("reflink", h(/^!?\[(label)\]\[(ref)\]/).replace("label", mt).replace("ref", ue).getRegex()).replace("nolink", h(/^!?\[(ref)\](?:\[\])?/).replace("ref", ue).getRegex()).getRegex();
var pe = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
var bt = /[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/;
var Rt = h(/(?:mailto:email|xmpp:email(?:\/[A-Za-z0-9@.]+)?)/).replace(/email/g, bt).getRegex();
var ne = { _backpedal: A, anyPunctuation: pt, autolink: ct, blockSkip: We, br: ke, code: Ne, del: A, delLDelim: A, delRDelim: A, emStrongLDelim: Xe, emStrongRDelimAst: et, emStrongRDelimUnd: st, escape: Ge, link: kt, nolink: ft, punctuation: je, reflink: gt, reflinkSearch: xt, tag: dt, text: Qe, url: A };
var Tt = { ...ne, emStrongLDelim: Ye, emStrongRDelimAst: rt, emStrongRDelimUnd: ot, link: h(/^!?\[(label)\]\((.*?)\)/).replace("label", U).getRegex(), reflink: h(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", U).getRegex() };
var X = { ...ne, emStrongRDelimAst: tt, emStrongLDelim: Je, delLDelim: at, delRDelim: ut, url: h(/^emailProtocol|^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("emailProtocol", Rt).replace("protocol", pe).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: h(/^(?:[^a-zA-Z0-9](?=emailProtocol)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9](?=emailProtocol)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))))/).replace("protocol", pe).replace(/emailProtocol/g, /(?:mailto|xmpp):/).getRegex() };
var Ot = { ...X, br: h(ke).replace("{2,}", "*").getRegex(), text: h(X.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
var j = { normal: te, gfm: Ze, pedantic: He };
var D = { normal: ne, gfm: X, breaks: Ot, pedantic: Tt };
var wt = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var be = (l) => wt[l];
function O(l, e) {
  if (e) {
    if (x.escapeTest.test(l))
      return l.replace(x.escapeReplace, be);
  } else if (x.escapeTestNoEncode.test(l))
    return l.replace(x.escapeReplaceNoEncode, be);
  return l;
}
function Re(l) {
  return l.replace(x.numericCharacterReference, (e, t, n) => {
    let s = t === undefined ? Number.parseInt(n, 16) : Number.parseInt(t, 10);
    return s === 0 || s > 1114111 || s >= 55296 && s <= 57343 ? "�" : String.fromCodePoint(s);
  });
}
function re(l) {
  try {
    l = encodeURI(l).replace(x.percentDecode, "%");
  } catch {
    return null;
  }
  return l;
}
function se(l, e) {
  let t = l.replace(x.findPipe, (r, o, i) => {
    let u = false, a = o;
    for (;--a >= 0 && i[a] === "\\"; )
      u = !u;
    return u ? "|" : " |";
  }), n = t.split(x.splitPipe), s = 0;
  if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e)
    if (n.length > e)
      n.splice(e);
    else
      for (;n.length < e; )
        n.push("");
  for (;s < n.length; s++)
    n[s] = n[s].trim().replace(x.slashPipe, "|");
  return n;
}
function L(l, e, t) {
  let n = l.length;
  if (n === 0)
    return "";
  let s = 0;
  for (;s < n; ) {
    let r = l.charAt(n - s - 1);
    if (r === e && !t)
      s++;
    else if (r !== e && t)
      s++;
    else
      break;
  }
  return l.slice(0, n - s);
}
function ie(l) {
  let e = l.split(`
`), t = e.length - 1;
  for (;t >= 0 && x.blankLine.test(e[t]); )
    t--;
  return e.length - t <= 2 ? l : e.slice(0, t + 1).join(`
`);
}
function q(l) {
  return l.trim().toLowerCase().toUpperCase().toLowerCase();
}
function Te(l, e) {
  if (l.indexOf(e[1]) === -1)
    return -1;
  let t = 0;
  for (let n = 0;n < l.length; n++)
    if (l[n] === "\\")
      n++;
    else if (l[n] === e[0])
      t++;
    else if (l[n] === e[1] && (t--, t < 0))
      return n;
  return t > 0 ? -2 : -1;
}
function oe(l, e = 0) {
  let t = e, n = "";
  for (let s of l)
    if (s === "\t") {
      let r = 4 - t % 4;
      n += " ".repeat(r), t += r;
    } else
      n += s, t++;
  return n;
}
function Oe(l, e, t, n, s) {
  let r = e.href, o = e.title || null, i = l[1].replace(s.other.outputLinkReplace, "$1"), u = l[0].charAt(0) === "!";
  n.state.inLink = true;
  let a = n.state.linkEmitted, p = n.state.inRawBlock;
  n.state.linkEmitted = false;
  let c = n.inlineTokens(i), d = n.state.linkEmitted;
  if (n.state.linkEmitted = a, n.state.inLink = false, !u) {
    if (d) {
      n.state.inRawBlock = p;
      return;
    }
    n.state.linkEmitted = true;
  }
  return { type: u ? "image" : "link", raw: t, href: r, title: o, text: i, tokens: c };
}
function yt(l, e, t) {
  let n = l.match(t.other.indentCodeCompensation);
  if (n === null)
    return e;
  let s = n[1];
  return e.split(`
`).map((r) => {
    let o = r.match(t.other.beginningSpace);
    if (o === null)
      return r;
    let [i] = o;
    return r.slice(Math.min(i.length, s.length));
  }).join(`
`);
}
function we(l, e, t, n) {
  if (!e.includes("<"))
    return false;
  for (let s = 0;s < e.length; s++) {
    if (e[s] === "\\") {
      s++;
      continue;
    }
    if (e[s] === "`") {
      let i = n.inline.code.exec(e.slice(s));
      if (i) {
        s += i[0].length - 1;
        continue;
      }
    }
    if (e[s] !== "<")
      continue;
    let r = l.slice(t + s), o = n.inline.tag.exec(r) || n.inline.autolink.exec(r);
    if (o) {
      if (o[0].length > e.length - s)
        return true;
      s += o[0].length - 1;
    }
  }
  return false;
}
var P = class {
  options;
  rules;
  lexer;
  constructor(e) {
    this.options = e || y;
  }
  space(e) {
    let t = this.rules.block.newline.exec(e);
    if (t && t[0].length > 0)
      return { type: "space", raw: t[0] };
  }
  code(e) {
    let t = this.rules.block.code.exec(e);
    if (t) {
      let n = this.options.pedantic ? t[0] : ie(t[0]), s = n.replace(this.rules.other.codeRemoveIndent, "");
      return { type: "code", raw: n, codeBlockStyle: "indented", text: s };
    }
  }
  fences(e) {
    let t = this.rules.block.fences.exec(e);
    if (t) {
      let n = t[0], s = yt(n, t[3] || "", this.rules);
      return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: s };
    }
  }
  heading(e) {
    let t = this.rules.block.heading.exec(e);
    if (t) {
      let n = t[2].trim();
      if (this.rules.other.endingHash.test(n)) {
        let s = L(n, "#");
        (this.options.pedantic || !s || this.rules.other.endingSpaceTabChar.test(s)) && (n = s.trim());
      }
      return { type: "heading", raw: L(t[0], `
`), depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
    }
  }
  hr(e) {
    let t = this.rules.block.hr.exec(e);
    if (t)
      return { type: "hr", raw: L(t[0], `
`) };
  }
  blockquote(e) {
    let t = this.rules.block.blockquote.exec(e);
    if (t) {
      let n = L(t[0], `
`).split(`
`), s = "", r = "", o = [];
      for (;n.length > 0; ) {
        let i = false, u = [], a;
        for (a = 0;a < n.length; a++)
          if (this.rules.other.blockquoteStart.test(n[a]))
            u.push(n[a]), i = true;
          else if (!i)
            u.push(n[a]);
          else
            break;
        n = n.slice(a);
        let p = u.join(`
`), c = p.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
        s = s ? `${s}
${p}` : p, r = r ? `${r}
${c}` : c;
        let d = this.lexer.state.top;
        if (this.lexer.state.top = true, this.lexer.blockTokens(c, o, true), this.lexer.state.top = d, n.length === 0)
          break;
        let m = o.at(-1);
        if (m?.type === "code")
          break;
        if (m?.type === "blockquote") {
          let b = m, g = n.join(`
`), w = b.raw + `
` + g.replace(this.rules.other.blockquoteSetextReplace2, ""), f = this.blockquote(w);
          o[o.length - 1] = f;
          let M = w.substring(f.raw.length).replace(/^\n/, ""), v = M ? M.split(`
`).length : 0, Z = v ? n.slice(0, -v) : n;
          Z.length > 0 && (s = `${s}
${Z.join(`
`)}`), r = r.substring(0, r.length - b.text.length) + f.text;
          break;
        } else if (m?.type === "list") {
          let b = m, g = b.raw + `
` + n.join(`
`), w = this.list(g);
          o[o.length - 1] = w, s = s.substring(0, s.length - m.raw.length) + w.raw, r = r.substring(0, r.length - b.raw.length) + w.raw, n = g.substring(o.at(-1).raw.length).split(`
`);
          continue;
        }
      }
      return { type: "blockquote", raw: s, tokens: o, text: r };
    }
  }
  list(e) {
    let t = this.rules.block.list.exec(e);
    if (t) {
      let n = t[1].trim(), s = n.length > 1, r = { type: "list", raw: "", ordered: s, start: s ? +n.slice(0, -1) : "", loose: false, items: [] };
      n = s ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = s ? n : "[*+-]");
      let o = this.rules.other.listItemRegex(n), i = false;
      for (;e; ) {
        let a = false, p = "", c = "";
        if (!(t = o.exec(e)) || this.rules.block.hr.test(e))
          break;
        p = t[0], e = e.substring(p.length);
        let d = t[2].split(`
`, 1)[0], m = t[1].length, b = this.options.pedantic ? oe(d, m) : d.replace(this.rules.other.leadingSpaceTab, (M) => oe(M, m)), g = e.split(`
`, 1)[0], w = !b.trim(), f = 0;
        if (this.options.pedantic ? (f = 2, c = b.trimStart()) : w ? f = m + 1 : (f = b.search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, c = b.slice(f), f += m), w && this.rules.other.blankLine.test(g) && (p += g + `
`, e = e.substring(g.length + 1), a = true), !a) {
          let M = this.rules.other.nextBulletRegex(f), v = this.rules.other.hrRegex(f), Z = this.rules.other.fencesBeginRegex(f), ae = this.rules.other.headingBeginRegex(f), ye = this.rules.other.htmlBeginRegex(f), Pe = this.rules.other.blockquoteBeginRegex(f);
          for (;e; ) {
            let K = e.split(`
`, 1)[0], H;
            if (g = K, this.options.pedantic ? (g = g.replace(this.rules.other.listReplaceNesting, "  "), H = g) : H = g.replace(this.rules.other.leadingSpaceTab, (Se) => Se.replace(this.rules.other.tabCharGlobal, "    ")), Z.test(g) || ae.test(g) || ye.test(g) || Pe.test(g) || M.test(g) || v.test(g))
              break;
            if (H.search(this.rules.other.nonSpaceChar) >= f || !g.trim())
              c += `
` + H.slice(f);
            else {
              if (w || b.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || Z.test(b) || ae.test(b) || v.test(b))
                break;
              c += `
` + g;
            }
            w = !g.trim(), p += K + `
`, e = e.substring(K.length + 1), b = H.slice(f);
          }
        }
        r.loose || (i ? r.loose = true : this.rules.other.doubleBlankLine.test(p) && (i = true)), r.items.push({ type: "list_item", raw: p, task: !!this.options.gfm && this.rules.other.listIsTask.test(c), loose: false, text: c, tokens: [] }), r.raw += p;
      }
      let u = r.items.at(-1);
      if (u)
        u.raw = u.raw.trimEnd(), u.text = u.text.trimEnd();
      else
        return;
      r.raw = r.raw.trimEnd();
      for (let a of r.items)
        if (this.lexer.state.top = false, a.tokens = this.lexer.blockTokens(a.text, []), !r.loose) {
          let p = a.tokens.filter((d) => d.type === "space"), c = p.length > 0 && p.some((d) => this.rules.other.anyLine.test(d.raw));
          r.loose = c;
        }
      for (let a of r.items) {
        let p = a.tokens[0];
        if (a.task && (p?.type === "text" || p?.type === "paragraph")) {
          a.text = a.text.replace(this.rules.other.listReplaceTask, ""), p.raw = p.raw.replace(this.rules.other.listReplaceTask, ""), p.text = p.text.replace(this.rules.other.listReplaceTask, "");
          for (let d = this.lexer.inlineQueue.length - 1;d >= 0; d--)
            if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[d].src)) {
              this.lexer.inlineQueue[d].src = this.lexer.inlineQueue[d].src.replace(this.rules.other.listReplaceTask, "");
              break;
            }
          let c = this.rules.other.listTaskCheckbox.exec(a.raw);
          if (c) {
            let d = { type: "checkbox", raw: c[0] + " ", checked: c[0] !== "[ ]" };
            a.checked = d.checked, r.loose ? a.tokens[0] && ["paragraph", "text"].includes(a.tokens[0].type) && "tokens" in a.tokens[0] && a.tokens[0].tokens ? (a.tokens[0].raw = d.raw + a.tokens[0].raw, a.tokens[0].text = d.raw + a.tokens[0].text, a.tokens[0].tokens.unshift(d)) : a.tokens.unshift({ type: "paragraph", raw: d.raw, text: d.raw, tokens: [d] }) : a.tokens.unshift(d);
          }
        } else
          a.task && (a.task = false);
      }
      if (r.loose)
        for (let a of r.items) {
          a.loose = true;
          for (let p of a.tokens)
            p.type === "text" && (p.type = "paragraph");
        }
      return r;
    }
  }
  html(e) {
    let t = this.rules.block.html.exec(e);
    if (t) {
      let n = ie(t[0]);
      return { type: "html", block: true, raw: n, pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: n };
    }
  }
  def(e) {
    let t = this.rules.block.def.exec(e);
    if (t) {
      let n = q(t[1]).replace(this.rules.other.multipleSpaceGlobal, " "), s = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag: n, raw: L(t[0], `
`), href: s, title: r };
    }
  }
  table(e) {
    let t = this.rules.block.table.exec(e);
    if (!t || !this.rules.other.tableDelimiter.test(t[2]))
      return;
    let n = se(t[1]), s = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), r = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], o = { type: "table", raw: L(t[0], `
`), header: [], align: [], rows: [] };
    if (n.length === s.length) {
      for (let i of s)
        this.rules.other.tableAlignRight.test(i) ? o.align.push("right") : this.rules.other.tableAlignCenter.test(i) ? o.align.push("center") : this.rules.other.tableAlignLeft.test(i) ? o.align.push("left") : o.align.push(null);
      for (let i = 0;i < n.length; i++)
        o.header.push({ text: n[i], tokens: this.lexer.inline(n[i]), header: true, align: o.align[i] });
      for (let i of r)
        o.rows.push(se(i, o.header.length).map((u, a) => ({ text: u, tokens: this.lexer.inline(u), header: false, align: o.align[a] })));
      return o;
    }
  }
  lheading(e) {
    let t = this.rules.block.lheading.exec(e);
    if (t) {
      let n = t[1].trim();
      return { type: "heading", raw: L(t[0], `
`), depth: t[2].charAt(0) === "=" ? 1 : 2, text: n, tokens: this.lexer.inline(n) };
    }
  }
  paragraph(e) {
    let t = this.rules.block.paragraph.exec(e);
    if (t) {
      let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
    }
  }
  text(e) {
    let t = this.rules.block.text.exec(e);
    if (t)
      return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }
  escape(e) {
    let t = this.rules.inline.escape.exec(e);
    if (t)
      return { type: "escape", raw: t[0], text: t[1] };
  }
  tag(e) {
    let t = this.rules.inline.tag.exec(e);
    if (t)
      return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
  }
  link(e) {
    let t = this.rules.inline.link.exec(e);
    if (t) {
      let n = t[0].charAt(0) === "!" ? 2 : 1;
      if (!this.options.pedantic && we(e, t[1], n, this.rules))
        return;
      let s = t[2].trim();
      if (!this.options.pedantic && this.rules.other.startAngleBracket.test(s)) {
        if (!this.rules.other.endAngleBracket.test(s))
          return;
        let i = L(s.slice(0, -1), "\\");
        if ((s.length - i.length) % 2 === 0)
          return;
      } else {
        let i = Te(t[2], "()");
        if (i === -2)
          return;
        if (i > -1) {
          let a = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + i;
          t[2] = t[2].substring(0, i), t[0] = t[0].substring(0, a).trim(), t[3] = "";
        }
      }
      let r = t[2], o = "";
      if (this.options.pedantic) {
        let i = this.rules.other.pedanticHrefTitle.exec(r);
        i && (r = i[1], o = i[3]);
      } else
        o = t[3] ? t[3].slice(1, -1) : "";
      return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(s) ? r = r.slice(1) : r = r.slice(1, -1)), Oe(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: o && o.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
    }
  }
  reflink(e, t) {
    let n;
    if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
      let s = n[0].charAt(0) === "!" ? 2 : 1;
      if (!this.options.pedantic && we(e, n[1], s, this.rules))
        return;
      let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), o = t[q(r)];
      if (!o) {
        let i = n[0].charAt(0);
        return { type: "text", raw: i, text: i };
      }
      return Oe(n, o, n[0], this.lexer, this.rules);
    }
  }
  emStrong(e, t, n = "") {
    let s = this.rules.inline.emStrongLDelim.exec(e);
    if (!s || !s[1] && !s[2] && !s[3] && !s[4] || s[4] && n.match(this.rules.other.unicodeAlphaNumeric))
      return;
    if (!(s[1] || s[3] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let o = [...s[0]].length - 1, i, u, a = o, p = 0, c = s[0][0], d = n === c, m = c === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
      for (m.lastIndex = 0, t = t.slice(-1 * e.length + o);(s = m.exec(t)) !== null; ) {
        if (i = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !i)
          continue;
        if (u = [...i].length, s[3] || s[4]) {
          a += u;
          continue;
        } else if (s[5] || s[6]) {
          if (o % 3 && !((o + u) % 3)) {
            p += u;
            continue;
          }
          if (d)
            break;
        }
        if (a -= u, a > 0)
          continue;
        u = Math.min(u, u + a + p);
        let b = [...s[0]][0].length, g = e.slice(0, o + s.index + b + u);
        if (Math.min(o, u) % 2) {
          let f = g.slice(1, -1);
          return { type: "em", raw: g, text: f, tokens: this.lexer.inlineTokens(f) };
        }
        let w = g.slice(2, -2);
        return { type: "strong", raw: g, text: w, tokens: this.lexer.inlineTokens(w) };
      }
    }
  }
  codespan(e) {
    let t = this.rules.inline.code.exec(e);
    if (t) {
      let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), s = this.rules.other.nonSpaceChar.test(n), r = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
      return s && r && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
    }
  }
  br(e) {
    let t = this.rules.inline.br.exec(e);
    if (t)
      return { type: "br", raw: t[0] };
  }
  del(e, t, n = "") {
    let s = this.rules.inline.delLDelim.exec(e);
    if (!s)
      return;
    if (!(s[1] || "") || !n || this.rules.inline.punctuation.exec(n)) {
      let o = [...s[0]].length - 1, i, u, a = o, p = this.rules.inline.delRDelim;
      for (p.lastIndex = 0, t = t.slice(-1 * e.length + o);(s = p.exec(t)) !== null; ) {
        if (i = s[1] || s[2] || s[3] || s[4] || s[5] || s[6], !i || (u = [...i].length, u !== o))
          continue;
        if (s[3] || s[4]) {
          a += u;
          continue;
        }
        if (a -= u, a > 0)
          continue;
        u = Math.min(u, u + a);
        let c = [...s[0]][0].length, d = e.slice(0, o + s.index + c + u), m = d.slice(o, -o);
        return { type: "del", raw: d, text: m, tokens: this.lexer.inlineTokens(m) };
      }
    }
  }
  autolink(e) {
    let t = this.rules.inline.autolink.exec(e);
    if (t) {
      let n, s;
      return t[2] === "@" ? (n = t[1], s = "mailto:" + n) : (n = t[1], s = n), { type: "link", raw: t[0], text: n, href: s, autolink: true, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  url(e) {
    let t;
    if (t = this.rules.inline.url.exec(e)) {
      let n, s;
      if (t[2] === "@")
        n = t[0], s = "mailto:" + n;
      else {
        let r;
        do
          r = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
        while (r !== t[0]);
        n = t[0], t[1] === "www." ? s = "http://" + t[0] : s = t[0];
      }
      return { type: "link", raw: t[0], text: n, href: s, autolink: true, tokens: [{ type: "text", raw: n, text: n }] };
    }
  }
  inlineText(e) {
    let t = this.rules.inline.text.exec(e);
    if (t) {
      let n = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: n ? t[0] : Re(t[0]), escaped: n };
    }
  }
};
var R = class l {
  tokens;
  options;
  state;
  inlineQueue;
  tokenizer;
  constructor(e) {
    this.tokens = [], this.tokens.links = Object.create(null), this.options = e || y, this.options.tokenizer = this.options.tokenizer || new P, this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, linkEmitted: false, top: true };
    let t = { other: x, block: j.normal, inline: D.normal };
    this.options.pedantic ? (t.block = j.pedantic, t.inline = D.pedantic) : this.options.gfm && (t.block = j.gfm, this.options.breaks ? t.inline = D.breaks : t.inline = D.gfm), this.tokenizer.rules = t;
  }
  static get rules() {
    return { block: j, inline: D };
  }
  static lex(e, t) {
    return new l(t).lex(e);
  }
  static lexInline(e, t) {
    return new l(t).inlineTokens(e);
  }
  lex(e) {
    e = e.replace(x.carriageReturn, `
`), this.blockTokens(e, this.tokens);
    for (let t = 0;t < this.inlineQueue.length; t++) {
      let n = this.inlineQueue[t];
      this.inlineTokens(n.src, n.tokens);
    }
    return this.inlineQueue = [], this.tokens;
  }
  blockTokens(e, t = [], n = false) {
    this.tokenizer.lexer = this, this.options.pedantic && (e = e.replace(x.tabCharGlobal, "    ").replace(x.spaceLine, ""));
    let s = 1 / 0;
    for (;e; ) {
      if (e.length < s)
        s = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      let r;
      if (this.options.extensions?.block?.some((i) => (r = i.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false))
        continue;
      if (r = this.tokenizer.space(e)) {
        e = e.substring(r.raw.length);
        let i = t.at(-1);
        r.raw.length === 1 && i !== undefined ? i.raw += `
` : t.push(r);
        continue;
      }
      if (r = this.tokenizer.code(e)) {
        e = e.substring(r.raw.length);
        let i = t.at(-1);
        i?.type === "paragraph" || i?.type === "text" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.text, this.inlineQueue.at(-1).src = i.text) : t.push(r);
        continue;
      }
      if (r = this.tokenizer.fences(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.heading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.hr(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.blockquote(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.list(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.html(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.def(e)) {
        e = e.substring(r.raw.length);
        let i = t.at(-1);
        i?.type === "paragraph" || i?.type === "text" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.raw, this.inlineQueue.at(-1).src = i.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
        continue;
      }
      if (r = this.tokenizer.table(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      if (r = this.tokenizer.lheading(e)) {
        e = e.substring(r.raw.length), t.push(r);
        continue;
      }
      let o = e;
      if (this.options.extensions?.startBlock) {
        let i = 1 / 0, u = e.slice(1), a;
        this.options.extensions.startBlock.forEach((p) => {
          a = p.call({ lexer: this }, u), typeof a == "number" && a >= 0 && (i = Math.min(i, a));
        }), i < 1 / 0 && i >= 0 && (o = e.substring(0, i + 1));
      }
      if (this.state.top && (r = this.tokenizer.paragraph(o))) {
        let i = t.at(-1);
        n && i?.type === "paragraph" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = i.text) : t.push(r), n = o.length !== e.length, e = e.substring(r.raw.length);
        continue;
      }
      if (r = this.tokenizer.text(e)) {
        e = e.substring(r.raw.length);
        let i = t.at(-1);
        i?.type === "text" ? (i.raw += (i.raw.endsWith(`
`) ? "" : `
`) + r.raw, i.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = i.text) : t.push(r);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return this.state.top = true, t;
  }
  inline(e, t = []) {
    return this.inlineQueue.push({ src: e, tokens: t }), t;
  }
  linkInText(e) {
    if (!e.includes("["))
      return false;
    let t = this.tokenizer.rules.inline.link;
    for (let n of e.matchAll(this.tokenizer.rules.inline.blockSkip))
      if (t.test(n[0]) && e.charAt(n.index - 1) !== "!")
        return true;
    for (let n of e.matchAll(this.tokenizer.rules.inline.reflinkSearch)) {
      let s = n[0], r = s.lastIndexOf("[");
      if (!(s.charAt(0) === "!" || !Object.hasOwn(this.tokens.links, q(s.slice(r + 1, -1)))) && !(r > 1 && this.linkInText(s.slice(1, r - 1))))
        return true;
    }
    return false;
  }
  inlineTokens(e, t = []) {
    this.tokenizer.lexer = this;
    let n = e;
    if (this.tokens.links && e.includes("[")) {
      let i = this.tokenizer.rules.inline.reflinkSearch, u = (a) => {
        let p = a.lastIndexOf("[");
        if (!Object.hasOwn(this.tokens.links, q(a.slice(p + 1, -1))))
          return a;
        if (p > 1 && a.charAt(0) !== "!") {
          let c = a.slice(1, p - 1);
          if (this.linkInText(c))
            return "[" + c.replace(i, u) + "][" + "a".repeat(a.length - p - 2) + "]";
        }
        return "[" + "a".repeat(a.length - 2) + "]";
      };
      n = n.replace(i, u);
    }
    n = n.replace(this.tokenizer.rules.inline.anyPunctuation, (i) => "+".repeat(i.length)), n = n.replace(this.tokenizer.rules.inline.blockSkip, (i, u, a) => {
      let p = a ? a.length : 0;
      return i.slice(0, p) + "[" + "a".repeat(i.length - p - 2) + "]";
    }), n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
    let s = false, r = "", o = 1 / 0;
    for (;e; ) {
      if (e.length < o)
        o = e.length;
      else {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
      s || (r = ""), s = false;
      let i;
      if (this.options.extensions?.inline?.some((a) => (i = a.call({ lexer: this }, e, t)) ? (e = e.substring(i.raw.length), t.push(i), true) : false))
        continue;
      if (i = this.tokenizer.escape(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.tag(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.link(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.reflink(e, this.tokens.links)) {
        e = e.substring(i.raw.length);
        let a = t.at(-1);
        i.type === "text" && a?.type === "text" ? (a.raw += i.raw, a.text += i.text) : t.push(i);
        continue;
      }
      if (i = this.tokenizer.emStrong(e, n, r)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.codespan(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.br(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.del(e, n, r)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (i = this.tokenizer.autolink(e)) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      if (!this.state.inLink && (i = this.tokenizer.url(e))) {
        e = e.substring(i.raw.length), t.push(i);
        continue;
      }
      let u = e;
      if (this.options.extensions?.startInline) {
        let a = 1 / 0, p = e.slice(1), c;
        this.options.extensions.startInline.forEach((d) => {
          c = d.call({ lexer: this }, p), typeof c == "number" && c >= 0 && (a = Math.min(a, c));
        }), a < 1 / 0 && a >= 0 && (u = e.substring(0, a + 1));
      }
      if (i = this.tokenizer.inlineText(u)) {
        e = e.substring(i.raw.length), i.raw.slice(-1) !== "_" && (r = i.raw.slice(-1)), s = true;
        let a = t.at(-1);
        a?.type === "text" ? (a.raw += i.raw, a.text += i.text) : t.push(i);
        continue;
      }
      if (e) {
        this.infiniteLoopError(e.charCodeAt(0));
        break;
      }
    }
    return t;
  }
  infiniteLoopError(e) {
    let t = "Infinite loop on byte: " + e;
    if (this.options.silent)
      console.error(t);
    else
      throw new Error(t);
  }
};
var S = class {
  options;
  parser;
  constructor(e) {
    this.options = e || y;
  }
  space(e) {
    return "";
  }
  code({ text: e, lang: t, escaped: n }) {
    let s = (t || "").match(x.notSpaceStart)?.[0], r = e ? e.replace(x.endingNewline, "") + `
` : "";
    return s ? '<pre><code class="language-' + O(s) + '">' + (n ? r : O(r, true)) + `</code></pre>
` : "<pre><code>" + (n ? r : O(r, true)) + `</code></pre>
`;
  }
  blockquote({ tokens: e }) {
    return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
  }
  html({ text: e }) {
    return e;
  }
  def(e) {
    return "";
  }
  heading({ tokens: e, depth: t }) {
    return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
  }
  hr(e) {
    return `<hr>
`;
  }
  list(e) {
    let { ordered: t, start: n } = e, s = "";
    for (let i = 0;i < e.items.length; i++) {
      let u = e.items[i];
      s += this.listitem(u);
    }
    let r = t ? "ol" : "ul", o = t && n !== 1 ? ' start="' + n + '"' : "";
    return "<" + r + o + `>
` + s + "</" + r + `>
`;
  }
  listitem(e) {
    return `<li>${this.parser.parse(e.tokens)}</li>
`;
  }
  checkbox({ checked: e }) {
    return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
  }
  paragraph({ tokens: e }) {
    return `<p>${this.parser.parseInline(e)}</p>
`;
  }
  table(e) {
    let t = "", n = "";
    for (let r = 0;r < e.header.length; r++)
      n += this.tablecell(e.header[r]);
    t += this.tablerow({ text: n });
    let s = "";
    for (let r = 0;r < e.rows.length; r++) {
      let o = e.rows[r];
      n = "";
      for (let i = 0;i < o.length; i++)
        n += this.tablecell(o[i]);
      s += this.tablerow({ text: n });
    }
    return s && (s = `<tbody>${s}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + s + `</table>
`;
  }
  tablerow({ text: e }) {
    return `<tr>
${e}</tr>
`;
  }
  tablecell(e) {
    let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
  }
  strong({ tokens: e }) {
    return `<strong>${this.parser.parseInline(e)}</strong>`;
  }
  em({ tokens: e }) {
    return `<em>${this.parser.parseInline(e)}</em>`;
  }
  codespan({ text: e }) {
    return `<code>${O(e, true)}</code>`;
  }
  br(e) {
    return "<br>";
  }
  del({ tokens: e }) {
    return `<del>${this.parser.parseInline(e)}</del>`;
  }
  link({ href: e, title: t, text: n, tokens: s, autolink: r }) {
    let o = r ? O(n, true) : this.parser.parseInline(s), i = re(e);
    if (i === null)
      return o;
    e = O(i, r);
    let u = '<a href="' + e + '"';
    return t && (u += ' title="' + O(t) + '"'), u += ">" + o + "</a>", u;
  }
  image({ href: e, title: t, text: n, tokens: s }) {
    s && (n = this.parser.parseInline(s, this.parser.textRenderer));
    let r = re(e);
    if (r === null)
      return O(n);
    e = r;
    let o = `<img src="${O(e)}" alt="${O(n)}"`;
    return t && (o += ` title="${O(t)}"`), o += ">", o;
  }
  text(e) {
    return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : ("escaped" in e) && e.escaped ? e.text : O(e.text);
  }
};
var z = class {
  strong({ text: e }) {
    return e;
  }
  em({ text: e }) {
    return e;
  }
  codespan({ text: e }) {
    return e;
  }
  del({ text: e }) {
    return e;
  }
  html({ text: e }) {
    return e;
  }
  text({ text: e }) {
    return e;
  }
  link({ text: e }) {
    return "" + e;
  }
  image({ text: e }) {
    return "" + e;
  }
  br() {
    return "";
  }
  checkbox({ raw: e }) {
    return e;
  }
};
var T = class l {
  options;
  renderer;
  textRenderer;
  constructor(e) {
    this.options = e || y, this.options.renderer = this.options.renderer || new S, this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new z;
  }
  static parse(e, t) {
    return new l(t).parse(e);
  }
  static parseInline(e, t) {
    return new l(t).parseInline(e);
  }
  parse(e) {
    this.renderer.parser = this;
    let t = "";
    for (let n = 0;n < e.length; n++) {
      let s = e[n];
      if (this.options.extensions?.renderers?.[s.type]) {
        let o = s, i = this.options.extensions.renderers[o.type].call({ parser: this }, o);
        if (i !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "checkbox", "html", "def", "paragraph", "text"].includes(o.type)) {
          t += i || "";
          continue;
        }
      }
      let r = s;
      switch (r.type) {
        case "space": {
          t += this.renderer.space(r);
          break;
        }
        case "hr": {
          t += this.renderer.hr(r);
          break;
        }
        case "heading": {
          t += this.renderer.heading(r);
          break;
        }
        case "code": {
          t += this.renderer.code(r);
          break;
        }
        case "table": {
          t += this.renderer.table(r);
          break;
        }
        case "blockquote": {
          t += this.renderer.blockquote(r);
          break;
        }
        case "list": {
          t += this.renderer.list(r);
          break;
        }
        case "checkbox": {
          t += this.renderer.checkbox(r);
          break;
        }
        case "html": {
          t += this.renderer.html(r);
          break;
        }
        case "def": {
          t += this.renderer.def(r);
          break;
        }
        case "paragraph": {
          t += this.renderer.paragraph(r);
          break;
        }
        case "text": {
          t += this.renderer.text(r);
          break;
        }
        default: {
          let o = 'Token with "' + r.type + '" type was not found.';
          if (this.options.silent)
            return console.error(o), "";
          throw new Error(o);
        }
      }
    }
    return t;
  }
  parseInline(e, t = this.renderer) {
    this.renderer.parser = this;
    let n = "";
    for (let s = 0;s < e.length; s++) {
      let r = e[s];
      if (this.options.extensions?.renderers?.[r.type]) {
        let i = this.options.extensions.renderers[r.type].call({ parser: this }, r);
        if (i !== false || !["escape", "html", "link", "image", "checkbox", "strong", "em", "codespan", "br", "del", "text"].includes(r.type)) {
          n += i || "";
          continue;
        }
      }
      let o = r;
      switch (o.type) {
        case "escape": {
          n += t.text(o);
          break;
        }
        case "html": {
          n += t.html(o);
          break;
        }
        case "link": {
          n += t.link(o);
          break;
        }
        case "image": {
          n += t.image(o);
          break;
        }
        case "checkbox": {
          n += t.checkbox(o);
          break;
        }
        case "strong": {
          n += t.strong(o);
          break;
        }
        case "em": {
          n += t.em(o);
          break;
        }
        case "codespan": {
          n += t.codespan(o);
          break;
        }
        case "br": {
          n += t.br(o);
          break;
        }
        case "del": {
          n += t.del(o);
          break;
        }
        case "text": {
          n += t.text(o);
          break;
        }
        default: {
          let i = 'Token with "' + o.type + '" type was not found.';
          if (this.options.silent)
            return console.error(i), "";
          throw new Error(i);
        }
      }
    }
    return n;
  }
};
var _ = class {
  options;
  block;
  constructor(e) {
    this.options = e || y;
  }
  static passThroughHooks = new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
  static passThroughHooksRespectAsync = new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(e) {
    return e;
  }
  postprocess(e) {
    return e;
  }
  processAllTokens(e) {
    return e;
  }
  emStrongMask(e) {
    return e;
  }
  provideLexer(e = this.block) {
    return e ? R.lex : R.lexInline;
  }
  provideParser(e = this.block) {
    return e ? T.parse : T.parseInline;
  }
};
var F = class {
  defaults = I();
  options = this.setOptions;
  parse = this.parseMarkdown(true);
  parseInline = this.parseMarkdown(false);
  Parser = T;
  Renderer = S;
  TextRenderer = z;
  Lexer = R;
  Tokenizer = P;
  Hooks = _;
  constructor(...e) {
    this.use(...e);
  }
  walkTokens(e, t) {
    let n = [];
    for (let s of e)
      switch (n = n.concat(t.call(this, s)), s.type) {
        case "table": {
          let r = s;
          for (let o of r.header)
            n = n.concat(this.walkTokens(o.tokens, t));
          for (let o of r.rows)
            for (let i of o)
              n = n.concat(this.walkTokens(i.tokens, t));
          break;
        }
        case "list": {
          let r = s;
          n = n.concat(this.walkTokens(r.items, t));
          break;
        }
        default: {
          let r = s;
          this.defaults.extensions?.childTokens?.[r.type] ? this.defaults.extensions.childTokens[r.type].forEach((o) => {
            let i = r[o].flat(1 / 0);
            n = n.concat(this.walkTokens(i, t));
          }) : r.tokens && (n = n.concat(this.walkTokens(r.tokens, t)));
        }
      }
    return n;
  }
  use(...e) {
    let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
    return e.forEach((n) => {
      let s = { ...n };
      if (s.async = this.defaults.async || s.async || false, n.extensions && (n.extensions.forEach((r) => {
        if (!r.name)
          throw new Error("extension name required");
        if ("renderer" in r) {
          let o = t.renderers[r.name];
          o ? t.renderers[r.name] = function(...i) {
            let u = r.renderer.apply(this, i);
            return u === false && (u = o.apply(this, i)), u;
          } : t.renderers[r.name] = r.renderer;
        }
        if ("tokenizer" in r) {
          if (!r.level || r.level !== "block" && r.level !== "inline")
            throw new Error("extension level must be 'block' or 'inline'");
          let o = t[r.level];
          o ? o.unshift(r.tokenizer) : t[r.level] = [r.tokenizer], r.start && (r.level === "block" ? t.startBlock ? t.startBlock.push(r.start) : t.startBlock = [r.start] : r.level === "inline" && (t.startInline ? t.startInline.push(r.start) : t.startInline = [r.start]));
        }
        "childTokens" in r && r.childTokens && (t.childTokens[r.name] = r.childTokens);
      }), s.extensions = t), n.renderer) {
        let r = this.defaults.renderer || new S(this.defaults);
        for (let o in n.renderer) {
          if (!(o in r))
            throw new Error(`renderer '${o}' does not exist`);
          if (["options", "parser"].includes(o))
            continue;
          let i = o, u = n.renderer[i], a = r[i];
          r[i] = (...p) => {
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c || "";
          };
        }
        s.renderer = r;
      }
      if (n.tokenizer) {
        let r = this.defaults.tokenizer || new P(this.defaults);
        for (let o in n.tokenizer) {
          if (!(o in r))
            throw new Error(`tokenizer '${o}' does not exist`);
          if (["options", "rules", "lexer"].includes(o))
            continue;
          let i = o, u = n.tokenizer[i], a = r[i];
          r[i] = (...p) => {
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c;
          };
        }
        s.tokenizer = r;
      }
      if (n.hooks) {
        let r = this.defaults.hooks || new _;
        for (let o in n.hooks) {
          if (!(o in r))
            throw new Error(`hook '${o}' does not exist`);
          if (["options", "block"].includes(o))
            continue;
          let i = o, u = n.hooks[i], a = r[i];
          _.passThroughHooks.has(o) ? r[i] = (p) => {
            if (this.defaults.async && _.passThroughHooksRespectAsync.has(o))
              return (async () => {
                let d = await u.call(r, p);
                return a.call(r, d);
              })();
            let c = u.call(r, p);
            return a.call(r, c);
          } : r[i] = (...p) => {
            if (this.defaults.async)
              return (async () => {
                let d = await u.apply(r, p);
                return d === false && (d = await a.apply(r, p)), d;
              })();
            let c = u.apply(r, p);
            return c === false && (c = a.apply(r, p)), c;
          };
        }
        s.hooks = r;
      }
      if (n.walkTokens) {
        let r = this.defaults.walkTokens, o = n.walkTokens;
        s.walkTokens = function(i) {
          let u = [];
          return u.push(o.call(this, i)), r && (u = u.concat(r.call(this, i))), u;
        };
      }
      this.defaults = { ...this.defaults, ...s };
    }), this;
  }
  setOptions(e) {
    return this.defaults = { ...this.defaults, ...e }, this;
  }
  lexer(e, t) {
    return R.lex(e, t ?? this.defaults);
  }
  parser(e, t) {
    return T.parse(e, t ?? this.defaults);
  }
  parseMarkdown(e) {
    return (n, s) => {
      let r = { ...s }, o = { ...this.defaults, ...r }, i = this.onError(!!o.silent, !!o.async);
      if (this.defaults.async === true && r.async === false)
        return i(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
      if (typeof n > "u" || n === null)
        return i(new Error("marked(): input parameter is undefined or null"));
      if (typeof n != "string")
        return i(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
      if (o.hooks && (o.hooks.options = o, o.hooks.block = e), o.async)
        return (async () => {
          let u = o.hooks ? await o.hooks.preprocess(n) : n, p = await (o.hooks ? await o.hooks.provideLexer(e) : e ? R.lex : R.lexInline)(u, o), c = o.hooks ? await o.hooks.processAllTokens(p) : p;
          o.walkTokens && await Promise.all(this.walkTokens(c, o.walkTokens));
          let m = await (o.hooks ? await o.hooks.provideParser(e) : e ? T.parse : T.parseInline)(c, o);
          return o.hooks ? await o.hooks.postprocess(m) : m;
        })().catch(i);
      try {
        o.hooks && (n = o.hooks.preprocess(n));
        let a = (o.hooks ? o.hooks.provideLexer(e) : e ? R.lex : R.lexInline)(n, o);
        o.hooks && (a = o.hooks.processAllTokens(a)), o.walkTokens && this.walkTokens(a, o.walkTokens);
        let c = (o.hooks ? o.hooks.provideParser(e) : e ? T.parse : T.parseInline)(a, o);
        return o.hooks && (c = o.hooks.postprocess(c)), c;
      } catch (u) {
        return i(u);
      }
    };
  }
  onError(e, t) {
    return (n) => {
      if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
        let s = "<p>An error occurred:</p><pre>" + O(n.message + "", true) + "</pre>";
        return t ? Promise.resolve(s) : s;
      }
      if (t)
        return Promise.reject(n);
      throw n;
    };
  }
};
var E = new F;
function k(l, e) {
  return E.parse(l, e);
}
k.options = k.setOptions = function(l) {
  return E.setOptions(l), k.defaults = E.defaults, W(k.defaults), k;
};
k.getDefaults = I;
k.defaults = y;
function Pt(...l) {
  return E.use(...l), k.defaults = E.defaults, W(k.defaults), k;
}
k.use = Pt;
k.walkTokens = function(l, e) {
  return E.walkTokens(l, e);
};
k.parseInline = E.parseInline;
k.Parser = T;
k.parser = T.parse;
k.Renderer = S;
k.TextRenderer = z;
k.Lexer = R;
k.lexer = R.lex;
k.Tokenizer = P;
k.Hooks = _;
k.parse = k;
var gn = k.options;
var fn = k.setOptions;
var mn = k.walkTokens;
var xn = k.parseInline;
var Rn = T.parse;
var Tn = R.lex;

// src/component/resizable-table/index.mjs
var minimumWidth = 48;
function columnGrid(table) {
  if (table.querySelector("table"))
    return null;
  const cells = [];
  const edges = new Set([0]);
  let occupied = [];
  let group = null;
  let count = 0;
  for (const row of table.rows) {
    if (group !== row.parentElement) {
      group = row.parentElement;
      occupied = [];
    }
    let column = 0;
    for (const cell of row.cells) {
      while (occupied[column])
        column++;
      const end = column + cell.colSpan;
      for (let index = column;index < end; index++) {
        if (occupied[index])
          return null;
        occupied[index] = cell.rowSpan || Infinity;
      }
      cells.push({ cell, start: column, end });
      edges.add(column);
      edges.add(end);
      count = Math.max(count, end);
      column = end;
    }
    occupied = occupied.map((value) => Math.max(0, value - 1));
  }
  return count > 1 && edges.size === count + 1 ? { cells, count } : null;
}

class TableResize {
  #table;
  #grid;
  #columnLabel;
  #viewport;
  #columns = [];
  #handles = [];
  #segments = [];
  #widths = [];
  #drag = null;
  #events = null;
  #observer = null;
  #view = null;
  #frame = 0;
  #environment = 0;
  #moving = false;
  #disposed = false;
  constructor(table, grid, columnLabel) {
    this.#table = table;
    this.#grid = grid;
    this.#columnLabel = columnLabel;
    this.#viewport = table.ownerDocument.createElement("div");
    this.#viewport.className = "document-table-scroll";
    table.before(this.#viewport);
    this.#viewport.append(table);
    table.classList.add("document-resizable");
    this.#bind();
  }
  #writeWidths() {
    this.#table.style.width = `${this.#widths.reduce((sum, width) => sum + width, 0)}px`;
    this.#columns.forEach((column, index) => {
      column.style.width = `${this.#widths[index]}px`;
    });
  }
  #move(index, width, total = this.#widths[index] + this.#widths[index + 1]) {
    this.#widths[index] = Math.max(minimumWidth, Math.min(total - minimumWidth, width));
    this.#widths[index + 1] = total - this.#widths[index];
    this.#writeWidths();
    this.#refresh();
  }
  #endDrag() {
    const previous = this.#drag;
    this.#drag = null;
    if (!previous?.handle.hasPointerCapture(previous.pointerId))
      return;
    try {
      previous.handle.releasePointerCapture(previous.pointerId);
    } catch (error) {
      if (!error || typeof error !== "object" || !("name" in error) || error.name !== "NotFoundError")
        throw error;
    }
  }
  #handle(target) {
    const handle = isElement(target) ? target.closest(".document-column-resize") : null;
    return isHTMLElement(handle) && this.#viewport.contains(handle) ? handle : null;
  }
  #startDrag(event) {
    if (this.#disposed || this.#moving || event.button !== 0 || event.isPrimary === false)
      return;
    const handle = this.#handle(event.target);
    if (!handle)
      return;
    const index = Number(handle.dataset.column);
    this.#endDrag();
    event.preventDefault();
    event.stopPropagation();
    handle.focus({ preventScroll: true });
    this.#drag = {
      handle,
      index,
      pointerId: event.pointerId,
      x: event.clientX,
      width: this.#widths[index],
      total: this.#widths[index] + this.#widths[index + 1]
    };
    handle.setPointerCapture(event.pointerId);
  }
  #pointerMove(event) {
    const drag = this.#drag;
    if (this.#disposed || this.#moving || !drag || drag.pointerId !== event.pointerId)
      return;
    event.preventDefault();
    this.#move(drag.index, drag.width + event.clientX - drag.x, drag.total);
  }
  #key(event) {
    if (this.#disposed || this.#moving || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const handle = this.#handle(event.target);
    if (!handle)
      return;
    const index = Number(handle.dataset.column);
    const step = event.shiftKey ? 25 : 5;
    let width;
    if (event.key === "ArrowLeft")
      width = this.#widths[index] - step;
    else if (event.key === "ArrowRight")
      width = this.#widths[index] + step;
    else if (event.key === "Home")
      width = minimumWidth;
    else if (event.key === "End")
      width = this.#widths[index] + this.#widths[index + 1] - minimumWidth;
    else
      return;
    event.preventDefault();
    event.stopPropagation();
    this.#move(index, width);
  }
  #createHandle(index) {
    const owner = this.#table.ownerDocument;
    const handle = owner.createElement("div");
    handle.className = "document-column-resize";
    handle.dataset.column = String(index);
    handle.tabIndex = 0;
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "vertical");
    handle.setAttribute("aria-label", this.#columnLabel(index + 1, index + 2));
    this.#segments[index] = this.#grid.cells.filter(({ end }) => end === index + 1).map(({ cell }) => {
      const area = owner.createElement("span");
      handle.append(area);
      return { cell, area };
    });
    this.#viewport.append(handle);
    this.#handles.push(handle);
  }
  #refresh() {
    if (this.#moving || this.#disposed || !this.#table.getBoundingClientRect().width)
      return;
    const table = this.#table;
    if (!this.#widths.length) {
      const edges = [];
      for (const { cell, start, end } of this.#grid.cells) {
        const rect = cell.getBoundingClientRect();
        edges[start] = rect.left;
        edges[end] = rect.right;
      }
      this.#widths = Array.from({ length: this.#grid.count }, (_, index) => Math.max(minimumWidth, edges[index + 1] - edges[index]));
      const group = table.ownerDocument.createElement("colgroup");
      for (let index = 0;index < this.#grid.count; index++) {
        const column = table.ownerDocument.createElement("col");
        group.append(column);
        this.#columns.push(column);
        if (index < this.#grid.count - 1)
          this.#createHandle(index);
      }
      if (table.caption)
        table.caption.after(group);
      else
        table.prepend(group);
      table.style.tableLayout = "fixed";
      this.#writeWidths();
    }
    const rect = table.getBoundingClientRect();
    const outer = this.#viewport.getBoundingClientRect();
    const top = table.rows[0].getBoundingClientRect().top;
    const bottom = table.rows[table.rows.length - 1].getBoundingClientRect().bottom;
    let left = rect.left - outer.left + this.#viewport.scrollLeft;
    this.#handles.forEach((handle, index) => {
      left += this.#widths[index];
      handle.style.left = `${left}px`;
      handle.style.top = `${top - outer.top + this.#viewport.scrollTop}px`;
      handle.style.height = `${bottom - top}px`;
      handle.setAttribute("aria-valuemin", String(minimumWidth));
      handle.setAttribute("aria-valuemax", String(Math.round(this.#widths[index] + this.#widths[index + 1] - minimumWidth)));
      handle.setAttribute("aria-valuenow", String(Math.round(this.#widths[index])));
      for (const { cell, area } of this.#segments[index]) {
        const cellRect = cell.getBoundingClientRect();
        area.style.top = `${cellRect.top - top}px`;
        area.style.height = `${cellRect.height}px`;
      }
    });
  }
  #schedule() {
    if (this.#disposed || this.#frame || !this.#view)
      return;
    const environment = this.#environment;
    this.#frame = this.#view.requestAnimationFrame(() => {
      if (environment !== this.#environment)
        return;
      this.#frame = 0;
      this.#refresh();
    });
  }
  #bind() {
    if (this.#events || this.#disposed)
      return;
    const view = displayWindow(this.#table);
    const environment = ++this.#environment;
    this.#view = view;
    this.#events = new view.AbortController;
    const signal = this.#events.signal;
    try {
      this.#viewport.addEventListener("pointerdown", (event) => this.#startDrag(event), { signal });
      this.#viewport.addEventListener("pointermove", (event) => this.#pointerMove(event), { signal });
      this.#viewport.addEventListener("keydown", (event) => this.#key(event), { signal });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
        this.#viewport.addEventListener(type, () => this.#endDrag(), { signal });
      }
      view.addEventListener("blur", () => this.#endDrag(), { signal });
      this.#observer = new view.ResizeObserver(() => {
        if (environment === this.#environment)
          this.#schedule();
      });
      this.#observer.observe(this.#table);
      this.#schedule();
    } catch (error) {
      try {
        this.#unbind();
      } catch (failure) {
        throw new AggregateError([error, failure], "Could not release table bindings");
      }
      throw error;
    }
  }
  #unbind() {
    ++this.#environment;
    const observer = this.#observer;
    const frame = this.#frame;
    const view = this.#view;
    const events = this.#events;
    this.#observer = null;
    this.#frame = 0;
    this.#events = null;
    this.#view = null;
    const errors = [];
    try {
      observer?.disconnect();
    } catch (error) {
      errors.push(error);
    }
    try {
      if (frame)
        view?.cancelAnimationFrame(frame);
    } catch (error) {
      errors.push(error);
    }
    try {
      this.#endDrag();
    } catch (error) {
      errors.push(error);
    }
    try {
      events?.abort();
    } catch (error) {
      errors.push(error);
    }
    if (errors.length)
      throw new AggregateError(errors, "Could not release table bindings");
  }
  prepareMove() {
    if (this.#moving)
      throw new Error("The table is already being moved");
    const scroll = { left: this.#viewport.scrollLeft, top: this.#viewport.scrollTop };
    let finished = false;
    const resume = () => {
      if (finished)
        return;
      this.#bind();
      this.#viewport.scrollLeft = scroll.left;
      this.#viewport.scrollTop = scroll.top;
    };
    const rollback = () => {
      if (finished)
        return;
      try {
        this.#unbind();
        resume();
      } finally {
        this.#moving = false;
        finished = true;
      }
    };
    this.#moving = true;
    try {
      this.#unbind();
    } catch (error) {
      try {
        rollback();
      } catch (failure) {
        throw new AggregateError([error, failure], "Could not restore the table after preparation failed");
      }
      throw error;
    }
    return {
      resume,
      rollback,
      commit: () => {
        this.#moving = false;
        finished = true;
      }
    };
  }
  dispose() {
    this.#disposed = true;
    try {
      this.#unbind();
    } finally {
      this.#moving = false;
    }
  }
}
function resizeDocumentTables(root, columnLabel) {
  const controls = [];
  const dispose = () => {
    const errors = [];
    for (const control of controls) {
      try {
        control.dispose();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length)
      throw new AggregateError(errors, "Could not release document tables");
  };
  try {
    for (const table of root.querySelectorAll("table")) {
      const grid = columnGrid(table);
      if (grid)
        controls.push(new TableResize(table, grid, columnLabel));
    }
  } catch (error) {
    try {
      dispose();
    } catch (failure) {
      throw new AggregateError([error, failure], "Could not release document tables after initialization failed");
    }
    throw error;
  }
  return {
    dispose,
    prepareMove: () => {
      const moves = [];
      const rollback = () => {
        const errors = [];
        for (const move of [...moves].reverse()) {
          try {
            move.rollback();
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length)
          throw new AggregateError(errors, "Could not restore document tables");
      };
      try {
        for (const control of controls)
          moves.push(control.prepareMove());
      } catch (error) {
        try {
          rollback();
        } catch (failure) {
          throw new AggregateError([error, failure], "Could not restore document tables after preparation failed");
        }
        throw error;
      }
      return {
        resume: () => moves.forEach((move) => move.resume()),
        rollback,
        commit: () => moves.forEach((move) => move.commit())
      };
    }
  };
}
// src/component/document-content/json/render-policy.json
var render_policy_default = {
  markdown: {
    async: false,
    gfm: true
  },
  sanitizer: {
    inPlace: true,
    allowedTags: [
      "a",
      "b",
      "blockquote",
      "br",
      "caption",
      "code",
      "dd",
      "del",
      "div",
      "dl",
      "dt",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "kbd",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "samp",
      "small",
      "span",
      "strong",
      "sub",
      "sup",
      "table",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
      "ul"
    ],
    allowedAttributes: ["href", "title", "id", "name", "start", "align", "colspan", "rowspan", "data-document-image"],
    allowAriaAttributes: false,
    allowDataAttributes: false,
    sanitizeDom: true
  }
};

// src/component/document-content/index.mjs
var escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[character] || character);
var markdown = new F({
  ...render_policy_default.markdown,
  renderer: {
    image({ href, text, tokens, title }) {
      const label = tokens ? this.parser.parseInline(tokens) : escapeHtml(text);
      return `<span
        data-document-image="${escapeHtml(href)}"
        title              = "${escapeHtml(title || "")}"
      >${label}</span>`;
    },
    checkbox({ checked }) {
      return checked ? "[x] " : "[ ] ";
    }
  }
});
var sanitizeOptions = {
  IN_PLACE: render_policy_default.sanitizer.inPlace,
  ALLOWED_TAGS: render_policy_default.sanitizer.allowedTags,
  ALLOWED_ATTR: render_policy_default.sanitizer.allowedAttributes,
  ALLOW_ARIA_ATTR: render_policy_default.sanitizer.allowAriaAttributes,
  ALLOW_DATA_ATTR: render_policy_default.sanitizer.allowDataAttributes,
  SANITIZE_DOM: render_policy_default.sanitizer.sanitizeDom
};
var nextAnchorId = 0;
var documentControls = new WeakMap;
var documentLinks = new WeakMap;
function disposeDocumentContent(container) {
  try {
    documentControls.get(container)?.dispose();
  } finally {
    documentControls.delete(container);
    documentLinks.delete(container);
  }
}
function assignId(element, owner) {
  do {
    element.id = `repository-document-${++nextAnchorId}`;
  } while (owner.getElementById(element.id));
}
function isolateAnchors(root, owner) {
  const anchors = new Map([["", root]]);
  const slugger = new BananaSlug;
  assignId(root, owner);
  for (const element of root.querySelectorAll("[id], [name], h1, h2, h3, h4, h5, h6")) {
    const names = ["id", "name"].map((attribute) => {
      const value = element.getAttribute(attribute);
      element.removeAttribute(attribute);
      return value || "";
    });
    if (/^H[1-6]$/.test(element.tagName))
      names.push(slugger.slug(element.textContent || ""));
    assignId(element, owner);
    for (const name of names) {
      if (name && !anchors.has(name))
        anchors.set(name, element);
    }
  }
  return anchors;
}
function replaceImages(root, imageLabel) {
  const images = root.querySelectorAll("[data-document-image]");
  for (const image of images) {
    const label = image.textContent || imageLabel;
    if (image.closest("a")) {
      image.replaceWith(root.ownerDocument.createTextNode(label));
      continue;
    }
    const link = root.ownerDocument.createElement("a");
    link.textContent = label;
    link.setAttribute("href", image.getAttribute("data-document-image") || "");
    if (image.title)
      link.title = image.title;
    image.replaceWith(link);
  }
}
function httpUrl(value) {
  if (!/^https?:\/\//i.test(value) || /[\\\u0000-\u001f\u007f]/.test(value))
    return null;
  try {
    const url = new URL(value);
    return !url.username && !url.password && ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}
function setLinks(root, anchors, options) {
  const links = root.querySelectorAll("a[href],a[data-original-href]");
  for (const link of links) {
    const value = (link.getAttribute("data-original-href") || link.getAttribute("href") || "").trim();
    link.setAttribute("data-original-href", value);
    let href = null;
    if (value.startsWith("#")) {
      let name = value.slice(1);
      try {
        name = decodeURIComponent(name);
      } catch {}
      const target = anchors.get(name);
      if (target && options.internalLinks !== false)
        href = `#${target.id}`;
      else
        href = options.resolveHref?.(value) || null;
    } else if (value && !/[\\\u0000-\u001f\u007f]/.test(value)) {
      const resolved = options.resolveHref?.(value) || httpUrl(value)?.href;
      href = resolved && (httpUrl(resolved) || /^vscode:\/\/file\//i.test(resolved) && !/[\u0000-\u001f\u007f]/.test(resolved)) ? resolved : null;
    }
    if (href && !href.startsWith("#") && !httpUrl(href) && (!/^vscode:\/\/file\//i.test(href) || /[\u0000-\u001f\u007f]/.test(href)))
      href = null;
    if (href) {
      link.setAttribute("href", href);
      link.classList.remove("document-unavailable-link", "muted");
      if (href.startsWith("#")) {
        link.removeAttribute("target");
        link.removeAttribute("rel");
      } else {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
    } else {
      link.removeAttribute("href");
      link.classList.add("document-unavailable-link", "muted");
    }
  }
}
function bindLinks(state) {
  const { root, anchors } = state;
  root.addEventListener("click", (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return;
    const link = isElement(event.target) ? event.target.closest("a[href]") : null;
    if (!link || !root.contains(link))
      return;
    const value = link.getAttribute("data-original-href") || "";
    if (state.options.onLink?.(value, event))
      return;
    if (!(link.getAttribute("href") || "").startsWith("#"))
      return;
    const id = (link.getAttribute("href") || "").slice(1);
    const target = [...anchors.values()].find((element) => element.id === id);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ block: "start" });
    }
  });
}
function refreshDocumentLinks(container, options) {
  const state = documentLinks.get(container);
  if (!state)
    return;
  state.options = options;
  setLinks(state.root, state.anchors, options);
}
function scrollDocumentAnchor(container, fragment) {
  const state = documentLinks.get(container);
  let name = fragment;
  try {
    name = decodeURIComponent(fragment);
  } catch {}
  const target = state?.anchors.get(name);
  if (!target)
    return false;
  target.scrollIntoView({ block: "start" });
  return true;
}
function groupSections(root) {
  const stack = [{ level: 0, element: root }];
  for (const node of [...root.childNodes]) {
    const level = /^H[1-6]$/.test(node.nodeName) ? Number(node.nodeName.slice(1)) : 0;
    if (level) {
      while (stack.length > 1 && stack[stack.length - 1].level >= level)
        stack.pop();
      const section = root.ownerDocument.createElement("section");
      section.className = "document-section";
      section.dataset.level = String(level);
      stack[stack.length - 1].element.append(section);
      stack.push({ level, element: section });
    }
    stack[stack.length - 1].element.append(node);
  }
}
function sourceView(owner, content, className = "document-source primary") {
  const pre = owner.createElement("pre");
  pre.className = className;
  const code = owner.createElement("code");
  code.textContent = content;
  pre.append(code);
  return pre;
}
function renderDocumentContent(container, document2, options) {
  if (typeof document2?.content !== "string")
    throw new TypeError("Не передано содержимое документа.");
  disposeDocumentContent(container);
  const owner = container.ownerDocument;
  if (options.mode !== "html") {
    container.replaceChildren(sourceView(owner, document2.content));
    return;
  }
  const root = owner.createElement("div");
  root.className = "document-html primary";
  if (document2.format !== "markdown") {
    root.append(sourceView(owner, document2.content, "document-text"));
  } else {
    try {
      if (!purify_default.isSupported)
        throw new Error("HTML-очистка недоступна.");
      const template = owner.createElement("template");
      const staging = template.content.ownerDocument.createElement("div");
      const markup = markdown.parse(document2.content, { async: false });
      staging.innerHTML = markup;
      purify_default.sanitize(staging, sanitizeOptions);
      replaceImages(staging, options.imageLabel);
      const anchors = isolateAnchors(staging, owner);
      setLinks(staging, anchors, options);
      const links = { root: staging, anchors, options };
      bindLinks(links);
      for (const parent of staging.querySelectorAll("div, blockquote, li, dd, td, th"))
        groupSections(parent);
      groupSections(staging);
      staging.className = "document-html primary";
      container.replaceChildren(staging);
      documentLinks.set(container, links);
      documentControls.set(container, resizeDocumentTables(staging, options.columnLabel));
      if (options.anchor !== null && options.anchor !== undefined)
        scrollDocumentAnchor(container, options.anchor);
      return;
    } catch {
      const message = owner.createElement("p");
      message.className = "document-rendering-error muted";
      message.textContent = options.htmlUnavailable;
      root.append(message, sourceView(owner, document2.content));
    }
  }
  container.replaceChildren(root);
}
function prepareDocumentContent(container) {
  return documentControls.get(container)?.prepareMove() || { resume() {}, rollback() {}, commit() {} };
}

// src/component/document-failure/index.mjs
import { html as html4, nothing as nothing5 } from "lit";
function documentFailure({ label, message, icon, retry }) {
  const disabled = Boolean(retry.disabled);
  return html4`
    <section
      class       = "document-private document-error"
      aria-label  = ${label}
    >
      ${icon ? html4`<span class="loading-icon muted">${icon}</span>` : nothing5}
      ${message ? html4`<p
        class = "document-state muted"
        role  = "alert"
      >${message}</p>` : nothing5}
      <button
        type              = "button"
        class             = "document-retry control primary"
        aria-label        = ${retry.label}
        aria-keyshortcuts = "R"
        data-tooltip      = ${retry.hint}
        ?disabled         = ${disabled}
        @click            = ${retry.run}
      >${retry.icon}<span>${retry.text}</span></button>
    </section>`;
}

// src/component/document-heading/index.mjs
import { html as html5, nothing as nothing6, render as render5 } from "lit";
function showDocumentHeading(title, version, { name, label, icon, versionText, href, onOpen }) {
  title.setAttribute("aria-label", label);
  render5(html5`
      ${icon}${onOpen ? html5`<a
            class     = "node-label"
            href      = ${href || nothing6}
            target    = "_blank"
            rel       = "noopener noreferrer"
            @click    = ${onOpen}
          >${name}</a>` : html5`<span class="node-label">${name}</span>`}`, title);
  version.hidden = !versionText;
  version.textContent = versionText;
}

// src/component/document-loading/index.mjs
import { html as html6 } from "lit";
function documentLoading({ label, message, icon, images }) {
  return html6`
    <section
      class      = "document-private"
      aria-label = ${label}
    >
    ${images ? html6`<span
          class       = "github-loading-icon"
          aria-hidden = "true"
        >
          <img
            class = "brand-logo-light"
            src   = ${images.light}
            alt   = ""
          >
          <img
            class = "brand-logo-dark"
            src   = ${images.dark}
            alt   = ""
          >
        </span>` : html6`<span
        class       = "loading-icon muted"
        aria-hidden = "true"
      >${icon}</span>`}
      <p
        class = "document-state muted"
        role  = "status"
      >${message}</p>
    </section>`;
}

// src/component/document-panel/index.mjs
import { html as html7, nothing as nothing7, render as render6 } from "lit";
function readPanelDOM(root) {
  const nodes = {
    dialog: root.querySelector("#hxdoc"),
    body: root.querySelector("#docs-body"),
    title: root.querySelector("#docs-title"),
    version: root.querySelector("#docs-version"),
    resize: root.querySelector("#docs-resize"),
    toolbar: root.querySelector("#document-toolbar"),
    tabs: root.querySelector("#document-tabs"),
    sourceTabs: root.querySelector("#source-tabs"),
    sourceHost: root.querySelector("#source-host"),
    sourceRetry: root.querySelector("#source-retry-action"),
    mode: root.querySelector("#document-mode"),
    state: root.querySelector("#docs-state"),
    document: root.querySelector("#docs-document")
  };
  return Object.values(nodes).some((node) => !node) ? null : nodes;
}
function showPanelState(nodes, template, { centered = false, host }) {
  const { body, state, sourceHost, document: content } = nodes;
  disposeDocumentContent(content);
  content.replaceChildren();
  content.hidden = true;
  sourceHost.hidden = true;
  state.hidden = false;
  body.classList.toggle("is-private", centered);
  render6(template, state, { host });
}
function showDocumentMessage(state, message) {
  render6(message === null ? nothing7 : documentMessage(message), state);
}
function documentMessage(message) {
  return html7`
    <p class="document-state muted">${message}</p>
  `;
}
function showDocumentMode(button, { mode, label, icon }) {
  button.dataset.mode = mode;
  button.setAttribute("aria-label", label);
  button.dataset.tooltip = label;
  let slot = button.querySelector(".mode-pin");
  if (icon && !slot) {
    slot = button.ownerDocument.createElement("span");
    slot.className = "mode-pin";
    button.append(slot);
  }
  if (isHTMLElement(slot)) {
    slot.toggleAttribute("hidden", !icon);
    render6(icon || nothing7, slot);
  }
  for (const previous of button.querySelectorAll(".mode-source, .mode-html")) {
    previous.toggleAttribute("hidden", Boolean(icon));
  }
}
function compactDocument(content) {
  return html7`
    <div class="doc-compact">${content}</div>
  `;
}

// src/component/document-tabs/index.mjs
import { html as html8, nothing as nothing8, render as render7 } from "lit";
function renderDocumentTabs(tabs, items, controls) {
  tabs.style.setProperty("--tab-width", `calc(${Math.max(12, ...items.map((item) => item.label.length))}ch + 32px)`);
  render7(html8`
      ${items.map((item) => html8`<button
          type           = "button"
          role           = "tab"
          tabindex        = "-1"
          aria-selected   = "false"
          id              = ${item.id}
          data-document   = ${item.key}
          data-tooltip    = ${item.path}
          aria-controls   = ${controls}
          ?disabled       = ${item.disabled}
          aria-label      = ${item.disabledLabel || nothing8}
        >
          <svg
            class       = "document-lock"
            viewBox     = "0 0 24 24"
            aria-hidden = "true"
            ?hidden     = ${!item.disabled}
          >
            <rect
              x      = "5"
              y      = "10"
              width  = "14"
              height = "11"
              rx     = "2"
            />
            <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
          </svg>
          <span class="document-tab-label">${item.label}</span>
        </button>`)}`, tabs);
}
function selectDocumentTab(tabs, key) {
  tabs.querySelectorAll("button").forEach((button) => {
    const selected = button.dataset.document === key;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  const selected = tabs.querySelector('button[aria-selected="true"]');
  if (selected) {
    const strip = tabs.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    if (item.left < strip.left)
      tabs.scrollLeft += item.left - strip.left;
    else if (item.right > strip.right)
      tabs.scrollLeft += item.right - strip.right;
  }
}
function documentTabsKey(event, tabs, choose) {
  const buttons = [...tabs.querySelectorAll("button")].filter((button) => !button.disabled);
  const target = isElement(event.target) ? event.target.closest("button") : null;
  if (!target)
    return;
  let index = buttons.indexOf(target);
  if (index < 0)
    return;
  if (event.key === "ArrowRight")
    index = (index + 1) % buttons.length;
  else if (event.key === "ArrowLeft")
    index = (index - 1 + buttons.length) % buttons.length;
  else if (event.key === "Home")
    index = 0;
  else if (event.key === "End")
    index = buttons.length - 1;
  else
    return;
  event.preventDefault();
  const key = buttons[index].dataset.document;
  if (!key)
    return;
  choose(key);
  buttons[index].focus({ preventScroll: true });
}

// src/component/history/index.mjs
import { nothing as nothing9 } from "lit";

// src/component/history-controls/index.mjs
function renderHistoryControls(values, labels, actions) {
  const collect = (event) => actions.autoCollect(event.currentTarget.checked);
  const policy = (event) => actions.policy(event.currentTarget.value);
  const includeView = (event) => actions.includeView(event.currentTarget.checked);
  const limit = (event) => actions.limit(Number(event.currentTarget.value));
  return screenTemplate("history", "history-controls.historyControls", {
    collectLabel: labels.collect,
    autoCollect: values.autoCollect,
    onChange: collect,
    hidden: !values.autoCollect,
    policyLabel: labels.policy,
    policy: values.policy,
    onChange2: policy,
    selected: values.policy === "all",
    allLabel: labels.all,
    selected2: values.policy === "merge",
    mergeLabel: labels.merge,
    selected3: values.policy === "unique",
    uniqueLabel: labels.unique,
    includeView: values.includeView,
    onChange3: includeView,
    includeViewLabel: labels.includeView,
    limitLabel: labels.limit,
    value: String(values.limit),
    onChange4: limit
  });
}

// src/component/history/index.mjs
function renderHistory(container, model, actions) {
  const values = model.historyControls;
  const labels = model.labels.historyControls;
  const settings = values && labels && actions.autoCollect && actions.policy && actions.includeView && actions.limit ? renderHistoryControls(values, labels, {
    autoCollect: actions.autoCollect,
    policy: actions.policy,
    includeView: actions.includeView,
    limit: actions.limit
  }) : null;
  const exclusions = model.historyExclusions;
  const exclusionLabels = model.labels.historyExclusions;
  const controls = screenTemplate("history", "history.controls", {
    content: settings || nothing9,
    items: exclusions && exclusionLabels && actions.unblockRepository ? screenTemplate("history", "history.historyExclusions", {
      labelLabel: exclusionLabels.label,
      content: exclusions.repositories.length,
      items: exclusions.repositories.length ? screenTemplate("history", "history.historyExclusionList", {
        items: exclusions.repositories.map((repository) => screenTemplate("history", "history.historyExclusionRow", {
          name: repository.name,
          ariaLabel: `${exclusionLabels.unblock} · ${repository.name}`,
          unblockLabel: exclusionLabels.unblock,
          onUnblockRepository: () => actions.unblockRepository?.(repository.id)
        }))
      }) : screenTemplate("history", "history.muted", {
        emptyLabel: exclusionLabels.empty
      })
    }) : nothing9
  });
  return renderCollection(container, { ...model, controls, tree: false, historyGroups: true }, actions);
}

// src/component/navigation-actions/index.mjs
import { render as render8 } from "lit";
function readNavigationActions(root) {
  const nodes = {
    back: root.querySelector("#docs-history-back"),
    forward: root.querySelector("#docs-history-forward"),
    manualHistory: root.querySelector("#docs-history-manual"),
    refresh: root.querySelector("#docs-refresh"),
    linkMode: root.querySelector("#docs-link-mode"),
    bookmarks: root.querySelector("#docs-bookmarks"),
    search: root.querySelector("#docs-search")
  };
  return Object.values(nodes).some((node) => !node) ? null : nodes;
}
function showNavigationActions(nodes, model) {
  nodes.back.disabled = !model.canBack && !model.canHistory;
  nodes.forward.disabled = !model.canForward && !model.canHistory;
  nodes.back.dataset.stepAvailable = String(model.canBack);
  nodes.forward.dataset.stepAvailable = String(model.canForward);
  nodes.manualHistory.hidden = model.manualHistoryMode === null;
  nodes.manualHistory.disabled = !model.canManualHistory;
  nodes.manualHistory.setAttribute("aria-label", model.manualHistoryLabel);
  nodes.manualHistory.dataset.tooltip = model.manualHistoryLabel;
  const historySlot = nodes.manualHistory.querySelector("[data-control]");
  if (isHTMLElement(historySlot))
    render8(model.manualHistoryIcon, historySlot);
  nodes.refresh.disabled = !model.canRefresh;
  nodes.linkMode.setAttribute("aria-label", model.linkLabel);
  nodes.linkMode.dataset.tooltip = model.linkTooltip;
  const slot = nodes.linkMode.querySelector("[data-control]");
  if (isHTMLElement(slot))
    render8(model.linkIcon, slot);
}
function showActionVisibility(menu) {
  for (const item of menu.querySelectorAll(":scope > li")) {
    const button = item.querySelector(":scope > button");
    if (isHTMLElement(item) && isHTMLElement(button))
      item.hidden = button.hidden;
  }
}

// src/component/organization-root-control/index.mjs
function renderOrganizationRootControl(model) {
  const id = model.id || "organization-root";
  const save = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.querySelector("input");
    if (!input || !model.save)
      return;
    input.setCustomValidity("");
    if (!model.save(input.value)) {
      input.setCustomValidity(model.invalidMessage || model.message);
      input.reportValidity();
    }
  };
  const reset = (event) => {
    const button = event.currentTarget;
    const input = button.form?.querySelector("input");
    model.reset?.();
    if (input) {
      input.value = "";
      input.setCustomValidity("");
    }
  };
  const edited = (event) => {
    event.currentTarget.setCustomValidity("");
  };
  return screenTemplate("preferences", "organization-root-control.organizationControl", {
    ariaLabelledby: `${id}-label`,
    onSubmit: save,
    id,
    label: model.label,
    placeholder: model.placeholder,
    value: model.value,
    ariaDescribedby: `${id}-hint ${id}-status`,
    onChange: model.onChange,
    onInput: edited,
    id2: `${id}-hint`,
    hint: model.hint,
    id3: `${id}-status`,
    message: model.message,
    saveContent: model.save && model.reset ? screenTemplate("preferences", "organization-root-control.organizationActions", {
      saveLabel: model.saveLabel,
      saveIcon: model.saveIcon,
      resetLabel: model.resetLabel,
      onClick: reset,
      resetIcon: model.resetIcon
    }) : ""
  });
}

// src/component/outline-document/index.mjs
import { html as html9, nothing as nothing10 } from "lit";
function outlineDocument({ heading, text, children }) {
  return html9`
    <section class="doc-section">
      ${heading ? html9`
          <h3
            class      = "doc-heading label-row"
            aria-label = ${heading.label || nothing10}
          >
            ${heading.icon}${heading.onOpen ? html9`
                <a
                  class                = "node-label"
                  href                 = ${heading.href || nothing10}
                  target               = "_blank"
                  rel                  = "noopener noreferrer"
                  data-material-target = ${heading.target || nothing10}
                  @click               = ${heading.onOpen}
                >${heading.name}</a>
              ` : html9`<span class="node-label">${heading.name}</span>`}
          </h3>
        ` : nothing10}
      ${text.trim() ? html9`<p class="doc-copy muted">${text}</p>` : nothing10}
      ${children.length ? html9`<div class="doc-children">${children}</div>` : nothing10}
    </section>
  `;
}

// src/component/panel-resize/index.mjs
class PanelWidth {
  #dialog;
  #handle;
  #width;
  #rules;
  #formatWidth;
  #pointer = null;
  #workspace = null;
  #view = null;
  #events = null;
  #observer = null;
  #observedWidth = null;
  #appliedWidth = null;
  #frame = 0;
  #enabled = false;
  #finishAnimation = () => {};
  constructor(dialog, handle, rules, formatWidth) {
    this.#dialog = dialog;
    this.#handle = handle;
    this.#rules = rules;
    this.#width = rules.initial;
    this.#formatWidth = formatWidth;
  }
  bind(view, workspace, finishAnimation) {
    this.stop();
    this.#view = view;
    this.#workspace = workspace;
    this.#finishAnimation = finishAnimation;
    const events = new view.AbortController;
    this.#events = events;
    const signal = events.signal;
    this.#handle.addEventListener("pointerdown", (event) => this.#start(event), { signal });
    this.#handle.addEventListener("pointermove", (event) => this.#move(event), { signal });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      this.#handle.addEventListener(type, () => this.#end(), { signal });
    }
    this.#handle.addEventListener("keydown", (event) => this.#key(event), { signal });
    view.addEventListener("blur", () => this.#end(), { signal });
    this.#observer = new view.ResizeObserver(([entry]) => this.#measure(entry.contentRect.width, events));
    this.#observer.observe(workspace);
  }
  setEnabled(enabled) {
    this.#enabled = enabled;
    if (enabled)
      this.apply();
    else
      this.#end();
  }
  apply(value = this.#width, workspaceWidth = this.#workspace?.clientWidth || 0) {
    if (!workspaceWidth)
      return;
    const minimum = Math.min(this.#rules.minimumPixels, workspaceWidth * this.#rules.minimumFraction) / workspaceWidth;
    this.#width = Math.min(this.#rules.maximum, Math.max(minimum, value));
    const percent = `${this.#width * 100}%`;
    if (this.#dialog.style.getPropertyValue("--docs-width") !== percent) {
      this.#dialog.style.setProperty("--docs-width", percent);
    }
    const attributes = {
      "aria-valuemin": Math.round(minimum * 100),
      "aria-valuemax": Math.round(this.#rules.maximum * 100),
      "aria-valuenow": Math.round(this.#width * 100),
      "aria-valuetext": this.#formatWidth(Math.round(this.#width * 100))
    };
    for (const [name, text] of Object.entries(attributes)) {
      if (this.#handle.getAttribute(name) !== String(text))
        this.#handle.setAttribute(name, String(text));
    }
  }
  stop() {
    this.#end();
    this.#events?.abort();
    this.#events = null;
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#frame)
      this.#view?.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#observedWidth = this.#appliedWidth = null;
    this.#workspace = null;
    this.#view = null;
    this.#enabled = false;
    this.#finishAnimation = () => {};
  }
  #start(event) {
    if (!this.#enabled || !this.#dialog.open || !this.#workspace || !event.isPrimary || event.button !== 0)
      return;
    this.#finishAnimation();
    event.preventDefault();
    this.#pointer = { pointerId: event.pointerId, x: event.clientX, width: this.#width * this.#workspace.clientWidth };
    this.#handle.setPointerCapture(event.pointerId);
    this.#handle.focus({ preventScroll: true });
  }
  #move(event) {
    if (this.#pointer && event.pointerId === this.#pointer.pointerId && this.#workspace?.clientWidth) {
      this.apply((this.#pointer.width + this.#pointer.x - event.clientX) / this.#workspace.clientWidth);
    }
  }
  #end() {
    if (!this.#pointer)
      return;
    const id = this.#pointer.pointerId;
    this.#pointer = null;
    if (this.#handle.hasPointerCapture(id))
      this.#handle.releasePointerCapture(id);
  }
  #key(event) {
    if (!this.#enabled || !this.#dialog.open || !this.#workspace?.clientWidth || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const step = (event.shiftKey ? this.#rules.largeKeyStepPixels : this.#rules.keyStepPixels) / this.#workspace.clientWidth;
    let value;
    if (event.key === "ArrowLeft")
      value = this.#width + step;
    else if (event.key === "ArrowRight")
      value = this.#width - step;
    else if (event.key === "Home")
      value = 0;
    else if (event.key === "End")
      value = 1;
    else
      return;
    this.#finishAnimation();
    this.apply(value);
    event.preventDefault();
  }
  #measure(width, binding) {
    if (this.#events !== binding || width === this.#observedWidth)
      return;
    this.#observedWidth = width;
    if (this.#frame || !this.#view)
      return;
    const view = this.#view;
    this.#frame = view.requestAnimationFrame(() => {
      if (this.#events !== binding)
        return;
      this.#frame = 0;
      const measured = this.#observedWidth;
      if (measured === null || measured === this.#appliedWidth)
        return;
      this.#appliedWidth = measured;
      this.#end();
      if (this.#enabled)
        this.apply(this.#width, measured);
    });
  }
}

// src/component/search/drag.mjs
function bindSearchDrag(popup, signal) {
  const owner = popup.ownerDocument;
  const view = owner.defaultView;
  if (!view || signal.aborted)
    return () => {};
  let drag = null;
  let offset = 0;
  let suppressClick = false;
  let disposed = false;
  const paint = () => {
    if (offset)
      popup.style.setProperty("--search-drag-y", `${offset}px`);
    else
      popup.style.removeProperty("--search-drag-y");
  };
  const finish = (commit) => {
    const current = drag;
    if (!current)
      return;
    drag = null;
    suppressClick = current.moving || !commit;
    popup.removeAttribute("data-search-dragging");
    if (!commit) {
      offset = current.offset;
      paint();
    }
    try {
      if (popup.hasPointerCapture(current.pointerId))
        popup.releasePointerCapture(current.pointerId);
    } catch {}
  };
  const start = (event) => {
    finish(false);
    if (event.isPrimary && event.button === 0)
      suppressClick = false;
    if (disposed || !event.isPrimary || event.button !== 0 || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !isElement(event.target) || !event.target.closest("form.navigation-search") || event.target.closest("input,textarea,select,button,a,label,[contenteditable]"))
      return;
    const bounds = popup.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      y: event.clientY,
      offset,
      top: bounds.top,
      bottom: bounds.bottom,
      moving: false
    };
    event.preventDefault();
    try {
      popup.setPointerCapture(event.pointerId);
    } catch {}
  };
  const move = (event) => {
    if (!drag || event.pointerId !== drag.pointerId)
      return;
    const delta = event.clientY - drag.y;
    if (!drag.moving && Math.abs(delta) < 15)
      return;
    drag.moving = true;
    popup.setAttribute("data-search-dragging", "");
    event.preventDefault();
    offset = drag.offset + Math.max(-drag.top, Math.min(view.innerHeight - drag.bottom, delta));
    paint();
  };
  const release = (event) => {
    if (event.pointerId !== drag?.pointerId)
      return;
    move(event);
    finish(true);
  };
  const cancel = (event) => {
    if (event.pointerId === drag?.pointerId)
      finish(false);
  };
  const click = (event) => {
    if (!suppressClick || event.detail === 0)
      return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };
  const interrupted = () => finish(false);
  const dispose = () => {
    if (disposed)
      return;
    disposed = true;
    finish(false);
    offset = 0;
    suppressClick = false;
    paint();
    popup.removeEventListener("pointerdown", start);
    popup.removeEventListener("lostpointercapture", cancel);
    popup.removeEventListener("click", click, true);
    owner.removeEventListener("pointermove", move);
    owner.removeEventListener("pointerup", release);
    owner.removeEventListener("pointercancel", cancel);
    view.removeEventListener("blur", interrupted);
    view.removeEventListener("resize", interrupted);
    signal.removeEventListener("abort", dispose);
  };
  popup.addEventListener("pointerdown", start, { signal });
  popup.addEventListener("lostpointercapture", cancel, { signal });
  popup.addEventListener("click", click, { signal, capture: true });
  owner.addEventListener("pointermove", move, { signal, passive: false });
  owner.addEventListener("pointerup", release, { signal });
  owner.addEventListener("pointercancel", cancel, { signal });
  view.addEventListener("blur", interrupted, { signal });
  view.addEventListener("resize", interrupted, { signal });
  signal.addEventListener("abort", dispose, { once: true });
  return dispose;
}

// src/component/source-tabs/index.mjs
function labelSourceTabs(tabs, labels) {
  const buttons = tabs.querySelectorAll("button");
  if (buttons.length !== labels.length)
    return;
  buttons.forEach((button, index) => {
    button.textContent = labels[index];
  });
}
function selectSourceTab(tabs, body, mode) {
  tabs.querySelectorAll("button").forEach((button) => {
    const selected = button.dataset.sourceTab === mode;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected)
      body.setAttribute("aria-labelledby", button.id);
  });
  body.setAttribute("role", "tabpanel");
}
function sourceTabsKey(event, tabs, choose) {
  const buttons = [...tabs.querySelectorAll("button")];
  const target = isElement(event.target) ? event.target.closest("button") : null;
  if (!target || !buttons.includes(target))
    return;
  let index = buttons.indexOf(target);
  if (event.key === "ArrowRight")
    index = (index + 1) % buttons.length;
  else if (event.key === "ArrowLeft")
    index = (index - 1 + buttons.length) % buttons.length;
  else if (event.key === "Home")
    index = 0;
  else if (event.key === "End")
    index = buttons.length - 1;
  else
    return;
  event.preventDefault();
  choose(buttons[index].dataset.sourceTab);
  buttons[index].focus();
}

// src/component/source-view/bookmark-drag.mjs
function bindSourceBookmarkDrag(host, callbacks, signal) {
  const owner = host.ownerDocument;
  const view = owner.defaultView;
  if (!view || signal.aborted)
    return () => {};
  let press = null;
  let suppressClick = false;
  let disposed = false;
  const end = (released) => {
    const current = press;
    if (!current)
      return;
    press = null;
    suppressClick = current.dragged || !released;
    host.removeAttribute("data-bookmark-dragging");
    try {
      if (released && current.dragged)
        callbacks.finish();
      else
        callbacks.cancel();
    } finally {
      try {
        if (current.marker.hasPointerCapture(current.pointerId)) {
          current.marker.releasePointerCapture(current.pointerId);
        }
      } catch {}
    }
  };
  const newPress = (event) => {
    end(false);
    if (event.isPrimary && event.button === 0)
      suppressClick = false;
  };
  const start = (event) => {
    if (disposed || !event.isPrimary || event.button !== 0 || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !isElement(event.target))
      return;
    const marker = event.target.closest("button[data-bookmark-line]");
    if (!isHTMLElement(marker) || !host.contains(marker))
      return;
    const raw = marker.getAttribute("data-bookmark-line");
    if (!raw || !/^[1-9]\d*$/.test(raw))
      return;
    const line = Number(raw);
    const gutter = host.querySelector("[data-source-gutter]");
    if (!Number.isSafeInteger(line) || !gutter)
      return;
    const height = parseFloat(view.getComputedStyle(gutter).lineHeight);
    if (!Number.isFinite(height) || height <= 0 || !callbacks.start(line))
      return;
    if (disposed || signal.aborted || host.ownerDocument !== owner) {
      callbacks.cancel();
      return;
    }
    press = {
      marker,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      threshold: height / 2,
      dragged: false
    };
    event.preventDefault();
    try {
      marker.setPointerCapture(event.pointerId);
    } catch {}
  };
  const move = (event) => {
    const current = press;
    if (!current || event.pointerId !== current.pointerId)
      return;
    if (!current.dragged && Math.max(Math.abs(event.clientX - current.x), Math.abs(event.clientY - current.y)) < current.threshold)
      return;
    current.dragged = true;
    host.setAttribute("data-bookmark-dragging", "");
    event.preventDefault();
    callbacks.move(event.clientX, event.clientY);
  };
  const release = (event) => {
    if (event.pointerId !== press?.pointerId)
      return;
    move(event);
    end(true);
  };
  const cancel = (event) => {
    if (event.pointerId === press?.pointerId)
      end(false);
  };
  const lost = (event) => {
    if (event.pointerId === press?.pointerId && press.marker.isConnected)
      end(false);
  };
  const click = (event) => {
    if (!suppressClick || event.detail === 0)
      return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };
  const blur = () => end(false);
  const dispose = () => {
    if (disposed)
      return;
    disposed = true;
    try {
      end(false);
    } finally {
      suppressClick = false;
      host.removeEventListener("pointerdown", start);
      host.removeEventListener("lostpointercapture", lost);
      owner.removeEventListener("pointerdown", newPress, true);
      owner.removeEventListener("pointermove", move);
      owner.removeEventListener("pointerup", release);
      owner.removeEventListener("pointercancel", cancel);
      owner.removeEventListener("click", click, true);
      view.removeEventListener("blur", blur);
      signal.removeEventListener("abort", dispose);
    }
  };
  host.addEventListener("pointerdown", start, { signal });
  host.addEventListener("lostpointercapture", lost, { signal });
  owner.addEventListener("pointerdown", newPress, { signal, capture: true });
  owner.addEventListener("pointermove", move, { signal, passive: false });
  owner.addEventListener("pointerup", release, { signal });
  owner.addEventListener("pointercancel", cancel, { signal });
  owner.addEventListener("click", click, { signal, capture: true });
  view.addEventListener("blur", blur, { signal });
  signal.addEventListener("abort", dispose, { once: true });
  return dispose;
}

// src/bloc/document/journal.mjs
var storageKey = "site-navigation-journal-v1";
var defaultGroup = "default";
function initialHistorySettings() {
  return { autoCollect: true, policy: "merge", includeView: false, limit: 50 };
}
function historyFileKey(target) {
  const origin = [target.origin.kind, target.origin.id, target.origin.url.toLowerCase()];
  if (target.kind === "repository")
    return JSON.stringify([...origin, "repository"]);
  const path = target.kind === "directory" ? target.readmePath || target.path : target.path;
  const kind = target.kind === "directory" && target.readmePath === null ? "directory" : "file";
  return JSON.stringify([...origin, kind, target.ref, path]);
}
function historyRepositoryKey(origin) {
  return JSON.stringify([origin.kind, origin.id, origin.url.toLowerCase()]);
}
function emptyState() {
  return {
    version: 1,
    history: [],
    bookmarks: [],
    cursor: null,
    lastBookmark: null,
    bookmarkTree: false,
    historySettings: initialHistorySettings(),
    bookmarkGroups: [{ id: defaultGroup, name: "Bookmarks" }],
    currentGroup: defaultGroup,
    historyExclusions: []
  };
}
function record2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text2(value, limit) {
  return typeof value === "string" && value.length > 0 && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value);
}
function entryId(value) {
  return typeof value === "string" && /^[a-z\d-]{1,100}$/i.test(value);
}
function readHistorySettings(value) {
  if (value === undefined)
    return initialHistorySettings();
  if (!record2(value) || typeof value.autoCollect !== "boolean" || typeof value.includeView !== "boolean" || value.policy !== "all" && value.policy !== "merge" && value.policy !== "unique" || typeof value.limit !== "number" || !Number.isInteger(value.limit) || value.limit < 1 || value.limit > 500)
    return null;
  return { autoCollect: value.autoCollect, policy: value.policy, includeView: value.includeView, limit: value.limit };
}
function readEntry(value) {
  if (!record2(value) || !entryId(value.id) || !record2(value.title) || !record2(value.reading))
    return null;
  const target = readMaterialTarget(value.target);
  const title = value.title;
  const reading = value.reading;
  if (!target || typeof title.type !== "string" || !["repository", "directory", "file", "symbol"].includes(title.type) || !text2(title.name, 1024) || title.kind !== undefined && !text2(title.kind, 100) || typeof reading.mode !== "string" || !["html", "source"].includes(reading.mode) || ![null, "documentation", "source"].includes(reading.sourceMode) || reading.type !== null && !text2(reading.type, 1024) || typeof reading.scrollTop !== "number" || !Number.isFinite(reading.scrollTop) || reading.scrollTop < 0 || typeof reading.scrollLeft !== "number" || !Number.isFinite(reading.scrollLeft) || reading.scrollLeft < 0)
    return null;
  return {
    id: value.id,
    target,
    title: {
      type: title.type,
      name: title.name,
      ...typeof title.kind === "string" ? { kind: title.kind } : {}
    },
    reading: {
      mode: reading.mode === "source" ? "source" : "html",
      sourceMode: reading.sourceMode === "source" ? "source" : reading.sourceMode === "documentation" ? "documentation" : null,
      type: reading.type === null ? null : reading.type,
      scrollTop: reading.scrollTop,
      scrollLeft: reading.scrollLeft
    }
  };
}
function readTransferEntry(value) {
  if (!record2(value))
    return null;
  const entry = readEntry({ ...value, id: "transfer" });
  return entry ? { target: entry.target, title: entry.title, reading: entry.reading } : null;
}
function readTransferEntries(value) {
  if (!Array.isArray(value))
    return null;
  const entries = [];
  for (const raw of value) {
    const entry = readTransferEntry(raw);
    if (!entry)
      return null;
    entries.push(entry);
  }
  return entries;
}
function readBookmarkTransfer(value) {
  if (!record2(value) || value.version !== 1)
    return null;
  const sources = value.type === "bookmark-group" ? [value.group] : value.type === "bookmark-groups" && Array.isArray(value.groups) ? value.groups : null;
  if (!sources || !sources.length)
    return null;
  const groups = [];
  const names = new Set;
  const targets = new Set;
  for (const source of sources) {
    if (!record2(source) || !text2(source.name, 100) || source.name !== source.name.trim() || names.has(source.name)) {
      return null;
    }
    const bookmarks = readTransferEntries(source.bookmarks);
    if (!bookmarks)
      return null;
    for (const entry of bookmarks) {
      const key = targetKey(entry.target);
      if (targets.has(key))
        return null;
      targets.add(key);
    }
    names.add(source.name);
    groups.push({ name: source.name, bookmarks });
  }
  return value.type === "bookmark-group" ? { version: 1, type: "bookmark-group", group: groups[0] } : { version: 1, type: "bookmark-groups", groups };
}
function readHistoryTransfer(value) {
  if (!record2(value) || value.version !== 1 || value.type !== "history" || !("searchQueries" in value))
    return null;
  const history = readTransferEntries(value.history);
  if (!history || value.cursor !== null && (typeof value.cursor !== "number" || !Number.isInteger(value.cursor) || value.cursor < 0 || value.cursor >= history.length))
    return null;
  return { version: 1, type: "history", history, cursor: value.cursor, searchQueries: value.searchQueries };
}
function transferEntry(entry) {
  const clean = readTransferEntry(entry);
  if (!clean)
    throw new Error("Invalid navigation metadata");
  return clean;
}
function readState(value) {
  if (!record2(value) || value.version !== 1 || !Array.isArray(value.history) || !Array.isArray(value.bookmarks) || typeof value.bookmarkTree !== "boolean")
    return null;
  const read = (entries) => {
    const result = [];
    const ids = new Set;
    for (const source of entries) {
      const entry = readEntry(source);
      if (!entry || ids.has(entry.id))
        return null;
      ids.add(entry.id);
      result.push(entry);
    }
    return result;
  };
  const history = read(value.history);
  const bookmarks = read(value.bookmarks);
  const historySettings = readHistorySettings(value.historySettings);
  const bookmarkGroups = [];
  if (value.bookmarkGroups === undefined)
    bookmarkGroups.push({ id: defaultGroup, name: "Bookmarks" });
  else {
    if (!Array.isArray(value.bookmarkGroups) || !value.bookmarkGroups.length)
      return null;
    for (const group of value.bookmarkGroups) {
      if (!record2(group) || !entryId(group.id) || !text2(group.name, 100) || bookmarkGroups.some((item) => item.id === group.id))
        return null;
      bookmarkGroups.push({ id: group.id, name: group.name });
    }
  }
  const currentGroup = value.currentGroup === undefined ? defaultGroup : value.currentGroup;
  if (!entryId(currentGroup) || !bookmarkGroups.some((group) => group.id === currentGroup))
    return null;
  if (bookmarks) {
    for (let index = 0;index < bookmarks.length; index++) {
      const raw = value.bookmarks[index];
      const groupId = record2(raw) && raw.groupId !== undefined ? raw.groupId : defaultGroup;
      if (!entryId(groupId) || !bookmarkGroups.some((group) => group.id === groupId))
        return null;
      bookmarks[index].groupId = groupId;
    }
  }
  const historyExclusions = [];
  if (value.historyExclusions !== undefined) {
    if (!Array.isArray(value.historyExclusions))
      return null;
    for (const raw of value.historyExclusions) {
      if (!record2(raw) || !text2(raw.name, 1024))
        return null;
      const origin = readMaterialOrigin(raw.origin);
      if (!origin || historyExclusions.some((item) => historyRepositoryKey(item.origin) === historyRepositoryKey(origin)))
        return null;
      historyExclusions.push({ origin, name: raw.name });
    }
  }
  if (!history || !bookmarks || !historySettings || value.cursor !== null && (!entryId(value.cursor) || !history.some((entry) => entry.id === value.cursor)) || value.lastBookmark !== null && (!entryId(value.lastBookmark) || !bookmarks.some((entry) => entry.id === value.lastBookmark))) {
    return null;
  }
  return {
    version: 1,
    history,
    bookmarks,
    cursor: value.cursor,
    lastBookmark: value.lastBookmark,
    bookmarkTree: value.bookmarkTree,
    historySettings,
    bookmarkGroups,
    currentGroup,
    historyExclusions
  };
}

class NavigationJournal {
  #state = emptyState();
  #storage;
  #failure = null;
  #blockedWrite = false;
  constructor(storage) {
    this.#storage = storage;
    this.reload();
  }
  get history() {
    return this.#state.history;
  }
  get bookmarks() {
    return this.#state.bookmarks;
  }
  get cursor() {
    return this.#state.cursor;
  }
  get bookmarkTree() {
    return this.#state.bookmarkTree;
  }
  get historySettings() {
    return { ...this.#state.historySettings };
  }
  get historyExclusions() {
    return this.#state.historyExclusions.map((item) => ({ ...item, origin: { ...item.origin } }));
  }
  repositoryExcluded(origin) {
    const key = historyRepositoryKey(origin);
    return this.#state.historyExclusions.some((item) => historyRepositoryKey(item.origin) === key);
  }
  setRepositoryExcluded(value, excluded, name) {
    const origin = readMaterialOrigin(value);
    if (!origin || !text2(name, 1024))
      return false;
    const key = historyRepositoryKey(origin);
    this.#state.historyExclusions = this.#state.historyExclusions.filter((item) => historyRepositoryKey(item.origin) !== key);
    if (excluded)
      this.#state.historyExclusions.push({ origin, name });
    this.#save();
    return true;
  }
  unblockRepository(id) {
    const current = this.#state.historyExclusions.find((item) => historyRepositoryKey(item.origin) === id);
    return current ? this.setRepositoryExcluded(current.origin, false, current.name) : false;
  }
  get bookmarkGroups() {
    return this.#state.bookmarkGroups.map((group) => ({ ...group }));
  }
  get currentGroup() {
    return this.#state.currentGroup;
  }
  setHistorySettings(changes) {
    if (!record2(changes))
      return false;
    const settings = readHistorySettings({ ...this.#state.historySettings, ...changes });
    if (!settings)
      return false;
    const changedLimit = settings.limit !== this.#state.historySettings.limit;
    this.#state.historySettings = settings;
    if (changedLimit)
      this.#limitHistory();
    this.#save();
    return true;
  }
  clearHistory() {
    this.#state.history = [];
    this.#state.cursor = null;
    this.#save();
  }
  #limitHistory() {
    const excess = this.#state.history.length - this.#state.historySettings.limit;
    if (excess > 0)
      this.#state.history.splice(0, excess);
    if (this.#state.cursor && !this.historyEntry(this.#state.cursor))
      this.#state.cursor = null;
  }
  selectGroup(id) {
    if (!this.#state.bookmarkGroups.some((group) => group.id === id))
      return false;
    this.#state.currentGroup = id;
    this.#save();
    return true;
  }
  createGroup(value) {
    const name = typeof value === "string" ? value.trim() : "";
    if (!text2(name, 100) || this.#state.bookmarkGroups.some((group) => group.name === name))
      return null;
    const group = { id: crypto.randomUUID(), name };
    this.#state.bookmarkGroups.push(group);
    this.#state.currentGroup = group.id;
    this.#save();
    return { ...group };
  }
  renameGroup(id, value) {
    const group = this.#state.bookmarkGroups.find((item) => item.id === id);
    const name = typeof value === "string" ? value.trim() : "";
    if (!group || !text2(name, 100) || this.#state.bookmarkGroups.some((item) => item.id !== id && item.name === name)) {
      return false;
    }
    group.name = name;
    this.#save();
    return true;
  }
  deleteGroup(id) {
    if (this.#state.bookmarkGroups.length < 2 || !this.#state.bookmarkGroups.some((group) => group.id === id))
      return false;
    this.#state.bookmarkGroups = this.#state.bookmarkGroups.filter((group) => group.id !== id);
    this.#state.bookmarks = this.#state.bookmarks.filter((entry) => entry.groupId !== id);
    if (!this.#state.bookmarks.some((entry) => entry.id === this.#state.lastBookmark))
      this.#state.lastBookmark = null;
    if (this.#state.currentGroup === id)
      this.#state.currentGroup = this.#state.bookmarkGroups[0].id;
    this.#save();
    return true;
  }
  exportBookmarks(all = false) {
    const groups = this.#state.bookmarkGroups.filter((group) => all || group.id === this.#state.currentGroup).map((group) => ({
      name: group.name,
      bookmarks: this.#state.bookmarks.filter((entry) => entry.groupId === group.id).map(transferEntry)
    }));
    return all ? { version: 1, type: "bookmark-groups", groups } : { version: 1, type: "bookmark-group", group: groups[0] };
  }
  importBookmarks(value, mode) {
    if (mode !== "merge" && mode !== "replace")
      return false;
    const incoming = readBookmarkTransfer(value);
    if (!incoming)
      return false;
    const all = incoming.type === "bookmark-groups";
    const sources = incoming.type === "bookmark-group" ? [incoming.group] : incoming.groups;
    const groups = all && mode === "replace" ? [] : this.bookmarkGroups;
    const destination = !all ? groups.find((group) => group.name === sources[0].name) : null;
    const bookmarks = mode === "merge" ? [...this.#state.bookmarks] : all ? [] : this.#state.bookmarks.filter((entry) => entry.groupId !== destination?.id);
    const targets = new Set(bookmarks.map((entry) => targetKey(entry.target)));
    let selectedGroup = this.#state.currentGroup;
    for (const source of sources) {
      let group = groups.find((item) => item.name === source.name);
      if (!group) {
        group = { id: crypto.randomUUID(), name: source.name };
        groups.push(group);
      }
      if (!all)
        selectedGroup = group.id;
      for (const entry of source.bookmarks) {
        const key = targetKey(entry.target);
        if (targets.has(key))
          continue;
        targets.add(key);
        bookmarks.push({ ...entry, id: crypto.randomUUID(), groupId: group.id });
      }
    }
    this.#state = {
      ...this.#state,
      bookmarks,
      bookmarkGroups: groups,
      currentGroup: groups.some((group) => group.id === selectedGroup) ? selectedGroup : groups[0].id,
      lastBookmark: bookmarks.some((entry) => entry.id === this.#state.lastBookmark) ? this.#state.lastBookmark : null
    };
    this.#save();
    return true;
  }
  exportHistory(queries) {
    const cursor = this.#state.history.findIndex((entry) => entry.id === this.#state.cursor);
    return {
      version: 1,
      type: "history",
      history: this.#state.history.map(transferEntry),
      cursor: cursor < 0 ? null : cursor,
      searchQueries: [...queries]
    };
  }
  importHistory(value) {
    const incoming = readHistoryTransfer(value);
    if (!incoming)
      return false;
    const history = incoming.history.map((entry) => ({ ...entry, id: crypto.randomUUID() }));
    this.#state.history = history;
    this.#state.cursor = incoming.cursor === null ? null : history[incoming.cursor].id;
    this.#save();
    return true;
  }
  assignGroup(id, groupId) {
    const entry = this.#state.bookmarks.find((item) => item.id === id);
    if (!entry || !this.#state.bookmarkGroups.some((group) => group.id === groupId))
      return false;
    entry.groupId = groupId;
    this.#save();
    return true;
  }
  get failure() {
    return this.#failure;
  }
  reload() {
    try {
      if (!this.#storage)
        throw new Error("Browser storage is unavailable");
      const source = this.#storage.getItem(storageKey);
      let parsed;
      try {
        parsed = source === null ? null : JSON.parse(source);
      } catch {
        this.#failure = "corrupt";
        this.#blockedWrite = true;
        return;
      }
      const state = source === null ? emptyState() : readState(parsed);
      if (!state) {
        this.#failure = "corrupt";
        this.#blockedWrite = true;
        return;
      }
      this.#state = state;
      this.#failure = null;
      this.#blockedWrite = false;
    } catch {
      this.#failure = "storage";
      this.#blockedWrite = true;
    }
  }
  retryStorage() {
    if (this.#blockedWrite)
      this.reload();
    else
      this.#save();
  }
  discardStored() {
    this.#state = emptyState();
    this.#blockedWrite = false;
    this.#save();
  }
  #save() {
    if (this.#blockedWrite)
      return;
    try {
      if (!this.#storage)
        throw new Error("Browser storage is unavailable");
      this.#storage.setItem(storageKey, JSON.stringify(this.#state));
      this.#failure = null;
    } catch {
      this.#failure = "storage";
    }
  }
  historyEntry(id) {
    return this.#state.history.find((entry) => entry.id === id) || null;
  }
  bookmarkFor(target) {
    const key = targetKey(target);
    return this.#state.bookmarks.find((entry) => targetKey(entry.target) === key) || null;
  }
  adjacentHistory(direction) {
    const index = this.#state.history.findIndex((entry) => entry.id === this.#state.cursor);
    if (index < 0)
      return direction === -1 ? this.#state.history.at(-1) || null : null;
    return this.#state.history[index + direction] || null;
  }
  accept(data, visit = "push", recordId, { force = false, view = false } = {}) {
    const current = this.#state.history.findIndex((entry) => entry.id === this.#state.cursor);
    const key = historyFileKey(data.target);
    let accepted = null;
    if (visit === "restore") {
      const restored = recordId && this.historyEntry(recordId);
      if (!restored)
        return null;
      this.#state.cursor = restored.id;
      accepted = restored;
    } else if (visit === "replace" || view && !this.#state.historySettings.includeView) {
      const entry = recordId === undefined ? current >= 0 ? this.#state.history[current] : null : recordId ? this.historyEntry(recordId) : null;
      if (!entry || historyFileKey(entry.target) !== key)
        return null;
      Object.assign(entry, data);
      accepted = entry;
    } else if (current >= 0 && targetKey(this.#state.history[current].target) === targetKey(data.target) && (!this.#state.historySettings.includeView || this.#state.history[current].reading.mode === data.reading.mode && this.#state.history[current].reading.sourceMode === data.reading.sourceMode)) {
      accepted = this.#state.history[current];
      Object.assign(accepted, data);
    } else if (!force && (!this.#state.historySettings.autoCollect || this.repositoryExcluded(data.target.origin))) {
      this.#state.cursor = null;
    } else {
      const policy = this.#state.historySettings.policy;
      if (policy === "merge" && current >= 0 && historyFileKey(this.#state.history[current].target) === key) {
        accepted = this.#state.history[current];
        Object.assign(accepted, data);
      } else {
        if (current >= 0)
          this.#state.history.splice(current + 1);
        if (policy === "unique") {
          accepted = this.#state.history.filter((entry) => historyFileKey(entry.target) === key).at(-1) || null;
          this.#state.history = this.#state.history.filter((entry) => historyFileKey(entry.target) !== key);
        }
        accepted = Object.assign(accepted || { ...data, id: crypto.randomUUID() }, data);
        this.#state.history.push(accepted);
        this.#limitHistory();
      }
      this.#state.cursor = accepted.id;
    }
    this.#save();
    return accepted && this.historyEntry(accepted.id);
  }
  appendRestored(data, id) {
    const key = historyFileKey(data.target);
    this.#state.history = this.#state.history.filter((entry) => entry.id !== id && (this.#state.historySettings.policy !== "unique" || historyFileKey(entry.target) !== key));
    this.#state.history.push({ ...data, id });
    this.#state.cursor = id;
    this.#limitHistory();
    this.#save();
    return this.historyEntry(id);
  }
  updateCurrent(data, id = this.#state.cursor) {
    const entry = id && this.historyEntry(id);
    if (!entry || historyFileKey(entry.target) !== historyFileKey(data.target))
      return;
    Object.assign(entry, data);
    this.#save();
  }
  addBookmark(data) {
    let entry = this.bookmarkFor(data.target);
    if (!entry) {
      entry = { ...data, id: crypto.randomUUID(), groupId: this.#state.currentGroup };
      this.#state.bookmarks.push(entry);
    }
    this.#state.lastBookmark = entry.id;
    this.#save();
    return entry;
  }
  moveBookmark(id, data) {
    const entry = this.#state.bookmarks.find((item) => item.id === id);
    const occupied = this.bookmarkFor(data.target);
    if (!entry || occupied && occupied.id !== id)
      return false;
    Object.assign(entry, data);
    this.#save();
    return true;
  }
  removeBookmark(target) {
    const entry = this.bookmarkFor(target);
    if (!entry)
      return false;
    this.remove("bookmarks", entry.id);
    return true;
  }
  rememberBookmark(id) {
    if (!this.#state.bookmarks.some((entry) => entry.id === id))
      return;
    this.#state.lastBookmark = id;
    this.#save();
  }
  lastBookmark() {
    return this.#state.bookmarks.find((entry) => entry.id === this.#state.lastBookmark) || null;
  }
  adjacentBookmark(direction) {
    const entries = this.#state.bookmarks.filter((entry) => entry.groupId === this.#state.currentGroup);
    if (!entries.length)
      return null;
    const index = entries.findIndex((entry) => entry.id === this.#state.lastBookmark);
    return entries[index < 0 ? direction === 1 ? 0 : entries.length - 1 : (index + direction + entries.length) % entries.length];
  }
  remove(list, id) {
    this.#state[list] = this.#state[list].filter((entry) => entry.id !== id);
    if (list === "history" && this.#state.cursor === id)
      this.#state.cursor = null;
    if (list === "bookmarks" && this.#state.lastBookmark === id)
      this.#state.lastBookmark = null;
    this.#save();
  }
  reorder(list, id, before) {
    if (id === before)
      return;
    const entries = this.#state[list];
    const source = entries.findIndex((entry) => entry.id === id);
    if (source < 0 || before !== "" && !entries.some((entry) => entry.id === before))
      return;
    if (list === "bookmarks") {
      const groupId = entries[source].groupId;
      const destination = before ? entries.find((entry) => entry.id === before) : null;
      if (groupId !== this.#state.currentGroup || destination && destination.groupId !== groupId)
        return;
      const group = entries.filter((entry) => entry.groupId === groupId);
      const [entry] = group.splice(group.findIndex((item) => item.id === id), 1);
      group.splice(before === "" ? group.length : group.findIndex((item) => item.id === before), 0, entry);
      let position = 0;
      this.#state.bookmarks = entries.map((item) => item.groupId === groupId ? group[position++] : item);
      this.#save();
      return;
    }
    const [entry] = entries.splice(source, 1);
    entries.splice(before === "" ? entries.length : entries.findIndex((item) => item.id === before), 0, entry);
    this.#save();
  }
  toggleBookmarkTree() {
    this.#state.bookmarkTree = !this.#state.bookmarkTree;
    this.#save();
  }
}
// src/bloc/document/json/width.json
var width_default = {
  initial: 0.5,
  maximum: 0.85,
  minimumPixels: 280,
  minimumFraction: 0.4,
  keyStepPixels: 24,
  largeKeyStepPixels: 80,
  ariaWidth: "{percent}% width"
};

// src/bloc/document/search-matches.mjs
function findSearchMatches(text, blocks, query, bounds) {
  if (!query || bounds === null || bounds && (!Number.isSafeInteger(bounds.start) || !Number.isSafeInteger(bounds.end) || bounds.start < 0 || bounds.end <= bounds.start || bounds.end > text.length))
    return { starts: new Uint32Array, ends: new Uint32Array };
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "giu");
  let starts = new Uint32Array(64);
  let ends = new Uint32Array(64);
  let count = 0;
  for (let block = 0;block + 1 < blocks.length; block += 2) {
    const blockStart = blocks[block];
    const blockEnd = blocks[block + 1];
    if (blockEnd <= blockStart || blockEnd > text.length)
      continue;
    const begin = bounds ? Math.max(blockStart, bounds.start) : blockStart;
    const finish = bounds ? Math.min(blockEnd, bounds.end) : blockEnd;
    if (finish <= begin)
      continue;
    const blockText = text.slice(begin, finish);
    pattern.lastIndex = 0;
    for (let match = pattern.exec(blockText);match; match = pattern.exec(blockText)) {
      if (count === starts.length) {
        const nextStarts = new Uint32Array(starts.length * 2);
        const nextEnds = new Uint32Array(ends.length * 2);
        nextStarts.set(starts);
        nextEnds.set(ends);
        starts = nextStarts;
        ends = nextEnds;
      }
      starts[count] = begin + match.index;
      ends[count++] = begin + match.index + match[0].length;
    }
  }
  return { starts: starts.subarray(0, count), ends: ends.subarray(0, count) };
}
function circularSearchIndex(current, total, direction) {
  if (!Number.isSafeInteger(total) || total <= 0)
    return -1;
  if (current < 0 || current >= total)
    return direction === 1 ? 0 : total - 1;
  return (current + direction + total) % total;
}

// src/bloc/document/search-projection.mjs
var excluded = 'script,style,template,svg,button,input,select,textarea,[hidden],[aria-hidden="true"],[data-source-gutter],[data-source-bookmarks],[data-search-current]';
var space = /[ \t\r\n\f]/;
var blockDisplays = new Set(["block", "flow-root", "list-item", "table-cell", "table-caption", "flex", "grid"]);
function normalText(raw, leadingSpace) {
  let first = 0;
  if (leadingSpace) {
    while (first < raw.length && space.test(raw[first]))
      first++;
  }
  const remainder = raw.slice(first);
  if (!/[\t\r\n\f]| {2,}/.test(remainder))
    return { text: remainder, rawStart: first, offsets: null };
  const parts = [];
  const offsets = [];
  for (let position = first;position < raw.length; ) {
    if (space.test(raw[position])) {
      offsets.push(position);
      parts.push(" ");
      while (position < raw.length && space.test(raw[position]))
        position++;
    } else {
      const start = position;
      while (position < raw.length && !space.test(raw[position]))
        offsets.push(position++);
      parts.push(raw.slice(start, position));
    }
  }
  offsets.push(raw.length);
  return { text: parts.join(""), rawStart: first, offsets: Uint32Array.from(offsets) };
}
function createSearchProjection(root) {
  const owner = root.ownerDocument;
  const view = owner.defaultView;
  const projection = { document: owner, text: "", blocks: new Uint32Array, segments: [] };
  if (!view)
    return projection;
  const styles = new WeakMap;
  const styleOf = (element) => {
    let saved = styles.get(element);
    if (!saved) {
      const style = view.getComputedStyle(element);
      saved = { display: style.display, visibility: style.visibility, whiteSpace: style.whiteSpace };
      styles.set(element, saved);
    }
    return saved;
  };
  const pieces = [];
  const blocks = [];
  let block = null;
  let length = 0;
  let blockStart = 0;
  let lastNormalSpace = false;
  let leadingSpace = true;
  const finishBlock = () => {
    if (lastNormalSpace && pieces.at(-1)?.endsWith(" ")) {
      const last = pieces.length - 1;
      pieces[last] = pieces[last].slice(0, -1);
      const segment = projection.segments.at(-1);
      if (segment) {
        segment.end--;
        if (segment.offsets)
          segment.offsets = segment.offsets.subarray(0, segment.end - segment.start + 1);
        if (segment.end === segment.start)
          projection.segments.pop();
      }
      length--;
    }
    if (length > blockStart)
      blocks.push(blockStart, length);
    blockStart = length;
    leadingSpace = true;
    lastNormalSpace = false;
  };
  const walker = owner.createTreeWalker(root, 5);
  for (let current = walker.nextNode();current; current = walker.nextNode()) {
    if (current.nodeType === 1) {
      const element = current;
      if (element.tagName === "BR") {
        let hidden = false;
        for (let parent = element;parent && root.contains(parent); parent = parent.parentElement) {
          const style = styleOf(parent);
          if (parent.matches(excluded) || style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
            hidden = true;
            break;
          }
          if (parent === root)
            break;
        }
        if (!hidden) {
          finishBlock();
          block = null;
        }
      }
      continue;
    }
    const node = current;
    if (!node.data || !node.parentElement)
      continue;
    let parent = node.parentElement;
    let nearest = root;
    let foundBlock = false;
    let hidden = false;
    while (parent && root.contains(parent)) {
      const style = styleOf(parent);
      if (parent.matches(excluded) || style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
        hidden = true;
        break;
      }
      if (!foundBlock && (blockDisplays.has(style.display) || parent.matches("br,pre,td,th"))) {
        nearest = parent;
        foundBlock = true;
      }
      if (parent === root)
        break;
      parent = parent.parentElement;
    }
    if (hidden)
      continue;
    if (block !== nearest) {
      finishBlock();
      block = nearest;
    }
    const whiteSpace = styleOf(node.parentElement).whiteSpace;
    const exact = whiteSpace === "pre" || whiteSpace === "pre-wrap" || whiteSpace === "break-spaces";
    const value = exact ? { text: node.data, rawStart: 0, offsets: null } : normalText(node.data, leadingSpace);
    if (!value.text)
      continue;
    projection.segments.push({
      node,
      start: length,
      end: length + value.text.length,
      rawStart: value.rawStart,
      offsets: value.offsets
    });
    pieces.push(value.text);
    length += value.text.length;
    leadingSpace = space.test(value.text.at(-1) || "");
    lastNormalSpace = !exact && leadingSpace;
  }
  finishBlock();
  projection.text = pieces.join("");
  projection.blocks = Uint32Array.from(blocks);
  return projection;
}
function releaseSearchProjection(projection) {
  projection.text = "";
  projection.blocks = new Uint32Array;
  projection.segments.length = 0;
  projection.document = null;
}
function selectedBoundary(segment, range, afterEnd) {
  let low = 0;
  let high = segment.end - segment.start + 1;
  while (low < high) {
    const middle = low + high >>> 1;
    const offset = segment.offsets?.[middle] ?? segment.rawStart + middle;
    const relative = range.comparePoint(segment.node, offset);
    if (relative < (afterEnd ? 1 : 0))
      low = middle + 1;
    else
      high = middle;
  }
  return low;
}
function searchBoundsForRange(projection, range) {
  const owner = projection.document;
  if (!owner || range.collapsed || !range.startContainer.isConnected || !range.endContainer.isConnected || (range.startContainer.ownerDocument || range.startContainer) !== owner || (range.endContainer.ownerDocument || range.endContainer) !== owner)
    return null;
  let start = -1;
  let end = -1;
  try {
    for (const segment of projection.segments) {
      const length = segment.end - segment.start;
      const rawEnd = segment.offsets?.[length] ?? segment.rawStart + length;
      if (segment.node.ownerDocument !== owner || !segment.node.isConnected || rawEnd > segment.node.data.length) {
        return null;
      }
      const first = selectedBoundary(segment, range, false);
      const last = selectedBoundary(segment, range, true) - 1;
      if (first >= last)
        continue;
      if (start < 0)
        start = segment.start + first;
      end = segment.start + last;
    }
  } catch {
    return null;
  }
  return start >= 0 && end > start ? { start, end } : null;
}
function rangeForSearchMatch(projection, start, end) {
  const owner = projection.document;
  if (!owner || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > projection.text.length)
    return null;
  const segments = projection.segments;
  const at = (offset) => {
    let low = 0;
    let high = segments.length;
    while (low < high) {
      const middle = low + high >>> 1;
      if (segments[middle].end <= offset)
        low = middle + 1;
      else
        high = middle;
    }
    return segments[low];
  };
  const first = at(start);
  const last = at(end - 1);
  if (!first || !last || first.node.ownerDocument !== owner || last.node.ownerDocument !== owner || !first.node.isConnected || !last.node.isConnected)
    return null;
  const range = owner.createRange();
  const firstOffset = first.offsets?.[start - first.start] ?? first.rawStart + start - first.start;
  const lastOffset = last.offsets?.[end - last.start] ?? last.rawStart + end - last.start;
  if (firstOffset > first.node.data.length || lastOffset > last.node.data.length)
    return null;
  range.setStart(first.node, firstOffset);
  range.setEnd(last.node, lastOffset);
  return range;
}

// src/bloc/document/search-painter.mjs
function innerRect(element) {
  const rect = element.getBoundingClientRect();
  const left = rect.left + element.clientLeft;
  const top = rect.top + element.clientTop;
  return { left, top, right: left + element.clientWidth, bottom: top + element.clientHeight };
}

class CurrentSearchPainter {
  #body;
  #layer;
  #range = null;
  #view = null;
  #events = null;
  #observer = null;
  #frame = 0;
  constructor(body, layer) {
    this.#body = body;
    this.#layer = layer;
    this.rebind();
  }
  show(projection, start, end) {
    this.clear();
    if (this.#view !== this.#body.ownerDocument.defaultView)
      this.rebind();
    if (projection.document !== this.#body.ownerDocument)
      return;
    this.#range = rangeForSearchMatch(projection, start, end);
    this.#observe();
    this.#paint();
  }
  scrollCurrent() {
    const range = this.#range;
    const view = this.#view;
    if (!range || !view)
      return;
    const parent = range.startContainer.parentElement;
    for (let element = parent;element && this.#body.contains(element); element = element.parentElement) {
      const rect = range.getClientRects()[0];
      if (!rect)
        break;
      const clip = innerRect(element);
      const style = view.getComputedStyle(element);
      if (element === this.#body || /auto|scroll|hidden/.test(style.overflowY)) {
        if (rect.top < clip.top || rect.bottom > clip.bottom) {
          element.scrollTop += rect.top - clip.top - Math.min(element.clientHeight / 4, 80);
        }
      }
      if (element === this.#body || /auto|scroll|hidden/.test(style.overflowX)) {
        if (rect.left < clip.left)
          element.scrollLeft += rect.left - clip.left;
        else if (rect.right > clip.right)
          element.scrollLeft += rect.right - clip.right;
      }
      if (element === this.#body)
        break;
    }
    this.#paint();
  }
  clear() {
    if (this.#frame)
      this.#view?.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#range = null;
    this.#layer.replaceChildren();
    this.#observe();
  }
  rebind() {
    this.dispose();
    const view = this.#body.ownerDocument.defaultView;
    if (!view)
      return;
    this.#view = view;
    this.#events = new view.AbortController;
    const signal = this.#events.signal;
    this.#body.addEventListener("scroll", () => this.#schedule(), { capture: true, passive: true, signal });
    view.addEventListener("resize", () => this.#schedule(), { signal });
    if (typeof view.ResizeObserver === "function") {
      this.#observer = new view.ResizeObserver(() => this.#schedule());
      this.#observe();
    }
  }
  dispose() {
    this.clear();
    this.#events?.abort();
    this.#events = null;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#view = null;
  }
  #observe() {
    if (!this.#observer)
      return;
    this.#observer.disconnect();
    this.#observer.observe(this.#body);
    const node = this.#range?.commonAncestorContainer;
    let parent = node?.nodeType === 1 ? node : node?.parentElement;
    while (parent && parent !== this.#body && this.#view?.getComputedStyle(parent).display === "inline") {
      parent = parent.parentElement;
    }
    if (parent && parent !== this.#body)
      this.#observer.observe(parent);
  }
  #schedule() {
    const view = this.#view;
    if (!view || !this.#range || this.#frame)
      return;
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = 0;
      if (this.#view === view && this.#body.ownerDocument === view.document)
        this.#paint();
    });
  }
  #paint() {
    const range = this.#range;
    const view = this.#view;
    if (!range || !view || range.startContainer.ownerDocument !== this.#body.ownerDocument || !range.startContainer.isConnected || !range.endContainer.isConnected) {
      this.#layer.replaceChildren();
      return;
    }
    const clip = innerRect(this.#body);
    for (let element = range.startContainer.parentElement;element && element !== this.#body; element = element.parentElement) {
      const style = view.getComputedStyle(element);
      const bounds = innerRect(element);
      if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
        clip.left = Math.max(clip.left, bounds.left);
        clip.right = Math.min(clip.right, bounds.right);
      }
      if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
        clip.top = Math.max(clip.top, bounds.top);
        clip.bottom = Math.min(clip.bottom, bounds.bottom);
      }
    }
    const origin = this.#layer.getBoundingClientRect();
    const nodes = this.#body.ownerDocument.createDocumentFragment();
    const seen = new Set;
    for (const rect of range.getClientRects()) {
      const left = Math.max(rect.left, clip.left);
      const top = Math.max(rect.top, clip.top);
      const right = Math.min(rect.right, clip.right);
      const bottom = Math.min(rect.bottom, clip.bottom);
      if (right <= left || bottom <= top)
        continue;
      const identity = `${left}:${top}:${right}:${bottom}`;
      if (seen.has(identity))
        continue;
      seen.add(identity);
      const mark = this.#body.ownerDocument.createElement("span");
      mark.className = "search-current-rect";
      mark.style.left = `${left - origin.left}px`;
      mark.style.top = `${top - origin.top}px`;
      mark.style.width = `${right - left}px`;
      mark.style.height = `${bottom - top}px`;
      nodes.append(mark);
    }
    this.#layer.replaceChildren(nodes);
  }
}

// src/bloc/document/source-request.mjs
class SourceRequest {
  #host;
  #module = null;
  #abort = null;
  #revision = 0;
  #ready = false;
  #failed = false;
  #highlightTimer = null;
  #highlightRevision = 0;
  #highlightVisible = false;
  #highlightDeadline = null;
  #highlightPreview = null;
  constructor(host) {
    this.#host = host;
  }
  get ready() {
    return this.#ready;
  }
  get failed() {
    return this.#failed;
  }
  async prepareShell(owner, signal, returnDocument = owner) {
    const check = () => {
      if (signal.aborted)
        throw signal.reason ?? new DOMException("Source preparation cancelled.", "AbortError");
      if (this.#host.ownerDocument !== owner)
        throw new DOMException("Source display changed.", "AbortError");
    };
    check();
    const source = await import("./source-view.mjs");
    check();
    this.#module = source;
    if (returnDocument !== owner) {
      await source.ensureSourceStyle(returnDocument);
      check();
    }
    await source.ensureSourceStyle(owner);
    check();
    if (this.#host.hidden || this.#host.querySelector("[data-source-code]")) {
      await source.ensureSourceShell(this.#host);
      check();
    }
  }
  get lineCount() {
    return this.#module?.sourceLineCount(this.#host) || 0;
  }
  lineAt(clientY, view) {
    return this.#ready ? this.#module?.sourceLineAt(this.#host, clientY, view) || null : null;
  }
  showBookmarks(lines, icon, view, label) {
    if (this.#ready)
      this.#module?.showSourceBookmarks(this.#host, lines, icon, view, label);
  }
  refreshGeometry(view) {
    const line = this.#selectedLine();
    if (this.#ready && this.#module && line !== null && this.#host.ownerDocument.defaultView === view) {
      this.#module.selectSourceLine(this.#host, line, view);
    }
  }
  clearSelection(view) {
    this.#stopHighlightTimer();
    this.#highlightPreview = null;
    this.#highlightVisible = false;
    this.#highlightDeadline = null;
    this.#module?.selectSourceLine(this.#host, null, view);
    this.#module?.showSourceHighlight(this.#host, false);
  }
  scrollLine(body, line, view, duration = 3000, preview = false) {
    if (!this.#ready || !this.#module)
      return;
    if (preview && !this.#highlightPreview) {
      this.#highlightPreview = {
        line: this.#selectedLine(),
        visible: this.#highlightVisible,
        deadline: this.#highlightDeadline
      };
    }
    this.#module.scrollSourceLine(body, this.#host, line, view);
    if (preview) {
      this.#stopHighlightTimer();
      this.#highlightVisible = true;
      this.#highlightDeadline = null;
      this.#module.showSourceHighlight(this.#host, true);
    } else
      this.refreshHighlight(duration, view);
  }
  refreshHighlight(duration, view) {
    if (!this.#ready || !this.#selectedLine())
      return;
    this.#highlightPreview = null;
    this.#highlightVisible = duration !== 0;
    this.#highlightDeadline = duration === null ? null : view.Date.now() + duration;
    this.resumeHighlight(view);
  }
  cancelPreview(view, schedule = true) {
    const preview = this.#highlightPreview;
    if (!preview || !this.#module)
      return;
    this.#highlightPreview = null;
    this.#module.selectSourceLine(this.#host, preview.line, view);
    this.#highlightVisible = preview.visible;
    this.#highlightDeadline = preview.deadline;
    this.resumeHighlight(view, schedule);
  }
  resumeHighlight(view, schedule = true) {
    this.#stopHighlightTimer();
    if (!this.#ready || !this.#module || this.#host.ownerDocument.defaultView !== view)
      return;
    const remaining = this.#highlightDeadline === null ? null : this.#highlightDeadline - view.Date.now();
    if (!this.#highlightVisible || remaining !== null && remaining <= 0) {
      this.#highlightVisible = false;
      this.#highlightDeadline = null;
      this.#module.showSourceHighlight(this.#host, false);
      return;
    }
    this.#module.showSourceHighlight(this.#host, true);
    if (remaining === null || !schedule)
      return;
    const revision = this.#highlightRevision;
    const id = view.setTimeout(() => {
      if (revision !== this.#highlightRevision || !this.#ready || this.#highlightPreview || this.#host.ownerDocument.defaultView !== view)
        return;
      this.#highlightTimer = null;
      this.#highlightVisible = false;
      this.#highlightDeadline = null;
      this.#module?.showSourceHighlight(this.#host, false, true);
    }, remaining);
    this.#highlightTimer = { view, id };
  }
  #selectedLine() {
    const line = Number(this.#host.querySelector("[data-source-gutter]")?.getAttribute("data-selected-line"));
    return Number.isSafeInteger(line) && line > 0 ? line : null;
  }
  #stopHighlightTimer() {
    ++this.#highlightRevision;
    if (this.#highlightTimer)
      this.#highlightTimer.view.clearTimeout(this.#highlightTimer.id);
    this.#highlightTimer = null;
  }
  current(revision) {
    return this.#revision === revision;
  }
  clear() {
    this.#stopHighlightTimer();
    this.#highlightVisible = false;
    this.#highlightDeadline = null;
    this.#highlightPreview = null;
    ++this.#revision;
    this.#abort?.abort();
    this.#abort = null;
    this.#ready = false;
    this.#failed = false;
    this.#module?.clearSourceView(this.#host);
    this.#host.hidden = true;
  }
  stop() {
    this.cancelPreview(displayWindow(this.#host), false);
    this.#stopHighlightTimer();
    if (!this.#abort || this.#ready)
      return;
    ++this.#revision;
    this.#abort.abort();
    this.#abort = null;
  }
  restoreStyle(owner) {
    if (!this.#module || !this.#ready)
      return;
    if (this.#host.ownerDocument !== owner)
      throw new Error("The source display belongs to another document");
    this.#module.requirePreparedSourceStyle(owner);
    this.#host.hidden = false;
  }
  start(load, library, version = "", returnDocument = this.#host.ownerDocument) {
    this.clear();
    this.#host.hidden = false;
    const controller = new AbortController;
    this.#abort = controller;
    const revision = ++this.#revision;
    return { revision, promise: this.#run(load, library, version, revision, controller, returnDocument) };
  }
  #current(revision, controller, owner) {
    return this.#revision === revision && !controller.signal.aborted && this.#host.ownerDocument === owner;
  }
  #showImportFailure() {
    this.#host.replaceChildren();
    const message = this.#host.ownerDocument.createElement("p");
    message.className = "source-state";
    message.setAttribute("role", "alert");
    message.textContent = ui_strings_default.sourceViewer.viewerFailed;
    this.#host.append(message);
  }
  async#run(load, library, version, revision, controller, returnDocument) {
    const owner = this.#host.ownerDocument;
    try {
      const source = await import("./source-view.mjs");
      if (!this.#current(revision, controller, owner))
        return null;
      this.#module = source;
      if (returnDocument !== owner) {
        await source.ensureSourceStyle(returnDocument);
        if (!this.#current(revision, controller, owner))
          return null;
      }
      await source.ensureSourceShell(this.#host);
      if (!this.#current(revision, controller, owner))
        return null;
      source.showSourceLoading(this.#host);
      const result = await load(controller.signal);
      if (!this.#current(revision, controller, owner))
        return null;
      if (typeof result?.content !== "string" || typeof result.ref !== "string" || result.content.length > source_limits_default.maxSourceBytes) {
        throw new Error("Invalid source file.");
      }
      source.showSourceText(this.#host, result, library, version);
      this.#ready = true;
      this.#failed = false;
      this.#abort = null;
      return result;
    } catch (error) {
      if (!this.#current(revision, controller, owner))
        return null;
      this.#failed = true;
      this.#abort = null;
      if (!this.#module)
        this.#showImportFailure();
      else if (this.#host.querySelector("[data-source-code]"))
        this.#module.showSourceFailure(this.#host, error);
      else
        this.#module.showShellFailure(this.#host);
      return null;
    }
  }
}

// src/bloc/document/target-presentation.mjs
function firstDocument(result, requested, selected) {
  const types = (result.order || requested).filter((type) => Object.hasOwn(result.documents, type));
  return selected && types.includes(selected) && typeof result.documents[selected].content === "string" ? selected : types.find((type) => typeof result.documents[type].content === "string") || null;
}
function documentTarget(previous, document2, ref) {
  if (previous.kind === "directory" && previous.readmePath === document2.path)
    return { ...previous, ref };
  return {
    kind: "document",
    origin: previous.origin,
    ref,
    path: document2.path,
    format: document2.format,
    anchor: previous.kind === "document" && previous.path === document2.path ? previous.anchor : null
  };
}
function targetTitle(target, fallback) {
  if (target.kind === "repository")
    return { type: "repository", name: target.origin.id };
  if (target.kind === "declaration") {
    return {
      type: "symbol",
      name: target.symbolPath.split(/[.#]/).at(-1) || fallback.name,
      kind: target.symbolKind
    };
  }
  if (target.kind === "source") {
    return {
      type: "file",
      name: `${target.path.split("/").at(-1) || fallback.name}${target.line === null ? "" : `:${target.line}`}`
    };
  }
  if (target.kind === "directory")
    return { type: "directory", name: target.path.split("/").at(-1) || fallback.name };
  return { type: "file", name: target.path.split("/").at(-1) || fallback.name };
}
function collectionRow(entry, cursor, bookmarked) {
  const target = entry.target;
  const labels = ui_strings_default.navigation;
  const namedKind = entry.title.kind && Object.hasOwn(labels, entry.title.kind) ? labels[entry.title.kind] : entry.title.kind;
  const kind = target.kind === "declaration" ? namedKind || labels.symbol : target.kind === "directory" ? labels.directory : target.kind === "document" ? target.format === "markdown" ? labels.markdown : labels.document : target.kind === "repository" ? labels.repository : labels.file;
  const path = target.kind === "repository" ? "" : target.kind === "directory" ? target.readmePath || target.path : `${target.path}${target.kind === "declaration" || target.kind === "source" && target.line !== null ? `#L${target.line}` : target.kind === "document" && target.anchor ? `#${target.anchor}` : ""}`;
  return {
    id: entry.id,
    name: entry.title.name,
    repository: target.origin.id,
    kind,
    path,
    active: entry.id === cursor,
    bookmarked
  };
}
function bookmarkRow(entry, cursor, bookmarked, branch, owner) {
  const row = collectionRow(entry, cursor, bookmarked);
  const target = entry.target;
  row.repository = repositoryName(target.origin);
  const settings = { repositories: true, directories: true, files: true, symbols: true };
  row.repositoryIcon = branch ? versionSourceIcon({ source: "github", refKind: "branch" }, owner) : nodeIcon({ type: "repository", name: row.repository }, settings);
  const title = target.kind === "document" ? { type: "file", name: target.format === "markdown" ? "document.md" : "document" } : target.kind === "source" ? { type: "file", name: target.path.split("/").at(-1) || entry.title.name } : targetTitle(target, entry.title);
  row.detailIcon = nodeIcon(title, settings);
  for (const icon of [row.repositoryIcon, row.detailIcon]) {
    if (!icon)
      continue;
    icon.removeAttribute("data-icon-group");
    if (icon.ownerDocument !== owner)
      owner.adoptNode(icon);
  }
  return row;
}
function repositoryName(origin) {
  return origin.kind === "haxelib" ? origin.url.split("/").at(-1) || origin.id : origin.id;
}

// src/bloc/document/index.mjs
var labels = ui_strings_default.documents;
var sourceModeKey = "site-mobile-source-mode";
var sourcePinKey = "site-source-pin";

class DocumentPanel extends HTMLElement {
  #options = null;
  #view = null;
  #catalogueParked = false;
  #commandHome = this.ownerDocument;
  #journal;
  #searchState;
  #navigationRevision = 0;
  #pendingHistory = new Map;
  #pendingBookmarks = new Map;
  #bookmarkMoveMode = false;
  #bookmarkNameMode = null;
  #bookmarkDeleteConfirm = null;
  #jsonTransfer = null;
  #navigationRequest = null;
  #historyRestoreRequest = null;
  #pendingRetry = null;
  #refreshingCurrent = false;
  #navigationActions = null;
  #popup = null;
  #popupContent = null;
  #popupKind = null;
  #popupMarkup = new Map;
  #historySettingsOpen = false;
  #collectionStop = null;
  #popupFocus = null;
  #popupView = null;
  #navigationMessage = "";
  #navigationNoticeTimer = 0;
  #searchOpen = false;
  #searchBar = null;
  #searchProjectionRoot = null;
  #searchSelectionBounds = null;
  #searchSelectionProjection = null;
  #searchSelectionOnly = false;
  #searchRecallIndex = -1;
  #searchRecallDraft = "";
  #searchDeletedDraft = null;
  #searchProjection = null;
  #searchMatches = { starts: new Uint32Array, ends: new Uint32Array };
  #searchCurrent = -1;
  #searchPainter = null;
  #searchDragStop = null;
  #recordingSuspended = false;
  #closing = null;
  #events = null;
  #panelWidth = null;
  #motion = null;
  #mobile = null;
  #sourceMode = "documentation";
  #sourcePin = "last";
  #icons = defaultIcons();
  #holdDuration = 500;
  #sourceRequest = null;
  #bookmarkDrag = null;
  #bookmarkDragStop = null;
  #documentLoad = null;
  #moving = false;
  #resumingDisplay = false;
  #homeOptions = null;
  #boundView = null;
  #pip = null;
  #dom = null;
  #iconFrame = 0;
  #modal = false;
  #pipHold = null;
  #shortSourceE = null;
  constructor() {
    super();
    let storage = null;
    try {
      storage = localStorage;
      if (localStorage.getItem(sourceModeKey) === "source")
        this.#sourceMode = "source";
      const pin = localStorage.getItem(sourcePinKey);
      if (pin === "documentation" || pin === "source")
        this.#sourcePin = pin;
    } catch {}
    this.#journal = new NavigationJournal(storage);
    this.#searchState = new SearchState(storage);
  }
  configure(options) {
    const previous = this.#options;
    if (previous && (previous.workspace !== options.workspace || previous.footer !== options.footer || previous.footerHome !== options.footerHome || previous.eventRoot !== options.eventRoot))
      this.#disconnect();
    this.#homeOptions = { ...options, standalone: false };
    this.#options = this.#homeOptions;
    this.#connect();
  }
  setIcons(settings) {
    Object.assign(this.#icons, settings);
    if (!this.#dom)
      return;
    const { body } = this.#elements;
    const scroll = body.scrollTop;
    const view = this.#view;
    const type = view?.type;
    applyIcons(this, this.#icons);
    body.scrollTop = scroll;
    if (!this.#events)
      return;
    this.#display.cancelAnimationFrame(this.#iconFrame);
    const binding = this.#events;
    this.#iconFrame = this.#display.requestAnimationFrame(() => {
      if (this.#events !== binding)
        return;
      this.#iconFrame = 0;
      if (this.#events && this.#view === view && this.#view?.type === type)
        body.scrollTop = scroll;
    });
  }
  setHoldDuration(milliseconds) {
    if (Number.isFinite(milliseconds) && milliseconds >= 250 && milliseconds <= 500) {
      this.#holdDuration = milliseconds;
    }
  }
  refreshSourceHighlightDuration() {
    const view = this.#view;
    if (this.#moving || this.#bookmarkDrag || !view || view.request.kind !== "source-file" || view.sourceMode !== "source" || !this.#current(view))
      return;
    this.#sourceRequest?.refreshHighlight(this.#sourceHighlightDuration, this.#display);
  }
  refreshSourceGeometry() {
    const view = this.#view;
    if (this.#moving || !view || !this.#current(view))
      return;
    if (view.request.kind === "source-file" && view.sourceMode === "source") {
      this.#sourceRequest?.refreshGeometry(this.#display);
    }
    this.#paintSearch();
  }
  open(request) {
    if (!this.#events || this.#moving || !this.isConnected || !this.#motion)
      return false;
    this.#clearPreparationRetry();
    this.#cancelNavigation();
    const sourceMode = request.kind === "source-file" ? this.#initialSourceMode(request) : undefined;
    if (this.#sameInformation(request)) {
      if (request.kind === "source-file" && this.#view?.request.kind === "source-file") {
        if (this.#view.sourceMode === sourceMode && sourceMode === "source" && this.#sourceRequest?.ready) {
          if (request.line !== null)
            this.#scrollSourceLine(request.line);
        } else
          this.#selectSourceTab(this.#view, sourceMode);
      }
      return true;
    }
    this.#captureReading();
    this.#closePopup(false);
    const view = {
      request,
      target: request.target,
      context: {},
      mode: "html",
      type: null,
      sourceMode,
      tabIds: new Map
    };
    this.#recordingSuspended = true;
    try {
      this.#present(view);
    } finally {
      this.#recordingSuspended = false;
    }
    view.historyId = this.#journal.accept(this.#entryData(view), "push")?.id || null;
    this.#updateNavigationActions();
    return true;
  }
  #sourceModePreferenceApplies() {
    return !this.ownerDocument.documentElement.hasAttribute("data-pip-mode");
  }
  #initialSourceMode(request) {
    return request.initialMode === "source" ? "source" : this.#sourceModePreferenceApplies() ? this.#sourceMode : "documentation";
  }
  #sameInformation(request) {
    if (this.#catalogueParked)
      return false;
    const current = this.#view;
    const previous = current?.request;
    if (!current || !previous || targetKey(current.target) !== targetKey(request.target) || previous.kind !== request.kind || previous.version !== request.version || previous.title.type !== request.title.type || previous.title.name !== request.title.name || previous.title.kind !== request.title.kind)
      return false;
    if (previous.kind === "hxdoc" && request.kind === "hxdoc")
      return previous.node === request.node;
    if (previous.kind === "source-file" && request.kind === "source-file") {
      return previous.node === request.node && previous.source.url === request.source.url && previous.source.ref === request.source.ref && previous.source.path === request.source.path && previous.source.private === request.source.private && previous.source.library === request.source.library;
    }
    return previous.kind === "documents" && request.kind === "documents" && previous.scope === request.scope && previous.loadingSource === request.loadingSource && previous.types.length === request.types.length && previous.types.every((type, index) => type === request.types[index]);
  }
  #present(view) {
    this.#catalogueParked = false;
    const request = view.request;
    const sourceMode = request.kind === "source-file" ? view.sourceMode || request.initialMode : null;
    this.#cancelPiPHold();
    this.#documentLoad?.abort();
    this.#documentLoad = null;
    this.#leaveSource();
    const { dialog, body, toolbar, tabs, sourceTabs, sourceHost, mode } = this.#elements;
    const entering = !dialog.open || Boolean(this.#closing);
    const style = dialog.open ? this.#display.getComputedStyle(dialog) : null;
    const from = { opacity: style?.opacity || "0", transform: style?.transform || this.#offset() };
    this.#motion?.cancel(dialog);
    this.#closing = null;
    if (dialog.contains(this.ownerDocument.activeElement))
      body.focus({ preventScroll: true });
    this.#view = view;
    this.#releaseSearchProjection();
    const selected = view.type;
    view.type = null;
    this.#showHeading(view);
    toolbar.hidden = mode.hidden = true;
    tabs.hidden = false;
    sourceTabs.hidden = sourceHost.hidden = true;
    render9(nothing11, tabs);
    body.removeAttribute("role");
    body.removeAttribute("aria-labelledby");
    body.removeAttribute("aria-busy");
    this.#emit("view-open", { token: request.token, target: view.target });
    if (request.kind === "hxdoc") {
      this.#showState(this.#hxdoc(request.node));
    } else if (request.kind === "source-file") {
      view.sourceMode = undefined;
      this.#showSourceDocumentation(view);
    } else if (!view.result) {
      this.#showLoading(view);
      this.#load(view);
    }
    this.#place();
    body.scrollTop = view.scrollTop || 0;
    body.scrollLeft = view.scrollLeft || 0;
    if (sourceMode === "source")
      this.#showSource(view);
    if (view.result)
      this.#renderTabs(view, selected);
    if (request.kind === "hxdoc" || request.kind === "source-file" && sourceMode !== "source") {
      this.#restoreReading(view);
    }
    if (entering)
      this.#motion?.play(dialog, [from, { opacity: 1, transform: "translate(0)" }]);
  }
  #showHeading(view) {
    const request = view.request;
    const headingIcon = nodeIcon(request.title, { repositories: true, directories: true, files: true, symbols: true });
    headingIcon?.removeAttribute("data-icon-group");
    showDocumentHeading(this.#elements.title, this.#elements.version, {
      name: request.title.name,
      label: `${request.title.kind || request.title.type} ${request.title.name}`,
      icon: headingIcon,
      versionText: "",
      ...request.kind === "source-file" && request.target.kind === "declaration" ? {
        href: this.#settings.linkHref(request.target),
        onOpen: (event) => {
          const target = this.#headingTarget(view);
          if (target)
            this.#openDeclaration(target, event);
        }
      } : {}
    });
  }
  #reuseSource(view) {
    this.#cancelPiPHold();
    this.#cancelBookmarkDrag(false);
    this.#view = view;
    this.#showHeading(view);
    if (view.request.kind !== "source-file")
      return;
    if (view.request.line !== null)
      this.#scrollSourceLine(view.request.line);
    else {
      this.#sourceRequest?.clearSelection(this.#display);
      this.#elements.body.scrollTop = 0;
      this.#elements.body.scrollLeft = 0;
    }
    this.#announceShown(view);
    this.#restoreReading(view);
    this.#refreshSourceBookmarks();
  }
  close({ restore = true, immediate = !restore } = {}) {
    this.#catalogueParked = false;
    this.#clearPreparationRetry();
    this.#clearSearch();
    this.#closePopup(false);
    this.#cancelNavigation();
    this.#captureReading();
    this.#cancelPiPHold();
    this.#documentLoad?.abort();
    this.#documentLoad = null;
    this.#leaveSource();
    const view = this.#view || this.#closing?.view || null;
    if (view && this.#dom) {
      view.scrollTop = this.#elements.body.scrollTop;
      view.scrollLeft = this.#elements.body.scrollLeft;
    }
    this.#view = null;
    this.#updateNavigationActions();
    if (!this.#dom || this.#closing && !immediate)
      return;
    const { dialog, body, document: content } = this.#elements;
    disposeDocumentContent(content);
    body.removeAttribute("aria-busy");
    this.#panelWidth?.setEnabled(false);
    const finish = () => {
      this.#closing = null;
      const { footer, footerHome } = this.#settings;
      this.#withFooterMove(() => {
        if (dialog.open)
          dialog.close();
        if (footer.parentElement !== footerHome)
          footerHome.append(footer);
      }, false);
      if (view)
        this.#emit("view-close", { token: view.request.token, restore });
      this.#notifyVisibility();
    };
    if (immediate || !dialog.open || !this.#motion) {
      this.#motion?.cancel(dialog);
      finish();
      return;
    }
    const style = this.#display.getComputedStyle(dialog);
    this.#closing = { view };
    this.#motion.play(dialog, [{ opacity: style.opacity, transform: style.transform }, {
      opacity: 0,
      transform: this.#offset()
    }], { finish });
  }
  forgetAccess() {
    this.#clearPreparationRetry();
    this.#clearSearch();
    this.#closePopup(false);
    this.#leaveSource();
    this.#cancelNavigation();
    if (this.#view || this.#closing || this.#dom?.dialog.open)
      this.close({ restore: false, immediate: true });
    this.#closing = null;
    if (this.#dom) {
      disposeDocumentContent(this.#elements.document);
      this.#elements.document.replaceChildren();
      render9(nothing11, this.#elements.state);
      render9(nothing11, this.#elements.tabs);
    }
  }
  forgetRepository(repository) {
    const requests = [this.#view?.request];
    if (this.#pendingRetry?.target.origin.id === repository.dataset.repository || requests.some((request) => request && (request.repository === repository.dataset.repository || repository.contains(request.token)))) {
      this.forgetAccess();
    }
  }
  showRepositoryUnavailable(repository, reason) {
    const request = this.#view?.request;
    const summary = repository.querySelector(":scope > summary");
    if (request?.kind === "documents" && request.repository === repository.dataset.repository && request.token === summary) {
      this.showAccessFailure(reason);
      return false;
    }
    const reopen = Boolean(request?.repository === repository.dataset.repository);
    this.forgetRepository(repository);
    return reopen;
  }
  forgetDetachedRows(repository) {
    const summary = repository.querySelector(":scope > summary");
    const detached = (request) => request && repository.contains(request.token) && request.token !== summary;
    if (detached(this.#view?.request)) {
      this.forgetAccess();
      return;
    }
  }
  retryCurrent() {
    if (this.#retry())
      return;
    const view = this.#view;
    if (!view || !this.#current(view))
      return;
    this.refreshCurrent();
  }
  showAccessFailure(reason) {
    this.#clearPreparationRetry();
    const view = this.#view;
    if (!view || view.request.kind !== "documents")
      return;
    if (!this.#current(view)) {
      this.forgetAccess();
      return;
    }
    this.#clearSearch();
    this.#closePopup(false);
    this.#documentLoad?.abort();
    if (!view.restoreReading)
      view.restoreReading = this.#entryData(view).reading;
    view.loadRevision = (view.loadRevision || 0) + 1;
    view.failed = false;
    view.type = null;
    const denied = { public: false, documents: {}, documentsDenied: true, reason, retryAvailable: true };
    view.request.readyDocuments = undefined;
    view.request.load = async (signal) => {
      if (signal.aborted)
        throw signal.reason;
      return denied;
    };
    view.result = denied;
    disposeDocumentContent(this.#elements.document);
    this.#elements.document.replaceChildren();
    this.#elements.body.removeAttribute("aria-busy");
    this.#renderTabs(view);
  }
  get isOpen() {
    return !this.#catalogueParked && Boolean(this.#view || this.#closing || this.#dom?.dialog.open);
  }
  get navigationRevision() {
    return this.#navigationRevision;
  }
  beginCatalogueNavigation() {
    this.#clearPreparationRetry();
    this.#cancelBookmarkDrag(false);
    this.#captureReading();
    this.#cancelNavigation();
    this.#cancelPiPHold();
    this.#closePopup(false);
    this.#documentLoad?.abort();
    this.#documentLoad = null;
    this.#sourceRequest?.stop();
    this.#sourceRequest?.resumeHighlight(this.#display);
    if (!this.#dom || !this.#options || this.#moving || this.#settings.standalone || !this.#smallScreen)
      return;
    this.#motion?.finishAll();
    this.#closing = null;
    const { dialog, body } = this.#elements;
    if (this.#view) {
      this.#view.scrollTop = body.scrollTop;
      this.#view.scrollLeft = body.scrollLeft;
      this.#catalogueParked = true;
    }
    this.#panelWidth?.setEnabled(false);
    this.#withFooterMove(() => {
      if (dialog.open)
        dialog.close();
      this.#settings.footerHome.append(this.#settings.footer);
    }, false);
    this.#releaseSearchProjection();
    this.#renderSearch();
    this.#updateNavigationActions();
    this.#notifyVisibility();
  }
  #notifyVisibility() {
    this.dispatchEvent(new Event("view-visibility", { bubbles: true }));
  }
  #cancelNavigation() {
    ++this.#navigationRevision;
    this.#navigationRequest?.abort();
    this.#navigationRequest = null;
    this.#historyRestoreRequest = null;
    this.#refreshingCurrent = false;
  }
  async navigate(target, {
    visit = "push",
    refresh = false,
    recordId,
    initialMode,
    defaultBranch = false,
    applySourcePin = false,
    signal,
    guard
  } = {}) {
    const address = readMaterialTarget(target);
    if (!address || signal?.aborted || guard && !guard() || !this.#events || this.#moving || !this.isConnected || !this.#motion)
      return false;
    if (this.#pendingRetry && targetKey(this.#pendingRetry.target) !== targetKey(address)) {
      this.#clearPreparationRetry();
    }
    const restored = recordId ? visit === "restore" ? this.#journal.historyEntry(recordId) : this.#journal.bookmarks.find((entry) => entry.id === recordId) || null : null;
    if (visit === "restore" && !restored)
      return false;
    const pending = visit === "restore" && recordId ? this.#pendingHistory.get(recordId) || null : null;
    const previous = this.#view;
    const owner = this.ownerDocument;
    const refreshing = refresh && visit === "replace" ? previous : null;
    const reading = restored?.reading || (visit === "replace" && previous ? this.#entryData(previous).reading : null);
    const preferred = this.#sourceModePreferenceApplies() ? this.#sourceMode : "documentation";
    const pinned = applySourcePin && address.kind === "source" && address.line === null ? this.#sourcePin === "last" ? this.#sourceMode : this.#sourcePin : preferred;
    const sourceMode = reading?.sourceMode || (initialMode === "source" ? "source" : initialMode === "documentation" ? pinned : address.kind === "declaration" || address.kind === "source" && address.line !== null ? "source" : pinned);
    const currentSource = !refresh && sourceMode === "source" && previous?.request.kind === "source-file" && previous.sourceMode === "source" && this.#current(previous) && this.#sourceRequest?.ready && !this.#elements.sourceHost.hidden && previous.request.readySource && previous.prepared && this.#settings.targetIsCurrent(previous.prepared) && (address.kind === "source" || address.kind === "declaration") && address.origin.kind === previous.target.origin.kind && address.origin.id === previous.target.origin.id && address.origin.url.toLowerCase() === previous.target.origin.url.toLowerCase() && address.path === previous.request.source.path && (defaultBranch || address.ref === previous.request.readySource.ref) ? previous.prepared : undefined;
    this.#captureReading();
    this.#cancelNavigation();
    const revision = this.#navigationRevision;
    const controller = new AbortController;
    this.#navigationRequest = controller;
    this.#historyRestoreRequest = visit === "restore" ? controller : null;
    this.#refreshingCurrent = Boolean(refreshing && this.#current(refreshing) && (targetKey(address) === targetKey(refreshing.target) || targetKey(address) === targetKey(refreshing.request.target)));
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", abort, { once: true });
    this.#setNavigationMessage("");
    this.#updateNavigationActions();
    try {
      if (!currentSource && sourceMode === "source" && (address.kind === "source" || address.kind === "declaration") && this.#sourceRequest) {
        await this.#sourceRequest.prepareShell(this.ownerDocument, controller.signal, this.#commandHome);
        if (controller.signal.aborted || guard && !guard() || revision !== this.#navigationRevision || this.#moving || !this.#events) {
          return false;
        }
      }
      const prepared = await this.#settings.prepareTarget(address, {
        signal: controller.signal,
        refresh,
        sourceMode,
        defaultBranch,
        currentSource
      });
      if (controller.signal.aborted || revision !== this.#navigationRevision || this.#moving || !this.#events || this.ownerDocument !== owner || guard && !guard() || !this.#settings.targetIsCurrent(prepared) || visit === "restore" && (!recordId || !this.#journal.historyEntry(recordId) && pending?.phase !== "removed"))
        return false;
      if (pending && pending.phase !== "cancelled" && prepared.denied) {
        throw new Error("The pending history material is unavailable.");
      }
      const request = prepared.request;
      if (request.kind === "source-file")
        request.initialMode = sourceMode;
      const result = request.kind === "documents" ? request.readyDocuments : undefined;
      let shownTarget = refreshing?.target || prepared.target;
      if (refreshing?.request.kind === "documents" && reading?.type && request.kind === "documents") {
        const selected = result?.documents[reading.type];
        if (!selected || typeof selected.content !== "string") {
          throw new Error("The current document is absent from the refreshed group.");
        }
        const path = refreshing.target.kind === "document" ? refreshing.target.path : refreshing.target.kind === "directory" ? refreshing.target.readmePath : refreshing.result?.documents[reading.type]?.path;
        if (!path || selected.path !== path) {
          throw new Error("The refreshed group no longer contains the current path.");
        }
      }
      if (request.kind === "documents" && result?.source) {
        const selected = firstDocument(result, request.types, reading?.type || null);
        if (selected)
          shownTarget = documentTarget(shownTarget, result.documents[selected], result.source.ref);
      }
      const view = {
        request,
        prepared,
        history: visit === "restore" || this.#refreshingCurrent && Boolean(previous?.history),
        target: shownTarget,
        result,
        context: {},
        mode: reading?.mode || "html",
        type: reading?.type || null,
        sourceMode: request.kind === "source-file" ? sourceMode : undefined,
        restoreReading: reading ? { ...reading } : null,
        tabIds: new Map
      };
      this.#recordingSuspended = true;
      try {
        this.#clearPreparationRetry();
        this.#settings.acceptTarget(prepared, shownTarget, {
          history: Boolean(view.history),
          refresh: this.#refreshingCurrent
        });
        const reuse = currentSource && previous && this.#view === previous && this.#current(previous) && previous.request.kind === "source-file" && this.#sourceRequest?.ready && request.kind === "source-file" && currentSource.request.kind === "source-file" && request.readySource === currentSource.request.readySource && request.source.ref === previous.request.source.ref && request.source.path === previous.request.source.path && prepared.accessRevision === currentSource.accessRevision && prepared.snapshot === currentSource.snapshot && prepared.accessProof === currentSource.accessProof && this.#settings.targetIsCurrent(currentSource);
        if (reuse)
          this.#reuseSource(view);
        else
          this.#present(view);
        if (pending && pending.phase !== "cancelled" && recordId) {
          this.#cancelHistoryRemoval(recordId);
          view.historyId = this.#journal.appendRestored(this.#entryData(view), recordId).id;
        } else {
          const historyId = visit === "replace" ? previous?.historyId || null : recordId;
          view.historyId = this.#journal.accept(this.#entryData(view), visit, historyId)?.id || null;
        }
      } finally {
        this.#recordingSuspended = false;
      }
      this.#closePopup(false);
      this.#reindexSearch();
      this.#setNavigationMessage("");
      return true;
    } catch {
      if (!controller.signal.aborted && (!guard || guard()) && revision === this.#navigationRevision) {
        this.#pendingRetry = { target: address, visit, refresh, recordId, initialMode, defaultBranch, applySourcePin };
        this.#setNavigationMessage(refresh ? ui_strings_default.navigation.refreshFailed : ui_strings_default.navigation.navigationFailed);
        if (!this.#view)
          this.#showPreparationFailure();
        this.#renderPopup();
      }
      return false;
    } finally {
      signal?.removeEventListener("abort", abort);
      if (this.#navigationRequest === controller) {
        this.#navigationRequest = null;
        this.#refreshingCurrent = false;
      }
      if (this.#historyRestoreRequest === controller)
        this.#historyRestoreRequest = null;
      this.#updateNavigationActions();
    }
  }
  refreshCurrent() {
    if (this.#catalogueParked)
      return Promise.resolve(false);
    const view = this.#view;
    const target = view?.request.kind === "documents" && (view.request.target.kind === "repository" || view.request.target.kind === "directory") ? view.request.target : view?.target;
    return view && target ? this.navigate(target, {
      visit: "replace",
      refresh: true,
      initialMode: view.request.kind === "source-file" ? view.sourceMode || "documentation" : undefined
    }) : Promise.resolve(false);
  }
  backward() {
    return this.#historyStep(-1);
  }
  forward() {
    return this.#historyStep(1);
  }
  #historyStep(direction) {
    const entry = this.#journal.adjacentHistory(direction);
    return entry ? this.navigate(entry.target, { visit: "restore", recordId: entry.id }) : Promise.resolve(false);
  }
  toggleCurrentViewMode() {
    this.#cancelNavigation();
    if (this.#popupKind === "bookmarks") {
      this.#journal.toggleBookmarkTree();
      this.#renderPopup();
      return;
    }
    const view = this.#view;
    if (!view || !this.#current(view))
      return;
    if (view.request.kind === "source-file") {
      this.#selectSourceTab(view, view.sourceMode === "source" ? "documentation" : "source", true);
    } else if (view.request.kind === "documents" && view.type) {
      this.#captureReading();
      view.pendingViewVisit = true;
      view.mode = view.mode === "html" ? "source" : "html";
      this.#showDocument(view);
      this.#recordViewTransition(view);
    }
  }
  #cycleSourcePin() {
    if (this.#view?.request.kind !== "source-file" || !this.#current(this.#view))
      return;
    this.#sourcePin = this.#sourcePin === "last" ? "documentation" : this.#sourcePin === "documentation" ? "source" : "last";
    try {
      localStorage.setItem(sourcePinKey, this.#sourcePin);
    } catch {}
    this.#showSourcePin();
  }
  #showSourcePin() {
    if (!this.#dom || this.#view?.request.kind !== "source-file")
      return;
    showDocumentMode(this.#elements.mode, {
      mode: `pin-${this.#sourcePin}`,
      label: this.#sourcePin === "documentation" ? ui_strings_default.navigation.sourcePinDocumentation : this.#sourcePin === "source" ? ui_strings_default.navigation.sourcePinSource : ui_strings_default.navigation.sourcePinLast,
      icon: this.#sourcePin === "last" ? controlIcon("source-pin-last") : html10`
          <span class="mode-pin-symbol">
            ${controlIcon(this.#sourcePin === "source" ? "code" : "document")}<span class="mode-pin-badge">${controlIcon("source-pin")}</span>
          </span>
        `
    });
  }
  refreshLinkMode() {
    this.#cancelNavigation();
    this.#updateNavigationActions();
    const view = this.#view;
    if (!view || !this.#dom)
      return;
    for (const link of this.#elements.state.querySelectorAll("a[data-material-target]")) {
      if (link.localName !== "a")
        continue;
      let target = null;
      try {
        target = readMaterialTarget(JSON.parse(link.getAttribute("data-material-target") || "null"));
      } catch {}
      const href = target && this.#settings.linkHref(target);
      if (href)
        link.setAttribute("href", href);
      else
        link.removeAttribute("href");
    }
    if (view.request.kind === "documents" && view.type) {
      refreshDocumentLinks(this.#elements.document, this.#contentOptions(view));
    }
    const rootLink = this.#elements.title.querySelector("a");
    if (rootLink) {
      const target = this.#headingTarget(view);
      const href = target && this.#settings.linkHref(target);
      if (href)
        rootLink.setAttribute("href", href);
      else
        rootLink.removeAttribute("href");
    }
  }
  #entryData(view) {
    return {
      target: view.target,
      title: targetTitle(view.target, view.request.title),
      reading: view.restoreReading ? { ...view.restoreReading } : {
        mode: view.mode,
        sourceMode: view.sourceMode || null,
        type: view.type,
        scrollTop: this.#dom && !this.#catalogueParked ? this.#elements.body.scrollTop : view.scrollTop || 0,
        scrollLeft: this.#dom && !this.#catalogueParked ? this.#elements.body.scrollLeft : view.scrollLeft || 0
      }
    };
  }
  #captureReading() {
    if (!this.#view || this.#recordingSuspended)
      return;
    if (this.#view.pendingViewVisit || this.#view.request.kind === "source-file" && this.#view.sourceMode === "source" && !this.#sourceRequest?.ready)
      return;
    this.#journal.updateCurrent(this.#entryData(this.#view), this.#view.historyId || null);
  }
  #recordShown(view) {
    if (this.#view !== view || this.#recordingSuspended || view.pendingViewVisit)
      return;
    this.#journal.updateCurrent(this.#entryData(view), view.historyId || null);
    this.#updateNavigationActions();
  }
  #recordViewTransition(view) {
    if (!view.pendingViewVisit || !this.#current(view) || this.#recordingSuspended)
      return;
    view.pendingViewVisit = false;
    view.historyId = this.#journal.accept(this.#entryData(view), "push", view.historyId || null, { view: true })?.id || null;
    this.#updateNavigationActions();
  }
  #restoreReading(view) {
    if (!view.restoreReading || !this.#displayCurrent(view))
      return;
    const reading = view.restoreReading;
    this.#elements.body.scrollTop = reading.scrollTop;
    this.#elements.body.scrollLeft = reading.scrollLeft;
    view.restoreReading = null;
  }
  #collectionRow(entry) {
    return collectionRow(entry, this.#journal.cursor, Boolean(this.#journal.bookmarkFor(entry.target)));
  }
  showHistory() {
    this.#showPopup("history");
  }
  showBookmarks() {
    this.#showPopup("bookmarks");
  }
  showFind() {
    if (!this.#events || this.#moving || !this.#searchBar)
      return;
    const retainedSelection = this.#searchOpen && this.#popupKind !== null && this.#searchProjection && this.#searchSelectionProjection === this.#searchProjection ? this.#searchProjection : null;
    if (!this.#refreshingCurrent)
      this.#cancelNavigation();
    this.#captureReading();
    this.#searchOpen = true;
    this.#reindexSearch();
    if (!retainedSelection || retainedSelection !== this.#searchProjection)
      this.#captureSearchSelection();
    if (this.#searchSelectionOnly)
      this.#findSearchMatches();
    if (this.#view && this.#current(this.#view) && !this.#view.prepared?.denied) {
      this.#closePopup(false);
      this.#renderSearch()?.focus({ preventScroll: true });
    } else
      this.#showPopup("search");
  }
  showSearchHistory() {
    this.#showPopup("searchHistory");
  }
  showOrganizationRoot() {
    this.#showPopup("organizationRoot");
  }
  #showPopup(kind) {
    if (!this.#popup || !this.#popupContent || this.#moving || !this.#events)
      return;
    if (this.#popupKind !== kind) {
      resetSearchHistory(this.#popupContent);
      this.#cancelPendingBookmarks();
      this.#bookmarkDeleteConfirm = null;
      this.#bookmarkNameMode = null;
      this.#jsonTransfer = null;
    }
    if (this.#popupKind !== kind && !(kind === "search" && this.#refreshingCurrent))
      this.#cancelNavigation();
    if (kind !== "search") {
      this.#searchDragStop?.();
      this.#searchDragStop = null;
    }
    this.#captureReading();
    if (!this.#popup.open) {
      this.#popupFocus = deepFocus(this.ownerDocument);
      this.#popupView = this.#matchingFooterView();
    }
    this.#popupKind = kind;
    if (kind === "search") {
      this.#searchOpen = true;
      this.#reindexSearch();
    }
    this.#renderPopup();
    this.#placePopup();
  }
  #matchingFooterView() {
    const view = this.#view;
    const target = this.#settings.footerTarget();
    return view && this.#current(view) && target && targetKey(target) === targetKey(view.target) ? view : null;
  }
  #capturePopupPlacement() {
    const popup = this.#popup;
    const content = this.#popupContent;
    if (!popup || !content || !this.#popupKind)
      return null;
    const focused = deepFocus(this.ownerDocument);
    return {
      focused: focused && popup.contains(focused) ? focused : null,
      scrollTop: popup.scrollTop,
      scrollLeft: popup.scrollLeft,
      contentTop: content.scrollTop,
      contentLeft: content.scrollLeft
    };
  }
  #placePopup(placement = null) {
    const popup = this.#popup;
    const content = this.#popupContent;
    if (!popup || !content || !this.#popupKind || !this.#events)
      return;
    if (!popup.open)
      popup.showModal();
    if (this.#popupKind === "search" && !this.#searchDragStop) {
      this.#searchDragStop = bindSearchDrag(popup, this.#events.signal);
    }
    const focused = placement?.focused;
    if (focused?.isConnected && focused.ownerDocument === this.ownerDocument && popup.contains(focused)) {
      focused.focus({ preventScroll: true });
    } else {
      const first = content.querySelector(this.#jsonTransfer ? "textarea" : "input, select, button");
      if (isHTMLElement(first))
        first.focus({ preventScroll: true });
      if (first?.tagName === "TEXTAREA" && this.#jsonTransfer && !this.#jsonTransfer.importing) {
        first.select();
      }
    }
    if (placement) {
      popup.scrollTop = placement.scrollTop;
      popup.scrollLeft = placement.scrollLeft;
      content.scrollTop = placement.contentTop;
      content.scrollLeft = placement.contentLeft;
    }
  }
  #renderPopup() {
    const popup = this.#popup;
    const container = this.#popupContent;
    if (!popup || !container || !this.#popupKind)
      return;
    this.#collectionStop?.();
    this.#collectionStop = null;
    popup.classList.toggle("is-search", this.#popupKind === "search");
    popup.classList.toggle("is-organization-root", this.#popupKind === "organizationRoot");
    const screen = this.#popupKind === "organizationRoot" ? "preferences" : this.#popupKind === "searchHistory" ? "search" : this.#popupKind;
    if ((screen === "bookmarks" || screen === "history" || screen === "preferences" || screen === "search") && !screenReady(screen)) {
      if (!this.#popupMarkup.has(screen))
        this.#loadPopupMarkup(screen);
      render9(screenStatus(this.#popupMarkup.get(screen) === "failed", () => this.#loadPopupMarkup(screen), () => this.#closePopup()), container);
      return;
    }
    if (this.#popupKind === "organizationRoot") {
      const model = this.#settings.getOrganizationRootControl();
      popup.setAttribute("aria-label", model.label);
      render9(renderOrganizationRootControl({
        ...model,
        id: "navigation-organization-root",
        onChange: undefined,
        save: (value) => {
          if (this.#moving)
            return false;
          const saved = this.#settings.getOrganizationRootControl().save?.(value) ?? false;
          this.#renderPopup();
          return saved;
        },
        reset: () => {
          if (this.#moving)
            return;
          this.#settings.getOrganizationRootControl().reset?.();
          this.#renderPopup();
        }
      }), container);
      return;
    }
    popup.setAttribute("aria-label", ui_strings_default.navigation[this.#popupKind]);
    if (this.#popupKind === "search") {
      this.#renderSearch();
      return;
    }
    if (this.#popupKind === "searchHistory") {
      renderSearchHistory(container, {
        queries: this.#searchState.queries,
        current: this.#searchState.latest,
        labels: {
          title: ui_strings_default.navigation.searchHistory,
          empty: ui_strings_default.navigation.searchHistoryEmpty,
          remove: ui_strings_default.navigation.searchHistoryRemove,
          close: ui_strings_default.navigation.close,
          message: this.#searchState.failure === "corrupt" ? ui_strings_default.navigation.storageCorrupt : this.#searchState.failure ? ui_strings_default.navigation.storageFailed : "",
          retry: ui_strings_default.navigation.retryStorage
        },
        icons: { remove: controlIcon("trash"), close: controlIcon("close") }
      }, {
        select: (query) => {
          if (this.#moving)
            return;
          this.#searchState.setLatest(query);
          this.#resetSearchRecall();
          this.#searchCurrent = -1;
          this.#findSearchMatches();
          this.showFind();
        },
        remove: (query) => {
          if (this.#moving)
            return;
          if (query === this.#searchState.latest)
            this.#searchDeletedDraft = query;
          this.#searchState.remove(query);
          this.#resetSearchRecall();
          this.#renderPopup();
        },
        close: () => this.#closePopup(),
        retry: () => {
          if (this.#moving)
            return;
          this.#searchState.retryStorage();
          this.#resetSearchRecall();
          this.#findSearchMatches();
          this.#renderPopup();
        },
        exportData: () => this.#searchState.exportData(),
        importData: (value) => {
          if (this.#moving)
            return false;
          const accepted = this.#searchState.importData(value);
          if (accepted)
            this.#resetSearchRecall();
          return accepted;
        },
        refresh: () => this.#renderPopup()
      });
      return;
    }
    const list = this.#popupKind;
    const labels = ui_strings_default.navigation;
    const entries = list === "bookmarks" ? this.#journal.bookmarks.filter((entry) => entry.groupId === this.#journal.currentGroup) : this.#journal.history;
    const groups = this.#journal.bookmarkGroups;
    const storageFailure = this.#journal.failure;
    const model = {
      rows: entries.map((entry) => {
        const row = bookmarkRow(entry, this.#journal.cursor, Boolean(this.#journal.bookmarkFor(entry.target)), this.#settings.targetUsesBranch?.(entry.target) === true, this.ownerDocument);
        const pending = list === "bookmarks" ? this.#pendingBookmarks.get(entry.id) : null;
        row.pendingRemove = list === "history" ? this.#pendingHistory.has(entry.id) : Boolean(pending);
        if (pending) {
          row.removeSeconds = Math.max(1, Math.ceil((pending.deadline - pending.display.performance.now()) / 1000));
        }
        const current = this.#settings.footerTarget();
        if (list === "bookmarks")
          row.active = Boolean(current && targetKey(current) === targetKey(entry.target));
        const target = entry.target;
        const path = target.kind === "repository" ? "" : target.kind === "directory" ? target.readmePath || target.path : target.path;
        const fileName = path.split("/").at(-1) || entry.title.name;
        const fileIcon = nodeIcon({
          type: target.kind === "directory" && target.readmePath === null ? "directory" : target.kind === "repository" ? "repository" : "file",
          name: fileName
        }, { repositories: true, directories: true, files: true, symbols: true });
        fileIcon?.removeAttribute("data-icon-group");
        if (fileIcon && fileIcon.ownerDocument !== this.ownerDocument)
          this.ownerDocument.adoptNode(fileIcon);
        return {
          ...row,
          fileKey: historyFileKey(target),
          fileName,
          fileIcon,
          ref: target.kind === "repository" ? "" : target.ref,
          groupId: entry.groupId || ""
        };
      }),
      ...list === "history" ? {
        controlsOpen: this.#historySettingsOpen,
        historyControls: { ...this.#journal.historySettings, empty: this.#journal.history.length === 0 },
        historyExclusions: {
          repositories: this.#journal.historyExclusions.map((item) => ({
            id: historyRepositoryKey(item.origin),
            name: item.name
          }))
        }
      } : {
        bookmarkGroups: {
          groups,
          currentGroup: this.#journal.currentGroup,
          canDeleteGroup: groups.length > 1,
          confirmDelete: this.#bookmarkDeleteConfirm === this.#journal.currentGroup,
          moveMode: groups.length > 1 && this.#bookmarkMoveMode,
          nameMode: this.#bookmarkNameMode
        }
      },
      ...this.#jsonTransfer ? { transfer: this.#jsonTransferView(this.#jsonTransfer) } : {},
      labels: {
        title: labels[list],
        empty: list === "history" ? labels.emptyHistory : labels.emptyBookmarks,
        remove: list === "bookmarks" ? labels.deleteBookmark : labels.remove,
        undo: labels.undo,
        addBookmark: labels.addBookmark,
        removeBookmark: labels.removeBookmark,
        reorder: labels.reorder,
        close: labels.close,
        toggleView: this.#journal.bookmarkTree ? labels.bookmarksList : labels.bookmarksTree,
        toggleControls: this.#historySettingsOpen ? labels.historyHideSettings : labels.historyShowSettings,
        message: storageFailure === "corrupt" ? labels.storageCorrupt : storageFailure ? labels.storageFailed : this.#navigationMessage,
        retry: labels.retryStorage,
        reset: labels.resetStorage,
        exportAll: list === "bookmarks" ? labels.bookmarksExportAll : labels.historyExport,
        importAll: list === "bookmarks" ? labels.bookmarksImportAll : labels.historyImport,
        actionMode: this.#bookmarkMoveMode ? labels.bookmarkShowDelete : labels.bookmarkShowMove,
        historyControls: {
          collect: labels.historyCollect,
          policy: labels.historyPolicy,
          all: labels.historyAll,
          merge: labels.historyMerge,
          unique: labels.historyUnique,
          includeView: labels.historyIncludeView,
          limit: labels.historyLimit,
          clear: labels.historyClear
        },
        historyExclusions: {
          label: labels.historyExcludedRepositories,
          empty: labels.historyNoExcludedRepositories,
          unblock: labels.historyUnblockRepository
        },
        bookmarkGroups: {
          select: labels.bookmarkGroupSelect,
          name: labels.bookmarkGroupName,
          create: labels.bookmarkGroupCreate,
          rename: labels.bookmarkGroupRename,
          delete: labels.bookmarkGroupDelete,
          confirmDelete: labels.bookmarkGroupConfirmDelete.replace("{name}", groups.find((group) => group.id === this.#journal.currentGroup)?.name || ""),
          confirm: labels.confirmDelete,
          cancel: labels.cancel,
          export: labels.bookmarkExport,
          import: labels.bookmarkImport,
          assign: labels.bookmarkGroupAssign
        }
      },
      icons: {
        bookmark: controlIcon("bookmark"),
        bookmarked: controlIcon("bookmark-added"),
        bookmarkRemove: controlIcon("bookmark-remove"),
        remove: controlIcon(list === "bookmarks" ? "trash.square" : "trash"),
        close: controlIcon("close"),
        view: controlIcon(this.#journal.bookmarkTree ? "bookmarks-list" : "bookmarks-tree"),
        controls: controlIcon("icons"),
        assign: controlIcon("bookmark.square"),
        exportAll: controlIcon(list === "bookmarks" ? "square.and.arrow.up.on.square" : "tray.and.arrow.up"),
        importAll: controlIcon(list === "bookmarks" ? "square.and.arrow.down.on.square" : "tray.and.arrow.down"),
        groups: {
          create: controlIcon("square.badge.plus"),
          rename: controlIcon("square.and.pencil"),
          remove: controlIcon("trash.square"),
          export: controlIcon("square.and.arrow.up"),
          import: controlIcon("square.and.arrow.down"),
          cancel: controlIcon("xmark.square")
        }
      }
    };
    const actions = {
      autoCollect: (value) => this.#setHistorySettings({ autoCollect: value }),
      policy: (value) => this.#setHistorySettings({ policy: value }),
      includeView: (value) => this.#setHistorySettings({ includeView: value }),
      limit: (value) => this.#setHistorySettings({ limit: value }),
      clear: () => this.#clearHistory(),
      exportAll: () => this.#openJSONTransfer(list === "bookmarks" ? "bookmarks" : "history", false),
      importAll: () => this.#openJSONTransfer(list === "bookmarks" ? "bookmarks" : "history", true),
      exportGroup: () => this.#openJSONTransfer("group", false),
      importGroup: () => this.#openJSONTransfer("group", true),
      editJSON: (value) => {
        const transfer = this.#jsonTransfer;
        if (this.#moving || !transfer?.importing)
          return;
        transfer.value = value;
        const refresh = transfer.confirming || Boolean(transfer.message);
        transfer.confirming = false;
        transfer.confirmation = "";
        transfer.message = "";
        if (refresh)
          this.#renderPopup();
      },
      selectImportMode: (mode) => {
        const transfer = this.#jsonTransfer;
        if (this.#moving || !transfer?.importing || transfer.scope === "history" || mode !== "merge" && mode !== "replace")
          return;
        transfer.mode = mode;
        transfer.confirming = false;
        transfer.confirmation = "";
        transfer.message = "";
        this.#renderPopup();
      },
      applyJSON: () => this.#applyJSONTransfer(),
      closeJSON: () => {
        if (this.#moving)
          return;
        this.#jsonTransfer = null;
        this.#renderPopup();
        this.#placePopup();
      },
      copyJSON: () => {
        this.#copyJSONTransfer();
      },
      toggleActionMode: () => {
        if (this.#moving)
          return;
        this.#cancelPendingBookmarks();
        this.#bookmarkMoveMode = !this.#bookmarkMoveMode;
        this.#renderPopup();
      },
      unblockRepository: (id) => {
        if (this.#moving)
          return;
        this.#journal.unblockRepository(id);
        this.#renderPopup();
        this.#updateNavigationActions();
      },
      selectGroup: (id) => {
        if (this.#moving)
          return;
        this.#cancelPendingBookmarks();
        this.#bookmarkDeleteConfirm = null;
        this.#bookmarkNameMode = null;
        this.#journal.selectGroup(id);
        this.#renderPopup();
      },
      createGroup: (name) => {
        if (this.#moving || this.#bookmarkNameMode !== "create")
          return;
        if (!this.#journal.createGroup(name)) {
          this.#setNavigationMessage(labels.bookmarkGroupInvalidName);
        } else {
          this.#cancelPendingBookmarks();
          this.#bookmarkDeleteConfirm = null;
          this.#bookmarkNameMode = null;
          this.#setNavigationMessage("");
        }
        this.#renderPopup();
      },
      renameGroup: (id, name) => {
        if (this.#moving || this.#bookmarkNameMode !== "rename" || id !== this.#journal.currentGroup)
          return;
        if (!this.#journal.renameGroup(id, name))
          this.#setNavigationMessage(labels.bookmarkGroupInvalidName);
        else {
          this.#bookmarkDeleteConfirm = null;
          this.#bookmarkNameMode = null;
          this.#setNavigationMessage("");
        }
        this.#renderPopup();
      },
      editGroupName: (mode) => {
        if (this.#moving || this.#jsonTransfer || this.#popupKind !== "bookmarks")
          return;
        this.#bookmarkNameMode = this.#bookmarkNameMode === mode ? null : mode;
        this.#bookmarkDeleteConfirm = null;
        this.#setNavigationMessage("");
        this.#renderPopup();
        const input = this.#popupContent?.querySelector("#bookmark-group-name");
        if (input?.tagName === "INPUT") {
          input.focus({ preventScroll: true });
          if (mode === "rename")
            input.select();
        }
      },
      cancelGroupName: () => {
        if (this.#moving)
          return;
        this.#bookmarkNameMode = null;
        this.#setNavigationMessage("");
        this.#renderPopup();
        this.#placePopup();
      },
      deleteGroup: (id) => {
        if (this.#moving || groups.length < 2 || id !== this.#journal.currentGroup)
          return;
        this.#cancelPendingBookmarks();
        this.#bookmarkNameMode = null;
        this.#bookmarkDeleteConfirm = id;
        this.#renderPopup();
      },
      confirmDeleteGroup: (id) => {
        if (this.#moving || this.#bookmarkDeleteConfirm !== id || id !== this.#journal.currentGroup)
          return;
        this.#cancelPendingBookmarks();
        this.#bookmarkDeleteConfirm = null;
        const removed = this.#journal.bookmarks.filter((entry) => entry.groupId === id);
        if (this.#journal.deleteGroup(id)) {
          for (const entry of removed)
            this.#refreshBookmarkHighlight(entry.target);
          this.#refreshSourceBookmarks();
          this.#updateNavigationActions();
        }
        if (this.#journal.bookmarkGroups.length < 2)
          this.#bookmarkMoveMode = false;
        this.#renderPopup();
      },
      cancelDeleteGroup: () => {
        if (this.#moving)
          return;
        this.#bookmarkDeleteConfirm = null;
        this.#renderPopup();
      },
      assignGroup: (id, groupId) => {
        if (this.#moving)
          return;
        this.#cancelBookmarkRemoval(id);
        this.#journal.assignGroup(id, groupId);
        this.#renderPopup();
      },
      open: (id) => {
        if (this.#moving)
          return;
        const entry = this.#journal[list].find((item) => item.id === id);
        if (!entry)
          return;
        if (list === "history")
          this.navigate(entry.target, { visit: "restore", recordId: id });
        else
          this.#openBookmark(entry);
      },
      remove: (id) => {
        if (this.#moving)
          return;
        if (list === "history")
          this.#scheduleHistoryRemoval(id);
        else
          this.#scheduleBookmarkRemoval(id);
        this.#renderPopup();
        this.#updateNavigationActions();
        this.#refreshSourceBookmarks();
      },
      undo: (id) => {
        if (this.#moving)
          return;
        if (list === "history")
          this.#cancelHistoryRemoval(id);
        else
          this.#cancelBookmarkRemoval(id);
        this.#renderPopup();
      },
      bookmark: (id) => {
        if (this.#moving)
          return;
        const entry = this.#journal[list].find((item) => item.id === id);
        if (!entry)
          return;
        if (this.#journal.bookmarkFor(entry.target))
          this.#journal.removeBookmark(entry.target);
        else
          this.#journal.addBookmark(entry);
        this.#refreshBookmarkHighlight(entry.target);
        this.#renderPopup();
        this.#refreshSourceBookmarks();
      },
      reorder: (id, before) => {
        if (this.#moving)
          return;
        this.#journal.reorder(list, id, before);
        this.#renderPopup();
        this.#updateNavigationActions();
      },
      close: () => this.#closePopup(),
      ...storageFailure ? {
        retry: () => {
          if (this.#moving)
            return;
          this.#cancelPendingHistory();
          this.#cancelPendingBookmarks();
          this.#jsonTransfer = null;
          this.#bookmarkDeleteConfirm = null;
          this.#bookmarkNameMode = null;
          this.#cancelNavigation();
          this.#journal.retryStorage();
          this.#renderPopup();
          this.#updateNavigationActions();
        },
        ...storageFailure === "corrupt" ? {
          reset: () => {
            if (this.#moving)
              return;
            this.#cancelPendingHistory();
            this.#cancelPendingBookmarks();
            this.#jsonTransfer = null;
            this.#bookmarkDeleteConfirm = null;
            this.#bookmarkNameMode = null;
            this.#cancelNavigation();
            this.#journal.discardStored();
            this.#renderPopup();
            this.#updateNavigationActions();
          }
        } : {}
      } : {}
    };
    if (list === "bookmarks") {
      delete actions.bookmark;
      actions.toggleView = () => this.toggleCurrentViewMode();
      this.#collectionStop = renderBookmarks(container, { ...model, tree: this.#journal.bookmarkTree }, actions);
    } else {
      actions.toggleControls = () => {
        if (this.#moving || this.#jsonTransfer || this.#popupKind !== "history")
          return;
        this.#historySettingsOpen = !this.#historySettingsOpen;
        this.#renderPopup();
        this.#placePopup();
      };
      this.#collectionStop = renderHistory(container, model, actions);
    }
  }
  #loadPopupMarkup(screen) {
    if (this.#popupMarkup.get(screen) === "loading" || screenReady(screen))
      return;
    this.#popupMarkup.set(screen, "loading");
    const refresh = () => {
      const current = this.#popupKind === "organizationRoot" ? "preferences" : this.#popupKind === "searchHistory" ? "search" : this.#popupKind;
      if (current === screen && this.#events && !this.#moving) {
        this.#renderPopup();
        this.#placePopup();
      }
      if (screen === "search" && this.#searchOpen && this.#events && !this.#moving) {
        const input = this.#renderSearch();
        if (!this.#popupKind || this.#popupKind === "search")
          input?.focus({ preventScroll: true });
      }
    };
    loadScreen(screen).then(() => {
      this.#popupMarkup.delete(screen);
    }).catch(() => {
      this.#popupMarkup.set(screen, "failed");
    }).finally(refresh);
    refresh();
  }
  #openJSONTransfer(scope, importing) {
    if (this.#moving || !this.#events || this.#popupKind !== (scope === "history" ? "history" : "bookmarks"))
      return;
    this.#captureReading();
    this.#cancelNavigation();
    let value = "";
    if (!importing) {
      const data = scope === "history" ? this.#journal.exportHistory(this.#searchState.queries) : this.#journal.exportBookmarks(scope === "bookmarks");
      value = JSON.stringify(data, null, 2);
    }
    this.#cancelPendingBookmarks();
    this.#bookmarkDeleteConfirm = null;
    this.#bookmarkNameMode = null;
    this.#jsonTransfer = {
      scope,
      importing,
      value,
      mode: scope === "history" ? "replace" : "merge",
      confirming: false,
      confirmation: "",
      message: ""
    };
    this.#renderPopup();
    this.#placePopup();
  }
  #jsonTransferView(transfer) {
    const labels = ui_strings_default.navigation;
    const name = this.#journal.bookmarkGroups.find((group) => group.id === this.#journal.currentGroup)?.name || "";
    const title = transfer.scope === "history" ? transfer.importing ? labels.historyImport : labels.historyExport : transfer.scope === "bookmarks" ? transfer.importing ? labels.bookmarksImportAll : labels.bookmarksExportAll : transfer.importing ? labels.bookmarkImport : labels.jsonExportSelected.replace("{name}", name);
    return {
      title,
      value: transfer.value,
      importing: transfer.importing,
      allowMerge: transfer.scope !== "history",
      mode: transfer.mode,
      confirming: transfer.confirming,
      message: transfer.message,
      hint: !transfer.importing ? labels.jsonExportHint : transfer.scope === "history" ? labels.jsonImportHistoryHint : transfer.scope === "group" ? labels.jsonImportGroupHint : labels.jsonImportBookmarksHint,
      field: labels.jsonField,
      merge: labels.jsonMerge,
      replace: labels.jsonReplace,
      confirmation: transfer.confirmation,
      apply: labels.jsonApply,
      confirm: labels.jsonConfirmReplace,
      copy: labels.jsonCopy,
      cancel: transfer.importing ? labels.cancel : labels.jsonDone
    };
  }
  #applyJSONTransfer() {
    const transfer = this.#jsonTransfer;
    if (this.#moving || !transfer?.importing)
      return;
    const labels = ui_strings_default.navigation;
    const reject = (message) => {
      transfer.message = message;
      transfer.confirming = false;
      transfer.confirmation = "";
      this.#renderPopup();
    };
    const byteLimit = 5 * 1024 * 1024;
    if (transfer.value.length > byteLimit || new TextEncoder().encode(transfer.value).byteLength > byteLimit) {
      reject(labels.jsonTooLarge);
      return;
    }
    let value;
    try {
      value = JSON.parse(transfer.value);
    } catch {
      reject(labels.jsonInvalid);
      return;
    }
    const expectedType = transfer.scope === "group" ? "bookmark-group" : transfer.scope === "bookmarks" ? "bookmark-groups" : "history";
    if (!value || typeof value !== "object" || Array.isArray(value) || !("type" in value) || value.type !== expectedType) {
      reject(labels.jsonWrongType);
      return;
    }
    if (!("version" in value) || value.version !== 1) {
      reject(labels.jsonUnsupportedVersion);
      return;
    }
    const history = transfer.scope === "history" ? readHistoryTransfer(value) : null;
    const bookmarks = transfer.scope === "history" ? null : readBookmarkTransfer(value);
    if (transfer.scope === "history" ? !history : !bookmarks) {
      reject(transfer.scope === "history" ? labels.jsonInvalidHistory : labels.jsonInvalidBookmarks);
      return;
    }
    const queries = history ? readSearchQueries(history.searchQueries) : null;
    if (history && !queries) {
      reject(labels.jsonInvalidQueries);
      return;
    }
    if (transfer.mode === "replace" && !transfer.confirming) {
      transfer.message = "";
      transfer.confirming = true;
      transfer.confirmation = history ? labels.jsonReplaceHistory : bookmarks?.type === "bookmark-group" ? labels.jsonReplaceGroup.replace("{name}", bookmarks.group.name) : labels.jsonReplaceBookmarks;
      this.#renderPopup();
      return;
    }
    this.#cancelNavigation();
    this.#cancelPendingBookmarks();
    const previousBookmarks = this.#journal.bookmarks;
    let accepted = false;
    if (history && queries) {
      this.#cancelPendingHistory();
      if (this.#pendingRetry?.visit === "restore")
        this.#clearPreparationRetry();
      accepted = this.#journal.importHistory(history);
      if (accepted) {
        this.#searchState.mergeQueries(queries);
        this.#resetSearchRecall();
        if (this.#view) {
          this.#view.historyId = null;
          this.#view.pendingViewVisit = false;
        }
      }
    } else if (bookmarks)
      accepted = this.#journal.importBookmarks(bookmarks, transfer.mode);
    if (!accepted) {
      reject(history ? labels.jsonInvalidHistory : labels.jsonInvalidBookmarks);
      return;
    }
    this.#jsonTransfer = null;
    this.#bookmarkDeleteConfirm = null;
    this.#bookmarkNameMode = null;
    if (this.#journal.bookmarkGroups.length < 2)
      this.#bookmarkMoveMode = false;
    for (const entry of previousBookmarks)
      this.#refreshBookmarkHighlight(entry.target);
    this.#refreshSourceBookmarks();
    this.#setNavigationMessage(this.#journal.failure || history && this.#searchState.failure ? labels.storageFailed : labels.jsonImported);
    this.#renderPopup();
    this.#placePopup();
  }
  async#copyJSONTransfer() {
    const transfer = this.#jsonTransfer;
    if (this.#moving || !transfer || transfer.importing)
      return;
    let message = ui_strings_default.appearance.copied;
    try {
      const clipboard = this.ownerDocument.defaultView?.navigator.clipboard;
      if (!clipboard)
        throw new Error("Clipboard is unavailable");
      await clipboard.writeText(transfer.value);
    } catch {
      message = ui_strings_default.navigation.jsonCopyFailed;
    }
    if (this.#moving || this.#jsonTransfer !== transfer || !this.#events)
      return;
    transfer.message = message;
    this.#renderPopup();
    this.#placePopup();
  }
  #setHistorySettings(changes) {
    if (this.#moving)
      return;
    this.#captureReading();
    if (this.#historyRestoreRequest)
      this.#cancelNavigation();
    if (!this.#journal.setHistorySettings(changes))
      return;
    for (const id of this.#pendingHistory.keys()) {
      if (!this.#journal.historyEntry(id))
        this.#cancelHistoryRemoval(id);
    }
    if (this.#pendingRetry?.visit === "restore" && (!this.#pendingRetry.recordId || !this.#journal.historyEntry(this.#pendingRetry.recordId)))
      this.#clearPreparationRetry();
    this.#renderPopup();
    this.#updateNavigationActions();
  }
  #clearHistory() {
    if (this.#moving)
      return;
    if (this.#historyRestoreRequest)
      this.#cancelNavigation();
    this.#cancelPendingHistory();
    if (this.#pendingRetry?.visit === "restore")
      this.#clearPreparationRetry();
    this.#journal.clearHistory();
    if (this.#view) {
      this.#view.historyId = null;
      this.#view.pendingViewVisit = false;
    }
    this.#renderPopup();
    this.#updateNavigationActions();
  }
  #readyHistoryData() {
    const view = this.#view;
    if (!view || !this.#current(view) || view.failed || view.prepared?.denied)
      return null;
    if (view.request.kind === "documents") {
      if (!view.type || typeof view.result?.documents[view.type]?.content !== "string")
        return null;
    } else if (view.request.kind === "source-file" && view.sourceMode === "source" && !this.#sourceRequest?.ready) {
      return null;
    }
    return this.#entryData(view);
  }
  #manualHistoryState() {
    const data = this.#readyHistoryData();
    if (this.#journal.historySettings.autoCollect) {
      return {
        mode: data && this.#journal.repositoryExcluded(data.target.origin) ? "allow-repository" : "exclude-repository",
        enabled: Boolean(data)
      };
    }
    if (!data)
      return { mode: "add", enabled: false };
    const key = historyFileKey(data.target);
    const entries = this.#journal.history.filter((entry) => historyFileKey(entry.target) === key);
    return {
      mode: entries.some((entry) => this.#pendingHistory.has(entry.id)) ? "undo" : entries.length ? "remove" : "add",
      enabled: true
    };
  }
  toggleManualHistory() {
    if (this.#moving)
      return;
    const data = this.#readyHistoryData();
    if (!data)
      return;
    if (this.#journal.historySettings.autoCollect) {
      this.#journal.setRepositoryExcluded(data.target.origin, !this.#journal.repositoryExcluded(data.target.origin), repositoryName(data.target.origin));
      this.#renderPopup();
      this.#updateNavigationActions();
      return;
    }
    const key = historyFileKey(data.target);
    const entries = this.#journal.history.filter((entry) => historyFileKey(entry.target) === key);
    if (entries.some((entry) => this.#pendingHistory.has(entry.id))) {
      for (const entry of entries)
        this.#cancelHistoryRemoval(entry.id);
    } else if (entries.length) {
      for (const entry of entries)
        this.#scheduleHistoryRemoval(entry.id);
    } else {
      const entry = this.#journal.accept(data, "push", undefined, { force: true });
      if (this.#view)
        this.#view.historyId = entry?.id || null;
    }
    this.#renderPopup();
    this.#updateNavigationActions();
  }
  #scheduleHistoryRemoval(id) {
    if (this.#moving)
      return;
    if (this.#pendingHistory.has(id) || !this.#journal.historyEntry(id))
      return;
    const display = this.#commandHome.defaultView || this.#display;
    const pending = { timer: 0, phase: "waiting" };
    pending.timer = display.setTimeout(() => {
      if (pending.phase !== "waiting")
        return;
      pending.phase = "removed";
      this.#pendingHistory.delete(id);
      this.#journal.remove("history", id);
      if (this.#popupKind === "history")
        this.#renderPopup();
      this.#updateNavigationActions();
    }, 4000);
    this.#pendingHistory.set(id, pending);
  }
  #cancelHistoryRemoval(id) {
    const pending = this.#pendingHistory.get(id);
    if (!pending)
      return;
    (this.#commandHome.defaultView || this.#display).clearTimeout(pending.timer);
    pending.phase = "cancelled";
    this.#pendingHistory.delete(id);
  }
  #cancelPendingHistory() {
    for (const id of this.#pendingHistory.keys())
      this.#cancelHistoryRemoval(id);
  }
  #scheduleBookmarkRemoval(id) {
    if (this.#moving || this.#popupKind !== "bookmarks" || this.#jsonTransfer || this.#pendingBookmarks.has(id))
      return;
    const entry = this.#journal.bookmarks.find((item) => item.id === id);
    if (!entry || entry.groupId !== this.#journal.currentGroup)
      return;
    const display = this.#display;
    const pending = {
      display,
      timer: 0,
      deadline: display.performance.now() + 3000,
      entry,
      targetKey: targetKey(entry.target),
      groupId: this.#journal.currentGroup
    };
    const tick = () => {
      if (this.#pendingBookmarks.get(id) !== pending)
        return;
      if (this.#moving || !this.#events || this.#popupKind !== "bookmarks" || this.#jsonTransfer || this.#journal.currentGroup !== pending.groupId || pending.entry.groupId !== pending.groupId || targetKey(pending.entry.target) !== pending.targetKey || this.#journal.bookmarks.find((item) => item.id === id) !== pending.entry || this.#display !== pending.display) {
        this.#cancelBookmarkRemoval(id);
        return;
      }
      const remaining = pending.deadline - display.performance.now();
      if (remaining <= 0) {
        this.#pendingBookmarks.delete(id);
        pending.timer = 0;
        this.#journal.remove("bookmarks", id);
        this.#refreshBookmarkHighlight(entry.target);
        this.#refreshSourceBookmarks();
        this.#updateNavigationActions();
        this.#renderPopup();
      } else {
        const counter = this.#popupContent?.querySelector(`[data-record-id="${id}"] .navigation-remove-countdown`);
        if (counter)
          counter.textContent = `${Math.ceil(remaining / 1000)} с`;
        pending.timer = display.setTimeout(tick, Math.min(1000, remaining));
      }
    };
    this.#pendingBookmarks.set(id, pending);
    pending.timer = display.setTimeout(tick, 1000);
  }
  #cancelBookmarkRemoval(id) {
    const pending = this.#pendingBookmarks.get(id);
    if (!pending)
      return;
    pending.display.clearTimeout(pending.timer);
    this.#pendingBookmarks.delete(id);
  }
  #cancelPendingBookmarks() {
    for (const id of this.#pendingBookmarks.keys())
      this.#cancelBookmarkRemoval(id);
  }
  #closePopup(restoreFocus = true) {
    if (this.#moving && restoreFocus)
      return;
    if (this.#popupContent)
      resetSearchHistory(this.#popupContent);
    this.#cancelPendingBookmarks();
    this.#bookmarkDeleteConfirm = null;
    this.#bookmarkNameMode = null;
    this.#jsonTransfer = null;
    this.#searchDragStop?.();
    this.#searchDragStop = null;
    const view = this.#popupView;
    const kind = this.#popupKind;
    this.#popupView = null;
    if (restoreFocus && this.#popupKind === "search") {
      if (this.#searchState.latest !== this.#searchDeletedDraft)
        this.#searchState.commit();
      this.#clearSearch();
    }
    this.#collectionStop?.();
    this.#collectionStop = null;
    this.#popupKind = null;
    if (this.#popup?.open)
      this.#popup.close();
    if (this.#popupContent)
      render9(nothing11, this.#popupContent);
    const focus = this.#popupFocus;
    this.#popupFocus = null;
    if (restoreFocus && focus?.isConnected && focus.ownerDocument === this.ownerDocument) {
      focus.focus({ preventScroll: true });
    }
    if (restoreFocus && view && this.#current(view))
      this.#announceShown(view);
    if (kind && kind !== "search" && this.#searchOpen) {
      this.#reindexSearch();
      if (restoreFocus && (!this.#view || !this.#current(this.#view) || this.#view.prepared?.denied)) {
        this.#showPopup("search");
      }
    }
  }
  #announceShown(view) {
    if (!this.#displayCurrent(view))
      return;
    const request = view.request;
    if (request.kind === "documents" && view.type && view.result?.source) {
      const document2 = view.result.documents[view.type];
      if (typeof document2?.content === "string") {
        this.#emit("document-select", {
          token: request.token,
          context: view.context,
          source: view.result.source,
          document: { path: document2.path, url: document2.url },
          target: view.target
        });
        return;
      }
    }
    if (request.kind === "source-file" && view.sourceMode === "source" && request.readySource && this.#sourceRequest?.ready) {
      this.#emit("document-select", {
        token: request.token,
        context: view.context,
        source: { url: request.source.url, ref: request.readySource.ref },
        document: { path: request.source.path, url: githubHref(view.target) },
        target: view.target
      });
      return;
    }
    this.#emit("view-open", { token: request.token, target: view.target });
  }
  #searchRoot() {
    const view = this.#view;
    if (!view || !this.#displayCurrent(view))
      return null;
    if (view.request.kind === "documents") {
      return view.type && typeof view.result?.documents[view.type]?.content === "string" ? this.#elements.document : null;
    }
    if (view.request.kind === "source-file" && view.sourceMode === "source") {
      return this.#sourceRequest?.ready && !this.#elements.sourceHost.hidden ? this.#elements.sourceHost.querySelector("[data-source-code]") : null;
    }
    return this.#elements.state.querySelector(".doc-section") ? this.#elements.state : null;
  }
  #renderSearch() {
    const embedded = Boolean(this.#view && this.#displayCurrent(this.#view) && !this.#view.prepared?.denied);
    if (embedded && this.#popupKind === "search")
      this.#closePopup(false);
    if (this.#searchBar)
      this.#searchBar.hidden = !this.#searchOpen || !embedded;
    const container = embedded ? this.#searchBar : this.#popupKind === "search" ? this.#popupContent : null;
    if (!this.#searchOpen || !container)
      return null;
    if (!screenReady("search")) {
      if (!this.#popupMarkup.has("search"))
        this.#loadPopupMarkup("search");
      render9(screenStatus(this.#popupMarkup.get("search") === "failed", () => {
        this.#popupMarkup.delete("search");
        this.#renderSearch();
      }), container);
      return null;
    }
    const count = this.#searchMatches.starts.length;
    return renderSearch(container, {
      query: this.#searchState.latest,
      current: count ? this.#searchCurrent + 1 : 0,
      total: count,
      embedded,
      collecting: this.#searchState.collecting,
      selectionOnly: this.#searchSelectionOnly,
      canSelection: this.#searchSelectionOnly || Boolean(this.#searchSelectionBounds && this.#searchSelectionProjection === this.#searchProjection),
      labels: {
        label: ui_strings_default.navigation.searchInMaterial,
        placeholder: this.#searchProjection ? ui_strings_default.navigation.searchPlaceholder : ui_strings_default.navigation.searchUnavailable,
        previous: ui_strings_default.navigation.searchPrevious,
        next: ui_strings_default.navigation.searchNext,
        clear: ui_strings_default.navigation.searchClear,
        count: formatText(ui_strings_default.navigation.searchCount, { current: count ? this.#searchCurrent + 1 : 0, total: count }),
        selection: this.#searchSelectionOnly ? ui_strings_default.navigation.searchWholeMaterial : ui_strings_default.navigation.searchSelection,
        collecting: this.#searchState.collecting ? ui_strings_default.navigation.searchCollectingOn : ui_strings_default.navigation.searchCollectingOff,
        close: ui_strings_default.navigation.close,
        history: ui_strings_default.navigation.searchHistory
      },
      icons: {
        previous: controlIcon("search-previous"),
        next: controlIcon("search-next"),
        clear: controlIcon("search-clear"),
        selection: controlIcon("search-selection"),
        collecting: controlIcon(this.#searchState.collecting ? "search-collect-on" : "search-collect-off"),
        close: controlIcon("close"),
        history: controlIcon("history")
      }
    }, {
      input: (query) => this.#searchInput(query),
      recall: (direction) => this.#recallSearch(direction),
      submit: () => this.#searchStep(1),
      previous: () => this.#searchStep(-1),
      next: () => this.#searchStep(1),
      clear: () => this.#removeSearchQuery(),
      toggleSelection: () => this.#toggleSearchSelection(),
      toggleCollecting: () => {
        if (this.#moving)
          return;
        this.#searchState.setCollecting(!this.#searchState.collecting);
        this.#renderSearch();
        this.#updateNavigationActions();
      },
      close: () => this.#closeSearch(),
      history: () => this.showSearchHistory()
    });
  }
  #captureSearchSelection() {
    const projection = this.#searchProjection;
    if (!projection || projection.document !== this.ownerDocument || this.#searchRoot() !== this.#searchProjectionRoot)
      return;
    const selection = this.ownerDocument.getSelection();
    const emptyNative = !selection || selection.isCollapsed || !selection.rangeCount;
    const bounds = !emptyNative ? searchBoundsForRange(projection, selection.getRangeAt(0)) : null;
    if (!bounds) {
      if (emptyNative && this.#searchSelectionOnly && this.#searchSelectionBounds && this.#searchSelectionProjection === projection)
        return;
      const focused = deepFocus(this.ownerDocument);
      const ownControl = focused?.matches("input,textarea,select,button") && (this.#searchBar?.contains(focused) || this.#popupKind === "search" && this.#popup?.contains(focused));
      if (emptyNative && ownControl && this.#searchSelectionBounds && this.#searchSelectionProjection === projection) {
        return;
      }
      this.#searchSelectionBounds = null;
      this.#searchSelectionProjection = null;
      return;
    }
    this.#searchSelectionBounds = bounds;
    this.#searchSelectionProjection = projection;
  }
  #toggleSearchSelection() {
    if (!this.#searchOpen || this.#moving)
      return;
    if (this.#searchSelectionOnly)
      this.#searchSelectionOnly = false;
    else {
      this.#captureSearchSelection();
      if (!this.#searchSelectionBounds || this.#searchSelectionProjection !== this.#searchProjection)
        return;
      this.#searchSelectionOnly = true;
    }
    this.#searchCurrent = -1;
    this.#findSearchMatches();
    this.#renderSearch();
    this.#searchPainter?.scrollCurrent();
  }
  #resetSearchRecall() {
    this.#searchRecallIndex = -1;
    this.#searchRecallDraft = "";
  }
  #recallSearch(direction) {
    if (!this.#searchOpen || this.#moving || !this.#searchState.queries.length)
      return;
    if (this.#searchRecallIndex < 0) {
      if (direction === 1)
        return;
      this.#searchRecallDraft = this.#searchState.latest;
    }
    const index = Math.min(this.#searchState.queries.length - 1, this.#searchRecallIndex - direction);
    if (index < 0) {
      const draft = this.#searchRecallDraft;
      this.#resetSearchRecall();
      this.#searchState.setLatest(draft);
    } else {
      this.#searchRecallIndex = index;
      this.#searchState.setLatest(this.#searchState.queries[index]);
    }
    this.#searchCurrent = -1;
    this.#findSearchMatches();
    this.#renderSearch();
    this.#searchPainter?.scrollCurrent();
    this.#updateNavigationActions();
  }
  #removeSearchQuery() {
    if (this.#moving || !this.#searchOpen)
      return;
    this.#searchState.remove(this.#searchState.latest);
    this.#searchInput("");
  }
  #closeSearch(commit = true, restoreFocus = true) {
    if (this.#moving || !this.#searchOpen)
      return;
    if (commit && this.#searchState.latest !== this.#searchDeletedDraft)
      this.#searchState.commit();
    this.#clearSearch();
    if (this.#popupKind === "search")
      this.#closePopup(false);
    if (restoreFocus && this.#view && this.#current(this.#view))
      this.#elements.body.focus({ preventScroll: true });
    this.#updateNavigationActions();
  }
  #releaseSearchProjection() {
    this.#searchPainter?.clear();
    if (this.#searchProjection)
      releaseSearchProjection(this.#searchProjection);
    this.#searchProjection = null;
    this.#searchProjectionRoot = null;
    this.#searchSelectionBounds = null;
    this.#searchSelectionProjection = null;
    this.#searchSelectionOnly = false;
    this.#searchMatches = { starts: new Uint32Array, ends: new Uint32Array };
  }
  #clearSearch() {
    this.#releaseSearchProjection();
    this.#searchOpen = false;
    if (this.#searchBar)
      this.#searchBar.hidden = true;
    this.#resetSearchRecall();
    this.#searchCurrent = -1;
  }
  #reindexSearch() {
    if (!this.#searchOpen || this.#moving && !this.#resumingDisplay)
      return;
    const root = this.#searchRoot();
    if (!root || root !== this.#searchProjectionRoot || this.#searchProjection?.document !== this.ownerDocument) {
      this.#releaseSearchProjection();
      if (root) {
        this.#searchProjectionRoot = root;
        this.#searchProjection = createSearchProjection(root);
        this.#findSearchMatches();
      }
    }
    this.#renderSearch();
  }
  #searchInput(query) {
    if (!this.#searchOpen || this.#moving)
      return;
    this.#searchState.setLatest(query);
    this.#searchDeletedDraft = null;
    this.#resetSearchRecall();
    this.#searchCurrent = -1;
    this.#findSearchMatches();
    this.#renderSearch();
    this.#searchPainter?.scrollCurrent();
    this.#updateNavigationActions();
  }
  #findSearchMatches() {
    const projection = this.#searchProjection;
    this.#searchMatches = projection ? findSearchMatches(projection.text, projection.blocks, this.#searchState.latest, this.#searchSelectionOnly ? this.#searchSelectionProjection === projection ? this.#searchSelectionBounds : null : undefined) : { starts: new Uint32Array, ends: new Uint32Array };
    const count = this.#searchMatches.starts.length;
    this.#searchCurrent = count ? Math.min(Math.max(this.#searchCurrent, 0), count - 1) : -1;
    this.#paintSearch();
  }
  #searchStep(direction) {
    if (!this.#searchOpen || this.#moving)
      return;
    this.#searchDeletedDraft = null;
    this.#searchState.commit();
    this.#resetSearchRecall();
    this.#searchCurrent = circularSearchIndex(this.#searchCurrent, this.#searchMatches.starts.length, direction);
    this.#paintSearch();
    this.#renderSearch();
    this.#searchPainter?.scrollCurrent();
    this.#updateNavigationActions();
  }
  #paintSearch() {
    if (!this.#searchProjection || this.#searchCurrent < 0) {
      this.#searchPainter?.clear();
      return;
    }
    this.#searchPainter?.show(this.#searchProjection, this.#searchMatches.starts[this.#searchCurrent], this.#searchMatches.ends[this.#searchCurrent]);
  }
  async#openBookmark(entry) {
    const opened = await this.navigate(entry.target, { recordId: entry.id });
    if (opened)
      this.#journal.rememberBookmark(entry.id);
    return opened;
  }
  #updateNavigationActions() {
    if (!this.#navigationActions || !this.#options)
      return;
    const mode = this.#options.getLinkMode();
    const manual = this.#manualHistoryState();
    const manualLabel = manual.mode === "undo" ? ui_strings_default.navigation.historyUndoRemoval : manual.mode === "remove" ? ui_strings_default.navigation.historyRemoveFile : manual.mode === "allow-repository" ? ui_strings_default.navigation.historyAllowRepository : manual.mode === "exclude-repository" ? ui_strings_default.navigation.historyExcludeRepository : ui_strings_default.navigation.historyAddFile;
    showNavigationActions(this.#navigationActions, {
      canBack: Boolean(this.#journal.adjacentHistory(-1)),
      canForward: Boolean(this.#journal.adjacentHistory(1)),
      canHistory: true,
      canRefresh: Boolean(this.#view && !this.#catalogueParked && !this.#navigationRequest),
      linkLabel: ui_strings_default.navigation[mode],
      linkTooltip: navigationTooltip(ui_strings_default.navigation[mode], "B", ui_strings_default.navigation.linkModeHold),
      linkIcon: controlIcon(mode === "vscode" ? "link-vscode" : mode === "github" ? "link-github" : "link-internal"),
      manualHistoryMode: manual.mode,
      canManualHistory: manual.enabled,
      manualHistoryLabel: manualLabel,
      manualHistoryIcon: controlIcon(manual.mode === "remove" ? "history-subtract" : manual.mode === "undo" ? "reset" : manual.mode === "allow-repository" ? "history-allow-repository" : manual.mode === "exclude-repository" ? "history-exclude-repository" : "history-add")
    });
    const notice = this.querySelector("#navigation-status");
    if (isHTMLElement(notice)) {
      notice.textContent = this.#journal.failure === "corrupt" ? ui_strings_default.navigation.storageCorrupt : this.#journal.failure ? ui_strings_default.navigation.storageFailed : this.#searchState.failure === "corrupt" ? ui_strings_default.navigation.storageCorrupt : this.#searchState.failure ? ui_strings_default.navigation.storageFailed : this.#navigationMessage;
      notice.hidden = !notice.textContent;
    }
    this.#updateRetryAction();
    if (this.#pendingRetry && !this.#view)
      this.#renderPreparationFailure();
    this.#actionVisibility();
  }
  #setNavigationMessage(message) {
    const display = this.#commandHome.defaultView || this.#display;
    display.clearTimeout(this.#navigationNoticeTimer);
    this.#navigationNoticeTimer = 0;
    this.#navigationMessage = message;
    if (message) {
      this.#navigationNoticeTimer = display.setTimeout(() => {
        this.#navigationNoticeTimer = 0;
        this.#navigationMessage = "";
        this.#updateNavigationActions();
        if (this.#popupKind && this.#popupKind !== "search")
          this.#renderPopup();
      }, 3000);
    }
    this.#updateNavigationActions();
  }
  #bindHistoryArrow(button, direction, signal) {
    button.setAttribute("aria-description", ui_strings_default.navigation.historyHold);
    button.dataset.tooltip = navigationTooltip(direction === -1 ? ui_strings_default.navigation.back : ui_strings_default.navigation.forward, direction === -1 ? "Z" : "X", ui_strings_default.navigation.historyHold);
    this.#bindHoldButton(button, () => {
      this.#historyStep(direction);
    }, () => this.showHistory(), signal);
  }
  #bindHoldButton(button, short, held, signal) {
    const display = this.#display;
    let timer = 0;
    let pointer = -1;
    let startX = 0;
    let startY = 0;
    let armed = false;
    let suppressClick = false;
    const cancel = () => {
      display.clearTimeout(timer);
      timer = 0;
      pointer = -1;
      armed = false;
      button.removeAttribute("data-hold-ready");
    };
    this.ownerDocument.addEventListener("pointerdown", () => {
      if (pointer < 0)
        suppressClick = false;
    }, { signal, capture: true });
    button.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0 || button.disabled)
        return;
      cancel();
      suppressClick = false;
      pointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      timer = display.setTimeout(() => {
        timer = 0;
        if (this.#moving || !this.#events || pointer !== event.pointerId || !button.isConnected)
          return;
        armed = true;
        button.setAttribute("data-hold-ready", "");
      }, this.#holdDuration);
    }, { signal });
    this.ownerDocument.addEventListener("pointerup", (event) => {
      if (event.pointerId !== pointer)
        return;
      const ready = armed && !this.#moving && Boolean(this.#events);
      cancel();
      if (ready) {
        suppressClick = true;
        held();
      }
    }, { signal, capture: true });
    this.ownerDocument.addEventListener("pointermove", (event) => {
      if (event.pointerId === pointer && Math.hypot(event.clientX - startX, event.clientY - startY) > 8) {
        suppressClick = true;
        cancel();
      }
    }, { signal, passive: true });
    this.ownerDocument.addEventListener("pointercancel", (event) => {
      if (event.pointerId === pointer) {
        suppressClick = true;
        cancel();
      }
    }, { signal, capture: true });
    button.addEventListener("pointerleave", () => {
      if (pointer >= 0) {
        suppressClick = true;
        cancel();
      }
    }, { signal });
    this.ownerDocument.addEventListener("click", (event) => {
      if (!suppressClick || event.detail <= 0)
        return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, { signal, capture: true });
    button.addEventListener("click", () => {
      if (!this.#moving && this.#events)
        short();
    }, { signal });
    this.ownerDocument.addEventListener("scroll", () => {
      if (pointer >= 0)
        cancel();
    }, { signal, capture: true, passive: true });
    display.addEventListener("blur", cancel, { signal });
    signal.addEventListener("abort", cancel, { once: true });
  }
  #navigationKey(event) {
    if (this.#moving || event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey)
      return;
    if (this.#popupKind && event.key === "Escape") {
      event.preventDefault();
      this.#closePopup();
      return;
    }
    if (this.#searchOpen && event.key === "Escape") {
      event.preventDefault();
      this.#closeSearch();
      return;
    }
    const path = event.composedPath();
    for (let focused = event.view?.document.activeElement || null;focused; focused = focused.shadowRoot?.activeElement || null)
      path.push(focused);
    if (path.some((node) => isHTMLElement(node) && (node.matches("input,textarea,select") || node.isContentEditable))) {
      return;
    }
    if ((this.#popupKind || this.#searchOpen) && isCommandKey(event, "KeyQ")) {
      event.preventDefault();
      if (this.#popupKind)
        this.#closePopup();
      else
        this.#closeSearch();
      return;
    }
    let run = null;
    if (!event.shiftKey) {
      if (event.code === "KeyZ") {
        run = () => {
          this.backward();
        };
      }
      if (event.code === "KeyX") {
        run = () => {
          this.forward();
        };
      }
      if (event.code === "KeyR") {
        run = () => {
          this.refreshCurrent();
        };
      }
      if (event.code === "KeyV")
        run = () => this.toggleCurrentViewMode();
      if (event.code === "KeyU") {
        run = () => {
          this.#settings.cycleLinkMode();
          this.refreshLinkMode();
        };
      }
      if (event.code === "KeyH")
        run = () => this.showHistory();
      if (event.code === "KeyB")
        run = () => this.showBookmarks();
      if (event.code === "KeyF")
        run = () => this.showFind();
    }
    if (event.code === "Comma" || event.code === "Period") {
      run = () => {
        const entry = this.#journal.adjacentBookmark(event.code === "Comma" ? -1 : 1);
        if (entry)
          this.#openBookmark(entry);
      };
    }
    if (event.code === "KeyL") {
      run = event.shiftKey ? () => {
        const target = this.#settings.footerTarget();
        if (target) {
          this.#cancelBookmarkDrag();
          this.#journal.removeBookmark(target);
          this.#refreshBookmarkHighlight(target);
        }
        this.#renderPopup();
        this.#refreshSourceBookmarks();
      } : () => {
        const entry = this.#journal.lastBookmark();
        if (entry)
          this.#openBookmark(entry);
      };
    }
    if (run) {
      event.preventDefault();
      this.#cancelPiPHold();
      run();
    }
  }
  beginPiPHold(readyTarget) {
    const view = this.#view;
    if (!view || !this.#current(view) || !this.#pip?.supported || this.#pipHold)
      return;
    const hold = { view, display: this.#display, timer: 0, armed: false, target: readyTarget || this.#elements.dialog };
    hold.timer = hold.display.setTimeout(() => {
      if (this.#pipHold !== hold)
        return;
      if (!this.#current(hold.view))
        return;
      hold.armed = true;
      hold.target.setAttribute("data-hold-ready", "");
    }, this.#holdDuration);
    this.#pipHold = hold;
  }
  finishPiPHold() {
    const hold = this.#pipHold;
    const ready = Boolean(hold?.armed && this.#current(hold.view) && this.#pip?.supported && !this.#pip.pending);
    this.#cancelPiPHold();
    if (ready)
      this.#pip?.open("docs");
    return ready;
  }
  cancelPiPHold() {
    this.#cancelPiPHold();
  }
  #cancelPiPHold() {
    if (this.#pipHold)
      this.#pipHold.display.clearTimeout(this.#pipHold.timer);
    this.#pipHold?.target.removeAttribute("data-hold-ready");
    this.#pipHold = null;
    this.#shortSourceE = null;
  }
  #informationKey(event) {
    if (this.#moving)
      return;
    if (!this.#view && this.#pendingRetry && event.composedPath().includes(this.#elements.dialog) && isCommandKey(event, "KeyE")) {
      if (this.#retry())
        event.preventDefault();
      return;
    }
    const sourceView = this.#view?.request.kind === "source-file" && event.composedPath().includes(this.#elements.dialog) ? this.#view : null;
    if (sourceView && isCommandKey(event, "KeyD")) {
      event.preventDefault();
      this.#cancelPiPHold();
      this.#selectSourceTab(sourceView, "documentation", true);
      return;
    }
    if (this.#view && event.composedPath().includes(this.#elements.dialog) && isCommandKey(event, "KeyE")) {
      event.preventDefault();
      this.#shortSourceE = sourceView;
      this.beginPiPHold(isHTMLElement(event.target) ? event.target : this.#elements.dialog);
      return;
    }
    if (event.code !== "KeyE" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing)
      this.#cancelPiPHold();
    if (isCommandKey(event, "KeyR") && this.#retry())
      event.preventDefault();
  }
  #informationKeyUp(event) {
    if (event.code !== "KeyE")
      return;
    const short = this.#shortSourceE;
    if (this.finishPiPHold()) {
      event.preventDefault();
      return;
    }
    this.#cancelPiPHold();
    if (short && this.#current(short) && isCommandKey(event, "KeyE")) {
      event.preventDefault();
      this.#selectSourceTab(short, "source", true);
    }
  }
  #collapseInformation() {
    const view = this.#view;
    if (!view) {
      if (this.#dom?.dialog.open)
        this.close();
      return;
    }
    this.#cancelPiPHold();
    if (!this.#settings.standalone) {
      this.close();
      return;
    }
    const controller = this.#pip;
    if (controller?.mode !== "docs")
      return;
    controller.open("main").then((opened) => {
      if (opened && controller.mode === "main" && this.#current(view))
        this.close();
    });
  }
  setPictureInPicture(controller) {
    this.#pip = controller;
  }
  prepareMove(placement) {
    this.#releaseSearchProjection();
    this.#motion?.finishAll();
    this.#captureReading();
    this.#cancelNavigation();
    const source = this.#settings;
    const { dialog, body, document: content } = this.#elements;
    const showing = dialog.open && !this.#catalogueParked;
    const active = deepFocus(this.ownerDocument);
    const focused = active && this.contains(active) ? active : null;
    const popupPlacement = this.#capturePopupPlacement();
    const footerView = this.#matchingFooterView();
    const scroll = { top: body.scrollTop, left: body.scrollLeft };
    const tables = prepareDocumentContent(content);
    const restoreDisplay = (perform = (operation) => operation()) => {
      const restoring = this.#resumingDisplay;
      const suspended = this.#recordingSuspended;
      this.#resumingDisplay = true;
      this.#recordingSuspended = true;
      try {
        perform(() => this.#restoreSourceStyle());
        perform(() => this.#sourceRequest?.resumeHighlight(this.#display));
        perform(() => this.#refreshSourceBookmarks());
        perform(() => this.#searchPainter?.rebind());
        perform(() => {
          if (this.#view?.request.kind === "source-file" && this.#view.sourceMode === "source" && !this.#sourceRequest?.ready && !this.#sourceRequest?.failed)
            this.#showSource(this.#view);
        });
        perform(() => {
          if (this.#view?.pendingDocumentRender)
            this.#finishDocumentLoad(this.#view);
        });
        perform(() => this.#reindexSearch());
        perform(() => {
          if (footerView && this.#displayCurrent(footerView))
            this.#announceShown(footerView);
        });
        perform(() => {
          if (this.#popupKind && this.#popupKind !== "organizationRoot")
            this.#renderPopup();
        });
        perform(() => this.#placePopup(popupPlacement));
        perform(() => this.#notifyVisibility());
      } finally {
        this.#recordingSuspended = suspended;
        this.#resumingDisplay = restoring;
      }
    };
    const resume = () => {
      this.#connect();
      if (dialog.open)
        dialog.close();
      if (showing)
        this.#place(false, popupPlacement);
      else {
        this.#settings.footerHome.append(this.#settings.footer);
        this.#placePopup(popupPlacement);
      }
      tables.resume();
      body.scrollTop = scroll.top;
      body.scrollLeft = scroll.left;
      if (!popupPlacement && focused?.isConnected && focused.ownerDocument === this.ownerDocument && !focused.closest("[hidden]")) {
        focused.focus({ preventScroll: true });
      } else if (!popupPlacement && this.#view && this.#settings.standalone)
        body.focus({ preventScroll: true });
      body.scrollTop = scroll.top;
      body.scrollLeft = scroll.left;
      restoreDisplay();
    };
    const rollback = () => {
      const failures = [];
      const attempt = (operation) => {
        try {
          operation();
        } catch (error) {
          failures.push(error);
        }
      };
      try {
        attempt(() => this.#stopBindings());
        this.#options = source.workspace.ownerDocument === this.ownerDocument ? source : this.#homeOptions;
        attempt(() => this.#connect());
        attempt(() => {
          if (dialog.open)
            dialog.close();
          if (showing)
            this.#place(false, popupPlacement);
          else {
            this.#settings.footerHome.append(this.#settings.footer);
            this.#placePopup(popupPlacement);
          }
        });
        attempt(() => tables.rollback());
        body.scrollTop = scroll.top;
        body.scrollLeft = scroll.left;
        if (!popupPlacement && focused?.isConnected && focused.ownerDocument === this.ownerDocument) {
          focused.focus({ preventScroll: true });
        }
        restoreDisplay(attempt);
      } finally {
        this.#moving = false;
      }
      if (failures.length)
        throw new AggregateError(failures, "Could not restore information bindings");
    };
    this.#moving = true;
    try {
      this.#stopBindings();
      this.#options = { ...source, ...placement };
    } catch (error) {
      try {
        rollback();
      } catch (failure) {
        throw new AggregateError([error, failure], "Information preparation failed");
      }
      throw error;
    }
    return {
      resume,
      rollback,
      commit: () => {
        tables.commit();
        this.#moving = false;
      }
    };
  }
  connectedCallback() {
    if (!this.#moving)
      this.#connect();
  }
  disconnectedCallback() {
    if (!this.#moving)
      this.#disconnect();
  }
  #initialize() {
    if (this.#dom)
      return true;
    const nodes = readPanelDOM(this);
    if (!nodes)
      return false;
    this.#dom = nodes;
    this.#navigationActions = readNavigationActions(this);
    this.#popup = this.querySelector("#navigation-popup");
    this.#popupContent = this.querySelector("#navigation-content");
    const searchBar = this.querySelector("#docs-search-bar");
    this.#searchBar = isHTMLElement(searchBar) ? searchBar : this.ownerDocument.createElement("section");
    this.#searchBar.id = "docs-search-bar";
    this.#searchBar.hidden = true;
    this.#searchBar.setAttribute("aria-label", ui_strings_default.navigation.searchInMaterial);
    if (!this.#searchBar.parentElement)
      nodes.body.before(this.#searchBar);
    this.#panelWidth = new PanelWidth(nodes.dialog, nodes.resize, width_default, (percent) => formatText(width_default.ariaWidth, { percent }));
    this.#sourceRequest = new SourceRequest(nodes.sourceHost);
    nodes.sourceRetry.setAttribute("aria-label", ui_strings_default.sourceViewer.retry);
    nodes.sourceRetry.setAttribute("data-tooltip", ui_strings_default.sourceViewer.retry);
    nodes.sourceRetry.title = ui_strings_default.sourceViewer.retry;
    const retryLabel = nodes.sourceRetry.querySelector(".source-retry-label");
    if (retryLabel)
      retryLabel.textContent = ui_strings_default.sourceViewer.retry;
    labelSourceTabs(nodes.sourceTabs, [ui_strings_default.sourceViewer.documentation, ui_strings_default.sourceViewer.sourceCode]);
    renderControlIcons(this);
    return true;
  }
  #current(view) {
    return Boolean(this.#events && !this.#moving && this.isConnected && this.#view === view && this.#dom?.dialog.open);
  }
  #displayCurrent(view) {
    return this.#current(view) || Boolean(this.#resumingDisplay && this.#events && this.isConnected && this.#view === view && this.#dom?.dialog.open);
  }
  get #elements() {
    if (!this.#dom)
      throw new Error("Document panel markup is not ready");
    return this.#dom;
  }
  get #settings() {
    if (!this.#options)
      throw new Error("Document panel is not configured");
    return this.#options;
  }
  get #smallScreen() {
    return this.#mobile?.matches ?? false;
  }
  get #display() {
    return this.#boundView || displayWindow(this);
  }
  get #sourceHighlightDuration() {
    return this.#settings.getSourceHighlightDuration ? this.#settings.getSourceHighlightDuration() : 3000;
  }
  #offset() {
    return "translateX(12px)";
  }
  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }
  #showState(template, privateView = false) {
    this.#releaseSearchProjection();
    showPanelState(this.#elements, template, { centered: privateView, host: this });
    this.#reindexSearch();
    if (this.#popupKind === "search")
      this.#renderPopup();
  }
  #hxdoc(node, heading = false, symbolPath = "") {
    const view = this.#view;
    const file = view?.request.kind === "source-file" ? view.request : null;
    const base = view?.target;
    const path = node.type === "file" ? node.path : symbolPath;
    const nextSymbol = node.type === "symbol" ? path || (file?.target.kind === "declaration" ? file.target.symbolPath : base?.kind === "declaration" ? base.symbolPath : "") : "";
    const target = file && node.type === "symbol" && node.line && base && base.kind !== "repository" ? {
      kind: "declaration",
      origin: base.origin,
      ref: file.readySource?.ref || base.ref,
      path: file.source.path,
      symbolPath: nextSymbol,
      symbolKind: node.kind || "symbol",
      line: node.line
    } : null;
    return outlineDocument({
      heading: heading ? {
        name: node.name,
        label: node.kind ? `${node.kind} ${node.name}` : undefined,
        icon: nodeIcon(node, this.#icons),
        ...target ? {
          href: this.#settings.linkHref(target),
          target: JSON.stringify(target),
          onOpen: (event) => this.#openDeclaration(target, event)
        } : {}
      } : undefined,
      text: typeof node.doc === "string" ? node.doc : "",
      children: node.children.map((child) => this.#hxdoc(child, true, node.type === "file" ? `${node.path}#${child.name}` : nextSymbol ? `${nextSymbol}.${child.name}` : child.name))
    });
  }
  #leaveSource() {
    this.#cancelBookmarkDrag(false);
    this.#bookmarkDragStop?.();
    this.#bookmarkDragStop = null;
    this.#releaseSearchProjection();
    this.#sourceRequest?.clear();
    if (!this.#dom)
      return;
    this.#elements.body.removeAttribute("aria-busy");
    this.#elements.sourceRetry.hidden = true;
    this.#actionVisibility();
  }
  #restoreSourceStyle() {
    const view = this.#view;
    const request = this.#sourceRequest;
    if (!request || view?.request.kind !== "source-file" || view.sourceMode !== "source" || !request.ready)
      return;
    request.restoreStyle(this.ownerDocument);
  }
  #sourceTab(view, mode) {
    const { body, toolbar, tabs, sourceTabs } = this.#elements;
    toolbar.hidden = false;
    tabs.hidden = true;
    sourceTabs.hidden = false;
    view.sourceMode = mode;
    selectSourceTab(sourceTabs, body, mode);
    this.#elements.mode.hidden = false;
    this.#showSourcePin();
    this.#actionVisibility();
  }
  #showSourceDocumentation(view) {
    if (view.request.kind !== "source-file")
      return;
    const wasSource = view.sourceMode === "source";
    this.#leaveSource();
    this.#sourceTab(view, "documentation");
    const docs = this.#hxdoc(view.request.node);
    this.#showState(view.request.node.type === "symbol" ? compactDocument(docs) : docs);
    this.#elements.body.scrollTop = 0;
    if (wasSource)
      this.#emit("view-open", { token: view.request.token, target: view.target });
    this.#recordShown(view);
  }
  #showSource(view) {
    if (view.request.kind !== "source-file" || !this.#displayCurrent(view) || !this.#sourceRequest)
      return;
    this.#releaseSearchProjection();
    this.#sourceTab(view, "source");
    const { body, state, sourceHost, sourceRetry, document: content } = this.#elements;
    disposeDocumentContent(content);
    content.hidden = true;
    content.replaceChildren();
    state.hidden = true;
    sourceHost.hidden = false;
    sourceRetry.hidden = true;
    this.#actionVisibility();
    body.classList.remove("is-private");
    body.setAttribute("aria-busy", "true");
    const sourceRequest = this.#sourceRequest;
    const readySource = view.request.readySource;
    const { revision, promise } = sourceRequest.start(readySource ? () => Promise.resolve(readySource) : view.request.load, view.request.source.library, view.request.version, this.#commandHome);
    if (this.#popupKind === "search")
      this.#renderPopup();
    promise.then((result) => {
      if (!this.#current(view) || view.sourceMode !== "source" || !sourceRequest.current(revision))
        return;
      body.removeAttribute("aria-busy");
      sourceRetry.hidden = !sourceRequest.failed;
      this.#actionVisibility();
      if (!result || view.request.kind !== "source-file") {
        view.pendingViewVisit = false;
        return;
      }
      view.request.readySource = result;
      body.scrollTop = 0;
      if (view.request.line !== null)
        this.#scrollSourceLine(view.request.line);
      if (view.target.kind === "source" || view.target.kind === "declaration") {
        view.target = { ...view.target, ref: result.ref };
      }
      this.#announceShown(view);
      this.#restoreReading(view);
      this.#refreshSourceBookmarks();
      this.#bindBookmarkDrag();
      this.#recordShown(view);
      this.#recordViewTransition(view);
      this.#reindexSearch();
      if (this.#popupKind === "search")
        this.#renderPopup();
    });
  }
  #scrollSourceLine(line, preview = false) {
    this.#sourceRequest?.scrollLine(this.#elements.body, line, this.#display, this.#sourceHighlightDuration, preview);
    this.#labelSourceLine(line);
  }
  #labelSourceLine(line) {
    const gutter = this.#elements.sourceHost.querySelector("[data-source-gutter]");
    if (isHTMLElement(gutter)) {
      const selected = Number(gutter.dataset.selectedLine) || line;
      gutter.setAttribute("aria-label", formatText(ui_strings_default.navigation.sourceLine, { line: selected }));
      const view = this.#view;
      const bookmarked = view?.request.kind === "source-file" && view.target.kind !== "repository" && this.#journal.bookmarkFor({
        kind: "source",
        origin: view.target.origin,
        ref: view.request.readySource?.ref || view.target.ref,
        path: view.request.source.path,
        line: selected
      });
      gutter.setAttribute("aria-pressed", String(Boolean(bookmarked)));
    }
  }
  #openDeclaration(target, event) {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (this.#settings.getLinkMode() !== "internal")
      return;
    event.preventDefault();
    const view = this.#view;
    if (view?.request.kind === "source-file" && this.#current(view) && targetKey(view.target) === targetKey(target)) {
      this.#selectSourceTab(view, "source");
      if ((target.kind === "source" || target.kind === "declaration") && target.line !== null && this.#sourceRequest?.ready) {
        this.#scrollSourceLine(target.line);
      }
    } else
      this.navigate(target, { initialMode: "source" });
  }
  #headingTarget(view) {
    const request = view.request;
    return request.kind === "source-file" && request.target.kind === "declaration" ? { ...request.target, ref: request.readySource?.ref || request.target.ref } : null;
  }
  #declarationAt(request, line) {
    const target = this.#view?.target || request.target;
    if (target.kind === "repository")
      return null;
    const visit = (node, symbolPath) => {
      if (node.type === "symbol" && node.line === line) {
        return {
          kind: "declaration",
          origin: target.origin,
          ref: request.readySource?.ref || target.ref,
          path: request.source.path,
          symbolPath,
          symbolKind: node.kind || "symbol",
          line
        };
      }
      for (const child of node.children) {
        const childPath = node.type === "file" ? `${node.path}#${child.name}` : symbolPath ? `${symbolPath}.${child.name}` : child.name;
        const found = visit(child, childPath);
        if (found)
          return found;
      }
      return null;
    };
    return visit(request.node, request.target.kind === "declaration" ? request.target.symbolPath : "");
  }
  #sourceLineData(view, line) {
    if (view.request.kind !== "source-file" || view.sourceMode !== "source" || !this.#current(view) || !this.#sourceRequest?.ready || view.target.kind === "repository" || !Number.isSafeInteger(line) || line < 1 || line > this.#sourceRequest.lineCount)
      return null;
    const request = view.request;
    const declaration = this.#declarationAt(request, line);
    const target = declaration || {
      kind: "source",
      origin: view.target.origin,
      ref: request.readySource?.ref || view.target.ref,
      path: request.source.path,
      line
    };
    const title = declaration ? {
      type: "symbol",
      name: declaration.symbolPath.split(/[.#]/).at(-1) || request.title.name,
      kind: declaration.symbolKind
    } : {
      type: "file",
      name: `${request.source.path.split("/").at(-1) || request.title.name}:${line}`
    };
    return { ...this.#entryData(view), target, title };
  }
  #selectSourcePosition(view, data, line) {
    if (view.request.kind !== "source-file")
      return;
    this.#captureReading();
    view.target = data.target;
    view.request.line = line;
    this.#scrollSourceLine(line);
    this.#announceShown(view);
    view.historyId = this.#journal.accept(this.#entryData(view), "push")?.id || null;
    this.#updateNavigationActions();
  }
  #bookmarkSourceLine(line) {
    const view = this.#view;
    const data = view && this.#sourceLineData(view, line);
    if (!view || !data)
      return;
    this.#cancelNavigation();
    this.#selectSourcePosition(view, data, line);
    this.#journal.addBookmark({ ...data, reading: this.#entryData(view).reading });
    this.#refreshSourceBookmarks();
    this.#setNavigationMessage(ui_strings_default.navigation.bookmarkAdded);
    this.#updateNavigationActions();
  }
  #startBookmarkDrag(line) {
    const view = this.#view;
    const data = view && this.#sourceLineData(view, line);
    const entry = data && this.#journal.bookmarkFor(data.target);
    if (!view || !entry || this.#bookmarkDrag)
      return false;
    const gutter = this.#elements.sourceHost.querySelector("[data-source-gutter]");
    this.#bookmarkDrag = {
      view,
      id: entry.id,
      originalLine: line,
      selectedLine: Number(gutter?.getAttribute("data-selected-line")) || line,
      line,
      pointerLine: line,
      direction: 1,
      remove: false
    };
    return true;
  }
  #moveBookmarkDrag(clientX, clientY) {
    const drag = this.#bookmarkDrag;
    const gutter = this.#elements.sourceHost.querySelector("[data-source-gutter]");
    if (!drag || !this.#current(drag.view) || !isHTMLElement(gutter) || !this.#sourceRequest?.ready)
      return;
    const bounds = gutter.getBoundingClientRect();
    drag.remove = clientX < bounds.left || clientX > bounds.right;
    const marker = this.#elements.sourceHost.querySelector(`[data-bookmark-line="${drag.originalLine}"]`);
    marker?.toggleAttribute("data-bookmark-removing", drag.remove);
    if (drag.remove) {
      this.#scrollSourceLine(drag.line, true);
      return;
    }
    const height = parseFloat(this.#display.getComputedStyle(gutter).lineHeight);
    if (!Number.isFinite(height) || height <= 0)
      return;
    const desired = Math.max(1, Math.min(this.#sourceRequest.lineCount, Math.floor((clientY - bounds.top) / height) + 1));
    if (desired !== drag.pointerLine)
      drag.direction = desired > drag.pointerLine ? 1 : -1;
    drag.pointerLine = desired;
    for (let line = desired;line >= 1 && line <= this.#sourceRequest.lineCount; line += drag.direction) {
      const data = this.#sourceLineData(drag.view, line);
      const occupied = data && this.#journal.bookmarkFor(data.target);
      if (!data || occupied && occupied.id !== drag.id)
        continue;
      drag.line = line;
      if (isHTMLElement(marker))
        marker.style.setProperty("--bookmark-line", String(line - 1));
      this.#scrollSourceLine(line, true);
      return;
    }
    this.#scrollSourceLine(drag.line, true);
  }
  #finishBookmarkDrag() {
    const drag = this.#bookmarkDrag;
    this.#bookmarkDrag = null;
    if (!drag || !this.#current(drag.view))
      return;
    if (drag.remove) {
      this.#journal.remove("bookmarks", drag.id);
      this.#sourceRequest?.refreshHighlight(this.#sourceHighlightDuration, this.#display);
    } else {
      const data = this.#sourceLineData(drag.view, drag.line);
      if (data && this.#journal.moveBookmark(drag.id, data))
        this.#selectSourcePosition(drag.view, data, drag.line);
      else
        this.#scrollSourceLine(drag.selectedLine);
    }
    this.#refreshSourceBookmarks();
    if (this.#popupKind === "bookmarks")
      this.#renderPopup();
  }
  #cancelBookmarkDrag(reset = true) {
    const drag = this.#bookmarkDrag;
    this.#bookmarkDrag = null;
    if (drag && this.#view === drag.view) {
      if (reset && this.#current(drag.view))
        this.#scrollSourceLine(drag.selectedLine);
      else {
        this.#sourceRequest?.cancelPreview(displayWindow(this.#elements.sourceHost), false);
        this.#labelSourceLine(drag.selectedLine);
      }
      this.#refreshSourceBookmarks();
    }
  }
  #bindBookmarkDrag() {
    if (this.#bookmarkDragStop || !this.#events || !this.#sourceRequest?.ready)
      return;
    this.#bookmarkDragStop = bindSourceBookmarkDrag(this.#elements.sourceHost, {
      start: (line) => this.#startBookmarkDrag(line),
      move: (x, y) => this.#moveBookmarkDrag(x, y),
      finish: () => this.#finishBookmarkDrag(),
      cancel: () => this.#cancelBookmarkDrag()
    }, this.#events.signal);
  }
  #gutterKey(event) {
    const gutter = this.#elements.sourceHost.querySelector("[data-source-gutter]");
    if (event.target !== gutter || !isHTMLElement(gutter) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing || !this.#sourceRequest?.ready)
      return;
    const count = this.#sourceRequest.lineCount;
    const current = Number(gutter.dataset.selectedLine) || 1;
    const line = event.key === "ArrowUp" ? Math.max(1, current - 1) : event.key === "ArrowDown" ? Math.min(count, current + 1) : event.key === "Home" ? 1 : event.key === "End" ? count : null;
    if (line !== null) {
      event.preventDefault();
      this.#scrollSourceLine(line);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.#bookmarkSourceLine(current);
    }
  }
  #refreshSourceBookmarks() {
    const view = this.#view;
    if (!view || view.request.kind !== "source-file" || view.sourceMode !== "source" || !this.#sourceRequest?.ready || view.target.kind === "repository")
      return;
    const current = view.target;
    const path = view.request.source.path;
    const lines = [];
    for (const entry of this.#journal.bookmarks) {
      const target = entry.target;
      if ((target.kind === "source" || target.kind === "declaration") && target.line !== null && target.origin.url.toLowerCase() === current.origin.url.toLowerCase() && target.ref === current.ref && target.path === path) {
        lines.push(target.line);
      }
    }
    this.#sourceRequest.showBookmarks(lines, controlIcon("bookmark-added"), this.#display, (line) => formatText(ui_strings_default.navigation.sourceLine, { line }));
    this.#labelSourceLine(1);
  }
  #refreshBookmarkHighlight(target) {
    const view = this.#view;
    if (!view || view.request.kind !== "source-file" || view.sourceMode !== "source" || !this.#current(view) || targetKey(target) !== targetKey(view.target) || this.#bookmarkDrag)
      return;
    this.#sourceRequest?.refreshHighlight(this.#sourceHighlightDuration, this.#display);
  }
  async#load(view) {
    if (view.request.kind !== "documents")
      return;
    const load = view.request.load;
    const revision = view.loadRevision || 0;
    const controller = new AbortController;
    this.#documentLoad = controller;
    try {
      const result = await Promise.resolve().then(() => load(controller.signal));
      if (controller.signal.aborted || this.#view !== view || revision !== (view.loadRevision || 0))
        return;
      view.result = result;
      view.pendingDocumentRender = true;
      this.#finishDocumentLoad(view);
    } catch {
      if (controller.signal.aborted || this.#view !== view || revision !== (view.loadRevision || 0))
        return;
      view.failed = true;
      view.pendingDocumentRender = true;
      this.#finishDocumentLoad(view);
    } finally {
      if (this.#documentLoad === controller)
        this.#documentLoad = null;
    }
  }
  #finishDocumentLoad(view) {
    if (view.request.kind !== "documents" || !view.pendingDocumentRender || !this.#displayCurrent(view))
      return;
    view.pendingDocumentRender = false;
    this.#elements.body.removeAttribute("aria-busy");
    if (view.result)
      this.#renderTabs(view, view.restoreReading?.type || view.type);
    else {
      this.#showState(documentFailure({
        label: labels.loadingFailed,
        message: labels.repositoryFailed,
        icon: controlIcon("error"),
        retry: {
          label: labels.retryLoading,
          hint: labels.retryLoadingHint,
          text: labels.retry,
          icon: controlIcon("reset"),
          run: () => {
            this.#retry();
          }
        }
      }), true);
    }
  }
  #retry() {
    if (this.#moving || !this.#events)
      return false;
    const retry = this.#pendingRetry;
    if (retry) {
      if (retry.visit === "restore" && (!retry.recordId || !this.#journal.historyEntry(retry.recordId))) {
        this.#clearPreparationRetry();
        return false;
      }
      if (this.#navigationRequest)
        return true;
      this.navigate(retry.target, {
        visit: retry.visit,
        refresh: retry.refresh,
        recordId: retry.recordId,
        initialMode: retry.initialMode,
        defaultBranch: retry.defaultBranch,
        applySourcePin: retry.applySourcePin
      });
      return true;
    }
    const view = this.#view;
    if (view?.request.kind === "source-file" && view.sourceMode === "source" && this.#sourceRequest?.failed && this.#current(view)) {
      this.#showSource(view);
      return true;
    }
    if (!view?.failed || !this.#current(view))
      return false;
    this.#documentLoad?.abort();
    view.failed = false;
    view.loadRevision = (view.loadRevision || 0) + 1;
    this.#showLoading(view);
    this.#load(view);
    return true;
  }
  #clearPreparationRetry() {
    if (!this.#pendingRetry)
      return;
    this.#pendingRetry = null;
    if (!this.#view && this.#dom) {
      render9(nothing11, this.#elements.state);
      render9(nothing11, this.#elements.title);
      this.#elements.version.hidden = true;
    }
    this.#updateNavigationActions();
  }
  #preparationRetryLabel(retry) {
    const target = retry.target;
    const path = target.kind === "repository" ? target.origin.id : `${target.origin.id}/${target.path}`;
    const position = target.kind === "source" && target.line !== null || target.kind === "declaration" ? `#L${target.line}` : target.kind === "document" && target.anchor ? `#${target.anchor}` : "";
    return `${labels.retry}: ${path}${position}`;
  }
  #showPreparationFailure() {
    const retry = this.#pendingRetry;
    if (!retry || this.#view)
      return;
    this.#catalogueParked = false;
    const { title, version, toolbar, tabs, sourceTabs, mode, body, dialog } = this.#elements;
    this.#motion?.finishAll();
    this.#closing = null;
    this.#leaveSource();
    const heading = targetTitle(retry.target, { type: "repository", name: retry.target.origin.id });
    const icon = nodeIcon(heading, { repositories: true, directories: true, files: true, symbols: true });
    icon?.removeAttribute("data-icon-group");
    showDocumentHeading(title, version, {
      name: heading.name,
      label: `${heading.kind || heading.type} ${heading.name}`,
      icon,
      versionText: ""
    });
    toolbar.hidden = sourceTabs.hidden = mode.hidden = true;
    render9(nothing11, tabs);
    body.removeAttribute("role");
    body.removeAttribute("aria-labelledby");
    body.removeAttribute("aria-busy");
    this.#renderPreparationFailure();
    const entering = !dialog.open;
    this.#place();
    if (entering) {
      this.#motion?.play(dialog, [
        { opacity: 0, transform: this.#offset() },
        { opacity: 1, transform: "translate(0)" }
      ]);
    }
  }
  #renderPreparationFailure() {
    const retry = this.#pendingRetry;
    if (!retry || this.#view)
      return;
    const label = this.#preparationRetryLabel(retry);
    showPanelState(this.#elements, documentFailure({
      label: this.#navigationMessage ? labels.loadingFailed : label,
      message: this.#navigationMessage,
      icon: this.#navigationMessage ? controlIcon("error") : undefined,
      retry: {
        label,
        hint: navigationTooltip(label, "R"),
        text: labels.retry,
        disabled: Boolean(this.#navigationRequest) || retry.visit === "restore" && (!retry.recordId || !this.#journal.historyEntry(retry.recordId)),
        icon: controlIcon("reset"),
        run: () => {
          this.#retry();
        }
      }
    }), { centered: true, host: this });
    if (this.#navigationRequest)
      this.#elements.body.setAttribute("aria-busy", "true");
    else
      this.#elements.body.removeAttribute("aria-busy");
  }
  #updateRetryAction() {
    if (!this.#dom)
      return;
    const button = this.#elements.sourceRetry;
    const retry = this.#pendingRetry;
    const rawFailed = this.#view?.request.kind === "source-file" && this.#view.sourceMode === "source" && Boolean(this.#sourceRequest?.failed);
    const label = retry ? this.#preparationRetryLabel(retry) : ui_strings_default.sourceViewer.retry;
    button.hidden = !(retry && this.#view) && !rawFailed;
    button.disabled = Boolean(this.#navigationRequest) || Boolean(retry?.visit === "restore" && (!retry.recordId || !this.#journal.historyEntry(retry.recordId)));
    button.setAttribute("aria-label", label);
    button.dataset.tooltip = retry ? navigationTooltip(label, "R") : ui_strings_default.sourceViewer.retry;
    button.title = label;
    const text = button.querySelector(".source-retry-label");
    if (text)
      text.textContent = label;
  }
  #showLoading(view) {
    if (view.request.kind !== "documents")
      return;
    const github = view.request.loadingSource === "github";
    this.#showState(documentLoading({
      label: labels.loadingInformation,
      message: github ? labels.loadingGithub : labels.loadingDocuments,
      icon: github ? undefined : controlIcon("document"),
      images: github ? {
        light: "vendor/brand-assets/GitHub_Invertocat_Black.svg",
        dark: "vendor/brand-assets/GitHub_Invertocat_White.svg"
      } : undefined
    }), true);
    this.#elements.body.setAttribute("aria-busy", "true");
  }
  #renderTabs(view, selected = null) {
    const { result, request } = view;
    if (!result || request.kind !== "documents")
      return;
    const types = (result.order || request.types).filter((type) => Object.hasOwn(result.documents, type));
    const labels = documentLabels(types, result);
    const { body, toolbar, tabs } = this.#elements;
    toolbar.hidden = types.length === 0;
    view.tabIds = new Map(types.map((type, index) => [type, `document-tab-${index}`]));
    renderDocumentTabs(tabs, types.map((type, index) => {
      const document2 = result.documents[type];
      const disabled = !Object.hasOwn(document2, "content");
      if (result.public && disabled)
        throw new Error("Public document content is missing");
      return {
        key: type,
        id: `document-tab-${index}`,
        label: labels[index],
        path: document2.path,
        disabled,
        disabledLabel: disabled ? formatText(ui_strings_default.documents.notAllowed, { type }) : undefined
      };
    }), body.id);
    const first = firstDocument(result, request.types, selected);
    if (first)
      this.#selectDocument(view, first);
    else if (!result.public && (types.length || result.documentsDenied)) {
      this.#showPrivate(result.reason, result.retryAvailable);
    } else {
      const description = request.description?.trim();
      const empty = documentMessage(formatText(ui_strings_default.documents.noDocuments, { scope: request.scope }));
      this.#showState(description ? outlineDocument({ text: description, children: [empty] }) : empty);
    }
  }
  #showPrivate(reason = labels.privateData, retryAvailable = false) {
    const actions = [{
      label: labels.manageTokens,
      run: () => {
        this.dispatchEvent(new Event("tokens-request", { bubbles: true }));
      }
    }];
    if (retryAvailable) {
      actions.push({
        label: labels.retryAccess,
        run: (event) => {
          event.currentTarget.disabled = true;
          this.dispatchEvent(new CustomEvent("github-reconnect", {
            detail: { repository: this.#view?.request.repository },
            bubbles: true
          }));
        }
      });
    }
    this.#showState(documentAccess({ message: reason, actions }), true);
  }
  #selectDocument(view, type, visit = false) {
    if (visit && this.#moving)
      return;
    const tabId = view.tabIds.get(type);
    if (!this.#displayCurrent(view) || view.type === type || !tabId)
      return;
    if (visit)
      this.#cancelNavigation();
    const recordVisit = visit && view.type !== null;
    if (recordVisit)
      this.#closePopup(false);
    if (view.type !== null) {
      this.#cancelPiPHold();
      if (recordVisit)
        this.#captureReading();
    }
    view.type = type;
    const { tabs, body, mode } = this.#elements;
    selectDocumentTab(tabs, type);
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", tabId);
    mode.hidden = false;
    const suspended = this.#recordingSuspended;
    if (recordVisit)
      this.#recordingSuspended = true;
    try {
      this.#showDocument(view);
    } finally {
      this.#recordingSuspended = suspended;
    }
    if (recordVisit && !suspended) {
      view.historyId = this.#journal.accept(this.#entryData(view), "push")?.id || null;
      this.#updateNavigationActions();
    }
  }
  #showDocument(view) {
    if (!view.result || !view.type)
      return;
    const { body, state, document: content, mode } = this.#elements;
    const document2 = view.result.documents[view.type];
    const source = view.result.source;
    if (!source || typeof document2?.content !== "string")
      throw new Error("Document content or source is missing");
    view.target = documentTarget(view.target, document2, source.ref);
    this.#releaseSearchProjection();
    body.classList.remove("is-private");
    state.hidden = document2.content.length !== 0;
    showDocumentMessage(state, document2.content.length ? null : labels.empty);
    content.hidden = false;
    showDocumentMode(mode, {
      mode: view.mode,
      label: view.mode === "html" ? labels.showSource : labels.showHtml
    });
    body.scrollTop = 0;
    renderDocumentContent(content, { ...document2, content: document2.content }, this.#contentOptions(view));
    this.#announceShown(view);
    this.#restoreReading(view);
    this.#recordShown(view);
    this.#reindexSearch();
    if (this.#popupKind === "search")
      this.#renderPopup();
  }
  #contentOptions(view) {
    return {
      mode: view.mode,
      resolveHref: (value) => this.#settings.documentHref(value, view.target),
      internalLinks: this.#settings.getLinkMode() === "internal",
      anchor: view.target.kind === "document" ? view.target.anchor : null,
      onLink: (value, event) => this.#documentLink(view, value, event),
      imageLabel: ui_strings_default.renderer.image,
      htmlUnavailable: ui_strings_default.renderer.htmlUnavailable,
      columnLabel: (first, second) => formatText(ui_strings_default.tables.resizeColumns, { first, second })
    };
  }
  #documentLink(view, value, event) {
    if (!this.#current(view) || this.#settings.getLinkMode() !== "internal" || !this.#settings.shouldHandleLink(value, view.target))
      return false;
    if (value.startsWith("#") && view.request.kind === "documents" && view.type && view.result?.source) {
      let anchor = value.slice(1);
      try {
        anchor = decodeURIComponent(anchor);
      } catch {}
      this.#captureReading();
      if (scrollDocumentAnchor(this.#elements.document, anchor)) {
        event.preventDefault();
        const document2 = view.result.documents[view.type];
        view.target = {
          kind: "document",
          origin: view.target.origin,
          ref: view.result.source.ref,
          path: document2.path,
          format: document2.format,
          anchor
        };
        this.#emit("document-select", {
          token: view.request.token,
          context: view.context,
          source: view.result.source,
          document: { path: document2.path, url: githubHref(view.target) },
          target: view.target
        });
        view.historyId = this.#journal.accept(this.#entryData(view), "push")?.id || null;
        this.#updateNavigationActions();
        return true;
      }
    }
    event.preventDefault();
    this.#settings.followLink(value, view.target);
    return true;
  }
  refreshPlacement() {
    if (!this.#events || this.#moving || !this.#dom?.dialog.open)
      return;
    const modal = !this.#settings.standalone && this.#smallScreen;
    const parent = modal || this.#settings.standalone ? this.#elements.dialog : this.#settings.footerHome;
    if (modal !== this.#modal || this.#settings.footer.parentElement !== parent) {
      this.#motion?.finishAll();
      if (this.#elements.dialog.open)
        this.#place();
    }
  }
  #withFooterMove(operation, restoreFocus) {
    if (this.#settings.withFooterMove)
      this.#settings.withFooterMove(operation, { restoreFocus });
    else
      operation();
  }
  #place(restoreFocus = true, popupPlacement = this.#capturePopupPlacement()) {
    const { dialog, body } = this.#elements;
    const { footer, footerHome } = this.#settings;
    const focused = this.ownerDocument.activeElement;
    const modal = !this.#settings.standalone && this.#smallScreen;
    const parent = modal || this.#settings.standalone ? dialog : footerHome;
    const popup = this.#popupKind ? this.#popup : null;
    const footerView = this.#matchingFooterView();
    const place = () => {
      if (popup?.open && (!dialog.open || this.#modal !== modal))
        popup.close();
      if (dialog.open && this.#modal !== modal)
        dialog.close();
      this.#modal = modal;
      if (footer.parentElement !== parent)
        parent.append(footer);
      this.#panelWidth?.setEnabled(!modal && !this.#settings.standalone);
      if (!dialog.open)
        modal ? dialog.showModal() : dialog.show();
      if (!restoreFocus || popup)
        return;
      if (isHTMLElement(focused) && dialog.contains(focused) && focused.getClientRects().length) {
        focused.focus({ preventScroll: true });
      } else if (modal)
        body.focus({ preventScroll: true });
      else if (isHTMLElement(focused))
        focused.focus({ preventScroll: true });
    };
    if (this.#modal !== modal || footer.parentElement !== parent)
      this.#withFooterMove(place, restoreFocus);
    else
      place();
    if (popup)
      this.#placePopup(popupPlacement);
    if (footerView && this.#current(footerView))
      this.#announceShown(footerView);
    this.#notifyVisibility();
  }
  #tabsKey(event) {
    const view = this.#view;
    if (this.#moving || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !view || view.request.kind !== "documents")
      return;
    documentTabsKey(event, this.#elements.tabs, (type) => this.#selectDocument(view, type, true));
  }
  #selectSourceTab(view, mode, remember = false) {
    if (remember)
      this.#cancelNavigation();
    if (!this.#current(view) || view.request.kind !== "source-file" || mode !== "documentation" && mode !== "source")
      return;
    if (remember) {
      this.#sourceMode = mode;
      try {
        localStorage.setItem(sourceModeKey, mode);
      } catch {}
    }
    if (view.sourceMode === mode)
      return;
    if (remember) {
      this.#captureReading();
      view.pendingViewVisit = true;
    }
    this.#cancelPiPHold();
    view.restoreReading = null;
    if (mode === "documentation")
      this.#showSourceDocumentation(view);
    else if (mode === "source")
      this.#showSource(view);
    this.#recordShown(view);
    if (mode === "documentation")
      this.#recordViewTransition(view);
  }
  #sourceTabsKey(event) {
    const view = this.#view;
    if (this.#moving || !view || view.request.kind !== "source-file" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    sourceTabsKey(event, this.#elements.sourceTabs, (mode) => this.#selectSourceTab(view, mode, true));
  }
  #connect() {
    if (this.#events || !this.#options || !this.isConnected)
      return;
    if (!this.#initialize())
      return;
    const view = displayWindow(this);
    this.#boundView = view;
    this.#events = new view.AbortController;
    this.#motion = createMotion(view);
    const existingSearchLayer = this.#elements.body.querySelector("[data-search-current]");
    const searchLayer = isHTMLElement(existingSearchLayer) ? existingSearchLayer : this.ownerDocument.createElement("div");
    if (!isHTMLElement(existingSearchLayer)) {
      searchLayer.className = "search-highlight-layer";
      searchLayer.setAttribute("data-search-current", "");
      searchLayer.setAttribute("aria-hidden", "true");
      this.#elements.body.append(searchLayer);
    }
    this.#searchPainter = new CurrentSearchPainter(this.#elements.body, searchLayer);
    this.#mobile = view.matchMedia("(max-width: 760px)");
    const signal = this.#events.signal;
    const { dialog, tabs, sourceTabs, sourceRetry, mode } = this.#elements;
    this.#mobile.addEventListener("change", () => this.refreshPlacement(), { signal });
    view.addEventListener("resize", () => {
      if (!this.#moving)
        this.#motion?.finishAll();
    }, { signal });
    for (const document2 of new Set([this.ownerDocument, this.#commandHome])) {
      document2.addEventListener("keydown", (event) => this.#navigationKey(event), { signal });
      document2.defaultView?.addEventListener("pagehide", () => this.#captureReading(), { signal });
    }
    this.ownerDocument.addEventListener("keydown", (event) => this.#informationKey(event), { signal });
    this.ownerDocument.addEventListener("keyup", (event) => this.#informationKeyUp(event), { signal });
    this.ownerDocument.addEventListener("compositionstart", () => this.#cancelPiPHold(), { signal });
    this.ownerDocument.addEventListener("pointerdown", () => this.#cancelPiPHold(), { signal, capture: true });
    view.addEventListener("blur", () => this.#cancelPiPHold(), { signal });
    this.querySelector("#docs-close")?.addEventListener("click", () => {
      if (!this.#moving)
        this.#collapseInformation();
    }, { signal });
    const actions = this.#navigationActions;
    if (actions) {
      const names = {
        back: ui_strings_default.navigation.back,
        forward: ui_strings_default.navigation.forward,
        manualHistory: ui_strings_default.navigation.historyAddFile,
        refresh: ui_strings_default.navigation.refresh,
        linkMode: ui_strings_default.navigation.linkMode,
        bookmarks: ui_strings_default.navigation.bookmarks,
        search: ui_strings_default.navigation.search
      };
      for (const key of Object.keys(actions)) {
        actions[key].setAttribute("aria-label", names[key]);
      }
      this.#bindHistoryArrow(actions.back, -1, signal);
      this.#bindHistoryArrow(actions.forward, 1, signal);
      actions.manualHistory.addEventListener("click", () => this.toggleManualHistory(), { signal });
      actions.refresh.addEventListener("click", () => {
        this.refreshCurrent();
      }, { signal });
      actions.linkMode.setAttribute("aria-description", ui_strings_default.navigation.linkModeHold);
      this.#bindHoldButton(actions.linkMode, () => {
        this.#settings.cycleLinkMode();
        this.refreshLinkMode();
      }, () => this.showOrganizationRoot(), signal);
      actions.bookmarks.addEventListener("click", () => this.showBookmarks(), { signal });
      actions.search.setAttribute("aria-keyshortcuts", "F M");
      actions.search.setAttribute("aria-description", ui_strings_default.navigation.searchHistoryHold);
      actions.search.dataset.tooltip = navigationTooltip(ui_strings_default.navigation.search, "F / M", ui_strings_default.navigation.searchHistoryHold);
      this.#bindHoldButton(actions.search, () => this.showFind(), () => this.showSearchHistory(), signal);
    }
    this.#popup?.addEventListener("cancel", (event) => {
      event.preventDefault();
      this.#closePopup();
    }, { signal });
    this.#popup?.addEventListener("click", (event) => {
      if (event.target === this.#popup)
        this.#closePopup();
    }, { signal });
    this.ownerDocument.addEventListener("selectionchange", () => {
      if (!this.#searchOpen || this.#moving)
        return;
      const focused = deepFocus(this.ownerDocument);
      if (focused && (this.#searchBar?.contains(focused) || this.#popup?.contains(focused)))
        return;
      this.#captureSearchSelection();
      if (this.#searchSelectionOnly)
        this.#findSearchMatches();
      this.#renderSearch();
    }, { signal });
    this.addEventListener("pointerdown", (event) => {
      if (!this.#searchOpen || !isElement(event.target) || !event.target.closest("form.navigation-search"))
        return;
      this.#captureSearchSelection();
      if (this.#searchSelectionOnly)
        this.#findSearchMatches();
      this.#renderSearch();
    }, { signal, capture: true });
    this.#elements.sourceHost.addEventListener("click", (event) => {
      if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      if (!isElement(event.target))
        return;
      const marker = event.target.closest("[data-bookmark-line]");
      if (marker) {
        const line = Number(marker.getAttribute("data-bookmark-line"));
        if (Number.isSafeInteger(line))
          this.#bookmarkSourceLine(line);
        return;
      }
      if (!event.target.closest("[data-source-gutter]"))
        return;
      const line = this.#sourceRequest?.lineAt(event.clientY, this.#display);
      if (line)
        this.#bookmarkSourceLine(line);
    }, { signal });
    this.#elements.sourceHost.addEventListener("keydown", (event) => this.#gutterKey(event), { signal });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      if (!this.#moving)
        this.#collapseInformation();
    }, { signal });
    this.#settings.eventRoot.addEventListener("keydown", (event) => {
      const escape = event.key === "Escape" && !event.defaultPrevented && !event.repeat && !event.isComposing && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
      if (!this.#moving && !this.#popupKind && !this.#searchOpen && dialog.open && (escape || isCommandKey(event, "KeyQ"))) {
        event.preventDefault();
        this.#collapseInformation();
      }
    }, { signal });
    tabs.addEventListener("click", (event) => {
      const button = isElement(event.target) ? event.target.closest("button") : null;
      const type = button?.dataset.document;
      if (!this.#moving && button && !button.disabled && type && this.#view?.request.kind === "documents") {
        this.#selectDocument(this.#view, type, true);
      }
    }, { signal });
    tabs.addEventListener("keydown", (event) => this.#tabsKey(event), { signal });
    sourceTabs.addEventListener("click", (event) => {
      const button = isElement(event.target) ? event.target.closest("button") : null;
      if (!this.#moving && button && this.#view?.request.kind === "source-file") {
        this.#selectSourceTab(this.#view, button.dataset.sourceTab, true);
      }
    }, { signal });
    sourceTabs.addEventListener("keydown", (event) => this.#sourceTabsKey(event), { signal });
    sourceRetry.addEventListener("click", () => {
      if (!this.#moving)
        this.#retry();
    }, { signal });
    mode.addEventListener("click", () => {
      if (this.#moving)
        return;
      if (this.#view?.request.kind === "source-file")
        this.#cycleSourcePin();
      else
        this.toggleCurrentViewMode();
    }, { signal });
    this.querySelector(".docs-heading")?.addEventListener("mousedown", (event) => {
      const pointer = event;
      if (pointer.button === 0 && isElement(pointer.target) && pointer.target.closest("button")) {
        pointer.preventDefault();
      }
    }, { signal });
    this.#panelWidth?.bind(view, this.#settings.workspace, () => this.#motion?.finish(dialog));
    this.#panelWidth?.setEnabled(!this.#smallScreen && !this.#settings.standalone && !this.#closing);
    applyIcons(this, this.#icons);
    this.#updateNavigationActions();
    this.#bindBookmarkDrag();
    if (this.#popupKind && this.#popup) {
      if (!this.#moving || this.#popupKind === "history" || this.#popupKind === "bookmarks")
        this.#renderPopup();
      if (!this.#moving)
        this.#placePopup();
    }
  }
  #stopBindings() {
    this.#cancelPendingBookmarks();
    this.#cancelBookmarkDrag(false);
    this.#bookmarkDragStop?.();
    this.#bookmarkDragStop = null;
    this.#searchDragStop?.();
    this.#searchDragStop = null;
    this.#releaseSearchProjection();
    this.#searchPainter?.dispose();
    this.#searchPainter = null;
    this.#cancelNavigation();
    this.#collectionStop?.();
    this.#collectionStop = null;
    if (this.#popup?.open)
      this.#popup.close();
    this.#cancelPiPHold();
    this.#panelWidth?.stop();
    this.#sourceRequest?.stop();
    if (!this.#events)
      return;
    this.#events.abort();
    this.#events = null;
    this.#display.cancelAnimationFrame(this.#iconFrame);
    this.#iconFrame = 0;
    this.#motion?.dispose();
    this.#motion = null;
    this.#boundView = null;
  }
  #disconnect() {
    this.#setNavigationMessage("");
    this.#cancelPendingHistory();
    this.#captureReading();
    this.#closePopup(false);
    this.#stopBindings();
    this.close({ restore: false, immediate: true });
  }
  #actionVisibility() {
    for (const menu of this.querySelectorAll(".docs-reading-controls, .docs-actions")) {
      if (isHTMLElement(menu))
        showActionVisibility(menu);
    }
  }
}
function documentLabels(types, result) {
  const stripExtension = (name) => name.replace(/\.(md|markdown|txt)$/i, "");
  const duplicates = (labels, value) => labels.indexOf(value) !== labels.lastIndexOf(value);
  const names = types.map((type) => stripExtension(result.public ? result.documents[type].name : type));
  const paths = names.map((name, index) => duplicates(names, name) ? stripExtension(result.documents[types[index]].path) : name);
  const formats = paths.map((path, index) => duplicates(paths, path) ? `${path} · ${result.documents[types[index]].format === "markdown" ? labels.markdown : labels.text}` : path);
  const counts = new Map;
  return formats.map((label) => {
    if (!duplicates(formats, label))
      return label;
    const count = (counts.get(label) || 0) + 1;
    counts.set(label, count);
    return `${label} ${count}`;
  });
}
customElements.define("document-panel", DocumentPanel);
function deepFocus(owner) {
  let focused = owner.activeElement;
  while (focused?.shadowRoot?.activeElement)
    focused = focused.shadowRoot.activeElement;
  return isHTMLElement(focused) ? focused : null;
}

// src/bloc/preferences/index.mjs
import { LitElement } from "lit";

// src/component/preferences-controls/index.mjs
import { html as html16 } from "lit";

// src/component/access-action/index.mjs
import { html as html11 } from "lit";
function renderAccessAction(model) {
  return html11`
    <li data-tooltip=${model.label}>
      <button
        type          = "button"
        class         = "token-button icon-button muted"
        aria-label    = ${model.label}
        aria-haspopup = "dialog"
        aria-controls = ${model.dialogId}
        @click        = ${model.onClick}
      >${model.icon}</button>
    </li>`;
}

// src/component/font-size-control/index.mjs
function renderFontSizeControl(model) {
  return screenTemplate("preferences", "font-size-control.fontTool", {
    label: model.label,
    smallerLabel: model.smallerLabel,
    smallerDisabled: model.smallerDisabled,
    onClick: model.onSmaller,
    smallerIcon: model.smallerIcon,
    largerLabel: model.largerLabel,
    largerDisabled: model.largerDisabled,
    onClick2: model.onLarger,
    largerIcon: model.largerIcon
  });
}

// src/component/icons-menu/index.mjs
import { html as html13 } from "lit";

// src/component/accent-control/index.mjs
function renderAccentControl(model) {
  return screenTemplate("preferences", "accent-control.popoverHeading", {
    label: model.label,
    resetLabel: model.resetLabel,
    resetDisabled: model.resetDisabled,
    onClick: model.onReset,
    resetIcon: model.resetIcon,
    value: model.value,
    onInput: model.onInput,
    hexLabel: model.hexLabel
  });
}

// src/component/history-tree-control/index.mjs
function renderHistoryTreeControl(model) {
  const changed = (event) => model.onChange(event.currentTarget.value);
  return screenTemplate("preferences", "history-tree-control.historyTreeControl", {
    labelId: `${model.id}-label`,
    modeId: `${model.id}-mode`,
    hintId: `${model.id}-hint`,
    statusId: `${model.id}-status`,
    describedBy: `${model.id}-hint ${model.id}-status`,
    label: model.label,
    onChange: changed,
    optionsContent: model.options.map((option) => screenTemplate("preferences", "history-tree-control.option", {
      value: option.value,
      selected: option.value === model.value,
      content: option.label
    })),
    hint: model.hint,
    message: model.message
  });
}

// src/component/hold-duration-control/index.mjs
function renderHoldDurationControl(model) {
  return screenTemplate("preferences", "hold-duration-control.holdControl", {
    label: model.label,
    min: model.min,
    max: model.max,
    step: model.step,
    value: String(model.value),
    valueLabel: model.valueLabel,
    onInput: model.onInput
  });
}

// src/component/icon-options/index.mjs
import { nothing as nothing12 } from "lit";
function renderIconOptions(model) {
  return screenTemplate("preferences", "icon-options.fieldset", {
    label: model.label,
    disabled: !model.enabled,
    onChange: model.onChange,
    itemsContent: model.items.map((item) => screenTemplate("preferences", "icon-options.controlRow", {
      dataIconSetting: item.name,
      checked: item.checked,
      icon: item.checked ? item.icon : nothing12,
      content: item.label
    }))
  });
}

// src/component/mark-control/index.mjs
function renderMarkControl(model) {
  return screenTemplate("preferences", "mark-control.markOption", {
    label: model.label,
    resetLabel: model.resetLabel,
    resetDisabled: model.resetDisabled,
    onClick: model.onReset,
    resetIcon: model.resetIcon,
    value: model.value,
    onInput: model.onInput,
    hexLabel: model.hexLabel
  });
}

// src/component/source-highlight-control/index.mjs
import { nothing as nothing13 } from "lit";
function renderSourceHighlightControl(model) {
  const input = (event) => model.onInput(event.currentTarget.value);
  return screenTemplate("preferences", "source-highlight-control.sourceHighlightControl", {
    label: model.label,
    max: model.max,
    value: String(model.index),
    valueLabel: model.valueLabel,
    onInput: input,
    valueIconContent: model.valueIcon || model.valueLabel,
    messageContent: model.message || nothing13
  });
}

// src/component/theme-action/index.mjs
import { html as html12 } from "lit";
function renderThemeAction(model) {
  return html12`
    <li data-tooltip=${model.hint}>
      <button
        type              = "button"
        class             = "theme-button icon-button muted"
        id                = "theme-toggle"
        aria-label        = ${model.label}
        aria-keyshortcuts = ${model.shortcut}
        @click            = ${model.onClick}
      >${model.icon}</button>
    </li>`;
}

// src/component/icons-menu/index.mjs
function renderIconsMenu(model) {
  return html13`
    <li
      class="icons-tool"
      data-tooltip=${model.hint}
    >
      <details
        class="icons-menu"
        id="icons-menu"
        .open=${model.open}
        @keydown=${model.onKey}
      >
        <summary
          class="icon-button muted"
          aria-label=${model.label}
          aria-keyshortcuts=${model.shortcut}
          aria-expanded=${model.expanded}
          @click=${model.onClick}
        >
          ${model.icon}
        </summary>
        ${screenReady("preferences") ? screenTemplate("preferences", "preferences", {
    label: model.label,
    themeAction: screenTemplate("preferences", "theme", model.theme),
    fontSizeControl: renderFontSizeControl(model.font),
    iconOptions: renderIconOptions(model.options),
    holdDuration: renderHoldDurationControl(model.hold),
    organizationRoot: renderOrganizationRootControl(model.organization),
    historyTree: renderHistoryTreeControl(model.historyTree),
    searchTree: renderHistoryTreeControl(model.searchTree),
    accentControl: renderAccentControl(model.accent),
    markControl: renderMarkControl(model.mark),
    sourceHighlight: renderSourceHighlightControl(model.sourceHighlight)
  }) : html13`
              <section class="icons-popover popover surface">
                ${screenStatus(model.loadFailed, model.retryLoad)}
              </section>
            `}
      </details>
    </li>
  `;
}

// src/component/site-navigation-controls/index.mjs
import { html as html14 } from "lit";
function renderSiteNavigationControls(model) {
  return html14`
    ${[...model.items, model.mode].map((item) => html14`<li class="navigation-tool">
        <button
          type              = "button"
          id                = ${item.id}
          class             = "navigation-button icon-button muted"
          aria-label        = ${item.label}
          aria-keyshortcuts = ${item.shortcut}
          data-tooltip      = ${navigationTooltip(item.label, item.shortcutLabel || item.shortcut, item.holdHint)}
          aria-description  = ${item.holdHint || ""}
          @click            = ${item.onClick}
          @pointerdown      = ${item.onPointerDown}
          @pointerleave     = ${item.onPointerLeave}
        >${item.icon}</button>
      </li>`)}`;
}

// src/component/update-action/index.mjs
import { html as html15 } from "lit";
function renderUpdateAction(model) {
  return html15`
    <li class="update-tool">
      <button
        type         = "button"
        id           = "site-update-header"
        class        = "update-button icon-button muted"
        aria-label   = ${model.label}
        data-tooltip = ${model.label}
      ><span data-control=${model.control}></span></button>
    </li>`;
}
function showUpdateAction(button, model) {
  button.dataset.controlState = model.state;
  button.disabled = model.disabled;
  button.setAttribute("aria-label", model.label);
  button.dataset.tooltip = model.tooltip;
  button.querySelector("[data-control]")?.setAttribute("data-control", model.control);
}

// src/component/preferences-controls/index.mjs
function renderPreferencesControls(model) {
  return html16`
    <menu
      class="header-tools plain-list control-row"
      aria-label=${model.label}
      @mousedown=${model.onMouseDown}
    >
      ${renderSiteNavigationControls(model.navigation)}${renderIconsMenu({
    ...model.icons,
    font: model.font,
    accent: model.colors.accent,
    mark: model.colors.mark,
    sourceHighlight: model.colors.sourceHighlight,
    theme: model.theme
  })}${renderUpdateAction(model.update)}${renderAccessAction(model.access)}${renderThemeAction(model.theme)}
    </menu>
  `;
}
// src/bloc/preferences/json/appearance.json
var appearance_default = {
  themeDefault: "light",
  accentColors: {
    light: "#c33f4b",
    dark: "#27e69b"
  },
  markColors: {
    light: "#899990",
    dark: "#8b94a3"
  },
  iconVisibility: {
    repositories: false,
    directories: false,
    files: true,
    symbols: true
  },
  fontIncrease: {
    default: 0,
    min: 0,
    max: 2,
    step: 1
  },
  holdDuration: {
    default: 500,
    min: 250,
    max: 500,
    step: 25
  }
};

// src/bloc/preferences/index.mjs
var labels2 = ui_strings_default.preferences;
var iconGroups = Object.keys(appearance_default.iconVisibility);
var defaultTheme = appearance_default.themeDefault;
var organizationRootKey = "site-organization-root";
var linkModeKey = "site-link-mode";
var historyTreeModeKey = "site-history-tree-mode";
var searchTreeModeKey = "site-search-tree-mode";
var sourceHighlightDurationKey = "site-source-highlight-duration";
var sourceHighlightDurations = [0, 500, 1000, 1500, 2000, 2500, 3000, null];
function readSourceHighlightDuration(value) {
  if (typeof value !== "string")
    return;
  return sourceHighlightDurations.find((duration) => (duration === null ? "infinity" : String(duration)) === value);
}
function readHistoryTreeMode(value) {
  return value === "none" || value === "temporary" || value === "always" ? value : null;
}

class SitePreferences extends LitElement {
  static properties = {
    theme: { state: true },
    accent: { state: true },
    customAccent: { state: true },
    markColor: { state: true },
    customMark: { state: true },
    icons: { state: true },
    iconsEnabled: { state: true },
    fontIncrease: { state: true },
    holdDuration: { state: true },
    tokenActive: { state: true },
    iconsOpen: { state: true },
    iconsExpanded: { state: true }
  };
  #events = null;
  #motion = null;
  #systemTheme = null;
  #accents = { light: null, dark: null };
  #marks = { light: null, dark: null };
  #savedIcons = {};
  #manualTheme = null;
  #reverseTheme = {
    dark: "light",
    light: "dark"
  };
  #home = this.ownerDocument;
  #documents = new Set([this.ownerDocument]);
  #moving = false;
  #menuFocus = { icons: null };
  #markupLoading = false;
  #markupFailed = false;
  #organizationRoot = "";
  #linkMode = "internal";
  #navigationMessage = "";
  #historyTreeMode = "temporary";
  #historyTreeMessage = "";
  #searchTreeMode = "temporary";
  #searchTreeMessage = "";
  #sourceHighlightDuration = 3000;
  #sourceHighlightMessage = "";
  #navigationHold = null;
  #suppressedNavigationClick = null;
  constructor() {
    super();
    const theme = this.#home.documentElement.dataset.theme;
    this.#manualTheme = theme === "light" || theme === "dark" ? theme : null;
    this.theme = this.#manualTheme || defaultTheme;
    this.accent = appearance_default.accentColors.light;
    this.customAccent = false;
    this.markColor = appearance_default.markColors.light;
    this.customMark = false;
    this.icons = { ...appearance_default.iconVisibility };
    this.iconsEnabled = false;
    this.iconsOpen = this.iconsExpanded = false;
    this.fontIncrease = appearance_default.fontIncrease.default;
    this.holdDuration = appearance_default.holdDuration.default;
    this.tokenActive = false;
    try {
      const storage = displayWindow(this.#home).localStorage;
      const increase = Number(storage.getItem("font-increase"));
      if (Number.isInteger(increase) && increase >= appearance_default.fontIncrease.min && increase <= appearance_default.fontIncrease.max)
        this.fontIncrease = increase;
      const duration = Number(storage.getItem("site-hold-duration"));
      if (Number.isInteger(duration) && duration >= appearance_default.holdDuration.min && duration <= appearance_default.holdDuration.max)
        this.holdDuration = duration;
      const saved = JSON.parse(storage.getItem("site-icons") || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        const choices = saved;
        for (const name of Object.keys(this.icons)) {
          const value = choices[name];
          if (typeof value === "boolean")
            this.#savedIcons[name] = value;
        }
      }
    } catch {}
    const themes = ["light", "dark"];
    for (const name of themes) {
      try {
        const value = displayWindow(this.#home).localStorage.getItem(`accent-${name}`);
        if (value && /^#[0-9a-f]{6}$/i.test(value))
          this.#accents[name] = value;
        const mark = displayWindow(this.#home).localStorage.getItem(`mark-${name}`);
        if (mark && /^#[0-9a-f]{6}$/i.test(mark))
          this.#marks[name] = mark;
      } catch {}
    }
    try {
      const storage = displayWindow(this.#home).localStorage;
      this.#organizationRoot = readOrganizationRoot(storage.getItem(organizationRootKey) || "") || "";
      const mode = storage.getItem(linkModeKey);
      if (mode === "github" || mode === "vscode" && this.#organizationRoot)
        this.#linkMode = mode;
    } catch {
      this.#navigationMessage = labels2.navigationStorageFailed;
    }
    try {
      const saved = displayWindow(this.#home).localStorage.getItem(historyTreeModeKey);
      this.#historyTreeMode = readHistoryTreeMode(saved) || "temporary";
    } catch {
      this.#historyTreeMessage = labels2.navigationStorageFailed;
    }
    try {
      const saved = displayWindow(this.#home).localStorage.getItem(searchTreeModeKey);
      this.#searchTreeMode = readHistoryTreeMode(saved) || "temporary";
    } catch {
      this.#searchTreeMessage = labels2.navigationStorageFailed;
    }
    try {
      const saved = readSourceHighlightDuration(displayWindow(this.#home).localStorage.getItem(sourceHighlightDurationKey));
      if (saved !== undefined)
        this.#sourceHighlightDuration = saved;
    } catch {
      this.#sourceHighlightMessage = labels2.navigationStorageFailed;
    }
  }
  get sourceHighlightDuration() {
    return this.#sourceHighlightDuration;
  }
  get historyTreeMode() {
    return this.#historyTreeMode;
  }
  get searchTreeMode() {
    return this.#searchTreeMode;
  }
  get organizationRoot() {
    return this.#organizationRoot;
  }
  get organizationRootControl() {
    return {
      id: "navigation-organization-root",
      label: labels2.organizationRoot,
      hint: labels2.organizationRootHint,
      placeholder: labels2.organizationRootPlaceholder,
      value: this.#organizationRoot,
      message: this.#navigationMessage,
      invalidMessage: labels2.organizationRootInvalid,
      saveLabel: labels2.organizationRootSave,
      resetLabel: labels2.organizationRootReset,
      saveIcon: controlIcon("organization-root-save"),
      resetIcon: controlIcon("organization-root-reset"),
      save: (value) => this.saveOrganizationRoot(value),
      reset: () => {
        this.saveOrganizationRoot("");
      }
    };
  }
  saveOrganizationRoot(value) {
    if (!this.#events || this.#moving)
      return false;
    const root = readOrganizationRoot(value);
    this.#navigationMessage = root === null ? labels2.organizationRootInvalid : "";
    if (root === null) {
      this.requestUpdate();
      return false;
    }
    this.#setNavigation(root, this.#linkMode, true);
    return true;
  }
  get linkMode() {
    return this.#linkMode;
  }
  cycleLinkMode() {
    if (this.#moving)
      return this.#linkMode;
    const mode = this.#linkMode === "internal" ? this.#organizationRoot ? "vscode" : "github" : this.#linkMode === "vscode" ? "github" : "internal";
    this.#setNavigation(this.#organizationRoot, mode, true);
    return this.#linkMode;
  }
  createRenderRoot() {
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });
    const sheet = this.ownerDocument.createElement("link");
    sheet.rel = "stylesheet";
    sheet.href = new URL("public/css/preferences.css", this.ownerDocument.baseURI).href;
    root.append(sheet);
    this.renderOptions.renderBefore = sheet;
    return root;
  }
  setIcons(settings, enabled = true) {
    this.icons = { ...this.icons, ...settings, ...this.#savedIcons };
    this.iconsEnabled = enabled;
  }
  setTokenActive(active) {
    this.tokenActive = active;
  }
  setThemeDocuments(owners) {
    this.#documents = new Set(owners);
    this.#updateTheme(false);
    this.#applyFontSize();
    for (const owner of this.#documents)
      enableSystemSymbols(owner);
  }
  prepareMove({ restoreFocus = true, rollbackFocus = true } = {}) {
    if (this.#moving)
      throw new Error("Preferences are already moving");
    const focused = deepFocus2(this.ownerDocument);
    const ownedFocus = focused && this.renderRoot.contains(focused) ? focused : null;
    this.#moving = true;
    const resume = () => {
      this.#bind();
      if (restoreFocus && ownedFocus?.isConnected)
        ownedFocus.focus({ preventScroll: true });
    };
    const restore = () => {
      this.#bind();
      if (rollbackFocus && ownedFocus?.isConnected)
        ownedFocus.focus({ preventScroll: true });
    };
    try {
      this.#unbind();
    } catch (error) {
      try {
        restore();
      } finally {
        this.#moving = false;
      }
      throw error;
    }
    return {
      resume,
      rollback: () => {
        try {
          this.#unbind();
          restore();
        } finally {
          this.#moving = false;
        }
      },
      commit: () => {
        this.#moving = false;
      }
    };
  }
  connectedCallback() {
    super.connectedCallback();
    if (!this.#moving)
      this.#bind();
  }
  disconnectedCallback() {
    if (!this.#moving) {
      this.#unbind();
      this.#setMenu("icons", false, true);
    }
    super.disconnectedCallback();
  }
  #bind() {
    if (this.#events || !this.isConnected)
      return;
    const view = displayWindow(this);
    this.#events = new view.AbortController;
    this.#motion = createMotion(view);
    this.#systemTheme = view.matchMedia("(prefers-color-scheme: dark)");
    const signal = this.#events.signal;
    this.#systemTheme.addEventListener("change", () => {
      if (!this.#moving)
        this.#updateTheme();
    }, { signal });
    view.addEventListener("resize", () => {
      if (!this.#moving)
        this.#motion?.finishAll();
    }, { signal });
    this.ownerDocument.addEventListener("pointerdown", (event) => {
      if (this.#moving)
        return;
      const path = event.composedPath();
      if (this.#navigationHold && !path.includes(this.#navigationHold.button))
        this.#cancelNavigationHold(true);
      const icons = this.renderRoot.querySelector("#icons-menu");
      if (!icons || !path.includes(icons))
        this.#setMenu("icons", false);
    }, { signal });
    this.ownerDocument.addEventListener("keydown", (event) => this.#shortcut(event), { signal });
    this.ownerDocument.addEventListener("pointermove", (event) => {
      const hold = this.#navigationHold;
      if (hold && hold.pointerId === event.pointerId && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 8)
        this.#cancelNavigationHold(true);
    }, { signal, passive: true });
    this.ownerDocument.addEventListener("pointerup", (event) => this.#releaseNavigationHold(event), {
      signal,
      capture: true
    });
    this.ownerDocument.addEventListener("pointercancel", (event) => {
      if (this.#navigationHold?.pointerId === event.pointerId)
        this.#cancelNavigationHold(true);
    }, { signal, capture: true });
    this.ownerDocument.addEventListener("scroll", () => this.#cancelNavigationHold(true), {
      signal,
      capture: true,
      passive: true
    });
    view.addEventListener("blur", () => this.#cancelNavigationHold(true), { signal });
    displayWindow(this.#home).addEventListener("storage", (event) => {
      if (this.#moving)
        return;
      if ([sourceHighlightDurationKey, null].includes(event.key)) {
        try {
          const saved = readSourceHighlightDuration(displayWindow(this.#home).localStorage.getItem(sourceHighlightDurationKey));
          this.#setSourceHighlightDuration(saved === undefined ? 3000 : saved);
        } catch {
          this.#sourceHighlightMessage = labels2.navigationStorageFailed;
          this.requestUpdate();
        }
      }
      for (const kind of ["history", "search"]) {
        const key = kind === "history" ? historyTreeModeKey : searchTreeModeKey;
        if (![key, null].includes(event.key))
          continue;
        try {
          const saved = displayWindow(this.#home).localStorage.getItem(key);
          this.#setTreeMode(kind, readHistoryTreeMode(saved) || "temporary");
        } catch {
          if (kind === "history")
            this.#historyTreeMessage = labels2.navigationStorageFailed;
          else
            this.#searchTreeMessage = labels2.navigationStorageFailed;
          this.requestUpdate();
        }
      }
      if (![organizationRootKey, linkModeKey, null].includes(event.key))
        return;
      try {
        const storage = displayWindow(this.#home).localStorage;
        const root = readOrganizationRoot(storage.getItem(organizationRootKey) || "");
        const mode = storage.getItem(linkModeKey);
        if (root === null)
          return;
        this.#setNavigation(root, mode === "github" || mode === "vscode" && root ? mode : "internal");
      } catch {
        this.#navigationMessage = labels2.navigationStorageFailed;
        this.requestUpdate();
      }
    }, { signal });
    this.#updateTheme(!this.#moving);
    this.#applyFontSize();
    enableSystemSymbols(this.ownerDocument);
  }
  #unbind() {
    this.#cancelNavigationHold();
    this.#suppressedNavigationClick = null;
    this.#motion?.finishAll();
    this.#events?.abort();
    this.#events = null;
    this.#motion?.dispose();
    this.#motion = null;
    this.#systemTheme = null;
  }
  #updateTheme(syncInputs = true) {
    this.theme = this.#manualTheme || (this.#systemTheme?.matches ? "dark" : "light");
    this.customAccent = Boolean(this.#accents[this.theme]);
    this.accent = this.#accents[this.theme] || appearance_default.accentColors[this.theme];
    this.customMark = Boolean(this.#marks[this.theme]);
    this.markColor = this.#marks[this.theme] || appearance_default.markColors[this.theme];
    for (const owner of this.#documents) {
      if (this.#manualTheme)
        owner.documentElement.dataset.theme = this.#manualTheme;
      else
        delete owner.documentElement.dataset.theme;
      if (this.customAccent)
        owner.documentElement.style.setProperty("--accent-override", this.accent);
      else
        owner.documentElement.style.removeProperty("--accent-override");
      if (this.customMark)
        owner.documentElement.style.setProperty("--mark-background", this.markColor);
      else
        owner.documentElement.style.removeProperty("--mark-background");
    }
    if (!syncInputs || !this.renderRoot)
      return;
    for (const id of ["accent-color", "accent-hex", "mark-color", "mark-hex"]) {
      const input = this.renderRoot.querySelector(`#${id}`);
      if (input)
        input.value = id.startsWith("mark-") ? this.markColor : this.accent;
    }
  }
  #setTheme(theme) {
    this.#manualTheme = theme;
    try {
      displayWindow(this.#home).localStorage.setItem("theme", theme);
    } finally {}
    this.#updateTheme();
  }
  #applyFontSize() {
    for (const owner of this.#documents) {
      owner.documentElement.style.setProperty("--font-increase", `${this.fontIncrease}px`);
    }
  }
  #changeFontSize(change) {
    if (!this.#events || this.#moving)
      return;
    const increase = Math.min(appearance_default.fontIncrease.max, Math.max(appearance_default.fontIncrease.min, this.fontIncrease + change));
    if (increase === this.fontIncrease)
      return;
    this.fontIncrease = increase;
    try {
      displayWindow(this.#home).localStorage.setItem("font-increase", String(increase));
    } finally {}
    this.#applyFontSize();
    this.dispatchEvent(new CustomEvent("font-size-change", { bubbles: true, composed: true }));
  }
  #toggleTheme() {
    if (!this.#events || this.#moving)
      return;
    this.#setTheme(this.#reverseTheme[this.theme]);
  }
  #shortcut(event) {
    if (!this.#events || this.#moving || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat || event.isComposing)
      return;
    if (event.composedPath().some((node) => isHTMLElement(node) && (node.matches("input,textarea,select") || node.isContentEditable)))
      return;
    const key = event.code;
    if (!["KeyT", "KeyI"].includes(key))
      return;
    event.preventDefault();
    if (key === "KeyT")
      this.#toggleTheme();
    else {
      this.#setMenu("icons", !this.iconsExpanded);
    }
  }
  #keepFocus(event) {
    if (event.button === 0 && isElement(event.target) && event.target.closest("button,summary"))
      event.preventDefault();
  }
  #setAccent(event) {
    if (!this.#events || this.#moving)
      return;
    const value = event.target.value;
    if (!/^#[0-9a-f]{6}$/i.test(value))
      return;
    const accent = value.toLowerCase();
    this.#accents[this.theme] = accent;
    try {
      displayWindow(this.#home).localStorage.setItem(`accent-${this.theme}`, accent);
    } finally {}
    this.#updateTheme();
  }
  #resetAccent() {
    if (!this.#events || this.#moving)
      return;
    this.#accents[this.theme] = null;
    try {
      displayWindow(this.#home).localStorage.removeItem(`accent-${this.theme}`);
    } finally {}
    this.#updateTheme();
  }
  #setMark(event) {
    if (!this.#events || this.#moving)
      return;
    const value = event.target.value;
    if (!/^#[0-9a-f]{6}$/i.test(value))
      return;
    const mark = value.toLowerCase();
    this.#marks[this.theme] = mark;
    try {
      displayWindow(this.#home).localStorage.setItem(`mark-${this.theme}`, mark);
    } finally {}
    this.#updateTheme();
  }
  #resetMark() {
    if (!this.#events || this.#moving)
      return;
    this.#marks[this.theme] = null;
    try {
      displayWindow(this.#home).localStorage.removeItem(`mark-${this.theme}`);
    } finally {}
    this.#updateTheme();
  }
  #changeIcons(event) {
    if (!this.#events || this.#moving)
      return;
    const input = event.target;
    const name = input.dataset.iconSetting;
    if (!name || !Object.hasOwn(this.icons, name))
      return;
    this.icons = { ...this.icons, [name]: input.checked };
    this.#savedIcons = { ...this.#savedIcons, [name]: input.checked };
    try {
      displayWindow(this.#home).localStorage.setItem("site-icons", JSON.stringify(this.#savedIcons));
    } finally {}
    this.dispatchEvent(new CustomEvent("icons-change", { detail: { ...this.icons }, bubbles: true, composed: true }));
  }
  #changeHoldDuration(event) {
    if (!this.#events || this.#moving)
      return;
    const value = Number(event.target.value);
    if (!Number.isInteger(value) || value < appearance_default.holdDuration.min || value > appearance_default.holdDuration.max)
      return;
    this.holdDuration = value;
    try {
      displayWindow(this.#home).localStorage.setItem("site-hold-duration", String(value));
    } finally {}
    this.dispatchEvent(new CustomEvent("hold-duration-change", { detail: value, bubbles: true, composed: true }));
  }
  #changeOrganizationRoot(event) {
    if (!this.#events || this.#moving)
      return;
    const input = event.target;
    const accepted = this.saveOrganizationRoot(input.value);
    input.setCustomValidity(accepted ? "" : labels2.organizationRootInvalid);
    if (accepted)
      input.value = this.#organizationRoot;
  }
  #startNavigationHold(event, action) {
    if (!this.#events || this.#moving || !event.isPrimary || event.button !== 0)
      return;
    const button = event.currentTarget;
    if (!isHTMLElement(button) || button.localName !== "button")
      return;
    this.#cancelNavigationHold();
    this.#suppressedNavigationClick = null;
    const display = displayWindow(this);
    const hold = {
      button,
      display,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      timer: 0,
      ready: false,
      action
    };
    hold.timer = display.setTimeout(() => {
      hold.timer = 0;
      if (this.#navigationHold !== hold || !this.#events || this.#moving || !hold.button.isConnected)
        return;
      hold.ready = true;
      hold.button.setAttribute("data-hold-ready", "");
    }, this.holdDuration);
    this.#navigationHold = hold;
  }
  #cancelNavigationHold(suppress = false) {
    const hold = this.#navigationHold;
    if (!hold)
      return;
    hold.display.clearTimeout(hold.timer);
    hold.button.removeAttribute("data-hold-ready");
    if (hold.ready || suppress)
      this.#suppressedNavigationClick = { button: hold.button, until: Date.now() + 1000 };
    this.#navigationHold = null;
  }
  #releaseNavigationHold(event) {
    const hold = this.#navigationHold;
    if (!hold || hold.pointerId !== event.pointerId)
      return;
    const accepted = hold.ready && this.#events && !this.#moving && hold.button.isConnected;
    this.#cancelNavigationHold();
    if (accepted)
      this.dispatchEvent(new CustomEvent(hold.action, { bubbles: true, composed: true }));
  }
  #navigationClick(event, action) {
    const suppressed = this.#suppressedNavigationClick;
    if (event.detail > 0 && (this.#navigationHold?.button === event.currentTarget && this.#navigationHold.ready || suppressed?.button === event.currentTarget && Date.now() < suppressed.until)) {
      event.preventDefault();
      this.#cancelNavigationHold();
      this.#suppressedNavigationClick = null;
      return;
    }
    this.#cancelNavigationHold();
    if (action === "link-mode")
      this.cycleLinkMode();
    else
      this.dispatchEvent(new CustomEvent(action, { bubbles: true, composed: true }));
  }
  #changeTreeMode(kind, value) {
    if (!this.#events || this.#moving)
      return;
    const mode = readHistoryTreeMode(value);
    if (mode)
      this.#setTreeMode(kind, mode, true);
  }
  #changeSourceHighlightDuration(value) {
    if (!this.#events || this.#moving || typeof value !== "string" || !/^[0-7]$/.test(value))
      return;
    const duration = sourceHighlightDurations[Number(value)];
    if (duration !== undefined)
      this.#setSourceHighlightDuration(duration, true);
  }
  #setSourceHighlightDuration(duration, save = false) {
    const previous = this.#sourceHighlightDuration;
    this.#sourceHighlightDuration = duration;
    this.#sourceHighlightMessage = "";
    if (save) {
      try {
        displayWindow(this.#home).localStorage.setItem(sourceHighlightDurationKey, duration === null ? "infinity" : String(duration));
      } catch {
        this.#sourceHighlightMessage = labels2.navigationStorageFailed;
      }
    }
    this.requestUpdate();
    if (previous !== duration) {
      this.dispatchEvent(new CustomEvent("source-highlight-duration-change", { detail: duration, bubbles: true, composed: true }));
    }
  }
  #setTreeMode(kind, mode, save = false) {
    const history = kind === "history";
    const previous = history ? this.#historyTreeMode : this.#searchTreeMode;
    let message = "";
    if (save) {
      try {
        displayWindow(this.#home).localStorage.setItem(history ? historyTreeModeKey : searchTreeModeKey, mode);
      } catch {
        message = labels2.navigationStorageFailed;
      }
    }
    if (history) {
      this.#historyTreeMode = mode;
      this.#historyTreeMessage = message;
    } else {
      this.#searchTreeMode = mode;
      this.#searchTreeMessage = message;
    }
    this.requestUpdate();
    if (previous !== mode) {
      this.dispatchEvent(new CustomEvent(`${kind}-tree-mode-change`, {
        detail: mode,
        bubbles: true,
        composed: true
      }));
    }
  }
  #setNavigation(root, mode, save = false) {
    const previousRoot = this.#organizationRoot;
    const previousMode = this.#linkMode;
    this.#organizationRoot = root;
    this.#linkMode = mode === "vscode" && !root ? "internal" : mode;
    if (save) {
      try {
        const storage = displayWindow(this.#home).localStorage;
        storage.setItem(organizationRootKey, root);
        storage.setItem(linkModeKey, this.#linkMode);
        this.#navigationMessage = "";
      } catch {
        this.#navigationMessage = labels2.navigationStorageFailed;
      }
    }
    this.requestUpdate();
    if (previousRoot !== root) {
      this.dispatchEvent(new CustomEvent("organization-root-change", { detail: root, bubbles: true, composed: true }));
    }
    if (previousMode !== this.#linkMode) {
      this.dispatchEvent(new CustomEvent("link-mode-change", {
        detail: this.#linkMode,
        bubbles: true,
        composed: true
      }));
    }
  }
  #menuClick(event, name) {
    event.preventDefault();
    if (!this.#events || this.#moving)
      return;
    this.#setMenu(name, !this[`${name}Expanded`]);
  }
  #menuKey(event, name) {
    if (!this.#events || this.#moving || event.key !== "Escape")
      return;
    event.preventDefault();
    event.stopPropagation();
    this.#setMenu(name, false);
    const focused = this.#menuFocus[name];
    if (focused?.isConnected && focused.ownerDocument === this.ownerDocument)
      focused.focus({ preventScroll: true });
  }
  #setMenu(name, expanded, immediate = false) {
    const intent = "iconsExpanded";
    const visible = "iconsOpen";
    if (this[intent] === expanded && !immediate)
      return;
    const menu = this.renderRoot?.querySelector(`#${name}-menu`);
    const content = menu?.querySelector(".accent-picker, .icons-popover");
    const style = menu?.open && content ? displayWindow(this).getComputedStyle(content) : null;
    const from = { opacity: style?.opacity || "0", transform: style?.transform || "translateY(-4px)" };
    if (content)
      this.#motion?.cancel(content);
    if (expanded) {
      this.#loadPreferencesMarkup();
      this.#updateTheme();
      this.dispatchEvent(new CustomEvent("settings-reveal", { bubbles: true }));
      this.#menuFocus[name] = deepFocus2(this.ownerDocument);
    }
    this[intent] = expanded;
    if (immediate || !menu || !content || !this.#motion) {
      this[visible] = expanded;
      if (menu)
        menu.open = expanded;
      return;
    }
    if (expanded) {
      this[visible] = true;
      menu.open = true;
    }
    if (!menu.open)
      return;
    this.#motion.play(content, [from, {
      opacity: expanded ? 1 : 0,
      transform: expanded ? "translateY(0)" : "translateY(-4px)"
    }], {
      finish: () => {
        if (!this[intent]) {
          this[visible] = false;
          menu.open = false;
        }
      }
    });
  }
  #loadPreferencesMarkup() {
    if (screenReady("preferences") || this.#markupLoading)
      return;
    this.#markupLoading = true;
    this.#markupFailed = false;
    this.requestUpdate();
    loadScreen("preferences").catch(() => {
      this.#markupFailed = true;
    }).finally(() => {
      this.#markupLoading = false;
      if (this.isConnected && !this.#moving)
        this.requestUpdate();
    });
  }
  render() {
    return renderPreferencesControls({
      label: labels2.appearance,
      onMouseDown: (event) => this.#keepFocus(event),
      navigation: {
        items: [
          {
            id: "site-bookmarks",
            label: ui_strings_default.navigation.bookmarks,
            shortcut: "N",
            icon: controlIcon("bookmarks"),
            onClick: (event) => this.#navigationClick(event, "bookmarks-open")
          },
          {
            id: "site-search",
            label: ui_strings_default.navigation.search,
            shortcut: "F M",
            shortcutLabel: "F / M",
            icon: controlIcon("search"),
            holdHint: ui_strings_default.navigation.searchHistoryHold,
            onClick: (event) => this.#navigationClick(event, "search-open"),
            onPointerDown: (event) => this.#startNavigationHold(event, "search-history-open"),
            onPointerLeave: () => this.#cancelNavigationHold(true)
          }
        ],
        mode: {
          id: "site-link-mode",
          label: ui_strings_default.navigation[this.#linkMode],
          shortcut: "B",
          icon: controlIcon(`link-${this.#linkMode}`),
          holdHint: ui_strings_default.navigation.linkModeHold,
          onClick: (event) => this.#navigationClick(event, "link-mode"),
          onPointerDown: (event) => this.#startNavigationHold(event, "organization-root-open"),
          onPointerLeave: () => {
            this.#cancelNavigationHold(true);
          }
        }
      },
      font: {
        label: labels2.textSize,
        smallerLabel: labels2.decreaseTextSize,
        largerLabel: labels2.increaseTextSize,
        smallerDisabled: this.fontIncrease === appearance_default.fontIncrease.min,
        largerDisabled: this.fontIncrease === appearance_default.fontIncrease.max,
        smallerIcon: controlIcon("text-smaller"),
        largerIcon: controlIcon("text-larger"),
        onSmaller: () => this.#changeFontSize(-appearance_default.fontIncrease.step),
        onLarger: () => this.#changeFontSize(appearance_default.fontIncrease.step)
      },
      icons: {
        hint: labels2.iconVisibilityHint,
        label: labels2.iconAndHold,
        open: this.iconsOpen,
        expanded: this.iconsExpanded,
        icon: controlIcon("icons"),
        shortcut: "I",
        onClick: (event) => this.#menuClick(event, "icons"),
        onKey: (event) => this.#menuKey(event, "icons"),
        loadFailed: this.#markupFailed,
        retryLoad: () => this.#loadPreferencesMarkup(),
        options: {
          label: labels2.iconVisibility,
          enabled: this.iconsEnabled,
          items: iconGroups.map((name) => ({
            name,
            label: labels2.icons[name],
            checked: this.icons[name],
            icon: groupedIcon({ repositories: "repository", directories: "directory", files: "file-hx", symbols: "symbol" }[name], name, this.icons)
          })),
          onChange: (event) => this.#changeIcons(event)
        },
        hold: {
          label: labels2.holdDuration,
          ...appearance_default.holdDuration,
          value: this.holdDuration,
          valueLabel: `${this.holdDuration} ms`,
          onInput: (event) => this.#changeHoldDuration(event)
        },
        organization: {
          ...this.organizationRootControl,
          id: "organization-root",
          onChange: (event) => this.#changeOrganizationRoot(event)
        },
        historyTree: {
          id: "history-tree",
          label: labels2.historyTree.label,
          hint: labels2.historyTree.hint,
          value: this.#historyTreeMode,
          options: [
            { value: "none", label: labels2.historyTree.none },
            { value: "temporary", label: labels2.historyTree.temporary },
            { value: "always", label: labels2.historyTree.always }
          ],
          message: this.#historyTreeMessage,
          onChange: (value) => this.#changeTreeMode("history", value)
        },
        searchTree: {
          id: "search-tree",
          label: labels2.searchTree.label,
          hint: labels2.searchTree.hint,
          value: this.#searchTreeMode,
          options: [
            { value: "none", label: labels2.searchTree.none },
            { value: "temporary", label: labels2.searchTree.temporary },
            { value: "always", label: labels2.searchTree.always }
          ],
          message: this.#searchTreeMessage,
          onChange: (value) => this.#changeTreeMode("search", value)
        }
      },
      colors: {
        accent: {
          label: labels2.accentColor,
          hexLabel: labels2.accentHexValue,
          value: this.accent,
          resetLabel: labels2.resetAccentColor,
          resetDisabled: !this.customAccent,
          resetIcon: controlIcon("reset"),
          onReset: () => this.#resetAccent(),
          onInput: (event) => this.#setAccent(event)
        },
        mark: {
          label: labels2.markBackground,
          hexLabel: labels2.markBackgroundHex,
          value: this.markColor,
          resetLabel: labels2.resetMarkBackground,
          resetDisabled: !this.customMark,
          resetIcon: controlIcon("reset"),
          onReset: () => this.#resetMark(),
          onInput: (event) => this.#setMark(event)
        },
        sourceHighlight: {
          label: labels2.sourceHighlightTime,
          index: sourceHighlightDurations.indexOf(this.#sourceHighlightDuration),
          max: sourceHighlightDurations.length - 1,
          valueLabel: this.#sourceHighlightDuration === null ? labels2.sourceHighlightInfinity : formatText(labels2.sourceHighlightSeconds, { seconds: this.#sourceHighlightDuration / 1000 }),
          valueIcon: this.#sourceHighlightDuration === null ? controlIcon("infinity") : null,
          message: this.#sourceHighlightMessage,
          onInput: (value) => this.#changeSourceHighlightDuration(value)
        }
      },
      update: { label: ui_strings_default.version.check, control: "update-check" },
      access: {
        label: labels2.manageTokens,
        dialogId: "token-dialog",
        icon: controlIcon(this.tokenActive ? "key" : "key-slash"),
        onClick: () => this.dispatchEvent(new CustomEvent("tokens-open", { bubbles: true, composed: true }))
      },
      theme: {
        label: this.theme === "dark" ? labels2.switchLight : labels2.switchDark,
        hint: this.theme === "dark" ? labels2.switchLightHint : labels2.switchDarkHint,
        icon: controlIcon(this.theme === "dark" ? "moon" : "sun"),
        shortcut: "T",
        onClick: () => this.#toggleTheme()
      }
    });
  }
}
function deepFocus2(owner) {
  let focused = owner.activeElement;
  while (focused?.shadowRoot?.activeElement)
    focused = focused.shadowRoot.activeElement;
  return isHTMLElement(focused) ? focused : null;
}
customElements.define("site-preferences", SitePreferences);

// src/auth/github/vault.mjs
var databaseName = "hxape-github-tokens-v1";
var tokenStore = "tokens";
var snapshotStore = "snapshots";
var localMarker = `${databaseName}:backend`;
var localTokens = `${databaseName}:token:`;
var localSnapshots = `${databaseName}:snapshot:`;
function tokenRecord(value) {
  if (value === undefined)
    return;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(ui_strings_default.storage.invalidToken);
  const record = value;
  if (typeof record.id !== "string" || typeof record.storage !== "string" || typeof record.iv !== "string" || typeof record.ciphertext !== "string" || ["salt", "addedAt", "credentialId", "prfSalt"].some((key) => record[key] !== undefined && typeof record[key] !== "string")) {
    throw new Error(ui_strings_default.storage.invalidToken);
  }
  return record;
}
function requiredTokenRecord(value) {
  const record = tokenRecord(value);
  if (!record)
    throw new Error(ui_strings_default.storage.invalidToken);
  return record;
}
function tokenList(values) {
  const records = [];
  let corrupted = false;
  for (const value of values) {
    try {
      records.push(requiredTokenRecord(value));
    } catch {
      corrupted = true;
    }
  }
  return { records, corrupted };
}
function cacheRecord(value) {
  if (value === undefined)
    return;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(ui_strings_default.storage.transactionFailed);
  const record = value;
  if (typeof record.key !== "string" || typeof record.tokenId !== "string" || typeof record.repo !== "string" || ["iv", "ciphertext"].some((key) => record[key] !== undefined && typeof record[key] !== "string") || record.epoch !== undefined && typeof record.epoch !== "number" || record.revoked !== undefined && typeof record.revoked !== "boolean")
    throw new Error(ui_strings_default.storage.transactionFailed);
  return record;
}
function priorEpoch(value) {
  if (!value || typeof value !== "object" || !("epoch" in value))
    return 0;
  const epoch = value.epoch;
  return typeof epoch === "number" && Number.isSafeInteger(epoch) && epoch >= 0 && epoch < Number.MAX_SAFE_INTEGER ? epoch : 0;
}
function vaultStorageAvailable() {
  try {
    return Boolean(globalThis.indexedDB || globalThis.localStorage);
  } catch {
    return false;
  }
}
function fallbackStorage() {
  if (globalThis.indexedDB) {
    try {
      const storage = globalThis.localStorage;
      return storage?.getItem(localMarker) === "localStorage" ? storage : null;
    } catch {
      return null;
    }
  }
  const storage = globalThis.localStorage;
  if (!storage)
    throw new Error(ui_strings_default.storage.unavailable);
  storage.setItem(localMarker, "localStorage");
  return storage;
}
function localRead(storage, key) {
  const value = storage.getItem(key);
  return value === null ? undefined : JSON.parse(value);
}
function localStored(storage, mode, record) {
  if (mode === "all") {
    const records = [];
    let corrupted = false;
    for (let index = 0;index < storage.length; index++) {
      const key = storage.key(index);
      if (!key?.startsWith(localTokens))
        continue;
      const raw = storage.getItem(key);
      try {
        records.push(requiredTokenRecord(raw === null ? undefined : JSON.parse(raw)));
      } catch {
        corrupted = true;
      }
    }
    return { records, corrupted };
  }
  if (mode === "read")
    return tokenRecord(localRead(storage, localTokens + String(record)));
  if (mode === "put") {
    if (!record || typeof record !== "object")
      throw new Error(ui_strings_default.storage.invalidToken);
    storage.setItem(localTokens + record.id, JSON.stringify(record));
  } else
    storage.removeItem(localTokens + String(record));
  return true;
}
function localCached(storage, mode, key, record) {
  const cacheKey = localSnapshots + key;
  if (mode === "read")
    return cacheRecord(localRead(storage, cacheKey));
  if (mode === "put") {
    if (!record)
      throw new Error(ui_strings_default.storage.tokenChanged);
    if (!storage.getItem(localTokens + record.tokenId))
      throw new Error(ui_strings_default.storage.tokenChanged);
    const previous = cacheRecord(localRead(storage, cacheKey));
    const expected = record.expectedEpoch || 0;
    if ((previous?.epoch || 0) !== expected) {
      throw Object.assign(new Error(ui_strings_default.storage.snapshotChanged), { code: "cache-conflict" });
    }
    const { expectedEpoch, ...saved } = record;
    storage.setItem(cacheKey, JSON.stringify({ ...saved, epoch: expected + 1 }));
  } else if (mode === "remove") {
    const [tokenId, ...repo] = key.split(":");
    const raw = storage.getItem(cacheKey);
    let previous;
    try {
      previous = raw === null ? undefined : JSON.parse(raw);
    } catch {
      previous = undefined;
    }
    storage.setItem(cacheKey, JSON.stringify({ key, tokenId, repo: repo.join(":"), revoked: true, epoch: priorEpoch(previous) + 1 }));
  } else {
    const keys = [];
    for (let index = 0;index < storage.length; index++) {
      const item = storage.key(index);
      if (item?.startsWith(`${localSnapshots}${key}:`))
        keys.push(item);
    }
    for (const item of keys)
      storage.removeItem(item);
    storage.removeItem(localTokens + key);
  }
  return true;
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(tokenStore)) {
        request.result.createObjectStore(tokenStore, { keyPath: "id" });
      }
      if (!request.result.objectStoreNames.contains(snapshotStore)) {
        request.result.createObjectStore(snapshotStore, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      if (blocked)
        request.result.close();
      else
        resolve(request.result);
    };
    request.onerror = () => reject(request.error || new Error(ui_strings_default.storage.indexedDbOpenFailed));
    request.onblocked = () => {
      blocked = true;
      reject(new Error(ui_strings_default.storage.blocked));
    };
  });
}
async function stored(mode, record) {
  const fallback = fallbackStorage();
  if (fallback)
    return localStored(fallback, mode, record);
  const database = await openDatabase();
  try {
    const result = new Promise((resolve, reject) => {
      const transaction = database.transaction(tokenStore, mode === "read" || mode === "all" ? "readonly" : "readwrite");
      const store = transaction.objectStore(tokenStore);
      if (mode !== "all" && (mode === "put" ? !record || typeof record !== "object" : typeof record !== "string")) {
        throw new Error(ui_strings_default.storage.invalidToken);
      }
      const request = mode === "all" ? store.getAll() : mode === "read" ? store.get(record) : mode === "put" ? store.put(record) : store.delete(record);
      request.onsuccess = () => {
        if (mode === "all") {
          try {
            if (!Array.isArray(request.result))
              throw new Error(ui_strings_default.storage.invalidToken);
            resolve(tokenList(request.result));
          } catch (error) {
            reject(error);
          }
        } else if (mode === "read") {
          try {
            resolve(tokenRecord(request.result));
          } catch (error) {
            reject(error);
          }
        }
      };
      transaction.oncomplete = () => {
        if (mode === "put" || mode === "delete")
          resolve(true);
      };
      transaction.onerror = () => reject(transaction.error || request.error || new Error(ui_strings_default.storage.transactionFailed));
      transaction.onabort = () => reject(transaction.error || new Error(ui_strings_default.storage.interrupted));
    });
    return await result;
  } finally {
    database.close();
  }
}
async function cached(mode, key, record) {
  const fallback = fallbackStorage();
  if (fallback)
    return localCached(fallback, mode, key, record);
  const database = await openDatabase();
  try {
    const result = new Promise((resolve, reject) => {
      const transaction = database.transaction([tokenStore, snapshotStore], mode === "read" ? "readonly" : "readwrite");
      const store = transaction.objectStore(snapshotStore);
      let conflict = false;
      if (mode === "read") {
        const request = store.get(key);
        request.onsuccess = () => {
          try {
            resolve(cacheRecord(request.result));
          } catch (error) {
            reject(error);
          }
        };
      } else if (mode === "put") {
        if (!record)
          throw new Error(ui_strings_default.storage.tokenChanged);
        const token = transaction.objectStore(tokenStore).get(record.tokenId);
        const previous = store.get(key);
        let completed = 0;
        const put = () => {
          if (++completed !== 2)
            return;
          if (!token.result) {
            transaction.abort();
            return;
          }
          const expected = record.expectedEpoch || 0;
          let previousRecord;
          try {
            previousRecord = cacheRecord(previous.result);
          } catch (error) {
            transaction.abort();
            reject(error);
            return;
          }
          if ((previousRecord?.epoch || 0) !== expected) {
            conflict = true;
            transaction.abort();
            return;
          }
          const { expectedEpoch, ...saved } = record;
          store.put({ ...saved, epoch: expected + 1 });
        };
        token.onsuccess = put;
        previous.onsuccess = put;
      } else if (mode === "remove") {
        const [tokenId, ...repo] = key.split(":");
        const previous = store.get(key);
        previous.onsuccess = () => {
          try {
            store.put({ key, tokenId, repo: repo.join(":"), revoked: true, epoch: priorEpoch(previous.result) + 1 });
          } catch (error) {
            transaction.abort();
            reject(error);
          }
        };
      } else {
        const request = store.getAll();
        request.onsuccess = () => {
          for (const item of request.result) {
            if (typeof item?.key === "string" && item.key.startsWith(`${key}:`))
              store.delete(item.key);
          }
          transaction.objectStore(tokenStore).delete(key);
        };
      }
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(conflict ? Object.assign(new Error(ui_strings_default.storage.snapshotChanged), { code: "cache-conflict" }) : transaction.error || new Error(ui_strings_default.storage.tokenChanged));
    });
    return await result;
  } finally {
    database.close();
  }
}

// src/auth/github/access.mjs
var encoder = new TextEncoder;
function repositoryName2(name) {
  if (typeof name !== "string" || !/^[a-z\d][a-z\d._-]{0,99}$/i.test(name) || name === "." || name === "..") {
    throw new Error(ui_strings_default.access.invalidRepository);
  }
  return name;
}
function branchName(name) {
  if (typeof name !== "string" || !/^[a-z\d][a-z\d._/-]{0,99}$/i.test(name) || name.includes("..") || name.includes("//") || name.endsWith("/") || name.endsWith(".") || name.split("/").some((part) => part.startsWith(".") || part.endsWith(".lock"))) {
    throw new Error(ui_strings_default.access.invalidBranch);
  }
  return name;
}
function cacheIdentity(id, repo, branch) {
  return branch === "main" ? `${id}:${repo}` : `${id}:${repo}:${branch}`;
}
function githubFailure(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return {};
  return {
    code: "code" in value && typeof value.code === "string" ? value.code : undefined,
    status: "status" in value && typeof value.status === "number" && Number.isInteger(value.status) && value.status >= 0 && value.status <= 599 ? value.status : undefined,
    denied: "denied" in value && value.denied === true,
    rateLimited: "rateLimited" in value && value.rateLimited === true,
    detail: "detail" in value && typeof value.detail === "string" ? value.detail.slice(0, 200) : undefined
  };
}
function validateSnapshot(repo, data) {
  if (!data || typeof data !== "object" || !("repository" in data) || data.repository !== repo || !("namespace" in data) || data.namespace !== "Hxape" || !("url" in data) || data.url !== `https://github.com/Hxape/${repo}` || !("level" in data) || data.level !== 3 || !("root" in data) || typeof data.root !== "string" || !("children" in data) || !Array.isArray(data.children)) {
    throw new Error(ui_strings_default.access.invalidSnapshot);
  }
  return data;
}
function cachedPayload(value) {
  const branch = value && typeof value === "object" && "branch" in value ? value.branch : undefined;
  if (!value || typeof value !== "object" || !("data" in value) || !("hash" in value) || typeof value.hash !== "string" || branch !== undefined && typeof branch !== "string") {
    throw new Error(ui_strings_default.access.invalidSavedHash);
  }
  return { data: value.data, hash: value.hash, branch };
}
function documentPaths(snapshot) {
  const paths = new Set;
  const add = (documents) => {
    if (!documents || typeof documents !== "object")
      return;
    for (const document2 of Object.values(documents)) {
      const path = document2 && typeof document2 === "object" && "path" in document2 ? document2.path : null;
      if (typeof path === "string" && path && !path.split("/").some((part) => !part || part === "." || part === ".."))
        paths.add(path);
    }
  };
  const visit = (nodes) => {
    if (!Array.isArray(nodes))
      return;
    for (const node of nodes) {
      if (!node || typeof node !== "object")
        continue;
      add("documents" in node ? node.documents : undefined);
      visit("children" in node && Array.isArray(node.children) ? node.children : []);
    }
  };
  add(snapshot.documents);
  visit(snapshot.children);
  return paths;
}
function sourcePaths(snapshot) {
  const paths = new Set;
  const root = snapshot.root;
  const safe = (path) => typeof path === "string" && path.length > 0 && !path.split("/").some((part) => !part || part === "." || part === ".." || part.includes("\\"));
  if (!safe(root))
    return paths;
  const visit = (nodes) => {
    if (!Array.isArray(nodes))
      return;
    for (const node of nodes) {
      if (!node || typeof node !== "object" || !("type" in node))
        continue;
      if (node.type === "file" && "path" in node && safe(node.path) && node.path.endsWith(".hx")) {
        paths.add(`${root}/${node.path}`);
      }
      if (node.type === "directory" && "children" in node && Array.isArray(node.children))
        visit(node.children);
    }
  };
  visit(snapshot.children);
  return paths;
}
async function digest(text) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
  return [...hash].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

class GithubAccess extends EventTarget {
  #tokens = new Map;
  #activeId = null;
  #revision = 0;
  #activationIntent = 0;
  #snapshots = new Map;
  #refreshing = new Map;
  #blocked = new Set;
  #removed = new Set;
  #repoRevisions = new Map;
  #freshness = new Map;
  #failures = new Map;
  #sourceCache = new TextCache(source_limits_default.privateCache);
  #statusChecking = false;
  #restorePending = null;
  #api = new GithubSessionClient;
  #channel = null;
  constructor() {
    super();
    this.#api.addEventListener("lost", () => this.#lostSession());
    this.#api.addEventListener("state-change", () => this.dispatchEvent(new Event("worker-state")));
    if ("BroadcastChannel" in window) {
      this.#channel = new BroadcastChannel("hxape-github-tokens-v1");
      this.#channel.addEventListener("message", (event) => {
        const value = event.data;
        if (!value || typeof value !== "object" || Array.isArray(value))
          return;
        const message = value;
        const { type, id, repo } = message;
        if (typeof id !== "string")
          return;
        if (type === "removed") {
          this.#forgetToken(id);
          this.#api.remove(id).catch(() => {});
          return;
        }
        if (id !== this.#activeId || typeof repo !== "string" || typeof type !== "string" || !["snapshot-revoked", "snapshot-updated"].includes(type))
          return;
        this.#repoRevisions.set(repo, (this.#repoRevisions.get(repo) || 0) + 1);
        this.#snapshots.delete(repo);
        if (type === "snapshot-revoked") {
          this.#blocked.add(repo);
          this.#failures.set(repo, ui_strings_default.access.changedInOtherTab);
          this.#notify(repo, "revoked");
        } else if (type === "snapshot-updated") {
          this.#blocked.delete(repo);
          this.#failures.delete(repo);
          this.#notify(repo, "updated");
        }
      });
    }
    const checkStorage = () => {
      if (this.#statusChecking)
        return;
      this.#statusChecking = true;
      this.status().catch(() => {}).finally(() => {
        this.#statusChecking = false;
      });
    };
    window.addEventListener("pageshow", checkStorage);
    window.addEventListener("focus", checkStorage);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden)
        checkStorage();
    });
    this.#retireServiceWorker();
  }
  get active() {
    return Boolean(this.#activeId);
  }
  get compatible() {
    return Boolean(globalThis.crypto?.subtle && vaultStorageAvailable() && this.#api.compatible && this.#api.state !== "unavailable");
  }
  get workerStatus() {
    return this.#api.status;
  }
  get hadWorkerSession() {
    return Boolean(this.#api.handle || this.#api.hadDedicatedSession);
  }
  restartWorker() {
    return this.#api.restart();
  }
  confirmed(repo) {
    const snapshot = this.#snapshots.get(repo);
    return Boolean(this.#activeId && snapshot?.tokenId === this.#activeId && snapshot.confirmed && !snapshot.stale && !this.#blocked.has(repo));
  }
  snapshotRevision(repo, branch, { allowCached = false } = {}) {
    const snapshot = this.#snapshots.get(repo);
    const current = this.#activeId && snapshot?.tokenId === this.#activeId && !this.#blocked.has(repo);
    return current && snapshot?.branch === branch && (allowCached || this.confirmed(repo)) ? JSON.stringify([this.#revision, this.#repoRevisions.get(repo) || 0, branch, snapshot.hash]) : null;
  }
  freshness(repo) {
    return this.#freshness.get(repo) || "current";
  }
  failure(repo) {
    return this.#failures.get(repo) || null;
  }
  async#retireServiceWorker() {
    if (!("serviceWorker" in navigator))
      return;
    try {
      const scope = new URL("./", document.baseURI);
      const script = new URL("github-auth-sw.js", scope).href;
      const registration = await navigator.serviceWorker.getRegistration(scope);
      if (registration && [registration.active, registration.waiting, registration.installing].some((worker) => worker?.scriptURL === script)) {
        await registration.unregister();
      }
    } catch {}
  }
  #invalidate() {
    ++this.#revision;
    this.#api.cancelAll();
    this.#sourceCache.clear();
    this.#snapshots.clear();
    this.#refreshing.clear();
    this.#blocked.clear();
    this.#repoRevisions.clear();
    this.#freshness.clear();
    this.#failures.clear();
  }
  #lostSession() {
    if (!this.#activeId && !this.#tokens.size)
      return;
    const hadActive = Boolean(this.#activeId);
    ++this.#activationIntent;
    this.#invalidate();
    this.#activeId = null;
    this.#tokens.clear();
    this.dispatchEvent(new Event("change"));
    this.dispatchEvent(new Event("list-change"));
    if (hadActive)
      this.dispatchEvent(new Event("lost"));
  }
  #forgetToken(id) {
    this.#removed.add(id);
    if (!this.#tokens.has(id)) {
      this.dispatchEvent(new Event("list-change"));
      return;
    }
    if (this.#activeId === id) {
      this.#invalidate();
      this.#activeId = null;
      this.#tokens.delete(id);
      this.dispatchEvent(new Event("change"));
    } else {
      this.#tokens.delete(id);
      this.dispatchEvent(new Event("list-change"));
    }
  }
  async#assertStored(id, revision, intent) {
    const record = await stored("read", id);
    if (revision !== this.#revision || this.#activeId !== id || intent !== undefined && intent !== this.#activationIntent)
      throw new Error(ui_strings_default.access.accessChanged);
    if (!record || this.#removed.has(id) || record.ciphertext !== this.#tokens.get(id)?.ciphertext) {
      this.#forgetToken(id);
      this.#api.remove(id).catch(() => {});
      throw new Error(record ? ui_strings_default.storage.tokenChanged : ui_strings_default.access.tokenRemoved);
    }
    return record;
  }
  async status() {
    const revision = this.#revision;
    let records = [];
    let storageError = false;
    let storageReason = "";
    let corrupted = false;
    try {
      const list = await stored("all");
      records = list.records;
      corrupted = list.corrupted;
    } catch (error) {
      storageError = true;
      storageReason = error instanceof Error ? `${error.name}${error.message ? `: ${error.message}` : " (no details from browser)"}` : String(error);
    }
    if (revision !== this.#revision)
      return this.status();
    if (!storageError) {
      for (const [id, entry] of this.#tokens) {
        if (records.some((record) => record.id === id && record.ciphertext === entry.ciphertext))
          continue;
        this.#forgetToken(id);
        this.#api.remove(id).catch(() => {});
      }
    }
    if (revision !== this.#revision)
      return this.status();
    const entries = new Map(records.filter((record) => !this.#removed.has(record.id)).map((record) => [record.id, {
      id: record.id,
      storage: record.storage,
      credentialId: record.credentialId,
      prfSalt: record.prfSalt,
      addedAt: record.addedAt,
      saved: true,
      unlocked: false
    }]));
    for (const entry of this.#tokens.values()) {
      entries.set(entry.id, {
        id: entry.id,
        label: entry.label,
        login: entry.login,
        storage: entry.storage,
        credentialId: entry.credentialId,
        prfSalt: entry.prfSalt,
        addedAt: entry.addedAt,
        saved: true,
        unlocked: true
      });
    }
    return { entries: [...entries.values()], activeId: this.#activeId, storageError, storageReason, corrupted };
  }
  restoreSession() {
    if (this.#restorePending)
      return this.#restorePending;
    this.#restorePending = this.#restoreSession().finally(() => {
      this.#restorePending = null;
    });
    return this.#restorePending;
  }
  async#restoreSession() {
    if (!this.#api.handle)
      return false;
    const revision = this.#revision;
    const intent = this.#activationIntent;
    let candidate;
    try {
      candidate = await this.#api.resume();
    } catch {
      return false;
    }
    if (!candidate)
      return false;
    if (revision !== this.#revision || intent !== this.#activationIntent || this.#activeId) {
      await this.#api.abandonResume().catch(() => {});
      return false;
    }
    const { entry, ciphertext } = candidate;
    if (typeof entry?.id !== "string" || typeof ciphertext !== "string") {
      await this.#api.abandonResume().catch(() => {});
      return false;
    }
    const record = await stored("read", entry.id).catch(() => null);
    if (!record || record.ciphertext !== ciphertext || this.#removed.has(entry.id)) {
      await this.#api.abandonResume().catch(() => {});
      return false;
    }
    if (revision !== this.#revision || intent !== this.#activationIntent || this.#activeId) {
      await this.#api.abandonResume().catch(() => {});
      return false;
    }
    let confirmed = false;
    try {
      const restored = await this.#api.resumeConfirm(entry.id, ciphertext);
      confirmed = true;
      const checked = await stored("read", entry.id);
      if (revision !== this.#revision || intent !== this.#activationIntent || this.#activeId || !checked || checked.ciphertext !== ciphertext || restored?.id !== entry.id) {
        await this.#api.lock(entry.id).catch(() => {});
        return false;
      }
      this.#invalidate();
      this.#tokens.set(entry.id, { ...restored, ciphertext });
      this.#activeId = entry.id;
      this.dispatchEvent(new Event("change"));
      return true;
    } catch {
      if (confirmed)
        await this.#api.lock(entry.id).catch(() => {});
      else
        await this.#api.abandonResume().catch(() => {});
      return false;
    }
  }
  async add(label, token, storage, password, passkey = null) {
    const intent = ++this.#activationIntent;
    if (this.#restorePending)
      await this.#restorePending;
    label = String(label || "").trim().slice(0, 40);
    token = String(token || "").trim();
    if (!label || !token || !["encrypted", "passkey"].includes(storage) || storage === "encrypted" && password.length < 12 || storage === "passkey" && (!passkey?.credentialId || !passkey?.prfSalt || passkey.material?.byteLength !== 32)) {
      throw new Error(ui_strings_default.access.invalidTokenDetails);
    }
    const revision = this.#revision;
    const entry = {
      id: crypto.randomUUID(),
      label,
      storage,
      addedAt: new Date().toISOString(),
      credentialId: passkey?.credentialId,
      prfSalt: passkey?.prfSalt
    };
    let stageId = null;
    let activated = false;
    let committed = false;
    try {
      const stage = this.#api.stageAdd(entry, token, password, passkey?.material || null);
      token = "";
      password = "";
      const staged = await stage;
      stageId = staged?.stageId;
      if (revision !== this.#revision || intent !== this.#activationIntent || !stageId || staged.record?.id !== entry.id || staged.entry?.id !== entry.id || typeof staged.record.ciphertext !== "string")
        throw new Error(ui_strings_default.access.setupChanged);
      await stored("put", staged.record);
      const saved = await stored("read", entry.id);
      if (revision !== this.#revision || intent !== this.#activationIntent || !saved || saved.ciphertext !== staged.record.ciphertext)
        throw new Error(ui_strings_default.access.setupChanged);
      const active = await this.#api.activate(stageId, saved.ciphertext);
      stageId = null;
      activated = true;
      const checked = await stored("read", entry.id);
      if (revision !== this.#revision || intent !== this.#activationIntent || !checked || checked.ciphertext !== saved.ciphertext || active?.id !== entry.id) {
        throw new Error(ui_strings_default.access.setupChanged);
      }
      this.#invalidate();
      this.#tokens.set(entry.id, { ...active, ciphertext: saved.ciphertext });
      this.#activeId = entry.id;
      committed = true;
      this.dispatchEvent(new Event("change"));
      return this.status();
    } catch (error) {
      if (activated && !committed)
        await this.#api.lock(entry.id).catch(() => {});
      throw error;
    } finally {
      token = "";
      if (stageId)
        this.#api.discard(stageId);
    }
  }
  async unlock(id, password, material = null) {
    const intent = ++this.#activationIntent;
    if (this.#restorePending)
      await this.#restorePending;
    const revision = this.#revision;
    const record = await stored("read", id);
    if (!record || this.#removed.has(id))
      throw new Error(ui_strings_default.access.savedTokenMissing);
    let stageId = null;
    let activated = false;
    let committed = false;
    try {
      let staged;
      try {
        const stage = this.#api.stageUnlock(record, password, material);
        password = "";
        staged = await stage;
      } catch (error) {
        if (error?.code === "unlock-failed")
          throw new Error(ui_strings_default.access.unlockFailed);
        throw error;
      }
      stageId = staged?.stageId;
      const stillStored = await stored("read", id);
      if (revision !== this.#revision || intent !== this.#activationIntent || this.#removed.has(id) || !stageId || staged.entry?.id !== id || !stillStored || stillStored.ciphertext !== record.ciphertext) {
        throw new Error(ui_strings_default.access.unlockChanged);
      }
      const active = await this.#api.activate(stageId, record.ciphertext);
      stageId = null;
      activated = true;
      const checked = await stored("read", id);
      if (revision !== this.#revision || intent !== this.#activationIntent || this.#removed.has(id) || !checked || checked.ciphertext !== record.ciphertext || active?.id !== id) {
        throw new Error(ui_strings_default.access.unlockChanged);
      }
      this.#invalidate();
      this.#tokens.set(id, { ...active, ciphertext: record.ciphertext });
      this.#activeId = id;
      committed = true;
      this.dispatchEvent(new Event("change"));
      return this.status();
    } catch (error) {
      if (activated && !committed)
        await this.#api.lock(id).catch(() => {});
      throw error;
    } finally {
      if (stageId)
        this.#api.discard(stageId);
    }
  }
  async select(id) {
    const intent = ++this.#activationIntent;
    if (this.#restorePending)
      await this.#restorePending;
    const revision = this.#revision;
    const entry = this.#tokens.get(id);
    if (!entry)
      throw new Error(ui_strings_default.access.unlockFirst);
    const record = await stored("read", id);
    if (intent !== this.#activationIntent || revision !== this.#revision)
      throw new Error(ui_strings_default.access.selectionChanged);
    if (!record || this.#removed.has(id) || record.ciphertext !== entry.ciphertext) {
      this.#forgetToken(id);
      this.#api.remove(id).catch(() => {});
      throw new Error(ui_strings_default.access.tokenRemoved);
    }
    if (!this.#tokens.has(id))
      throw new Error(ui_strings_default.access.noLongerUnlocked);
    if (this.#activeId !== id) {
      let selected = false;
      try {
        const result = await this.#api.select(id, record.ciphertext);
        selected = true;
        const checked = await stored("read", id);
        if (intent !== this.#activationIntent || revision !== this.#revision || result?.id !== id || !checked || checked.ciphertext !== record.ciphertext)
          throw new Error(ui_strings_default.access.selectionChanged);
        this.#invalidate();
        this.#activeId = id;
        this.dispatchEvent(new Event("change"));
      } catch (error) {
        if (selected) {
          await this.#api.lock(id).catch(() => {});
          this.#lostSession();
        }
        throw error;
      }
    }
    return this.status();
  }
  async lock(id) {
    if (this.#activeId !== id || !this.#tokens.has(id))
      throw new Error(ui_strings_default.access.noLongerUnlocked);
    ++this.#activationIntent;
    this.#invalidate();
    this.#activeId = null;
    this.#tokens.delete(id);
    this.dispatchEvent(new Event("change"));
    this.dispatchEvent(new Event("list-change"));
    await this.#api.lock(id);
    return this.status();
  }
  async remove(id) {
    this.#forgetToken(id);
    this.#channel?.postMessage({ type: "removed", id });
    const purged = this.#api.remove(id).catch(() => {});
    try {
      await cached("delete", id);
    } catch {
      throw new Error(ui_strings_default.access.removeFailed);
    }
    await purged;
    return this.status();
  }
  #notify(repo, state) {
    if (["updated", "revoked", "missing", "stale"].includes(state))
      this.#sourceCache.clear();
    this.#freshness.set(repo, state);
    this.dispatchEvent(new CustomEvent("snapshot-state", { detail: { repo, state } }));
  }
  #requestScopeCurrent(repo, scope) {
    return scope.tokenId === this.#activeId && scope.revision === this.#revision && scope.activationIntent === this.#activationIntent && scope.repoRevision === (this.#repoRevisions.get(repo) || 0) && scope.snapshot === (this.#snapshots.get(repo) || null);
  }
  async#revokeRepository(repo, branch, scope, reason, state = "revoked") {
    if (!this.#requestScopeCurrent(repo, scope))
      return false;
    const repoRevision = scope.repoRevision + 1;
    this.#repoRevisions.set(repo, repoRevision);
    this.#blocked.add(repo);
    this.#snapshots.delete(repo);
    this.#failures.set(repo, reason);
    const removal = cached("remove", cacheIdentity(scope.tokenId, repo, branch));
    try {
      this.#channel?.postMessage({ type: "snapshot-revoked", id: scope.tokenId, repo });
    } catch {}
    this.#notify(repo, state);
    try {
      await removal;
    } catch {
      if (this.#requestScopeCurrent(repo, { ...scope, repoRevision, snapshot: null }) && this.#blocked.has(repo)) {
        this.#notify(repo, "cache-error");
      }
    }
    return true;
  }
  async#readContent(repo, path, branch, kind, scope, signal) {
    if (!this.#requestScopeCurrent(repo, scope))
      throw new Error(ui_strings_default.access.accessChanged);
    try {
      return await this.#api.content(repo, path, branch, kind, signal);
    } catch (cause) {
      const failure = githubFailure(cause);
      if (failure.status !== 404 && !failure.rateLimited && (failure.status === 401 || failure.code === "token-rejected" || failure.denied)) {
        await this.#revokeRepository(repo, branch, scope, cause instanceof Error ? cause.message : ui_strings_default.access.privateRequestFailed);
      }
      throw cause;
    }
  }
  async#check(repo, branch, previous) {
    const requestKey = `${repo}:${branch}`;
    const current = this.#refreshing.get(requestKey);
    if (current) {
      try {
        return await current;
      } catch (error) {
        if (error?.code !== "repo-changed")
          throw error;
        if (this.#refreshing.get(requestKey) === current)
          this.#refreshing.delete(requestKey);
        previous = this.#blocked.has(repo) ? null : await this.#readCached(repo, branch);
      }
    }
    const pending = this.#refreshSnapshot(repo, branch, previous);
    this.#refreshing.set(requestKey, pending);
    const clear = () => {
      if (this.#refreshing.get(requestKey) === pending)
        this.#refreshing.delete(requestKey);
    };
    pending.then(clear, clear);
    return pending;
  }
  async#readCached(repo, branch) {
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    if (!id)
      return null;
    const active = id ? this.#tokens.get(id) : null;
    const current = this.#snapshots.get(repo);
    if (current?.tokenId === id && current.branch === branch)
      return current;
    if (!active)
      return null;
    const key = cacheIdentity(id, repo, branch);
    let record;
    try {
      record = await cached("read", key);
    } catch {
      return null;
    }
    if (!record || record.tokenId !== id || record.revoked)
      return null;
    try {
      const saved = cachedPayload(await this.#api.unsealSnapshot(key, record));
      if ((saved.branch || "main") !== branch)
        return null;
      const data = validateSnapshot(repo, saved.data);
      delete data.ref;
      if (!/^[0-9a-f]{64}$/.test(saved.hash))
        throw new Error(ui_strings_default.access.invalidSavedHash);
      await this.#assertStored(id, revision, intent);
      const entry = {
        tokenId: id,
        branch,
        data,
        hash: saved.hash,
        paths: documentPaths(data),
        sourcePaths: sourcePaths(data),
        confirmed: false
      };
      this.#snapshots.set(repo, entry);
      return entry;
    } catch {
      return null;
    }
  }
  async#saveCached(repo, entry, expectedEpoch) {
    const id = this.#activeId;
    const active = id ? this.#tokens.get(id) : null;
    if (!id || !active)
      return;
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const key = cacheIdentity(active.id, repo, entry.branch);
    const sealed = await this.#api.sealSnapshot(key, { data: entry.data, hash: entry.hash, branch: entry.branch });
    await this.#assertStored(id, revision, intent);
    await cached("put", key, { key, tokenId: active.id, repo, ...sealed, expectedEpoch });
  }
  async#refreshSnapshot(repo, branch, previous) {
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    if (!id)
      throw new Error("Unlock a token first.");
    const repoRevision = this.#repoRevisions.get(repo) || 0;
    const initialSnapshot = this.#snapshots.get(repo) || null;
    const key = cacheIdentity(id, repo, branch);
    const checkRepo = () => {
      if (repoRevision !== (this.#repoRevisions.get(repo) || 0)) {
        throw Object.assign(new Error(ui_strings_default.access.privateChanged), { code: "repo-changed" });
      }
    };
    let phase = "repository";
    let remoteHash = null;
    let downloaded = null;
    try {
      if (previous)
        previous.confirmed = false;
      await this.#assertStored(id, revision, intent);
      const initialCache = await cached("read", key).catch(() => null);
      const expectedEpoch = initialCache?.epoch || 0;
      checkRepo();
      const metadata = await this.#api.repository(repo);
      await this.#assertStored(id, revision, intent);
      checkRepo();
      if (typeof metadata.default_branch !== "string" || !metadata.default_branch) {
        throw new Error(ui_strings_default.access.defaultBranchMissing);
      }
      phase = "commit";
      await this.#assertStored(id, revision, intent);
      const commit = await this.#api.commit(repo, branch);
      await this.#assertStored(id, revision, intent);
      checkRepo();
      if (!/^[0-9a-f]{40}$/i.test(commit.sha))
        throw new Error(ui_strings_default.access.invalidCommit);
      phase = "checksum";
      await this.#assertStored(id, revision, intent);
      const hash = (await this.#api.content(repo, ".private/site.sha256", commit.sha, "checksum")).trim().toLowerCase();
      await this.#assertStored(id, revision, intent);
      checkRepo();
      if (!/^[0-9a-f]{64}$/.test(hash))
        throw new Error(ui_strings_default.access.invalidPrivateHash);
      remoteHash = hash;
      await this.#assertStored(id, revision, intent);
      if (previous && previous.hash === hash) {
        const latestCache = await cached("read", key).catch(() => null);
        if (latestCache && (latestCache.epoch || 0) !== expectedEpoch) {
          throw Object.assign(new Error(ui_strings_default.access.snapshotChanged), { code: "cache-conflict" });
        }
        checkRepo();
        previous.confirmed = true;
        previous.stale = false;
        this.#blocked.delete(repo);
        this.#failures.delete(repo);
        this.#notify(repo, "fresh");
        return previous;
      }
      phase = "snapshot";
      const raw = await this.#api.content(repo, ".private/site.json", commit.sha, "snapshot");
      await this.#assertStored(id, revision, intent);
      checkRepo();
      if (await digest(raw) !== hash)
        throw new Error(ui_strings_default.access.snapshotHashMismatch);
      const data = validateSnapshot(repo, JSON.parse(raw));
      delete data.ref;
      await this.#assertStored(id, revision, intent);
      const entry = {
        tokenId: id,
        branch,
        data,
        hash,
        paths: documentPaths(data),
        sourcePaths: sourcePaths(data),
        confirmed: true
      };
      downloaded = entry;
      let cacheError = false;
      try {
        await this.#saveCached(repo, entry, expectedEpoch);
      } catch (error) {
        if (error?.code === "cache-conflict")
          throw error;
        cacheError = true;
      }
      await this.#assertStored(id, revision, intent);
      checkRepo();
      this.#sourceCache.clear();
      this.#snapshots.set(repo, entry);
      this.#blocked.delete(repo);
      this.#failures.delete(repo);
      entry.cacheError = cacheError;
      if (previous)
        this.#notify(repo, "updated");
      if (cacheError)
        this.#notify(repo, "cache-error");
      else
        this.#channel?.postMessage({ type: "snapshot-updated", id, repo });
      return entry;
    } catch (cause) {
      const failure = githubFailure(cause);
      if (failure?.code === "repo-changed" || repoRevision !== (this.#repoRevisions.get(repo) || 0))
        throw cause;
      if (failure?.code === "cache-conflict") {
        const record = await cached("read", key).catch(() => null);
        this.#snapshots.delete(repo);
        if (record?.revoked) {
          this.#blocked.add(repo);
          this.#failures.set(repo, ui_strings_default.access.changedInOtherTab);
          this.#notify(repo, "revoked");
          throw cause;
        }
        const latest = await this.#readCached(repo, branch);
        if (latest) {
          latest.stale = latest.hash !== remoteHash;
          this.#blocked.delete(repo);
          this.#notify(repo, latest.stale ? "stale" : "updated");
          return latest;
        }
        const fallback = downloaded || previous;
        if (fallback) {
          fallback.stale = true;
          fallback.confirmed = false;
          this.#snapshots.set(repo, fallback);
          this.#notify(repo, "stale");
          return fallback;
        }
        throw cause;
      }
      const status = failure?.status || 0;
      let message = cause instanceof Error ? cause.message : ui_strings_default.access.privateRequestFailed;
      let code = "request-failed";
      if (status === 404 && phase === "checksum") {
        message = ui_strings_default.access.checksumMissing;
        code = "snapshot-missing";
      } else if (status === 404 && phase === "snapshot") {
        message = ui_strings_default.access.snapshotMissing;
        code = "snapshot-missing";
      } else if (status === 404 && phase === "repository") {
        message = formatText(ui_strings_default.access.repositoryUnavailable, { repo });
        code = "repository-unavailable";
      } else if (status === 404 && phase === "commit") {
        message = formatText(ui_strings_default.access.branchUnavailable, { branch });
        code = "branch-unavailable";
      } else if (status === 409 && phase === "commit") {
        message = /git repository is empty/i.test(failure?.detail || "") ? formatText(ui_strings_default.access.emptyRepository, { repo, branch }) : formatText(ui_strings_default.access.branchConflict, { repo, branch });
        code = "branch-unavailable";
      }
      const error = Object.assign(new Error(message), { status, code, denied: failure?.denied });
      const scope = { tokenId: id, revision, activationIntent: intent, repoRevision, snapshot: initialSnapshot };
      if (this.#requestScopeCurrent(repo, scope)) {
        this.#failures.set(repo, message);
        if ([401, 404].includes(status) || failure?.denied && !failure.rateLimited) {
          await this.#revokeRepository(repo, branch, scope, message, code === "snapshot-missing" ? "missing" : "revoked");
        } else if (previous)
          this.#notify(repo, "stale");
      }
      throw error;
    }
  }
  async snapshot(repo, cachedOnly = false, branch = "main") {
    repo = repositoryName2(repo);
    branch = branchName(branch);
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    if (!id)
      throw new Error("Unlock a token first.");
    await this.#assertStored(id, revision, intent);
    const previous = this.#blocked.has(repo) ? null : await this.#readCached(repo, branch);
    if (revision !== this.#revision || intent !== this.#activationIntent || id !== this.#activeId) {
      throw new Error(ui_strings_default.access.accessRevisionChanged);
    }
    if (previous) {
      if (!cachedOnly)
        this.#check(repo, branch, previous).catch(() => {});
      this.#notify(repo, cachedOnly ? previous.stale ? "stale" : previous.cacheError ? "cache-error" : "current" : "checking");
      return previous.data;
    }
    const fresh = await this.#check(repo, branch, null);
    this.#notify(repo, fresh.stale ? "stale" : fresh.cacheError ? "cache-error" : "current");
    return fresh.data;
  }
  async refresh(repo, branch = "main") {
    repo = repositoryName2(repo);
    branch = branchName(branch);
    const id = this.#activeId;
    if (!id)
      throw new Error("Unlock a token first.");
    await this.#assertStored(id, this.#revision, this.#activationIntent);
    const previous = this.#blocked.has(repo) ? null : await this.#readCached(repo, branch);
    let fresh;
    try {
      fresh = await this.#check(repo, branch, previous);
    } catch (error) {
      if (error?.code !== "repo-changed")
        throw error;
      const latest = this.#blocked.has(repo) ? null : await this.#readCached(repo, branch);
      fresh = await this.#check(repo, branch, latest);
    }
    this.#notify(repo, fresh.stale ? "stale" : fresh.cacheError ? "cache-error" : "current");
    return fresh.data;
  }
  async document(repo, path, branch = "main", signal) {
    if (signal?.aborted)
      throw signal.reason ?? new DOMException("Request cancelled.", "AbortError");
    repo = repositoryName2(repo);
    branch = branchName(branch);
    const snapshot = this.#snapshots.get(repo);
    if (!snapshot || snapshot.branch !== branch || !snapshot.paths.has(path)) {
      throw new Error(ui_strings_default.access.loadSnapshotFirst);
    }
    const repoRevision = this.#repoRevisions.get(repo) || 0;
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    if (!id)
      throw new Error("Unlock a token first.");
    await this.#assertStored(id, revision, intent);
    if (signal?.aborted)
      throw signal.reason ?? new DOMException("Request cancelled.", "AbortError");
    if (repoRevision !== (this.#repoRevisions.get(repo) || 0) || this.#blocked.has(repo) || this.#snapshots.get(repo) !== snapshot)
      throw new Error(ui_strings_default.access.accessChanged);
    const text = await this.#readContent(repo, path, branch, "document", { tokenId: id, revision, activationIntent: intent, repoRevision, snapshot }, signal);
    await this.#assertStored(id, revision, intent);
    if (signal?.aborted)
      throw signal.reason ?? new DOMException("Request cancelled.", "AbortError");
    if (repoRevision !== (this.#repoRevisions.get(repo) || 0) || this.#blocked.has(repo) || this.#snapshots.get(repo) !== snapshot)
      throw new Error(ui_strings_default.access.accessChanged);
    return text;
  }
  async sourceFile(repo, path, branch = "main", signal, { refresh = false } = {}) {
    if (signal?.aborted)
      throw signal.reason ?? new DOMException("Request cancelled.", "AbortError");
    repo = repositoryName2(repo);
    branch = branchName(branch);
    const revision = this.#revision;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    const repoRevision = this.#repoRevisions.get(repo) || 0;
    if (!id)
      throw new Error(ui_strings_default.githubRequest.unlockFirst);
    await this.#assertStored(id, revision, intent);
    let snapshot = this.#snapshots.get(repo);
    if (!snapshot || snapshot.branch !== branch || this.#blocked.has(repo)) {
      throw new Error(ui_strings_default.access.loadSnapshotFirst);
    }
    if (!snapshot.confirmed)
      snapshot = await this.#check(repo, branch, snapshot);
    if (signal?.aborted)
      throw signal.reason ?? new DOMException("Request cancelled.", "AbortError");
    if (!snapshot.confirmed || snapshot.stale || !snapshot.sourcePaths.has(path)) {
      throw new Error(ui_strings_default.access.loadSnapshotFirst);
    }
    await this.#assertStored(id, revision, intent);
    if (signal?.aborted)
      throw signal.reason ?? new DOMException("Request cancelled.", "AbortError");
    if (repoRevision !== (this.#repoRevisions.get(repo) || 0) || this.#blocked.has(repo) || this.#snapshots.get(repo) !== snapshot) {
      throw new Error(ui_strings_default.access.accessChanged);
    }
    const key = JSON.stringify([id, repo, branch, snapshot.hash, repoRevision, path]);
    const saved = refresh ? undefined : this.#sourceCache.get(key);
    if (saved !== undefined)
      return saved;
    const text = await this.#readContent(repo, path, branch, "source", { tokenId: id, revision, activationIntent: intent, repoRevision, snapshot }, signal);
    await this.#assertStored(id, revision, intent);
    if (signal?.aborted)
      throw signal.reason ?? new DOMException("Request cancelled.", "AbortError");
    if (repoRevision !== (this.#repoRevisions.get(repo) || 0) || this.#blocked.has(repo) || !snapshot.confirmed || snapshot.stale || this.#snapshots.get(repo) !== snapshot)
      throw new Error(ui_strings_default.access.accessChanged);
    this.#sourceCache.set(key, text);
    return text;
  }
  async linkedDocument(repo, path, branch = "main", signal, { refresh = false } = {}) {
    if (signal?.aborted)
      throw signal.reason ?? new DOMException("Request cancelled.", "AbortError");
    repo = repositoryName2(repo);
    branch = branchName(branch);
    if (!linkedDocumentPath(path))
      throw new Error("Invalid linked document path.");
    const snapshot = this.#snapshots.get(repo);
    if (!snapshot || snapshot.branch !== branch || !this.confirmed(repo))
      throw new Error(ui_strings_default.access.loadSnapshotFirst);
    const revision = this.#revision;
    const repoRevision = this.#repoRevisions.get(repo) || 0;
    const intent = this.#activationIntent;
    const id = this.#activeId;
    if (!id)
      throw new Error(ui_strings_default.githubRequest.unlockFirst);
    const assert = async () => {
      await this.#assertStored(id, revision, intent);
      if (signal?.aborted)
        throw signal.reason ?? new DOMException("Request cancelled.", "AbortError");
      if (repoRevision !== (this.#repoRevisions.get(repo) || 0) || this.#snapshots.get(repo) !== snapshot || !this.confirmed(repo) || snapshot.branch !== branch)
        throw new Error(ui_strings_default.access.accessChanged);
    };
    await assert();
    const key = JSON.stringify(["document", id, repo, branch, snapshot.hash, repoRevision, path]);
    const saved = refresh ? undefined : this.#sourceCache.get(key);
    if (saved !== undefined)
      return saved;
    const text = await this.#readContent(repo, path, branch, "linked-document", { tokenId: id, revision, activationIntent: intent, repoRevision, snapshot }, signal);
    await assert();
    this.#sourceCache.set(key, text);
    return text;
  }
}

// src/common/ui/tooltips.mjs
function createTooltips(owner, active = () => true, shadowRoots = []) {
  const view = displayWindow(owner);
  const events = new view.AbortController;
  const signal = events.signal;
  const desktop = view.matchMedia(interaction_default.tooltip.desktopMedia);
  const popup = owner.createElement("aside");
  popup.id = "ui-tooltip";
  popup.className = "ui-tooltip";
  popup.setAttribute("role", "tooltip");
  popup.setAttribute("popover", "manual");
  popup.hidden = true;
  owner.body.append(popup);
  let target = null;
  let timer = 0;
  let description = "";
  let pinned = false;
  function hide() {
    view.clearTimeout(timer);
    timer = 0;
    if (target) {
      if (description)
        target.setAttribute("aria-describedby", description);
      else
        target.removeAttribute("aria-describedby");
    }
    if (target?.hasAttribute("data-hint"))
      target.setAttribute("aria-expanded", "false");
    target = null;
    pinned = false;
    if (!popup.hidden) {
      try {
        popup.hidePopover?.();
      } catch {}
    }
    popup.hidden = true;
  }
  function offer(event, immediate = false, request = null) {
    if (!active() || !request && (!immediate && !desktop.matches || pinned))
      return;
    const item = event.composedPath().find((node) => isHTMLElement(node) && typeof node.hasAttribute === "function" && typeof node.matches === "function" && (Boolean(request) || node.hasAttribute("data-tooltip") || node.matches(".icon-button[aria-label]")));
    if (!isHTMLElement(item) || !request && (item === target || item.querySelector("details[open]")))
      return;
    if (request?.pin && pinned && item === target) {
      hide();
      return;
    }
    hide();
    const dialog = event.composedPath().find((node) => isHTMLElement(node) && node.localName === "dialog" && typeof node.hasAttribute === "function" && node.hasAttribute("open"));
    const place = isHTMLElement(dialog) ? dialog : owner.body;
    if (popup.parentElement !== place)
      place.append(popup);
    target = item;
    pinned = Boolean(request?.pin);
    description = item.getAttribute("aria-describedby") || "";
    const show = () => {
      timer = 0;
      if (!active() || !item.isConnected || target !== item || !request && !immediate && !desktop.matches)
        return;
      popup.textContent = request?.message || item.dataset.tooltip || item.getAttribute("aria-label") || "";
      if (!popup.textContent)
        return;
      popup.hidden = false;
      popup.showPopover?.();
      const rect = item.getBoundingClientRect();
      const box = popup.getBoundingClientRect();
      const padding = interaction_default.tooltip.viewportPadding;
      popup.style.left = `${Math.max(padding, Math.min(view.innerWidth - box.width - padding, rect.left + (rect.width - box.width) / 2))}px`;
      const targetGap = interaction_default.tooltip.targetGap;
      const alternateGap = interaction_default.tooltip.alternateGap;
      popup.style.top = `${rect.bottom + box.height + alternateGap < view.innerHeight ? rect.bottom + targetGap : Math.max(padding, rect.top - box.height - targetGap)}px`;
      item.setAttribute("aria-describedby", `${description} ${popup.id}`.trim());
      if (item.hasAttribute("data-hint"))
        item.setAttribute("aria-expanded", "true");
      if (request?.timeout)
        timer = view.setTimeout(hide, request.timeout);
    };
    if (immediate)
      show();
    else
      timer = view.setTimeout(show, interaction_default.tooltip.delay);
  }
  const owns = (event) => event.currentTarget !== owner || !shadowRoots.some((root) => event.composedPath().includes(root));
  for (const root of [owner, ...shadowRoots]) {
    root.addEventListener("pointerover", (event) => {
      if (owns(event))
        offer(event);
    }, { signal });
    root.addEventListener("pointerout", (event) => {
      const related = event.relatedTarget;
      if (!owns(event) || pinned || !target || isElement(related) && target.contains(related))
        return;
      hide();
    }, { signal });
    root.addEventListener("focusin", (event) => {
      if (owns(event))
        offer(event, true);
    }, { signal });
    root.addEventListener("focusout", (event) => {
      if (owns(event))
        hide();
    }, { signal });
  }
  owner.addEventListener("pointerdown", (event) => {
    if (!pinned || !target || !event.composedPath().includes(target))
      hide();
  }, { signal, capture: true });
  owner.addEventListener("ui:tooltip", (event) => offer(event, true, event.detail), { signal });
  owner.addEventListener("scroll", hide, { signal, capture: true });
  owner.addEventListener("keydown", hide, { signal });
  owner.addEventListener("close", hide, { signal, capture: true });
  view.addEventListener("resize", hide, { signal });
  return () => {
    hide();
    events.abort();
    popup.remove();
  };
}
function showTooltip(target, message, options = {}) {
  target.dispatchEvent(new (displayWindow(target)).CustomEvent("ui:tooltip", {
    bubbles: true,
    composed: true,
    detail: { ...options, message }
  }));
}

// src/component/footer-disclosure/index.mjs
function showDisclosureButton(button, model) {
  button.setAttribute("aria-expanded", String(model.expanded));
  button.setAttribute("aria-label", model.label);
  button.dataset.tooltip = model.label;
}
function showFooterDisclosure(elements, model) {
  const expanded = model.available && model.expanded;
  elements.footer.dataset.settingsExpanded = String(expanded);
  elements.toggle.hidden = !model.available;
  elements.region.hidden = !expanded;
  showDisclosureButton(elements.toggle, { expanded, label: model.label });
}

// src/component/keyboard-help/index.mjs
function showKeyboardHelp(elements, model) {
  elements.hints.hidden = !model.expanded;
  elements.footer.classList.toggle("help-collapsed", !model.expanded);
  showDisclosureButton(elements.toggle, model);
}
function showKeyboardDescriptions(root, descriptions) {
  for (const button of root.querySelectorAll("button[data-hint]")) {
    const key = button.getAttribute("data-hint");
    if (isHTMLElement(button) && key && Object.hasOwn(descriptions, key))
      button.dataset.tooltip = descriptions[key];
  }
}
function clearKeyboardHints(root) {
  root.querySelectorAll("button[data-hint]").forEach((item) => item.setAttribute("aria-expanded", "false"));
}
function showKeyboardContext(root, model) {
  const item = root.querySelector("#close-hint");
  if (isHTMLElement(item))
    item.hidden = !model.closeVisible;
  if (!model.closeVisible && item?.querySelector("button")?.getAttribute("aria-expanded") === "true") {
    clearKeyboardHints(root);
  }
  const close = item?.querySelector("button");
  if (close) {
    close.setAttribute("data-tooltip", model.closeHint);
    close.setAttribute("aria-label", model.closeHint);
    const label = close.querySelector("[data-close-action]");
    if (label)
      label.textContent = model.closeLabel;
  }
  const context = root.querySelector('[data-hint="context"]');
  if (isHTMLElement(context)) {
    context.dataset.tooltip = model.contextHint;
    context.setAttribute("aria-label", model.contextHint);
    const label = context.querySelector("[data-e-action]");
    if (label)
      label.textContent = model.contextLabel;
  }
}
function bindKeyboardHelp(root, onHint, on) {
  on(root, "click", (event) => {
    if (isElement(event.target) && event.target.closest("button[data-hint]"))
      onHint(event);
  });
}

// src/component/window-actions/index.mjs
function bindWindowActions(root, handlers, on) {
  const actions = {
    "window-close": handlers.onClose,
    "window-pip": handlers.onPiP,
    "window-fill": handlers.onFill
  };
  for (const [id, listener] of Object.entries(actions)) {
    const button = root.querySelector(`#${id}`);
    if (isHTMLElement(button))
      on(button, "click", listener);
  }
}
function showWindowLayout(root, model) {
  const button = root.querySelector("#window-fill");
  if (!isHTMLElement(button))
    return;
  button.setAttribute("aria-label", model.label);
  button.dataset.tooltip = model.label;
  button.dataset.layout = model.layout;
}
function showWindowPiP(root, model) {
  const button = root.querySelector("#window-pip");
  const status = root.querySelector("#window-status");
  if (button) {
    button.disabled = model.disabled;
    button.dataset.supported = String(model.supported);
    button.dataset.tooltip = model.description;
    button.setAttribute("aria-description", model.description);
  }
  if (status) {
    status.textContent = model.error;
    status.hidden = !model.error;
  }
}

// src/bloc/page/index.mjs
var hintDetails = ui_strings_default.appearance.hints;
var settingsOpenKey = "site-footer-settings-expanded";
var helpOpenKey = "site-keyboard-help-expanded";
function savedExpanded(key) {
  try {
    return localStorage.getItem(key) !== "false";
  } catch {
    return true;
  }
}
function saveExpanded(key, expanded) {
  try {
    localStorage.setItem(key, String(expanded));
  } catch {}
}

class PageAppearance {
  #options;
  #opener;
  #events = new Map;
  #motion = null;
  #tooltips = [];
  #pip = null;
  #tokenManager = null;
  #layoutChoice = null;
  #moving = false;
  #settingsExpanded = true;
  #helpExpanded = true;
  #settingsPlaces;
  #copyOperation = 0;
  #copyTimer = null;
  #addressObservers = null;
  #addressFrame = null;
  #buttons;
  constructor(options) {
    this.#options = options;
    this.#opener = displayWindow(options.terminal);
    const layout = options.terminal.ownerDocument.documentElement.dataset.layout;
    this.#layoutChoice = layout === "fill" || layout === "window" ? layout : null;
    this.#settingsPlaces = {
      header: options.terminal.querySelector("#header-settings"),
      footer: options.footer.querySelector("#footer-settings")
    };
    this.#buttons = {
      help: options.footer.querySelector("#help-toggle"),
      settings: options.footer.querySelector("#settings-toggle"),
      controls: options.footer.querySelector(".footer-controls"),
      hints: options.footer.querySelector("#keyboard-help")
    };
    this.#settingsExpanded = savedExpanded(settingsOpenKey);
    this.#helpExpanded = savedExpanded(helpOpenKey);
    this.#syncHelp();
    this.#relocatePreferences();
    this.#bind();
  }
  setPictureInPicture(controller) {
    this.#unbind();
    this.#pip = controller;
    this.#bind();
  }
  setTokenManager(manager) {
    this.#tokenManager = manager;
  }
  prepareMove({ restoreFocus = true, rollbackFocus = true } = {}) {
    this.#tokenManager?.close();
    if (!this.#tokenManager) {
      const dialog = this.#options.footer.querySelector("#token-dialog");
      if (dialog instanceof HTMLDialogElement && dialog.open)
        dialog.close();
    }
    const docs = new Set([this.#options.terminal.ownerDocument, this.#options.footer.ownerDocument]);
    const focused = [...docs].map((owner) => owner.activeElement).find((node) => isHTMLElement(node) && (this.#options.footer.contains(node) || Boolean(node.closest(".window-controls"))));
    if (this.#options.preferences.shadowRoot?.activeElement)
      this.#settingsExpanded = true;
    const resume = () => {
      this.#bind();
      if (restoreFocus && isHTMLElement(focused) && focused.isConnected)
        focused.focus({ preventScroll: true });
    };
    const restore = () => {
      this.#bind();
      if (rollbackFocus && isHTMLElement(focused) && focused.isConnected)
        focused.focus({ preventScroll: true });
    };
    this.#moving = true;
    try {
      this.#unbind();
    } catch (error) {
      try {
        restore();
      } finally {
        this.#moving = false;
      }
      throw error;
    }
    return {
      resume,
      rollback: () => {
        try {
          this.#unbind();
          restore();
        } finally {
          this.#moving = false;
        }
      },
      commit: () => {
        this.#moving = false;
      }
    };
  }
  dispose() {
    this.#unbind();
  }
  #setPointerOver(over) {
    this.#options.terminal.ownerDocument.documentElement.dataset.headerPointerOver = String(over);
    this.#options.terminal.querySelector(".titlebar")?.toggleAttribute("data-pointer-over", over);
    this.#options.preferences.toggleAttribute("data-pointer-over", over && this.#options.preferences.dataset.placement === "header");
  }
  placePreferences() {
    const { preferences, footer } = this.#options;
    const destination = this.#preferencesDestination();
    const placement = destination === this.#settingsPlaces.footer ? "footer" : "header";
    if (preferences.parentElement !== destination) {
      if (placement === "header")
        destination.append(preferences);
      else
        destination.prepend(preferences);
    }
    preferences.dataset.placement = footer.dataset.settingsPlacement = placement;
    this.#reflectNavigation();
    if (placement === "footer")
      this.#setPointerOver(false);
    this.#updateSettings();
  }
  withFooterMove(operation, { restoreFocus = true } = {}) {
    if (this.#moving) {
      operation();
      return;
    }
    const { preferences } = this.#options;
    const source = preferences.ownerDocument;
    const focused = source.hasFocus() && Boolean(preferences.shadowRoot?.activeElement);
    if (focused && this.#preferencesDestination() === this.#settingsPlaces.footer)
      this.#settingsExpanded = true;
    const move = preferences.prepareMove({
      restoreFocus: restoreFocus && focused,
      rollbackFocus: restoreFocus && focused
    });
    try {
      operation();
      this.placePreferences();
      move.resume();
      move.commit();
    } catch (error) {
      try {
        this.placePreferences();
        move.rollback();
      } catch (failure) {
        throw new AggregateError([error, failure], "Could not restore settings");
      }
      throw error;
    } finally {
      if (source !== preferences.ownerDocument && this.#events.size)
        this.#refreshTooltips();
    }
  }
  #preferencesDestination() {
    const lower = [this.#options.terminal, this.#options.footer].some((node) => Boolean(node.ownerDocument.documentElement.dataset.pipMode) || displayWindow(node).matchMedia("(max-width: 760px)").matches);
    return lower ? this.#settingsPlaces.footer : this.#settingsPlaces.header;
  }
  #relocatePreferences() {
    if (this.#options.preferences.parentElement === this.#preferencesDestination())
      this.placePreferences();
    else
      this.withFooterMove(() => {});
  }
  #updateSettings() {
    const lower = this.#options.preferences.parentElement === this.#settingsPlaces.footer;
    showFooterDisclosure({
      footer: this.#options.footer,
      region: this.#settingsPlaces.footer,
      toggle: this.#buttons.settings
    }, {
      available: lower,
      expanded: this.#settingsExpanded,
      label: this.#settingsExpanded ? ui_strings_default.appearance.collapseBottomBar : ui_strings_default.appearance.expandBottomBar
    });
    this.#scheduleAddress();
  }
  #showSettings(expanded, explicit = true) {
    if (this.#options.preferences.parentElement !== this.#settingsPlaces.footer || this.#settingsExpanded === expanded)
      return;
    const { footer, preferences } = this.#options;
    const height = footer.getBoundingClientRect().height;
    const focused = preferences.ownerDocument.hasFocus() && Boolean(preferences.shadowRoot?.activeElement);
    this.#motion?.cancel(footer);
    this.#settingsExpanded = expanded;
    if (explicit)
      saveExpanded(settingsOpenKey, expanded);
    this.#updateSettings();
    this.#fitAddress();
    if (!expanded && focused)
      this.#buttons.settings.focus({ preventScroll: true });
    this.#motion?.play(footer, [{ height: `${height}px` }, { height: `${footer.getBoundingClientRect().height}px` }]);
  }
  #refreshTooltips() {
    this.#tooltips.forEach((dispose) => dispose());
    this.#tooltips = [];
    const { terminal, footer, preferences } = this.#options;
    for (const owner of new Set([terminal.ownerDocument, footer.ownerDocument])) {
      const shadow = preferences.shadowRoot;
      this.#tooltips.push(createTooltips(owner, () => !this.#moving, shadow?.ownerDocument === owner ? [shadow] : []));
    }
  }
  #bind() {
    if (this.#events.size)
      return;
    const { terminal, footer, panel } = this.#options;
    this.#motion = createMotion(displayWindow(terminal));
    const documents = new Set([terminal.ownerDocument, footer.ownerDocument]);
    const signal = (view) => {
      let controller = this.#events.get(view);
      if (!controller) {
        controller = new view.AbortController;
        this.#events.set(view, controller);
      }
      return controller.signal;
    };
    const on = (node, type, listener) => node.addEventListener(type, (event) => {
      if (!this.#moving)
        listener(event);
    }, { signal: signal(displayWindow(node)) });
    on(this.#buttons.help, "click", () => this.#toggleHelp());
    on(this.#buttons.settings, "click", () => this.#showSettings(!this.#settingsExpanded));
    on(this.#options.preferences, "settings-reveal", () => this.#showSettings(true, false));
    on(this.#options.preferences, "font-size-change", () => this.#scheduleAddress());
    bindKeyboardHelp(footer, (event) => this.#explainHint(event), on);
    const titlebar = terminal.querySelector(".titlebar");
    if (isHTMLElement(titlebar)) {
      on(titlebar, "pointerenter", () => this.#setPointerOver(true));
      on(titlebar, "pointerleave", () => this.#setPointerOver(false));
      on(titlebar, "focusin", () => this.#reflectHeaderFocus());
      on(titlebar, "focusout", () => {
        terminal.ownerDocument.documentElement.dataset.headerFocusVisible = "false";
      });
    }
    showKeyboardDescriptions(footer, hintDetails);
    bindWindowActions(terminal, {
      onFill: () => {
        if (!this.#compact())
          this.#setLayout(this.#layout() === "fill" ? "window" : "fill");
      },
      onClose: () => {
        if (this.#compact())
          return;
        if (this.#pip)
          this.#pip.closeOrBack();
        else if (panel.isOpen)
          panel.close();
      },
      onPiP: () => {
        if (!this.#compact())
          this.#pip?.open("main");
      }
    }, on);
    bindFooterAddress(footer, () => {
      this.#copyUrl();
    }, on);
    for (const node of [terminal.querySelector(".window-controls"), footer]) {
      if (!isHTMLElement(node))
        continue;
      on(node, "mousedown", (event) => {
        const pointer = event;
        if (pointer.button === 0 && isElement(pointer.target) && pointer.target.closest("button")) {
          pointer.preventDefault();
        }
      });
    }
    for (const event of ["view-open", "view-close"]) {
      on(panel, event, () => {
        this.#finishFooter();
        this.#infoHint(event === "view-open");
      });
    }
    on(panel, "view-visibility", () => this.#reflectNavigation());
    for (const owner of documents) {
      const view = displayWindow(owner);
      const windowFocus = () => {
        owner.documentElement.dataset.windowActive = String(owner.hasFocus());
        this.#reflectHeaderFocus();
      };
      windowFocus();
      view.addEventListener("focus", windowFocus, { signal: signal(view) });
      view.addEventListener("blur", windowFocus, { signal: signal(view) });
      view.addEventListener("resize", () => {
        if (this.#moving)
          return;
        this.#motion?.finishAll();
        panel.refreshPlacement();
        this.#relocatePreferences();
        this.#updateLayoutButton();
      }, { signal: signal(view) });
      owner.addEventListener("keydown", (event) => {
        if (this.#moving || !isCommandKey(event, "KeyP") || !this.#pip?.supported)
          return;
        event.preventDefault();
        this.#pip.open(panel.isOpen ? "docs" : "main");
      }, { signal: signal(view) });
      enableSystemSymbols(owner);
    }
    this.#refreshTooltips();
    this.#pip?.addEventListener("change", () => {
      if (!this.#moving) {
        this.#updatePiP();
        this.#infoHint(panel.isOpen);
      }
    }, { signal: signal(this.#opener) });
    this.#syncAppearance();
    this.#infoHint(panel.isOpen);
    this.#reflectHeaderFocus();
    this.#updatePiP();
    const link = footer.querySelector("#github-link");
    if (link) {
      const view = displayWindow(footer);
      const binding = this.#events.get(view);
      const changed = () => {
        if (this.#events.get(view) === binding)
          this.#scheduleAddress();
      };
      const resize = new view.ResizeObserver(changed);
      const href = new view.MutationObserver(changed);
      this.#addressObservers = { resize, href };
      resize.observe(link);
      href.observe(link, { attributes: true, attributeFilter: ["href"] });
      this.#scheduleAddress();
    }
  }
  #unbind() {
    this.#setPointerOver(false);
    this.#addressObservers?.resize.disconnect();
    this.#addressObservers?.href.disconnect();
    this.#addressObservers = null;
    if (this.#addressFrame)
      this.#addressFrame.view.cancelAnimationFrame(this.#addressFrame.id);
    this.#addressFrame = null;
    this.#motion?.finishAll();
    for (const [view, controller] of this.#events) {
      controller.abort();
      delete view.document.documentElement.dataset.preferencesPlacement;
      delete view.document.documentElement.dataset.informationOpen;
      delete view.document.documentElement.dataset.headerPointerOver;
      delete view.document.documentElement.dataset.headerFocusVisible;
    }
    this.#events.clear();
    this.#tooltips.forEach((dispose) => dispose());
    this.#tooltips = [];
    this.#motion?.dispose();
    this.#motion = null;
    this.#copyOperation++;
    if (this.#copyTimer)
      this.#copyTimer.view.clearTimeout(this.#copyTimer.id);
    this.#copyTimer = null;
  }
  #syncAppearance() {
    for (const owner of new Set([this.#opener.document, this.#options.terminal.ownerDocument])) {
      if (this.#layoutChoice)
        owner.documentElement.dataset.layout = this.#layoutChoice;
      else
        delete owner.documentElement.dataset.layout;
    }
    this.#updateLayoutButton();
  }
  #toggleHelp() {
    const { footer } = this.#options;
    const { controls } = this.#buttons;
    const expanded = !this.#helpExpanded;
    const height = footer.getBoundingClientRect().height;
    const before = controls.getBoundingClientRect();
    this.#motion?.cancel(footer);
    this.#motion?.cancel(controls);
    this.#helpExpanded = expanded;
    saveExpanded(helpOpenKey, expanded);
    this.#syncHelp();
    this.#fitAddress();
    if (!expanded)
      this.#clearHint();
    const after = controls.getBoundingClientRect();
    this.#motion?.play(footer, [{ height: `${height}px` }, { height: `${footer.getBoundingClientRect().height}px` }]);
    this.#motion?.play(controls, [{ transform: `translate(${before.x - after.x}px, ${before.y - after.y}px)` }, {
      transform: "translate(0, 0)"
    }]);
  }
  #syncHelp() {
    const { help, hints } = this.#buttons;
    showKeyboardHelp({ footer: this.#options.footer, hints, toggle: help }, {
      expanded: this.#helpExpanded,
      label: this.#helpExpanded ? ui_strings_default.appearance.hideKeyboardHelp : ui_strings_default.appearance.showKeyboardHelp
    });
  }
  #scheduleAddress() {
    if (this.#addressFrame)
      return;
    const view = displayWindow(this.#options.footer);
    this.#addressFrame = {
      view,
      id: view.requestAnimationFrame(() => {
        this.#addressFrame = null;
        if (!this.#moving && this.#events.has(view))
          this.#fitAddress();
      })
    };
  }
  #fitAddress() {
    const { footer } = this.#options;
    const link = footer.querySelector("#github-link");
    if (link) {
      fitAddress(link, {
        shorten: footer.dataset.settingsPlacement === "header" && footer.classList.contains("help-collapsed")
      });
    }
  }
  #layout() {
    return this.#compact() ? "fill" : this.#layoutChoice || "window";
  }
  #compact() {
    return Boolean(this.#options.terminal.ownerDocument.documentElement.dataset.pipMode) || displayWindow(this.#options.terminal).matchMedia("(max-width: 760px)").matches;
  }
  #setLayout(value) {
    const { terminal } = this.#options;
    const body = terminal.ownerDocument.body;
    const view = displayWindow(terminal);
    this.#finishFooter();
    const padding = view.getComputedStyle(body).padding;
    const before = frameStyle(terminal);
    this.#motion?.cancel("layout");
    this.#motion?.cancel(terminal);
    this.#layoutChoice = value;
    this.#syncAppearance();
    const target = frameStyle(terminal);
    this.#motion?.play(body, [{ padding }, { padding: view.getComputedStyle(body).padding }], { key: "layout" });
    this.#motion?.play(terminal, [before, target]);
  }
  #updateLayoutButton() {
    const fill = this.#layout() === "fill";
    showWindowLayout(this.#options.terminal, {
      label: fill ? ui_strings_default.appearance.useWindowedView : ui_strings_default.appearance.fillViewport,
      layout: fill ? "fill" : "window"
    });
  }
  #updatePiP() {
    showWindowPiP(this.#options.terminal, {
      disabled: !this.#pip?.supported || Boolean(this.#pip?.pending),
      supported: Boolean(this.#pip?.supported),
      description: !this.#pip?.supported ? ui_strings_default.appearance.pipUnavailable : this.#pip.pending ? ui_strings_default.appearance.pipOpening : ui_strings_default.appearance.pipOpen,
      error: this.#pip?.error || ""
    });
  }
  #infoHint(open) {
    this.#reflectNavigation();
    const browsing = this.#pip?.mode === "docs";
    showKeyboardContext(this.#options.footer, {
      closeVisible: open,
      closeHint: browsing ? ui_strings_default.appearance.closeBrowsing : hintDetails.close,
      closeLabel: browsing ? ui_strings_default.appearance.browseFiles : ui_strings_default.appearance.closeInfo,
      contextHint: open ? ui_strings_default.appearance.contextOpen : hintDetails.context,
      contextLabel: open ? ui_strings_default.appearance.holdForPip : ui_strings_default.appearance.infoHoldForPip
    });
  }
  #reflectNavigation() {
    const { terminal, footer, preferences, panel } = this.#options;
    for (const owner of new Set([
      terminal.ownerDocument,
      footer.ownerDocument,
      preferences.ownerDocument,
      panel.ownerDocument
    ])) {
      owner.documentElement.dataset.preferencesPlacement = preferences.ownerDocument === owner ? preferences.dataset.placement || "header" : "header";
      owner.documentElement.dataset.informationOpen = String(panel.ownerDocument === owner && panel.isOpen);
    }
  }
  #reflectHeaderFocus() {
    const { terminal, preferences } = this.#options;
    const owner = terminal.ownerDocument;
    const header = terminal.querySelector(".titlebar");
    const inSettings = preferences.dataset.placement === "header" && preferences.ownerDocument === owner;
    const active = inSettings && preferences.shadowRoot?.activeElement || owner.activeElement;
    owner.documentElement.dataset.headerFocusVisible = String(Boolean(owner.hasFocus() && isElement(active) && typeof active.matches === "function" && active.matches(":focus-visible") && (header?.contains(active) || inSettings && preferences.shadowRoot?.contains(active))));
  }
  #clearHint() {
    clearKeyboardHints(this.#options.footer);
  }
  #explainHint(event) {
    const button = isElement(event.target) ? event.target.closest("button[data-hint]") : null;
    const key = button?.getAttribute("data-hint");
    if (!isHTMLElement(button) || !key || !Object.hasOwn(hintDetails, key))
      return;
    showTooltip(button, button.dataset.tooltip || hintDetails[key], {
      pin: true
    });
  }
  async#copyUrl() {
    const operation = ++this.#copyOperation;
    const { footer } = this.#options;
    const link = footer.querySelector("#github-link");
    const feedback = footer.querySelector("#copy-status");
    if (!link || !isHTMLElement(feedback))
      return;
    const view = displayWindow(footer);
    let message;
    try {
      await view.navigator.clipboard.writeText(link.href);
      message = ui_strings_default.appearance.copied;
    } catch {
      message = ui_strings_default.appearance.copyFailed;
    }
    if (operation !== this.#copyOperation || this.#moving)
      return;
    showCopyFeedback(feedback, message);
    const button = footer.querySelector("#github-copy");
    if (isHTMLElement(button))
      showTooltip(button, message, { timeout: 2400 });
    if (this.#copyTimer)
      this.#copyTimer.view.clearTimeout(this.#copyTimer.id);
    this.#copyTimer = {
      view,
      id: view.setTimeout(() => {
        showCopyFeedback(feedback, "");
        this.#copyTimer = null;
      }, 2400)
    };
  }
  #finishFooter() {
    this.#motion?.finish(this.#options.footer);
    this.#motion?.cancel(this.#buttons.controls);
  }
}
function frameStyle(terminal) {
  const style = displayWindow(terminal).getComputedStyle(terminal);
  return {
    width: `${terminal.getBoundingClientRect().width}px`,
    borderRadius: style.borderRadius,
    borderWidth: style.borderWidth,
    boxShadow: style.boxShadow
  };
}

// src/component/update-notice/index.mjs
function showUpdateNotice(notice, model) {
  const message = notice.querySelector("#site-update-message");
  const retry = notice.querySelector("#site-update-retry");
  if (model.hidden !== undefined)
    notice.hidden = model.hidden;
  if (message && model.text !== undefined)
    message.textContent = model.text;
  if (retry && model.retryVisible !== undefined)
    retry.hidden = !model.retryVisible;
  if (retry && model.retryLabel !== undefined)
    retry.textContent = model.retryLabel;
}

// src/component/version-caption/index.mjs
function showVersionCaption(link, model) {
  link.textContent = model.text;
  if (model.href !== undefined)
    link.href = model.href;
  if (model.title !== undefined)
    link.title = model.title;
}

// src/bloc/update/index.mjs
var root = new URL("./", document.baseURI);
var savedCommitKey = "site-main-commit";
async function readText2(url, cache) {
  return withinRequestTime(async (signal) => {
    const response = await fetch(url, {
      cache,
      credentials: new URL(url).origin === root.origin ? "same-origin" : "omit",
      signal
    });
    if (!response.ok)
      throw new Error(`Resource request failed: ${response.status}`);
    return response.text();
  });
}
async function resourcesFor(sha) {
  const target = await readText2(`https://raw.githubusercontent.com/Hxape/hxape.github.io/${sha}/public/json/resources.json`, "no-store");
  const published = await readText2(new URL("public/json/resources.json", root), "reload");
  if (target !== published)
    throw new Error(ui_strings_default.version.waitForDeployment);
  const parsed = JSON.parse(target);
  const manifest = parsed && typeof parsed === "object" ? parsed : null;
  if (manifest?.version !== 1 || !Array.isArray(manifest.resources) || !manifest.resources.length || manifest.resources.length > 500)
    throw new Error(ui_strings_default.version.invalidResources);
  const seen = new Set;
  const resources = [];
  const entries = manifest.resources;
  for (const entry of entries) {
    const item = entry && typeof entry === "object" ? entry : null;
    const path = item?.path;
    if (typeof path !== "string" || !/^[A-Za-z0-9._/-]+$/.test(path) || path.split("/").some((part) => !part || part === "." || part === "..") || seen.has(path) || typeof item?.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(item.sha256))
      throw new Error(ui_strings_default.version.invalidResources);
    seen.add(path);
    resources.push({ path, sha256: item.sha256 });
  }
  return resources;
}
async function refreshResource(resource) {
  await withinRequestTime(async (signal) => {
    const response = await fetch(new URL(resource.path, root), { credentials: "same-origin", cache: "reload", signal });
    if (!response.ok)
      throw new Error(`Resource request failed: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    if (hash !== resource.sha256)
      throw new Error(ui_strings_default.version.resourceMismatch);
  });
}
async function refreshResources(resources, progress) {
  let next = 0;
  let finished = 0;
  let failure = null;
  const worker = async () => {
    while (!failure && next < resources.length) {
      const item = resources[next++];
      try {
        await refreshResource(item);
      } catch (error) {
        failure = error;
        break;
      }
      progress(++finished);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, resources.length) }, worker));
  if (failure)
    throw failure;
}
async function clearOldCaches() {
  if (!("caches" in window))
    return;
  await withinRequestTime(async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }, { timeout: 5000 });
}
function startSiteUpdate(button, footer) {
  const commit = footer.querySelector("#site-commit a");
  const banner = footer.querySelector("#site-update");
  const message = banner?.querySelector("#site-update-message");
  const retry = banner?.querySelector("#site-update-retry");
  if (!(commit instanceof HTMLAnchorElement) || !(banner instanceof HTMLElement) || !(message instanceof HTMLElement) || !(retry instanceof HTMLButtonElement) || !(button instanceof HTMLButtonElement))
    return Promise.resolve(false);
  let previous = null;
  try {
    previous = localStorage.getItem(savedCommitKey);
  } catch {}
  if (!previous || !/^[0-9a-f]{40}$/i.test(previous))
    previous = null;
  const showInstalled = () => {
    showVersionCaption(commit, {
      text: previous ? previous.slice(0, 7) : ui_strings_default.version.unavailable,
      href: previous ? `https://github.com/Hxape/hxape.github.io/commit/${previous}` : undefined,
      title: previous ? formatText(ui_strings_default.version.lastChecked, { sha: previous }) : undefined
    });
  };
  showInstalled();
  let pending = false;
  let navigating = false;
  let state = "check";
  let retryAction = "check";
  let successTimer = 0;
  let targetSha = "";
  const setState = (next) => {
    state = next;
    const label = next === "download" ? ui_strings_default.version.download : next === "success" ? ui_strings_default.version.checked : ui_strings_default.version.check;
    showUpdateAction(button, {
      state: next,
      disabled: pending || next === "success",
      label,
      tooltip: formatText(ui_strings_default.version.desktopTooltip, {
        action: label,
        sha: previous ? previous.slice(0, 7) : ui_strings_default.version.unavailable
      }),
      control: `update-${next}`
    });
    renderControlIcons(button);
    if (button.getAttribute("aria-describedby")?.split(/\s+/).includes("ui-tooltip")) {
      showTooltip(button, button.dataset.tooltip || "");
    }
  };
  const showSuccess = () => {
    window.clearTimeout(successTimer);
    setState("success");
    successTimer = window.setTimeout(() => setState("check"), 1600);
  };
  const show = (text, canRetry) => {
    showUpdateNotice(banner, { hidden: false, text, retryVisible: canRetry });
  };
  const readCommit = async () => {
    const result = await readText2("https://api.github.com/repos/Hxape/hxape.github.io/commits/main", "no-store");
    const parsed = JSON.parse(result);
    const sha = parsed && typeof parsed === "object" && "sha" in parsed ? parsed.sha : null;
    if (typeof sha !== "string" || !/^[0-9a-f]{40}$/i.test(sha))
      throw new Error(ui_strings_default.version.invalidCommit);
    return sha;
  };
  const update = async (action, initial = false) => {
    if (pending)
      return false;
    pending = true;
    window.clearTimeout(successTimer);
    retryAction = action;
    showUpdateNotice(banner, {
      retryLabel: action === "download" ? ui_strings_default.version.retry : ui_strings_default.version.retryCheck
    });
    setState(state);
    if (!initial)
      show(action === "download" ? ui_strings_default.version.preparing : ui_strings_default.version.checking, false);
    try {
      const sha = await readCommit();
      targetSha = sha;
      if (previous === sha) {
        showUpdateNotice(banner, { hidden: true });
        if (initial)
          setState("check");
        else
          showSuccess();
        return false;
      }
      if (action === "check") {
        showUpdateNotice(banner, { hidden: true });
        setState("download");
        return false;
      }
      show(ui_strings_default.version.preparing, false);
      const resources = await resourcesFor(sha);
      show(formatText(ui_strings_default.version.progress, { finished: 0, total: resources.length }), false);
      await refreshResources(resources, (finished) => show(formatText(ui_strings_default.version.progress, { finished, total: resources.length }), false));
      show(ui_strings_default.version.cleaning, false);
      await clearOldCaches();
      localStorage.setItem(savedCommitKey, sha);
      previous = sha;
      showInstalled();
      showUpdateNotice(banner, { hidden: true });
      showSuccess();
      await new Promise((resolve) => window.setTimeout(resolve, 1100));
      const destination = new URL(location.href);
      destination.searchParams.set("commit", sha.slice(0, 7));
      location.replace(destination.href);
      navigating = true;
      return true;
    } catch (error) {
      show(error instanceof Error && [ui_strings_default.version.waitForDeployment, ui_strings_default.version.invalidResources, ui_strings_default.version.resourceMismatch].includes(error.message) ? error.message : action === "download" ? ui_strings_default.version.failed : ui_strings_default.version.checkFailed, true);
      if (!previous)
        showVersionCaption(commit, { text: ui_strings_default.version.unavailable });
      setState(action === "download" && targetSha !== previous ? "download" : "check");
      return false;
    } finally {
      if (!navigating) {
        pending = false;
        setState(state);
      }
    }
  };
  button.addEventListener("click", () => {
    update(state === "download" ? "download" : "check");
  });
  button.addEventListener("focus", () => showTooltip(button, button.dataset.tooltip || ""));
  retry.addEventListener("click", () => {
    update(retryAction);
  });
  setState("check");
  return update("check", true);
}

// src/app/picture-in-picture.mjs
class PictureInPictureController extends EventTarget {
  #options;
  #home;
  #window = null;
  #docsHost = null;
  #mode = null;
  #openingMode = null;
  #request = null;
  #events;
  #generation = 0;
  #moving = false;
  #returnRequested = false;
  #disposed = false;
  #error = "";
  constructor(options) {
    super();
    this.#options = options;
    this.#home = this.#markPlaces("pip-home");
    this.#events = new options.opener.AbortController;
    options.panel.addEventListener("view-close", () => {
      if (!this.#moving && (this.#mode === "docs" || this.#openingMode === "docs"))
        this.close();
    }, { signal: this.#events.signal });
    options.opener.addEventListener("pagehide", () => this.close(), { signal: this.#events.signal });
  }
  get supported() {
    return Boolean(this.#api());
  }
  get mode() {
    return this.#mode;
  }
  get pending() {
    return this.#request !== null || this.#moving;
  }
  get error() {
    return this.#error;
  }
  #api() {
    const owner = this.#options.opener;
    const api = owner.documentPictureInPicture;
    return typeof api?.requestWindow === "function" ? api : undefined;
  }
  async open(mode) {
    if (this.#disposed || this.pending || mode === "docs" && !this.#options.panel.isOpen)
      return false;
    this.#error = "";
    if (this.#window && !this.#window.closed) {
      try {
        this.#transfer(mode);
        this.#changed();
        return true;
      } catch (error) {
        this.#error = error instanceof AggregateError ? ui_strings_default.pip.returnControlsFailed : ui_strings_default.pip.moveFailed;
        this.#changed();
        return false;
      }
    }
    if (this.#window) {
      this.close();
      if (this.#window || this.#mode)
        return false;
      this.#error = "";
    }
    const api = this.#api();
    if (!api) {
      this.#error = ui_strings_default.pip.unavailable;
      this.#changed();
      return false;
    }
    const generation = ++this.#generation;
    this.#openingMode = mode;
    const request = new this.#options.opener.AbortController;
    this.#request = request;
    const signal = request.signal;
    this.#changed();
    let opened = null;
    try {
      const area = (mode === "main" ? this.#options.terminal : this.#options.panel).getBoundingClientRect();
      const pendingWindow = api.requestWindow({
        width: Math.max(320, Math.round(area.width) || 640),
        height: Math.max(240, Math.round(area.height) || 480)
      });
      pendingWindow.then((late) => {
        if ((signal.aborted || generation !== this.#generation) && !late.closed)
          late.close();
      }, () => {});
      let timer = 0;
      try {
        const deadline = new Promise((_, reject) => {
          timer = this.#options.opener.setTimeout(() => reject(new Error("Picture-in-Picture did not respond.")), 30000);
        });
        opened = await Promise.race([
          pendingWindow,
          deadline
        ]);
      } finally {
        this.#options.opener.clearTimeout(timer);
      }
      if (generation !== this.#generation || this.#disposed) {
        if (!opened.closed)
          opened.close();
        return false;
      }
      if (opened.closed) {
        request.abort();
        return false;
      }
      this.#window = opened;
      const current = opened;
      current.addEventListener("pagehide", () => {
        if (this.#window === current)
          this.close();
      }, { once: true });
      await this.#prepareWindow(current, signal);
      if (generation !== this.#generation)
        return false;
      if (current.closed || this.#disposed) {
        this.close();
        return false;
      }
      if (mode === "docs" && !this.#options.panel.isOpen) {
        this.close();
        return false;
      }
      this.#options.preferences.setThemeDocuments([this.#options.opener.document, current.document]);
      this.#transfer(mode);
      return true;
    } catch (error) {
      if (generation !== this.#generation)
        return false;
      request.abort();
      this.#window = null;
      this.#docsHost = null;
      this.#options.preferences.setThemeDocuments([this.#options.opener.document]);
      if (opened && !opened.closed)
        opened.close();
      this.#error = error instanceof AggregateError ? ui_strings_default.pip.restoredPartially : ui_strings_default.pip.openFailed;
      return false;
    } finally {
      if (this.#request === request) {
        this.#request = null;
        this.#openingMode = null;
        this.#changed();
      }
    }
  }
  close() {
    if (this.#moving) {
      this.#returnRequested = true;
      return true;
    }
    if (!this.#window && !this.#request && !this.#mode)
      return false;
    ++this.#generation;
    this.#openingMode = null;
    this.#request?.abort();
    const current = this.#window;
    try {
      if (this.#mode)
        this.#transfer(null);
    } catch {
      this.#error = ui_strings_default.pip.restoredPartially;
      if (this.#mode !== null) {
        this.#changed();
        return true;
      }
    }
    this.#window = null;
    this.#docsHost = null;
    this.#options.preferences.setThemeDocuments([this.#options.opener.document]);
    if (current && !current.closed)
      current.close();
    this.#changed();
    return true;
  }
  closeOrBack() {
    if (this.close())
      return;
    if (this.#options.panel.isOpen)
      this.#options.panel.close();
    else if (this.#options.historyBackEnabled)
      this.#options.opener.history.back();
  }
  dispose() {
    if (this.#moving) {
      this.#returnRequested = true;
      this.#options.opener.queueMicrotask(() => this.dispose());
      return;
    }
    this.close();
    if (this.#mode !== null || this.#window)
      return;
    this.#disposed = true;
    this.#events.abort();
    for (const anchor of Object.values(this.#home))
      anchor.remove();
  }
  async#prepareWindow(target, signal) {
    const source = this.#options.opener.document;
    const document2 = target.document;
    const base = document2.createElement("base");
    base.href = source.baseURI;
    document2.head.append(base);
    document2.title = source.title;
    document2.documentElement.lang = source.documentElement.lang;
    document2.body.className = source.body.className;
    if (source.documentElement.dataset.layout) {
      document2.documentElement.dataset.layout = source.documentElement.dataset.layout;
    }
    const styles = [];
    for (const sheet of source.styleSheets) {
      if (sheet.disabled)
        continue;
      if (sheet.href) {
        const link = document2.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        link.media = sheet.media.mediaText;
        styles.push(new Promise((resolve, reject) => {
          const aborted = () => {
            cleanup();
            reject(new Error("Picture-in-Picture preparation was cancelled"));
          };
          const loaded = () => {
            cleanup();
            resolve();
          };
          const failed = () => {
            cleanup();
            reject(new Error("Could not load Picture-in-Picture styles"));
          };
          const cleanup = () => {
            signal.removeEventListener("abort", aborted);
            link.removeEventListener("load", loaded);
            link.removeEventListener("error", failed);
          };
          if (signal.aborted) {
            aborted();
            return;
          }
          signal.addEventListener("abort", aborted, { once: true });
          link.addEventListener("load", loaded, { once: true });
          link.addEventListener("error", failed, { once: true });
          document2.head.append(link);
        }));
      } else {
        const style = document2.createElement("style");
        style.media = sheet.media.mediaText;
        style.textContent = [...sheet.cssRules].map((rule) => rule.cssText).join(`
`);
        document2.head.append(style);
      }
    }
    const host = document2.createElement("div");
    host.className = "pip-docs-host";
    host.hidden = true;
    document2.body.append(host);
    this.#docsHost = host;
    const timeout = target.setTimeout(() => {
      if (this.#request?.signal === signal)
        this.#request.abort();
    }, 15000);
    try {
      await Promise.all(styles);
    } finally {
      target.clearTimeout(timeout);
    }
  }
  #transfer(target) {
    if (target === this.#mode)
      return;
    const window2 = this.#window;
    const host = this.#docsHost;
    if (target && (!window2 || window2.closed || !host))
      throw new Error("Picture-in-Picture is not ready");
    let source = null;
    const previous = this.#mode;
    const prepared = [];
    const focus = { restoreFocus: target !== "docs" && previous !== "docs", rollbackFocus: previous !== "docs" };
    const preferencesInInformation = previous === "docs" && this.#options.preferences.ownerDocument === this.#options.panel.ownerDocument && this.#options.preferences.ownerDocument !== this.#options.terminal.ownerDocument;
    const placement = target === "docs" && host ? { workspace: host, eventRoot: host, footerHome: host, standalone: true } : {
      workspace: this.#options.workspace,
      eventRoot: this.#options.terminal,
      footerHome: this.#options.terminal,
      standalone: false
    };
    this.#moving = true;
    try {
      prepared.push(this.#options.panel.prepareMove(placement));
      prepared.push(this.#options.catalog.prepareMove(focus));
      prepared.push(this.#options.preferences.prepareMove({
        restoreFocus: focus.restoreFocus || preferencesInInformation,
        rollbackFocus: focus.rollbackFocus || preferencesInInformation
      }));
      prepared.push(this.#options.appearance.prepareMove(focus));
      if (target === "docs" && !this.#options.panel.isOpen)
        throw new Error("The information view was closed");
      source = this.#markPlaces("pip-return");
      this.#restorePlaces(this.#home);
      if (window2 && host) {
        host.hidden = target !== "docs";
        if (target)
          window2.document.documentElement.dataset.pipMode = target;
        else
          delete window2.document.documentElement.dataset.pipMode;
        if (target === "main")
          window2.document.body.append(this.#options.terminal);
        else if (target === "docs")
          host.append(this.#options.panel, this.#options.footer);
      }
      for (const [index, move] of prepared.entries()) {
        move.resume();
        if (index === 0)
          this.#options.appearance.placePreferences();
      }
      for (const move of prepared)
        move.commit();
      this.#mode = target;
    } catch (error) {
      const restoredMode = target === null ? null : previous;
      if (window2 && host) {
        host.hidden = restoredMode !== "docs";
        if (restoredMode)
          window2.document.documentElement.dataset.pipMode = restoredMode;
        else
          delete window2.document.documentElement.dataset.pipMode;
      }
      if (target === null)
        this.#restorePlaces(this.#home);
      else if (source)
        this.#restorePlaces(source);
      this.#mode = restoredMode;
      const errors = [error];
      for (const [index, move] of prepared.entries()) {
        try {
          move.rollback();
        } catch (failure) {
          errors.push(failure);
        }
        if (index === 0) {
          try {
            this.#options.appearance.placePreferences();
          } catch (failure) {
            errors.push(failure);
          }
        }
      }
      if (errors.length > 1)
        throw new AggregateError(errors, "Picture-in-Picture rollback failed");
      if (target === null) {
        this.#error = ui_strings_default.pip.displayFailed;
        return;
      }
      throw error;
    } finally {
      if (source) {
        for (const anchor of Object.values(source))
          anchor.remove();
      }
      this.#moving = false;
      if (this.#mode === "docs" && !this.#options.panel.isOpen)
        this.#returnRequested = true;
      if (this.#returnRequested) {
        this.#returnRequested = false;
        this.#options.opener.queueMicrotask(() => this.close());
      }
    }
  }
  #markPlaces(label) {
    const { terminal, panel, footer } = this.#options;
    const created = [];
    const mark = (node, name) => {
      if (!node.parentNode)
        throw new Error(`Missing ${name} location`);
      const anchor = node.ownerDocument.createComment(`${label}-${name}`);
      node.before(anchor);
      created.push(anchor);
      return anchor;
    };
    try {
      return { terminal: mark(terminal, "terminal"), panel: mark(panel, "panel"), footer: mark(footer, "footer") };
    } catch (error) {
      for (const anchor of created)
        anchor.remove();
      throw error;
    }
  }
  #restorePlaces(places) {
    if (Object.values(places).some((anchor) => !anchor.parentNode))
      throw new Error("A return location is missing");
    places.terminal.after(this.#options.terminal);
    places.panel.after(this.#options.panel);
    places.footer.after(this.#options.footer);
  }
  #changed() {
    if (!this.#disposed)
      this.dispatchEvent(new Event("change"));
  }
}

// src/app/main.mjs
var terminal = document.querySelector(".terminal");
var catalog = document.querySelector("project-catalog");
var panel = document.querySelector("document-panel");
var preferences = document.querySelector("site-preferences");
var footer = terminal.querySelector(".terminal-footer");
renderControlIcons(terminal);
enableSystemSymbols(document);
catalog.addEventListener("icons-ready", (event) => {
  const { detail } = event;
  preferences.setIcons(detail);
  catalog.setIcons(preferences.icons);
  panel.setIcons(preferences.icons);
});
preferences.addEventListener("icons-change", (event) => {
  const { detail } = event;
  catalog.setIcons(detail);
  panel.setIcons(detail);
});
preferences.addEventListener("font-size-change", () => {
  catalog.refreshTextSize();
  panel.refreshSourceGeometry();
});
preferences.addEventListener("hold-duration-change", (event) => {
  const duration = event.detail;
  catalog.setHoldDuration(duration);
  panel.setHoldDuration(duration);
});
catalog.setHoldDuration(preferences.holdDuration);
panel.setHoldDuration(preferences.holdDuration);
var appearance = new PageAppearance({ terminal, panel, preferences, footer });
var githubAccess = new GithubAccess;
githubAccess.addEventListener("change", () => preferences.setTokenActive(githubAccess.active));
preferences.setTokenActive(githubAccess.active);
var tokenManagerPromise = null;
function tokenManager() {
  if (!tokenManagerPromise) {
    tokenManagerPromise = import("./tokens.mjs").then(({ GithubTokens }) => {
      const manager = new GithubTokens({ footer, access: githubAccess, requestFragment });
      appearance.setTokenManager(manager);
      return manager;
    }).catch((error) => {
      tokenManagerPromise = null;
      throw error;
    });
  }
  return tokenManagerPromise;
}
function tokenLoadFailure() {
  const dialog = footer.querySelector("#token-dialog");
  if (!(dialog instanceof HTMLDialogElement))
    return;
  showTokenDialogFailure(dialog, {
    message: ui_strings_default.tokens.loadFailed,
    retryLabel: ui_strings_default.tokens.retry,
    onRetry: () => {
      openTokenManager();
    }
  });
  if (!dialog.open)
    dialog.showModal();
}
async function openTokenManager() {
  try {
    await (await tokenManager()).open();
  } catch {
    tokenLoadFailure();
  }
}
preferences.addEventListener("tokens-open", () => {
  openTokenManager();
});
panel.addEventListener("tokens-request", () => {
  openTokenManager();
});
panel.addEventListener("github-reconnect", (event) => {
  const repository = event.detail?.repository;
  (async () => {
    const state = await githubAccess.status();
    if (!state.activeId) {
      await openTokenManager();
      return;
    }
    if (repository) {
      if (await catalog.retryPrivate(repository)) {
        panel.retryCurrent();
        return;
      }
      panel.showAccessFailure(githubAccess.failure(repository) || ui_strings_default.appearance.privateDataFailed);
      return;
    }
    panel.retryCurrent();
  })().catch(() => {
    openTokenManager();
  });
});
panel.configure({
  workspace: terminal.querySelector(".terminal-body"),
  footer,
  footerHome: terminal,
  eventRoot: terminal,
  withFooterMove: (operation, options) => appearance.withFooterMove(operation, options),
  prepareTarget: (target, options) => catalog.prepareTarget(target, options),
  targetIsCurrent: (prepared) => catalog.targetIsCurrent(prepared),
  acceptTarget: (prepared, shownTarget, options) => catalog.acceptTarget(prepared, shownTarget, options),
  footerTarget: () => catalog.footerTarget,
  getLinkMode: () => preferences.linkMode,
  cycleLinkMode: () => preferences.cycleLinkMode(),
  getOrganizationRootControl: () => preferences.organizationRootControl,
  getSourceHighlightDuration: () => preferences.sourceHighlightDuration,
  targetUsesBranch: (target) => catalog.targetUsesBranch(target),
  followLink: (value, current) => catalog.followLink(value, current),
  shouldHandleLink: (value, current) => catalog.canRouteLink(value, current),
  documentHref: (value, current) => catalog.linkHref(value, current, preferences.linkMode, preferences.organizationRoot),
  linkHref: (target) => catalog.targetHref(target, preferences.linkMode, preferences.organizationRoot)
});
catalog.setPrivateAccess(githubAccess);
catalog.configure({
  panel,
  footer,
  getLinkMode: () => preferences.linkMode,
  getOrganizationRoot: () => preferences.organizationRoot,
  getHistoryTreeMode: () => preferences.historyTreeMode,
  getSearchTreeMode: () => preferences.searchTreeMode
});
preferences.addEventListener("history-tree-mode-change", () => catalog.refreshHistoryTreeMode());
preferences.addEventListener("search-tree-mode-change", () => catalog.refreshSearchTreeMode());
preferences.addEventListener("source-highlight-duration-change", () => panel.refreshSourceHighlightDuration());
preferences.addEventListener("bookmarks-open", () => panel.showBookmarks());
var searchOwner = "catalog";
terminal.addEventListener("focusin", (event) => {
  const path = event.composedPath();
  if (path.includes(catalog))
    searchOwner = "catalog";
  else if (path.includes(panel))
    searchOwner = "file";
});
preferences.addEventListener("search-open", () => {
  if (searchOwner === "catalog")
    catalog.showFind();
  else
    panel.showFind();
});
preferences.addEventListener("search-history-open", () => {
  if (searchOwner === "catalog")
    catalog.showSearchHistory();
  else
    panel.showSearchHistory();
});
preferences.addEventListener("organization-root-open", () => panel.showOrganizationRoot());
for (const type of ["organization-root-change", "link-mode-change"]) {
  preferences.addEventListener(type, () => {
    catalog.refreshLinkMode();
    panel.refreshLinkMode();
  });
}
var pictureInPicture = new PictureInPictureController({
  historyBackEnabled: false,
  opener: displayWindow(terminal),
  terminal,
  workspace: terminal.querySelector(".terminal-body"),
  footer,
  catalog,
  panel,
  preferences,
  appearance
});
preferences.setThemeDocuments([document]);
panel.setPictureInPicture(pictureInPicture);
appearance.setPictureInPicture(pictureInPicture);
var autoUnlockPending = null;
function autoUnlockIfSelected() {
  if (autoUnlockPending)
    return autoUnlockPending;
  if (!octocatAutoRestoreEnabled())
    return Promise.resolve();
  autoUnlockPending = githubAccess.restartWorker().then(() => tokenManager()).then((manager) => manager.autoUnlockSavedPasskey()).catch(() => {}).finally(() => {
    autoUnlockPending = null;
  });
  return autoUnlockPending;
}
var recoveryPending = null;
function recoverOctocat() {
  if (!octocatAutoRestoreEnabled())
    return Promise.resolve();
  if (recoveryPending)
    return recoveryPending;
  recoveryPending = autoUnlockIfSelected().finally(() => {
    recoveryPending = null;
  });
  return recoveryPending;
}
githubAccess.addEventListener("lost", () => {
  recoverOctocat();
});
var hadWorkerSession = githubAccess.hadWorkerSession;
githubAccess.restoreSession().then((restored) => {
  if (restored)
    return;
  if (hadWorkerSession)
    recoverOctocat();
  else
    autoUnlockIfSelected();
}).catch(() => {
  if (hadWorkerSession)
    recoverOctocat();
  else
    autoUnlockIfSelected();
});
var siteReady = preferences.updateComplete.then(() => {
  const updateButton = preferences.shadowRoot?.querySelector("#site-update-header");
  if (!(updateButton instanceof HTMLButtonElement))
    throw new Error("Не найдена кнопка обновления");
  startSiteUpdate(updateButton, footer);
});
export {
  siteReady
};
