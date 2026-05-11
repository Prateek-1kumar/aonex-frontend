/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Backend lives in a SEPARATE repo at ~/aonex-backend, deployed
  // independently to EC2. The browser hits NEXT_PUBLIC_API_URL.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787"
  }
};
export default nextConfig;
