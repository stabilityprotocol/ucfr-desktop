/// <reference types="vite/client" />

declare global {
  interface Window {
    ucfr: import('../preload').RendererAPI;
  }
}

export {};
