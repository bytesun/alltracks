export 

interface Trail {
  id: bigint;
  name: string;
  distance: number;
  elevationGain: number;
  duration: number;
  difficulty: string;
  description: string;
  routeType: string;
  rating: number;
  tags: string[];
  photos: string[];
  trailfile: {
    fileType: string;
    url: string;
  };
  startPoint: {
    latitude: number;
    longitude: number;
  };
}
