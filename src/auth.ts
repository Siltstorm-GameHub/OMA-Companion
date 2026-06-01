import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Discord({
      authorization: { params: { scope: "identify email guilds" } },
      // HIER EINGEFÜGT: Zwingt NextAuth, deine echte Discord-ID als User-ID zu nutzen
      profile(profile) {
        return {
          id: profile.id, // Das ist deine echte, numerische Discord-ID!
          name: profile.username,
          email: profile.email,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
          role: "user", // Standardrolle für neue User
        };
      },
    }),
  ],
  events: {
    // discordId beim Login automatisch in User-Tabelle speichern
    // → Bot kann User danach per discordId finden
    async signIn({ user, account }) {
      if (account?.provider === "discord" && account.providerAccountId && user.id) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { discordId: account.providerAccountId },
          });
        } catch {
          // Ignorieren falls discordId schon gesetzt (unique constraint)
        }
      }
    },
  },
  callbacks: {
    // account hier hinzugefügt, um beim Erst-Login die ID abzugreifen
    async jwt({ token, user, account }) {
      // ID beim initialen Login setzen
      if (user) {
        token.id = user.id; // Echter DB-Primary-Key, NICHT providerAccountId
        token.discordId = account?.providerAccountId;
      }
      // Rolle bei JEDEM Aufruf frisch aus der DB laden
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, points: true, level: true },
          });
          token.role   = dbUser?.role   ?? "user";
          token.points = dbUser?.points ?? 0;
          token.level  = dbUser?.level  ?? 1;
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
        const u = session.user as { role?: string; points?: number; level?: number };
        u.role   = token.role   as string;
        u.points = token.points as number;
        u.level  = token.level  as number;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});