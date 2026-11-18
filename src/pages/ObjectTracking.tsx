import { useEffect, useState } from 'react';
import { classifyRequestFailure } from '../lib/requestFailure';
import { Link } from 'react-router-dom';
import { Principal } from '@dfinity/principal';
import { useAlltracks, useGlobalContext, useSetLoginModal } from '../components/Store';
import { createObject, getMyObjects, objectLink, type ObjectRecord } from '../api/object-journey/objects';
import { PrintableQrLabel } from '../components/PrintableQrLabel';
import { ObjectPhoto } from '../components/ObjectPhoto';
import './ObjectJourney.css';

function QRCode({ url, name }: { url: string; name: string }) {
  // Public QR URLs can be rendered by a standard QR image service without sharing private app data.
  // The physical label never encodes the owner's principal or the person's GPS location.
  const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=15&data=' + encodeURIComponent(url);
  return <div className="journey-qr">
    <img src={qr} width="230" height="230" alt={'Scan QR code for ' + name} loading="lazy" />
    <p>{url}</p>
    <div className="journey-card-actions">
      <a href={qr} target="_blank" rel="noopener noreferrer" download>Open QR image</a>
      <button type="button" onClick={() => void navigator.clipboard.writeText(url)}>Copy link</button>
    </div>
  </div>;
}

