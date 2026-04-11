/**
 * Next.js 15/16 Hydration Fix
 * 
 * Patch: Next.js framework calls new URL(canonicalUrl) during hydration
 * before router state is initialized, causing:
 *   TypeError: URL constructor: undefined is not a valid URL
 *
 * This patch wraps the URL constructor to handle undefined/null gracefully.
 * It must load BEFORE any Next.js client bundles.
 */
(function() {
  var _OriginalURL = window.URL;
  
  window.URL = function(url, base) {
    // If url is undefined/null, fall back to base or current location
    if (url === undefined || url === null) {
      return new _OriginalURL(base || window.location.href);
    }
    return base !== undefined
      ? new _OriginalURL(url, base)
      : new _OriginalURL(url);
  };
  
  // Preserve static methods
  window.URL.prototype = _OriginalURL.prototype;
  window.URL.createObjectURL = _OriginalURL.createObjectURL;
  window.URL.revokeObjectURL = _OriginalURL.revokeObjectURL;
})();
