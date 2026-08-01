import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Editable Portfolio Template",
  description: "A responsive, image-free portfolio template ready for GitHub and Cloudflare.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
