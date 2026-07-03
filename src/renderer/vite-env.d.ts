/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_SERVER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*?worker' {
  const workerConstructor: new () => Worker
  export default workerConstructor
}

declare module '*?worker&inline' {
  const workerConstructor: new () => Worker
  export default workerConstructor
}
