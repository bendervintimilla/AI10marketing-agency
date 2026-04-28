import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LocaleProvider } from '@/lib/i18n'

export const metadata: Metadata = {
    title: {
        default: 'AdAgency AI – Your AI Marketing Team',
        template: '%s | AdAgency AI',
    },
    description:
        'Automate your marketing with AI-powered ad generation, smart scheduling, and multi-platform publishing.',
    keywords: ['AI marketing', 'ad generation', 'social media automation', 'marketing agency'],
    openGraph: {
        type: 'website',
        siteName: 'AdAgency AI',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="font-sans antialiased">
                <ThemeProvider>
                    <LocaleProvider>
                        <AuthProvider>
                            {children}
                        </AuthProvider>
                    </LocaleProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
