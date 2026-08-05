"use client";

import { useState, useEffect } from "react";
import { PortfolioApp } from "../PortfolioApp";
import { useRouter } from "next/navigation";

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        onLogin();
      } else {
        setError("Contraseña incorrecta");
      }
    } catch (err) {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "#000", color: "#fff", zIndex: 99999, fontFamily: "sans-serif"
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "#111", padding: "2rem", borderRadius: "12px", border: "1px solid #333",
        display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "320px"
      }}>
        <h2 style={{ margin: 0, fontSize: "1.2rem", textAlign: "center" }}>Acceso al Editor</h2>
        {error && <p style={{ color: "#ff4444", margin: 0, fontSize: "0.9rem", textAlign: "center" }}>{error}</p>}
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          style={{
            padding: "10px", borderRadius: "6px", border: "1px solid #444", background: "#222", color: "#fff",
            fontSize: "1rem"
          }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{
            padding: "10px", borderRadius: "6px", border: "none", background: "#d4af37", color: "#000",
            fontWeight: "bold", cursor: "pointer", fontSize: "1rem"
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function EditorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have the cookie implicitly by trying to fetch a protected route?
    // Actually, we can just check document.cookie in a client component, but HttpOnly cookies aren't visible!
    // So we need a status endpoint or just let the server component do it.
    // Wait, this is a client component. Let's create a quick status check endpoint, or just do it server-side.
    // Since I can't easily change to Server Component without rewriting it, let's just make a fast fetch.
    
    fetch("/api/draft", { method: "HEAD" })
      .then(res => {
        if (res.status === 401) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) {
    return <div style={{ background: "#000", height: "100vh" }} />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return <PortfolioApp enableEditor={true} />;
}
