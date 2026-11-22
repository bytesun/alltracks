import { useEffect, useRef } from 'react';

/** Accessible in-app confirmation, without browser confirm/alert. */
export function DeleteConfirmModal({ open, title, description, busy = false, onCancel, onConfirm }: {
  open: boolean; title: string; description: string; busy?: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return <dialog ref={dialog} onCancel={event => {
    event.preventDefault();
    if (!busy) onCancel();
  }} onClose={() => { if (!busy && open) onCancel(); }}
    aria-labelledby="delete-confirm-title" aria-describedby="delete-confirm-description"
    style={{ border: '1px solid #d9e0d6', borderRadius: 18, padding: 28,
      width: 'min(420px, calc(100vw - 36px))', maxWidth: '100%',
      boxShadow: '0 24px 65px rgba(0,0,0,.22)', color: '#193329' }}>
    <h2 id="delete-confirm-title" style={{ margin: '0 0 12px', fontSize: 22 }}>{title}</h2>
    <p id="delete-confirm-description" style={{ lineHeight: 1.5, marginBottom: 24 }}>{description}</p>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
      <button type="button" disabled={busy} onClick={onCancel}
        style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid #cbd5ce', background: '#fff', color: '#193329' }}>Cancel</button>
      <button type="button" disabled={busy} onClick={onConfirm}
        style={{ padding: '10px 18px', borderRadius: 9, border: 0, background: '#b42318', color: '#fff' }}>
        {busy ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  </dialog>;
}
