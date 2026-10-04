import { runAI } from "./groq.js";
import fs from "fs/promises";
import path from "path";

export async function repairFile(filePath, buildError) {
    const currentCode = await fs.readFile(filePath, "utf-8");

    console.log(`\n🔧 Attempting AI repair for ${path.basename(filePath)}...`);

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

    let fixedCodeRaw;

    try {
        fixedCodeRaw = await runAI(prompt, {
            temperature: 0.1,
            timeout: 60000
        });
    } catch (aiError) {
        console.warn(
            `⚠️ AI repair unavailable for ${path.basename(filePath)}:`,
            aiError.message
        );
        return null;
    }

    // Strip markdown backticks if AI ignores instruction
    const fixedCode = fixedCodeRaw
        .replace(/^```[a-z]*\n/i, "")
        .replace(/```$/i, "")
        .trim();

    if (!fixedCode) {
        console.warn(
            `⚠️ AI repair returned empty code for ${path.basename(filePath)}.`
        );
        return null;
    }

    await fs.writeFile(filePath, fixedCode, "utf-8");
    return fixedCode;
}
