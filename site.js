/* Hash navigation enhances native disclosures; content remains usable without JS. */
(() => {
  "use strict";

  let pendingScroll = 0;
  const legacyTargets = {
    "ai-security": "selected-work",
    "work": "selected-work",
    "foundation": "background",
    "about": "background",
    "expertise": "background",
    "experience": "background-details",
    "boards": "resources",
    "agent-controls": "pentest-arsenal",
    "security-operations": "vulnerability-disclosure",
    "applied-ai": "internal-ai-delivery",
    "platforms": "message360"
  };

  function targetFor(hash) {
    if (!hash || hash === "#") return null;
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch (_) {
      // A literal percent sign can still be part of an element ID.
    }
    return document.getElementById(id) ||
      document.getElementById(legacyTargets[id] || "");
  }

  function reveal(target) {
    for (let node = target; node; node = node.parentElement) {
      if (node.tagName === "DETAILS") node.open = true;
    }
  }

  function focusTarget(target) {
    const focusable = target.tagName === "DETAILS"
      ? Array.from(target.children).find(node => node.tagName === "SUMMARY")
      : target.matches("h1,h2,h3,h4,h5,h6,a[href],button,input,select,textarea,summary,[tabindex]")
        ? target
        : target.querySelector("h1,h2,h3,h4,h5,h6") || target;

    if (!focusable) return;
    if (focusable.tabIndex < 0 && !focusable.hasAttribute("tabindex")) {
      focusable.setAttribute("tabindex", "-1");
      focusable.addEventListener("blur", () => {
        focusable.removeAttribute("tabindex");
      }, { once: true });
    }
    focusable.focus({ preventScroll: true });
  }

  function scrollTarget(target, smooth) {
    if (smooth) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // "auto" otherwise inherits the page's CSS smooth-scrolling preference.
    const style = (document.scrollingElement || document.documentElement).style;
    const previous = style.getPropertyValue("scroll-behavior");
    const priority = style.getPropertyPriority("scroll-behavior");
    style.setProperty("scroll-behavior", "auto", "important");
    try {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    } finally {
      if (previous) style.setProperty("scroll-behavior", previous, priority);
      else style.removeProperty("scroll-behavior");
    }
  }

  function navigate(hash, { smooth = false, focus = false } = {}) {
    window.cancelAnimationFrame(pendingScroll);
    const target = targetFor(hash);
    if (!target) return;
    reveal(target);
    pendingScroll = window.requestAnimationFrame(() => {
      if (focus) focusTarget(target);
      scrollTarget(target, smooth);
    });
  }

  function handleLink(event) {
    if (event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target instanceof Element
      ? event.target.closest("a[href]")
      : null;
    if (!link || link.hasAttribute("download") ||
        (link.target && link.target !== "_self")) return;

    const url = new URL(link.href, window.location.href);
    if (!url.hash || url.origin !== window.location.origin ||
        url.pathname !== window.location.pathname ||
        url.search !== window.location.search || !targetFor(url.hash)) return;

    // pushState preserves Back/Forward without triggering a second hash scroll.
    if (url.hash !== window.location.hash) {
      try {
        window.history.pushState(null, "", url.href);
      } catch (_) {
        reveal(targetFor(url.hash));
        return; // Keep native navigation available if history cannot be updated.
      }
    }
    event.preventDefault();
    navigate(url.hash, {
      smooth: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      focus: true
    });
  }

  function init() {
    const canonicalId = legacyTargets[window.location.hash.slice(1)];
    if (canonicalId) {
      // Give the browser a real anchor before its initial fragment navigation.
      window.history.replaceState(null, "", `#${canonicalId}`);
    }
    document.addEventListener("click", handleLink);
    window.addEventListener("hashchange", () => navigate(window.location.hash));
    navigate(window.location.hash);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
