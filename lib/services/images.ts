import axios from 'axios';

/**
 * Zoek afbeeldingen via Unsplash API (gratis, maar vereist API key)
 * Of gebruik een placeholder service als fallback
 */
export async function searchImage(query: string): Promise<string | null> {
  try {
    // Probeer eerst Unsplash (als API key beschikbaar is)
    if (process.env.UNSPLASH_ACCESS_KEY) {
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query: query,
          per_page: 1,
          orientation: 'landscape',
        },
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
      });

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].urls.regular;
      }
    }

    // Fallback: gebruik placeholder of generate via DALL-E idee (te complex voor nu)
    // Voor nu returnen we null en gebruiken we incident foto's als fallback
    return null;
  } catch (error) {
    console.error('Error searching for image:', error);
    return null;
  }
}

/**
 * Download image en converteer naar base64 voor PowerPoint
 */
export async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    
    const base64 = Buffer.from(response.data).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

/**
 * Gebruik lokale foto's uit incident als die beschikbaar zijn
 */
export function getIncidentPhotos(photosJson: string | null): string[] {
  if (!photosJson) return [];
  try {
    const photos = JSON.parse(photosJson);
    return Array.isArray(photos) ? photos : [];
  } catch {
    return [];
  }
}

