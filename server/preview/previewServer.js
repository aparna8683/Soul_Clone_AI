import { spawn } from "child_process";
import path from "path";

let previewProcess = null;
const PREVIEW_PORT = 4173;

export async function startPreviewServer(generatedDir) {
    if (previewProcess) {
        console.log("🛑 Stopping existing preview server...");
        previewProcess.kill();
        previewProcess = null;
    }

    console.log("🚀 Starting preview server...");
    
    return new Promise((resolve, reject) => {
        previewProcess = spawn("npm", ["run", "preview", "--", "--port", PREVIEW_PORT], {
            cwd: generatedDir,
            shell: true
        });

        previewProcess.stdout.on("data", (data) => {
            const output = data.toString();
            if (output.includes("Local:") || output.includes(PREVIEW_PORT.toString())) {
                resolve(`http://localhost:${PREVIEW_PORT}`);
            }
        });

        previewProcess.stderr.on("data", (data) => {
            console.error("Preview Error:", data.toString());
        });

        previewProcess.on("error", (err) => {
            console.error("Failed to start preview server:", err);
            reject(err);
        });
        
        // Resolve anyway after 3 seconds in case we miss the output
        setTimeout(() => {
            resolve(`http://localhost:${PREVIEW_PORT}`);
        }, 3000);
    });
}
