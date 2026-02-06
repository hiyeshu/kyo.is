export interface DosboxOptions {
  id: string;
  onload?: (dosbox: Dosbox) => void;
  onrun?: (dosbox: Dosbox, app: string) => void;
}

export interface Dosbox {
  run(url: string, executable: string): void;
  stop(): void;
  saveState(): void;
  loadState(): void;
  requestFullScreen(): void;
}

export type DosboxConstructor = {
  new (options: DosboxOptions): Dosbox;
};

declare global {
  interface Window {
    Dosbox: DosboxConstructor;
  }
}
