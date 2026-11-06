const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getCookie('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(normalizarMensaje(error, res));
  }

  return res.json();
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }
  return null;
}

export function getAuthToken(): string | null {
  const raw = getCookie('token');
  return raw ? decodeURIComponent(raw) : null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function handleApiError(res: Response): Promise<{ message?: string; status?: number }> {
  const data = await res.json().catch(() => null);
  const mensaje = normalizarMensaje(data, res);

  return {
    ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
    message: mensaje,
    status: res.status,
  };
}

function normalizarMensaje(data: unknown, res: Response): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const raw = (data as { message?: unknown }).message;
    if (Array.isArray(raw)) {
      const partes = raw.filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
      if (partes.length > 0) return partes.join('. ');
    }
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw;
    }
  }

  if (res.status >= 500) {
    return 'No se pudo completar la operación. Intenta de nuevo.';
  }
  return 'No se pudo completar la operación. Revisa los datos e intenta de nuevo.';
}
