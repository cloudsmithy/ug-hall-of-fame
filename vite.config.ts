import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import yaml from "@modyfi/vite-plugin-yaml";

export default defineConfig({
  plugins: [react(), yaml()],
  build: {
    outDir: "dist",
    // Leaflet 在 CommunityMap.tsx 里是动态 import，
    // 打包器会自动拆成独立 chunk，首屏不加载。
  },
});
