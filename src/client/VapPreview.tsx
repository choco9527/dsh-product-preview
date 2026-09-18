/** Isolated VAP playback with ordinary MP4/file fallback and resource cleanup. */
import { useEffect, useRef, useState } from 'react'
import type { VapPlayer } from 'video-animation-player'
import { decodeVap, MAX_VAP_BYTES, readVapResponse } from './vap-data.ts'
import type { ProductPreviewLocaleKey } from './locales.ts'
import { loadVapFactory } from './vap-player-loader.ts'

interface Props {
  readonly url: string; readonly zip: boolean; readonly size: number
  readonly t: (key: ProductPreviewLocaleKey) => string
}

function useVapPlayer({ url, zip, size }: Props, container: React.RefObject<HTMLDivElement>) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed' | 'fallback'>('loading')
  useEffect(() => {
    const abort = new AbortController()
    let disposed = false
    let player: VapPlayer | undefined
    let objectUrl: string | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    const release = () => {
      clearTimeout(timeout)
      const video = player?.video
      if (video) { video.pause(); video.removeAttribute('src'); video.load() }
      player?.destroy()
      player = undefined
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = undefined }
    }
    setState('loading')
    void (async () => {
      if (size > MAX_VAP_BYTES) { setState(zip ? 'failed' : 'fallback'); return }
      const bytes = await readVapResponse(await fetch(url, { signal: abort.signal }))
      if (disposed) return
      const source = decodeVap(bytes, zip)
      if (!source) { setState('fallback'); return }
      const createVap = await loadVapFactory()
      if (disposed || !container.current) return
      objectUrl = URL.createObjectURL(new Blob([source.video], { type: 'video/mp4' }))
      const failed = () => { if (!disposed) { setState('failed'); release() } }
      player = createVap({ container: container.current, src: objectUrl, config: source.config,
        fps: source.config.info.fps, loop: true, mute: true, accurate: true, precache: false, onLoadError: failed })
      timeout = setTimeout(failed, 15_000)
      player.on('playing', () => { if (!disposed) { clearTimeout(timeout); setState('ready') } })
      // VAP's config initialization settles asynchronously, even without external bindings.
      await new Promise(resolve => setTimeout(resolve, 0))
      if (disposed) release()
    })().catch(() => { if (!disposed) { setState('failed'); release() } })
    return () => {
      disposed = true
      abort.abort()
      // Let the library finish its local promise chain before destroying its WebGL state.
      setTimeout(release, 0)
    }
  }, [url, zip, size])
  return state
}

/** Render a transparent VAP canvas without replacing the original file actions. */
export default function VapPreview(props: Props) {
  const container = useRef<HTMLDivElement>(null)
  const state = useVapPlayer(props, container)
  const { url, zip, t } = props
  if (state === 'fallback') return zip ? <p>{t('fileOnly')}</p> : <video controls preload="metadata" src={url}>{t('unsupported')}</video>
  return <>
    <div ref={container} className="productPreviewVap" style={{ display: state === 'ready' ? 'contents' : 'none' }} />
    {state !== 'ready' && <p role="status">{t(state === 'failed' ? 'vapFailed' : 'loading')}</p>}
  </>
}
