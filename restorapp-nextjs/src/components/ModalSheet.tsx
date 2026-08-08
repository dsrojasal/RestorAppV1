'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

interface ModalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function ModalSheet({ isOpen, onClose, title, children }: ModalSheetProps) {
  const [openKey, setOpenKey] = useState(0);
  const prevOpen = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      setOpenKey((k) => k + 1);
    }
    prevOpen.current = isOpen;
  }, [isOpen]);

  return (
    <>
      <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`modal-sheet ${isOpen ? 'open' : ''}`}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body" key={openKey}>
          {children}
        </div>
      </div>
    </>
  );
}
