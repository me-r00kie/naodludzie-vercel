import { useEffect, useState, lazy, Suspense } from 'react';
import { Cabin } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';

// Lazy load leaflet components
const MapComponent = lazy(() => import('./MapComponent'));

interface CabinMapProps {
  cabins: Cabin[];
  selectedCabinId?: string;
  onMarkerClick?: (cabin: Cabin) => void;
  className?: string;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
}

export function CabinMap({ 
  cabins, 
  selectedCabinId, 
  onMarkerClick, 
  className,
  center = [51.9194, 19.1451],
  zoom = 6,
  interactive = true
}: CabinMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className={className}>
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className={className}>
      <Suspense fallback={<Skeleton className="w-full h-full rounded-lg" />}>
        <MapComponent
          cabins={cabins}
          selectedCabinId={selectedCabinId}
          onMarkerClick={onMarkerClick}
          center={center}
          zoom={zoom}
          interactive={interactive}
        />
      </Suspense>
    </div>
  );
}

// Static map preview component using OpenStreetMap tiles
function StaticMapPreview({ lat, lng }: { lat: number; lng: number }) {
  const zoom = 12;
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${Math.floor((lng + 180) / 360 * Math.pow(2, zoom))}/${Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))}.png`;
  
  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-muted">
      <img
        src={tileUrl}
        alt="Podgląd lokalizacji"
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-8 h-8 rounded-full bg-primary border-4 border-white shadow-lg flex items-center justify-center">
          <MapPin className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
      <div className="absolute bottom-1 right-1 text-[8px] text-muted-foreground bg-background/80 px-1 rounded">
        © OpenStreetMap
      </div>
    </div>
  );
}

// Location picker for adding cabins - simplified, coordinates are auto-filled from address search
interface LocationPickerProps {
  value?: { lat: number; lng: number };
  onChange: (location: { lat: number; lng: number }) => void;
  className?: string;
}

export function LocationPicker({ value, className }: LocationPickerProps) {
  const hasValidLocation = value && value.lat !== 0 && value.lng !== 0;

  return (
    <div className={className}>
      <div className="rounded-lg overflow-hidden border border-border h-[150px]">
        {hasValidLocation ? (
          <StaticMapPreview lat={value.lat} lng={value.lng} />
        ) : (
          <div className="w-full h-full bg-muted/50 flex flex-col items-center justify-center text-muted-foreground">
            <MapPin className="w-6 h-6 mb-1 opacity-50" />
            <p className="text-xs">Wyszukaj adres powyżej</p>
          </div>
        )}
      </div>
    </div>
  );
}
