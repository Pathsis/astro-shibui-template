// 全局播放器状态管理
// 使用自定义事件和 localStorage 实现跨页面状态同步

export interface PlayerState {
  currentSlug: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
}

export type PlayerLang = 'zh-cn' | 'en';

interface UpdatePlayerStateOptions {
  silent?: boolean;
}

const STORAGE_KEY = 'podcast-player-state';
const EPISODE_STORAGE_KEY = 'podcast-current-episode';
const EPISODE_PROGRESS_KEY = 'podcast-episode-progress-';
const PLAYBACK_RATE_KEY = 'podcast-playback-rate-';
const DISMISSED_KEY = 'podcast-player-dismissed';
const MINIMIZED_KEY = 'podcast-player-minimized';
const PLAY_INTENT_KEY = 'podcast-play-intent'; // 追踪用户播放意图（用于 View Transitions）

// 默认状态
const defaultState: PlayerState = {
  currentSlug: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  volume: 1,
};

// localStorage 可用性缓存
let isLocalStorageAvailable: boolean | null = null;

/**
 * 检测 localStorage 是否可用（处理隐私模式情况）
 */
function isStorageAvailable(): boolean {
  if (isLocalStorageAvailable !== null) {
    return isLocalStorageAvailable;
  }

  if (typeof window === 'undefined') {
    isLocalStorageAvailable = false;
    return false;
  }

  try {
    const testKey = '__podcast_player_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    isLocalStorageAvailable = true;
    return true;
  } catch (e) {
    // localStorage 不可用（隐私模式、存储已满等）
    isLocalStorageAvailable = false;
    return false;
  }
}

/**
 * 安全的 localStorage 操作（自动处理不可用情况）
 */
