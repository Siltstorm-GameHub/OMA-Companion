import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Discord({
      authorization: { params: { scope: "identify email guilds", prompt: "none" } },
      profile(profile) {
        return {
          // Kein id: profile.id hier – NextAuth soll selbst eine UUID vergeben.
          // Die Verknüpfung zum Discord-Account erfolgt über die Account-Tabelle
          // (provider + providerAccountId), NICHT über die User-ID.
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

            // 3. Stub-User mit frischen Discord-Profildaten aktualisieren
            await prisma.user.update({
              where: { id: stubUser.id },
              data: {
                discordId,
                ...(user.name  ? { name: user.name }   : {}),
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