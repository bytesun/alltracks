import { Track as TrackType } from '../api/alltracks/backend.did';


  export const parseTracks = (tracks: [TrackType]): any => {
    return tracks.map((track) =>{
        const {
          createdBy,         
          description,         
          duration,
          elevation,
          groupId,
          id,
          isPublic,
          length,
          name,
          startime,
          trackfile,
          } = track;
      
          return {
            createdBy,         
          description,         
          duration: Number(duration.toFixed(2)),
          elevation: Number(elevation.toFixed(2)),
          groupId : Object.getOwnPropertyNames(groupId)[0],
          id,
          isPublic,
          length : Number(length.toFixed(2)),
          name,
          startime : Number(startime),
          trackfile,
          };
        }
    );
    
  };