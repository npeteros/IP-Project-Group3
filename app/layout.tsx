import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { APP_NAME } from "@/lib/constants";
import { paletteCssVariables } from "@/lib/palette";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A calm daily journal paired with AI for deeper reflection.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${manrope.variable} h-full antialiased`}
      style={paletteCssVariables()}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
