import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import AnnouncementPopup from "./components/AnnouncementPopup";

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
      <body>
        <Navbar />
        <AnnouncementPopup />
        {children}
      </body>
    </html>
  );
}