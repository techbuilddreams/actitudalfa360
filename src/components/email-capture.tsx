'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { normalizeEmail } from '@/domain/email';

export interface CaptureText {
  label: string; placeholder: string; button: string; busy: string; micro: string; privacy: string; health: string;
  errEmpty: string; errInvalid: string; errRetry: string; okTitle: string; okBefore: string; okAfter: string;
  membership: string; daily: string;
}

export interface SignupPayload { email: string; timeZone: string; source: 'home' | 'reto'; membershipInterest: boolean }

const postSignup = (p: SignupPayload) =>
  fetch('/api/reto/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });

/** La zona del navegador: el día 1 y el corte del mediodía son en la hora del participante. */
const browserTimeZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
};

interface Props {
  source: SignupPayload['source'];
  text: CaptureText;
  /** Puerto inyectable (tests). Por defecto, POST a /api/reto/signup. */
  submit?: (p: SignupPayload) => Promise<Response>;
  /** Zona del participante, inyectable (tests). Por defecto, la del navegador. */
  resolveTimeZone?: () => string;
  /**
   * Si la URL llega con este hash («Avísame cuando abra»), se lleva a la persona a la casilla de la membresía:
   * scroll y resaltado; el foco va al FORMULARIO (tabIndex -1), no a la casilla: con ella enfocada, un Espacio la
   * marcaría. NUNCA se marca sola: una casilla premarcada no es consentimiento (TJUE, Planet49).
   */
  membershipHash?: string;
}

/** Alta en el reto: un solo campo. Misma regla de correo que el servidor (`normalizeEmail`). */
export function EmailCapture({ source, text: t, submit = postSignup, resolveTimeZone = browserTimeZone, membershipHash }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [member, setMember] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const memberBox = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!membershipHash) return;
    const sync = () => {
      if (window.location.hash !== `#${membershipHash}`) return;
      memberBox.current?.scrollIntoView?.({ block: 'center' });
      form.current?.focus({ preventScroll: true });
      setHighlight(true);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [membershipHash]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const raw = input.current?.value ?? '';
    const email = normalizeEmail(raw);
    if (!email) {
      setError(raw.trim() ? t.errInvalid : t.errEmpty);
      input.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await submit({ email, timeZone: resolveTimeZone(), source, membershipInterest: member });
      if (res.status === 202) { setDone(email); return; }
      const body = res.status === 400 ? ((await res.json().catch(() => ({}))) as { error?: unknown }) : {};
      setError(typeof body.error === 'string' && body.error ? body.error : t.errRetry);
    } catch {
      setError(t.errRetry);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="capture-ok" role="status">
        <strong>{t.okTitle}</strong>
        <span className="micro">{t.okBefore}{done}{t.okAfter}</span>
      </div>
    );
  }

  const errId = `${id}-err`;
  return (
    <form ref={form} className="capture" tabIndex={-1} noValidate onSubmit={onSubmit}>
      <label htmlFor={id}>{t.label}</label>
      <div className="capture-row">
        <input ref={input} id={id} name="email" type="email" inputMode="email" autoComplete="email" placeholder={t.placeholder}
          required aria-invalid={error ? true : undefined} aria-describedby={error ? errId : undefined}
          onInput={() => setError(null)} />
        <button className="btn" type="submit" disabled={busy} aria-busy={busy}>{t.button}</button>
      </div>
      {error && <p className="err" id={errId} role="alert">{error}</p>}
      <label className={highlight ? 'check highlight' : 'check'}>
        <input ref={memberBox} type="checkbox" name="membresia" checked={member} onChange={(e) => setMember(e.target.checked)} /> {t.membership}
      </label>
      <p className="micro">{t.daily}</p>
      <p className="micro">{t.micro} <Link href="/politicas#privacidad-reto">{t.privacy}</Link>.</p>
      <p className="micro health-note">{t.health}</p>
    </form>
  );
}
