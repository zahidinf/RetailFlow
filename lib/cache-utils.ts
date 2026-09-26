import { revalidatePath } from "next/cache";

/**
 * Safely revalidates a path without crashing when invoked outside the Next.js
 * static generation / request context (e.g. in standalone tests or CLI scripts).
 */
export function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully ignore when invoked outside Next.js request lifecycle
  }
}
