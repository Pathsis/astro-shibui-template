import { ensurePathosRuntime } from './runtime-core.js';

export const registerMobileMenuRuntime = function(runtimeInput) {
  const runtime = ensurePathosRuntime(runtimeInput);
  const runtimeFlags = runtime.flags;
  if (runtimeFlags.mobileMenuHandlersInstalled) {
    return runtime.apis.mobileMenu;
  }
  runtimeFlags.mobileMenuHandlersInstalled = true;

  const MOBILE_QUERY = '(max-width: 768px)';
  const NAV_PENDING_ATTR = 'headerMenuNavigating';
  const MENU_SELECTOR = '#site-mobile-menu';

  const ensureRuntimeApis = function() {
    runtime.apis = runtime.apis || {};
    runtime.apis.headerMenu = runtime.apis.headerMenu || {};
    runtime.apis.mobileMenu = runtime.apis.mobileMenu || {};
    return runtime.apis;
  };

  const getMobileMenu = function() {
    return document.querySelector(MENU_SELECTOR);
  };

  const isMobileViewport = function() {
    return window.matchMedia(MOBILE_QUERY).matches;
  };

  const clearPendingState = function() {
    if (!document.body) return;
    delete document.body.dataset[NAV_PENDING_ATTR];
  };

  const syncMenuAccessibility = function() {
    if (!document.body) return;
    const menu = getMobileMenu();
    if (!(menu instanceof HTMLElement)) return;

    const isExposed = document.body.classList.contains('menu-open')
      || document.body.dataset[NAV_PENDING_ATTR] === '1';

    if (!isExposed) {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && menu.contains(activeElement)) {
        activeElement.blur();
      }
    }

    menu.setAttribute('aria-hidden', isExposed ? 'false' : 'true');
    if (isExposed) {
      menu.removeAttribute('inert');
    } else {
      menu.setAttribute('inert', '');
    }
  };

  ensureRuntimeApis().mobileMenu = {
    syncAccessibility: syncMenuAccessibility,
  };

  const closeHeaderMenu = function() {
    if (!document.body) return;
    const closeMenu = ensureRuntimeApis().headerMenu?.closeMenu;
    if (typeof closeMenu === 'function') {
      closeMenu();
      syncMenuAccessibility();
      return;
    }

    document.body.classList.remove('menu-open');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    syncMenuAccessibility();
  };

  const shouldHandleWithDocumentNavigation = function(link, url) {
    if (!isMobileViewport()) return false;
    if (!(link instanceof HTMLAnchorElement)) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    return url.origin === window.location.origin;
  };

  document.addEventListener('click', function(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest(`${MENU_SELECTOR} a[href]`);
    if (!(link instanceof HTMLAnchorElement)) return;

    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (_) {
      return;
    }

    if (!shouldHandleWithDocumentNavigation(link, url)) return;

    const isSameDocument = url.origin === window.location.origin
      && url.pathname === window.location.pathname
      && url.search === window.location.search;

    if (isSameDocument) {
      clearPendingState();
      closeHeaderMenu();
      return;
    }

    if (!document.body) return;
    document.body.dataset[NAV_PENDING_ATTR] = '1';
    document.body.classList.add('menu-open');
    syncMenuAccessibility();
  });

  document.addEventListener('astro:page-load', function() {
    clearPendingState();
    syncMenuAccessibility();
  });

  window.addEventListener('pageshow', function() {
    clearPendingState();
    syncMenuAccessibility();
  });

  const menu = getMobileMenu();
  if (menu instanceof HTMLElement) {
    menu.addEventListener('touchmove', function(event) {
      if (!document.body) return;
      if (!document.body.classList.contains('menu-open') && document.body.dataset[NAV_PENDING_ATTR] !== '1') return;
      event.preventDefault();
    }, { passive: false });
  }

  if (typeof MutationObserver !== 'undefined' && document.body) {
    const pendingDataAttr = `data-${NAV_PENDING_ATTR.replace(/[A-Z]/g, function(match) {
      return `-${match.toLowerCase()}`;
    })}`;
    const observer = new MutationObserver(syncMenuAccessibility);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', pendingDataAttr],
    });
  }

  syncMenuAccessibility();
  return ensureRuntimeApis().mobileMenu;
};
