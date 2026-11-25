/** Immutable same-origin URL for a Convex-stored card image, cached by CDN and Service Worker. */
export function mediaUrl(storageId?: string | null) {
  return storageId ? `/api/media/${encodeURIComponent(storageId)}` : null;
}
