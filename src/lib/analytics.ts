type UmamiTracker = {
  track: (event: string, data?: Record<string, unknown>) => void;
};

function getPageLang(): 'zh' | 'en' {
  if (typeof document === 'undefined') return 'zh';
  return (document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'zh';
}

function getPageKind(): string {
  if (typeof document === 'undefined') return 'unknown';
  return document.body?.dataset?.pageKind || 'unknown';
}

function normalizePayload(data?: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    path: typeof window !== 'undefined' ? window.location.pathname : '/',
    pageKind: getPageKind(),
    pageLang: getPageLang(),
  };

  if (!data) return payload;

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'undefined') continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      payload[key] = trimmed.length > 160 ? trimmed.slice(0, 160) : trimmed;
      continue;
    }
    payload[key] = value;
  }

  return payload;
}

export function trackUmami(event: string, data?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const umami = (window as any).umami as UmamiTracker | undefined;
  if (!umami || typeof umami.track !== 'function') return;
  const payload = normalizePayload(data);
  try {
    umami.track(event, payload);
  } catch {
    try {
      umami.track(event);
    } catch {
      // ignore
    }
  }
}
