import type { Metadata } from 'next'
import { Manrope, Newsreader } from 'next/font/google'
import { APP_NAME } from '@/src/lib/constants'
import { themeStylesheet } from '@/src/lib/palette'
import { getTheme } from '@/src/lib/theme-server'
import './globals.css'
import Providers from '@/components/providers/Providers'

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
})

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'A calm daily journal paired with AI for deeper reflection.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const theme = await getTheme()

  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${manrope.variable} h-full antialiased`}
      data-theme={theme}
      // ThemeSwitch updates data-theme on the client after hydration.
      suppressHydrationWarning
    >
      <head>
        {/* Palette tokens for light, dark and system themes, generated from src/lib/palette.ts. */}
        <style>{themeStylesheet()}</style>
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
