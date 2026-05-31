import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // NextAuth v5 benötigt standardmäßig die JWT-Strategie, 
  // wenn wir Callbacks manipulieren und OAuth nutzen.
  session: { strategy: "jwt" },
  providers: [
    Discord({
      // Bei NextAuth v5 kannst du clientId und clientSecret hier komplett weglassen!
      // Wenn in Vercel AUTH_DISCORD_ID und AUTH_DISCORD_SECRET existieren,
      // liest NextAuth diese vollautomatisch aus.
      authorization: { params: { scope: "identify email guilds" } },
    }),
  ],
callbacks: {
    async jwt({ token, user, account }) {
      // 1. Initialer Login-Moment (Erstregistrierung oder frischer Login)
      if (user) {
        token.id = user.id;
        
        // Wenn es ein brandneuer OAuth-Login ist, existiert er noch nicht in der DB.
        // Der PrismaAdapter erstellt den User jetzt im Hintergrund.
        // Wir geben ihm standardmäßig die Rolle "user".
        token.role = "user";
      } 
      // 2. Nachfolgende Seitenaufrufe (User existiert garantiert in der DB)
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