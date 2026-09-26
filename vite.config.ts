import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
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
