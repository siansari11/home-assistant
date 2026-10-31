/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_ICS_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
