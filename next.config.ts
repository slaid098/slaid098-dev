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
      {
        source: "/take_break",
        destination: "/take-break",
        permanent: true,
      },
      {
        source: "/catifyme",
        destination: "/okoti-menya",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
