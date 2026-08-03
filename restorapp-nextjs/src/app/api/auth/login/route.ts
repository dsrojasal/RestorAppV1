import { NextResponse } from 'next/server';

const API_BASE = process.env.API_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Credenciales inválidas' }));
      return NextResponse.json(
        { message: error.message || 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const data = await res.json();

    const userRes = await fetch(`${API_BASE}/usuarios/email/${encodeURIComponent(data.email)}`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    let userName = 'Usuario';
    let userRol = 'Administrador';
    let userId = 0;
    let userRolId = 1;
    let createdAt = new Date().toISOString();

    if (userRes.ok) {
      const userData = await userRes.json();
      userName = userData.name || userName;
      userRol = userData.rol?.nombre || userRol;
      userId = userData.id || 0;
      userRolId = userData.rolId || 1;
      createdAt = userData.createdAt || createdAt;
    }

    const token = data.access_token;

    const response = NextResponse.json({ success: true });

    response.cookies.set('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    response.cookies.set('user', JSON.stringify({ name: userName, email: data.email, rol: userRol, createdAt }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
