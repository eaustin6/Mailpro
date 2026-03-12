import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TypeAnimation } from "react-type-animation";
import { 
  Ghost, 
  Lock, 
  Send,
  MessageSquare,
  ArrowRight,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { getAuthStatus, requestOTP, verifyOTP } from "../lib/api";

const LoginPage = () => {
  const navigate = useNavigate();
  const [authEnabled, setAuthEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("username"); // username, otp
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await getAuthStatus();
      setAuthEnabled(status.website_auth_enabled);
      
      if (!status.website_auth_enabled) {
        navigate("/");
      }
      
      // Check if already logged in
      const token = localStorage.getItem("user_token");
      if (token) {
        navigate("/");
      }
    } catch (error) {
      console.error("Failed to check auth status");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Please enter your Telegram username");
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestOTP(username);
      if (result.auth_disabled) {
        navigate("/");
        return;
      }
      toast.success("OTP sent to your Telegram");
      setStep("otp");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    setSubmitting(true);
    try {
      const result = await verifyOTP(username, otp);
      if (result.auth_disabled) {
        navigate("/");
        return;
      }
      localStorage.setItem("user_token", result.token);
      localStorage.setItem("user_info", JSON.stringify(result.user));
      toast.success("Login successful!");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid OTP");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black grid-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Ghost className="w-16 h-16 text-neon-green mx-auto mb-4" />
          <h1 className="font-display text-3xl text-neon-green text-glow uppercase tracking-wider">
            GhostMail
          </h1>
          <p className="text-gray-500 text-sm mt-2">SECURE ACCESS REQUIRED</p>
        </div>

        {/* Login Card */}
        <div className="cyber-card">
          <div className="cyber-card-header">
            <div className="terminal-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="text-xs text-gray-400 tracking-widest uppercase">
              {step === "username" ? "Authentication" : "Verification"}
            </span>
          </div>

          <div className="p-6">
            {step === "username" ? (
              <form onSubmit={handleRequestOTP} className="space-y-6">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Telegram Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace("@", ""))}
                    placeholder="your_username"
                    className="cyber-input w-full"
                    data-testid="input-username"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    You must have started the GhostMail bot on Telegram first
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="cyber-btn cyber-btn-primary w-full flex items-center justify-center gap-2"
                  data-testid="btn-request-otp"
                >
                  {submitting ? (
                    <>
                      <div className="spinner" />
                      <span>SENDING...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>SEND OTP</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="text-center text-sm text-gray-400 mb-4">
                  <Shield className="w-8 h-8 text-neon-green mx-auto mb-2" />
                  OTP sent to <span className="text-neon-green">@{username}</span>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Enter OTP Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="cyber-input w-full text-center text-2xl tracking-[0.5em]"
                    maxLength={6}
                    data-testid="input-otp"
                  />
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Check your Telegram for the 6-digit code
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || otp.length !== 6}
                  className="cyber-btn cyber-btn-primary w-full flex items-center justify-center gap-2"
                  data-testid="btn-verify-otp"
                >
                  {submitting ? (
                    <>
                      <div className="spinner" />
                      <span>VERIFYING...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>VERIFY & LOGIN</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("username");
                    setOtp("");
                  }}
                  className="w-full text-center text-xs text-gray-500 hover:text-neon-green"
                >
                  ← Back to username
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>Don't have access? Contact the administrator.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
