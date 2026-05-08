import { ensurePathosRuntime } from './runtime-core.js';

export const registerHeaderRuntime = function(runtimeInput) {
  const runtime = ensurePathosRuntime(runtimeInput);
  const runtimeFlags = runtime.flags;
  if (runtimeFlags.headerMenuHandlersInstalled) {
    return runtime.apis.headerMenu;
  }
  runtimeFlags.headerMenuHandlersInstalled = true;

  const MENU_OPEN_CLASS = 'menu-open';
  const NAV_PENDING_ATTR = 'headerMenuNavigating';
  let lockedScrollY = 0;

  const ensureRuntimeApis = function() {
    runtime.apis = runtime.apis || {};
    runtime.apis.headerMenu = runtime.apis.headerMenu || {};
    runtime.apis.mobileMenu = runtime.apis.mobileMenu || {};
    return runtime.apis;
  };

  const isMobileViewport = function() {
    return window.matchMedia('(max-width: 768px)').matches;
  };

  const isIosWebkit = function() {
    try {
      const ua = navigator.userAgent || '';
      const iOSDevice = /iPhone|iPad|iPod/.test(ua);
      const iPadOsDesktopUa = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
      return iOSDevice || iPadOsDesktopUa;
    } catch (_) {
      return false;
    }
  };

  const getBurger = function() {
    return document.querySelector('.gh-burger');
  };

  const clearPendingNavigation = function() {
    if (!document.body) return;
    delete document.body.dataset[NAV_PENDING_ATTR];
  };

  const isPendingMenuNavigation = function() {
    if (!document.body) return false;
    return document.body.dataset[NAV_PENDING_ATTR] === '1';
  };

  const syncBurgerState = function() {
    if (!document.body) return;
    const burger = getBurger();
    if (!(burger instanceof HTMLButtonElement)) return;
    burger.setAttribute('aria-expanded', document.body.classList.contains(MENU_OPEN_CLASS) ? 'true' : 'false');
  };

  const unlockBodyScroll = function() {
    if (!document.body || document.body.dataset.headerMenuLocked !== '1') return;
    const lockMode = document.body.dataset.headerMenuLockMode || 'fixed';
    document.body.style.overflow = '';
    if (lockMode === 'fixed') {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    }
    document.body.dataset.headerMenuLocked = '0';
    delete document.body.dataset.headerMenuLockMode;
    if (lockMode === 'fixed') {
      window.scrollTo(0, lockedScrollY);
    }
  };

  const lockBodyScroll = function() {
    if (!document.body) return;
    if (!isMobileViewport() || document.body.dataset.headerMenuLocked === '1') return;
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.overflow = 'hidden';
    if (isIosWebkit()) {
      // Fixed body locks can break fixed overlay hit testing near the page bottom on iOS.
      document.body.dataset.headerMenuLockMode = 'overflow';
    } else {
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.style.width = '100%';
      document.body.dataset.headerMenuLockMode = 'fixed';
    }
    document.body.dataset.headerMenuLocked = '1';
  };

  const openMenu = function() {
    if (!document.body) return;
    clearPendingNavigation();
    document.body.classList.add(MENU_OPEN_CLASS);
    lockBodyScroll();
    ensureRuntimeApis().mobileMenu?.syncAccessibility?.();
    syncBurgerState();
  };

  const closeMenu = function() {
    if (!document.body) return;
    clearPendingNavigation();
    document.body.classList.remove(MENU_OPEN_CLASS);
    unlockBodyScroll();
    ensureRuntimeApis().mobileMenu?.syncAccessibility?.();
    syncBurgerState();
  };

  const toggleMenu = function() {
    if (!document.body) return;
    if (document.body.classList.contains(MENU_OPEN_CLASS)) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  ensureRuntimeApis().headerMenu = {
    openMenu: openMenu,
    closeMenu: closeMenu,
    syncBurgerState: syncBurgerState,
  };

  document.addEventListener('click', function(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const burger = target.closest('.gh-burger');
    if (burger) {
      event.preventDefault();
      toggleMenu();
      return;
    }
  });

  document.addEventListener('keydown', function(event) {
    if (!document.body) return;
    if (event.key === 'Escape' && document.body.classList.contains(MENU_OPEN_CLASS)) {
      closeMenu();
    }
  });

  window.addEventListener('resize', function() {
    if (!document.body) return;
    if (!document.body.classList.contains(MENU_OPEN_CLASS)) {
      syncBurgerState();
      unlockBodyScroll();
      return;
    }

    if (isMobileViewport()) {
      lockBodyScroll();
    } else {
      closeMenu();
    }
  });

  document.addEventListener('astro:before-swap', function() {
    if (isPendingMenuNavigation()) return;
    closeMenu();
  });

  document.addEventListener('astro:page-load', function() {
    closeMenu();
    syncBurgerState();
  });

  window.addEventListener('pageshow', clearPendingNavigation);

  syncBurgerState();
  return ensureRuntimeApis().headerMenu;
};
