/** The upstream package omits its types entry; describe the runtime APIs used here. */
declare module 'video-animation-player' {
  export interface VapPlayer {
    readonly video: HTMLVideoElement | null
    destroy(): void
    on(event: string, callback: () => void): VapPlayer
  }
  export default function createVap(options: {
    container: HTMLElement; src: string; config: unknown; fps: number
    loop: boolean; mute: boolean; accurate: boolean; precache: boolean
    onLoadError: () => void
  }): VapPlayer
}
