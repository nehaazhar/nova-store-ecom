import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader, Mail } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { forgotPassword, loading } = useUserStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await forgotPassword(email);
    if (ok) setSent(true);
  };

  return (
    <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div
        className="sm:mx-auto sm:w-full sm:max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-center font-display text-2xl font-bold text-nova-ink">
          Forgot password
        </h2>
        <p className="mt-2 text-center text-sm text-nova-muted">
          We will email a reset link if that account exists.
        </p>
      </motion.div>

      <motion.div
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          {sent ? (
            <p className="text-sm text-nova-ink">
              Check your inbox for the reset link.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-nova-muted"
                >
                  Email address
                </label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-nova-muted" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md border border-nova-line bg-nova-bg py-2 pl-10 pr-3 text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-nova-accent py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          )}
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1 text-sm text-nova-accent"
          >
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
