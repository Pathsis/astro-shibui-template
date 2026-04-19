export const installUmamiAnalytics = function(runtime, config) {
  if (runtime.flags.umamiAnalyticsInstalled) return;
  runtime.flags.umamiAnalyticsInstalled = true;

  const host = window.location.hostname;
  if (!config.umamiScriptSrc || !config.umamiWebsiteId || !config.umamiHosts.includes(host)) {
    return;
  }

  const script = document.createElement('script');
  script.defer = true;
  script.src = config.umamiScriptSrc;
  script.setAttribute('data-website-id', config.umamiWebsiteId);
  document.head.appendChild(script);
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

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.clarity.ms/tag/' + config.clarityProjectId;
  document.head.appendChild(script);
};
