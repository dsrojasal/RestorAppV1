'use client';

import { useEffect, useRef, useState } from 'react';
import { construirTicketHTML, generarQR, type TicketData } from '@/lib/imprimirTicket';

interface Props {
  data: TicketData | null;
  onClose: () => void;
}

export default function TicketModal({ data, onClose }: Props) {
  const [html, setHtml] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generar el ticket (con QR) cada vez que se abre
  useEffect(() => {
    if (!data) { setHtml(''); return; }
    let activo = true;
    generarQR(data).then((qr) => {
      if (activo) setHtml(construirTicketHTML(data, { qr }));
    });
    return () => { activo = false; };
  }, [data]);

  // Cerrar con Esc
  useEffect(() => {
    if (!data) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [data, onClose]);

  // Bloquear el scroll de la página de atrás mientras el modal está abierto
  useEffect(() => {
    if (!data) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [data]);

  if (!data) return null;

  const imprimir = () => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        display: 'grid', placeItems: 'center', padding: 16,
        overscrollBehavior: 'contain',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Vista previa del ticket"
        style={{
          width: 'min(420px, 100%)', maxHeight: '94vh',
          display: 'flex', flexDirection: 'column',
          background: '#e5e5e5', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e5e5e5' }}>
          <strong style={{ fontSize: 15 }}>Vista previa del ticket</strong>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ width: 32, height: 32, border: 0, borderRadius: '50%', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Ticket */}
        <div style={{ flex: 1, overflow: 'auto', overscrollBehavior: 'contain', padding: 16, display: 'flex', justifyContent: 'center' }}>
          {html ? (
            <iframe
              ref={iframeRef}
              title="Ticket"
              srcDoc={html}
              style={{ width: 320, height: 'min(620px, 66vh)', border: 0, background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,.25)' }}
            />
          ) : (
            <p style={{ color: '#666', padding: 40 }}>Generando ticket...</p>
          )}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 8, padding: 12, background: '#fff', borderTop: '1px solid #e5e5e5' }}>
          <button className="btn-cancel" style={{ flex: 0.5 }} onClick={onClose}>Cerrar</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={imprimir} disabled={!html}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>print</span> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}