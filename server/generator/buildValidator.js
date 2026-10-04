import { exec } from "child_process";
import util from "util";
import path from "path";
import { repairFile } from "../ai/repairAgent.js";

const execAsync = util.promisify(exec);

export async function validateAndRepairBuild(generatedSiteDir, maxAttempts = 2) {
    console.log(`\n📦 Installing dependencies in ${generatedSiteDir}...`);
    try {
        await execAsync("npm install", { cwd: generatedSiteDir });
    } catch (installErr) {
        console.error("❌ Failed to install dependencies:", installErr.message);
        return { success: false, output: "", error: installErr.message };
    }

    let attempt = 0;
    while (attempt <= maxAttempts) {
        console.log(`\n🔨 Running build (Attempt ${attempt + 1})...`);
        try {
            const { stdout, stderr } = await execAsync("npm run build", { cwd: generatedSiteDir });
            console.log("✅ Build succeeded!");
            return { success: true, output: stdout, error: "" };
        } catch (buildError) {
            console.error(`❌ Build failed on attempt ${attempt + 1}:`);
            const errString = buildError.stdout + "\n" + buildError.stderr;
            
            if (attempt >= maxAttempts) {
                return { success: false, output: buildError.stdout, error: errString };
            }

            // Simple heuristic to find which file failed (usually App.jsx or main.jsx in vite builds)
            let fileToFix = "src/App.jsx";
            if (errString.includes("main.jsx")) {
                fileToFix = "src/main.jsx";
            } else if (errString.includes("styles.css")) {
                fileToFix = "src/styles.css";
            }

            const filePath = path.join(generatedSiteDir, fileToFix);
            let repairApplied = false;

            try {
                repairApplied = Boolean(await repairFile(filePath, errString));
            } catch (repairError) {
                console.warn("⚠️ Build repair failed:", repairError.message);
            }

            if (!repairApplied) {
                return {
                    success: false,
                    output: buildError.stdout,
                    error: errString,
                    repairUnavailable: true
                };
            }

            attempt++;
        }
    }
}