export function ObjectTracking() {
  const backend = useAlltracks();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const [, setLoginModal] = useSetLoginModal();
  const [objects, setObjects] = useState<ObjectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printingObject, setPrintingObject] = useState<ObjectRecord | null>(null);
  const [gatewayPrincipal, setGatewayPrincipal] = useState<string | null>(null);
  const [guestPolicies, setGuestPolicies] = useState<Record<string, boolean>>({});
  const [changingGuestId, setChangingGuestId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/objects/guest-config', { cache: 'no-store', signal: controller.signal })
      .then(async response => response.ok ? response.json() : null)
      .then((config: { enabled?: boolean; gatewayPrincipal?: string } | null) => {
        if (!controller.signal.aborted && config?.enabled && config.gatewayPrincipal) {
          setGatewayPrincipal(config.gatewayPrincipal);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isAuthed || !gatewayPrincipal || !objects.length) return;
    let cancelled = false;
    void Promise.all(objects.map(async object => {
      try {
        const policy = await backend.getObjectGuestPolicy(object.id);
        const enabled = !!policy.length && policy[0].enabled &&
          policy[0].gateway.toText() === gatewayPrincipal;
        return [object.id, enabled] as const;
      } catch {
        return [object.id, false] as const;
      }
    })).then(pairs => {
      if (!cancelled) setGuestPolicies(Object.fromEntries(pairs));
    });
    return () => { cancelled = true; };
  }, [isAuthed, backend, gatewayPrincipal, objects.map(x => x.id).join('|')]);

  const toggleGuestCheckin = async (objectId: string) => {
    if (!gatewayPrincipal || !isAuthed) return;
    setChangingGuestId(objectId);
    setError('');
    try {
      const newEnabled = !guestPolicies[objectId];
      const result = await backend.setObjectGuestPolicy(
        objectId,
        newEnabled,
        Principal.fromText(gatewayPrincipal),
      );
      if ('err' in result) throw new Error(result.err);
      setGuestPolicies(old => ({ ...old, [objectId]: newEnabled }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change guest policy.');
    } finally {
      setChangingGuestId(null);
    }
  };


  const refresh = async () => {
    if (!isAuthed || !principal) {
      setObjects([]);
      return;
    }
    setLoading(true);
    try {
      setObjects(await getMyObjects(backend, principal));
      setError('');
    } catch (e) {
      const category = classifyRequestFailure(e);
      setError(category === 'authentication'
        ? 'Your session may have expired. Sign in again to reload your objects.'
        : category === 'network'
          ? 'Network unavailable. Your previously loaded objects are preserved; retry when connected.'
          : e instanceof Error ? e.message : 'Unable to load your objects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [isAuthed, principal?.toText(), backend]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthed) { setLoginModal(true); return; }
    setSaving(true);
    setError('');
    try {
      const object = await createObject(backend, name, description, emoji, photoUrl);
      setObjects(old => [object, ...old]);
      setExpandedId(object.id);
      setName('');
      setDescription('');
      setPhotoUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create object.');
    } finally {
      setSaving(false);
    }
  };

  return <main className="journey-page">
    <section className="journey-hero journey-hero--compact">
      <div className="journey-overline">ALLTRACKS · OBJECT TRACKING</div>
      <div className="journey-cup">🎒</div>
      <h1>Track Me Down</h1>
      <p className="journey-intro">Give an object a journey of its own. Create a page, print its QR code, and collect voluntary location check-ins on AllTracks.</p>
    </section>

    {!isAuthed ? <section className="journey-panel">
      <h2>Sign in to create your objects</h2>
      <p>Anyone can open a public object's page. Creating an object and adding a check-in currently require an AllTracks account.</p>
      <button className="journey-button" type="button" onClick={() => setLoginModal(true)}>Sign in to AllTracks</button>
    </section> : <>
      <section className="journey-panel journey-checkin">
        <div className="journey-section-title"><h2>Create an object</h2><span>01 / NEW OBJECT</span></div>
        <form onSubmit={create}>
          <label htmlFor="object-name">Object name</label>
          <input id="object-name" required maxLength={100} placeholder="My wandering cup" value={name} onChange={e => setName(e.target.value)} />
          <label htmlFor="object-emoji">Icon</label>
          <select id="object-emoji" value={emoji} onChange={e => setEmoji(e.target.value)}>
            <option value="📦">📦 Item</option><option value="☕">☕ Cup</option>
            <option value="🧸">🧸 Toy</option><option value="🎒">🎒 Backpack</option>
            <option value="📚">📚 Book</option><option value="🪨">🪨 Painted rock</option>
          </select>
          <label htmlFor="object-description">Story or instructions</label>
          <textarea id="object-description" rows={3} maxLength={500} placeholder="Help me see the world! Share where you found me…" value={description} onChange={e => setDescription(e.target.value)} />
          <label htmlFor="object-photo-url">Photo URL (optional)</label>
          <input id="object-photo-url" type="url" inputMode="url" maxLength={220}
            placeholder="https://example.com/my-cup.jpg"
            value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
          <p className="journey-photo-hint">Use a public HTTPS image link. It will appear on
            the object's public journey page and in your collection. The image is hosted externally.</p>
          {photoUrl.trim() && <ObjectPhoto key={photoUrl} url={photoUrl} name={name || 'your object'} compact />}
          <p>Object details, photos and check-ins are public. Please don't include personal contact information.</p>
          <button type="submit" className="journey-button" disabled={saving || !name.trim()}>{saving ? 'Creating on ICP…' : 'Create object & QR code'}</button>
        </form>
        {error && <p className="journey-error" role="alert">{error}</p>}
      </section>

      <section className="journey-panel">
        {!gatewayPrincipal && <p className="journey-login-notice">
          Guest check-ins are not enabled on this deployment. Your objects and QR links work
          with the existing signed-in Checkpoint flow. Guest policy controls will appear
          after the existing ICP backend and anti-abuse gateway are deployed.
        </p>}
        <div className="journey-section-title"><h2>My objects</h2><span>02 / MY COLLECTION</span></div>
        {loading && <p>Loading objects from ICP…</p>}
        {!loading && objects.length === 0 && <p>No objects yet. Create your first object above.</p>}
        <div className="journey-objects-grid">
          {objects.map(object => <article className="journey-object-card" key={object.id}>
            <div className="journey-object-icon">{object.emoji}</div>
            {object.photoUrl && <ObjectPhoto url={object.photoUrl} name={object.name} compact />}
            <div className="journey-object-body">
              <h3>{object.name}</h3>
              <p>{object.description || 'Start a journey and see where it travels.'}</p>
              <small>Created {new Date(object.createdAt).toLocaleDateString()}</small>
              <div className="journey-card-actions">
                <Link to={'/object/' + encodeURIComponent(object.id)}>View journey</Link>
                <button type="button" onClick={() => setExpandedId(expandedId === object.id ? null : object.id)}>{expandedId === object.id ? 'Hide QR' : 'Show QR'}</button>
                <button type="button" onClick={() => setPrintingObject(object)}>
                  Print sticker label
                </button>
                {gatewayPrincipal && <button type="button"
                  disabled={changingGuestId === object.id}
                  onClick={() => void toggleGuestCheckin(object.id)}
                >{guestPolicies[object.id] ? 'Disable guest check-ins' : 'Enable guest check-ins'}</button>}
              </div>
              {expandedId === object.id && <QRCode name={object.name} url={objectLink(object.id)} />}
            </div>
          </article>)}
        </div>
      </section>
    </>}
    {printingObject && <PrintableQrLabel
      kind="object"
      url={objectLink(printingObject.id)}
      name={printingObject.name}
      icon={printingObject.emoji}
      code={printingObject.id.slice(4, 12)}
      guestCheckinEnabled={Boolean(gatewayPrincipal && guestPolicies[printingObject.id])}
      onClose={() => setPrintingObject(null)}
    />}
    <footer className="journey-footer">QR codes are public links, not GPS transmitters. AllTracks stores voluntary reports in its existing ICP tracking canister. Pass objects on with permission; do not leave litter on trails.</footer>
  </main>;
}
