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
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 1. Initialer Login-Moment (Erstregistrierung oder frischer Login)
      if (user) {
        token.id = user.id;
        // Beim allerersten Login geben wir standardmäßig die Rolle "user"
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