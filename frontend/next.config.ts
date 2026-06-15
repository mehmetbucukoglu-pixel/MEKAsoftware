import type { NextConfig } from "next";

const MOBILE_UA = "Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|CriOS";
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Allow mobile devices on local network to access the dev server
  allowedDevOrigins: ['192.168.1.119', '192.168.1.*', '10.0.0.*'],

  async rewrites() {
    return [
      // Proxy tüm /api/v1/* isteklerini backend'e yönlendir
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },

  async redirects() {
    return [
      // Mobil cihazlar kök sayfaya gittiğinde → /mobile/calendar
      {
        source: "/",
        has: [{ type: "header", key: "user-agent", value: `.*(${MOBILE_UA}).*` }],
        destination: "/mobile/calendar",
        permanent: false,
      },
      // Mobil cihazlar /login sonrası dashboard'a yönlenirse → /mobile/calendar
      {
        source: "/dashboard",
        has: [{ type: "header", key: "user-agent", value: `.*(${MOBILE_UA}).*` }],
        destination: "/mobile/calendar",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
