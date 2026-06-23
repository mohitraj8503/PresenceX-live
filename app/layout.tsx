import type { Metadata } from "next";
import { Poppins, Instrument_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PresenceX - AI Attendance Management Platform",
  description: "PresenceX is an AI-powered smart attendance management platform that automatically records attendance based on physical presence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${instrumentSans.variable}`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(o,c){
                var n=c.documentElement,t=" w-mod-";
                n.className+=t+"js";
                if("ontouchstart"in o||o.DocumentTouch&&c instanceof DocumentTouch){
                  n.className+=t+"touch";
                }
              }(window,document);
            `,
          }}
        />
      </head>
      <body>
        {children}
        {/* Load jQuery globally since all theme pages and components need it */}
        <Script src="/js/jquery.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
