import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import './PrintableQrLabel.css';
import { objectLabelSubtitle, printLabelQrUrl } from '../lib/printLabel';

type LabelKind = 'object' | 'trail';
type Direction = 'none' | 'left' | 'ahead' | 'right';
type PrintSize = '3x4' | '4x6' | 'a5' | 'letter';
type SizeSpec = { name: string; width: string; height: string; scale: number };

const SIZES: Record<PrintSize, SizeSpec> = {
  '3x4': { name: '3 × 4 in — object sticker', width: '76.2mm', height: '101.6mm', scale: .82 },
  '4x6': { name: '4 × 6 in — object sticker', width: '101.6mm', height: '152.4mm', scale: 1 },
  a5: { name: 'A5 — outdoor sign', width: '148mm', height: '210mm', scale: 1 },
  letter: { name: 'Letter — outdoor sign', width: '215.9mm', height: '279.4mm', scale: 1.12 },
};

const ARROWS: Record<Direction, string> = {
  none: '',
  left: '←',
  ahead: '↑',
  right: '→',
};

function cleanText(text: string, limit: number): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, limit);
}

export interface PrintableQrLabelProps {
  kind: LabelKind;
  url: string;
  name: string;
  icon?: string;
  code: string;
  guestCheckinEnabled?: boolean;
  onClose: () => void;
}

/** Both labels render as HTML/CSS rather than an illustration:
 * the QR always encodes the object's or Spot's current public URL. */
