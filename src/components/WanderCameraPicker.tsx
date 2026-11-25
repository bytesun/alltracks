import { useEffect, useRef, useState } from 'react';
import { validateWanderPhoto } from '../lib/iceStorageUpload';
import { prepareWanderPhoto } from '../lib/prepareWanderPhoto';

/** One-button photo picker. Mobile browsers can offer the camera and photo library in their native chooser. */
export function WanderCameraPicker({ value, onChange, disabled = false, onPreparingChange }: {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  onPreparingChange?: (preparing: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (!value) { setPreview(null); return; }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const choose = async (file: File | null) => {
    if (!file) return;
    setPreparing(true);
    onPreparingChange?.(true);
    setError('');
    onChange(null);
    try {
      // Read while the native file input is still populated. Clearing it too
      // early can invalidate mobile content-provider backed photo handles.
      const snapshot = await prepareWanderPhoto(file);
      validateWanderPhoto(snapshot);
      onChange(snapshot);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to read selected photo.');
    } finally {
      setPreparing(false);
      onPreparingChange?.(false);
    }
  };

  const primaryStyle = { border: 'none', borderRadius: 12, padding: '11px 18px',
    background: '#087f5b', color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 } as const;
  const secondaryStyle = { border: '1px solid #cbd5d1', borderRadius: 12,
    padding: '10px 16px', background: 'transparent', color: 'inherit',
    fontSize: 14, fontWeight: 500, cursor: 'pointer' } as const;

  return <div className="wander-camera-picker">
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
      aria-label="Take or choose a photo" tabIndex={-1} style={{ display: 'none' }}
      disabled={disabled || preparing} onChange={event => {
        const input = event.currentTarget;
        void choose(input.files?.[0] ?? null).finally(() => { input.value = ''; });
      }} />
    <button type="button" style={primaryStyle} disabled={disabled || preparing}
      onClick={() => inputRef.current?.click()}>
      <span aria-hidden="true">📷</span> {preparing ? 'Preparing photo…' : 'Take or choose photo'}
    </button>
    {preview && <div style={{ marginTop: 12 }}>
      <img src={preview} alt="Selected photo preview"
        style={{ width: 200, maxWidth: '100%', borderRadius: 10 }} />
      <div><button type="button" style={secondaryStyle} disabled={disabled || preparing}
        onClick={() => onChange(null)}>Remove photo</button></div>
    </div>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
