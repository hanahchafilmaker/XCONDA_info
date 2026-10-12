import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 개발 서버에서 글 주소(/post/{slug}/ · /notice/… · /qna/… · /guide/…)를 개발 진입점으로 넘깁니다.
 * (운영에서는 scripts/build-seo.mjs 가 만든 글별 index.html 이 같은 역할을 합니다)
 */
const articleRoutesInDev = {
  name: "xconda-article-routes-dev",
  configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? "";
      if (/^\/(?:post|notice|qna|guide)\/[^/?#]+\/?(?:\?.*)?$/.test(url)) {
        const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";
        req.url = `/dev.html${query}`;
      }
      next();
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), articleRoutesInDev],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // 루트 index.html 은 GitHub Pages 로 배포되는 "빌드 결과물"이므로
  // 개발/빌드 진입점은 dev.html 을 사용합니다. (npm run build 가 index.html 을 갱신)
  server: {
    open: "/dev.html",
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "dev.html"),
    },
  },
});
