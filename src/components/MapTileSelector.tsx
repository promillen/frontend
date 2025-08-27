import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Map, Satellite, Mountain, Waves } from 'lucide-react';

export interface TileLayer {
  id: string;
  name: string;
  url: string;
  attribution: string;
  icon: React.ReactNode;
}

export const TILE_LAYERS: TileLayer[] = [
  {
    id: 'cartodb_voyager',
    name: 'CartoDB Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    icon: <Map className="h-4 w-4" />
  },
  {
    id: 'openstreetmap',
    name: 'Detailed Terrain',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    icon: <Mountain className="h-4 w-4" />
  },
  {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg',
    attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap contributors',
    icon: <Satellite className="h-4 w-4" />
  },
  {
    id: 'watercolor',
    name: 'Water Color',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    attribution: '© Stamen Design © OpenMapTiles © OpenStreetMap contributors',
    icon: <Waves className="h-4 w-4" />
  }
];

interface MapTileSelectorProps {
  activeLayer: string;
  onLayerChange: (layerId: string) => void;
}

const MapTileSelector: React.FC<MapTileSelectorProps> = ({ activeLayer, onLayerChange }) => {
  return (
    <Card className="absolute top-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm">
      <CardContent className="p-2">
        <div className="flex flex-col gap-1">
          {TILE_LAYERS.map((layer) => (
            <Button
              key={layer.id}
              variant={activeLayer === layer.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onLayerChange(layer.id)}
              className="justify-start gap-2 text-xs"
            >
              {layer.icon}
              {layer.name}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MapTileSelector;