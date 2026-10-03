import { spawn } from "child_process";

let previewProcess = null;
const PREVIEW_PORT = 4173;

async function waitForPreviewReady(url, timeoutMs = 15000) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        try {
            const response = await fetch(url);

            if (response.ok || response.status < 500) {
                return;
            }
        } catch {
            // Vite is still starting.
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Preview server did not become ready within ${timeoutMs / 1000}s`);
}

export async function startPreviewServer(generatedDir) {
    if (previewProcess) {
        console.log("🛑 Stopping existing preview server...");
        previewProcess.kill();
        previewProcess = null;
    }

    console.log("🚀 Starting preview server...");

    return new Promise((resolve, reject) => {
        const previewUrl = `http://localhost:${PREVIEW_PORT}`;

        previewProcess = spawn(
            "npm",
            ["run", "preview", "--", "--port", String(PREVIEW_PORT)],
            {
                cwd: generatedDir,
                shell: true
            }
        );

        let settled = false;

        const fail = (error) => {
            if (settled) return;
            settled = true;
            reject(error);
        };

        previewProcess.stdout.on("data", (data) => {
            console.log("Preview:", data.toString().trim());
        });

        previewProcess.stderr.on("data", (data) => {
            console.error("Preview Error:", data.toString().trim());
        });

        previewProcess.on("error", (error) => {
            console.error("Failed to start preview server:", error);
            fail(error);
        });

        previewProcess.on("exit", (code, signal) => {
            if (!settled) {
                fail(
                    new Error(
                        `Preview server exited before becoming ready (code=${code}, signal=${signal})`
                    )
                );
            }
        });

        waitForPreviewReady(previewUrl)
            .then(() => {
                if (settled) return;

                settled = true;
                console.log("✅ Preview server is ready:", previewUrl);
                resolve(previewUrl);
            })
            .catch(fail);
    });
}
