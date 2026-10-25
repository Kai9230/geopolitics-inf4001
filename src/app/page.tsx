"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase/config";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { ParticleBackground } from "../components/ParticleBackground";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
      router.push("/lobby");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      
      {/* 1. Aurora Background */}
      <div className="aurora-bg">
        <div className="aurora-blob blob-gold"></div>
        <div className="aurora-blob blob-blue"></div>
        <div className="aurora-blob blob-red"></div>
      </div>

      {/* 2. The Cinematic Earth */}
      <div className="earth-container">
        <div className="earth-halo"></div>
        <div className="earth-sphere">
          <div className="earth-continents"></div>
        </div>
      </div>

      {/* 3. Gold Particles */}
      <ParticleBackground />

      {/* 4. Texture Overlays */}
      <div className="noise-overlay"></div>
      <div className="vignette"></div>

      {/* 5. Login Panel */}
      <div className="glass-panel p-10 w-full max-w-md relative z-10 mx-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl tracking-[0.15em] font-black uppercase title-gold mb-3 whitespace-nowrap">Geopolitics</h1>
          <p className="text-[#f4c430] text-xs font-bold tracking-[0.4em] uppercase opacity-70">Ten Nations · One Throne</p>
        </div>
        
        {error && <div className="bg-red-900/50 text-red-400 p-3 rounded mb-6 text-sm border border-red-500/50 text-center uppercase tracking-wider">{error}</div>}
        
        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold mb-2 text-gray-400 uppercase tracking-[0.2em]">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#f4c430] focus:ring-1 focus:ring-[#f4c430] transition-all duration-300" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold mb-2 text-gray-400 uppercase tracking-[0.2em]">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#f4c430] focus:ring-1 focus:ring-[#f4c430] transition-all duration-300" required />
          </div>
          <button type="submit" className="w-full bg-linear-to-r from-[#f4c430] to-[#fbbf24] text-black font-black p-4 rounded-lg hover:shadow-[0_0_40px_rgba(244,196,48,0.6)] hover:-translate-y-0.5 transition-all duration-300 tracking-[0.2em] uppercase mt-4">
            {isLogin ? "Sign In" : "Register"}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-[10px] text-gray-500 cursor-pointer hover:text-[#f4c430] transition-colors uppercase tracking-[0.2em] font-bold" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "No account? Register" : "Already registered? Sign In"}
          </p>
        </div>
      </div>
    </div>
  );
}