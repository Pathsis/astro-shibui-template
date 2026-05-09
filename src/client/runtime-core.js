import { trackUmami } from '../lib/analytics';

export { trackUmami };

export const ensurePathosRuntime = function(runtimeInput) {
  const globalRuntime = runtimeInput || window.pathosRuntime || {};
  globalRuntime.shared = globalRuntime.shared || {};
  globalRuntime.modules = globalRuntime.modules || {};
  globalRuntime.modules.promises = globalRuntime.modules.promises || {};
  globalRuntime.apis = globalRuntime.apis || {};
  globalRuntime.apis.pagination = globalRuntime.apis.pagination || {};
  globalRuntime.apis.article = globalRuntime.apis.article || {};
  globalRuntime.apis.featured = globalRuntime.apis.featured || {};
  globalRuntime.apis.headerMenu = globalRuntime.apis.headerMenu || {};
  globalRuntime.apis.mobileMenu = globalRuntime.apis.mobileMenu || {};
  globalRuntime.apis.podcastPlayer = globalRuntime.apis.podcastPlayer || {};
  globalRuntime.flags = globalRuntime.flags || {};
  window.pathosRuntime = globalRuntime;
  return globalRuntime;
};

export const normalizePathname = function(path) {
  if (!path) return '/';
  let normalized = path;
  try {
    normalized = new URL(path, window.location.origin).pathname;
  } catch (e) {
    normalized = path;
  }
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  return normalized.endsWith('/') ? normalized : normalized + '/';
};

export const hasPaginatedFeed = function() {
  return !!document.querySelector('.shibui-feed');
};

export const detectIosChromeShell = function() {
  try {
    const ua = (navigator && navigator.userAgent) || '';
    const isIos = /iPhone|iPad|iPod/.test(ua);
    if (!isIos) return false;
    return /CriOS\//.test(ua);
  } catch (e) {
    return false;
  }
};

const isPodcastPlaying = function() {
  try {
    const audio = document.getElementById('global-podcast-audio');
    return !!(audio && !audio.paused && !audio.ended);
  } catch (e) {
    return false;
  }
};

export const createIosShellSpaGuardSync = function(isIosChromeShell) {
  return function syncIosShellSpaGuard() {
    if (!isIosChromeShell) return;
    const shouldReload = !isPodcastPlaying();
    const guardAttr = 'data-pathos-ios-shell-reload';
    document.querySelectorAll('a[href]').forEach(function(link) {
      try {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;
      } catch (e) {
        return;
      }
      if (shouldReload) {
        if (!link.hasAttribute('data-astro-reload')) {
          link.setAttribute('data-astro-reload', '');
          link.setAttribute(guardAttr, '');
        }
      } else if (link.hasAttribute(guardAttr)) {
        link.removeAttribute('data-astro-reload');
        link.removeAttribute(guardAttr);
      }
    });
  };
};

export const getInitialShouldRestore = function() {
  try {
    const navEntry = performance && performance.getEntriesByType
      ? performance.getEntriesByType('navigation')[0]
      : null;
    return !!(navEntry && navEntry.type === 'back_forward');
  } catch (e) {
    return false;
  }
};
