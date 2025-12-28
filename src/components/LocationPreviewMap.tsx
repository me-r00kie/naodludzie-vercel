import { MapPin } from 'lucide-react';

interface LocationPreviewMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  className?: string;
}

export function LocationPreviewMap({ latitude, longitude, title, className }: LocationPreviewMapProps) {
  // Calculate tile coordinates for zoom level 13
  const zoom = 13;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((longitude + 180) / 360) * n);
  const latRad = (latitude * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);

  // Get multiple tiles for a larger view
  const tiles = [
    { x: x - 1, y: y - 1 },
    { x: x, y: y - 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y },
    { x: x, y: y },
    { x: x + 1, y: y },
    { x: x - 1, y: y + 1 },
    { x: x, y: y + 1 },
    { x: x + 1, y: y + 1 },
  ];

  // Calculate marker position within the grid
  const tileSize = 256;
  const gridWidth = tileSize * 3;
  const gridHeight = tileSize * 3;

  // Position of the point within the center tile
  const xPos = ((longitude + 180) / 360) * n;
  const yPos = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

  // Calculate pixel position relative to the grid
  const markerX = ((xPos - (x - 1)) * tileSize);
  const markerY = ((yPos - (y - 1)) * tileSize);

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <div 
        className="relative bg-muted"
        style={{ 
          width: '100%', 
          aspectRatio: '16/9',
          overflow: 'hidden'
        }}
      >
        {/* Tile grid */}
        <div 
          className="absolute"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(3, ${tileSize}px)`,
            gridTemplateRows: `repeat(3, ${tileSize}px)`,
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% - ${markerX - gridWidth/2}px), calc(-50% - ${markerY - gridHeight/2}px))`,
          }}
        >
          {tiles.map((tile, index) => (
            <img
              key={index}
              src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
              alt=""
              className="w-64 h-64 object-cover"
              style={{ width: tileSize, height: tileSize }}
              loading="lazy"
            />
          ))}
        </div>

        {/* Marker at center */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-10"
        >
          <div className="relative">
            <div 
              className="w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center"
              style={{
                boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              }}
            >
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <div 
              className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '8px solid hsl(var(--primary))',
              }}
            />
          </div>
        </div>

        {/* Overlay gradient for edges */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/20 to-transparent" />
      </div>

      {/* Attribution */}
      <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
        © OpenStreetMap
      </div>

      {/* Location info overlay */}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background/90 to-transparent">
          <p className="text-sm font-medium truncate">{title}</p>
        </div>
      )}
    </div>
  );
}
