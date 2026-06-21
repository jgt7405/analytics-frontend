// src/lib/fonts.ts
import { Roboto_Condensed } from "next/font/google";

export const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  variable: "--font-roboto-condensed",
  display: "optional",
  weight: ["400", "700"],
});
