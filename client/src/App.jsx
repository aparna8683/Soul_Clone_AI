import { useState } from "react";
import "./App.css";

function App() {
    const [url, setUrl] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [reactSpec, setReactSpec] = useState(null);
    const [websiteSpec, setWebsiteSpec] = useState(null);
    const [generatedSuccess, setGeneratedSuccess] = useState(false);
    const [modifyInstruction, setModifyInstruction] = useState("");
    const [modifyLoading, setModifyLoading] = useState(false);
    const [modifyStatus, setModifyStatus] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [visualCritique, setVisualCritique] = useState(null);
    const [visualDiff, setVisualDiff] = useState(null);
    const [visualRepairIterations, setVisualRepairIterations] = useState(0);
    const [aiStatus, setAiStatus] = useState(null);

    const handleGenerate = async () => {
        if (!url) return;

        setLoading(true);
        setGeneratedSuccess(false);
        setReactSpec(null);
        setWebsiteSpec(null);
        setPreviewUrl("");
        setVisualCritique(null);
        setVisualDiff(null);
        setVisualRepairIterations(0);
        setAiStatus(null);
        setStatus("Analyzing website...");

        try {
            const response = await fetch("http://localhost:5000/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to analyze website");
            }

            setStatus("Generating components and building frontend...");
            setReactSpec(data.reactSpec);
            setWebsiteSpec(data.websiteSpec);
            setPreviewUrl(data.previewUrl || "");
            setVisualCritique(data.visualCritique || null);
            setVisualDiff(data.visualDiff || null);
            setVisualRepairIterations(data.visualRepairIterations || 0);
            setAiStatus(data.aiStatus || null);

            setStatus(
                data.buildResult?.success
                    ? "Build validated successfully!"
                    : "Generation complete (build had issues)."
            );

            setGeneratedSuccess(true);
        } catch (error) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleModify = async () => {
        if (!modifyInstruction || !reactSpec) return;

        setModifyLoading(true);
        setModifyStatus("Modifying with AI...");

        try {
            // Only the ReactSpec is sent. The original WebsiteSpec can contain
            // large screenshot/base64 fields and is already stored by the server.
            const response = await fetch("http://localhost:5000/api/modify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instruction: modifyInstruction,
                    reactSpec
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to modify website");
            }

            setReactSpec(data.reactSpec);
            setPreviewUrl(data.previewUrl || previewUrl);
            setVisualCritique(data.visualCritique || null);
            setAiStatus(data.aiStatus || null);
            setModifyInstruction("");
            setModifyStatus("Modification complete!");
        } catch (error) {
            console.error(error);
            setModifyStatus(`Error: ${error.message}`);
        } finally {
            setModifyLoading(false);
        }
    };

    return (
        <div className="app-container">
            <header className="header">
                <div className="header-content">
                    <h1 className="logo">SoulClone AI</h1>
                    <p className="subtitle">AI-powered website recreation</p>
                </div>
            </header>

            <main className="main-content">
                <section className="hero">
                    <h2>Recreate any website with AI</h2>
                    <p>Enter a public website URL below to automatically generate a brand new React/Vite implementation using our deterministic AI pipeline.</p>
                </section>

                <section className="input-section">
                    <input
                        type="url"
                        className="url-input"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={loading}
                    />
                    <button className="primary-btn" onClick={handleGenerate} disabled={loading || !url}>
                        {loading ? "Generating..." : "Generate Website"}
                    </button>
                </section>

                {status && (
                    <section className="status-section">
                        <div className="status-box">
                            <p className="status-text">{status}</p>
                            {loading && <div className="spinner"></div>}
                        </div>
                    </section>
                )}

                {generatedSuccess && (
                    <>
                        <section className="success-section">
                            <div className="success-card">
                                <h3>✅ Website Generated Successfully</h3>
                                <p>Your new React/Vite project is ready.</p>
                                <code>server/generated-site/</code>
                                {previewUrl && (
                                    <a className="preview-link" href={previewUrl} target="_blank" rel="noreferrer">
                                        Open local preview ↗
                                    </a>
                                )}
                            </div>
                        </section>

                        {aiStatus?.degraded && (
                            <section className="success-section">
                                <div className="success-card warning-card">
                                    <h3>⚠️ AI Enhancement Unavailable</h3>
                                    <p>
                                        Groq quota was exhausted during this run, so parts of the result were
                                        generated with the deterministic fallback and may be less accurate.
                                        {aiStatus.retryInSeconds
                                            ? ` AI calls should recover in about ${aiStatus.retryInSeconds}s.`
                                            : ""}
                                    </p>
                                </div>
                            </section>
                        )}

                        {visualDiff?.comparable && (
                            <section className="success-section">
                                <div className="success-card">
                                    <h3>📐 Visual Similarity</h3>
                                    <p>
                                        Pixel similarity: <strong>{(visualDiff.similarity * 100).toFixed(1)}%</strong>
                                        {visualRepairIterations > 0
                                            ? ` · ${visualRepairIterations} visual repair iteration(s) accepted`
                                            : ""}
                                    </p>
                                </div>
                            </section>
                        )}

                        {visualCritique && (
                            <section className="success-section">
                                <div className="success-card">
                                    <h3>👁️ Visual QA: {visualCritique.overall || "completed"}</h3>
                                    {visualCritique.issues?.length ? (
                                        <ul>
                                            {visualCritique.issues.slice(0, 5).map((issue, index) => (
                                                <li key={index}>
                                                    <strong>{issue.severity}</strong>: {issue.issue}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>No major visual differences were detected in the generated preview.</p>
                                    )}
                                </div>
                            </section>
                        )}

                        <section className="modify-section">
                            <h3>Modify Generated Website</h3>
                            <div className="modify-input-group">
                                <input
                                    type="text"
                                    className="modify-input"
                                    placeholder="e.g. Make the primary color purple"
                                    value={modifyInstruction}
                                    onChange={(e) => setModifyInstruction(e.target.value)}
                                    disabled={modifyLoading}
                                />
                                <button
                                    className="secondary-btn"
                                    onClick={handleModify}
                                    disabled={modifyLoading || !modifyInstruction}
                                >
                                    {modifyLoading ? "Modifying..." : "Modify with AI"}
                                </button>
                            </div>
                            {modifyStatus && <p className="modify-status">{modifyStatus}</p>}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default App;
