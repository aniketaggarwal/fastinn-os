"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.protocol}//${window.location.host}/dashboard`,
      },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Email + Link Login (Magic Link)
  const handleMagicLinkLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: `${window.location.protocol}//${window.location.host}/dashboard` },
    });
    if (error) setError(error.message);
    else alert("Check your email for the login link!");
    setLoading(false);
  };

  // Email + Password Login
  const handlePasswordLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  // Sign Up (Optional convenience)
  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      alert("Check your email to confirm your account!");
    }
    setLoading(false);
  };

  const requestOtp = async () => {
    setLoading(true);
    setError(null);

    // Sanitize phone number: remove spaces, dashes, parentheses
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    // Ensure it has + prefix if missing (assuming +91 for now or rely on user input)
    // Better to just pass what user typed if they included +, otherwise sanitization might strip it.
    // Let's just strip spaces and ensure it starts with + if user provided it, or re-add it.
    // Actually, safer to just trim whitespace.
    const cleanPhone = phoneNumber.trim();

    const { error } = await supabase.auth.signInWithOtp({
      phone: cleanPhone,
    });
    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: otp,
      type: "sms",
    });
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
      <h1>Login (Test)</h1>

      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ padding: "10px", width: "100%" }}
        >
          {loading ? "Loading..." : "Login with Google"}
        </button>
      </div>

      <hr />

      <div style={{ margin: "20px 0" }}>
        <h3>Email Login</h3>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePasswordLogin}
            disabled={loading || !email || !password}
            style={{ flex: 1, padding: "8px" }}
          >
            Login
          </button>
          <button
            onClick={handleSignUp}
            disabled={loading || !email || !password}
            style={{ flex: 1, padding: "8px" }}
          >
            Sign Up
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <button onClick={handleMagicLinkLogin} style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontSize: "0.8em" }}>
            Send Magic Link instead
          </button>
        </div>
      </div>

      <hr />

      <div style={{ marginTop: "20px" }}>
        <h3>Phone Login</h3>
        {step === "phone" ? (
          <div>
            <input
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <button
              onClick={requestOtp}
              disabled={loading || !phoneNumber}
              style={{ width: "100%", padding: "8px" }}
            >
              Send OTP
            </button>
          </div>
        ) : (
          <div>
            <p>Enter OTP sent to {phoneNumber}</p>
            <input
              type="text"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <button
              onClick={verifyOtp}
              disabled={loading || !otp}
              style={{ width: "100%", padding: "8px" }}
            >
              Verify OTP
            </button>
            <button
              onClick={() => setStep("phone")}
              style={{ marginTop: "10px", background: "none", border: "none", color: "blue", cursor: "pointer" }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
