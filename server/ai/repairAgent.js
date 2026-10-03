import { runAI } from "./groq.js";
import fs from "fs/promises";
import path from "path";

export async function repairFile(filePath, buildError, maxRetries = 2) {
    let currentCode = await fs.readFile(filePath, "utf-8");
    let retries = 0;

    while (retries < maxRetries) {
        console.log(`\n🔧 Attempting repair ${retries + 1} of ${maxRetries} for ${path.basename(filePath)}...`);
        
        const prompt = `
You are an expert React developer. The following file failed to build.
Fix the code so it builds successfully.

File: ${path.basename(filePath)}

Build Error:
${buildError}

Current Code:
\`\`\`
${currentCode}
\`\`\`

Return ONLY the fixed code without markdown backticks.
Do not provide any explanations.
`;

        const fixedCodeRaw = await runAI(prompt);
        // Strip markdown backticks if AI ignores instruction
        currentCode = fixedCodeRaw.replace(/^```[a-z]*\n/i, "").replace(/```$/i, "").trim();
        
        await fs.writeFile(filePath, currentCode, "utf-8");
        return currentCode; // Return the code to be tested by the builder
    }
}
