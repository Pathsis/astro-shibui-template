import { registerHeaderRuntime } from './header-runtime.js';
import { registerMobileMenuRuntime } from './mobile-menu-runtime.js';
import {
  ensurePathosRuntime,
  normalizePathname,
  hasPaginatedFeed,
  detectIosChromeShell,
  createIosShellSpaGuardSync,
  getInitialShouldRestore,
  trackUmami,
} from './runtime-core.js';
import { getClientRuntimeConfig } from './runtime-config.js';
import {
  installUmamiAnalytics,
  installClarityAnalytics,
} from './runtime-analytics.js';
import { createRuntimeModuleLoader } from './runtime-modules.js';
import {
  shouldAutoloadPodcastPlayer,
  installPodcastLazyPlayBridge,
} from './runtime-podcast-lazy.js';
import {
  createMenuToggleInitializer,
  installSearchShortcut,
  installPrintLinkSanitizer,
  installScrollTopButton,
  installGithubCornerTouch,
  sanitizeLocationHash,
  installOutboundLinkTracking,
  installPrintTracking,
} from './runtime-ui.js';
import { installLifecycleBindings } from './runtime-lifecycle.js';

const bootstrapMainRuntime = function() {
  const runtime = ensurePathosRuntime();
  if (runtime.flags.mainRuntimeBootstrapped) return;
  runtime.flags.mainRuntimeBootstrapped = true;

  const config = getClientRuntimeConfig();
  runtime.shared.normalizePathname = normalizePathname;
  runtime.shared.hasPaginatedFeed = hasPaginatedFeed;
  runtime.shared.trackUmami = trackUmami;

  registerMobileMenuRuntime(runtime);
  registerHeaderRuntime(runtime);

  const isIosChromeShell = detectIosChromeShell();
  const syncIosShellSpaGuard = createIosShellSpaGuardSync(isIosChromeShell);
  runtime.shared.syncIosShellSpaGuard = syncIosShellSpaGuard;

  const loadRuntimeModule = createRuntimeModuleLoader(runtime);

  installPodcastLazyPlayBridge(runtime, loadRuntimeModule);
  if (shouldAutoloadPodcastPlayer()) {
    loadRuntimeModule('podcastPlayer').catch(function(error) {
      console.error('Failed to auto-load podcast player runtime:', error);
    });
  }

  const initCapabilityRuntimes = async function(options = {}) {
    const paginationOptions = options.paginationOptions || {};
    const isArticlePage = document.body?.dataset?.pageKind === 'article';
    const initCapability = async function(name, loadAndInit) {
      try {
        await loadAndInit();
      } catch (error) {
        console.error(`Failed to initialize ${name} runtime:`, error);
      }
    };

    if (document.querySelector('.featured-card-wall')) {
      await initCapability('featured', async function() {
        await loadRuntimeModule('featured');
        runtime.apis.featured?.init?.();
      });
    }

    if (hasPaginatedFeed()) {
      await initCapability('pagination', async function() {
        await loadRuntimeModule('pagination');
        runtime.apis.pagination?.init?.(paginationOptions);
      });
    }

    if (isArticlePage || runtime.apis.article?.init) {
      await initCapability('article', async function() {
        if (!runtime.apis.article?.init && isArticlePage) {
          await loadRuntimeModule('article');
        }
        runtime.apis.article?.init?.();
      });
    }
  };

  runtime.apis.initCapabilityRuntimes = initCapabilityRuntimes;

  const startCapabilityRuntimes = function(options = {}) {
    initCapabilityRuntimes(options).catch(function(err) {
      console.error('Failed to initialize capability runtimes:', err);
    });
  };

  startCapabilityRuntimes({
    paginationOptions: { shouldRestore: getInitialShouldRestore() }
  });

  syncIosShellSpaGuard();

  const hasLegacyCoverMenu = !!document.querySelector('.menu-toggle') && !!document.querySelector('.menu-overlay');
  if (hasLegacyCoverMenu) {
    const hasImage = !!document.querySelector('.cover-left img');
    const initMenuToggle = createMenuToggleInitializer(hasImage);
    runtime.apis.initMenuToggle = initMenuToggle;
    initMenuToggle();
  }

  installUmamiAnalytics(runtime, config);
  installClarityAnalytics(runtime, config);
  installOutboundLinkTracking(runtime, trackUmami);
  installPrintTracking(runtime);
  installSearchShortcut(runtime);
  installPrintLinkSanitizer(runtime);
  installLifecycleBindings(runtime, {
    startCapabilityRuntimes,
    syncIosShellSpaGuard,
    isIosChromeShell,
  });
  installScrollTopButton(runtime);
  installGithubCornerTouch(runtime);
  sanitizeLocationHash(runtime);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapMainRuntime, { once: true });
} else {
  bootstrapMainRuntime();
}
