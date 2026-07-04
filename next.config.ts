import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./src/apps/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/hobo",
        destination: "/bomzh",
        permanent: true,
      },
      {
        source: "/hobo/:path*",
        destination: "/bomzh/:path*",
        permanent: true,
      },
      {
        source: "/youtube",
        destination: "/yt-video-downloader",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
