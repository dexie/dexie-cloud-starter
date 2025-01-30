import type { Metadata } from 'next'
import './globals.css'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../theme'
import { Caveat } from 'next/font/google'
import { IBM_Plex_Sans } from 'next/font/google'
import { IBM_Plex_Mono } from 'next/font/google'
import LicenseAdvertise from './components/LicenseAdvertise'
import { Suspense } from 'react'

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['300', '700'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
})
const ibmPlexMono = IBM_Plex_Mono({
  weight: ['300', '700'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
})

const caveat = Caveat({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-caveat',
})

export const metadata: Metadata = {
  title: 'Dexie Starter',
  description:
    'Dexie Cloud Starter is a Next.js starter with Dexie Cloud for you to kickstart your project.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${caveat.variable}`}
      >
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            {children}
            <Suspense fallback={<></>}>
              <LicenseAdvertise />
            </Suspense>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
