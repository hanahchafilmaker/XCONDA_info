/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOTION_ENDPOINT?: string;
  readonly VITE_NOTION_PUBLIC_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