export function PrintableQrLabel({
  kind, url, name, icon = '📦', code, guestCheckinEnabled = false, onClose,
}: PrintableQrLabelProps) {
  const [size, setSize] = useState<PrintSize>(kind === 'object' ? '4x6' : 'a5');
  const [direction, setDirection] = useState<Direction>('none');
  const [headline, setHeadline] = useState(
    kind === 'object' ? objectLabelSubtitle(name) :
      cleanText(name, 46).toUpperCase(),
  );
  const [instruction, setInstruction] = useState(kind === 'object'
    ? 'Please pass me on responsibly.'
    : 'Scan the QR code to record your visit.');
  const [qrReady, setQrReady] = useState(false);
  const [qrBroken, setQrBroken] = useState(false);

  const imageUrl = useMemo(() => {
    try { return printLabelQrUrl(url); }
    catch { return ''; }
  }, [url]);

  useEffect(() => {
    const finish = () => document.body.classList.remove('qr-label-print-active');
    window.addEventListener('afterprint', finish);
    return () => {
      finish();
      window.removeEventListener('afterprint', finish);
    };
  }, []);

  const spec = SIZES[size];
  const variables = {
    '--qr-label-width': spec.width,
    '--qr-label-height': spec.height,
    '--qr-label-scale': String(spec.scale),
  } as CSSProperties;

  const print = () => {
    if (!qrReady || qrBroken) return;
    document.body.classList.add('qr-label-print-active');
    window.print();
  };

  return (
    <div className="qr-label-overlay" role="dialog" aria-modal="true"
      aria-label={kind === 'object' ? 'Print Object QR label' : 'Print trail Check-in sign'}>
      <div className="qr-label-dialog">
        <div className="qr-label-toolbar">
          <div>
            <strong>{kind === 'object' ? 'Print Object Label' : 'Print Trail Check-in Sign'}</strong>
            <p>{kind === 'object'
              ? 'Use the green sticker on your physical object.'
              : 'High-visibility orange/yellow sign; arrows point toward the check-in location.'}</p>
          </div>
          <button type="button" className="qr-label-close" onClick={onClose} aria-label="Close print preview">×</button>
        </div>

        <div className="qr-label-settings">
          <label>
            Paper size
            <select value={size} onChange={e => setSize(e.target.value as PrintSize)}>
              {(kind === 'object' ? ['3x4', '4x6'] : ['a5', 'letter']).map(key =>
                <option key={key} value={key}>{SIZES[key as PrintSize].name}</option>)}
            </select>
          </label>
          <label>
            {kind === 'object' ? 'Short subtitle' : 'Location / trail name'}
            <input value={headline} maxLength={46}
              onChange={e => setHeadline(e.target.value)} />
          </label>
          <label>
            Short instruction
            <input value={instruction} maxLength={80}
              onChange={e => setInstruction(e.target.value)} />
          </label>
          {kind === 'trail' && (
            <label>
              Check-in direction arrow
              <select value={direction} onChange={e => setDirection(e.target.value as Direction)}>
                <option value="none">No arrow (sign at the location)</option>
                <option value="left">← Left toward check-in</option>
                <option value="ahead">↑ Ahead toward check-in</option>
                <option value="right">→ Right toward check-in</option>
              </select>
            </label>
          )}
        </div>

        <div className="qr-label-preview-frame">
          <div
            className={'qr-label-sheet qr-label-sheet--' + kind + ' qr-label-size--' + size}
            style={variables}
            aria-label={kind === 'object' ? 'Printable Object sticker' : 'Printable Trail sign'}
          >
            {kind === 'object' ? (
              <>
                <header className="qr-label-object-header">
                  <h2>TRACK ME DOWN</h2>
                  <strong>{cleanText(headline, 46) || 'I AM ON A JOURNEY'}</strong>
                  <div className="qr-label-object-icon" aria-hidden="true">
                    {icon === '☕'
                      ? <svg viewBox="0 0 100 65" width="86" height="55" fill="currentColor">
                        <path d="M12 8h62v35a19 19 0 0 1-19 19H30a18 18 0 0 1-18-18V8Zm62 8h10a12 12 0 0 1 0 24H74V30h10a2 2 0 0 0 0-4H74V16ZM7 62h76v3H7z"/>
                      </svg>
                      : <span>{icon}</span>}
                  </div>
                </header>
                <div className="qr-label-image-panel">
                  {imageUrl && <img src={imageUrl} alt={'QR code for ' + name}
                    onLoad={() => { setQrReady(true); setQrBroken(false); }}
                    onError={() => { setQrReady(false); setQrBroken(true); }}
                    />}
                </div>
                <footer className="qr-label-object-footer">
                  <h3>FOUND ME? SCAN &amp; CHECK IN</h3>
                  <p>Share one approximate GPS location.</p>
                  <p>{guestCheckinEnabled ? 'No app. No account required.' : 'No app to install. Sign-in may be required.'}</p>
                  <p>{cleanText(instruction, 80)}</p>
                  <strong>OBJECT {cleanText(code, 16).toUpperCase()} <span aria-hidden="true">|</span> ALLTRACKS</strong>
                </footer>
              </>
            ) : (
              <>
                <header className="qr-label-trail-header">
                  <div className="qr-label-trail-kicker">COMMUNITY TRAIL CHECK-IN</div>
                  <h2>SCAN &amp;<br/>CHECK IN</h2>
                  <strong>{cleanText(headline, 46) || 'TRAIL CHECK-IN'}</strong>
                </header>
                {direction !== 'none' && <div className="qr-label-trail-arrow" aria-label={'Check-in to the ' + direction}>
                  <span aria-hidden="true">{ARROWS[direction]}</span>
                  <strong>CHECK-IN {direction === 'ahead' ? 'AHEAD' : direction.toUpperCase()}</strong>
                </div>}
                <div className="qr-label-image-panel qr-label-trail-qr">
                  {imageUrl && <img src={imageUrl} alt={'QR code for ' + name}
                    onLoad={() => { setQrReady(true); setQrBroken(false); }}
                    onError={() => { setQrReady(false); setQrBroken(true); }}
                    />}
                </div>
                <footer className="qr-label-trail-footer">
                  <strong>POINT CAMERA HERE</strong>
                  <p>{cleanText(instruction, 80)}</p>
                  <p>Sign in to record a visit · No app installation</p>
                  <small>COMMUNITY CHECK-IN · NOT AN OFFICIAL TRAIL MARKER</small>
                  <b>SPOT {cleanText(code, 18)} <span aria-hidden="true">|</span> ALLTRACKS</b>
                </footer>
              </>
            )}
          </div>
        </div>

        {(qrBroken || !imageUrl) && <p className="qr-label-error" role="alert">
          QR image could not load. Check your connection and try again before printing.
        </p>}
        <div className="qr-label-buttons">
          <button type="button" onClick={print} disabled={!qrReady || qrBroken}>Print label</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <p className="qr-label-print-hint">
          Choose the same paper size in the printer dialog, print at 100% scale and enable
          background graphics/colors. Test-scan your printed QR before attaching it.
          {kind === 'trail' && ' Post signs only where authorized; this is not an official wayfinding or safety marker.'}
        </p>
      </div>
    </div>
  );
}
