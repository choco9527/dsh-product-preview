/** Finder column-view styling for the conversation artifact surface. */

const STYLE_ID = 'dsh-product-preview-styles'

const CSS = `
.productPreviewView { height: 100%; min-height: 0; min-width: 0; container-type: inline-size; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); }
.productPreviewView, .productPreviewView * { box-sizing: border-box; }
.productPreviewColumns { display: grid; grid-template-columns: minmax(140px, 21%) minmax(170px, 29%) minmax(0, 1fr); height: 100%; min-height: 0; overflow: hidden; }
.productPreviewColumn { min-width: 0; min-height: 0; overflow: auto; border-right: 1px solid var(--dsw-alias-border-l1); padding: 14px 6px; scrollbar-width: thin; }
.productPreviewTimeline { background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 84%, var(--dsw-alias-bg-layer-2)); }
.productPreviewFiles { background: var(--dsw-alias-bg-layer-1); }
.productPreviewRow, .productPreviewFile { width: 100%; border: 0; border-radius: 7px; background: transparent; color: inherit; cursor: pointer; text-align: left; }
.productPreviewRow { position: relative; display: grid; grid-template-columns: 12px minmax(0, 1fr); gap: 8px; align-items: start; padding: 10px 8px; }
.productPreviewRow:not(:last-child)::after { content: ''; position: absolute; left: 13px; top: 25px; bottom: -14px; width: 1px; background: var(--dsw-alias-border-l1); }
.productPreviewNodeIcon { position: relative; z-index: 1; display: block; width: 6px; height: 6px; margin: 6px 3px 0; border-radius: 50%; color: var(--dsw-alias-label-secondary); background: currentColor; }
.productPreviewRow:hover, .productPreviewFile:hover { background: var(--dsw-alias-bg-layer-2); }
.productPreviewRow[aria-current='true'] .productPreviewRowText { color: var(--dsw-alias-function-primary, #4f7ff7); }
.productPreviewRow[aria-current='true'] .productPreviewRowText span { color: inherit; }
.productPreviewRow[aria-current='true'] .productPreviewNodeIcon { color: var(--dsw-alias-function-primary, #4f7ff7); }
.productPreviewFile[aria-current='true'] { color: var(--dsw-alias-function-primary, #4f7ff7); }
.productPreviewRowText { display: grid; min-width: 0; gap: 5px; line-height: 1.4; }
.productPreviewRowText strong, .productPreviewRowText span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.productPreviewRowText strong { font-size: 12px; font-weight: 550; }
.productPreviewRowText span { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.productPreviewDirectory, .productPreviewFile, .productPreviewRoot { display: flex; align-items: center; gap: 7px; min-height: 32px; padding: 7px 8px; font-size: 12px; line-height: 1.4; }
.productPreviewDirectory span, .productPreviewFile span, .productPreviewRoot span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.productPreviewRoot { margin: 0 2px 8px; padding-bottom: 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font-size: 11px; }
.productPreviewFileIcon { width: 16px; height: 16px; flex: 0 0 16px; opacity: .7; }
.productPreviewDirectory .productPreviewFileIcon, .productPreviewRoot .productPreviewFileIcon { color: var(--dsw-alias-function-primary, #4f7ff7); }
.productPreviewRow:focus-visible, .productPreviewFile:focus-visible, .productPreviewActions button:focus-visible, .productPreviewInfo summary:focus-visible { outline: 2px solid var(--dsw-alias-function-primary, #4f7ff7); outline-offset: -2px; }
.productPreviewDirectory { color: var(--dsw-alias-label-secondary); cursor: default; }
.productPreviewEmpty { display: grid; min-height: 100%; place-items: center; padding: 24px; color: var(--dsw-alias-label-secondary); font-size: 13px; text-align: center; }
.productPreviewDetail { min-width: 0; min-height: 0; overflow: auto; padding: 18px; scrollbar-width: thin; }
.productPreviewCanvas { display: flex; align-items: center; justify-content: center; width: 100%; height: clamp(160px, 32vh, 320px); padding: 10px; overflow: hidden; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background-color: var(--dsw-alias-bg-layer-1); background-image: conic-gradient(var(--dsw-alias-bg-layer-2) 25%, transparent 0 50%, var(--dsw-alias-bg-layer-2) 0 75%, transparent 0); background-size: 16px 16px; }
.productPreviewCanvas img, .productPreviewCanvas video, .productPreviewCanvas canvas { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
.productPreviewCanvas video { width: 100%; height: 100%; }
.productPreviewDetail h3 { margin: 14px 0 0; overflow-wrap: anywhere; font-size: 14px; font-weight: 600; line-height: 1.5; }
.productPreviewSummary { margin: 5px 0 0; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.productPreviewInfo { margin-top: 20px; border-top: 1px solid var(--dsw-alias-border-l1); padding-top: 12px; }
.productPreviewInfo summary { cursor: pointer; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.productPreviewMetadata { display: grid; gap: 10px; margin: 12px 0 0; }
.productPreviewMetadata > div { display: grid; gap: 4px; padding-bottom: 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.productPreviewMetadata dt { color: var(--dsw-alias-label-secondary); font-size: 12px; }
.productPreviewMetadata dd { margin: 0; overflow-wrap: anywhere; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
.productPreviewActions { display: flex; margin-top: 12px; }
.productPreviewActions button { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px; padding: 6px 10px; background: var(--dsw-alias-bg-layer-1); color: inherit; cursor: pointer; font-size: 12px; }
.productPreviewActions button:hover { background: var(--dsw-alias-bg-layer-2); }
.productPreviewSwipeCue { position: fixed; z-index: 1; display: grid; width: var(--product-preview-swipe-width, 14px); height: 68px; place-items: center; transform: translateY(-50%); opacity: var(--product-preview-swipe-opacity, 0.18); pointer-events: none; background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4f7ff7) 74%, transparent); box-shadow: 0 2px 10px rgb(0 0 0 / 12%); backdrop-filter: blur(8px); transition: width 45ms linear, opacity 80ms ease-out; }
.productPreviewSwipeCue[hidden] { display: none; }
.productPreviewSwipeCue[data-side='left'] { left: 0; border-radius: 0 18px 18px 0; }
.productPreviewSwipeCue[data-side='right'] { right: 0; border-radius: 18px 0 0 18px; }
.productPreviewSwipeCueArrow { width: 20px; height: 20px; overflow: visible; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 1px 1px rgb(0 0 0 / 15%)); }
.productPreviewSwipeCueArrow[data-direction='next'] { transform: rotate(180deg); }
@container (max-width: 600px) { .productPreviewColumns { grid-template-columns: 120px 150px minmax(180px, 1fr); overflow-x: auto; } .productPreviewDetail { padding: 12px; } }
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
