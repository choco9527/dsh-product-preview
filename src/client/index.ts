/** Client entry registering the product-preview conversation view. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { ProductPreviewView } from './ProductPreviewView.tsx'
import { en, zh, type ProductPreviewLocaleKey } from './locales.ts'
import { installProductPreviewStyles } from './styles.ts'

export const PRODUCT_PREVIEW_LOCALE_NAMESPACE = 'product-preview'

/** Required client services used while registering the product preview view. */
export const inject = ['slots', 'locale']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'product-preview': ProductPreviewLocaleKey
  }
}

/** Register the product preview tab before DSH's trajectory view. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(PRODUCT_PREVIEW_LOCALE_NAMESPACE, { zh, en }), 'product-preview: locale')
  ctx.effect(installProductPreviewStyles, 'product-preview: styles')
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'product-preview',
    order: 5,
    label: () => ctx.locale.bind(PRODUCT_PREVIEW_LOCALE_NAMESPACE)('view'),
    locale: PRODUCT_PREVIEW_LOCALE_NAMESPACE,
  }, ProductPreviewView))
}
