import Arweave from 'arweave';

export const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

export const arweaveGateway = 'https://arweave.net';
export const arweaveExplore = "https://viewblock.io/arweave";