/** Minimal surface consumed from svga.lite's browser player. */
declare module 'svga.lite' {
  export class Parser {
    do(data: ArrayBuffer): Promise<unknown>
  }

  export class Player {
    constructor(canvas: HTMLCanvasElement)
    mount(item: unknown): Promise<undefined>
    start(): void
    destroy(): void
  }
}
