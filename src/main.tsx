import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { bootstrapLanguage, LanguageProvider } from "./i18n";

// 첫 렌더 전에 목표 언어를 정하고 googtrans 쿠키 · <html lang> · 번역 위젯(EN/JA/ZH만)을 맞춥니다.
// (예전 dev.html <head> 인라인 스크립트의 역할 — 이제 src/i18n 한 곳에서만 결정합니다.)
bootstrapLanguage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
