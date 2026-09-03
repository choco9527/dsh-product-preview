/** Localized copy for the product preview view. */

export const zh = {
  view: '产物',
  title: '产物',
  timeline: '会话节点',
  node: '节点',
  files: '个文件',
  scanning: '正在检查本机文件…',
  noArtifact: '当前会话还没有可预览的媒体产物。',
  chooseNode: '选择一个会话节点',
  chooseFile: '选择一个文件以预览',
  source: '来源工具',
  file: '本机文件',
  reveal: '在 Finder 中显示',
  unavailable: '本机文件暂时无法预览。',
  unsupported: '此浏览器无法预览该媒体格式。',
  imageAlt: '产物预览',
} as const

export type ProductPreviewLocaleKey = keyof typeof zh

export const en: Record<ProductPreviewLocaleKey, string> = {
  view: 'Artifacts',
  title: 'Artifacts',
  timeline: 'Conversation nodes',
  node: 'Node',
  files: 'files',
  scanning: 'Checking local files…',
  noArtifact: 'This session has no previewable media artifacts yet.',
  chooseNode: 'Choose a conversation node',
  chooseFile: 'Choose a file to preview',
  source: 'Source tool',
  file: 'Local file',
  reveal: 'Reveal in Finder',
  unavailable: 'This local file is not available for preview.',
  unsupported: 'This browser cannot preview this media format.',
  imageAlt: 'Artifact preview',
}
