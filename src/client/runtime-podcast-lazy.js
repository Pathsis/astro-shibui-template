const DAY_MS = 24 * 60 * 60 * 1000;

const readStorageJson = function(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const shouldAutoloadPodcastPlayer = function() {
  const min = readStorageJson('podcast-player-minimized');
  if (!min || min.minimized !== true) return false;

  const dis = readStorageJson('podcast-player-dismissed');
  if (dis && dis.timestamp && Date.now() - dis.timestamp < DAY_MS) return false;

  const st = readStorageJson('podcast-player-state');
  if (!st || (st.timestamp && Date.now() - st.timestamp >= DAY_MS)) return false;

  return !!st.currentSlug;
};

export const installPodcastLazyPlayBridge = function(runtime, loadRuntimeModule) {
  if (runtime.flags.podcastLazyPlayBridgeInstalled) return;
  runtime.flags.podcastLazyPlayBridgeInstalled = true;

  const lazyPlayPodcastEpisode = function(slug, title, url) {
    loadRuntimeModule('podcastPlayer')
      .then(function() {
        const playEpisode = runtime.apis.podcastPlayer?.playEpisode;
        if (typeof playEpisode === 'function') {
          playEpisode(slug, title, url);
        }
      })
      .catch(function(error) {
        console.error('Failed to lazy load podcast player runtime:', error);
      });
  };

  window.playPodcastEpisode = lazyPlayPodcastEpisode;
  runtime.apis.podcastPlayer = runtime.apis.podcastPlayer || {};
  runtime.apis.podcastPlayer.playEpisode = runtime.apis.podcastPlayer.playEpisode || lazyPlayPodcastEpisode;

  // 兜底事件委托：确保未 hydration 的按钮（如分页动态插入）也能唤起播放器。
  if (!runtime.flags.podcastButtonDelegationInstalled) {
    runtime.flags.podcastButtonDelegationInstalled = true;
    document.addEventListener('click', function(event) {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('.podcast-play-button');
      if (!(button instanceof HTMLElement)) return;

      const slug = button.dataset.podcastSlug;
      const title = button.dataset.podcastTitle || '';
      const url = button.dataset.podcastUrl || '';
      if (!slug || !url) return;

      event.preventDefault();
      event.stopPropagation();
      lazyPlayPodcastEpisode(slug, title, url);
    });
  }
};
