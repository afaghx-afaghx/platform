'use client'

import Image from 'next/image'
import { memo, useState } from 'react'
import type { Product } from '@/lib/types'

interface ProductImageProps {
  product: Product
  sizes: string
  className?: string
  priority?: boolean
  alt?: string
}

/**
 * Product imagery has a deterministic fallback. Keep fallback selection in
 * React state rather than mutating the DOM: Next Image may re-render src/srcset
 * after an imperative src change, causing a broken URL to be requested again.
 */
export const ProductImage = memo(function ProductImage({
  product,
  sizes,
  className,
  priority,
  alt,
}: ProductImageProps) {
  const fallback = product.imageFallback
  const [hasImageError, setHasImageError] = useState(false)
  const showFallback = Boolean(fallback && hasImageError)

  return (
    <Image
      src={showFallback ? fallback! : product.image}
      alt={alt ?? product.title.en}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => {
        if (fallback && !hasImageError) setHasImageError(true)
      }}
    />
  )
})
