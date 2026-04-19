type UmamiTracker = {
  track: (event: string, data?: Record<string, unknown>) => void;
};

export function trackUmami(event: string, data?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const umami = (window as any).umami as UmamiTracker | undefined;
  if (!umami || typeof umami.track !== 'function') return;
  try {
    if (data) {
      umami.track(event, data);
    } else {
      umami.track(event);
    }
  } catch {
    try {
      umami.track(event);
    } catch {
      // ignore
    }
  }
}
