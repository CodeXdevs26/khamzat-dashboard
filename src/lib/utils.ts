import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Only allow same-origin relative paths as a post-login redirect.
 * Blocks absolute URLs, protocol-relative "//host", "/\host" and "javascript:" (XSS / open redirect).
 */
export function safeRedirect(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
