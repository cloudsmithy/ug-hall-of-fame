/**
 * 应用启动
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// 字体自托管，不依赖 Google Fonts（国内访问更稳，也避免 FOIT）
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

import "./styles/tokens.css";
import "./styles/global.css";
import App from "./App";
import { site } from "./content";

// 标题来自 YAML，改内容不用动 index.html
document.title = site.title;

const root = document.getElementById("root");
if (!root) throw new Error("找不到 #root 挂载点");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
