import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PeopleFind",
  description: "Find people through trusted directory information.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}