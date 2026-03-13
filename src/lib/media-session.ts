export type MediaSessionPlaybackState = 'none' | 'paused' | 'playing';

export interface MediaSessionArtwork {
  src: string;
  sizes?: string;
  type?: string;
}

export interface MediaSessionMetadataInput {
  title: string;
  artist?: string;
  album?: string;
  artwork?: MediaSessionArtwork[];
}

export interface MediaSessionPositionInput {
  duration: number;
  position: number;
  playbackRate?: number;
}

export interface MediaSessionHandlers {
  onPlay: () => void;
  onPause: () => void;
  onStop?: () => void;
  onSeekTo?: (time: number) => void;
  onSeekBy?: (offset: number) => void;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
}

function getMediaSession(): MediaSession | null {
  if (typeof navigator === 'undefined') return null;
  const anyNav = navigator as any;
  return anyNav.mediaSession ?? null;
}

function resolveToAbsoluteUrl(src: string): string {
  if (typeof window === 'undefined') return src;
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

function trySetHandler(
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null
): void {
  const session = getMediaSession();
  if (!session) return;
  try {
    session.setActionHandler(action, handler);
  } catch {
    // Some browsers throw for unsupported actions.
  }
}

let installed = false;
let boundHandlers: MediaSessionHandlers | null = null;

/**
 * Bind Media Session action handlers.
 *
 * This function is safe to call multiple times; it always refreshes the
 * handlers reference and installs browser handlers only once.
 */
export function bindMediaSessionHandlers(handlers: MediaSessionHandlers): void {
  boundHandlers = handlers;
  const session = getMediaSession();
  if (!session) return;

  if (installed) return;
  installed = true;

  trySetHandler('play', () => boundHandlers?.onPlay());
  trySetHandler('pause', () => boundHandlers?.onPause());
  trySetHandler('stop', () => {
    if (boundHandlers?.onStop) return boundHandlers.onStop();
    return boundHandlers?.onPause();
  });

  trySetHandler('seekto', (details: any) => {
    const t = typeof details?.seekTime === 'number' ? details.seekTime : 0;
    boundHandlers?.onSeekTo?.(t);
  });

  trySetHandler('seekbackward', (details: any) => {
    const offset = typeof details?.seekOffset === 'number' ? details.seekOffset : 10;
    if (!Number.isFinite(offset) || offset <= 0) return;
    boundHandlers?.onSeekBy?.(-offset);
  });

  trySetHandler('seekforward', (details: any) => {
    const offset = typeof details?.seekOffset === 'number' ? details.seekOffset : 10;
    if (!Number.isFinite(offset) || offset <= 0) return;
    boundHandlers?.onSeekBy?.(offset);
  });

  trySetHandler('previoustrack', () => boundHandlers?.onPreviousTrack?.());
  trySetHandler('nexttrack', () => boundHandlers?.onNextTrack?.());
}

export function setMediaSessionMetadata(input: MediaSessionMetadataInput | null): void {
  const session = getMediaSession();
  if (!session) return;
  if (typeof MediaMetadata === 'undefined') return;

  try {
    if (!input) {
      session.metadata = null;
      return;
    }

    session.metadata = new MediaMetadata({
      title: input.title,
      artist: input.artist,
      album: input.album,
      artwork: input.artwork?.map((a) => ({
        ...a,
        src: resolveToAbsoluteUrl(a.src),
      })),
    });
  } catch {
    // ignore
  }
}

export function setMediaSessionPlaybackState(state: MediaSessionPlaybackState): void {
  const session = getMediaSession();
  if (!session) return;
  try {
    session.playbackState = state;
  } catch {
    // ignore
  }
}

// 检测是否是 Android 设备
function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua);
}

export function setMediaSessionPositionState(input: MediaSessionPositionInput): void {
  const session = getMediaSession();
  if (!session) return;
  const anySession = session as any;
  const setPositionState = anySession.setPositionState as undefined | ((state: any) => void);
  if (!setPositionState) return;

  const duration = input.duration;
  const position = input.position;
  const playbackRate = input.playbackRate ?? 1;

  if (!Number.isFinite(duration) || duration <= 0) return;
  if (!Number.isFinite(position) || position < 0) return;
  if (!Number.isFinite(playbackRate) || playbackRate <= 0) return;

  // Android 的 Media Session API 实现有严重 bug，setPositionState 会导致
  // 进度显示错误（始终 0% 或 100%），因此在 Android 上禁用该功能
  // 相关 bug 报告：
  // - https://issues.chromium.org/issues/40287871
  // - https://issues.chromium.org/issues/40743064
  // - https://issues.chromium.org/issues/40926662
  if (isAndroid()) {
    return;
  }

  try {
    // 官方文档要求 position 必须小于 duration（不能等于）
    // 如果 position >= duration，设置为 duration - 0.001 避免显示为 100%
    // 参考：https://web.dev/articles/media-session#set_playback_position
    const safePosition = position < duration ? position : Math.max(duration - 0.001, 0);
    setPositionState.call(session, {
      duration,
      playbackRate,
      position: safePosition,
    });
  } catch {
    // ignore
  }
}

