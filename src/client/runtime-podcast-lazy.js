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
};
