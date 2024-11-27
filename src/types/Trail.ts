export 

interface Trail {
  id: string;
  name: string;
  distance: number;
  elevationGain: number;
  duration: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  description: string;
  photos: string[];
  trailfile: string;
}
