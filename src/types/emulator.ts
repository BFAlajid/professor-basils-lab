/* eslint-disable @typescript-eslint/no-explicit-any */

export interface EmscriptenFS {
  writeFile(path: string, data: Uint8Array): void;
  readFile(path: string): Uint8Array;
  mkdir(path: string): void;
  unlink(path: string): void;
  analyzePath(path: string): { exists: boolean; [key: string]: any };
  [key: string]: any;
}

export interface EmscriptenModule {
  canvas?: HTMLCanvasElement;
  calledRun?: boolean;
  arguments?: string[];
  locateFile?: (path: string) => string;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  onRuntimeInitialized?: () => void;
  pauseMainLoop?: () => void;
  resumeMainLoop?: () => void;
  callMain?: (args: string[]) => void;
  _cmd_savefiles?: () => void;
  _cmd_reset?: () => void;
  [key: string]: any;
}

// Named properties omitted to avoid TS narrowing issues with optional
// members — the index signature provides runtime access to Module/FS.
export interface NDSEmulatorWindow {
  [key: string]: any;
}

export interface GBAEmulatorWindow {
  [key: string]: any;
}
