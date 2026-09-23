'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface NavLink { href: string; label: string }

/** Menú móvil: botón con aria-expanded que muestra un panel. Esc cierra y devuelve el foco. */
export function MobileMenu({ links }: { links: readonly NavLink[] }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button ref={button} type="button" className="menu-btn" aria-expanded={open} aria-controls="menu-panel"
        onClick={() => setOpen((o) => !o)}>
        <span>{open ? 'Cerrar' : 'Menú'}</span>
        <span className="menu-icon" aria-hidden="true" />
      </button>
      <div id="menu-panel" className="menu-panel" hidden={!open}>
        <ul>
          {links.map((l) => (
            <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)}>{l.label}</Link></li>
          ))}
        </ul>
      </div>
    </>
  );
}
