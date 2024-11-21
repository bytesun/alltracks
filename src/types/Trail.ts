export 

interface Trail {
  id: string;
  name: string;
  length: number;
  elevationGain: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  description: string;
  imageUrl: string;
  fileRef: string;
}