function safeSetItem(key: string, value: string): boolean {
  if (!isStorageAvailable()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function safeGetItem(key: string): string | null {
  if (!isStorageAvailable()) return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function safeRemoveItem(key: string): boolean {
  if (!isStorageAvailable()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

// 当前状态
let currentState: PlayerState = { ...defaultState };

// 监听器集合
const listeners = new Set<(state: PlayerState) => void>();

function resolveLangFromSlug(slug: string | null): PlayerLang {
  if (!slug) return 'zh-cn';
  return slug.endsWith('__en') ? 'en' : 'zh-cn';
}

function normalizeRate(value: unknown): number | null {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 4) return null;
  return Math.round(rate * 100) / 100;
}

/**
 * 从 localStorage 加载状态
 */
function loadState(): PlayerState {
  if (typeof window === 'undefined') return { ...defaultState };
  
  try {
    const saved = safeGetItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 检查状态是否在24小时内
      if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        const parsedRate = normalizeRate(parsed.playbackRate) ?? 1;
        // 迁移旧的全局倍速：为当前语言写入一份独立记录，避免升级后丢失原设置。
        const activeLang = resolveLangFromSlug(parsed.currentSlug ?? null);
        const perLangKey = `${PLAYBACK_RATE_KEY}${activeLang}`;
        if (!safeGetItem(perLangKey)) {
          safeSetItem(
            perLangKey,
            JSON.stringify({
              rate: parsedRate,
              timestamp: Date.now(),
            })
          );
        }
        return {
          ...defaultState,
          currentSlug: parsed.currentSlug ?? null,
          currentTime: parsed.currentTime ?? 0,
          playbackRate: parsedRate,
          volume: parsed.volume ?? 1,
          // 页面刷新后默认暂停
          isPlaying: false,
        };
      }
    }
  } catch (e) {
    console.error('Failed to load podcast state:', e);
  }
  
  return { ...defaultState };
}

/**
 * 保存状态到 localStorage
 */
function saveState(state: PlayerState) {
  if (typeof window === 'undefined') return;
  
  try {
    safeSetItem(STORAGE_KEY, JSON.stringify({
      ...state,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.error('Failed to save podcast state:', e);
  }
}

/**
 * 广播状态更新
 */
function broadcastState(state: PlayerState) {
  if (typeof window === 'undefined') return;
  
  // 同时保存到 localStorage 以便新页面加载
  saveState(state);
}

/**
 * 初始化播放器状态
 */
export function initPlayerState(): PlayerState {
  currentState = loadState();
  return currentState;
}

/**
 * 获取当前状态
 */
export function getPlayerState(): PlayerState {
  return { ...currentState };
}

/**
 * 更新播放器状态
 */
export function updatePlayerState(
  updates: Partial<PlayerState>,
  options: UpdatePlayerStateOptions = {}
) {
  const hasChanges = (Object.keys(updates) as Array<keyof PlayerState>).some(
    (key) => currentState[key] !== updates[key]
  );
  if (!hasChanges) return;

  currentState = { ...currentState, ...updates };
  broadcastState(currentState);

  if (options.silent) return;

  // 通知所有监听器
  listeners.forEach(listener => listener(currentState));
}

/**
 * 订阅状态变化
 */
export function subscribeToPlayerState(callback: (state: PlayerState) => void) {
  listeners.add(callback);
  
  // 立即返回当前状态
  callback(currentState);
  
  // 返回取消订阅函数
  return () => {
    listeners.delete(callback);
  };
}

/**
 * 监听来自其他页面的状态更新
 */
/**
 * 重置播放器状态
 */
export function resetPlayerState() {
  currentState = { ...defaultState };
  broadcastState(currentState);
  listeners.forEach(listener => listener(currentState));
}

/**
 * 保存播放进度（周期性调用）
 */
export function saveProgress(currentTime: number, duration: number) {
  const updates: Partial<PlayerState> = { currentTime };
  if (Number.isFinite(duration) && duration > 0) {
    updates.duration = duration;
  }
  // 进度保存是高频操作，静默更新可避免触发整页组件重渲染。
  updatePlayerState(updates, { silent: true });

  // 同时保存当前 episode 的进度（用于切换后恢复）
  if (currentState.currentSlug) {
    saveEpisodeProgress(currentState.currentSlug, currentTime, duration);
  }
}

/**
 * 保存指定 episode 的播放进度
 */
export function saveEpisodeProgress(slug: string, currentTime: number, duration: number) {
  if (typeof window === 'undefined') return;

  try {
    const previous = getEpisodeProgress(slug);
    const safeDuration = Number.isFinite(duration) && duration > 0
      ? duration
      : (previous?.duration ?? 0);
    safeSetItem(`${EPISODE_PROGRESS_KEY}${slug}`, JSON.stringify({
      currentTime,
      duration: safeDuration,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.error('Failed to save episode progress:', e);
  }
}

/**
 * 获取指定 episode 的播放进度
 */
export function getEpisodeProgress(slug: string): { currentTime: number; duration: number } | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = safeGetItem(`${EPISODE_PROGRESS_KEY}${slug}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 检查是否在7天内（保存更久时间）
      if (parsed.timestamp && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return {
          currentTime: parsed.currentTime ?? 0,
          duration: parsed.duration ?? 0,
        };
      }
      // 过期则清除
      safeRemoveItem(`${EPISODE_PROGRESS_KEY}${slug}`);
    }
  } catch (e) {
    console.error('Failed to get episode progress:', e);
  }

  return null;
}

/**
 * 保存当前播放的 episode 信息
 */
export function saveCurrentEpisode(episode: { slug: string; title: string; url: string; articleUrl: string; date: string; lang: string; description?: string; coverImage?: string }) {
  if (typeof window === 'undefined') return;
  
  try {
    safeSetItem(EPISODE_STORAGE_KEY, JSON.stringify({
      ...episode,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.error('Failed to save episode:', e);
  }
}

/**
 * 获取保存的 episode 信息
 */
export function getSavedEpisode() {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = safeGetItem(EPISODE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 检查是否在24小时内
      if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to get saved episode:', e);
  }
  
  return null;
}

/**
 * 保存指定语言的倍速偏好
 */
export function savePlaybackRateForLang(lang: PlayerLang, rate: number) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeRate(rate);
  if (normalized == null) return;
  safeSetItem(
    `${PLAYBACK_RATE_KEY}${lang}`,
    JSON.stringify({
      rate: normalized,
      timestamp: Date.now(),
    })
  );
}

/**
 * 获取指定语言的倍速偏好
 */
export function getPlaybackRateForLang(lang: PlayerLang): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = safeGetItem(`${PLAYBACK_RATE_KEY}${lang}`);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    const normalized = normalizeRate(parsed?.rate);
    if (normalized == null) {
      safeRemoveItem(`${PLAYBACK_RATE_KEY}${lang}`);
      return null;
    }
    return normalized;
  } catch (e) {
    return null;
  }
}

/**
 * 完全清除播放器状态（用户点击关闭按钮时调用）
 * 设置一个 dismissed 标记，页面刷新后播放器不会自动显示
 * 但保留 episode 信息，点击"收听 AI 播客"可以继续播放
 */
export function clearPlayerState() {
  if (typeof window === 'undefined') return;

  try {
    // 设置 dismissed 标记，表示用户主动关闭了播放器
    safeSetItem(DISMISSED_KEY, JSON.stringify({
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.error('Failed to set dismissed flag:', e);
  }

  // 只重置播放状态，保留 episode 和进度信息
  const previousSlug = currentState.currentSlug;
  const previousTime = currentState.currentTime;
  const previousRate = currentState.playbackRate;

  currentState = {
    ...defaultState,
    // 保留 episode 信息，以便恢复播放
    currentSlug: previousSlug,
    currentTime: previousTime,
    playbackRate: previousRate,
  };
  // 持久化最新状态，避免刷新后回退到旧状态
  saveState(currentState);
  // 广播状态更新（通知所有监听器）
  listeners.forEach(listener => listener(currentState));
}

/**
 * 清除 dismissed 标记（用户点击播放按钮时调用）
 */
export function clearDismissedState() {
  if (typeof window === 'undefined') return;

  try {
    safeRemoveItem(DISMISSED_KEY);
  } catch (e) {
    // ignore
  }
}

/**
 * 检查播放器是否被用户主动关闭
 */
export function isPlayerDismissed(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const dismissed = safeGetItem(DISMISSED_KEY);
    if (dismissed) {
      const parsed = JSON.parse(dismissed);
      // 标记在 24 小时内有效
      if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return true;
      }
      // 过期则清除
      safeRemoveItem(DISMISSED_KEY);
    }
  } catch (e) {
    // ignore
  }
  return false;
}

/**
 * 保存播放器最小化状态
 */
export function setPlayerMinimized(minimized: boolean) {
  if (typeof window === 'undefined') return;
  try {
    safeSetItem(MINIMIZED_KEY, JSON.stringify({
      minimized,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // ignore
  }
}

/**
 * 获取播放器最小化状态
 */
export function getPlayerMinimized(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = safeGetItem(MINIMIZED_KEY);
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    if (typeof parsed?.minimized === 'boolean') {
      return parsed.minimized;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

/**
 * 播放意图管理（用于 View Transitions）
 * 当用户点击播放时，设置此标记，页面跳转后恢复播放
 */

/**
 * 设置播放意图
 */
export function setPlayIntent(playing: boolean) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PLAY_INTENT_KEY, playing ? '1' : '0');
  } catch (e) {
    // ignore
  }
}

/**
 * 获取播放意图
 */
export function getPlayIntent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const intent = sessionStorage.getItem(PLAY_INTENT_KEY);
    return intent === '1';
  } catch (e) {
    return false;
  }
}

/**
 * 清除播放意图
 */
export function clearPlayIntent() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PLAY_INTENT_KEY);
  } catch (e) {
    // ignore
  }
}
