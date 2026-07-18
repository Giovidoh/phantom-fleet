import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // snarkjs/circomlibjs expect a few node globals (Buffer, process, crypto streams)
    nodePolyfills({ globals: { Buffer: true, process: true }, protocolImports: true }),
  ],
  worker: { format: "es" },
  optimizeDeps: { include: ["snarkjs", "circomlibjs"] },
});
