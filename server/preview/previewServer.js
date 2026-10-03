import { spawn, execFile } from "child_process";

let previewProcess = null;
let previewUrl = null;

function stopPreviewServer() {
    return new Promise((resolve) => {
        if (!previewProcess) return resolve();

        const pid = previewProcess.pid;
        console.log(`🛑 Stopping preview process tree (PID ${pid})...`);

        if (process.platform === "win32") {
            execFile("taskkill", ["/pid", String(pid), "/T", "/F"], () => resolve());
        } else {
            previewProcess.kill("SIGTERM");
            resolve();
        }

        previewProcess = null;
        previewUrl = null;
    });
}

function extractPreviewUrl(output) {
    const match = output.match(/Local:\s+https?:\/\/localhost:(\d+)\/?/i);
    if (!match) return null;
    return `http://localhost:${match[1]}`;
}

async function waitForPreviewReady(url, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok || response.status < 500) return;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Preview server did not become ready within ${timeoutMs / 1000}s`);
}

export async function startPreviewServer(generatedDir) {
    await stopPreviewServer();
    console.log("🚀 Starting preview server...");

    return new Promise((resolve, reject) => {
        previewProcess = spawn("npm", ["run", "preview", "--", "--port", "4173"], {
            cwd: generatedDir,
            shell: true
        });

        let settled = false;
        let outputBuffer = "";

        const fail = (error) => {
            if (settled) return;
            settled = true;
            reject(error);
        };

        const handleOutput = (data) => {
            const output = data.toString();
            outputBuffer += output;
            console.log("Preview:", output.trim());

            const detectedUrl = extractPreviewUrl(outputBuffer);
            if (detectedUrl && !settled) {
                previewUrl = detectedUrl;
                waitForPreviewReady(previewUrl)
                    .then(() => {
                        if (settled) return;
                        settled = true;
                        console.log("✅ Preview server is ready:", previewUrl);
                        resolve(previewUrl);
                    })
                    .catch(fail);
            }
        };

        previewProcess.stdout.on("data", handleOutput);
        previewProcess.stderr.on("data", (data) => console.error("Preview Error:", data.toString().trim()));
        previewProcess.on("error", fail);
        previewProcess.on("exit", (code, signal) => {
            if (!settled) fail(new Error(`Preview server exited before becoming ready (code=${code}, signal=${signal})`));
        });
    });
}
