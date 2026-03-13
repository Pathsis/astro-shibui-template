// 全局音频实例管理
// 这个模块创建和管理一个全局唯一的音频元素，确保在页面切换时音频不会中断

let globalAudio: HTMLAudioElement | null = null;
let currentSrc: string | null = null;

// 事件监听器集合
const timeUpdateListeners = new Set<(time: number) => void>();
const loadedMetadataListeners = new Set<(duration: number) => void>();
const waitingListeners = new Set<() => void>();
const canPlayListeners = new Set<() => void>();
const endedListeners = new Set<() => void>();
const errorListeners = new Set<() => void>();
const playListeners = new Set<() => void>();
const pauseListeners = new Set<() => void>();
const seekedListeners = new Set<() => void>();

function getAudioMountTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('podcast-player-container') || document.body;
}

function ensureAudioMounted(audio: HTMLAudioElement): void {
  const mountTarget = getAudioMountTarget();
  if (!mountTarget) return;
  if (audio.parentNode !== mountTarget) {
    mountTarget.appendChild(audio);
  }
}

/**
 * 获取或创建全局音频元素
 */
export function getGlobalAudio(): HTMLAudioElement {
  // 如果音频元素存在但不在 DOM 中（页面切换后），重新添加
  if (globalAudio && (!globalAudio.parentNode || !document.contains(globalAudio))) {
    ensureAudioMounted(globalAudio);
  }
  
  if (!globalAudio) {
    globalAudio = document.createElement('audio');
    globalAudio.id = 'global-podcast-audio';
    globalAudio.preload = 'metadata';
    globalAudio.crossOrigin = 'anonymous';
    
    // 添加事件监听
    globalAudio.addEventListener('timeupdate', () => {
      timeUpdateListeners.forEach(cb => cb(globalAudio!.currentTime));
    });
    
    globalAudio.addEventListener('loadedmetadata', () => {
      loadedMetadataListeners.forEach(cb => cb(globalAudio!.duration));
    });
    
    globalAudio.addEventListener('waiting', () => {
      waitingListeners.forEach(cb => cb());
    });
    
    globalAudio.addEventListener('canplay', () => {
      canPlayListeners.forEach(cb => cb());
    });
    
    globalAudio.addEventListener('ended', () => {
      endedListeners.forEach(cb => cb());
    });
    
    globalAudio.addEventListener('error', () => {
      errorListeners.forEach(cb => cb());
    });

    globalAudio.addEventListener('play', () => {
      playListeners.forEach(cb => cb());
    });

    globalAudio.addEventListener('pause', () => {
      pauseListeners.forEach(cb => cb());
    });

    globalAudio.addEventListener('seeked', () => {
      seekedListeners.forEach(cb => cb());
    });
    
    // 将音频元素添加到 body 但隐藏它
    globalAudio.style.cssText = 'display: none; position: absolute; visibility: hidden;';
    ensureAudioMounted(globalAudio);
    
    // 监听 View Transitions 事件，确保音频在页面切换后仍然存在于 DOM
    if (typeof document !== 'undefined') {
      document.addEventListener('astro:after-swap', () => {
        if (globalAudio && (!globalAudio.parentNode || !document.contains(globalAudio))) {
          ensureAudioMounted(globalAudio);
        }
      });
    }
  }
  
  return globalAudio;
}

/**
 * 设置音频源
 */
export function setAudioSrc(src: string, options: { eager?: boolean } = {}): void {
  const eager = options.eager !== false;
  const audio = getGlobalAudio();
  if (currentSrc === src) return;
  if (typeof window !== 'undefined') {
    try {
      const resolved = new URL(src, window.location.href).href;
      if (audio.currentSrc === resolved) {
        currentSrc = src;
        return;
      }
    } catch (e) {
      // ignore URL resolution errors
    }
  }
  currentSrc = src;
  if (!eager) {
    // Passive restore path: keep the source but avoid immediate network fetch.
    audio.preload = 'none';
    audio.src = src;
    return;
  }
  if (audio.preload !== 'metadata' && audio.preload !== 'auto') {
    audio.preload = 'metadata';
  }
  audio.src = src;
  audio.load();
}

/**
 * 获取当前音频源
 */
export function getCurrentSrc(): string | null {
  return currentSrc;
}

/**
 * 播放音频
 */
export function playAudio(): Promise<void> {
  const audio = getGlobalAudio();
  if (audio.preload !== 'auto') {
    audio.preload = 'auto';
  }
  if (audio.readyState === HTMLMediaElement.HAVE_NOTHING && audio.src) {
    audio.load();
  }
  return audio.play();
}

