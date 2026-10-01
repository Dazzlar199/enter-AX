import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // 프로덕션 최적화 설정
  compress: true,
  poweredByHeader: false,

  // 번들러가 __dirname 기반 바이너리/모델 경로를 잘못 재작성하지 않도록
  // 서버 전용 패키지는 번들링하지 않고 그대로 require 하게 함
  serverExternalPackages: ['ffmpeg-static', '@huggingface/transformers', 'pdf-parse', 'pdfjs-dist'],

  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1년
  },

  // 번들 분할 최적화
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },

  // 빌드 최적화는 Next.js 15에서 기본으로 활성화됨

  // 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
};

export default bundleAnalyzer(nextConfig);
