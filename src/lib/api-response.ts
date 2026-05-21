import { NextResponse } from "next/server";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiResponse<T = unknown> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data, error: null },
    init,
  );
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse {
  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      data: null,
      error: { code, message, details },
    },
    { status },
  );
}

export function unauthorized(message = "Unauthorized"): NextResponse {
  return fail("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "Forbidden"): NextResponse {
  return fail("FORBIDDEN", message, 403);
}

export function notFound(message = "Not found"): NextResponse {
  return fail("NOT_FOUND", message, 404);
}

export function serverError(message = "Internal server error", details?: unknown): NextResponse {
  return fail("SERVER_ERROR", message, 500, details);
}

export function badRequest(message: string, details?: unknown): NextResponse {
  return fail("BAD_REQUEST", message, 400, details);
}
