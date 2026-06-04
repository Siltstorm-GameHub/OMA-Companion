import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Old Masters Ally – Companion App",
  description: "Events, Turniere und Punktesystem für Old Masters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="antialiased bg-gray-950">
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "rgba(15,15,23,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#ededf0",
              backdropFilter: "blur(16px)",
              borderRadius: "12px",
              fontSize: "13px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            },
          }}
        />
      </body>
    </html>
  );
}
