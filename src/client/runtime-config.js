const parseHosts = function(value) {
  if (!value) return [];
  return value.split(',').map(function(item) {
    return item.trim();
  }).filter(Boolean);
};

export const getClientRuntimeConfig = function() {
  const dataset = document.body?.dataset || {};
  return {
    umamiScriptSrc: dataset.umamiScriptSrc || '',
    umamiWebsiteId: dataset.umamiWebsiteId || '',
    umamiHosts: parseHosts(dataset.umamiHosts),
    umamiPerformance: dataset.umamiPerformance !== 'false',
    clarityProjectId: dataset.clarityProjectId || '',
    clarityHosts: parseHosts(dataset.clarityHosts),
  };
};
