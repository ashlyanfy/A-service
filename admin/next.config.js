/** @type {import('next').NextConfig} */
let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";
if (!/^https?:\/\//.test(apiUrl)) {
  apiUrl = `https://${apiUrl}`;
}
apiUrl = apiUrl.replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
