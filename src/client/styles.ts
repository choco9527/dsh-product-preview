/** Finder column-view styling for the conversation artifact surface. */

const STYLE_ID = 'dsh-product-preview-styles'

const CSS = `
.productPreviewView { height: 100%; min-width: 0; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); }
.productPreviewView, .productPreviewView * { box-sizing: border-box; }
.productPreviewColumns { display: grid; grid-template-columns: minmax(160px, 22%) minmax(240px, 34%) minmax(0, 1fr); height: 100%; min-height: 0; }
.productPreviewColumn { min-width: 0; overflow: auto; border-right: 1px solid var(--dsw-alias-border-l1); padding: 8px; }
.productPreviewTimeline { background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 84%, var(--dsw-alias-bg-layer-2)); }
.productPreviewFiles { background: var(--dsw-alias-bg-layer-1); }
.productPreviewRow, .productPreviewFile { width: 100%; border: 0; border-radius: 7px; background: transparent; color: inherit; cursor: pointer; text-align: left; }
.productPreviewRow { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 8px; align-items: center; padding: 9px; }
.productPreviewNodeIcon { color: var(--dsw-alias-label-secondary); font-size: 10px; }
.productPreviewRow:hover, .productPreviewFile:hover { background: var(--dsw-alias-bg-layer-2); }
.productPreviewRow[aria-current='true'] .productPreviewRowText { color: var(--dsw-alias-function-primary, #4f7ff7); }
.productPreviewRow[aria-current='true'] .productPreviewRowText span { color: inherit; }
.productPreviewRow[aria-current='true'] .productPreviewNodeIcon { color: var(--dsw-alias-function-primary, #4f7ff7); }
.productPreviewFile[aria-current='true'] { color: var(--dsw-alias-function-primary, #4f7ff7); }
.productPreviewRowText { display: grid; min-width: 0; gap: 3px; }
.productPreviewRowText strong, .productPreviewRowText span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.productPreviewRowText strong { font-size: 12px; font-weight: 550; }
.productPreviewRowText span { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.productPreviewDirectory, .productPreviewFile { display: block; min-height: 30px; padding-block: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.productPreviewDirectory { color: var(--dsw-alias-label-secondary); cursor: default; }
.productPreviewEmpty { display: grid; min-height: 100%; place-items: center; padding: 24px; color: var(--dsw-alias-label-secondary); font-size: 13px; text-align: center; }
.productPreviewDetail { min-width: 0; overflow: auto; padding: 28px clamp(24px, 5vw, 56px); }
.productPreviewCanvas { display: grid; min-height: min(52vh, 520px); place-items: center; overflow: hidden; border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 72%, #000); }
.productPreviewCanvas img, .productPreviewCanvas video, .productPreviewCanvas canvas { display: block; max-width: 100%; max-height: min(52vh, 520px); object-fit: contain; }
.productPreviewCanvas video { width: 100%; }
.productPreviewDetail h3 { margin: 18px 0 0; overflow-wrap: anywhere; font-size: 18px; line-height: 1.35; }
.productPreviewMetadata { display: grid; gap: 10px; margin: 22px 0 0; }
.productPreviewMetadata > div { display: grid; gap: 4px; padding-bottom: 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.productPreviewMetadata dt { color: var(--dsw-alias-label-secondary); font-size: 12px; }
.productPreviewMetadata dd { margin: 0; overflow-wrap: anywhere; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
.productPreviewActions { display: flex; margin-top: 18px; }
.productPreviewActions button { border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px; padding: 7px 10px; background: var(--dsw-alias-bg-layer-1); color: inherit; cursor: pointer; font-size: 12px; }
@media (max-width: 760px) { .productPreviewColumns { grid-template-columns: 140px 220px minmax(300px, 1fr); overflow-x: auto; } }
`

/** Install the artifact-preview styles once for a renderer document. */
export function installProductPreviewStyles(): () => void {
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.append(style)
  return () => { style.remove() }
}
