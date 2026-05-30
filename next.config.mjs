/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable to prevent double-fetching useEffects in dev mode hitting GDELT limits
};

export default nextConfig;
