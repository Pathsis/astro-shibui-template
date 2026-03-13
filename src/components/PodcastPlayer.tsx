import { h, Fragment } from 'preact';
import { useState, useEffect, useCallback, useMemo, useRef } from 'preact/hooks';
import {
  updatePlayerState,
  subscribeToPlayerState,
  getPlayerState,
  saveProgress,
  saveEpisodeProgress,
  getEpisodeProgress,
  saveCurrentEpisode,
  getSavedEpisode,
  getPlaybackRateForLang,
  getPlayerMinimized,
  setPlayerMinimized,
  savePlaybackRateForLang,
  getPlayIntent,
  setPlayIntent,
  clearPlayIntent,
  type PlayerState
} from '../lib/player-state';
import {
  getGlobalAudio,
  setAudioSrc,
  playAudio,
  pauseAudio,
  setCurrentTime,
  getDuration,
  setPlaybackRate,
  onTimeUpdate,
  onLoadedMetadata,
  onWaiting,
  onCanPlay,
  onEnded,
  onError,
  onPlay,
  onPause,
  onSeeked,
  getAudioError,
  isPlaying,
} from '../lib/audio-player';
import type { PodcastEpisode } from '../lib/podcast';
import {
  bindMediaSessionHandlers,
  setMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPositionState,
} from '../lib/media-session';

interface PodcastPlayerProps {
  episodes: PodcastEpisode[];
  onClose?: () => void;
}

