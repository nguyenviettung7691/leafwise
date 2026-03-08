// Stub module for genkit packages in static export builds.
// The AI flows require a server runtime and are not available in static export mode.
// They run on a separate Genkit dev server and should be called via HTTP API.
module.exports = new Proxy({}, {
  get: function(target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return module.exports;
    return function() {
      throw new Error('AI flows are not available in static export mode. Use the Genkit dev server API instead.');
    };
  }
});
