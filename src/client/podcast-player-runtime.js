import { render, h } from 'preact';
import { PodcastPlayer } from '../components/PodcastPlayer';
import podcastPlayerCssUrl from '../styles/podcast-player.css?url';
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
import { getGlobalAudio, setAudioSrc, setCurrentTime, playAudio } from '../lib/audio-player';
import { trackUmami } from '../lib/analytics';

const ensurePodcastPlayerRuntime = function(runtimeInput) {
  const globalRuntime = runtimeInput || window.pathosRuntime || {};
  globalRuntime.apis = globalRuntime.apis || {};
  globalRuntime.apis.podcastPlayer = globalRuntime.apis.podcastPlayer || {};
  globalRuntime.shared = globalRuntime.shared || {};
  globalRuntime.flags = globalRuntime.flags || {};
  window.pathosRuntime = globalRuntime;
  return globalRuntime;
};

const ensurePodcastPlayerStyles = function(runtime) {
  const shared = runtime.shared || {};
  runtime.shared = shared;

  if (shared.podcastPlayerStylesPromise) {
    const existingLink = document.querySelector('link[data-pathos-podcast-player-styles="1"]');
    if (existingLink instanceof HTMLLinkElement && existingLink.isConnected) {
      return shared.podcastPlayerStylesPromise;
    }
    delete shared.podcastPlayerStylesPromise;
  }

  shared.podcastPlayerStylesPromise = new Promise(function(resolve, reject) {
    const existingLink = document.querySelector('link[data-pathos-podcast-player-styles="1"]');
    if (existingLink instanceof HTMLLinkElement) {
      if (existingLink.sheet) {
        resolve(existingLink);
        return;
      }

      existingLink.addEventListener('load', function() {
        resolve(existingLink);
      }, { once: true });
      existingLink.addEventListener('error', function(event) {
        reject(event);
      }, { once: true });
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = podcastPlayerCssUrl;
    link.dataset.pathosPodcastPlayerStyles = '1';
    link.addEventListener('load', function() {
      resolve(link);
    }, { once: true });
    link.addEventListener('error', function(event) {
      reject(event);
    }, { once: true });
    document.head.appendChild(link);
  }).catch(function(error) {
    delete shared.podcastPlayerStylesPromise;
    throw error;
  });

  return shared.podcastPlayerStylesPromise;
};

export const registerPodcastPlayerRuntime = function(runtimeInput) {
  const runtime = ensurePodcastPlayerRuntime(runtimeInput);
  const runtimeFlags = runtime.flags;
  // Runtime 通过 main.js 与 astro:page-load 多次触发进入，这里必须幂等。
  if (runtimeFlags.podcastPlayerRuntimeRegistered) {
    return runtime.apis.podcastPlayer;
  }
  runtimeFlags.podcastPlayerRuntimeRegistered = true;

  let isPlayerVisible = false;
  let currentEpisodes = [];
  let isPlayerMounted = false;
  let playRequestSeq = 0;

  const getContainer = function() {
    return document.getElementById('podcast-player-container');
  };

  const mountPlayer = async function() {
    await ensurePodcastPlayerStyles(runtime);

    const container = getContainer();
    if (!container || currentEpisodes.length === 0) return;

    container.style.display = 'block';

    if (isPlayerMounted) return;
    if (container.querySelector('.podcast-player')) {
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
      container
    );

    isPlayerMounted = true;
    isPlayerVisible = true;
  };

  const unmountPlayer = function() {
    const container = getContainer();
    if (container) {
      render(null, container);
      container.style.display = 'none';
    }
    isPlayerMounted = false;
    isPlayerVisible = false;
  };

  const init = async function() {
    const container = getContainer();
    if (!container) return;

    initPlayerState();

    const episodesData = container.getAttribute('data-episodes');
    if (episodesData) {
      try {
        const parsed = JSON.parse(episodesData);
        if (Array.isArray(parsed)) {
          currentEpisodes = parsed.map(function(episode) {
            return {
              ...episode,
              date: new Date(episode.date),
            };
          });
        }
      } catch (error) {
        console.error('Failed to parse podcast episodes:', error);
      }
    }

    const state = getPlayerState();
    if (state.currentSlug && !isPlayerDismissed()) {
      await mountPlayer();
    }
  };

  // 保留全局函数签名兼容：window.playPodcastEpisode(slug, title, url)。
  // title 在当前实现未直接使用，但暂不移除，避免调用方参数位移风险。
  const playPodcastEpisode = async function(slug, _title, url) {
    const state = getPlayerState();

    clearDismissedState();

    const nextIsPlaying = state.currentSlug === slug && isPlayerVisible
      ? !state.isPlaying
      : true;

    setPlayIntent(nextIsPlaying);

    if (!isPlayerMounted) {
      try {
        await mountPlayer();
      } catch (error) {
        console.error('Failed to load podcast player styles:', error);
        setPlayIntent(false);
        return;
      }
    }

    if (state.currentSlug === slug && isPlayerVisible) {
      setAudioSrc(url);
      trackUmami(state.isPlaying ? 'podcast-pause' : 'podcast-play', {
        source: 'article',
        slug,
      });
      updatePlayerState({ isPlaying: nextIsPlaying });
      if (nextIsPlaying) {
        playAudio().catch(function() {
          updatePlayerState({ isPlaying: false });
          setPlayIntent(false);
        });
      }
      return;
    }

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

    trackUmami('podcast-play', { source: 'article', slug });

    const audio = getGlobalAudio();
    const requestId = ++playRequestSeq;
    const finalizeStart = function() {
      if (requestId !== playRequestSeq) return;
      try {
        setCurrentTime(savedTime);
      } catch (e) {
        // ignore
      }
      if (nextIsPlaying) {
        updatePlayerState({ isPlaying: true });
      }
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      finalizeStart();
    } else {
      audio.addEventListener('loadedmetadata', finalizeStart, { once: true });
    }
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
