import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monsta Motion Studio",
  description: "Transform your images into stunning short videos with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
