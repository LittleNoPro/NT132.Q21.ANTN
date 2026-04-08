const serverApiUrl = process.env.NEXT_SERVER_API_URL || 'http://127.0.0.1:5000/api';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${serverApiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
