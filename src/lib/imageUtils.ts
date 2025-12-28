/**
 * Utility functions for image optimization
 * Uses URL parameters for basic optimization hints
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Get optimized image URL
 * For Supabase Storage, returns original URL (transformation requires Pro plan)
 * For other URLs, returns as-is
 */
export function getOptimizedImageUrl(
  url: string | undefined,
  _options: ImageTransformOptions = {}
): string {
  if (!url) return '/placeholder.svg';
  
  // Return original URL - Supabase image transformation requires Pro plan
  return url;
}

/**
 * Generate srcSet for responsive images
 * Currently returns empty as image transformation requires Pro plan
 */
export function getImageSrcSet(
  _url: string | undefined,
  _widths: number[] = [400, 800, 1200]
): string {
  // Image transformation requires Supabase Pro plan
  // Return empty srcset to use original image
  return '';
}
