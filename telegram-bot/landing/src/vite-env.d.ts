/// <reference types="vite/client" />

declare const __OBSIDIGRAM_LANDING_VERSION__: string;

interface ImportMetaEnv {
	readonly VITE_PUBLICATION_WEBSITE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
