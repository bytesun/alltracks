import {defineConfig} from '@junobuild/config';

export default defineConfig({
  satellite: {
    id: 'orkad-xyaaa-aaaal-ai7ta-cai',
    source: 'dist',
    predeploy: ['npm run build']
  },
  orbiter: {
    id: 'pxq4t-uqaaa-aaaal-ac2ua-cai'
  }
});
