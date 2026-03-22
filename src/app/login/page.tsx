"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@circos/ui";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        const from = searchParams.get("from") || "/";
        router.push(from);
        router.refresh();
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Connection error");
    }

    setLoading(false);
  };

  return (
    <section className="flex min-h-screen flex-col items-center bg-primary px-4 py-12 md:px-8 md:pt-24">
      <div className="mx-auto flex w-full flex-col gap-8 sm:max-w-90">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
            Mission Control
          </h1>
          <p className="text-md text-tertiary">
            Enter password to access
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            size="md"
            isRequired
            hideRequiredIndicator
            name="password"
            value={password}
            onChange={setPassword}
            isInvalid={!!error}
            hint={error || undefined}
          />

          <Button
            type="submit"
            size="lg"
            color="primary"
            className="w-full"
            isLoading={loading}
            showTextWhileLoading
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-quaternary">
          CircOS -- Agent Mission Control
        </p>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section className="flex min-h-screen flex-col items-center bg-primary px-4 py-12 md:px-8 md:pt-24">
          <div className="mx-auto flex w-full flex-col gap-8 sm:max-w-90">
            <div className="h-16 animate-pulse rounded bg-tertiary" />
            <div className="h-20 animate-pulse rounded bg-tertiary" />
            <div className="h-12 animate-pulse rounded bg-tertiary" />
          </div>
        </section>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
