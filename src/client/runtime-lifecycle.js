export const installLifecycleBindings = function(runtime, options) {
  if (runtime.flags.afterSwapBound) return;
  runtime.flags.afterSwapBound = true;

  const startCapabilityRuntimes = options.startCapabilityRuntimes;
  const syncIosShellSpaGuard = options.syncIosShellSpaGuard;
  const isIosChromeShell = options.isIosChromeShell;

  runtime.flags.isPopNavigation = false;

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

    if (runtime.apis.initMenuToggle) {
      runtime.apis.initMenuToggle();
    }

    syncIosShellSpaGuard();
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
