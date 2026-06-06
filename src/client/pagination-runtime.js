import { ensurePathosRuntime } from './runtime-core.js';

export const registerPaginationRuntime = function(runtimeInput) {
  // 主存储键：挂在 history.state 上，与当前 history entry 绑定
  const PAGINATION_KEY = 'pathosPagination';
  const NAV_PENDING_LINK_ATTR = 'data-nav-pending';

  // iOS Chrome 的全站 SPA/MPA 降级开关由 main.js 维护
  // (IS_IOS_CHROME_SHELL / syncIosShellSpaGuard)；这里仅在 loadmore
  // 追加新条目后调用 pathosRuntime.shared.syncIosShellSpaGuard 触发一次同步。
  // history.state 写入失败或被外部清除时的兜底
  const FALLBACK_PREFIX = 'pathos_pagination_fallback:v4:';
  // 兜底条目的硬过期时间（5 分钟）
  const FALLBACK_MAX_AGE = 5 * 60 * 1000;
  // 快照自身的硬过期时间，防止极端情况下把很久以前的 HTML 贴回来
  const SNAPSHOT_MAX_AGE = 60 * 60 * 1000;

  const runtime = ensurePathosRuntime(runtimeInput);
  const runtimeShared = runtime.shared || {};
  const paginationApi = runtime.apis.pagination;
  const runtimeFlags = runtime.flags;

  const normalizePathname = runtimeShared.normalizePathname || function(path) {
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
  const hasPaginatedFeed = runtimeShared.hasPaginatedFeed || function() {
    return !!document.querySelector('.shibui-feed');
  };
  const layoutFeaturedMasonry = function() {
    const layout = runtime.apis.featured && runtime.apis.featured.layoutMasonry;
    if (typeof layout === 'function') {
      try { layout(); } catch (e) {}
    }
  };
  const trackUmami = runtimeShared.trackUmami || function() {};
  const syncIosShellSpaGuard = function() {
    const sync = runtimeShared.syncIosShellSpaGuard;
    if (typeof sync === 'function') {
      sync();
    }
  };
  const getPaginationSaveTimeout = function() {
    return runtimeFlags.paginationSaveTimeout || null;
  };
  const setPaginationSaveTimeout = function(timeoutHandle) {
    runtimeFlags.paginationSaveTimeout = timeoutHandle || null;
  };

  function getLang() {
    return document.documentElement.lang || 'zh-cn';
  }

  function getCurrentPaginationPath() {
    const feed = document.querySelector('.shibui-feed');
    return normalizePathname(
      feed && feed.getAttribute('data-pagination-key')
        ? feed.getAttribute('data-pagination-key')
        : window.location.pathname,
    );
  }

  function getFallbackKey(path) {
    return `${FALLBACK_PREFIX}${getLang()}:${normalizePathname(path || getCurrentPaginationPath())}`;
  }

  function createSanitizedFeedHtml(feed) {
    if (!(feed instanceof Element)) return '';

    const clone = feed.cloneNode(true);
    if (!(clone instanceof Element)) {
      return feed.innerHTML;
    }

    clone.querySelectorAll(`[${NAV_PENDING_LINK_ATTR}]`).forEach(function(node) {
      node.removeAttribute(NAV_PENDING_LINK_ATTR);
    });

    return clone.innerHTML;
  }

  function completeLoadMoreButton(button) {
    if (!button) return;
    const completeText = button.getAttribute('data-complete-text');
    if (!completeText) {
      button.remove();
      return;
    }

    button.textContent = completeText;
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.removeAttribute('aria-busy');
    button.removeAttribute('data-loading');
    button.removeAttribute('data-next-url');
  }

  function setLoadMoreButtonLoading(button, isLoading) {
    if (!button) return;
    const idleText = button.getAttribute('data-idle-text');
    const loadingText = button.getAttribute('data-loading-text') || idleText || '';

    if (isLoading) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('data-loading', 'true');
      if (loadingText) button.textContent = loadingText;
      return;
    }

    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.removeAttribute('data-loading');
    if (idleText) button.textContent = idleText;
  }

  // ---------- history.state 读写 ----------
  function readHistoryState() {
    try {
      return (history.state && history.state[PAGINATION_KEY]) || null;
    } catch (e) {
      return null;
    }
  }

  function writeHistoryState(snap) {
    try {
      const next = Object.assign({}, history.state || {});
      next[PAGINATION_KEY] = snap;
      history.replaceState(next, '');
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- sessionStorage 兜底 ----------
  function readFallback() {
    try {
      const raw = sessionStorage.getItem(getFallbackKey());
      if (!raw) return null;
      const snap = JSON.parse(raw);
      if (!snap || !snap.ts || Date.now() - snap.ts > FALLBACK_MAX_AGE) {
        sessionStorage.removeItem(getFallbackKey());
        return null;
      }
      return snap;
    } catch (e) {
      return null;
    }
  }

  function writeFallback(snap) {
    try {
      sessionStorage.setItem(getFallbackKey(), JSON.stringify(snap));
    } catch (e) {
      // ignore quota / disabled storage
    }
  }

  // ---------- 快照构建 ----------
  function snapshotFromDOM() {
    const feed = document.querySelector('.shibui-feed');
    if (!feed) return null;

    const nextLink = document.querySelector('link[rel="next"]');
    const loadMoreBtn = document.querySelector('.shibui-loadmore');

    return {
      itemCount: feed.children.length,
      html: createSanitizedFeedHtml(feed),
      signature: feed.getAttribute('data-pagination-signature') || '',
      version: feed.getAttribute('data-pagination-version') || '',
      path: getCurrentPaginationPath(),
      nextUrl: nextLink ? nextLink.href : null,
      hasLoadMore: !!loadMoreBtn,
      scrollY: window.scrollY || window.pageYOffset || 0,
      ts: Date.now(),
    };
  }

  // 取消挂起的 scroll 节流定时器。调用方：
  //   1) savePaginationSnapshot（写了完整快照后，增量 scroll 写就没意义了）
  //   2) astro:before-preparation（导航一开始就禁止任何异步 replaceState 跑出来，
  //      避免它在 fetch / swap / pushState 期间跨 entry 写入）
  function cancelPendingScrollSave() {
    try {
      const timeoutHandle = getPaginationSaveTimeout();
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        setPaginationSaveTimeout(null);
      }
    } catch (e) {}
  }
  paginationApi.cancelPendingScrollSave = cancelPendingScrollSave;

  // 完整快照：写 history.state 为主，失败时写 sessionStorage 兜底
  function savePaginationSnapshot() {
    cancelPendingScrollSave();
    const snap = snapshotFromDOM();
    if (!snap) return;
    const ok = writeHistoryState(snap);
    if (!ok) writeFallback(snap);
  }

  // 轻量快照：仅更新 scrollY（用于 scroll 节流，不重新序列化 HTML）
  function saveScrollPositionOnly() {
    const existing = readHistoryState();
    if (!existing) return;
    existing.scrollY = window.scrollY || window.pageYOffset || 0;
    existing.ts = Date.now();
    writeHistoryState(existing);
  }

  // 导出给 main.js 在 astro:before-preparation 时调用
  paginationApi.saveSnapshot = savePaginationSnapshot;

  // ---------- 恢复 ----------
  function isValidSnapshotForCurrentFeed(state) {
    const feed = document.querySelector('.shibui-feed');
    if (!feed || !state || !state.html) return false;
    if (!state.ts || Date.now() - state.ts > SNAPSHOT_MAX_AGE) return false;

    const currentSignature = feed.getAttribute('data-pagination-signature') || '';
    const currentVersion = feed.getAttribute('data-pagination-version') || '';
    if (!state.version || (currentVersion && state.version !== currentVersion)) return false;
    if (!state.signature || (currentSignature && state.signature !== currentSignature)) return false;
    if (state.path && normalizePathname(state.path) !== getCurrentPaginationPath()) return false;

    return true;
  }

  function scrollToY(y) {
    // 双 rAF 等布局稳定后再跳，避免 iOS 上 innerHTML 替换导致的滚动抖动
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        try { window.scrollTo(0, y); } catch (e) {}
      });
    });
  }

  function restoreToDOM(state) {
    const feed = document.querySelector('.shibui-feed');
    if (!feed || !isValidSnapshotForCurrentFeed(state)) return false;

    const currentCount = feed.children.length;
    const htmlEl = document.documentElement;
    const originalScrollBehavior = htmlEl.style.scrollBehavior;
    htmlEl.style.scrollBehavior = 'auto';

    // 如果当前 SSR 的条目已经 >= 快照（通常意味着只是初次加载，没有 load-more），
    // 就只恢复滚动位置，不 innerHTML 替换，避免无谓的重排。
    if (state.itemCount > currentCount) {
      feed.innerHTML = state.html;

      let nextLink = document.querySelector('link[rel="next"]');
      if (state.nextUrl) {
        if (nextLink) {
          nextLink.href = state.nextUrl;
        } else {
          nextLink = document.createElement('link');
          nextLink.rel = 'next';
          nextLink.href = state.nextUrl;
          document.head.appendChild(nextLink);
        }
      } else if (nextLink) {
        nextLink.remove();
      }

      const btn = document.querySelector('.shibui-loadmore');
      if (!state.hasLoadMore || !state.nextUrl) {
        completeLoadMoreButton(btn);
      } else if (btn) {
        btn.disabled = false;
        btn.removeAttribute('aria-disabled');
        btn.removeAttribute('aria-busy');
        btn.setAttribute('data-next-url', state.nextUrl);
      }

      layoutFeaturedMasonry();
    }

    if (typeof state.scrollY === 'number') {
      scrollToY(state.scrollY);
    }

    setTimeout(function() {
      htmlEl.style.scrollBehavior = originalScrollBehavior;
    }, 0);

    return true;
  }

  function tryRestore() {
    const historySnap = readHistoryState();
    if (historySnap && restoreToDOM(historySnap)) {
      return true;
    }

    const fallbackSnap = readFallback();
    if (!fallbackSnap) return false;
    return restoreToDOM(fallbackSnap);
  }

  // ---------- load-more 绑定 ----------
  function initHomePagination() {
    const feed = document.querySelector('.shibui-feed');
    if (!feed) return;

    let loadMoreBtn = document.querySelector('.shibui-loadmore');
    let nextLink = document.querySelector('link[rel="next"]');
    let isLoading = false;

    if (loadMoreBtn) {
      const fresh = loadMoreBtn.cloneNode(true);
      fresh.removeAttribute('data-loadmore-bound');
      loadMoreBtn.parentNode.replaceChild(fresh, loadMoreBtn);
      loadMoreBtn = fresh;
    }

    if (!nextLink && loadMoreBtn) {
      completeLoadMoreButton(loadMoreBtn);
      return;
    }

    const loadNextPage = async function() {
      if (!nextLink || isLoading) return;
      isLoading = true;
      if (loadMoreBtn) {
        setLoadMoreButtonLoading(loadMoreBtn, true);
      }
      try {
        const response = await fetch(nextLink.href);
        if (!response.ok) {
          throw new Error(`Load more request failed: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const items = doc.querySelectorAll('.shibui-feed > *');

        const fragment = document.createDocumentFragment();
        items.forEach(function(item) {
          fragment.appendChild(document.importNode(item, true));
        });
        feed.appendChild(fragment);
        layoutFeaturedMasonry();

        const newNext = doc.querySelector('link[rel="next"]');
        if (newNext && newNext.href) {
          nextLink.href = newNext.href;
        } else {
          if (nextLink) nextLink.remove();
          nextLink = null;
          completeLoadMoreButton(loadMoreBtn);
        }

        savePaginationSnapshot();
        // loadmore 追加的新条目本身不需要单独处理——全站 guard 已经按"文档
        // 范围"覆盖所有 a[href]，main.js 的 syncIosShellSpaGuard 也会在
        // astro:after-swap 重新跑一遍。但为了安全起见，追加后再主动触发一次，
        // 避免新条目还没来得及被下一次同步命中。
        syncIosShellSpaGuard();
      } catch (err) {
        console.error('Load more failed:', err);
        if (loadMoreBtn) {
          setLoadMoreButtonLoading(loadMoreBtn, false);
        }
      } finally {
        isLoading = false;
        if (loadMoreBtn && nextLink) {
          setLoadMoreButtonLoading(loadMoreBtn, false);
        }
      }
    };

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', async function() {
        trackUmami('home-loadmore-click');
        await loadNextPage();
      });
    }
  }

  // ---------- 入口 ----------
  // 支持两种调用形式，兼容已有参数形态：
  //   initPaginationRuntime({ shouldRestore: true })
  //   initPaginationRuntime(false, { shouldRestore: true })
  const initPaginationRuntime = function(optionsOrAutoLoad, maybeOptions) {
    let options = {};
    if (optionsOrAutoLoad && typeof optionsOrAutoLoad === 'object') {
      options = optionsOrAutoLoad;
    } else if (maybeOptions && typeof maybeOptions === 'object') {
      options = maybeOptions;
    }

    if (!hasPaginatedFeed()) return;

    if (options.shouldRestore === true) {
      tryRestore();
    }

    layoutFeaturedMasonry();

    initHomePagination();
    bindScrollOnce();
    syncIosShellSpaGuard();
  };
  paginationApi.init = initPaginationRuntime;

  function bindScrollOnce() {
    if (runtimeFlags.paginationScrollBound) return;
    runtimeFlags.paginationScrollBound = true;
    window.addEventListener('scroll', function() {
      clearTimeout(getPaginationSaveTimeout());
      setPaginationSaveTimeout(setTimeout(saveScrollPositionOnly, 200));
    }, { passive: true });
  }

  // ---------- 生命周期钩子：整个页面 session 里只绑一次 ----------
  if (!runtimeFlags.paginationLifecycleBound) {
    runtimeFlags.paginationLifecycleBound = true;

    // 进入 bfcache 或离开页面前做完整快照。
    // iOS 上 pagehide 比 beforeunload 可靠得多。
    window.addEventListener('pagehide', function() {
      if (hasPaginatedFeed()) savePaginationSnapshot();
    });

    // 注意：这里故意不再监听 click 做快照。
    // 原因：Astro ClientRouter 的 astro:before-swap 已经在 moveToLocation()
    // 调用 history.pushState 之前触发（见 astro/dist/transitions/router.js 中
    // doSwap → moveToLocation 顺序），此时写 history.state 落到旧 entry 上是正确的。
    // 反而如果在 click 捕获阶段再插一次 history.replaceState，iOS Chrome 上会和
    // 随后的 pushState 发生竞争，表现为"返回时直接回到上上页"——history 栈塌陷。

    // bfcache 恢复：iOS Safari 等原生返回，persisted=true 时才恢复
    window.addEventListener('pageshow', function(event) {
      if (event.persisted && hasPaginatedFeed()) {
        if (typeof paginationApi.init === 'function') {
          paginationApi.init({ shouldRestore: true });
        }
      }
    });
  }
  return paginationApi;
};
