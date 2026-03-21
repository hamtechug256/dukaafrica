import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/query-provider";
import { CartSidebar } from "@/components/cart/cart-sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DuukaAfrica - East Africa's Trusted Marketplace",
  description: "Shop millions of products from verified sellers across East Africa. Best prices on electronics, fashion, home & more. Fast delivery to Uganda, Kenya, Tanzania, Rwanda.",
  keywords: ["DuukaAfrica", "East Africa", "Marketplace", "Online Shopping", "Uganda", "Kenya", "Tanzania", "Rwanda", "Electronics", "Fashion", "Jumia alternative", "Jiji alternative"],
  authors: [{ name: "DuukaAfrica Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "DuukaAfrica - East Africa's Trusted Marketplace",
    description: "Shop millions of products from verified sellers across East Africa",
    url: "https://duukaafrica.com",
    siteName: "DuukaAfrica",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DuukaAfrica - East Africa's Trusted Marketplace",
    description: "Shop millions of products from verified sellers across East Africa",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              {children}
              <CartSidebar />
              <Toaster />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
