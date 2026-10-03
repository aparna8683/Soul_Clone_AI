import { useState } from "react";

function App() {
    const [message, setMessage] = useState("");

    const testBackend = async () => {
        try {
            const response = await fetch("http://localhost:5000/");
            const data = await response.json();

            setMessage(data.message);
        } catch (error) {
            console.error("Backend connection error:", error);
            setMessage("Backend connection failed");
        }
    };

    return (
        <div>
            <h1>SoulClone AI</h1>

            <button onClick={testBackend}>
                Test Backend
            </button>

            <p>{message}</p>
        </div>
    );
}

export default App;