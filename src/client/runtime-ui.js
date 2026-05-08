import { navigate } from 'astro:transitions/client';

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

    const analytics = window.umami;
    if (!analytics || typeof analytics.track !== 'function') return;

    const body = document.body;
    const pageKind = body?.dataset?.pageKind || 'unknown';
    const lang = (document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'zh';

    try {
      analytics.track('print-page', {
        path: window.location.pathname,
        lang,
        pageKind,
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

export const createMenuToggleInitializer = function(hasImage) {
  return function initMenuToggle() {
    const menuToggle = document.querySelector('.menu-toggle');
    const overlay = document.querySelector('.menu-overlay');
    if (!menuToggle || !overlay || !document.body) {
      return;
    }

    let menuScrollY = 0;

    const newMenuToggle = menuToggle.cloneNode(true);
    const newOverlay = overlay.cloneNode(true);
    menuToggle.parentNode?.replaceChild(newMenuToggle, menuToggle);
    overlay.parentNode?.replaceChild(newOverlay, overlay);

    const freshMenuToggle = document.querySelector('.menu-toggle');
    const freshOverlay = document.querySelector('.menu-overlay');
    if (!(freshMenuToggle instanceof HTMLElement) || !(freshOverlay instanceof HTMLElement)) {
      return;
    }

    const isMenuOpen = document.body.classList.contains('menu-open');
    freshMenuToggle.setAttribute('aria-expanded', isMenuOpen ? 'true' : 'false');

    freshMenuToggle.addEventListener('click', function() {
      const isOpening = !document.body.classList.contains('menu-open');
      document.body.classList.toggle('menu-open');
      freshMenuToggle.setAttribute('aria-expanded', isOpening ? 'true' : 'false');

      if (hasImage) {
        document.body.classList.toggle('menu-open-with-image');
      }

      if (window.matchMedia('(max-width: 768px)').matches) {
        if (isOpening) {
          menuScrollY = window.scrollY || window.pageYOffset;
          document.body.style.overflow = 'hidden';
          document.body.style.position = 'fixed';
          document.body.style.top = `-${menuScrollY}px`;
          document.body.style.width = '100%';
        } else {
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          window.scrollTo(0, menuScrollY);
        }
      }
    });

    freshOverlay.addEventListener('click', function() {
      document.body.classList.remove('menu-open');
      if (hasImage) {
        document.body.classList.remove('menu-open-with-image');
      }

      const latestMenuToggle = document.querySelector('.menu-toggle');
      if (latestMenuToggle instanceof HTMLElement) {
        latestMenuToggle.setAttribute('aria-expanded', 'false');
      }

      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (window.matchMedia('(max-width: 768px)').matches) {
        window.scrollTo(0, menuScrollY);
      }
    });
  };
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
    try {
      if (typeof navigate === 'function') {
        navigate(pathname);
        return;
      }
    } catch (e) {
      // fallback below
    }
    window.location.href = pathname;
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

export const installScrollTopButton = function(runtime) {
  if (runtime.flags.scrollTopButtonInstalled) return;
  runtime.flags.scrollTopButtonInstalled = true;

  const getScrollTopButton = function() {
    const button = document.querySelector('.scroll-top');
    return button instanceof HTMLElement ? button : null;
  };

  const toggleVisibility = function() {
    const scrollTopBtn = getScrollTopButton();
    if (!scrollTopBtn) return;
    if (window.pageYOffset > 300) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  };

  window.addEventListener('scroll', toggleVisibility);
  window.addEventListener('astro:page-load', toggleVisibility);
  toggleVisibility();

  document.addEventListener('click', function(event) {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.scroll-top')) return;
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
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
