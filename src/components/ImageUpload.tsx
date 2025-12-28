import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CabinImage } from '@/types';
import { toast } from '@/hooks/use-toast';
import { ImagePlus, Loader2, X, Star } from 'lucide-react';

interface ImageUploadProps {
  images: CabinImage[];
  onImagesChange: (images: CabinImage[]) => void;
  userId: string;
  maxImages?: number;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function ImageUpload({ images, onImagesChange, userId, maxImages = 10 }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast({
        title: 'Za dużo zdjęć',
        description: `Możesz dodać maksymalnie ${maxImages} zdjęć.`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    const newImages: CabinImage[] = [];
    const totalFiles = Array.from(files).length;
    let processedFiles = 0;

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Nieprawidłowy plik',
            description: `${file.name} nie jest obrazem.`,
            variant: 'destructive',
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast({
            title: 'Plik za duży',
            description: `${file.name} przekracza limit ${MAX_FILE_SIZE_MB}MB.`,
            variant: 'destructive',
          });
          continue;
        }

        processedFiles++;
        setUploadProgress(`Optymalizacja ${processedFiles}/${totalFiles}...`);

        try {
          // Convert file to base64
          const imageBase64 = await fileToBase64(file);

          // Call optimize-image edge function
          // Note: userId is derived from the authenticated session on the server
          const { data, error } = await supabase.functions.invoke('optimize-image', {
            body: {
              imageBase64,
              fileName: file.name,
              mimeType: file.type,
            },
          });

          if (error) {
            console.error('Optimization error:', error);
            toast({
              title: 'Błąd optymalizacji',
              description: `Nie udało się przetworzyć ${file.name}.`,
              variant: 'destructive',
            });
            continue;
          }

          if (!data?.publicUrl) {
            console.error('No public URL returned:', data);
            toast({
              title: 'Błąd uploadu',
              description: `Nie udało się przesłać ${file.name}.`,
              variant: 'destructive',
            });
            continue;
          }

          console.log(`Image optimized: ${data.originalSize} -> ${data.optimizedSize} bytes (${data.reduction}% reduction)`);

          // First image becomes main by default if no main image exists
          const hasMainImage = images.some(img => img.isMain) || newImages.some(img => img.isMain);

          newImages.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            url: data.publicUrl,
            alt: file.name.replace(/\.[^/.]+$/, ''),
            isMain: !hasMainImage && images.length === 0 && newImages.length === 0,
          });
        } catch (err) {
          console.error('Error processing file:', err);
          toast({
            title: 'Błąd',
            description: `Wystąpił błąd podczas przetwarzania ${file.name}.`,
            variant: 'destructive',
          });
        }
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast({
          title: 'Zdjęcia dodane',
          description: `Przesłano i zoptymalizowano ${newImages.length} ${newImages.length === 1 ? 'zdjęcie' : 'zdjęć'}.`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Błąd',
        description: 'Wystąpił błąd podczas przesyłania zdjęć.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    const imageToRemove = images.find(img => img.id === imageId);
    if (imageToRemove) {
      // Extract file path from URL
      const url = new URL(imageToRemove.url);
      const pathMatch = url.pathname.match(/\/cabin-images\/(.+)$/);
      
      if (pathMatch) {
        const filePath = pathMatch[1];
        // Try to delete from storage (may fail if user doesn't own it)
        await supabase.storage
          .from('cabin-images')
          .remove([filePath]);
      }
    }
    
    const updatedImages = images.filter(img => img.id !== imageId);
    
    // If removed image was main and there are still images, set first one as main
    if (imageToRemove?.isMain && updatedImages.length > 0) {
      updatedImages[0] = { ...updatedImages[0], isMain: true };
    }
    
    onImagesChange(updatedImages);
  };

  const handleSetMainImage = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isMain: img.id === imageId,
    }));
    onImagesChange(updatedImages);
    toast({
      title: 'Zdjęcie główne ustawione',
      description: 'To zdjęcie będzie wyświetlane jako miniatura oferty.',
    });
  };

  // Sort images to show main image first
  const sortedImages = [...images].sort((a, b) => {
    if (a.isMain) return -1;
    if (b.isMain) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {sortedImages.map((image) => (
          <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden group">
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-full object-cover"
            />
            
            {/* Main image badge */}
            {image.isMain && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Główne
              </div>
            )}
            
            {/* Action buttons overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {!image.isMain && (
                <button
                  type="button"
                  onClick={() => handleSetMainImage(image.id)}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors"
                >
                  <Star className="w-3 h-3" />
                  Ustaw jako główne
                </button>
              )}
            </div>
            
            {/* Remove button */}
            <button
              type="button"
              onClick={() => handleRemoveImage(image.id)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                <span className="text-xs text-muted-foreground text-center px-2">
                  {uploadProgress || 'Przesyłanie...'}
                </span>
              </>
            ) : (
              <>
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Dodaj zdjęcie</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <p className="text-xs text-muted-foreground">
        Maksymalnie {maxImages} zdjęć, każde do {MAX_FILE_SIZE_MB}MB. Zdjęcia są automatycznie optymalizowane (zmniejszane i konwertowane do WebP). Kliknij na zdjęcie, aby ustawić je jako główne.
      </p>
    </div>
  );
}
