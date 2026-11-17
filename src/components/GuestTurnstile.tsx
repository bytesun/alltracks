import { useEffect, useRef } from 'react';

type TurnstileApi = {
  render: (element: HTMLElement, options: {
    sitekey: string;
    action: string;
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};
const turnstileWindow = (): Window & { turnstile?: TurnstileApi } => window as Window & { turnstile?: TurnstileApi };

/**
 * Render only when guest check-in is enabled by the server. We never ask
 * anonymous visitors to log in or leak the Turnstile secret into the browser.
 */
export function GuestTurnstile({
  siteKey, onToken, resetSignal,
}: { siteKey: string; onToken: (value: string) => void; resetSignal: number }) {
  const node = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const render = () => {
      const api = turnstileWindow().turnstile;
      if (!active || !api || !node.current || widgetId.current) return;
      widgetId.current = api.render(node.current, {
        sitekey: siteKey,
        action: 'object_checkin',
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    };
    const w = turnstileWindow();
    let script = document.querySelector<HTMLScriptElement>('script[data-alltracks-turnstile]');
    if (w.turnstile) {
      render();
    } else {
      if (!script) {
        script = document.createElement('script');
        script.dataset.alltracksTurnstile = 'true';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', render);
    }
    return () => {
      active = false;
      script?.removeEventListener('load', render);
      if (widgetId.current && turnstileWindow().turnstile) {
        turnstileWindow().turnstile!.remove(widgetId.current);
      }
      widgetId.current = null;
    };
  }, [siteKey, onToken]);

  useEffect(() => {
    if (widgetId.current) {
      onToken('');
      turnstileWindow().turnstile?.reset(widgetId.current);
    }
  }, [resetSignal, onToken]);

  return <div className="journey-captcha" aria-label="Human verification">
    <div ref={node} />
    <small>Human verification helps protect this public object's journey from automated spam.</small>
  </div>;
}
