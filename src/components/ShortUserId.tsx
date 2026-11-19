import { useState } from 'react';

export function ShortUserId({ id, copyable = false }: { id: string; copyable?: boolean }) {
  const [status, setStatus] = useState('');
  const shortId = id.length > 10 ? id.slice(0, 5) + '…' + id.slice(-5) : id;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setStatus('Copied');
    } catch {
      setStatus('Copy unavailable');
    }
  };
  return <span>
    <span title={id}>{shortId || 'Unknown'}</span>
    {copyable && id && <> <button type="button" onClick={() => void copy()}>Copy full ID</button>
      <span role="status"> {status}</span></>}
  </span>;
}
