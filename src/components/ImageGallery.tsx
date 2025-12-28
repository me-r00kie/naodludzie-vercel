import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { FallbackImage } from '@/components/FallbackImage';

interface GalleryImage {
  url: string;
  alt?: string;
  isMain?: boolean;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  title?: string;
}

export function ImageGallery({ images, currentIndex, onIndexChange, title }: ImageGalleryProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(currentIndex);

  // Sync lightbox index with current index when opening
  useEffect(() => {
    if (isLightboxOpen) {
      setLightboxIndex(currentIndex);
    }
  }, [isLightboxOpen, currentIndex]);

  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    onIndexChange(newIndex);
  }, [currentIndex, images.length, onIndexChange]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    onIndexChange(newIndex);
  }, [currentIndex, images.length, onIndexChange]);

  const goToLightboxPrevious = useCallback(() => {
    setLightboxIndex(i => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const goToLightboxNext = useCallback(() => {
    setLightboxIndex(i => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToLightboxPrevious();
      } else if (e.key === 'ArrowRight') {
        goToLightboxNext();
      } else if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, goToLightboxPrevious, goToLightboxNext]);

  const openLightbox = () => {
    setLightboxIndex(currentIndex);
    setIsLightboxOpen(true);
  };

  return (
    <>
      {/* Main Gallery View */}
      <figure className="relative aspect-[16/9] rounded-xl overflow-hidden shadow-card group">
        <FallbackImage
          src={images[currentIndex]?.url}
          alt={images[currentIndex]?.alt || title || 'Zdjęcie'}
          className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
          loading="eager"
          decoding="async"
          onClick={openLightbox}
        />
        
        {/* Zoom overlay */}
        <button
          onClick={openLightbox}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center"
          aria-label="Powiększ zdjęcie"
        >
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur p-3 rounded-full">
            <ZoomIn className="w-6 h-6" />
          </div>
        </button>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
              aria-label="Poprzednie zdjęcie"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
              aria-label="Następne zdjęcie"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            {/* Dots indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => { e.stopPropagation(); onIndexChange(index); }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    index === currentIndex ? 'bg-background' : 'bg-background/50'
                  )}
                  aria-label={`Zdjęcie ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Photo counter */}
        <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </figure>

      {/* Lightbox Dialog */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 hover:text-white"
              aria-label="Zamknij galerię"
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Image counter */}
            <div className="absolute top-4 left-4 z-50 text-white/80 text-sm">
              {lightboxIndex + 1} / {images.length}
            </div>

            {/* Main image with animation */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={lightboxIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <FallbackImage
                    src={images[lightboxIndex]?.url}
                    alt={images[lightboxIndex]?.alt || title || 'Zdjęcie'}
                    className="max-w-full max-h-[85vh] object-contain"
                    loading="eager"
                    decoding="async"
                  />
                </motion.div>
              </AnimatePresence>

            {/* Navigation arrows in lightbox */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToLightboxPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors text-white"
                  aria-label="Poprzednie zdjęcie"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={goToLightboxNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors text-white"
                  aria-label="Następne zdjęcie"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto py-2 px-4">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setLightboxIndex(index)}
                    className={cn(
                      'w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all',
                      index === lightboxIndex 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50' 
                        : 'opacity-60 hover:opacity-100'
                    )}
                    aria-label={`Przejdź do zdjęcia ${index + 1}`}
                  >
                    <FallbackImage
                      src={image.url}
                      alt={image.alt || `Miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
