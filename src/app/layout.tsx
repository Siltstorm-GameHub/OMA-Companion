import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Old Masters Ally – Companion App",
  description: "Events, Turniere und Punktesystem für Old Masters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="antialiased bg-gray-950">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
