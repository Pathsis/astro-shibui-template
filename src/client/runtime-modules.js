const runtimeImporters = {
  featured: function() {
    return import('./featured-runtime.js');
  },
  pagination: function() {
    return import('./pagination-runtime.js');
  },
  article: function() {
    return import('./article-runtime.js');
  },
  podcastPlayer: function() {
    return import('./podcast-player-runtime.js');
  },
};

const createRuntimeRegistrars = function(runtime) {
  return {
    featured: function(module) {
      if (typeof module.registerFeaturedRuntime === 'function') {
        module.registerFeaturedRuntime(runtime);
      }
    },
    pagination: function(module) {
      if (typeof module.registerPaginationRuntime === 'function') {
        module.registerPaginationRuntime(runtime);
      }
    },
    article: function(module) {
      if (typeof module.registerArticleRuntime === 'function') {
        module.registerArticleRuntime(runtime);
      }
    },
    podcastPlayer: function(module) {
      if (typeof module.registerPodcastPlayerRuntime === 'function') {
        module.registerPodcastPlayerRuntime(runtime);
      }
    },
  };
};

export const createRuntimeModuleLoader = function(runtime) {
  const runtimeModulePromises = runtime.modules.promises || {};
  const runtimeRegistrars = createRuntimeRegistrars(runtime);

  return function loadRuntimeModule(name) {
    if (runtimeModulePromises[name]) {
      return runtimeModulePromises[name];
    }

    const importer = runtimeImporters[name];
    if (!importer) {
      return Promise.reject(new Error(`Unknown runtime module: ${name}`));
    }

    runtimeModulePromises[name] = importer()
      .then(function(module) {
        const registrar = runtimeRegistrars[name];
        if (typeof registrar === 'function') {
          registrar(module);
        }
        return module;
      })
      .catch(function(error) {
        delete runtimeModulePromises[name];
        throw error;
      });

    return runtimeModulePromises[name];
  };
};
