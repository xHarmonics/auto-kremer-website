import { getRuntimeEnv } from '@/lib/runtime-env';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export const MAX_CONSIGNMENT_IMAGES = 8;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB per photo

const fallbackMemoryBucket = new Map<
  string,
  { contentType: string; size: number }
>();

export function getMemoryR2UploadsForTest() {
  return new Map(fallbackMemoryBucket);
}

export function clearMemoryR2UploadsForTest() {
  fallbackMemoryBucket.clear();
}

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'photo.jpg'
  );
}

export async function validateAndStoreConsignmentPhotos(
  files: File[],
  inquiryNumber: string
): Promise<{ ok: true; keys: string[] } | { ok: false; error: string }> {
  const nonEmptyFiles = files.filter((f) => f && f.size > 0);

  if (nonEmptyFiles.length > MAX_CONSIGNMENT_IMAGES) {
    return {
      ok: false,
      error: `Es können maximal ${MAX_CONSIGNMENT_IMAGES} Fahrzeugfotos hochgeladen werden.`,
    };
  }

  for (const file of nonEmptyFiles) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      return {
        ok: false,
        error: `Ungültiges Dateiformat „${file.name}“ (${file.type || 'unbekannt'}). Erlaubt sind JPG, PNG, WebP und AVIF.`,
      };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        error: `Die Datei „${file.name}“ überschreitet das Limit von 10 MB pro Bild.`,
      };
    }
  }

  const env = await getRuntimeEnv();
  const bucket = env.MEDIA_BUCKET;
  const storedKeys: string[] = [];

  for (let i = 0; i < nonEmptyFiles.length; i++) {
    const file = nonEmptyFiles[i]!;
    const key = `consignments/${inquiryNumber}/${String(i + 1).padStart(
      2,
      '0'
    )}-${sanitizeFilename(file.name)}`;
    const bytes = await file.arrayBuffer();

    if (bucket && typeof bucket.put === 'function') {
      await bucket.put(key, bytes, {
        httpMetadata: { contentType: file.type },
      });
    } else {
      fallbackMemoryBucket.set(key, {
        contentType: file.type,
        size: bytes.byteLength,
      });
    }

    storedKeys.push(key);
  }

  return { ok: true, keys: storedKeys };
}
