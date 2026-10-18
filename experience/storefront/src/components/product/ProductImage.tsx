'use client'

import Image from 'next/image'
import { memo } from 'react'
import type { Product } from '@/lib/types'

interface ProductImageProps {
  product: Product
  sizes: string
  className?: string
  priority?: boolean
  alt?: string
}

/**
 * Single source of truth for product imagery. On a 404 the img swaps to
 * the inline SVG fallback; because next/image pairs `src` with `srcset`,
 * both attributes are handled before applying the fallback (otherwise
 * srcset wins and the browser retries the broken URL forever).
 * Errors are idempotent: once the fallback is applied, the handler exits.
 */
export const ProductImage = memo(function ProductImage({
  product,
  sizes,
  className,
  priority,
  alt,
}: ProductImageProps) {
  const fallback = product.imageFallback

  return (
    <Image
      src={product.image}
      alt={alt ?? product.title.en}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={
        fallback
          ? (e) => {
              const el = e.currentTarget
              if (el.getAttribute('src') === fallback) return
              el.removeAttribute('srcset')
              el.src = fallback
              el.removeAttribute('srcset')
            }
          : undefined
      }
    />
  )
})
