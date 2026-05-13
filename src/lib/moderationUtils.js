/**
 * Utility for AI content moderation using Google Cloud Vision API.
 */

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

/**
 * Checks an image for unsafe content.
 * 
 * @param {string} base64Image - Image data in base64 (without prefix)
 * @returns {Promise<{safe: boolean, reason: string}>}
 */
export const checkImageSafety = async (base64Image) => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.warn("Vision API Key missing. Skipping safety check.");
    return { safe: true, reason: 'no_key' };
  }

  try {
    const response = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'SAFE_SEARCH_DETECTION' }]
          }
        ]
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    const result = data.responses[0]?.safeSearchAnnotation;

    if (!result) return { safe: true, reason: 'no_result' };

    // Possible values: UNKNOWN, VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY
    const unsafeLevels = ['POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
    
    const isUnsafe = 
      unsafeLevels.includes(result.adult) || 
      unsafeLevels.includes(result.violence) || 
      unsafeLevels.includes(result.racy);

    if (isUnsafe) {
      let reason = '';
      if (unsafeLevels.includes(result.adult)) reason = 'adult';
      else if (unsafeLevels.includes(result.violence)) reason = 'violence';
      else if (unsafeLevels.includes(result.racy)) reason = 'suggestive';
      
      return { safe: false, reason };
    }

    return { safe: true, reason: 'clean' };
  } catch (error) {
    console.error("AI Moderation error:", error);
    return { safe: true, reason: 'error' }; // Fail open to not block users if API fails
  }
};
