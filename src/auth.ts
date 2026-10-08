import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { checkAndAwardBadges } from "@/lib/award-badges";
import { ensureCommunityCard } from "@/lib/season/card-provisioning";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      
      // ── OIDC-Fix für Auth.js v5 / @auth/core ──────────────────────────
      // Discord unterstützt kein OIDC. Wir definieren die Endpunkte direkt,
      // um fälschliche OIDC Issuer-Prüfungen gegen https://authjs.dev zu verhindern.
      issuer: "https://discord.com",
      checks: ["state"],
      authorization: {
        url: "https://discord.com/oauth2/authorize",
        params: { scope: "identify email guilds" },
      },
      token: "https://discord.com/api/oauth2/token",
      userinfo: "https://discord.com/api/users/@me",
      // ─────────────────────────────────────────────────────────────────

      profile(profile) {
        return {
          id:     profile.id,
          name:   profile.username,
          email:  profile.email ?? null,
          image:  profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider !== "discord") return true;

      const guildId = process.env.DISCORD_GUILD_ID;
      if (!guildId) return true; // Kein Guild konfiguriert → offen lassen

      try {
        const res = await fetch("https://discord.com/api/users/@me/guilds", {
          headers: { Authorization: `Bearer ${account.access_token}` },
          next: { revalidate: 0 },
        });
        if (!res.ok) {
          console.error("[AUTH] guilds-Abruf fehlgeschlagen:", res.status);
          return true; // Fail open
        }
        const guilds: { id: string }[] = await res.json();
        const isMember = guilds.some(g => g.id === guildId);
        if (!isMember) return "/auth/not-member";
      } catch (err) {
        console.error("[AUTH] guilds-Check Fehler:", err);
        return true; // Fail open
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // ── Initialer Login (user & account sind nur beim ersten JWT-Aufruf gesetzt) ──
      if (user && account?.provider === "discord") {
        const discordId = account.providerAccountId;

        // ── Duplikat-Erkennung & Merge ────────────────────────────────────────
        try {
          const stubUser = await prisma.user.findFirst({
            where: { discordId, id: { not: user.id } },
          });

          if (stubUser) {
            console.log(`[AUTH] Merge gestartet: Stub ${stubUser.id} ↔ OAuth-User ${user.id} (Discord: ${discordId})`);
            let merged = false;

            try {
              await prisma.$transaction(async (tx) => {
                await tx.account.deleteMany({ where: { userId: stubUser.id, provider: "discord" } });
                await tx.account.updateMany({ where: { userId: user.id }, data: { userId: stubUser.id } });
                await tx.user.update({
                  where: { id: stubUser.id },
                  data:  { discordId, ...(user.image ? { image: user.image } : {}) },
                });
                await tx.user.delete({ where: { id: user.id } });
              });
              token.id = stubUser.id;
              merged   = true;
              console.log(`[AUTH] Merge Richtung 1 OK: Stub ${stubUser.id} ist nun der aktive User.`);
            } catch (txErr) {
              console.warn(`[AUTH] Merge Richtung 1 fehlgeschlagen (OAuth-User hat ggf. Daten), versuche Richtung 2:`, txErr);
            }

            if (!merged) {
              try {
                await prisma.$transaction(async (tx) => {
                  await tx.user.update({ where: { id: stubUser.id }, data: { discordId: null } });
                  await tx.user.update({
                    where: { id: user.id },
                    data:  { discordId, ...(user.image ? { image: user.image } : {}) },
                  });
                  await tx.account.updateMany({ where: { userId: stubUser.id, provider: "discord" }, data: { userId: user.id } });
                });
                token.id = user.id;
                merged   = true;
                console.warn(`[AUTH] Merge Richtung 2 (Fallback): OAuth-User ${user.id} behält discordId.`);
              } catch (tx2Err) {
                console.error(`[AUTH] Beide Merge-Richtungen fehlgeschlagen:`, tx2Err);
                token.id = user.id;
              }
            }

            token.discordId = discordId;
          } else {
            await prisma.user.update({
              where: { id: user.id },
              data:  { discordId, ...(user.email ? { email: user.email } : {}) },
            }).catch(async () => {
              await prisma.user.update({
                where: { id: user.id },
                data:  { discordId },
              }).catch(() => {});
            });

            token.id        = user.id;
            token.discordId = discordId;
          }
        } catch (err) {
          console.error("[AUTH] Merge-Fehler:", err);
          token.id        = user.id;
          token.discordId = discordId;
        }

      } else if (user) {
        token.id = user.id;
      }

      // ── Rolle & Punkte bei JEDEM JWT-Aufruf frisch aus der DB laden ──────────
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where:  { id: token.id as string },
            select: { role: true, points: true, rankPoints: true },
          });
          token.role       = dbUser?.role       ?? "user";
          token.points     = dbUser?.points     ?? 0;
          token.rankPoints = dbUser?.rankPoints ?? 0;
        } catch (error) {
          console.error("[AUTH] DB-Fehler beim Laden der Rolle:", error);
          if (!token.role) token.role = "user";
        }
      }

      // Fire-and-forget badge check on every login
      if (token.id && user) {
        checkAndAwardBadges(token.id as string).catch(() => {});
        if (token.discordId) {
          ensureCommunityCard({ userId: token.id as string, discordId: token.discordId as string, displayName: user.name ?? "OMA-Mitglied" }).catch(() => {});
        }
      }

      // ── Aktivitäts-Zeitstempel ─────────────────────
      if (token.id) {
        const lastSync = token.lastActivitySync as number | undefined;
        const now = Date.now();
        if (!lastSync || now - lastSync > 30 * 60 * 1000) {
          await prisma.user.update({
            where: { id: token.id as string },
            data:  { lastLoginAt: new Date() },
          }).catch(() => {});
          token.lastActivitySync = now;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        const u = session.user as { role?: string; points?: number; rankPoints?: number };
        u.role       = token.role       as string;
        u.points     = token.points     as number;
        u.rankPoints = token.rankPoints as number;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});