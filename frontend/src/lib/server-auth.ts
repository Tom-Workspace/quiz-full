import { cookies } from 'next/headers';
import type { User } from '@/lib/auth';

// Decode JWT payload on the server (base64url -> JSON)
function decodeJWTPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Returns a minimal "User" object constructed from the refresh token payload.
// We intentionally DO NOT call the backend here to avoid rotating the refresh token on the server.
export async function getInitialUserFromCookie(): Promise<User | null> {
  try {
    const store = await cookies();
    const refresh = store.get('refreshToken')?.value;
    if (!refresh) return null;

    const payload = decodeJWTPayload(refresh);
    if (!payload?.userId || !payload?.role) return null;

    // Construct a minimal user that satisfies the User interface.
    const nowIso = new Date().toISOString();
    const initialUser: User = {
      _id: payload.userId,
      name: '...'
      , // will be replaced on client after fetching profile
      phone: payload.phone || '',
      age: 0,
      role: payload.role,
      isApproved: true,
      isOnline: false,
      lastSeen: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return initialUser;
  } catch {
    return null;
  }
}
