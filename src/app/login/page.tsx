'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Credenciales inválidas');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Error de conexión. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#f7faf9', fontFamily: "'Manrope', 'Noto Sans', sans-serif" }}>
      <main className="relative z-10 w-full" style={{ maxWidth: '440px', padding: '24px 24px' }}>
        <div style={{
          background: '#ffffff', borderRadius: '0.75rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid #e0bfbd',
          padding: '40px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          {error && (
            <div style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
              background: '#ffdad6', color: '#ba1a1a', padding: '16px',
              borderRadius: '0.75rem', marginBottom: '16px', fontSize: '14px', fontWeight: 500
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '80px', height: '80px', background: '#251818',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              marginBottom: '16px'
            }}>
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '40px', fontVariationSettings: "'FILL' 1" }}>restaurant_menu</span>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', color: '#251818' }}>RestorApp</h1>
            <p style={{ color: '#584140', marginTop: '4px', fontSize: '16px' }}>Bienvenido de nuevo</p>
          </div>

          <form style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }} onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#584140' }} htmlFor="email">Correo electronico</label>
              <input
                style={{
                  width: '100%', padding: '12px 16px', background: '#ffffff',
                  border: '1.5px solid #e0bfbd', borderRadius: '0.75rem',
                  fontSize: '14px', color: '#251818', outline: 'none',
                  transition: 'all 0.25s ease', fontFamily: 'inherit'
                }}
                id="email"
                name="email"
                type="email"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                onFocus={(e) => { e.target.style.borderColor = '#ae2f34'; e.target.style.boxShadow = '0 0 0 3px #ffdad8'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e0bfbd'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#584140' }} htmlFor="password">Contrasena</label>
              <input
                style={{
                  width: '100%', padding: '12px 16px', background: '#ffffff',
                  border: '1.5px solid #e0bfbd', borderRadius: '0.75rem',
                  fontSize: '14px', color: '#251818', outline: 'none',
                  transition: 'all 0.25s ease', fontFamily: 'inherit'
                }}
                id="password"
                name="password"
                type="password"
                placeholder="Introduce tu contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                onFocus={(e) => { e.target.style.borderColor = '#ae2f34'; e.target.style.boxShadow = '0 0 0 3px #ffdad8'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e0bfbd'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div style={{ paddingTop: '8px' }}>
              <button
                className="login-btn"
                type="submit"
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>
              </button>
            </div>
          </form>

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e0bfbd', width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#584140' }}>&copy; 2026 RestorAppCRUB</p>
          </div>
        </div>
      </main>
    </div>
  );
}
