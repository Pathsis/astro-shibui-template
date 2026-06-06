const scheduleNonCriticalTask = function(task) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(function() {
      task();
    }, { timeout: 2000 });
    return;
  }

  window.setTimeout(task, 1200);
};

export const installUmamiAnalytics = function(runtime, config) {
  if (runtime.flags.umamiAnalyticsInstalled) return;
  runtime.flags.umamiAnalyticsInstalled = true;

  const host = window.location.hostname;
  if (!config.umamiScriptSrc || !config.umamiWebsiteId || !config.umamiHosts.includes(host)) {
    return;
  }

  scheduleNonCriticalTask(function() {
    if (document.querySelector(`script[src="${config.umamiScriptSrc}"]`)) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = config.umamiScriptSrc;
    script.setAttribute('data-website-id', config.umamiWebsiteId);
    document.head.appendChild(script);
  });
};

export const installClarityAnalytics = function(runtime, config) {
  if (runtime.flags.clarityAnalyticsInstalled) return;
  runtime.flags.clarityAnalyticsInstalled = true;

  const host = window.location.hostname;
  if (!config.clarityProjectId || !config.clarityHosts.includes(host)) {
    return;
  }

  window.clarity = window.clarity || function() {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };

  scheduleNonCriticalTask(function() {
    const src = 'https://www.clarity.ms/tag/' + config.clarityProjectId;
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  });
};
