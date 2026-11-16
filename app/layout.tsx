import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "For Kesh — my favorite universe", description: "A little corner of the internet, made just for Kesh." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
