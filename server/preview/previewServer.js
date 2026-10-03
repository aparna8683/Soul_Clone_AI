import { spawn, execFile } from "child_process";

let previewProcess = null;
let previewUrl = null;

function stopPreviewServer() {
    return new Promise((resolve) => {
        if (!previewProcess) {
            previewUrl = null;
            resolve();
            return;
        }

        const pid = previewProcess.pid;
        console.log(`🛑 Stopping preview process tree (PID ${pid})...`);

        if (process.platform === "win32") {
            execFile("taskkill", ["/pid", String(pid), "/T", "/F"], () => {
                previewProcess = null;
                previewUrl = null;
                resolve();
            });
        } else {
            previewProcess.kill("SIGTERM");

            previewProcess = null;
            previewUrl = null;

            resolve();
        }
    });
}

function extractPreviewUrl(output) {
    const cleanOutput = output.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
    const match = cleanOutput.match(/Local:\s+(https?:\/\/localhost:\d+\/?)/i);

    return match ? match[1] : null;
}

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

    throw new Error(
        `Preview server did not become ready within ${timeoutMs / 1000}s`
    );
}

function createPreviewProcess(generatedDir) {
    if (process.platform === "win32") {
        // Use cmd.exe explicitly on Windows. This avoids npm.cmd + shell=true
        // spawn issues such as EINVAL and gives us a process tree that
        // taskkill /T can reliably clean up.
        return spawn(
            process.env.ComSpec || "cmd.exe",
            ["/d", "/s", "/c", "npm run preview -- --port 4173"],
            {
                cwd: generatedDir,
                shell: false,
                windowsHide: true
            }
        );
    }

    return spawn(
        "npm",
        ["run", "preview", "--", "--port", "4173"],
        {
            cwd: generatedDir,
            shell: false
        }
    );
}

export async function startPreviewServer(generatedDir) {
    await stopPreviewServer();

    console.log("🚀 Starting preview server...");

    return new Promise((resolve, reject) => {
        try {
            previewProcess = createPreviewProcess(generatedDir);
        } catch (error) {
            previewProcess = null;
            reject(error);
            return;
        }

        let settled = false;
        let outputBuffer = "";

        const fail = (error) => {
            if (settled) return;

            settled = true;
            previewProcess = null;
            previewUrl = null;

            reject(error);
        };

        const handleOutput = (data) => {
            const output = data.toString();

            outputBuffer += output;

            console.log("Preview:", output.trim());

            const detectedUrl = extractPreviewUrl(outputBuffer);

            if (!detectedUrl || settled) {
                return;
            }

            previewUrl = detectedUrl;

            waitForPreviewReady(previewUrl)
                .then(() => {
                    if (settled) return;

                    settled = true;

                    console.log(
                        "✅ Preview server is ready:",
                        previewUrl
                    );

                    resolve(previewUrl);
                })
                .catch(fail);
        };

        previewProcess.stdout.on("data", handleOutput);

        previewProcess.stderr.on("data", (data) => {
            const output = data.toString().trim();

            if (output) {
                console.error("Preview Error:", output);
            }

            // Vite can write normal startup information to stderr.
            // Do not fail here; readiness is determined by the Local URL
            // and an HTTP request to that URL.
        });

        previewProcess.on("error", fail);

        previewProcess.on("exit", (code, signal) => {
            if (!settled) {
                fail(
                    new Error(
                        `Preview server exited before becoming ready (code=${code}, signal=${signal})`
                    )
                );
            }
        });
    });
}
