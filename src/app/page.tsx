"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../lib/firebase/config";
import { ParticleBackground } from "../components/ParticleBackground";

const RESET_CONFIRMATION =
  "If an account exists for that email, a password-reset link has been sent. Check your inbox and spam folder.";

function getErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String(error.code);
  }

  return "";
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const router = useRouter();

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setError("");
    setResetMessage("");

    try {
      const trimmedEmail = email.trim();

      if (isLogin) {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } else {
        await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      }

      router.push("/lobby");
    } catch (err: unknown) {
      const code = getErrorCode(err);

      switch (code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-login-credentials":
          setError("Unable to sign in. Check your email and password.");
          break;
        case "auth/email-already-in-use":
          setError(
            "Unable to register with this email. Try signing in or resetting your password.",
          );
          break;
        case "auth/invalid-email":
          setError("Enter a valid email address.");
          break;
        case "auth/weak-password":
        case "auth/password-does-not-meet-requirements":
          setError("Choose a stronger password that meets the account requirements.");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Please wait before trying again.");
          break;
        case "auth/network-request-failed":
          setError("Check your internet connection and try again.");
          break;
        case "auth/user-disabled":
          setError("This account is unavailable. Please contact the administrator.");
          break;
        default:
          setError("Unable to complete your request. Please try again later.");
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (pending.current) return;

    setError("");
    setResetMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Enter your email address first, then click Forgot password.");
      emailRef.current?.focus();
      return;
    }

    if (emailRef.current && !emailRef.current.reportValidity()) {
      return;
    }

    pending.current = true;
    setBusy(true);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setResetMessage(RESET_CONFIRMATION);
    } catch (err: unknown) {
      const code = getErrorCode(err);

      switch (code) {
        case "auth/user-not-found":
          setResetMessage(RESET_CONFIRMATION);
          break;
        case "auth/invalid-email":
          setError("Enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many requests. Please wait before trying again.");
          break;
        case "auth/network-request-failed":
          setError("Check your internet connection and try again.");
          break;
        default:
          setError("Unable to send the reset email. Please try again later.");
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const toggleAuthMode = () => {
    if (pending.current) return;

    setIsLogin((current) => !current);
    setPassword("");
    setError("");
    setResetMessage("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Aurora Background */}
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-blob blob-gold"></div>
        <div className="aurora-blob blob-blue"></div>
        <div className="aurora-blob blob-red"></div>
      </div>

      {/* The Giant Earth */}
      <div className="earth-container" aria-hidden="true">
        <div className="earth-halo"></div>
        <div className="earth-sphere">
          <div className="earth-continents"></div>
        </div>
      </div>

      {/* Particles and Overlays */}
      <ParticleBackground />
      <div className="noise-overlay" aria-hidden="true"></div>
      <div className="vignette" aria-hidden="true"></div>

      {/* Login Panel */}
      <div className="glass-panel p-10 w-full max-w-md relative z-10 mx-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl tracking-[0.15em] font-black uppercase title-gold mb-3 whitespace-nowrap">
            Geopolitics
          </h1>

          <p className="text-[#f4c430] text-xs font-bold tracking-[0.4em] uppercase opacity-70">
            Ten Nations · One Throne
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-red-900/50 text-red-300 p-3 rounded mb-6 text-sm border border-red-500/50 text-center"
          >
            {error}
          </div>
        )}

        {resetMessage && (
          <div
            role="status"
            aria-live="polite"
            className="bg-green-950/60 text-green-200 p-3 rounded mb-6 text-sm border border-green-500/40 text-center"
          >
            {resetMessage}
          </div>
        )}

        <form
          onSubmit={handleAuth}
          className="space-y-5"
          aria-busy={busy}
        >
          <div>
            <label
              htmlFor="auth-email"
              className="block text-[10px] font-bold mb-2 text-gray-400 uppercase tracking-[0.2em]"
            >
              Email
            </label>

            <input
              ref={emailRef}
              id="auth-email"
              name="email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
                setResetMessage("");
              }}
              disabled={busy}
              className="w-full bg-black/60 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#f4c430] disabled:opacity-60"
              required
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-[10px] font-bold mb-2 text-gray-400 uppercase tracking-[0.2em]"
            >
              Password
            </label>

            <input
              id="auth-password"
              name="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={isLogin ? undefined : 6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              className="w-full bg-black/60 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#f4c430] disabled:opacity-60"
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-linear-to-r from-[#f4c430] to-[#fbbf24] text-black font-black p-4 rounded-lg hover:shadow-[0_0_40px_rgba(244,196,48,0.6)] transition tracking-[0.2em] uppercase mt-4 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Please wait…" : isLogin ? "Sign In" : "Register"}
          </button>
        </form>

        {isLogin && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={busy}
              className="text-sm text-[#f4c430] underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4c430] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <button
            type="button"
            disabled={busy}
            onClick={toggleAuthMode}
            className="text-[10px] text-gray-400 cursor-pointer hover:text-[#f4c430] uppercase tracking-[0.2em] font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLogin ? "No account? Register" : "Already registered? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}