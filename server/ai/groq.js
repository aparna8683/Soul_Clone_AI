import fs from "fs/promises";
import Groq from "groq-sdk";

console.log(
    "Groq key:",
    process.env.GROQ_API_KEY
        ? `${process.env.GROQ_API_KEY.slice(0, 6)}...`
        : "MISSING"
);

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const TEXT_MODEL =
    process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-120b";

const VISION_MODEL =
    process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

async function handleGroqError(error) {
    if (error?.status === 429) {
        const retryAfter =
            error?.headers?.get?.("retry-after") ||
            error?.headers?.get?.("x-ratelimit-reset-tokens") ||
            "later";

        const message =
            "Groq token quota is currently exhausted. " +
            `Retry after ${retryAfter} or use the next quota window.`;

        console.error("⏳ " + message);

        const quotaError = new Error(message);
        quotaError.code = "GROQ_RATE_LIMIT";
        quotaError.retryAfter = retryAfter;
        throw quotaError;
    }

    console.error("❌ Groq API error:", error);
    throw error;
}

export async function runAI(prompt, options = {}) {
    try {
        console.log(`🚀 Sending request to Groq (${TEXT_MODEL})...`);

        const response = await client.chat.completions.create(
            {
                model: TEXT_MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: options.temperature ?? 0.7,
                ...(options.max_completion_tokens
                    ? { max_completion_tokens: options.max_completion_tokens }
                    : {}),
                ...(options.response_format
                    ? { response_format: options.response_format }
                    : {}),
                ...(options.reasoning_effort
                    ? { reasoning_effort: options.reasoning_effort }
                    : {})
            },
            {
                timeout: options.timeout ?? 30000,
            }
        );

        console.log("📥 Response received from Groq");

        return (
            response?.choices?.[0]?.message?.content?.trim() ||
            "No response generated."
        );
    } catch (error) {
        return handleGroqError(error);
    }
}

export async function runVisionAI(
    prompt,
    imagePaths = [],
    options = {}
) {
    const paths = imagePaths
        .filter(Boolean)
        .slice(0, 3);

    if (!paths.length) {
        throw new Error("Vision AI requires at least one image.");
    }

    const imageContents = await Promise.all(
        paths.map(async (imagePath) => {
            const buffer = await fs.readFile(imagePath);
            const extension =
                imagePath.toLowerCase().endsWith(".jpg") ||
                imagePath.toLowerCase().endsWith(".jpeg")
                    ? "jpeg"
                    : "png";

            return {
                type: "image_url",
                image_url: {
                    url: `data:image/${extension};base64,${buffer.toString("base64")}`
                }
            };
        })
    );

    try {
        console.log(
            `👁️ Sending ${imageContents.length} image(s) to ${VISION_MODEL}...`
        );

        const response = await client.chat.completions.create(
            {
                model: VISION_MODEL,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt
                            },
                            ...imageContents
                        ]
                    }
                ],
                temperature: options.temperature ?? 0.2,
                max_completion_tokens:
                    options.max_completion_tokens ?? 1000,
                ...(options.response_format
                    ? { response_format: options.response_format }
                    : {}),
                ...(options.reasoning_effort
                    ? { reasoning_effort: options.reasoning_effort }
                    : {})
            },
            {
                timeout: options.timeout ?? 45000
            }
        );

        console.log("📥 Vision response received from Groq");

        return (
            response?.choices?.[0]?.message?.content?.trim() ||
            "No response generated."
        );
    } catch (error) {
        return handleGroqError(error);
    }
}
