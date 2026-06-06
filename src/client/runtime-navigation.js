import { navigate } from 'astro:transitions/client';
import { detectIosChromeShell, isPodcastPlaying } from './runtime-core.js';

const resolveNavigationUrl = function(target) {
  try {
    return new URL(target, window.location.href);
  } catch (error) {
    return null;
  }
};

const isSameDocumentHashNavigation = function(url) {
  return url.pathname === window.location.pathname
    && url.search === window.location.search
    && !!url.hash;
};

export const stopCurrentPageLoads = function() {
  try {
    window.stop();
  } catch (error) {
    // ignore browsers that do not support stopping in-flight subresource loads
  }
};

export const performImmediateNavigation = function(target, options = {}) {
  const resolved = resolveNavigationUrl(target);
  if (!resolved) {
    window.location.href = target;
    return;
  }

  const sameOrigin = resolved.origin === window.location.origin;
  const isHttpNavigation = /^https?:$/.test(resolved.protocol);
  const nextHref = `${resolved.pathname}${resolved.search}${resolved.hash}`;

  stopCurrentPageLoads();

  if (!sameOrigin || !isHttpNavigation) {
    if (options.replace) {
      window.location.replace(resolved.href);
    } else {
      window.location.href = resolved.href;
    }
    return;
  }

  if (isSameDocumentHashNavigation(resolved)) {
    if (options.replace) {
      window.location.replace(nextHref);
    } else {
      window.location.href = nextHref;
    }
    return;
  }

  if (detectIosChromeShell() && !isPodcastPlaying()) {
    if (options.replace) {
      window.location.replace(nextHref);
    } else {
      window.location.href = nextHref;
    }
    return;
  }

  if (typeof navigate === 'function') {
    navigate(nextHref, options.replace ? { history: 'replace' } : undefined);
    return;
  }

  if (options.replace) {
    window.location.replace(nextHref);
  } else {
    window.location.href = nextHref;
  }
};
