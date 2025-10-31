'use client';

import * as React from 'react';
import Image from 'next/image';

export type OptimizedImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
};

/**
 * OptimizedImage component that intelligently handles different image sources:
 * - Uses Next.js Image for HTTP/HTTPS URLs (with optimization)
 * - Falls back to regular img for blob URLs (file uploads/previews)
 * - Lazy loading enabled by default
 * - Supports both fixed dimensions and fill mode
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  fill = false,
  sizes,
  priority = false,
  quality = 75,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isError, setIsError] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Check if the source is a blob URL (file upload preview)
  const isBlobUrl = src.startsWith('blob:');

  // Check if the source is a data URL
  const isDataUrl = src.startsWith('data:');

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  // For blob URLs or data URLs, use regular img tag (Next.js Image doesn't support them)
  if (isBlobUrl || isDataUrl) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
      />
    );
  }

  // For regular URLs, use Next.js Image with optimization
  return (
    <div className={`relative ${!isLoaded && !isError ? 'bg-surface/50 animate-pulse' : ''}`}>
      {isError ? (
        <div className={`flex items-center justify-center bg-surface/30 ${className}`}>
          <span className="text-sm text-foreground/50">Failed to load image</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          className={className}
          sizes={sizes}
          priority={priority}
          quality={quality}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}
    </div>
  );
}
