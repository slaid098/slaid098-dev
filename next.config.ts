import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./src/apps/**/*"],
  },
  async redirects() {
    return [
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
        destination: "/okotis",
        permanent: true,
      },
      {
        source: "/okoti-menya",
        destination: "/okotis",
        permanent: true,
      },
      {
        source: "/okoti-menya/:path*",
        destination: "/okotis/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
