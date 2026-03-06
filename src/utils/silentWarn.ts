export function silentWarn(context: string, error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[${context}]`, error);
  }
}
