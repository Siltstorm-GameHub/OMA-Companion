const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID!;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Twitch token request failed");
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

export type TwitchUser = {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
};

export type TwitchStream = {
  user_login: string;
  user_name: string;
  title: string;
  game_name: string;
  viewer_count: number;
  thumbnail_url: string;
};

export async function getTwitchUser(login: string): Promise<TwitchUser | null> {
  const token = await getAppAccessToken();
  const res = await fetch(`https://api.twitch.tv/helix/users?login=${login}`, {
    headers: { "Client-ID": TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { data: TwitchUser[] };
  return data.data[0] ?? null;
}

// Löst viele Logins in gebündelten Requests auf (Helix erlaubt bis zu 100 login-Parameter pro Aufruf)
export async function getTwitchUsers(logins: string[]): Promise<TwitchUser[]> {
  if (logins.length === 0) return [];
  const token = await getAppAccessToken();
  const results: TwitchUser[] = [];
  for (let i = 0; i < logins.length; i += 100) {
    const chunk = logins.slice(i, i + 100);
    const params = chunk.map((l) => `login=${encodeURIComponent(l)}`).join("&");
    const res = await fetch(`https://api.twitch.tv/helix/users?${params}`, {
      headers: { "Client-ID": TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) continue;
    const data = (await res.json()) as { data: TwitchUser[] };
    results.push(...data.data);
  }
  return results;
}

// Löst Twitch-User-IDs zu vollständigen Profilen (inkl. login) auf — nötig, weil die Clips-API
// nur die Anzeige-Namen (creator_name/broadcaster_name) liefert, nicht den echten Login.
export async function getTwitchUsersByIds(ids: string[]): Promise<TwitchUser[]> {
  if (ids.length === 0) return [];
  const token = await getAppAccessToken();
  const results: TwitchUser[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const params = chunk.map((id) => `id=${encodeURIComponent(id)}`).join("&");
    const res = await fetch(`https://api.twitch.tv/helix/users?${params}`, {
      headers: { "Client-ID": TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) continue;
    const data = (await res.json()) as { data: TwitchUser[] };
    results.push(...data.data);
  }
  return results;
}

export type TwitchClip = {
  id: string;
  url: string;
  embed_url: string;
  broadcaster_name: string;
  creator_id: string;
  creator_name: string;
  title: string;
  thumbnail_url: string;
  created_at: string;
};

export async function getPartnerClips(broadcasterId: string, from: Date, to: Date): Promise<TwitchClip[]> {
  const token = await getAppAccessToken();
  const params = new URLSearchParams({
    broadcaster_id: broadcasterId,
    started_at: from.toISOString(),
    ended_at: to.toISOString(),
    first: "20",
  });
  const res = await fetch(`https://api.twitch.tv/helix/clips?${params}`, {
    headers: { "Client-ID": TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { data: TwitchClip[] };
  return data.data;
}

export async function getLiveStreams(logins: string[]): Promise<TwitchStream[]> {
  if (logins.length === 0) return [];
  const token = await getAppAccessToken();
  const params = logins.map((l) => `user_login=${encodeURIComponent(l)}`).join("&");
  const res = await fetch(`https://api.twitch.tv/helix/streams?${params}&first=20`, {
    headers: { "Client-ID": TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { data: TwitchStream[] };
  return data.data;
}
