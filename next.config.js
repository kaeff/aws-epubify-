/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? `${process.env.BACKEND_URL}/api/:path*`
          : 'http://localhost:8000/:path*',
      },
    ];
  },
};

module.exports = nextConfig;