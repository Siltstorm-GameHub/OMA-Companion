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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Rolle direkt beim Login aus der DB holen und in den Token packen
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "user";
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