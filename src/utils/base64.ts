export function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const str = String.fromCharCode.apply(null, Array.from(bytes));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function base64ToBuffer(base64: string): ArrayBuffer {
    // Add padding if needed
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    console.log('Padded base64:', padded);
    
    const binaryString = window.atob(padded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// export function base64urlToBuffer(base64url: string): ArrayBuffer {
//   const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
//   const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
//   const binary = atob(paddedBase64);
//   const bytes = new Uint8Array(binary.length);
//   for (let i = 0; i < binary.length; i++) {
//     bytes[i] = binary.charCodeAt(i);
//   }
//   return bytes.buffer;
// }
