"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "../../src/lib/supabase";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [school, setSchool] = useState("");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const queryError = new URLSearchParams(window.location.search).get("error");
    if (queryError === "confirmation") {
      setError("We couldn’t confirm that link. Request a fresh confirmation email and open the newest link.");
    }

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/");
        return;
      }

      setChecking(false);
    }

    checkSession();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        if (!nickname.trim()) {
          setError("Please enter a display name.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { nickname: nickname.trim(), school: school.trim() }, emailRedirectTo: getAuthCallbackUrl() },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }

        setMessage(
          "Check your inbox and open the confirmation link. You’ll return to PeopleFind—not localhost. If it isn’t there, check your spam folder."
        );

        setMode("signin");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          router.replace("/");
          router.refresh();
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() { setLoading(true); setError(""); setMessage(""); const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: getAuthCallbackUrl() } }); if (oauthError) { setError(oauthError.message); setLoading(false); } }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0c0c0b] text-[#ebe8e1]">
        <Loader2 className="animate-spin text-[#cdbd96]" size={20} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12 sm:px-6">
        {/* Brand */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#151514]">
              <Compass
                size={19}
                strokeWidth={1.8}
                className="text-[#cdbd96]"
              />
            </div>

            <div>
              <div className="text-[15px] font-semibold">
                PeopleFind
              </div>

              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#625f58]">
                People directory
              </div>
            </div>
          </Link>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#77736b]">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </p>

          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#ebe8e1]">
            {mode === "signin"
              ? "Sign in to PeopleFind."
              : "Join PeopleFind."}
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#85817a]">
            {mode === "signin"
              ? "Access the directory and the tools available to your account."
              : "Create an account to search the directory and use PeopleFind features."}
          </p>
        </div>

        <button type="button" onClick={signInWithGoogle} disabled={loading} className="pf-button-primary mb-5 w-full disabled:opacity-50"><GoogleMark />Continue with Google</button><div className="mb-5 flex items-center gap-3 text-[11px] text-[#625f58]"><span className="h-px flex-1 bg-white/[0.08]" /><span>OR USE EMAIL</span><span className="h-px flex-1 bg-white/[0.08]" /></div><form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label
                htmlFor="nickname"
                className="mb-2 block text-xs font-medium text-[#a6a198]"
              >
                Display name
              </label>

              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="How you want to appear"
                autoComplete="nickname"
                className="w-full rounded-xl border border-white/[0.08] bg-[#141413] px-4 py-3 text-sm text-[#ebe8e1] placeholder:text-[#5f5c55] transition focus:border-[#cdbd96]/40"
                disabled={loading}
              />
            </div>
          )}

          {mode === "signup" && <div><label htmlFor="school" className="mb-2 block text-xs font-medium text-[#a6a198]">School / institution (optional)</label><input id="school" type="text" value={school} onChange={(event) => setSchool(event.target.value)} placeholder="Your university or institution" autoComplete="organization" className="w-full rounded-xl border border-white/[0.08] bg-[#141413] px-4 py-3 text-sm text-[#ebe8e1] placeholder:text-[#5f5c55] transition focus:border-[#cdbd96]/40" disabled={loading} /></div>}

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-xs font-medium text-[#a6a198]"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-white/[0.08] bg-[#141413] px-4 py-3 text-sm text-[#ebe8e1] placeholder:text-[#5f5c55] transition focus:border-[#cdbd96]/40"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-xs font-medium text-[#a6a198]"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              className="w-full rounded-xl border border-white/[0.08] bg-[#141413] px-4 py-3 text-sm text-[#ebe8e1] placeholder:text-[#5f5c55] transition focus:border-[#cdbd96]/40"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] px-4 py-3 text-sm leading-5 text-[#dca0a0]">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-[#91b89a]/20 bg-[#91b89a]/[0.06] px-4 py-3 text-sm leading-5 text-[#a9c6af]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-4 py-3.5 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Please wait
              </>
            ) : (
              <>
                {mode === "signin" ? "Sign in" : "Create account"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Switch */}
        <div className="mt-7 text-center text-sm text-[#77736d]">
          {mode === "signin" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setMessage("");
                }}
                className="font-medium text-[#cdbd96] hover:text-[#ebe8e1]"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setMessage("");
                }}
                className="font-medium text-[#cdbd96] hover:text-[#ebe8e1]"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <Link
          href="/"
          className="mt-8 text-center text-xs text-[#5f5c55] transition hover:text-[#a6a198]"
        >
          Return to PeopleFind
        </Link>
      </div>
    </main>
  );
}

function getAuthCallbackUrl() {
  const configuredBase = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const hostname = window.location.hostname;
  const localAddress =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^\\d{1,3}(\\.\\d{1,3}){3}$/.test(hostname);
  const base = configuredBase || (localAddress ? "https://people-find.vercel.app" : window.location.origin);
  return new URL("/auth/callback", base).toString();
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-[17px] w-[17px]">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.05 46.98 31.95 46.98 24.55Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.91 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}
