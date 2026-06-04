import type { Metadata } from "next";
import { Heebo, Space_Grotesk } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-heebo",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "ד״ר פיתה - מערכת ERP",
  description: "מערכת ניהול משאבים למפעל פיתות ד״ר פיתה",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} ${spaceGrotesk.variable} ${heebo.className} min-h-screen`}>
        <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
        {children}
      </body>
    </html>
  );
}
