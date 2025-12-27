/**
 * Trusted Types Policy Creation
 * This script creates a default Trusted Types policy to allow the application
 * to function in environments where Trusted Types are enforced (e.g., by extensions).
 */
(function() {
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
      // Check if a default policy already exists
      if (!window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy('default', {
          createHTML: function(string) { return string; },
          createScript: function(string) { return string; },
          createScriptURL: function(string) { return string; }
        });
        console.log('Created default Trusted Types policy');
      }
    } catch (e) {
      console.warn('Failed to create default Trusted Types policy:', e);
    }
  }
})();
