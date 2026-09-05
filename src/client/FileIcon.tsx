/** Small media and folder symbols with no additional icon dependency. */
export function FileIcon({ kind }: { readonly kind: 'folder' | 'image' | 'video' | 'svga' }) {
  return <svg aria-hidden="true" className="productPreviewFileIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'folder' ? <path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11H3Z" />
      : <><rect x="3" y="3" width="18" height="18" rx="3" />{kind === 'image' ? <><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>
        : kind === 'video' ? <path d="m10 8 6 4-6 4Z" /> : <path d="m13 5-6 8h5l-1 6 6-8h-5Z" />}</>}
  </svg>
}
