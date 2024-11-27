import { Trail as TrailType } from '../api/alltracks/backend.did';
import { Trail } from '../types/Trail';

export const routeTypeMap = {
    'loop': { tloop: null },
    'out-and-back': { outandback: null },
    'point-to-point': { pointto: null }
  };
  
 export const difficultyMap = {
    'easy': { easy: null },
    'moderate': { medium: null },
    'hard': { hard: null }, 
    'expert': { extreme: null }
  };

  export const parseTrails = (trails: [TrailType]): any => {
    return trails.map((trail) =>{
        const {
            name,
            description,
              distance,
            elevationGain,
            duration,
            ttype,
            difficulty,
            rate,
            tags,
            trailfile,
            photos
          } = trail;
      
          return {
            name,
            description,
            distance: Number(distance.toFixed(2)),
            elevationGain: Number(elevationGain.toFixed(2)),
            duration: Number(duration.toFixed(2)),
            routeType: Object.getOwnPropertyNames(ttype)[0],
            difficulty: Object.getOwnPropertyNames(difficulty)[0],
            rating: Number(rate.toFixed(2)),
            tags,
            trailfile,
            photos
          };
        }
    );
    
  };