"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tab, TabList, Tabs } from "@circos/ui";
import { Button } from "@circos/ui";
import { SocialButton } from "@circos/ui";
import { Checkbox } from "@circos/ui";
import { Form } from "@circos/ui";
import { Input } from "@circos/ui";
import { UntitledLogoMinimal } from "@circos/ui";
import { BackgroundPattern } from "@circos/ui";
import { createBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("login");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error ?? "Invalid credentials. Please try again.");
                setIsLoading(false);
                return;
            }

            // Persist Supabase session in the browser
            const supabase = createBrowserClient();
            await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            });

            const redirectTo = searchParams.get("from") || "/";
            router.push(redirectTo);
        } catch {
            setError("Connection failed. Please try again.");
            setIsLoading(false);
        }
    }

    async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // TODO: implement sign-up flow on next screen
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        router.push(`/login/register?email=${encodeURIComponent(email)}`);
    }

    return (
        <section className="relative min-h-screen overflow-hidden bg-primary px-4 py-12 md:px-8 md:pt-24">
            <div className="relative z-10 mx-auto flex w-full flex-col gap-8 sm:max-w-90">
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="relative">
                        <BackgroundPattern pattern="grid" className="absolute top-1/2 left-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 md:block" />
                        <BackgroundPattern pattern="grid" size="md" className="absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2 md:hidden" />
                        <UntitledLogoMinimal className="relative z-10 size-12 max-md:hidden" />
                        <UntitledLogoMinimal className="relative z-10 size-10 md:hidden" />
                    </div>
                    <div className="z-10 flex flex-col gap-2 md:gap-3">
                        <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">
                            {activeTab === "login" ? "Log in to your account" : "Create an account"}
                        </h1>
                        <p className="self-stretch p-0 text-md text-tertiary">
                            {activeTab === "login" ? "Welcome back! Please enter your details." : "Start your 30-day free trial."}
                        </p>
                    </div>
                    <Tabs
                        selectedKey={activeTab}
                        onSelectionChange={(key) => {
                            setActiveTab(key as string);
                            setError(null);
                        }}
                        className="z-10 w-full"
                    >
                        <TabList type="button-minimal" fullWidth size="sm">
                            <Tab id="signup">Sign up</Tab>
                            <Tab id="login">Log in</Tab>
                        </TabList>
                    </Tabs>
                </div>
                <Form
                    onSubmit={activeTab === "login" ? handleSubmit : handleSignup}
                    className="z-10 flex flex-col gap-6"
                >
                    {activeTab === "login" ? (
                        <>
                            <div className="flex flex-col gap-5">
                                <Input isRequired hideRequiredIndicator label="Email" type="email" name="email" placeholder="Enter your email" size="md" />
                                <Input isRequired hideRequiredIndicator label="Password" type="password" name="password" size="md" placeholder="••••••••" />
                            </div>
                            {error && (
                                <p className="text-sm text-error-primary">{error}</p>
                            )}
                            <div className="flex items-center">
                                <Checkbox label="Remember for 30 days" name="remember" />
                                <Button color="link-color" size="md" href="#" className="ml-auto">
                                    Forgot password
                                </Button>
                            </div>
                            <div className="flex flex-col gap-4">
                                <Button type="submit" size="lg" isLoading={isLoading} isDisabled={isLoading}>
                                    Sign in
                                </Button>
                                <SocialButton social="google" theme="color">
                                    Sign in with Google
                                </SocialButton>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex flex-col gap-5">
                                <Input isRequired hideRequiredIndicator label="Email" type="email" name="email" placeholder="Enter your email" size="md" />
                            </div>
                            {error && (
                                <p className="text-sm text-error-primary">{error}</p>
                            )}
                            <div className="flex flex-col gap-4">
                                <Button type="submit" size="lg" isLoading={isLoading} isDisabled={isLoading}>
                                    Continue
                                </Button>
                                <SocialButton social="google" theme="color">
                                    Sign up with Google
                                </SocialButton>
                            </div>
                        </>
                    )}
                </Form>
                <div className="z-10 flex justify-center gap-1 text-center">
                    {activeTab === "login" ? (
                        <>
                            <span className="text-sm text-tertiary">Don&apos;t have an account?</span>
                            <Button color="link-color" size="md" onClick={() => setActiveTab("signup")}>
                                Sign up
                            </Button>
                        </>
                    ) : (
                        <>
                            <span className="text-sm text-tertiary">Already have an account?</span>
                            <Button color="link-color" size="md" onClick={() => setActiveTab("login")}>
                                Log in
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
