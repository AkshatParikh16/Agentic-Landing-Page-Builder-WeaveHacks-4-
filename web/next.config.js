/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['weave'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@openai/agents': path.resolve(__dirname, 'lib/stubs/openai-agents.ts'),
    };
    return config;
  },
};

module.exports = nextConfig;
