import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Самодостаточный сервер для Docker-образа (Dockerfile)
  output: 'standalone',
  typedRoutes: true,
  reactStrictMode: false,
  /*
    Одна копия на процесс: иначе proxy и actions бандлят пакет каждый себе, limiter-ы из общего
    globalThis бросают RateLimiterRes «чужого» класса, и instanceof в обёртках не срабатывает
  */
  serverExternalPackages: ['rate-limiter-flexible'],
  experimental: {
    authInterrupts: true,
    // Свой 404 для адресов вне маршрутов: root layout'ов два, общего not-found нет (спека 52)
    globalNotFound: true,
    // Картинки грузятся по одной, до 5 МБ — с запасом на обёртку запроса
    serverActions: { bodySizeLimit: '6mb' },
    optimizePackageImports: ['@mantine/core', '@mantine/hooks']
  }
};

export default nextConfig;
