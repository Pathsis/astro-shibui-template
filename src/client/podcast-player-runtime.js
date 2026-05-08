import { render, h } from 'preact';
import { PodcastPlayer } from '../components/PodcastPlayer';
import podcastPlayerStyles from '../styles/podcast-player.css?inline';
import {
  updatePlayerState,
  getPlayerState,
  initPlayerState,
  clearPlayerState,
  isPlayerDismissed,
  clearDismissedState,
  setPlayIntent,
  getEpisodeProgress
} from '../lib/player-state';
import { pauseAudio } from '../lib/audio-player';
import { trackUmami } from '../lib/analytics';
import { ensurePathosRuntime } from './runtime-core.js';

const PODCAST_STYLE_ATTR = 'data-pathos-podcast-player-styles';
const PODCAST_MOUNT_ATTR = 'data-podcast-player-mount';
const PODCAST_LAYER_ORDER = '@layer tokens, base, layout, content, components, utilities, print;';
const PODCAST_LAYERED_STYLES = `${PODCAST_LAYER_ORDER}\n@layer components {\n${podcastPlayerStyles}\n}`;

const supportsConstructedStylesheets = function() {
  return typeof CSSStyleSheet !== 'undefined'
    && typeof CSSStyleSheet.prototype.replaceSync === 'function'
    && Array.isArray(document.adoptedStyleSheets);
};

const ensurePodcastPlayerStyles = function(runtime, container) {
  const shared = runtime.shared || {};
  runtime.shared = shared;

  let hasConstructedStylesheet = false;
  if (supportsConstructedStylesheets()) {
    try {
      let sheet = shared.podcastPlayerStyleSheet;
      if (!(sheet instanceof CSSStyleSheet)) {
        sheet = new CSSStyleSheet();
        sheet.replaceSync(PODCAST_LAYERED_STYLES);
        shared.podcastPlayerStyleSheet = sheet;
      }
      if (!document.adoptedStyleSheets.includes(sheet)) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }
      hasConstructedStylesheet = true;
      shared.podcastPlayerStylesReady = true;
    } catch (error) {
      if (!shared.podcastPlayerStylesheetFallbackWarned) {
        shared.podcastPlayerStylesheetFallbackWarned = true;
        console.warn('Failed to install constructed stylesheet for podcast player, fallback to style tag.', error);
      }
    }
  }

  if (hasConstructedStylesheet) return;

  if (!container) return;

  let styleTag = container.querySelector(`style[${PODCAST_STYLE_ATTR}="1"]`);
  if (!(styleTag instanceof HTMLStyleElement)) {
    styleTag = document.createElement('style');
    styleTag.setAttribute(PODCAST_STYLE_ATTR, '1');
    styleTag.textContent = PODCAST_LAYERED_STYLES;
    container.prepend(styleTag);
  } else if (!styleTag.textContent) {
    styleTag.textContent = PODCAST_LAYERED_STYLES;
  }

  shared.podcastPlayerStylesReady = true;
};

const getMountPoint = function(container) {
  let mountPoint = container.querySelector(`[${PODCAST_MOUNT_ATTR}="1"]`);
  if (!(mountPoint instanceof HTMLElement)) {
    mountPoint = document.createElement('div');
    mountPoint.setAttribute(PODCAST_MOUNT_ATTR, '1');
    container.appendChild(mountPoint);
  }
  return mountPoint;
};

