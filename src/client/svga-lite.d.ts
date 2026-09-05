/** Minimal surface consumed from svga.lite's browser player. */
declare module 'svga.lite' {
  export class Parser {
    constructor(options?: { readonly disableWorker?: boolean })
    do(data: ArrayBuffer): Promise<unknown>
    destroy(): void
  }

  export class Player {
    constructor(canvas: HTMLCanvasElement)
    mount(item: unknown): Promise<undefined>
    start(): void
    destroy(): void
  }
}
