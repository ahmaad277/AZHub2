import type { NextRequest } from "next/server";

export function getRequestOrigin(request: NextRequest) {
  const url = new URL(request.url);
  const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    url.host;
  return `${protocol}://${host}`;
}