function getPageLang(): PodcastEpisode['lang'] {
  if (typeof window === 'undefined') return 'zh-cn';
  const path = window.location.pathname;
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'zh-cn';
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPlaybackRateLabel(rate: number): string {
  const normalized = (Math.round(rate * 100) / 100).toFixed(2);
  if (normalized.endsWith('00')) return normalized.slice(0, -1);
  if (normalized.endsWith('50')) return normalized.slice(0, -1);
  return normalized;
}

export function PodcastPlayer({ episodes, onClose }: PodcastPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return getPlayerMinimized();
    }
    return false;
  });
  const [hasEnded, setHasEnded] = useState(false);
  const [titleScroll, setTitleScroll] = useState({ enabled: false, distance: 0, duration: 0 });
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [pageLang, setPageLang] = useState<PodcastEpisode['lang']>(() => getPageLang());

  // Refs for scrolling to current episode
  const playlistContainerRef = useRef<HTMLUListElement>(null);
  const currentEpisodeRef = useRef<HTMLLIElement>(null);
  const titleWrapRef = useRef<HTMLSpanElement>(null);
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const progressWrapperRef = useRef<HTMLDivElement>(null);
  const playerRootRef = useRef<HTMLDivElement>(null);
  const playlistPanelRef = useRef<HTMLDivElement>(null);
  const coverImageRef = useRef<HTMLImageElement>(null);
  const lastCoverRotationRef = useRef<number | null>(null);
  const mediaBannerArtworkUrlRef = useRef<string | null>(null);

  // 从 localStorage 恢复状态
  const [state, setState] = useState<PlayerState>(() => {
    if (typeof window !== 'undefined') {
      return getPlayerState();
    }
    return {
      currentSlug: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
      volume: 1,
    };
  });
  const stateRef = useRef<PlayerState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return () => {
      const bannerUrl = mediaBannerArtworkUrlRef.current;
      if (bannerUrl) {
        try {
          URL.revokeObjectURL(bannerUrl);
        } catch {
          // ignore
        }
        mediaBannerArtworkUrlRef.current = null;
      }
    };
  }, []);
  
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = getSavedEpisode();
      if (saved) {
        return {
          slug: saved.slug,
          title: saved.title,
          url: saved.url,
          articleUrl: saved.articleUrl,
          date: new Date(saved.date),
          lang: saved.lang,
          description: saved.description,
          coverImage: saved.coverImage,
        };
      }
    }
    return null;
  });

  // 初始化进度：如果有保存的 episode，获取其进度
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<string | null>(null);
  useEffect(() => {
    errorRef.current = error;
  }, [error]);
  const [progress, setProgress] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = getSavedEpisode();
      if (saved) {
        const savedProgress = getEpisodeProgress(saved.slug);
        return savedProgress?.currentTime ?? 0;
      }
    }
    return 0;
  });
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const visibleEpisodes = useMemo(
    () => episodes.filter((episode) => episode.lang === pageLang),
    [episodes, pageLang]
  );
  const playlistTitle = pageLang === 'en' ? 'Podcast List' : '播客列表';
  const playlistDateLocale = pageLang === 'en' ? 'en-US' : 'zh-CN';
  const activePlaybackLang = currentEpisode?.lang ?? pageLang;

  // 跟踪是否是首次渲染，避免在页面切换时错误地暂停音频
  // 使用 sessionStorage 中的 playIntent 来判断是否应该恢复播放
  const isInitialMount = useRef(true);
  const playIntentOnMount = useRef(false);

  // 跟踪待设置的播放时间（用于切换 episode 时恢复进度）
  const pendingSeekTime = useRef<number | null>(null);
  const pendingSeekRatio = useRef<number | null>(null);
  const resumeSeekPendingRef = useRef<number | null>(null);
  const scrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const lastSeekRef = useRef<{ time: number; ts: number; attempts: number } | null>(null);
  const scrubValueRef = useRef<number | null>(null);
  const tailSeekRef = useRef(false);
  const resumeOnSwapRef = useRef(false);
  const scrubRectRef = useRef<DOMRect | null>(null);
  const playlistTouchStartYRef = useRef<number | null>(null);

  const updateTitleScroll = useCallback(() => {
    const wrap = titleWrapRef.current;
    const text = titleTextRef.current;
    if (!wrap || !text) return;
    const wrapWidth = wrap.clientWidth;
    const textWidth = text.scrollWidth;
    if (!wrapWidth || !textWidth) {
      setTitleScroll((prev) =>
        prev.enabled ? { enabled: false, distance: 0, duration: 0 } : prev
      );
      return;
    }
    const overflow = Math.ceil(textWidth - wrapWidth);
    if (overflow > 8) {
      // 使用文本全宽作为滚动距离，配合克隆文本实现无缝循环。
      const distance = Math.ceil(textWidth);
      const duration = Math.min(36, Math.max(10, distance / 14));
      setTitleScroll((prev) => {
        if (prev.enabled && prev.distance === distance && prev.duration === duration) return prev;
        return { enabled: true, distance, duration };
      });
      return;
    }
    setTitleScroll((prev) =>
      prev.enabled ? { enabled: false, distance: 0, duration: 0 } : prev
    );
  }, []);

  const syncCoverRotation = useCallback(() => {
    const img = coverImageRef.current;
    const root = playerRootRef.current;
    if (!img || !root) return;
    const style = window.getComputedStyle(img);
    const transform = style.transform;
    let angle = 0;
    if (transform && transform !== 'none') {
      const match = transform.match(/matrix\(([^)]+)\)/);
      if (match) {
        const values = match[1].split(',').map((v) => parseFloat(v.trim()));
        if (values.length >= 2) {
          const [a, b] = values;
          const radians = Math.atan2(b, a);
          angle = Math.round((radians * 180) / Math.PI);
          if (angle < 0) angle += 360;
        }
      }
    }
    lastCoverRotationRef.current = angle;
    root.style.setProperty('--cover-rotation', `${angle}deg`);
  }, []);

  const createMediaSessionBannerArtworkUrl = useCallback(async (coverSrc: string) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    if (!coverSrc) return null;

    let absoluteSrc = coverSrc;
    try {
      absoluteSrc = new URL(coverSrc, window.location.href).href;
    } catch {
      // ignore URL resolution errors
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = absoluteSrc;
    try {
      if (typeof (img as any).decode === 'function') {
        await (img as any).decode();
      } else {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('image load failed'));
        });
      }
    } catch {
      return null;
    }

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;

    // 16:9 banner works better for most mobile media UIs.
    const width = 1024;
    const height = 576;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const targetRatio = width / height;
    const imgRatio = iw / ih;
    let sx = 0;
    let sy = 0;
    let sw = iw;
    let sh = ih;
    if (imgRatio > targetRatio) {
      // Too wide: crop left/right.
      sw = ih * targetRatio;
      sx = (iw - sw) / 2;
    } else {
      // Too tall/square: crop top/bottom.
      sh = iw / targetRatio;
      sy = (ih - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
    });
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rafId = window.requestAnimationFrame(updateTitleScroll);
    return () => window.cancelAnimationFrame(rafId);
  }, [updateTitleScroll, currentEpisode?.title, isBuffering, isExpanded, isMinimized]);

  useEffect(() => {
    setPlayerMinimized(isMinimized);
  }, [isMinimized]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => updateTitleScroll();
    window.addEventListener('resize', handleResize);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleResize);
      if (titleWrapRef.current) {
        observer.observe(titleWrapRef.current);
      }
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [updateTitleScroll]);
  const lastSavedTimeRef = useRef<number>(-5);

  const syncMediaSessionPosition = useCallback(
    (
      position: number,
      duration: number,
      options?: { force?: boolean }
    ) => {
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (!Number.isFinite(position) || position < 0) return;
    setMediaSessionPositionState({
      duration,
      position,
      playbackRate: stateRef.current.playbackRate,
    });
  }, []);

  // Save a fresh snapshot immediately when user action/page lifecycle may stop updates.
  const persistProgressSnapshot = useCallback(() => {
    if (!stateRef.current.currentSlug) return;
    const audio = getGlobalAudio();
    const rawDuration = getDuration();
    const safeDuration = Number.isFinite(rawDuration) && rawDuration > 0
      ? rawDuration
      : (Number.isFinite(stateRef.current.duration) ? stateRef.current.duration : 0);
    const rawTime = Number.isFinite(audio.currentTime) ? audio.currentTime : stateRef.current.currentTime;
    const safeTime = safeDuration > 0
      ? Math.min(Math.max(rawTime, 0), safeDuration)
      : Math.max(rawTime, 0);
    saveProgress(safeTime, safeDuration);
    lastSavedTimeRef.current = Math.floor(safeTime);
    if (safeDuration > 0) {
      syncMediaSessionPosition(safeTime, safeDuration, { force: true });
    }
  }, [syncMediaSessionPosition]);

  const applyPendingSeek = useCallback((durationOverride?: number) => {
    const duration = Number.isFinite(durationOverride) && durationOverride && durationOverride > 0
      ? durationOverride
      : getDuration();
    if (!Number.isFinite(duration) || duration <= 0) return;

    // Always read latest global state here to avoid stale local closure during episode switches.
    const latestState = getPlayerState();
    const globalStateTime =
      latestState.currentSlug === currentEpisode?.slug &&
      Number.isFinite(latestState.currentTime) &&
      latestState.currentTime >= 0
        ? latestState.currentTime
        : 0;

    const ratioTarget = pendingSeekRatio.current != null ? duration * pendingSeekRatio.current : null;
    let targetTime = pendingSeekTime.current ?? ratioTarget ?? globalStateTime;
    const hasExplicitTarget = pendingSeekTime.current != null || pendingSeekRatio.current != null;
    if ((!hasExplicitTarget || !Number.isFinite(targetTime) || targetTime <= 0) && currentEpisode?.slug) {
      const savedProgress = getEpisodeProgress(currentEpisode.slug);
      if (savedProgress?.currentTime && savedProgress.currentTime > 0) {
        targetTime = savedProgress.currentTime;
      }
    }

    const shouldApplyZero =
      targetTime === 0 &&
      (hasExplicitTarget || latestState.currentSlug === currentEpisode?.slug);
    const shouldApply = Number.isFinite(targetTime) &&
      (targetTime > 0 || shouldApplyZero);
    if (shouldApply) {
      const clampedTarget = Math.min(Math.max(targetTime ?? 0, 0), Math.max(duration - 0.01, 0));
      setCurrentTime(clampedTarget);
      setProgress(clampedTarget);
      updatePlayerState({ currentTime: clampedTarget });
      if (pendingSeekRatio.current != null) {
        saveProgress(clampedTarget, duration);
      }
      // 已经应用了恢复进度，允许后续进度保存
      resumeSeekPendingRef.current = null;
    }

    if (pendingSeekTime.current != null) pendingSeekTime.current = null;
    if (pendingSeekRatio.current != null) pendingSeekRatio.current = null;
  }, [currentEpisode?.slug]);


  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleBeforeSwap = () => {
      syncCoverRotation();
      if (!stateRef.current.currentSlug) return;
      persistProgressSnapshot();
      resumeOnSwapRef.current = isPlaying() || stateRef.current.isPlaying;
    };
    const handleAfterSwap = () => {
      const lastAngle = lastCoverRotationRef.current;
      if (typeof lastAngle === 'number') {
        const root = playerRootRef.current;
        if (root) {
          root.style.setProperty('--cover-rotation', `${lastAngle}deg`);
        }
      }
      if (!stateRef.current.currentSlug) return;
      const audioActuallyPlaying = isPlaying();
      if (resumeOnSwapRef.current) {
        resumeOnSwapRef.current = false;
        if (!audioActuallyPlaying) {
          setPlaybackRate(stateRef.current.playbackRate);
          playAudio().then(() => {
            if (!stateRef.current.isPlaying) {
              updatePlayerState({ isPlaying: true });
            }
          }).catch(() => {
            updatePlayerState({ isPlaying: false });
            setPlayIntent(false);
          });
          return;
        }
      }
      if (stateRef.current.isPlaying && !audioActuallyPlaying) {
        setPlaybackRate(stateRef.current.playbackRate);
        playAudio().catch(() => {
          updatePlayerState({ isPlaying: false });
          setPlayIntent(false);
        });
        return;
      }
      if (!stateRef.current.isPlaying && audioActuallyPlaying) {
        updatePlayerState({ isPlaying: true });
      }
    };
    document.addEventListener('astro:before-swap', handleBeforeSwap);
    document.addEventListener('astro:after-swap', handleAfterSwap);
    return () => {
      document.removeEventListener('astro:before-swap', handleBeforeSwap);
      document.removeEventListener('astro:after-swap', handleAfterSwap);
    };
  }, [persistProgressSnapshot, syncCoverRotation]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const persistOnBackground = () => {
      if (!stateRef.current.currentSlug) return;
      persistProgressSnapshot();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistOnBackground();
      }
    };

    window.addEventListener('pagehide', persistOnBackground);
    window.addEventListener('beforeunload', persistOnBackground);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', persistOnBackground);
      window.removeEventListener('beforeunload', persistOnBackground);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [persistProgressSnapshot]);

  // 初始化音频源
  useEffect(() => {
    getGlobalAudio();

    // 检查是否有播放意图（用于 View Transitions 后恢复播放）
    const hadPlayIntent = getPlayIntent();
    playIntentOnMount.current = hadPlayIntent;

    const freshState = getPlayerState();
    if (freshState.currentSlug && currentEpisode && currentEpisode.slug === freshState.currentSlug) {
      // 设置待跳转时间，在 loadedmetadata 事件中使用
      pendingSeekTime.current = freshState.currentTime;
      resumeSeekPendingRef.current = freshState.currentTime > 0 ? Date.now() : null;

      setAudioSrc(currentEpisode.url, { eager: hadPlayIntent || freshState.isPlaying });
      setPlaybackRate(freshState.playbackRate);
      setIsReady(true);
      const audio = getGlobalAudio();
      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        applyPendingSeek(audio.duration);
      }
    }

    // 清除播放意图标记
    if (hadPlayIntent) {
      clearPlayIntent();
    }
  }, []);
  
  useEffect(() => {
    const unsubscribe = subscribeToPlayerState((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const savedRate = getPlaybackRateForLang(activePlaybackLang);
    const targetRate = savedRate ?? 1;
    if (savedRate == null) {
      savePlaybackRateForLang(activePlaybackLang, targetRate);
    }
    if (Math.abs(targetRate - stateRef.current.playbackRate) < 0.001) return;
    updatePlayerState({ playbackRate: targetRate });
  }, [activePlaybackLang]);

  // 以 currentSlug 为唯一来源，统一同步 episode 与音频源
  const lastSyncedSlugRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.currentSlug) {
      lastSyncedSlugRef.current = null;
      setCurrentEpisode(null);
      return;
    }
    if (state.currentSlug === lastSyncedSlugRef.current) return;

    let episode = episodes.find((ep) => ep.slug === state.currentSlug);
    if (!episode && !state.currentSlug.endsWith('__en')) {
      // Backward-compat migration: old English state used plain slug before we
      // introduced lang-aware episode keys.
      const saved = getSavedEpisode();
      if (saved?.lang === 'en') {
        const migratedSlug = `${state.currentSlug}__en`;
        const migratedEpisode = episodes.find((ep) => ep.slug === migratedSlug);
        if (migratedEpisode) {
          updatePlayerState({ currentSlug: migratedSlug });
          return;
        }
      }
    }

    if (!episode) {
      updatePlayerState({ currentSlug: null, isPlaying: false, currentTime: 0, duration: 0 });
      return;
    }

    lastSyncedSlugRef.current = state.currentSlug;

    const savedProgress = getEpisodeProgress(episode.slug);
    const savedTime = savedProgress?.currentTime ?? 0;
    const savedDuration = savedProgress?.duration ?? 0;

    pendingSeekTime.current = savedTime;
    resumeSeekPendingRef.current = savedTime > 0 ? Date.now() : null;
    setIsBuffering(getPlayIntent());
    const shouldEagerLoad = state.isPlaying || getPlayIntent();
    setCurrentEpisode(episode);
    setAudioSrc(episode.url, { eager: shouldEagerLoad });
    setPlaybackRate(state.playbackRate);
    setProgress(savedTime);
    setHasEnded(false);
    setState(prev => ({ ...prev, duration: savedDuration }));
    setIsReady(true);
    const audio = getGlobalAudio();
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      applyPendingSeek(audio.duration);
    }

    saveCurrentEpisode({
      slug: episode.slug,
      title: episode.title,
      url: episode.url,
      articleUrl: episode.articleUrl,
      date: episode.date.toISOString(),
      lang: episode.lang,
      description: episode.description,
      coverImage: episode.coverImage,
    });
  }, [state.currentSlug, state.playbackRate, episodes]);
  
  useEffect(() => {
    if (!isReady) return;

    const unsubTimeUpdate = onTimeUpdate((time) => {
      if (!Number.isFinite(time)) return;
      if (lastSeekRef.current && !scrubbingRef.current) {
        const lastSeek = lastSeekRef.current;
        if (stateRef.current.isPlaying &&
            Date.now() - lastSeek.ts < 5000 &&
            lastSeek.attempts < 2 &&
            time < lastSeek.time - 2) {
          setCurrentTime(lastSeek.time);
          lastSeekRef.current = {
            time: lastSeek.time,
            ts: Date.now(),
            attempts: lastSeek.attempts + 1,
          };
          return;
        }
        if (Math.abs(time - lastSeekRef.current.time) <= 1) {
          lastSeekRef.current = null;
        }
      }
      const duration = getDuration();
      const safeDuration = Number.isFinite(duration) && duration > 0
        ? duration
        : (Number.isFinite(stateRef.current.duration) ? stateRef.current.duration : 0);
      const clampedTime = safeDuration > 0 ? Math.min(time, safeDuration) : time;
      // 如果时间接近结尾（差距小于 1 秒），直接设置为总时长，确保进度条到达 100%
      if (safeDuration > 0 && safeDuration - clampedTime < 1) {
        setProgress(safeDuration);
      } else {
        setProgress(clampedTime);
      }
      // 如果正在恢复进度（避免初始化时把旧进度覆盖为 0）
      const resumePendingAt = resumeSeekPendingRef.current;
      if (resumePendingAt != null) {
        if (Date.now() - resumePendingAt > 8000) {
          resumeSeekPendingRef.current = null;
        } else {
          return;
        }
      }
      syncMediaSessionPosition(clampedTime, safeDuration);
      // 每 5 秒保存一次进度（防抖优化，减少 I/O 操作）
      const currentSecond = Math.floor(clampedTime);
      if (safeDuration > 0 &&
          (currentSecond - lastSavedTimeRef.current >= 5 || currentSecond < lastSavedTimeRef.current)) {
        saveProgress(clampedTime, safeDuration);
        lastSavedTimeRef.current = currentSecond;
      }
    });
    
    const unsubLoadedMetadata = onLoadedMetadata((duration) => {
      updatePlayerState({ duration });
      applyPendingSeek(duration);
      const audio = getGlobalAudio();
      if (Number.isFinite(audio.currentTime) && audio.currentTime >= 0) {
        syncMediaSessionPosition(audio.currentTime, duration);
      }
    });
    
    const unsubWaiting = onWaiting(() => setIsBuffering(true));
    const unsubCanPlay = onCanPlay(() => {
      setIsBuffering(false);
      // 缓冲成功后清除错误
      if (errorRef.current) setError(null);
      const lastSeek = lastSeekRef.current;
      const duration = getDuration();
      if (lastSeek &&
          !scrubbingRef.current &&
          Number.isFinite(duration) &&
          duration > 0 &&
          Date.now() - lastSeek.ts < 5000 &&
          lastSeek.attempts < 2) {
        if (Math.abs(getGlobalAudio().currentTime - lastSeek.time) > 1) {
          setCurrentTime(lastSeek.time);
          lastSeekRef.current = {
            time: lastSeek.time,
            ts: Date.now(),
            attempts: lastSeek.attempts + 1,
          };
        }
      }
    });
    const unsubEnded = onEnded(() => {
      const finalDurationRaw = getDuration();
      const safeDuration = Number.isFinite(finalDurationRaw) && finalDurationRaw > 0
        ? finalDurationRaw
        : (Number.isFinite(stateRef.current.duration) ? stateRef.current.duration : 0);

      // 先落盘一次“播放完毕”进度，避免异常中断导致末尾状态丢失。
      if (safeDuration > 0) {
        setProgress(safeDuration);
        saveProgress(safeDuration, safeDuration);
      }

      // 仅当这次 ended 来自“正在播放”时自动循环。
      // 拖动到尾部或用户非播放态触发 ended 时不自动起播。
      const shouldAutoLoop = stateRef.current.isPlaying || isPlaying();
      if (!shouldAutoLoop) {
        setHasEnded(true);
        updatePlayerState({ isPlaying: false });
        return;
      }

      setHasEnded(false);
      setCurrentTime(0);
      setProgress(0);
      setPlayIntent(true);
      updatePlayerState({ currentTime: 0, isPlaying: true });
      if (safeDuration > 0) {
        saveProgress(0, safeDuration);
        lastSavedTimeRef.current = 0;
        syncMediaSessionPosition(0, safeDuration, { force: true });
      }
      setPlaybackRate(stateRef.current.playbackRate);
      playAudio().catch(() => {
        updatePlayerState({ isPlaying: false });
        setPlayIntent(false);
      });
    });
    const unsubError = onError(() => {
      const errorMsg = getAudioError();
      // 出错时自动恢复主播放器，避免最小化态下错误提示不可见或难以操作。
      setIsMinimized((prev) => (prev ? false : prev));
      setError(errorMsg || '播放出错，请稍后重试');
      updatePlayerState({ isPlaying: false });
      setIsBuffering(false);
    });
    const unsubPlay = onPlay(() => {
      setIsBuffering(false);
      if (!stateRef.current.isPlaying) {
        updatePlayerState({ isPlaying: true });
      }
    });
    const unsubPause = onPause(() => {
      const audio = getGlobalAudio();
      // ended 会伴随 pause 事件；这里跳过，避免把自动循环回写成暂停。
      if (audio.ended) return;
      if (stateRef.current.isPlaying && !scrubbingRef.current) {
        persistProgressSnapshot();
        updatePlayerState({ isPlaying: false });
        setPlayIntent(false);
      }
    });
    const unsubSeeked = onSeeked(() => {
      setPlaybackRate(stateRef.current.playbackRate);
      // 在 seek 完成后，强制更新媒体会话位置，确保媒体中心显示正确的进度
      const audio = getGlobalAudio();
      const duration = getDuration();
      if (Number.isFinite(audio.currentTime) && audio.currentTime >= 0 && Number.isFinite(duration) && duration > 0) {
        syncMediaSessionPosition(audio.currentTime, duration, { force: true });
      }
    });

    return () => {
      unsubTimeUpdate();
      unsubLoadedMetadata();
      unsubWaiting();
      unsubCanPlay();
      unsubEnded();
      unsubError();
      unsubPlay();
      unsubPause();
      unsubSeeked();
    };
  }, [isReady, applyPendingSeek, currentEpisode?.slug, syncMediaSessionPosition, persistProgressSnapshot]);
  
  useEffect(() => {
    if (!isReady) return;

    // 首次渲染时的特殊处理：
    // 同步实际音频状态与 UI 状态，支持 View Transitions 持续播放
    if (isInitialMount.current) {
      isInitialMount.current = false;

      // 获取实际音频状态
      const audioActuallyPlaying = isPlaying();

      // 如果实际音频状态与 UI 状态不一致，同步它们
      if (audioActuallyPlaying !== state.isPlaying && state.currentSlug === currentEpisode?.slug) {
        updatePlayerState({ isPlaying: audioActuallyPlaying });
      }

      // 根据播放意图决定是否继续播放
      if (playIntentOnMount.current) {
        if (audioActuallyPlaying) {
          // 音频正在播放，保持播放状态
          setPlayIntent(false);
        } else {
          // 有播放意图但音频暂停了，恢复播放
          if (currentEpisode) {
            setAudioSrc(currentEpisode.url);
          }
          playAudio().catch(() => {
            updatePlayerState({ isPlaying: false });
            setPlayIntent(false);
          });
        }
      }
      return;
    }

    if (state.isPlaying) {
      if (state.currentSlug && currentEpisode && state.currentSlug !== currentEpisode.slug) {
        return;
      }
      if (hasEnded) {
        const rawDuration = getDuration();
        const safeDuration = Number.isFinite(rawDuration) && rawDuration > 0
          ? rawDuration
          : (Number.isFinite(stateRef.current.duration) ? stateRef.current.duration : 0);
        setCurrentTime(0);
        setProgress(0);
        setHasEnded(false);
        updatePlayerState({ currentTime: 0 });
        if (safeDuration > 0) {
          saveProgress(0, safeDuration);
        }
        lastSavedTimeRef.current = 0;
      }
      // 每次开始播放时，设置播放意图标记（用于页面跳转后恢复）
      setPlayIntent(true);
      setHasEnded(false); // 重置结束状态
      setPlaybackRate(state.playbackRate);
      if (!isPlaying()) {
        if (currentEpisode) {
          setAudioSrc(currentEpisode.url);
        }
        setIsBuffering(true);
        playAudio().catch(() => {
          setIsBuffering(false);
          updatePlayerState({ isPlaying: false });
          setPlayIntent(false);
        });
      }
    } else {
      // 暂停时清除播放意图
      setPlayIntent(false);
      setIsBuffering(false);
      pauseAudio();
    }
  }, [state.isPlaying, isReady, state.currentSlug, currentEpisode?.slug]);

  useEffect(() => {
    const root = playerRootRef.current;
    if (!root) return;
    root.style.setProperty('--cover-rotation', '0deg');
    lastCoverRotationRef.current = 0;
  }, [currentEpisode?.slug]);
  
  useEffect(() => {
    setPlaybackRate(state.playbackRate);
  }, [state.playbackRate]);

  useEffect(() => {
    // Revoke previous generated banner artwork to avoid memory leaks.
    const prevBanner = mediaBannerArtworkUrlRef.current;
    if (prevBanner) {
      try {
        URL.revokeObjectURL(prevBanner);
      } catch {
        // ignore
      }
      mediaBannerArtworkUrlRef.current = null;
    }

    if (!currentEpisode) {
      setMediaSessionMetadata(null);
      setMediaSessionPlaybackState('none');
      return;
    }
    const album = currentEpisode.lang === 'en' ? 'AI Podcast' : 'AI 播客';
    // Always provide a cover image; fallback to site logo when article has no images.
    const coverImage = currentEpisode.coverImage ?? '/podcast-defualt-cover.png';
    const coverType = coverImage?.endsWith('.png')
      ? 'image/png'
      : (coverImage?.endsWith('.webp') ? 'image/webp' : (coverImage?.endsWith('.jpg') || coverImage?.endsWith('.jpeg') ? 'image/jpeg' : undefined));
    const squareArtwork = coverImage
      ? [
          { src: coverImage, sizes: '96x96', type: coverType },
          { src: coverImage, sizes: '128x128', type: coverType },
          { src: coverImage, sizes: '192x192', type: coverType },
          { src: coverImage, sizes: '256x256', type: coverType },
          { src: coverImage, sizes: '384x384', type: coverType },
          { src: coverImage, sizes: '512x512', type: coverType },
        ]
      : undefined;
    setMediaSessionMetadata({
      title: currentEpisode.title,
      artist: 'pathos.page',
      album,
      artwork: squareArtwork,
    });

    // Some mobile media UIs render a landscape artwork much nicer (similar to video cards).
    // For Android Chrome, prefer providing a 16:9 banner, while keeping square as fallback.
    let cancelled = false;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const preferBannerArtwork = /Android/i.test(ua);
    const canGenerateBanner = coverImage && !coverImage.endsWith('.svg');
    if (preferBannerArtwork && canGenerateBanner) {
      (async () => {
        const bannerUrl = await createMediaSessionBannerArtworkUrl(coverImage);
        if (!bannerUrl) return;
        if (cancelled) {
          try {
            URL.revokeObjectURL(bannerUrl);
          } catch {
            // ignore
          }
          return;
        }
        mediaBannerArtworkUrlRef.current = bannerUrl;
        setMediaSessionMetadata({
          title: currentEpisode.title,
          artist: 'pathos.page',
          album,
          artwork: [
            { src: bannerUrl, sizes: '1024x576', type: 'image/jpeg' },
            ...(squareArtwork ?? []),
          ],
        });
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [currentEpisode?.slug, currentEpisode?.title, currentEpisode?.coverImage, currentEpisode?.lang, createMediaSessionBannerArtworkUrl]);

  useEffect(() => {
    if (!currentEpisode) {
      setMediaSessionPlaybackState('none');
      return;
    }
    setMediaSessionPlaybackState(state.isPlaying ? 'playing' : 'paused');

    // Android 修复：当播放状态改变时，必须同步更新位置状态
    // 否则 Android Chrome/三星浏览器可能会显示错误的位置（0 或 100%）
    // 这是一个已知的 Android Media Session API 的 bug
    const audio = getGlobalAudio();
    const duration = getDuration();
    if (Number.isFinite(audio.currentTime) && audio.currentTime >= 0 && Number.isFinite(duration) && duration > 0) {
      syncMediaSessionPosition(audio.currentTime, duration);
    }
  }, [state.isPlaying, currentEpisode?.slug, syncMediaSessionPosition]);

  // 展开播放列表时，滚动到当前播放的 episode
  useEffect(() => {
    if (isExpanded && currentEpisodeRef.current && playlistContainerRef.current) {
      currentEpisodeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const panel = playlistPanelRef.current;
    if (!panel) return;

    const stopWheelChain = (event: WheelEvent) => {
      const canScroll = panel.scrollHeight > panel.clientHeight + 1;
      if (!canScroll) {
        event.preventDefault();
        return;
      }
      const atTop = panel.scrollTop <= 0;
      const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1;
      if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
        event.preventDefault();
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      playlistTouchStartYRef.current = touch.clientY;
    };

    const stopTouchChain = (event: TouchEvent) => {
      const touch = event.touches[0];
      const startY = playlistTouchStartYRef.current;
      if (!touch || startY === null) return;

      const canScroll = panel.scrollHeight > panel.clientHeight + 1;
      if (!canScroll) {
        event.preventDefault();
        return;
      }
      const deltaY = touch.clientY - startY;
      const atTop = panel.scrollTop <= 0;
      const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1;
      if ((deltaY > 0 && atTop) || (deltaY < 0 && atBottom)) {
        event.preventDefault();
      }
    };

    const clearTouchStart = () => {
      playlistTouchStartYRef.current = null;
    };

    panel.addEventListener('wheel', stopWheelChain, { passive: false });
    panel.addEventListener('touchstart', onTouchStart, { passive: true });
    panel.addEventListener('touchmove', stopTouchChain, { passive: false });
    panel.addEventListener('touchend', clearTouchStart);
    panel.addEventListener('touchcancel', clearTouchStart);

    return () => {
      panel.removeEventListener('wheel', stopWheelChain);
      panel.removeEventListener('touchstart', onTouchStart);
      panel.removeEventListener('touchmove', stopTouchChain);
      panel.removeEventListener('touchend', clearTouchStart);
      panel.removeEventListener('touchcancel', clearTouchStart);
      playlistTouchStartYRef.current = null;
    };
  }, [isExpanded]);
  
  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      persistProgressSnapshot();
    }
    updatePlayerState({ isPlaying: !state.isPlaying });
  }, [state.isPlaying, currentEpisode, persistProgressSnapshot]);

  const seekToTime = useCallback((rawValue: number) => {
    if (!Number.isFinite(rawValue)) return;
    resumeSeekPendingRef.current = null;
    const duration = getDuration();
    const safeDuration = Number.isFinite(duration) && duration > 0
      ? duration
      : (Number.isFinite(stateRef.current.duration) ? stateRef.current.duration : 0);
    if (safeDuration <= 0) return;
    const time = Math.min(Math.max(rawValue, 0), safeDuration);
    pendingSeekTime.current = null;
    pendingSeekRatio.current = null;
    setProgress(time);
    setHasEnded(false);
    const isTail = time >= Math.max(safeDuration - 1, 0);
    if (isTail) {
      lastSeekRef.current = null;
      tailSeekRef.current = true;
      scrubValueRef.current = null;
      setHasEnded(true);
      setProgress(safeDuration);
      updatePlayerState({ currentTime: 0 });
      saveProgress(0, safeDuration);
      lastSavedTimeRef.current = 0;
      syncMediaSessionPosition(0, safeDuration, { force: true });
      return;
    }
    tailSeekRef.current = false;
    lastSeekRef.current = { time, ts: Date.now(), attempts: 0 };
    if (scrubbingRef.current) {
      scrubValueRef.current = time;
      return;
    }
    setCurrentTime(time);
    saveProgress(time, safeDuration);
    lastSavedTimeRef.current = Math.floor(time);
    syncMediaSessionPosition(time, safeDuration, { force: true });
  }, []);

  useEffect(() => {
    bindMediaSessionHandlers({
      onPlay: () => {
        if (!stateRef.current.currentSlug) return;
        updatePlayerState({ isPlaying: true });
      },
      onPause: () => {
        updatePlayerState({ isPlaying: false });
      },
      onStop: () => {
        updatePlayerState({ isPlaying: false });
      },
      onSeekTo: (time) => {
        if (!stateRef.current.currentSlug) return;
        seekToTime(time);
      },
      onSeekBy: (offset) => {
        if (!stateRef.current.currentSlug) return;
        const audio = getGlobalAudio();
        if (!Number.isFinite(audio.currentTime)) return;
        seekToTime(audio.currentTime + offset);
      },
    });
  }, [seekToTime]);

  const handleSeek = useCallback((e: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(e.currentTarget.value);
    seekToTime(rawValue);
  }, [seekToTime]);

  const updateScrubFromClientX = useCallback((clientX: number) => {
    const rect = scrubRectRef.current;
    if (!rect || rect.width <= 0) return;
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);

    const duration = getDuration();
    const safeDuration = Number.isFinite(duration) && duration > 0
      ? duration
      : (Number.isFinite(stateRef.current.duration) ? stateRef.current.duration : 0);

    if (safeDuration > 0) {
      const time = ratio * safeDuration;
      scrubValueRef.current = time;
      setProgress(time);
      setHasEnded(false);
      syncMediaSessionPosition(time, safeDuration);
    } else {
      // Metadata may not be ready yet; remember ratio and apply later.
      pendingSeekRatio.current = ratio;
      scrubValueRef.current = null;
    }
  }, []);

  const handleScrubMove = useCallback((event: PointerEvent | TouchEvent) => {
    if (!scrubbingRef.current) return;
    let clientX: number | undefined;
    if ('touches' in event) {
      const t = event.touches[0] ?? event.changedTouches[0];
      clientX = t?.clientX;
      if (event.cancelable) event.preventDefault();
    } else {
      clientX = (event as PointerEvent).clientX;
    }
    if (typeof clientX !== 'number') return;
    updateScrubFromClientX(clientX);
  }, [updateScrubFromClientX]);

  const endScrub = useCallback(() => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    setIsScrubbing(false);
    window.removeEventListener('pointerup', endScrub);
    window.removeEventListener('pointercancel', endScrub);
    window.removeEventListener('pointermove', handleScrubMove);
    window.removeEventListener('touchend', endScrub);
    window.removeEventListener('touchcancel', endScrub);
    window.removeEventListener('touchmove', handleScrubMove as any);
    scrubRectRef.current = null;
    if (scrubValueRef.current != null) {
      const duration = getDuration();
      const safeDuration = Number.isFinite(duration) && duration > 0
        ? duration
        : (Number.isFinite(stateRef.current.duration) ? stateRef.current.duration : 0);
      const time = Math.max(scrubValueRef.current, 0);
      if (safeDuration > 0) {
        const clampedTime = Math.min(time, safeDuration);
        const isTail = clampedTime >= Math.max(safeDuration - 1, 0);
        if (isTail) {
          lastSeekRef.current = null;
          tailSeekRef.current = true;
          setHasEnded(true);
          setProgress(safeDuration);
          updatePlayerState({ currentTime: 0 });
          saveProgress(0, safeDuration);
          lastSavedTimeRef.current = 0;
          syncMediaSessionPosition(0, safeDuration, { force: true });
        } else {
          tailSeekRef.current = false;
          lastSeekRef.current = { time: clampedTime, ts: Date.now(), attempts: 0 };
          setProgress(clampedTime);
          setCurrentTime(clampedTime);
          saveProgress(clampedTime, safeDuration);
          lastSavedTimeRef.current = Math.floor(clampedTime);
          syncMediaSessionPosition(clampedTime, safeDuration, { force: true });
        }
      }
      scrubValueRef.current = null;
    }
    if (tailSeekRef.current) {
      tailSeekRef.current = false;
    } else if (wasPlayingRef.current) {
      wasPlayingRef.current = false;
      updatePlayerState({ isPlaying: true });
    }
  }, [handleScrubMove, syncMediaSessionPosition]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        endScrub();
      }
    };
    window.addEventListener('blur', endScrub);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('blur', endScrub);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [endScrub]);

  const startScrub = useCallback(() => {
    if (isMinimized) return false;
    if (scrubbingRef.current) return false;
    scrubbingRef.current = true;
    wasPlayingRef.current = stateRef.current.isPlaying;
    setHasEnded(false);
    setIsScrubbing(true);
    if (wasPlayingRef.current) {
      pauseAudio();
      setPlayIntent(false);
      updatePlayerState({ isPlaying: false });
    }
    window.addEventListener('pointerup', endScrub);
    window.addEventListener('pointercancel', endScrub);
    window.addEventListener('pointermove', handleScrubMove);
    window.addEventListener('touchend', endScrub);
    window.addEventListener('touchcancel', endScrub);
    window.addEventListener('touchmove', handleScrubMove as any, { passive: false });
    return true;
  }, [isMinimized, endScrub, handleScrubMove]);

  const handleSeekCommit = useCallback((e: h.JSX.TargetedEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(e.currentTarget.value);
    if (!Number.isFinite(rawValue)) return;
    const duration = getDuration();
    const safeDuration = Number.isFinite(duration) && duration > 0
      ? duration
      : (Number.isFinite(state.duration) ? state.duration : 0);
    const clampedValue = safeDuration > 0 ? Math.min(rawValue, safeDuration) : rawValue;
    const isTail = safeDuration > 0 && clampedValue >= Math.max(safeDuration - 1, 0);
    if (isTail) {
      setHasEnded(true);
    } else {
      setHasEnded(false);
      lastSeekRef.current = { time: clampedValue, ts: Date.now(), attempts: 0 };
    }
  }, [currentEpisode, progress, state.duration]);

  type ScrubStartEvent =
    | h.JSX.TargetedPointerEvent<HTMLDivElement>
    | h.JSX.TargetedTouchEvent<HTMLDivElement>;

  const handleProgressStart = useCallback((event: ScrubStartEvent) => {
    const started = startScrub();
    if (!started) return;
    if ('touches' in event) {
      if (event.cancelable) event.preventDefault();
    }
    const preferredRect = progressWrapperRef.current?.getBoundingClientRect?.();
    const fallbackRect = event.currentTarget?.getBoundingClientRect?.();
    if (preferredRect && preferredRect.width > 0) {
      scrubRectRef.current = preferredRect;
    } else if (fallbackRect) {
      scrubRectRef.current = fallbackRect;
    }

    const duration = getDuration();
    const safeDuration = Number.isFinite(duration) && duration > 0
      ? duration
      : (Number.isFinite(stateRef.current.duration) ? stateRef.current.duration : 0);
    const clientX = 'touches' in event
      ? event.touches[0]?.clientX
      : (event as h.JSX.TargetedPointerEvent<HTMLDivElement>).clientX;
    if (typeof clientX === 'number') {
      // Always update once on start so that “拖到 0”在移动端更容易触发。
      updateScrubFromClientX(clientX);
      // If metadata isn't ready yet, keep ratio in case we need to apply later.
      if (safeDuration <= 0 && scrubRectRef.current?.width) {
        const ratio = Math.min(Math.max((clientX - scrubRectRef.current.left) / scrubRectRef.current.width, 0), 1);
        pendingSeekRatio.current = ratio;
      }
    }
  }, [startScrub, updateScrubFromClientX]);
  
  const togglePlaybackRate = useCallback(() => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(state.playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    savePlaybackRateForLang(activePlaybackLang, nextRate);
    updatePlayerState({ playbackRate: nextRate });
  }, [state.playbackRate, currentEpisode, activePlaybackLang]);
  
  const handleClose = useCallback(() => {
    persistProgressSnapshot();
    // 先暂停音频
    pauseAudio();
    updatePlayerState({ isPlaying: false });
    // 清除播放意图
    setPlayIntent(false);
    // 稍微延迟卸载，确保暂停生效
    setTimeout(() => {
      onClose?.();
    }, 50);
  }, [onClose, currentEpisode?.slug, persistProgressSnapshot]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => {
      const newVal = !prev;
      // 最小化时同时关闭展开状态，避免播放列表残留
      if (newVal) {
        setIsExpanded(false);
      }
      return newVal;
    });
  }, [currentEpisode]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => {
      const next = !prev;
      return next;
    });
  }, [currentEpisode]);

  // 播放列表：只选择，不播放
  const selectEpisode = useCallback((episode: PodcastEpisode) => {
    if (currentEpisode?.slug === episode.slug) return;

    // 获取该 episode 的保存进度
    const savedProgress = getEpisodeProgress(episode.slug);
    const startTime = savedProgress?.currentTime ?? 0;
    const savedDuration = savedProgress?.duration ?? 0;

    // 设置待跳转时间，在 loadedmetadata 事件中使用
    pendingSeekTime.current = startTime;
    resumeSeekPendingRef.current = startTime > 0 ? Date.now() : null;

    setCurrentEpisode(episode);
    setAudioSrc(episode.url, { eager: false });
    // 重新应用倍速设置（因为切换音频源会重置倍速）
    setPlaybackRate(state.playbackRate);
    setProgress(startTime);
    setHasEnded(false);
    // 使用保存的 duration，避免使用上一集的 duration
    setState(prev => ({ ...prev, duration: savedDuration }));
    setIsReady(true);

    saveCurrentEpisode({
      slug: episode.slug,
      title: episode.title,
      url: episode.url,
      articleUrl: episode.articleUrl,
      date: episode.date.toISOString(),
      lang: episode.lang,
      description: episode.description,
      coverImage: episode.coverImage,
    });

    updatePlayerState({
      currentSlug: episode.slug,
      isPlaying: false,
      currentTime: startTime,
    });
  }, [currentEpisode, state.playbackRate]);

  const [episodeProgressMap, setEpisodeProgressMap] = useState<Record<string, { currentTime: number; duration: number }>>({});

  useEffect(() => {
    const syncPageLang = () => {
      setPageLang(getPageLang());
    };

    syncPageLang();
    window.addEventListener('popstate', syncPageLang);
    document.addEventListener('astro:after-swap', syncPageLang as EventListener);

    return () => {
      window.removeEventListener('popstate', syncPageLang);
      document.removeEventListener('astro:after-swap', syncPageLang as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    const map: Record<string, { currentTime: number; duration: number }> = {};
    visibleEpisodes.forEach((episode) => {
      const progress = getEpisodeProgress(episode.slug);
      if (progress) {
        map[episode.slug] = progress;
      }
    });
    setEpisodeProgressMap(map);
  }, [isExpanded, visibleEpisodes]);
  
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isExpanded) return;
    const handleDocumentClick = (event: MouseEvent) => {
      const root = playerRootRef.current;
      if (!root) return;
      const target = event.target as Node | null;
      if (target && root.contains(target)) return;
      setIsExpanded(false);
    };
    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isExpanded, currentEpisode?.slug]);

  if (!currentEpisode) {
    return null;
  }

  // 计算旋转持续时间：倍速越高，旋转越快
  const rotationDuration = `${20 / state.playbackRate}s`;

  // 计算统一进度百分比（0-100），主播放器和列表使用同一个进度值
  const rawDuration = getDuration();
  const currentDuration = Number.isFinite(rawDuration) && rawDuration > 0
    ? rawDuration
    : (Number.isFinite(state.duration) ? state.duration : 0);
  const clampedProgress = currentDuration > 0
    ? Math.min(Math.max(progress, 0), currentDuration)
    : Math.max(progress, 0);
  const seekMax = currentDuration > 0 ? currentDuration : 0;
  const seekValue = seekMax > 0 ? clampedProgress : 0;
  const progressPercent = hasEnded
    ? 100
    : (currentDuration > 0 ? Math.min((clampedProgress / currentDuration) * 100, 100) : 0);
  const remainingTime = currentDuration > 0 ? Math.max(currentDuration - clampedProgress, 0) : 0;
  const remainingLabel = currentDuration > 0 ? formatTime(remainingTime) : '';
  const ariaProgressText = currentDuration > 0
    ? `${formatTime(clampedProgress)} / ${formatTime(currentDuration)}`
    : '0:00';
  const bufferingShortLabel = activePlaybackLang === 'en' ? 'Buffering' : '缓冲中';
  const bufferingTitleLabel = activePlaybackLang === 'en' ? 'Buffering...' : '缓冲中...';
  const remainingTimeLabel = activePlaybackLang === 'en' ? 'Remaining time' : '剩余时间';
  const titleText = isBuffering ? bufferingTitleLabel : currentEpisode.title;

  return (
    <div
      ref={playerRootRef}
      className={`podcast-player ${isExpanded ? 'expanded' : ''} ${isMinimized ? 'minimized' : ''} ${state.isPlaying ? 'playing' : ''} ${isScrubbing ? 'scrubbing' : ''} ${isBuffering ? 'buffering' : ''}`}
      style={{ '--progress-percent': progressPercent, '--rotation-duration': rotationDuration } as any}
    >
          <div className="podcast-player-mini">
          {/* 封面图 - 点击切换最大化/最小化 */}
          <div
            className="player-cover"
            onClick={toggleMinimize}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleMinimize();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={isMinimized ? '展开播放器' : '最小化播放器'}
          >
            <img
              ref={coverImageRef}
              src={currentEpisode.coverImage ?? '/podcast-defualt-cover.png'}
              alt={currentEpisode.title}
            />
            <span className="player-cover-time" aria-hidden="true">
              {isBuffering ? bufferingShortLabel : remainingLabel}
            </span>
          </div>

          <button
            className="play-btn"
            onClick={togglePlay}
            aria-label={state.isPlaying ? '暂停' : '播放'}
          >
            {state.isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          <div className="progress-wrapper" ref={progressWrapperRef}>
            <div className="track-info">
              <span
                className="track-title"
                ref={titleWrapRef}
                style={
                  {
                    '--scroll-distance': `${titleScroll.distance}px`,
                    '--scroll-duration': `${titleScroll.duration}s`,
                    '--scroll-gap': '28px',
                  } as any
                }
              >
                {titleScroll.enabled ? (
                  <span className="track-title-marquee scrolling">
                    <span ref={titleTextRef} className="track-title-text">{titleText}</span>
                    <span className="track-title-gap" aria-hidden="true"></span>
                    <span className="track-title-text track-title-text-clone" aria-hidden="true">{titleText}</span>
                  </span>
                ) : (
                  <span ref={titleTextRef} className="track-title-text static">{titleText}</span>
                )}
              </span>
              <span className="track-time track-time-remaining" aria-label={remainingTimeLabel}>
                <span className="track-time-prefix" aria-hidden="true">-</span>
                {remainingLabel}
              </span>
            </div>
            <div className="track-time track-time-full">
              {formatTime(clampedProgress)} / {formatTime(currentDuration)}
            </div>
          </div>

          <div className="progress-container" onPointerDown={handleProgressStart} onTouchStart={handleProgressStart}>
            <input
              type="range"
              className="progress-bar"
              min="0"
              max={seekMax}
              value={seekValue}
              onInput={handleSeek}
              onChange={handleSeekCommit}
              aria-label="播放进度"
              aria-valuetext={ariaProgressText}
            />
          </div>
        
        <div className="player-controls">
          <button
            className="rate-btn"
            onClick={togglePlaybackRate}
            title="切换播放速度"
            aria-label={`播放速度 ${state.playbackRate} 倍`}
          >
            {formatPlaybackRateLabel(state.playbackRate)}
          </button>
          
          <button 
            className="expand-btn"
            onClick={toggleExpanded}
            aria-label={isExpanded ? '收起' : '展开'}
            aria-expanded={isExpanded}
            aria-controls="podcast-playlist"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              {isExpanded ? (
                <path d="M7 14l5-5 5 5z" />
              ) : (
                <path d="M7 10l5 5 5-5z" />
              )}
            </svg>
          </button>
          
          <button 
            className="close-btn"
            onClick={handleClose}
            aria-label="关闭播放器"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="player-error" role="alert" aria-live="assertive" aria-atomic="true">
          <span className="error-message">{error}</span>
          <button
            className="error-retry-btn"
            onClick={() => {
              setError(null);
              if (currentEpisode) {
                setAudioSrc(currentEpisode.url);
                updatePlayerState({ isPlaying: true });
              }
            }}
            aria-label="重试"
          >
            重试
          </button>
          <button
            className="error-dismiss-btn"
            onClick={() => setError(null)}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="playlist" id="podcast-playlist" ref={playlistPanelRef}>
          <div className="playlist-header">
            <span>{playlistTitle} ({visibleEpisodes.length})</span>
          </div>
          <ul className="playlist-items" ref={playlistContainerRef}>
            {visibleEpisodes.map((episode) => {
              const episodeProgress = episodeProgressMap[episode.slug];
              let progressPercent = 0;

              // 当前正在播放的集使用实时进度
              if (currentEpisode?.slug === episode.slug) {
                // 直接从音频元素获取实时 duration，避免使用 state 中可能过时的值
                const rawDuration = getDuration();
                const currentDuration = Number.isFinite(rawDuration) && rawDuration > 0
                  ? rawDuration
                  : (Number.isFinite(state.duration) ? state.duration : 0);
                if (hasEnded) {
                  // 音频结束时，确保显示 100%
                  progressPercent = 100;
                } else if (currentDuration > 0) {
                  const safeProgress = Math.min(Math.max(progress, 0), currentDuration);
                  progressPercent = Math.min((safeProgress / currentDuration) * 100, 100);
                }
              } else if (episodeProgress && episodeProgress.duration > 0) {
                progressPercent = Math.min((episodeProgress.currentTime / episodeProgress.duration) * 100, 100);
              }

              const isCurrentEpisode = currentEpisode?.slug === episode.slug;

              return (
                <li
                  key={episode.slug}
                  ref={isCurrentEpisode ? currentEpisodeRef : null}
                  className={`playlist-item ${isCurrentEpisode ? 'active' : ''}`}
                  style={{ '--progress-percent': progressPercent } as any}
                >
                  <button
                    className="item-play-btn"
                    onClick={() => selectEpisode(episode)}
                    aria-label="选择曲目"
                  >
                    {currentEpisode?.slug === episode.slug && state.isPlaying ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </button>

                  <a
                    href={episode.articleUrl}
                    className="item-title"
                  >
                    {episode.title}
                  </a>

                  <span className="item-date">
                    {new Date(episode.date).toLocaleDateString(playlistDateLocale, {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
