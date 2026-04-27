import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'AdAgency AI – Your AI Marketing Team',
    description:
        'Automate your marketing with AI-powered ad generation, smart scheduling, and multi-platform publishing. Start free today.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
