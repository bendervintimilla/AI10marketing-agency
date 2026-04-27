/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    transpilePackages: ['@agency/ui', '@agency/shared'],
    experimental: {
        // Enable server actions if needed
    },
}

module.exports = nextConfig
