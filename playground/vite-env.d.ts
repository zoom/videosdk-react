/// <reference types="vite/client" />
interface ViteTypeOptions {
}

interface ImportMetaEnv {
    readonly VITE_ZOOM_SDK_KEY: string
    readonly VITE_ZOOM_SDK_SECRET: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}