import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { checkAndAwardBadges } from "@/lib/award-badges";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Discord({
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { scope: "identify email guilds", prompt: "none" } },
      profile(profile) {
        return {
          // id muss zurückgegeben werden, damit Auth.js providerAccountId = Discord-Snowflake setzt.
          // PrismaAdapter v2 ignoriert das id-Feld in createUser und lässt Prisma eine CUID vergeben –
          // die User-DB-ID bleibt also weiterhin eine CUID, nicht die Discord-ID.
          id:    profile.id,
          name:  profile.username,
          email: profile.email ?? null,
          image: profile.avatar
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
        // Tritt auf wenn ein Stub-User (aus dem Mitglieder-Sync) mit derselben
        // discordId existiert, aber noch NIE eingeloggt war (kein oder alter Account-Eintrag).
        // NextAuth hat in diesem Fall einen zweiten User angelegt → zusammenführen.
        try {
          const stubUser = await prisma.user.findFirst({
            where: { discordId, id: { not: user.id } },
          });

          if (stubUser) {
            console.log(`[AUTH] Merge: Stub-User ${stubUser.id} → OAuth-User ${user.id} (Discord: ${discordId})`);

            // 1. Alten Stub-Account löschen (falls vorhanden, hat keine echten Tokens)
            await prisma.account.deleteMany({
              where: { userId: stubUser.id, provider: "discord" },
            });

            // 2. Echten OAuth-Account (mit Tokens) auf den Stub-User übertragen
            await prisma.account.updateMany({
              where: { userId: user.id },
              data:  { userId: stubUser.id },
            });

            // 3. Stub-User mit frischen Discord-Profildaten aktualisieren.
            // name wird bewusst NICHT überschrieben: der Stub hat bereits den
            // server-spezifischen Nickname aus dem Sync; profile.username wäre
            // nur der globale Discord-Username.
            await prisma.user.update({
              where: { id: stubUser.id },
              data: {
                discordId,
                ...(user.image ? { image: user.image } : {}),
              },
            });

            // 4. Duplikat-User löschen (ist brandneu, hat noch keine echten Daten)
            await prisma.user.delete({ where: { id: user.id } });

            // 5. Session zeigt auf den echten Stub-User
            token.id        = stubUser.id;
            token.discordId = discordId;
          } else {
            // Kein Stub → normaler Erstlogin, discordId setzen
            await prisma.user.update({
              where: { id: user.id },
              data:  { discordId },
            }).catch(() => { /* unique constraint – discordId bereits korrekt gesetzt */ });

            token.id        = user.id;
            token.discordId = discordId;
          }
        } catch (err) {
          console.error("[AUTH] Merge-Fehler:", err);
          token.id        = user.id;
          token.discordId = discordId;
        }
      } else if (user) {
        // Anderer Provider (falls je hinzugefügt)
        token.id = user.id;
      }

      // ── Rolle & Punkte bei JEDEM JWT-Aufruf frisch aus der DB laden ──────────
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where:  { id: token.id as string },
            select: { role: true, points: true },
          });
          token.role   = dbUser?.role   ?? "user";
          token.points = dbUser?.points ?? 0;
        } catch (error) {
          console.error("[AUTH] DB-Fehler beim Laden der Rolle:", error);
          if (!token.role) token.role = "user";
        }
      }

      // Fire-and-forget badge check on every login (only first time per earned badge matters)
      if (token.id && user) {
        checkAndAwardBadges(token.id as string).catch(() => {});
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        const u = session.user as { role?: string; points?: number };
        u.role   = token.role   as string;
        u.points = token.points as number;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});