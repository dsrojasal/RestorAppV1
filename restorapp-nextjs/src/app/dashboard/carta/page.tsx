'use client';

import { useState } from 'react';
import PlatosTab from '@/components/carta/PlatosTab';
import CategoriasTab from '@/components/carta/CategoriasTab';
import IngredientesTab from '@/components/carta/IngredientesTab';
import RecetasTab from '@/components/carta/RecetasTab';

const TABS = [
  { id: 'platos', label: 'Platos' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'ingredientes', label: 'Ingredientes' },
  { id: 'recetas', label: 'Recetas' },
];

export default function CartaPage() {
  const [tab, setTab] = useState('platos');

  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Gestión de la Carta</h2>
        <p className="page-subtitle">Administra platos, bebidas, categorías, ingredientes y recetas del menú.</p>
      </div>

      <div className="segment-control animate-in animate-in-delay-1">
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`segment-option ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className="animate-in animate-in-delay-2">
        {tab === 'platos' && <PlatosTab />}
        {tab === 'categorias' && <CategoriasTab />}
        {tab === 'ingredientes' && <IngredientesTab />}
        {tab === 'recetas' && <RecetasTab />}
      </div>
    </>
  );
}