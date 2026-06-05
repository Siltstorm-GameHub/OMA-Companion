import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      points: number;      // Münzen (Shop-Währung)
      rankPoints: number;  // Prestige-Punkte (Events, Turniere, LuL)
      level: number;
    } & DefaultSession["user"];
  }
}
