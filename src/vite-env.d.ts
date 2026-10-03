/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Overrides the default CEMADEN proxy chain; see CEMADEN_BASES in src/lib/clima.ts.
  readonly VITE_CEMADEN_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}