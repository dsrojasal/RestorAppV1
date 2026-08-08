'use client';

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

export interface ContextMenuItem {
  icon: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
}

export interface ContextMenuRef {
  open: (e: React.MouseEvent, id: number) => void;
  close: () => void;
}

interface ContextMenuProps {
  items: (id: number) => ContextMenuItem[];
}

const ContextMenu = forwardRef<ContextMenuRef, ContextMenuProps>(({ items }, ref) => {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    open(e, id) {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setAnchor(rect);
      setMenuPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.right - 180, window.innerWidth - 188)) });
      setMenuOpen((cur) => (cur === id ? null : id));
    },
    close() {
      setMenuOpen(null);
    },
  }), []);

  useLayoutEffect(() => {
    if (menuOpen === null || !menuRef.current || !anchor) return;
    const h = menuRef.current.offsetHeight;
    let top = menuPos.top;
    if (top + h > window.innerHeight - 8) {
      top = Math.max(8, anchor.top - h - 4);
    }
    setMenuPos((p) => ({ ...p, top }));
  }, [menuOpen, anchor]);

  if (menuOpen === null) return null;

  const list = items(menuOpen);
  if (!list || list.length === 0) return null;

  return (
    <>
      <div className="context-backdrop" onClick={() => setMenuOpen(null)} />
      <div ref={menuRef} className="context-menu open" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}>
        {list.map((it) => (
          <button
            key={it.label}
            className={`context-item ${it.danger ? 'danger' : ''}`}
            onClick={() => { setMenuOpen(null); it.onClick(); }}
          >
            <span className="material-symbols-outlined">{it.icon}</span> {it.label}
          </button>
        ))}
      </div>
    </>
  );
});

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;