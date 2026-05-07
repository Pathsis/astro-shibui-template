import { initPlayerState, getPlayerMinimized, isPlayerDismissed } from '../lib/player-state';

export const shouldAutoloadPodcastPlayer = function() {
  if (!getPlayerMinimized()) return false;
  if (isPlayerDismissed()) return false;
  const state = initPlayerState();
  return !!state.currentSlug;
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
