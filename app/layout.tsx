import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Craveping — Rate Your Experience",
  description: "Quick, zero-friction café feedback powered by Craveping.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#1565C0" }}>
        {children}
      </body>
    </html>
  );
}