/**
 * Minimal type declaration for gif.js
 * https://github.com/jnordberg/gif.js
 */
declare module 'gif.js' {
  interface GIFOptions {
    workers?:      number
    quality?:      number
    width?:        number
    height?:       number
    workerScript?: string
    background?:   string
    transparent?:  number | null
    dither?:       boolean | string
    debug?:        boolean
    repeat?:       number
  }

  interface AddFrameOptions {
    delay?:       number
    copy?:        boolean
    dispose?:     number
  }

  class GIF {
    constructor(options: GIFOptions)
    addFrame(element: HTMLCanvasElement | CanvasRenderingContext2D | ImageData, options?: AddFrameOptions): void
    render(): void
    abort(): void
    on(event: 'finished', callback: (blob: Blob) => void): void
    on(event: 'progress', callback: (progress: number) => void): void
    on(event: 'error',    callback: (error: Error) => void): void
  }

  export = GIF
}
