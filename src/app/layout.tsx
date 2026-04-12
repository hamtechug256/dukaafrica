import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { JsonLd } from "@/components/json-ld";
import { organizationSchema, websiteSchema } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://duukaafrica.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DuukaAfrica - East Africa's Trusted Marketplace",
    template: "%s | DuukaAfrica",
  },
  description:
    "Shop millions of products from verified sellers across East Africa. Best prices on electronics, fashion, home & more. Fast delivery to Uganda, Kenya, Tanzania, Rwanda.",
  keywords: [
    "DuukaAfrica",
    "East Africa marketplace",
    "online shopping Uganda",
    "online shopping Kenya",
    "online shopping Tanzania",
    "online shopping Rwanda",
    "buy electronics online Africa",
    "fashion online East Africa",
    "Jumia alternative",
    "Jiji alternative",
    "Kilimall alternative",
    "multi-vendor marketplace Africa",
    "escrow payments Africa",
    "buyer protection Africa",
    "sell products online Uganda",
    "sell products online Kenya",
  ],
  authors: [{ name: "DuukaAfrica Team" }],
  creator: "DuukaAfrica Team",
  publisher: "DuukaAfrica",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/brand/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "DuukaAfrica - East Africa's Trusted Marketplace",
    description:
      "Shop millions of products from verified sellers across East Africa. Best prices on electronics, fashion, home & more.",
    url: SITE_URL,
    siteName: "DuukaAfrica",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DuukaAfrica - East Africa's Trusted Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DuukaAfrica - East Africa's Trusted Marketplace",
    description:
      "Shop millions of products from verified sellers across East Africa. Best prices on electronics, fashion, home & more.",
    creator: "@duukaafrica",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  category: "shopping",
  verification: {
    google: "YeEMm1IKdkA-OchmC1I-K-uW5KA3XCJiEP-1sOR7v_c",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="google-site-verification" content="YeEMm1IKdkA-OchmC1I-K-uW5KA3XCJiEP-1sOR7v_c" />
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var _U=window.URL;window.URL=function(u,b){if(u===undefined||u===null)return new _U(b||location.href);return b!==undefined?new _U(u,b):new _U(u)};window.URL.prototype=_U.prototype;window.URL.createObjectURL=_U.createObjectURL;window.URL.revokeObjectURL=_U.revokeObjectURL})();`,
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        >
          {/* Global JSON-LD: Organization + WebSite with SearchAction */}
          <JsonLd data={organizationSchema} />
          <JsonLd data={websiteSchema} />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
          >
            Skip to main content
          </a>
          {children}
          <Toaster />
          <SpeedInsights />
        </body>
      </html>
    </Providers>
  );
}
