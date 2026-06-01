"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const GOLD = "#c4ad4a";
const GOLD_SOFT = "rgba(196,173,74,0.55)";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error?.message ?? "Login failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8"
      style={{
        background: `
          repeating-radial-gradient(circle at 7% 93%, rgba(196,173,74,0.06) 0 1.2px, transparent 1.2px 30px),
          repeating-radial-gradient(circle at 95% 6%, rgba(196,173,74,0.05) 0 1.2px, transparent 1.2px 34px),
          radial-gradient(90% 90% at 100% 100%, rgba(92,86,30,0.40), transparent 60%),
          radial-gradient(70% 70% at 0% 0%, rgba(60,64,24,0.25), transparent 60%),
          linear-gradient(135deg, #10130b 0%, #0b0d07 55%, #0e110a 100%)
        `,
      }}
    >
      {/* Panel */}
      <div
        className="w-full max-w-5xl rounded-[28px] overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1a1e12 0%, #111409 100%)",
          border: "1px solid rgba(196,173,74,0.14)",
          boxShadow: "0 40px 90px -25px rgba(0,0,0,0.75)",
        }}
      >
        {/* Top nav */}
        <div className="flex items-center justify-between px-7 sm:px-10 pt-6">
          <div className="text-white font-semibold text-lg tracking-tight">
            ai engineer<span style={{ color: GOLD }}>.</span>
          </div>
          <nav className="flex items-center gap-6 text-[11px] font-medium tracking-[0.18em] text-[#cfd2c4]">
            <span className="cursor-pointer hover:text-white transition-colors">HOME</span>
            <span className="cursor-pointer hover:text-white transition-colors">GALLERY</span>
            <span className="cursor-pointer hover:text-white transition-colors">BLOG</span>
          </nav>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-7 sm:px-10 pb-10 pt-6">
          {/* Form */}
          <div className="flex flex-col justify-center max-w-md">
            <h1
              className="text-3xl font-extrabold uppercase tracking-wide"
              style={{ color: GOLD }}
            >
              Welcome Back!
            </h1>
            <p className="mt-2 text-sm text-[#e7e9df]">
              Don&apos;t have a account,{" "}
              <span className="font-semibold cursor-pointer" style={{ color: GOLD }}>
                Sign up
              </span>
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-5">
              {/* Username */}
              <div>
                <label className="block text-[15px] font-medium text-white mb-2">Username</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="example@gmail.com"
                    className="w-full rounded-full bg-transparent px-5 py-3 pr-11 text-sm text-white placeholder:text-[#8c8f80] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(196,173,74,0.18)]"
                    style={{ border: `1px solid ${GOLD_SOFT}` }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: GOLD }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <circle cx="12" cy="8" r="3.2" />
                      <path d="M5 20c1-3.5 3.6-5 7-5s6 1.5 7 5" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[15px] font-medium text-white mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-full bg-transparent px-5 py-3 pr-11 text-sm text-white placeholder:text-[#8c8f80] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(196,173,74,0.18)]"
                    style={{ border: `1px solid ${GOLD_SOFT}` }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#cfd2c4] hover:text-white transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.4 5.2A9.5 9.5 0 0 1 12 5c5 0 9 4.5 9 7a12.3 12.3 0 0 1-2.2 3M6.1 6.2A12.6 12.6 0 0 0 3 12c0 2.5 4 7 9 7a9.6 9.6 0 0 0 3.3-.6" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember / forgot */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRemember((v) => !v)}
                  className="flex items-center gap-2 text-sm text-[#e7e9df]"
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      border: `1.5px solid ${GOLD}`,
                      background: remember ? GOLD : "transparent",
                    }}
                  >
                    {remember && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#111409" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  Remember me
                </button>
                <span className="text-sm font-medium cursor-pointer" style={{ color: GOLD }}>
                  Forget password?
                </span>
              </div>

              {error && (
                <div className="rounded-xl border border-[#7f2d2d] bg-[#2a1414] px-4 py-2.5 text-sm text-[#f4b9b9]">
                  {error}
                </div>
              )}

              {/* Sign In */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full py-3 text-[15px] font-bold text-[#15170d] transition-all hover:brightness-105 disabled:opacity-60"
                style={{
                  background: "linear-gradient(180deg, #d2b850 0%, #b3992f 100%)",
                  boxShadow: "0 10px 24px -10px rgba(196,173,74,0.55)",
                }}
              >
                {loading ? "Signing In…" : "Sign In"}
              </button>
            </form>
          </div>

          {/* Illustration */}
          <div className="relative hidden lg:flex items-center justify-center">
            {/* Yellow circle */}
            <div
              className="relative w-[300px] h-[300px] rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: "radial-gradient(circle at 50% 40%, #f4c81e 0%, #e8b800 70%, #d6a900 100%)",
              }}
            >
              {!imgError ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src="/hantu.png"
                  alt="Mascot"
                  onError={() => setImgError(true)}
                  className="w-[112%] h-[112%] object-contain object-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
                />
              ) : (
                <span className="text-[170px] leading-none select-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
                  🐼
                </span>
              )}
            </div>

            {/* Social icons */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3">
              {[
                {
                  label: "Twitter",
                  path: (
                    <path d="M22 5.9c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5a4.1 4.1 0 0 0 3.3 4 4.1 4.1 0 0 1-1.8.1 4.1 4.1 0 0 0 3.8 2.8A8.3 8.3 0 0 1 2 18.1a11.6 11.6 0 0 0 6.3 1.8c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.1z" />
                  ),
                },
                {
                  label: "YouTube",
                  path: (
                    <>
                      <rect x="2.5" y="6" width="19" height="12" rx="3.5" />
                      <path d="M10.5 9.2v5.6l5-2.8z" fill="#15170d" stroke="none" />
                    </>
                  ),
                },
                {
                  label: "Facebook",
                  path: (
                    <path d="M14.5 8.5H16V6h-1.8c-2 0-3.2 1.2-3.2 3.2V11H9v2.5h2v6.5h2.6v-6.5h2.1l.4-2.5h-2.5V9.5c0-.7.3-1 1-1z" />
                  ),
                },
                {
                  label: "Instagram",
                  path: (
                    <>
                      <rect x="4" y="4" width="16" height="16" rx="5" />
                      <circle cx="12" cy="12" r="3.6" />
                      <circle cx="17" cy="7" r="1" fill="#15170d" stroke="none" />
                    </>
                  ),
                },
              ].map((s) => (
                <span
                  key={s.label}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: GOLD }}
                  title={s.label}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#15170d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    {s.path}
                  </svg>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