/**
 * 暂停音频
 */
export function pauseAudio(): void {
  const audio = getGlobalAudio();
  audio.pause();
}

/**
 * 设置播放时间
 */
export function setCurrentTime(time: number): void {
  const audio = getGlobalAudio();
  audio.currentTime = time;
}

/**
 * 获取当前播放时间
 */
export function getCurrentTime(): number {
  const audio = getGlobalAudio();
  return audio.currentTime;
}

/**
 * 获取音频总时长
 */
export function getDuration(): number {
  const audio = getGlobalAudio();
  return audio.duration || 0;
}

/**
 * 设置播放速度
 */
export function setPlaybackRate(rate: number): void {
  const audio = getGlobalAudio();
  audio.playbackRate = rate;
}

/**
 * 获取播放速度
 */
export function getPlaybackRate(): number {
  const audio = getGlobalAudio();
  return audio.playbackRate;
}

/**
 * 设置音量
 */
export function setVolume(volume: number): void {
  const audio = getGlobalAudio();
  audio.volume = volume;
}

/**
 * 获取音量
 */
export function getVolume(): number {
  const audio = getGlobalAudio();
  return audio.volume;
}

/**
 * 检查是否正在播放
 */
export function isPlaying(): boolean {
  const audio = getGlobalAudio();
  return !audio.paused;
}

/**
 * 订阅时间更新
 */
export function onTimeUpdate(callback: (time: number) => void): () => void {
  timeUpdateListeners.add(callback);
  return () => timeUpdateListeners.delete(callback);
}

/**
 * 订阅元数据加载完成
 */
export function onLoadedMetadata(callback: (duration: number) => void): () => void {
  loadedMetadataListeners.add(callback);
  // 如果元数据已经就绪，立即回调一次，避免错过事件导致无法恢复进度
  const audio = getGlobalAudio();
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(audio.duration) && audio.duration > 0) {
    callback(audio.duration);
  }
  return () => loadedMetadataListeners.delete(callback);
}

/**
 * 订阅缓冲等待
 */
export function onWaiting(callback: () => void): () => void {
  waitingListeners.add(callback);
  return () => waitingListeners.delete(callback);
}

/**
 * 订阅可以播放
 */
export function onCanPlay(callback: () => void): () => void {
  canPlayListeners.add(callback);
  return () => canPlayListeners.delete(callback);
}

/**
 * 订阅播放结束
 */
export function onEnded(callback: () => void): () => void {
  endedListeners.add(callback);
  return () => endedListeners.delete(callback);
}

/**
 * 订阅错误
 */
export function onError(callback: () => void): () => void {
  errorListeners.add(callback);
  return () => errorListeners.delete(callback);
}

/**
 * 订阅播放事件
 */
export function onPlay(callback: () => void): () => void {
  playListeners.add(callback);
  return () => playListeners.delete(callback);
}

/**
 * 订阅暂停事件
 */
export function onPause(callback: () => void): () => void {
  pauseListeners.add(callback);
  return () => pauseListeners.delete(callback);
}

/**
 * 订阅完成跳转事件
 */
export function onSeeked(callback: () => void): () => void {
  seekedListeners.add(callback);
  return () => seekedListeners.delete(callback);
}

/**
 * 清理所有监听器（用于防止内存泄漏）
 * 在组件卸载或需要重置时调用
 */
export function cleanupAudioListeners(): void {
  timeUpdateListeners.clear();
  loadedMetadataListeners.clear();
  waitingListeners.clear();
  canPlayListeners.clear();
  endedListeners.clear();
  errorListeners.clear();
  playListeners.clear();
  pauseListeners.clear();
  seekedListeners.clear();
}

/**
 * 获取音频错误信息（用于 UI 显示）
 */
export function getAudioError(): string | null {
  const audio = getGlobalAudio();
  if (audio.error) {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const networkNoSource = typeof HTMLMediaElement !== 'undefined'
      ? HTMLMediaElement.NETWORK_NO_SOURCE
      : 3;
    switch (audio.error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return '音频加载被中止';
      case MediaError.MEDIA_ERR_NETWORK:
        return isOffline ? '网络已断开' : '网络错误，无法加载音频';
      case MediaError.MEDIA_ERR_DECODE:
        return '音频解码失败';
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        if (isOffline) {
          return '网络已断开';
        }
        if (audio.networkState === networkNoSource && audio.currentSrc) {
          return '音频资源不可用或地址错误';
        }
        return '音频格式不支持或资源不可用';
      default:
        return '未知音频错误';
    }
  }
  return null;
}
