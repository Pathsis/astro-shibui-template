import { trackUmami } from '../lib/analytics';
import { performImmediateNavigation } from './runtime-navigation.js';

export const installOutboundLinkTracking = function(runtime, trackUmami) {
  if (runtime.flags.outboundTrackingInstalled) return;
  runtime.flags.outboundTrackingInstalled = true;

  document.addEventListener('click', function(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    let isOutbound = false;
    try {
      const url = new URL(href || '', window.location.href);
      isOutbound = url.protocol.startsWith('http') && url.origin !== window.location.origin;
    } catch (e) {
      return;
    }
    if (isOutbound) {
      trackUmami('outbound-link', {
        url: href,
        text: link.textContent.trim().substring(0, 50)
      });
    }
  });
};

export const installPrintTracking = function(runtime) {
  if (runtime.flags.printTrackingInstalled) return;
  runtime.flags.printTrackingInstalled = true;

  const dedupeMs = 3000;
  let lastTrackedAt = 0;

  const trackPrint = function() {
    const now = Date.now();
    if (now - lastTrackedAt < dedupeMs) return;
    lastTrackedAt = now;

    try {
      trackUmami('print-page', {
        source: 'browser-print',
      });
    } catch {
      // ignore analytics errors
    }
  };

  window.addEventListener('beforeprint', trackPrint);

  const media = window.matchMedia?.('print');
  if (media && typeof media.addEventListener === 'function') {
    media.addEventListener('change', function(event) {
      if (event.matches) trackPrint();
    });
  } else if (media) {
    const legacyMedia = /** @type {any} */ (media);
    if (typeof legacyMedia.addListener === 'function') {
      legacyMedia.addListener(function(event) {
        if (event.matches) trackPrint();
      });
    }
  }
};

export const installSearchShortcut = function(runtime) {
  if (runtime.flags.searchShortcutInstalled) return;
  runtime.flags.searchShortcutInstalled = true;

  const focusKey = 'pathos-search-focus-once';
  const normalizePath = function(path) {
    return path.endsWith('/') ? path : `${path}/`;
  };
  const getBlogPath = function() {
    return window.location.pathname.startsWith('/en/') ? '/en/blog/' : '/blog/';
  };
  const navigateTo = function(pathname) {
    performImmediateNavigation(pathname);
  };
  const isEditableTarget = function(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest('input, textarea, select')) return true;
    if (target.closest('[role="textbox"]')) return true;
    if (target.closest('[contenteditable], [contenteditable="true"], [contenteditable="plaintext-only"]')) return true;
    return false;
  };
  const focusExistingInput = function() {
    const input = document.querySelector("input[data-search-input='true']");
    if (!(input instanceof HTMLInputElement)) return false;
    input.focus();
    return true;
  };
  const markPendingFocus = function() {
    try {
      window.sessionStorage.setItem(focusKey, '1');
    } catch {
      // ignore storage errors
    }
  };
  const consumePendingFocus = function() {
    try {
      if (window.sessionStorage.getItem(focusKey) !== '1') return;
      if (focusExistingInput()) {
        window.sessionStorage.removeItem(focusKey);
        return;
      }
      let retry = 0;
      const maxRetry = 20;
      const tick = function() {
        if (focusExistingInput()) {
          window.sessionStorage.removeItem(focusKey);
          return;
        }
        retry += 1;
        if (retry < maxRetry) {
          window.setTimeout(tick, 50);
        }
      };
      window.setTimeout(tick, 50);
    } catch {
      // ignore storage errors
    }
  };

  consumePendingFocus();
  window.addEventListener('astro:page-load', consumePendingFocus);

  document.addEventListener('keydown', function(event) {
    const isK = String(event.key || '').toLowerCase() === 'k';
    if (!isK || !(event.metaKey || event.ctrlKey)) return;
    if (event.isComposing) return;
    if (isEditableTarget(event.target)) return;
    event.preventDefault();

    const target = normalizePath(getBlogPath());
    const current = normalizePath(window.location.pathname);
    if (current === target) {
      if (!focusExistingInput()) {
        markPendingFocus();
      }
      return;
    }

    markPendingFocus();
    navigateTo(target);
  });
};

export const installRssCopyButtons = function(runtime) {
  if (runtime.flags.rssCopyButtonsInstalled) return;
  runtime.flags.rssCopyButtonsInstalled = true;

  const resetTimers = new WeakMap();
  const writeClipboard = async function(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Fall through to the legacy copy path when browser permissions reject.
      }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const didCopy = document.execCommand('copy');
    textarea.remove();
    if (!didCopy) {
      throw new Error('Clipboard copy failed');
    }
  };
  const showResult = function(button, state) {
    const label = button.querySelector('.rss-copy-button-label');
    if (!label) return;

    const previousTimer = resetTimers.get(button);
    if (previousTimer) window.clearTimeout(previousTimer);

    const isSuccess = state === 'success';
    label.textContent = isSuccess
      ? button.dataset.copiedLabel
      : button.dataset.copyFailedLabel;
    button.dataset.copyState = state;

    const timer = window.setTimeout(function() {
      label.textContent = button.dataset.copyLabel || '';
      delete button.dataset.copyState;
      resetTimers.delete(button);
    }, 1800);
    resetTimers.set(button, timer);
  };

  document.addEventListener('click', async function(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest('button[data-rss-copy]');
    if (!(button instanceof HTMLButtonElement)) return;

    const feedPath = button.dataset.rssCopy;
    if (!feedPath) return;

    try {
      const feedUrl = new URL(feedPath, window.location.origin).href;
      await writeClipboard(feedUrl);
      showResult(button, 'success');
    } catch {
      showResult(button, 'error');
    }
  });
};

