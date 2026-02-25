let tampered = false;

function isNative(fn: unknown): boolean {
  if (typeof fn !== "function") return false;
  try {
    const str = Function.prototype.toString.call(fn);
    return str.includes("[native code]");
  } catch {
    return false;
  }
}

function isDev(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  );
}

export function checkTampering(): void {
  if (isDev()) return;
  if (typeof window === "undefined") return;

  try {
    if (typeof WebAssembly !== "undefined") {
      if (!isNative(WebAssembly.compile)) tampered = true;
      if (!isNative(WebAssembly.instantiate)) tampered = true;
    }

    if (!isNative(window.fetch)) tampered = true;

    if (window.crypto?.subtle) {
      if (!isNative(window.crypto.subtle.decrypt)) tampered = true;
      if (!isNative(window.crypto.subtle.importKey)) tampered = true;
    }

    if (!isNative(Function.prototype.toString)) tampered = true;
  } catch {
    tampered = true;
  }
}

export function isTampered(): boolean {
  return tampered;
}
