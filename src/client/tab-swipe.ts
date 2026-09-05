/** Horizontal trackpad navigation across the conversation's top-level views. */

const SWIPE_THRESHOLD = 240
const SWIPE_RELEASE_SETTLE_MS = 90
const HORIZONTAL_DOMINANCE = 1.6
const DESKTOP_NATIVE_SWIPE_CAPABILITY = '__DSH_DESKTOP_NATIVE_SWIPE__'
const DESKTOP_NATIVE_SWIPE_BEGIN_EVENT = 'dsh-desktop-native-swipe-begin'
const DESKTOP_NATIVE_SWIPE_END_EVENT = 'dsh-desktop-native-swipe-end'

export type TabSwipeDirection = 'previous' | 'next'

interface SwipeCue {
  readonly show: (direction: TabSwipeDirection, progress: number, y: number) => void
  readonly hide: () => void
  readonly dispose: () => void
}

/** Classify one wheel delta only when its horizontal component is dominant. */
export function horizontalSwipeDirection(deltaX: number, deltaY: number): TabSwipeDirection | undefined {
  if (deltaX === 0 || Math.abs(deltaX) < Math.abs(deltaY) * HORIZONTAL_DOMINANCE) return undefined
  return deltaX < 0 ? 'previous' : 'next'
}

/** Clamp the edge-feedback strength to the swipe threshold. */
export function swipeProgress(displacement: number): number {
  return Math.min(1, Math.abs(displacement) / SWIPE_THRESHOLD)
}

/** Locate the adjacent tab index without wrapping around the tab strip. */
export function adjacentTabIndex(index: number, count: number, direction: TabSwipeDirection): number | undefined {
  const next = direction === 'previous' ? index - 1 : index + 1
  return next >= 0 && next < count ? next : undefined
}

function hasNativeSwipeCompletion(): boolean {
  const desktopWindow = window as Window & { readonly __DSH_DESKTOP_NATIVE_SWIPE__?: unknown }
  return desktopWindow[DESKTOP_NATIVE_SWIPE_CAPABILITY] === true
}

function isGestureTargetExcluded(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest('input, textarea, select, [contenteditable="true"], video, audio, [role="slider"]') !== null) return true
  for (let current: Element | null = target; current !== null; current = current.parentElement) {
    if (!(current instanceof HTMLElement) || current.scrollWidth <= current.clientWidth) continue
    const overflowX = getComputedStyle(current).overflowX
    if (overflowX === 'auto' || overflowX === 'scroll') return true
  }
  return false
}

function conversationTabs(productPreviewLabel: string): readonly HTMLButtonElement[] {
  for (const list of document.querySelectorAll('[role="tablist"]')) {
    const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    if (tabs.some(tab => tab.textContent?.trim() === productPreviewLabel)) return tabs
  }
  return []
}

function adjacentTab(productPreviewLabel: string, direction: TabSwipeDirection): HTMLButtonElement | undefined {
  const tabs = conversationTabs(productPreviewLabel)
  const index = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true')
  const adjacent = adjacentTabIndex(index, tabs.length, direction)
  return adjacent === undefined ? undefined : tabs[adjacent]
}

function createSwipeCue(): SwipeCue {
  const element = document.createElement('div')
  element.className = 'productPreviewSwipeCue'
  element.setAttribute('aria-hidden', 'true')
  element.hidden = true
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  arrow.setAttribute('class', 'productPreviewSwipeCueArrow')
  arrow.setAttribute('viewBox', '0 0 24 24')
  arrow.setAttribute('fill', 'none')
  const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  arrowPath.setAttribute('d', 'm15 18-6-6 6-6')
  arrow.append(arrowPath)
  element.append(arrow)
  document.body.append(element)
  return {
    show: (direction, progress, y) => {
      element.dataset.side = direction === 'previous' ? 'left' : 'right'
      element.style.setProperty('--product-preview-swipe-width', `${String(Math.round(10 + progress * 24))}px`)
      element.style.setProperty('--product-preview-swipe-opacity', String(0.18 + progress * 0.68))
      element.style.top = `${String(y)}px`
      arrow.dataset.direction = direction
      element.hidden = false
    },
    hide: () => { element.hidden = true },
    dispose: () => { element.remove() },
  }
}

/**
 * Install trackpad edge feedback and tab activation for the conversation view strip.
 * @param productPreviewLabel - Current localized label identifying this plugin's tab strip.
 * @returns Removes the document listener and its visual feedback node.
 */
export function installProductPreviewTabSwipe(productPreviewLabel: () => string): () => void {
  const cue = createSwipeCue()
  let displacement = 0
  let nativeGestureActive = false
  let settleTimer: ReturnType<typeof setTimeout> | undefined

  const reset = () => {
    displacement = 0
    if (settleTimer !== undefined) {
      clearTimeout(settleTimer)
      settleTimer = undefined
    }
    cue.hide()
  }
  const settle = () => {
    settleTimer = undefined
    const direction = displacement < 0 ? 'previous' : 'next'
    const target = swipeProgress(displacement) === 1 ? adjacentTab(productPreviewLabel(), direction) : undefined
    reset()
    target?.click()
  }
  const onNativeSwipeBegin = () => {
    reset()
    nativeGestureActive = true
  }
  const onNativeSwipeEnd = () => {
    if (!nativeGestureActive) return
    nativeGestureActive = false
    settle()
  }
  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || isGestureTargetExcluded(event.target)) return
    if (horizontalSwipeDirection(event.deltaX, event.deltaY) === undefined) return
    if (hasNativeSwipeCompletion() && !nativeGestureActive) return
    displacement += event.deltaX
    const direction = displacement < 0 ? 'previous' : 'next'
    if (adjacentTab(productPreviewLabel(), direction) === undefined) {
      reset()
      return
    }
    const progress = swipeProgress(displacement)
    const maxY = Math.max(106, window.innerHeight - 106)
    cue.show(direction, progress, Math.min(maxY, Math.max(106, event.clientY)))
    if (hasNativeSwipeCompletion()) return
    if (settleTimer !== undefined) clearTimeout(settleTimer)
    settleTimer = setTimeout(settle, SWIPE_RELEASE_SETTLE_MS)
  }

  document.addEventListener('wheel', onWheel, { capture: true, passive: true })
  window.addEventListener(DESKTOP_NATIVE_SWIPE_BEGIN_EVENT, onNativeSwipeBegin)
  window.addEventListener(DESKTOP_NATIVE_SWIPE_END_EVENT, onNativeSwipeEnd)
  return () => {
    if (settleTimer !== undefined) clearTimeout(settleTimer)
    document.removeEventListener('wheel', onWheel, { capture: true })
    window.removeEventListener(DESKTOP_NATIVE_SWIPE_BEGIN_EVENT, onNativeSwipeBegin)
    window.removeEventListener(DESKTOP_NATIVE_SWIPE_END_EVENT, onNativeSwipeEnd)
    cue.dispose()
  }
}
