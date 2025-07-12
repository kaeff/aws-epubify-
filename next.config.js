/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/:path*`
          : 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;