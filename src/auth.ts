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
  callbacks: {
    // account hier hinzugefügt, um beim Erst-Login die ID abzugreifen
    async jwt({ token, user, account }) {
      // 1. Initialer Login-Moment (Erstregistrierung oder frischer Login)
      if (user) {
        // Wenn vorhanden, nutzen wir die providerAccountId (reine Discord-ID)
        token.id = account?.providerAccountId ?? user.id;
        token.role = "user";
      } 
      // 2. Nachfolgende Seitenaufrufe (User existiert bereits in der DB)
      else if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          token.role = dbUser?.role ?? "user";
        } catch (error) {
          console.error("Fehler beim Laden der Benutzerrolle:", error);
          token.role = "user";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});