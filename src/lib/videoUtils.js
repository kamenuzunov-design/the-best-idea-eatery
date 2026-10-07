/**
 * Video Utilities for The Best Idea Eatery
 * Provides robust YouTube ID parsing, HD thumbnail generation, and privacy-enhanced embed URLs.
 */

/**
 * Extracts a YouTube Video ID from various YouTube URL formats or raw ID.
 * Supports:
 * - https://www.youtube.com/watch?v=ID
 * - https://youtu.be/ID
 * - https://www.youtube.com/shorts/ID
 * - https://www.youtube.com/embed/ID
 * - https://m.youtube.com/watch?v=ID
 * - Raw 11-char ID
 * 
 * @param {string} url - YouTube URL or ID
 * @returns {string|null} 11-character video ID or null
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  // Regex matching all standard YouTube URL patterns
  const regExp = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
  const match = cleanUrl.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * Checks if a given string/URL is a valid YouTube video.
 * @param {string} url
 * @returns {boolean}
 */
export function isYouTubeUrl(url) {
  return Boolean(extractYouTubeId(url));
}

/**
 * Checks if a given URL is a direct video stream (mp4, webm, ogg, mov).
 * @param {string} url
 * @returns {boolean}
 */
export function isDirectVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url.trim());
}

/**
 * Generates the thumbnail URL for a YouTube video.
 * Defaults to 'hqdefault' which is guaranteed to exist for all videos.
 * 
 * @param {string} urlOrId - URL or Video ID
 * @param {'hqdefault'|'maxresdefault'|'mqdefault'|'default'} [quality='hqdefault']
 * @returns {string|null}
 */
export function getYouTubeThumbnail(urlOrId, quality = 'hqdefault') {
  const videoId = extractYouTubeId(urlOrId) || urlOrId;
  if (!videoId || typeof videoId !== 'string') return null;
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Generates a privacy-friendly YouTube embed URL using youtube-nocookie.com.
 * 
 * @param {string} urlOrId - URL or Video ID
 * @param {Object} [options]
 * @param {boolean} [options.autoplay=true] - Auto-start playback on load
 * @param {boolean} [options.mute=false] - Start muted
 * @param {boolean} [options.rel=false] - Restrict related videos to same channel
 * @param {boolean} [options.controls=true] - Show YouTube player controls
 * @returns {string|null}
 */
export function getYouTubeEmbedUrl(urlOrId, options = {}) {
  const videoId = extractYouTubeId(urlOrId) || urlOrId;
  if (!videoId || typeof videoId !== 'string') return null;

  const {
    autoplay = true,
    mute = false,
    rel = false,
    controls = true
  } = options;

  const params = new URLSearchParams();
  if (autoplay) params.set('autoplay', '1');
  if (mute) params.set('mute', '1');
  if (!rel) params.set('rel', '0');
  if (!controls) params.set('controls', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Generates the canonical YouTube watch URL for a given URL or ID.
 * 
 * @param {string} urlOrId - URL or Video ID
 * @returns {string} YouTube watch URL or original string
 */
export function getYouTubeWatchUrl(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const videoId = extractYouTubeId(urlOrId);
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  return urlOrId.trim();
}

