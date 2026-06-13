import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

// Single typeface across the whole system — Heebo covers Hebrew + Latin + numerals.
// (Space Grotesk was removed: it is Latin-only and caused Hebrew/number font
//  mismatches; unifying on Heebo gives one consistent display treatment.)
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-heebo",
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
      <body className={`${heebo.variable} ${heebo.className} min-h-screen`}>
        <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
        {children}
      </body>
    </html>
  );
}
