export 

interface Trail {
  id: number;
  name: string;
  distance: number;
  elevationGain: number;
  duration: number;
  difficulty: string;
  description: string;
  photos: string[];
  trailfile: {
    fileType: string;
    url: string;
  };
  startPoint: {
    latitude: number;
    longitude: number;
  }
}
