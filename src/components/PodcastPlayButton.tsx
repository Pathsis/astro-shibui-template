import { h, Fragment } from 'preact';
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
  const ariaLabel = isPlaying
    ? (isEnglish ? 'Pause AI Podcast' : '暂停 AI 播客')
    : (isEnglish ? 'Play AI Podcast' : '播放 AI 播客');

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

  const handleClick = useCallback(() => {
    const playPodcastEpisode = (window as any).playPodcastEpisode;
    if (playPodcastEpisode) {
      playPodcastEpisode(episode.slug, episode.title, episode.url);
    }
  }, [episode]);

  return (
    <button
      class={`podcast-play-button ${isCurrent && isPlaying ? 'playing' : ''}`}
      data-podcast-slug={episode.slug}
      onClick={handleClick}
      aria-label={ariaLabel}
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