export const installImmediateNavigationGuard = function(runtime) {
  if (runtime.flags.immediateNavigationGuardInstalled) return;
  runtime.flags.immediateNavigationGuardInstalled = true;

  const leavesWindow = function(event) {
    return (event.button && event.button !== 0)
      || event.metaKey
      || event.ctrlKey
      || event.altKey
      || event.shiftKey;
  };

  document.addEventListener('click', function(event) {
    if (event.defaultPrevented || leavesWindow(event)) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.hasAttribute('download')) return;

    const rawTarget = (anchor.getAttribute('target') || '').trim().toLowerCase();
    if (rawTarget && rawTarget !== '_self') return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (error) {
      return;
    }

    if (url.origin !== window.location.origin) return;
    if (!/^https?:$/.test(url.protocol)) return;

    const sameDocument = url.pathname === window.location.pathname
      && url.search === window.location.search
      && !!url.hash;
    if (sameDocument) return;

    event.preventDefault();
    performImmediateNavigation(url.href, {
      replace: anchor.dataset.astroHistory === 'replace',
    });
  }, true);
};

export const installPrintLinkSanitizer = function(runtime) {
  if (runtime.flags.printLinkSanitizerInstalled) return;
  runtime.flags.printLinkSanitizerInstalled = true;

  const attr = 'data-print-href';

  const shouldHandle = function() {
    return document.body?.dataset?.pageKind === 'article';
  };

  const stripLinksForPrint = function() {
    if (!shouldHandle()) return;

    const anchors = document.querySelectorAll('.gh-content a[href]');
    anchors.forEach(function(anchor) {
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      if (!anchor.hasAttribute(attr)) {
        anchor.setAttribute(attr, href);
      }
      anchor.removeAttribute('href');
    });
  };

  const restoreLinksAfterPrint = function() {
    const anchors = document.querySelectorAll(`.gh-content a[${attr}]`);
    anchors.forEach(function(anchor) {
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute(attr);
      if (href) {
        anchor.setAttribute('href', href);
      }
      anchor.removeAttribute(attr);
    });
  };

  window.addEventListener('beforeprint', stripLinksForPrint);
  window.addEventListener('afterprint', restoreLinksAfterPrint);

  const media = window.matchMedia?.('print');
  if (media && typeof media.addEventListener === 'function') {
    media.addEventListener('change', function(event) {
      if (event.matches) {
        stripLinksForPrint();
      } else {
        restoreLinksAfterPrint();
      }
    });
  } else if (media) {
    const legacyMedia = /** @type {any} */ (media);
    if (typeof legacyMedia.addListener === 'function') {
      legacyMedia.addListener(function(event) {
        if (event.matches) {
          stripLinksForPrint();
        } else {
          restoreLinksAfterPrint();
        }
      });
    }
  }
};

export const installInternalContentReloadGuard = function(runtime) {
  if (runtime.flags.internalContentReloadGuardInstalled) return;
  runtime.flags.internalContentReloadGuardInstalled = true;

  const shouldForceReload = function(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return false;
    if (anchor.hasAttribute('data-astro-reload')) return false;
    if (anchor.hasAttribute('download')) return false;

    const target = (anchor.getAttribute('target') || '').trim().toLowerCase();
    if (target && target !== '_self') return false;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return false;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch (e) {
      return false;
    }

    if (url.origin !== window.location.origin) return false;
    if (!/^https?:$/.test(url.protocol)) return false;

    const sameDocument = url.pathname === window.location.pathname
      && url.search === window.location.search
      && !!url.hash;
    if (sameDocument) return false;

    return true;
  };

  const sync = function() {
    const anchors = document.querySelectorAll('.gh-content a[href]');
    anchors.forEach(function(anchor) {
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!shouldForceReload(anchor)) return;
      anchor.setAttribute('data-astro-reload', '');
    });
  };

  sync();
  document.addEventListener('astro:page-load', sync);
};

export const installGithubCornerTouch = function(runtime) {
  if (runtime.flags.githubCornerTouchInstalled) return;
  runtime.flags.githubCornerTouchInstalled = true;

  const githubCorner = document.querySelector('.github-corner');
  if (!(githubCorner instanceof HTMLElement)) return;

  githubCorner.addEventListener('touchstart', function() {
    githubCorner.classList.add('touch-active');
  });
  githubCorner.addEventListener('touchend', function() {
    githubCorner.classList.remove('touch-active');
  });
};

export const sanitizeLocationHash = function(runtime) {
  if (runtime.flags.locationHashSanitized) return;
  runtime.flags.locationHashSanitized = true;

  const hash = window.location.hash;
  if (!hash) return;
  const rawHash = hash.slice(1);

  let decodedHash = rawHash;
  try {
    decodedHash = decodeURIComponent(rawHash);
  } catch (_) {
    // Keep the original hash when decoding fails.
  }

  // Preserve existing anchors verbatim, including non-ASCII heading ids.
  if (document.getElementById(rawHash) || document.getElementById(decodedHash)) {
    return;
  }

  const cleanHash = rawHash.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (cleanHash && cleanHash !== rawHash) {
    history.replaceState(window.history.state, '', '#' + encodeURI(cleanHash));
  }
};
