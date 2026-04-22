import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400, extra?: unknown) {
  return NextResponse.json(
    { error: message, ...(extra ? { details: extra } : {}) },
    { status },
  );
}

export async function handleRoute<T>(
  fn: () => Promise<T>,
): Promise<Response> {
  try {
    const result = await fn();
    return jsonOk(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return jsonError("Validation error", 422, err.flatten());
    }
    const e = err as Error & { status?: number };
    const status = typeof e.status === "number" ? e.status : 500;
    console.error("[api]", e);
    return jsonError(e.message ?? "Internal error", status);
  }
}
