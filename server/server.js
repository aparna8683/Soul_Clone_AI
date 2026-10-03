import express from "express";
import cors from "cors";
import analyzeRouter from "./routes/analyze.js";
import modifyRouter from "./routes/modify.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.get("/", (req, res) => {
    res.json({
        message: "SoulClone AI backend is running!"
    });
});

app.use("/api/analyze", analyzeRouter);
app.use("/api/modify", modifyRouter);

const PORT = Number(process.env.PORT || 5000);

const server = app.listen(PORT, "127.0.0.1", () => {
    console.log("========================================");
    console.log("🚀 SoulClone AI backend started");
    console.log(`🌐 http://127.0.0.1:${PORT}`);
    console.log(`❤️  http://127.0.0.1:${PORT}/health`);
    console.log("========================================");
});

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        service: "soulclone-server",
        port: PORT
    });
});

server.on("error", (error) => {
    console.error("❌ HTTP server error:", error);
});

server.on("close", () => {
    console.log("🛑 HTTP server closed.");
});
