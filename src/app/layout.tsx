import "@/styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Nachschub App",
  description: "Event Nachschub Verwaltung",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de-CH" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
