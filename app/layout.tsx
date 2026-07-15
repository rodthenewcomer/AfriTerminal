import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { GOOGLE_SITE_VERIFICATION, SITE_ORIGIN } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base absolue des URLs OG/Twitter — les images de partage générées
  // par la convention opengraph-image.tsx la consomment.
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "WARIBA — La BRVM, clairement",
    template: "%s · WARIBA",
  },
  description:
    "Le terminal premium de la BRVM : cours officiels, graphiques, portefeuille, dividendes, documents et alertes pour les investisseurs d'Afrique de l'Ouest.",
  applicationName: "WARIBA",
  openGraph: {
    siteName: "WARIBA",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  ...(GOOGLE_SITE_VERIFICATION
    ? { verification: { google: GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#06110d" },
    { media: "(prefers-color-scheme: light)", color: "#f3f7f5" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <AnalyticsProvider>
              <AppShell>{children}</AppShell>
            </AnalyticsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
