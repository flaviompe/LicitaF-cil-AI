/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // Security Headers - CORRIGIDO
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com;"
          }
        ]
      }
    ]
  },

  // REMOVIDO - Variáveis sensíveis não devem ser expostas ao cliente
  // env: {
  //   NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  //   DATABASE_URL: process.env.DATABASE_URL,
  //   OPENAI_API_KEY: process.env.OPENAI_API_KEY
  // },

  images: {
    domains: ['localhost', 'your-domain.com'],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Disable powered by header for security
  poweredByHeader: false,
  
  // Enable compression for better performance
  compress: true,
  
  // Bundle optimization (swcMinify is deprecated in Next.js 15)
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  }
}

module.exports = nextConfig