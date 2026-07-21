export function buildOutputStoragePath(params: {
  userId: string;
  bundleId: string;
  clipId: string;
}): string {
  return `${params.userId}/${params.bundleId}/clips/${params.clipId}.mp4`;
}

export function isSafeStoragePath(path: string, userId: string, bundleId: string): boolean {
  const prefix = `${userId}/${bundleId}/`;
  return path.startsWith(prefix) && !path.includes("..");
}
