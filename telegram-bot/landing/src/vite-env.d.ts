/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_PUBLICATION_WEBSITE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
