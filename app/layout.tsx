import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Immersive Editable Portfolio",
  description: "An immersive, image-free portfolio template ready for GitHub and Cloudflare.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