export const registerPodcastPlayerRuntime = function(runtimeInput) {
  const runtime = ensurePathosRuntime(runtimeInput);
  const runtimeFlags = runtime.flags;
  // Runtime 通过 main.js 与 astro:page-load 多次触发进入，这里必须幂等。
  if (runtimeFlags.podcastPlayerRuntimeRegistered) {
    return runtime.apis.podcastPlayer;
  }
  runtimeFlags.podcastPlayerRuntimeRegistered = true;

  let isPlayerVisible = false;
  let currentEpisodes = [];
  let isPlayerMounted = false;

  const getContainer = function() {
    return document.getElementById('podcast-player-container');
  };

  let episodesLoadPromise = null;

  const loadEpisodes = async function() {
    if (currentEpisodes.length > 0) return currentEpisodes;
    if (episodesLoadPromise) return episodesLoadPromise;

    episodesLoadPromise = fetch('/podcast-episodes.json')
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(parsed) {
        if (!Array.isArray(parsed)) throw new Error('Invalid response');
        currentEpisodes = parsed.map(function(episode) {
          return {
            ...episode,
            date: new Date(episode.date),
          };
        });
        episodesLoadPromise = null;
        return currentEpisodes;
      })
      .catch(function(error) {
        episodesLoadPromise = null;
        console.error('Failed to load podcast episodes:', error);
        return [];
      });

    return episodesLoadPromise;
  };

  const mountPlayer = function() {
    const container = getContainer();
    if (!container || currentEpisodes.length === 0) return;

    ensurePodcastPlayerStyles(runtime, container);

    container.style.display = 'block';
    const mountPoint = getMountPoint(container);

    if (isPlayerMounted) return;
    if (mountPoint.querySelector('.podcast-player')) {
      isPlayerMounted = true;
      isPlayerVisible = true;
      return;
    }

    render(
      h(PodcastPlayer, {
        episodes: currentEpisodes,
        onClose: function() {
          clearPlayerState();
          unmountPlayer();
        }
      }),
      mountPoint
    );

    isPlayerMounted = true;
    isPlayerVisible = true;
  };

  const unmountPlayer = function() {
    const container = getContainer();
    if (container) {
      const mountPoint = container.querySelector(`[${PODCAST_MOUNT_ATTR}="1"]`);
      if (mountPoint instanceof HTMLElement) {
        render(null, mountPoint);
      }
      container.style.display = 'none';
    }
    isPlayerMounted = false;
    isPlayerVisible = false;
  };

  const init = async function() {
    const container = getContainer();
    if (!container) return;

    initPlayerState();

    if (currentEpisodes.length === 0) {
      await loadEpisodes();
    }

    const state = getPlayerState();
    if (state.currentSlug && !isPlayerDismissed()) {
      mountPlayer();
    }
  };

  // 保留全局函数签名兼容：window.playPodcastEpisode(slug, title, url)。
  // 该入口现在只做“唤起播放器 + 选中曲目”，不直接触发播放。
  // title 在当前实现未直接使用，但暂不移除，避免调用方参数位移风险。
  const playPodcastEpisode = async function(slug, _title, url) {
    if (currentEpisodes.length === 0) {
      await loadEpisodes();
    }

    const state = getPlayerState();

    clearDismissedState();
    setPlayIntent(false);

    if (!isPlayerMounted) {
      mountPlayer();
    }
    if (state.currentSlug === slug && isPlayerVisible) return;

    const savedProgress = getEpisodeProgress(slug);
    const savedTime = Number.isFinite(savedProgress?.currentTime)
      ? Math.max(savedProgress.currentTime, 0)
      : 0;
    const savedDuration = Number.isFinite(savedProgress?.duration) && (savedProgress?.duration || 0) > 0
      ? savedProgress.duration
      : 0;

    updatePlayerState({
      currentSlug: slug,
      isPlaying: false,
      currentTime: savedTime,
      ...(savedDuration > 0 ? { duration: savedDuration } : {}),
    });

    // 与列表选择行为一致：只切换当前曲目，不直接播放。
    if (state.isPlaying) {
      pauseAudio();
    }
    trackUmami('podcast-episode-select', { source: 'article', slug, url });
  };

  runtime.apis.podcastPlayer = {
    init: init,
    mount: mountPlayer,
    unmount: unmountPlayer,
    playEpisode: playPodcastEpisode,
  };

  window.playPodcastEpisode = playPodcastEpisode;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init().catch(function(error) {
        console.error('Failed to initialize podcast player runtime:', error);
      });
    }, { once: true });
  } else {
    init().catch(function(error) {
      console.error('Failed to initialize podcast player runtime:', error);
    });
  }

  // ClientRouter 换页后容器节点会被复用/重建，重新 init 可确保状态与 DOM 同步。
  document.addEventListener('astro:page-load', function() {
    init().catch(function(error) {
      console.error('Failed to reinitialize podcast player runtime:', error);
    });
  });

  return runtime.apis.podcastPlayer;
};
