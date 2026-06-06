const NAV_PENDING_LINK_ATTR = 'data-nav-pending';

function createPendingLinkController() {
  let activeLink = null;

  const isModifiedEvent = function(event) {
    return event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.altKey
      || event.shiftKey;
  };

  const clear = function() {
    if (!(activeLink instanceof HTMLAnchorElement)) {
      activeLink = null;
      return;
    }
    activeLink.removeAttribute(NAV_PENDING_LINK_ATTR);
    activeLink = null;
  };

  const shouldActivate = function(anchor, event) {
    if (!(anchor instanceof HTMLAnchorElement)) return false;
    if (event.defaultPrevented || isModifiedEvent(event)) return false;
    if (anchor.hasAttribute('download')) return false;
    if (anchor.closest('#site-mobile-menu')) return false;

    const target = (anchor.getAttribute('target') || '').trim().toLowerCase();
    if (target && target !== '_self') return false;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return false;

    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (error) {
      return false;
    }

    if (!/^https?:$/.test(url.protocol)) return false;

    const sameDocument = url.origin === window.location.origin
      && url.pathname === window.location.pathname
      && url.search === window.location.search
      && !!url.hash;
    if (sameDocument) return false;

    return true;
  };

  return {
    bind() {
      document.addEventListener('click', function(event) {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest('a[href]');
        if (!shouldActivate(anchor, event)) return;
        if (anchor === activeLink) return;

        clear();
        anchor.setAttribute(NAV_PENDING_LINK_ATTR, 'true');
        activeLink = anchor;
      }, true);
    },
    clear,
  };
}

export const installLifecycleBindings = function(runtime, options) {
  if (runtime.flags.afterSwapBound) return;
  runtime.flags.afterSwapBound = true;

  const startCapabilityRuntimes = options.startCapabilityRuntimes;
  const syncIosShellSpaGuard = typeof options.syncIosShellSpaGuard === 'function'
    ? options.syncIosShellSpaGuard
    : function() {};
  const isIosChromeShell = !!options.isIosChromeShell;
  const pendingLinkController = runtime.shared.pendingLinkController
    || (runtime.shared.pendingLinkController = createPendingLinkController());

  runtime.flags.isPopNavigation = false;

  pendingLinkController.bind();

  window.addEventListener('popstate', function() {
    runtime.flags.isPopNavigation = true;
  });

  document.addEventListener('astro:before-preparation', function(event) {
    try {
      const navType = event && (event.navigationType || event.sourceType);
      const direction = event && event.direction;
      if (navType === 'traverse' || direction === 'back' || direction === 'forward') {
        runtime.flags.isPopNavigation = true;
      }
    } catch (e) {
      // ignore
    }

    try {
      const paginationApi = runtime.apis.pagination || {};
      const cancelPendingScrollSave = paginationApi.cancelPendingScrollSave;
      const savePaginationSnapshot = paginationApi.saveSnapshot;
      if (typeof cancelPendingScrollSave === 'function') {
        cancelPendingScrollSave();
      }
      if (typeof savePaginationSnapshot === 'function') {
        savePaginationSnapshot();
      }
    } catch (e) {
      // ignore
    }
  });

  document.addEventListener('astro:after-swap', function() {
    const shouldRestore = !!runtime.flags.isPopNavigation;
    runtime.flags.isPopNavigation = false;

    startCapabilityRuntimes({
      paginationOptions: { shouldRestore: shouldRestore }
    });

    syncIosShellSpaGuard();
  });

  document.addEventListener('astro:page-load', function() {
    pendingLinkController.clear();
  });

  if (isIosChromeShell) {
    const mediaStateEvents = ['play', 'playing', 'pause', 'ended', 'emptied'];
    mediaStateEvents.forEach(function(evt) {
      document.addEventListener(evt, function(event) {
        const target = event && event.target;
        if (!target || target.id !== 'global-podcast-audio') return;
        syncIosShellSpaGuard();
      }, true);
    });
  }
};
