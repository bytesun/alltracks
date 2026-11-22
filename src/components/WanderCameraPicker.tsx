import { useEffect, useRef, useState } from 'react';
import { validateWanderPhoto } from '../lib/iceStorageUpload';

/** Camera-first photo picker. Captured images follow the same ICEStorage flow as files. */
export function WanderCameraPicker({ value, onChange, disabled = false }: {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
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

  const open = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera unavailable. Use Take photo on mobile or Choose existing photo.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      // React mounts the video after the state update.
      requestAnimationFrame(() => {
        if (videoRef.current && streamRef.current === stream) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => setError('Tap the camera preview to start video.'));
        }
      });
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

  return <div className="wander-camera-picker">
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" disabled={disabled || cameraOpen} onClick={() => void open()}>📷 Open camera</button>
      <label>Take photo (mobile)
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
          disabled={disabled} onChange={event => { choose(event.target.files?.[0] ?? null); event.target.value = ''; }} />
      </label>
      <label>Choose existing photo
        <input type="file" accept="image/jpeg,image/png,image/webp"
          disabled={disabled} onChange={event => { choose(event.target.files?.[0] ?? null); event.target.value = ''; }} />
      </label>
    </div>
    {cameraOpen && <div>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxWidth: 420, borderRadius: 12 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={disabled} onClick={() => void capture()}>Capture photo</button>
        <button type="button" onClick={stop}>Cancel camera</button>
      </div>
    </div>}
    {preview && <div>
      <img src={preview} alt="Selected photo preview" style={{ width: 200, maxWidth: '100%', borderRadius: 10 }} />
      <button type="button" disabled={disabled} onClick={() => onChange(null)}>Retake / remove</button>
    </div>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
