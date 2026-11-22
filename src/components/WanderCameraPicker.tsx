import { useEffect, useRef, useState } from 'react';
import { validateWanderPhoto } from '../lib/iceStorageUpload';

/** Camera-first photo picker. Captured images follow the same ICEStorage flow as files. */
export function WanderCameraPicker({ value, onChange, disabled = false }: {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  };
  useEffect(() => () => { streamRef.current?.getTracks().forEach(track => track.stop()); }, []);
  useEffect(() => {
    if (!value) { setPreview(null); return; }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);
  useEffect(() => { if (disabled) stop(); }, [disabled]);
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOpen || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => setError('Camera preview could not start.'));
  }, [cameraOpen]);

  const open = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Camera permission denied.');
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera is not ready yet.'); return;
    }
    const canvas = document.createElement('canvas');
    const maxSide = 2048;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) { setError('Could not capture photo.'); return; }
    const file = new File([blob], `wander-${Date.now()}.jpg`, { type: 'image/jpeg' });
    try { validateWanderPhoto(file); onChange(file); stop(); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Invalid photo.'); }
  };

  const choose = (file: File | null) => {
    if (!file) return;
    try { validateWanderPhoto(file); onChange(file); setError(''); stop(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Invalid photo.'); }
  };

  const primaryStyle = { border: 'none', borderRadius: 12, padding: '11px 18px',
    background: '#087f5b', color: '#fff', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 } as const;
  const secondaryStyle = { border: '1px solid #cbd5d1', borderRadius: 12,
    padding: '10px 16px', background: 'transparent', color: 'inherit',
    fontSize: 14, fontWeight: 500, cursor: 'pointer' } as const;

  return <div className="wander-camera-picker">
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" style={primaryStyle} disabled={disabled || cameraOpen}
        onClick={() => void open()}><span aria-hidden="true">📷</span> Take photo</button>
      <button type="button" style={secondaryStyle} disabled={disabled}
        onClick={() => galleryInputRef.current?.click()}>Choose from gallery</button>
      <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp"
        capture="environment" aria-label="Take photo using device camera" tabIndex={-1}
        style={{ display: 'none' }} disabled={disabled}
        onChange={event => { choose(event.target.files?.[0] ?? null); event.target.value = ''; }} />
      <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp"
        aria-label="Choose photo from device" tabIndex={-1} style={{ display: 'none' }}
        disabled={disabled} onChange={event => {
          choose(event.target.files?.[0] ?? null); event.target.value = '';
        }} />
    </div>
    {cameraOpen && <div style={{ marginTop: 12 }}>
      <video ref={videoRef} autoPlay playsInline muted
        style={{ width: '100%', maxWidth: 420, borderRadius: 12 }} />
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" style={primaryStyle} disabled={disabled}
          onClick={() => void capture()}>Capture</button>
        <button type="button" style={secondaryStyle} onClick={stop}>Cancel</button>
      </div>
    </div>}
    {preview && <div style={{ marginTop: 12 }}>
      <img src={preview} alt="Selected photo preview"
        style={{ width: 200, maxWidth: '100%', borderRadius: 10 }} />
      <div><button type="button" style={secondaryStyle} disabled={disabled}
        onClick={() => onChange(null)}>Remove photo</button></div>
    </div>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
