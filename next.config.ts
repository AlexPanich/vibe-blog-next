import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typedRoutes: true,
  reactStrictMode: false,
  /*
    Одна копия на процесс: иначе proxy и actions бандлят пакет каждый себе, limiter-ы из общего
    globalThis бросают RateLimiterRes «чужого» класса, и instanceof в обёртках не срабатывает
  */
  serverExternalPackages: ['rate-limiter-flexible'],
  experimental: {
    authInterrupts: true,
    // Картинки грузятся по одной, до 5 МБ — с запасом на обёртку запроса
    serverActions: { bodySizeLimit: '6mb' },
    optimizePackageImports: ['@mantine/core', '@mantine/hooks']
  }
};

export default nextConfig;
