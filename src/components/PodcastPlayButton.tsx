import { Fragment } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import {
  getPlayerState,
  subscribeToPlayerState,
} from '../lib/player-state';
import type { PodcastEpisode } from '../lib/podcast';

interface PodcastPlayButtonProps {
  episode: PodcastEpisode;
}

export function PodcastPlayButton({ episode }: PodcastPlayButtonProps) {
  const [isCurrent, setIsCurrent] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isEnglish = episode.lang === 'en';
  const ariaLabel = isEnglish ? 'Open AI Podcast Player' : '打开 AI 播客播放器';

  const checkState = useCallback(() => {
    const state = getPlayerState();
    const current = state.currentSlug === episode.slug;
    setIsCurrent(current);
    setIsPlaying(current && state.isPlaying);
  }, [episode.slug]);

  useEffect(() => {
    checkState();

    const unsubscribe = subscribeToPlayerState((newState) => {
      const current = newState.currentSlug === episode.slug;
      setIsCurrent(current);
      setIsPlaying(current && newState.isPlaying);
    });

    return unsubscribe;
  }, [episode.slug, checkState]);

  const handleClick = useCallback(async (event: MouseEvent) => {
    // Featured 卡片有整卡可点击链接，阻止事件冒泡可避免误触跳转吞掉播放按钮点击。
    event.preventDefault();
    event.stopPropagation();

    const win = window as any;
    const playPodcastEpisode = win.playPodcastEpisode;
    if (typeof playPodcastEpisode === 'function') {
      playPodcastEpisode(episode.slug, episode.title, episode.url);
      return;
    }

    // 兜底：若懒加载桥接尚未就绪，直接拉起播放器 runtime，避免按钮静默失效。
    try {
      const runtimeModule = await import('../client/podcast-player-runtime.js');
      if (typeof runtimeModule.registerPodcastPlayerRuntime === 'function') {
        runtimeModule.registerPodcastPlayerRuntime(win.pathosRuntime);
      }
      const fallbackPlayEpisode = win.playPodcastEpisode
        || win.pathosRuntime?.apis?.podcastPlayer?.playEpisode;
      if (typeof fallbackPlayEpisode === 'function') {
        fallbackPlayEpisode(episode.slug, episode.title, episode.url);
      }
    } catch (error) {
      console.error('Failed to initialize podcast player runtime from play button:', error);
    }
  }, [episode]);

  return (
    <button
      class={`podcast-play-button ${isCurrent ? 'is-current' : ''} ${isCurrent && isPlaying ? 'playing' : ''}`}
      data-podcast-slug={episode.slug}
      data-podcast-title={episode.title}
      data-podcast-url={episode.url}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-pressed={isCurrent}
      title={ariaLabel}
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        {isPlaying ? (
          <Fragment>
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </Fragment>
        ) : (
          <polygon points="5,3 19,12 5,21" />
        )}
      </svg>
    </button>
  );
}
