import Link from 'next/link'

/* ─── Icons ─── */
function IconUpload() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
    )
}
function IconSparkles() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
    )
}
function IconGlobe() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5" />
        </svg>
    )
}
function IconChart() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    )
}
function IconVideo() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
    )
}
function IconCalendar() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
    )
}
function IconBrain() {
    return (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
        </svg>
    )
}
function IconCheck() {
    return (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    )
}

/* ─── Navbar ─── */
function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 lg:px-12">
            <div className="absolute inset-0 bg-[var(--color-bg)]/70 backdrop-blur-xl border-b border-white/5" />
            <div className="relative flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                </div>
                <span className="text-lg font-bold text-white">AdAgency AI</span>
            </div>
            <div className="relative hidden md:flex items-center gap-8 text-sm text-slate-400">
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
                <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            </div>
            <div className="relative flex items-center gap-3">
                <Link
                    href="/login"
                    className="hidden md:block text-sm text-slate-400 hover:text-white transition-colors"
                >
                    Sign in
                </Link>
                <Link
                    href="/register"
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-lg shadow-violet-500/25"
                >
                    Start Free
                </Link>
            </div>
        </nav>
    )
}

/* ─── Hero ─── */
function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0f0a1e] pt-20">
            {/* Background blobs */}
            <div className="absolute -top-64 -left-32 h-[600px] w-[600px] rounded-full bg-violet-700/20 blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-32 right-0 h-[500px] w-[500px] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-fuchsia-800/10 blur-[100px] pointer-events-none" />

            {/* Grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            />

            <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-8">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                    Powered by Gemini AI
                </div>

                {/* Headline */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.05] mb-6">
                    Your{' '}
                    <span className="text-gradient">AI Marketing</span>
                    <br />
                    Team
                </h1>

                {/* Subheadline */}
                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Generate stunning ads, schedule across every platform, and let AI optimize your campaigns
                    24/7 — while you focus on what matters most.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/register"
                        className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-base transition-all duration-200 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105"
                    >
                        Start Free — No Credit Card
                        <svg className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </Link>
                    <a
                        href="#how-it-works"
                        className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition-all duration-200 border border-white/10 hover:border-white/20"
                    >
                        See how it works
                    </a>
                </div>

                {/* Social proof */}
                <p className="mt-10 text-sm text-slate-500">
                    Trusted by <span className="text-violet-400 font-semibold">500+</span> marketing teams worldwide
                </p>

                {/* Floating dashboard preview */}
                <div className="mt-16 relative mx-auto max-w-4xl">
                    <div className="rounded-2xl bg-gradient-to-b from-[#1e1535] to-[#0f0a1e] border border-white/10 shadow-2xl shadow-violet-500/10 overflow-hidden p-4">
                        {/* Fake browser bar */}
                        <div className="flex items-center gap-2 mb-3 px-2">
                            <div className="h-3 w-3 rounded-full bg-red-500/50" />
                            <div className="h-3 w-3 rounded-full bg-amber-500/50" />
                            <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
                            <div className="flex-1 mx-4 h-5 bg-white/5 rounded border border-white/5 text-[10px] text-slate-600 flex items-center px-2">
                                app.adagency.ai/dashboard
                            </div>
                        </div>
                        {/* Dashboard preview grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {[
                                { label: 'Active Campaigns', value: '12', delta: '+3' },
                                { label: 'Ads Published', value: '284', delta: '+47' },
                                { label: 'Total Reach', value: '1.2M', delta: '+18%' },
                                { label: 'AI Insights', value: '7', delta: 'New' },
                            ].map((s) => (
                                <div key={s.label} className="rounded-lg bg-white/5 border border-white/5 p-3">
                                    <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">{s.label}</div>
                                    <div className="text-xl font-bold text-white">{s.value}</div>
                                    <div className="text-[10px] text-emerald-400 mt-0.5">{s.delta}</div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {['Campaign Alpha', 'Summer Sale', 'Brand Awareness'].map((c, i) => (
                                <div key={c} className="rounded-lg bg-white/5 border border-white/5 p-3 flex items-center gap-2">
                                    <div className={[
                                        'h-2 w-2 rounded-full shrink-0',
                                        i === 0 ? 'bg-emerald-400' : i === 1 ? 'bg-violet-400' : 'bg-amber-400',
                                    ].join(' ')} />
                                    <span className="text-xs text-slate-400 truncate">{c}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Glow underneath */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-16 w-3/4 bg-violet-600/20 blur-2xl" />
                </div>
            </div>
        </section>
    )
}

