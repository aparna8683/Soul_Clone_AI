import { spawn } from "child_process";
import net from "net";

let previewProcess = null;

function findFreePort(start = 4173) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.listen(start, "127.0.0.1", () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
    });
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
    if (previewProcess) {
        console.log("🛑 Stopping existing preview server...");
        previewProcess.kill();
        previewProcess = null;
    }

    const port = await findFreePort();
    const previewUrl = `http://localhost:${port}`;
    console.log(`🚀 Starting preview server on port ${port}...`);

    return new Promise((resolve, reject) => {
        previewProcess = spawn("npm", ["run", "preview", "--", "--port", String(port)], {
            cwd: generatedDir,
            shell: true
        });
        let settled = false;
        const fail = (error) => { if (!settled) { settled = true; reject(error); } };
        previewProcess.stdout.on("data", (data) => console.log("Preview:", data.toString().trim()));
        previewProcess.stderr.on("data", (data) => console.error("Preview Error:", data.toString().trim()));
        previewProcess.on("error", fail);
        previewProcess.on("exit", (code, signal) => {
            if (!settled) fail(new Error(`Preview server exited before becoming ready (code=${code}, signal=${signal})`));
        });
        waitForPreviewReady(previewUrl).then(() => {
            if (settled) return;
            settled = true;
            console.log("✅ Preview server is ready:", previewUrl);
            resolve(previewUrl);
        }).catch(fail);
    });
}
