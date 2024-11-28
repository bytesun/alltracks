export interface Track {
  id: string;
  groupId: string;
  name: string;
  description: string;
  startime: string;
  endtime: string;
  trackfile: {
    fileType: string;
    url: string;
  };
  length: number;
  duration: number;
  elevation: number;
  isPublic: boolean;
  createdBy: string;  
}
