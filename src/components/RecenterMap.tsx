import { useMap } from 'react-leaflet';

interface RecenterMapProps {
  position: [number, number];
}

export const RecenterMap: React.FC<RecenterMapProps> = ({ position }) => {
  const map = useMap();
  map.setView(position);
  return null;
};