/* ─── How It Works ─── */
const HOW_STEPS = [
    {
        step: '01',
        icon: <IconUpload />,
        title: 'Upload Brand Assets',
        desc: 'Import your logo, colors, fonts, and product images. Our AI learns your brand voice instantly.',
    },
    {
        step: '02',
        icon: <IconSparkles />,
        title: 'Generate Ads',
        desc: 'AI creates scroll-stopping videos, carousels, and captions tailored to each platform.',
    },
    {
        step: '03',
        icon: <IconGlobe />,
        title: 'Publish Everywhere',
        desc: 'Simultaneously push to Instagram, TikTok, Facebook, Twitter, and LinkedIn with one click.',
    },
    {
        step: '04',
        icon: <IconChart />,
        title: 'Optimize Automatically',
        desc: 'AI analyzes performance, pauses underperformers, and doubles down on what converts.',
    },
]

function HowItWorks() {
    return (
        <section id="how-it-works" className="bg-[#0f0a1e] py-24 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-3">How It Works</p>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                        From idea to live ad in{' '}
                        <span className="text-gradient">minutes</span>
                    </h2>
                    <p className="text-slate-400 max-w-xl mx-auto">
                        Our streamlined workflow removes all the friction between your idea and a live, optimized campaign.
                    </p>
                </div>

                <div className="relative">
                    {/* Connecting line */}
                    <div className="hidden lg:block absolute top-12 left-[calc(12.5%+2rem)] right-[calc(12.5%+2rem)] h-0.5 bg-gradient-to-r from-violet-500/0 via-violet-500/40 to-violet-500/0" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {HOW_STEPS.map((s, i) => (
                            <div key={s.step} className="relative flex flex-col items-center text-center group">
                                <div className="relative z-10 mb-5 flex items-center justify-center h-16 w-16 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-400 group-hover:bg-violet-600/25 group-hover:border-violet-500/50 group-hover:scale-110 transition-all duration-200">
                                    {s.icon}
                                    <span className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ─── Features ─── */
const FEATURES = [
    {
        icon: <IconVideo />,
        title: 'AI Video Generation',
        desc: 'Create professional video ads from a single product image. Our AI handles scripting, animation, and voiceover.',
        color: 'from-violet-500/10 to-purple-500/10 border-violet-500/20',
        iconColor: 'text-violet-400 bg-violet-500/10',
    },
    {
        icon: <IconCalendar />,
        title: 'Smart Scheduling',
        desc: "AI analyzes your audience's activity patterns and schedules posts at peak engagement times automatically.",
        color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
        iconColor: 'text-blue-400 bg-blue-500/10',
    },
    {
        icon: <IconGlobe />,
        title: 'Multi-Platform',
        desc: 'One dashboard for Instagram, TikTok, Facebook, Twitter, and LinkedIn. Adapt content for each platform automatically.',
        color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
        iconColor: 'text-emerald-400 bg-emerald-500/10',
    },
    {
        icon: <IconChart />,
        title: 'Real-Time Analytics',
        desc: 'Track reach, engagement, ROAS, and more across all platforms in a unified dashboard with AI-powered insights.',
        color: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
        iconColor: 'text-amber-400 bg-amber-500/10',
    },
    {
        icon: <IconBrain />,
        title: 'AI Brain',
        desc: 'Your always-on marketing strategist that recommends optimizations, identifies opportunities, and executes on auto-pilot.',
        color: 'from-fuchsia-500/10 to-pink-500/10 border-fuchsia-500/20',
        iconColor: 'text-fuchsia-400 bg-fuchsia-500/10',
    },
    {
        icon: <IconSparkles />,
        title: 'Copy Generation',
        desc: 'GPT-powered captions, headlines, and hashtag research tailored to your brand voice and trending topics.',
        color: 'from-rose-500/10 to-red-500/10 border-rose-500/20',
        iconColor: 'text-rose-400 bg-rose-500/10',
    },
]

function Features() {
    return (
        <section id="features" className="bg-[#0d0820] py-24 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-3">Features</p>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                        Everything your agency needs,{' '}
                        <span className="text-gradient">nothing it doesn't</span>
                    </h2>
                    <p className="text-slate-400 max-w-xl mx-auto">
                        A complete AI-powered marketing stack, from content creation to performance optimization.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((f) => (
                        <div
                            key={f.title}
                            className={[
                                'group rounded-2xl border bg-gradient-to-br p-6',
                                'hover:scale-[1.02] transition-all duration-200 hover:shadow-xl',
                                f.color,
                            ].join(' ')}
                        >
                            <div className={['inline-flex rounded-xl p-2.5 mb-4', f.iconColor].join(' ')}>
                                {f.icon}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

/* ─── Pricing ─── */
const PLANS = [
    {
        name: 'FREE',
        price: '$0',
        period: 'forever',
        description: 'Perfect for solo creators getting started.',
        highlight: false,
        features: [
            '3 active campaigns',
            '10 AI-generated ads/month',
            '1 social account per platform',
            'Basic analytics',
            'Community support',
        ],
        cta: 'Get Started Free',
        href: '/register',
    },
    {
        name: 'PRO',
        price: '$49',
        period: '/month',
        description: 'For growing brands that need more power.',
        highlight: true,
        badge: 'Most Popular',
        features: [
            'Unlimited campaigns',
            '200 AI-generated ads/month',
            '5 social accounts per platform',
            'Advanced analytics & ROAS',
            'Auto-pilot mode',
            'Priority support',
            'Custom brand kit',
        ],
        cta: 'Start Pro Trial',
        href: '/register?plan=pro',
    },
    {
        name: 'ENTERPRISE',
        price: 'Custom',
        period: '',
        description: 'For agencies managing multiple brands.',
        highlight: false,
        features: [
            'Everything in Pro',
            'Unlimited ad generation',
            'Unlimited social accounts',
            'White-label dashboard',
            'Team collaboration tools',
            'Dedicated account manager',
            'SLA & custom integrations',
        ],
        cta: 'Contact Sales',
        href: '/contact',
    },
]

function Pricing() {
    return (
        <section id="pricing" className="bg-[#0f0a1e] py-24 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-3">Pricing</p>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                        Simple, transparent{' '}
                        <span className="text-gradient">pricing</span>
                    </h2>
                    <p className="text-slate-400 max-w-xl mx-auto">
                        Start free and scale as you grow. No hidden fees, no surprises.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.name}
                            className={[
                                'relative rounded-2xl p-8 flex flex-col border',
                                plan.highlight
                                    ? 'bg-gradient-to-b from-violet-600/20 to-violet-900/10 border-violet-500/50 shadow-2xl shadow-violet-500/20 scale-105'
                                    : 'bg-[var(--color-surface)] border-[var(--color-border)]',
                            ].join(' ')}
                        >
                            {plan.badge && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-violet-600 text-white text-xs font-bold uppercase tracking-wider">
                                    {plan.badge}
                                </div>
                            )}

                            <div className="mb-6">
                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
                                    {plan.name}
                                </p>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-4xl font-black text-white">{plan.price}</span>
                                    {plan.period && (
                                        <span className="text-slate-400 text-sm">{plan.period}</span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400">{plan.description}</p>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feat) => (
                                    <li key={feat} className="flex items-center gap-2.5 text-sm text-slate-300">
                                        <span className={plan.highlight ? 'text-violet-400' : 'text-emerald-400'}>
                                            <IconCheck />
                                        </span>
                                        {feat}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={plan.href}
                                className={[
                                    'block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200',
                                    plan.highlight
                                        ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40'
                                        : 'bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)]',
                                ].join(' ')}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

/* ─── Testimonials ─── */
const TESTIMONIALS = [
    {
        name: 'Sarah Chen',
        role: 'CMO at NovaBrands',
        content:
            'AdAgency AI cut our content production time by 80%. We went from 5 posts a week to 30, and our engagement doubled.',
        avatar: 'SC',
        color: 'from-violet-500 to-purple-600',
    },
    {
        name: 'Marcus Rivera',
        role: 'Founder, PixelPulse Agency',
        content:
            'The ROI tracking alone is worth the subscription. We can immediately see what\'s working and scale it. Incredible.',
        avatar: 'MR',
        color: 'from-blue-500 to-cyan-600',
    },
    {
        name: 'Aisha Okonkwo',
        role: 'Head of Growth, FreshDrop',
        content:
            'We launched a full campaign across 4 platforms in under an hour. Auto-pilot mode is a game-changer.',
        avatar: 'AO',
        color: 'from-emerald-500 to-teal-600',
    },
]

function Testimonials() {
    return (
        <section className="bg-[#0d0820] py-24 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <p className="text-sm font-semibold text-violet-400 uppercase tracking-widest mb-3">Testimonials</p>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                        Loved by <span className="text-gradient">marketing teams</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {TESTIMONIALS.map((t) => (
                        <div
                            key={t.name}
                            className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 flex flex-col gap-4 hover:border-violet-500/30 transition-colors"
                        >
                            {/* Stars */}
                            <div className="flex gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <svg key={i} className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed flex-1">"{t.content}"</p>
                            <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-border)]">
                                <div className={['h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shrink-0', t.color].join(' ')}>
                                    {t.avatar}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{t.name}</p>
                                    <p className="text-xs text-slate-400">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

/* ─── CTA Banner ─── */
function CTABanner() {
    return (
        <section className="bg-[#0f0a1e] py-24 px-6">
            <div className="max-w-3xl mx-auto text-center">
                <div className="relative rounded-3xl overflow-hidden p-12 md:p-16">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 to-purple-900/40 border border-violet-500/20" />
                    <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-violet-600/20 blur-3xl" />
                    <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-purple-700/20 blur-3xl" />
                    <div className="relative">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                            Ready to transform your marketing?
                        </h2>
                        <p className="text-slate-400 mb-8 text-lg">
                            Join 500+ teams already using AdAgency AI to grow faster.
                        </p>
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-lg transition-all duration-200 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105"
                        >
                            Start Free Today
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ─── Footer ─── */
function Footer() {
    const col = (title: string, links: { label: string; href: string }[]) => (
        <div>
            <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
            <ul className="space-y-2.5">
                {links.map((l) => (
                    <li key={l.label}>
                        <Link href={l.href} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                            {l.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )

    return (
        <footer className="bg-[#080514] border-t border-white/5 py-16 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                </svg>
                            </div>
                            <span className="text-lg font-bold text-white">AdAgency AI</span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                            The complete AI marketing platform for agencies and brands that want to grow faster.
                        </p>
                    </div>

                    {col('Product', [
                        { label: 'Features', href: '#features' },
                        { label: 'Pricing', href: '#pricing' },
                        { label: 'Changelog', href: '/changelog' },
                        { label: 'Roadmap', href: '/roadmap' },
                    ])}
                    {col('Company', [
                        { label: 'About', href: '/about' },
                        { label: 'Blog', href: '/blog' },
                        { label: 'Careers', href: '/careers' },
                        { label: 'Press', href: '/press' },
                    ])}
                    {col('Legal', [
                        { label: 'Privacy Policy', href: '/privacy' },
                        { label: 'Terms of Service', href: '/terms' },
                        { label: 'Cookie Policy', href: '/cookies' },
                        { label: 'GDPR', href: '/gdpr' },
                    ])}
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-600">
                        © {new Date().getFullYear()} AdAgency AI. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        {['Twitter', 'LinkedIn', 'GitHub'].map((s) => (
                            <a key={s} href="#" className="text-sm text-slate-600 hover:text-slate-400 transition-colors">
                                {s}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}

/* ─── Page ─── */
export default function LandingPage() {
    return (
        <main className="min-h-screen bg-[#0f0a1e]">
            <Navbar />
            <Hero />
            <HowItWorks />
            <Features />
            <Pricing />
            <Testimonials />
            <CTABanner />
            <Footer />
        </main>
    )
}
