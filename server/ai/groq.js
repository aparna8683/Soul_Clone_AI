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

const MODEL_NAME = "openai/gpt-oss-120b";

export async function runAI(prompt, options = {}) {
    try {
        console.log("🚀 Sending request to Groq...");

        const response = await client.chat.completions.create(
            {
                model: MODEL_NAME,
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
                    : {})
            },
            {
                timeout: 30000,
            }
        );

        console.log("📥 Response received from Groq");

        return (
            response?.choices?.[0]?.message?.content?.trim() ||
            "No response generated."
        );
    } catch (error) {
        if (error?.status === 429) {
            const retryAfter = error?.headers?.get?.("retry-after") || "later";
            const message =
                "Groq token quota is currently exhausted. " +
                `Retry after ${retryAfter} seconds or use the next quota window.`;

            console.error("⏳ " + message);
            const quotaError = new Error(message);
            quotaError.code = "GROQ_RATE_LIMIT";
            quotaError.retryAfter = retryAfter;
            throw quotaError;
        }

        console.error("❌ Groq API error:", error);
        throw error;
    }
}