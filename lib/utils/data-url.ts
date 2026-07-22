/** Strip a `data:*;base64,` prefix if present; otherwise return the string unchanged. */
export function stripDataUrlPrefix(data: string): string {
  const match = data.match(/^data:[^;]+;base64,(.+)$/i);
  return match ? match[1] : data;
}
