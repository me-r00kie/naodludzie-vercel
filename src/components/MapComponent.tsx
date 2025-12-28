import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Cabin, getScoreLevel } from '@/types';
import { OffGridScoreBadge } from './OffGridScore';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon based on score
function createScoreIcon(score: number): L.DivIcon {
  const level = getScoreLevel(score);
  const bgColor = level === 'high' ? '#22c55e' : level === 'medium' ? '#eab308' : '#ef4444';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${bgColor};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        font-family: system-ui;
      ">
        ${score}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

interface MapBoundsUpdaterProps {
  cabins: Cabin[];
}

function MapBoundsUpdater({ cabins }: MapBoundsUpdaterProps) {
  const map = useMap();
  
  useEffect(() => {
    if (cabins.length > 0) {
      const bounds = L.latLngBounds(cabins.map(c => [c.latitude, c.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [cabins, map]);
  
  return null;
}

interface MapComponentProps {
  cabins: Cabin[];
  selectedCabinId?: string;
  onMarkerClick?: (cabin: Cabin) => void;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
}

export default function MapComponent({ 
  cabins, 
  selectedCabinId, 
  onMarkerClick, 
  center = [51.9194, 19.1451],
  zoom = 6,
  interactive = true
}: MapComponentProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full rounded-lg"
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      zoomControl={interactive}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {cabins.length > 0 && <MapBoundsUpdater cabins={cabins} />}
      {cabins.map((cabin) => (
        <Marker
          key={cabin.id}
          position={[cabin.latitude, cabin.longitude]}
          icon={createScoreIcon(cabin.offGridScore.total)}
          eventHandlers={{
            click: () => onMarkerClick?.(cabin),
          }}
        >
          <Popup className="cabin-popup">
            <div className="p-2 min-w-[200px]">
              <img
                src={cabin.images[0]?.url || '/placeholder.svg'}
                alt={cabin.title}
                className="w-full h-24 object-cover rounded-md mb-2"
              />
              <h4 className="font-semibold text-sm mb-1">{cabin.title}</h4>
              <p className="text-xs text-muted-foreground mb-2">{cabin.address}</p>
              <div className="flex items-center justify-between">
                <OffGridScoreBadge score={cabin.offGridScore.total} size="sm" />
                <span className="font-bold">{cabin.pricePerNight} zł/noc</span>
              </div>
              <Link to={`/cabin/${cabin.slug}`}>
                <Button size="sm" className="w-full mt-2">
                  Zobacz szczegóły
                </Button>
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
