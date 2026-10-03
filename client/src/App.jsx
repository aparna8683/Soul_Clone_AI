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

    const handleGenerate = async () => {
        if (!url) return;
        setLoading(true);
        setGeneratedSuccess(false);
        setReactSpec(null);
        setWebsiteSpec(null);
        setStatus("Analyzing website...");

        try {
            const response = await fetch("http://localhost:5000/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to analyze website");
            }
            
            setStatus("Generating components and building frontend...");
            const data = await response.json();
            
            setReactSpec(data.reactSpec);
            setWebsiteSpec(data.websiteSpec);
            
            if (data.buildResult && data.buildResult.success) {
                setStatus("Build validated successfully!");
            } else {
                setStatus("Generation complete (build had issues).");
            }
            
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
            const response = await fetch("http://localhost:5000/api/modify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instruction: modifyInstruction,
                    reactSpec,
                    websiteSpec
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to modify website");
            }

            const data = await response.json();
            setReactSpec(data.reactSpec);
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
                                <p>Your new React/Vite project is ready. You can inspect the files and build output locally in:</p>
                                <code>server/generated-site/</code>
                            </div>
                        </section>

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
                                <button className="secondary-btn" onClick={handleModify} disabled={modifyLoading || !modifyInstruction}>
                                    {modifyLoading ? "Modifying..." : "Modify with AI"}
                                </button>
                            </div>
                            {modifyStatus && (
                                <p className="modify-status">{modifyStatus}</p>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default App;