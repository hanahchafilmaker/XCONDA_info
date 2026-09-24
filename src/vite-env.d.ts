/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOTION_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
