import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import analyzeRouter from "./routes/analyze.js";
import modifyRouter from "./routes/modify.js";

dotenv.config();



const app = express();


app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "SoulClone AI backend is running!"
    });
});

app.use("/api/analyze", analyzeRouter);
app.use("/api/modify", modifyRouter);


const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});