'use strict';

/**
 * Very small, dependency-free User-Agent classifier. We only need to tell
 * Android / iOS / desktop apart to pick the right store redirect.
 */

function detectPlatform(userAgent = '') {
  const ua = String(userAgent);

  // iPadOS 13+ reports as "Macintosh"; disambiguate with touch hint when present.
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && /Mobile/i.test(ua));

  // Exclude "Windows" which can contain "Android" in some odd UA strings? No —
  // Android detection is straightforward; just make sure iOS is checked first.
  const isAndroid = /Android/i.test(ua) && !isIOS;

  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  return 'desktop';
}

module.exports = { detectPlatform };
