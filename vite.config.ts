import { defineConfig, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { build } from "esbuild";
import { readFileSync } from "fs";
import { resolve } from "path";

//TODO There must be another way
function dedicatedWorkerPlugin(): Plugin {
  let workerContent: Buffer | null = null;

  async function buildWorker() {
    await build({
      entryPoints: ["src/db.worker.ts"],
      bundle: true,
      outfile: "dist/db.worker.js",
      format: "esm",
      platform: "browser",
      tsconfig: "./tsconfig.json",
    });
    workerContent = readFileSync(resolve("dist/db.worker.js"));
    console.log("DW Bundled");
  }

  return {
    name: "db-worker-plugin",
    async buildStart() {
      await buildWorker();
    },
    async handleHotUpdate({ file }: { file: string }) {
      if (file.includes("db.worker.ts")) {
        await buildWorker();
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/src/db.worker.ts?worker_file&type=module") {
          if (!workerContent) {
            next();
            return;
          }
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          res.end(workerContent);
          return;
        }
        // Serve sqlite proxy from /src/ since that's where the worker thinks it is
        if (req.url === "/src/sqlite3-opfs-async-proxy.js") {
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          res.end(
            readFileSync(
              resolve(
                "node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3-opfs-async-proxy.js",
              ),
            ),
          );
          return;
        }
        next();
      });
    },
  };
}

function serviceWorkerPlugin(): Plugin {
  let swContent: Buffer | null = null;

  async function buildSW() {
    await build({
      entryPoints: ["src/sw/sw.ts"],
      bundle: true,
      outfile: "public/sw.js",
      format: "esm",
      platform: "browser",
    });
    swContent = readFileSync(resolve("public/sw.js"));
    console.log("SW Bundled");
  }
  return {
    name: "service-worker-plugin",
    async buildStart() {
      await buildSW();
    },
    async handleHotUpdate({ file }: { file: string }) {
      if (file.includes("/sw/")) {
        await buildSW();
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/sw.js") {
          if (!swContent) {
            next();
            return;
          }
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          res.end(swContent);
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    dedicatedWorkerPlugin(),
    serviceWorkerPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm",
          dest: ".",
        },
        {
          src: "node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3-opfs-async-proxy.js",
          dest: ".",
        },
      ],
    }),
  ],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    fs: {
      allow: [".."], // allow serving from node_modules
    },
  },
  appType: "spa",

  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
});
