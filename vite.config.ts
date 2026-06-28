import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/art-map/",
  server: { host: true, port: 3100, strictPort: true, allowedHosts: true, hmr: false, fs: { strict: false, allow: ["/opt/kavela/web-template", "."] } },
  optimizeDeps: { include: ["react", "react-dom", "react-dom/client", "react-router", "framer-motion", "lucide-react", "react-icons", "clsx", "date-fns", "zod", "@supabase/supabase-js"] },
  plugins: [
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
    tsconfigPaths: true,
  },
  build: {
    // Generate a proper fallback for SPA routing
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
      },
    },
  },
});
