import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader, Lock } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";

const ResetPasswordPage = () => {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token") || "";
	const navigate = useNavigate();
	const { resetPassword, loading } = useUserStore();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (password !== confirmPassword) return;
		const ok = await resetPassword({ token, password });
		if (ok) navigate("/login");
	};

	return (
		<div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
			<motion.div
				className="sm:mx-auto sm:w-full sm:max-w-md"
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
			>
				<h2 className="text-center font-display text-2xl font-bold text-nova-ink">
					Set a new password
				</h2>
			</motion.div>
			<motion.div
				className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
			>
				<div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
					{!token ? (
						<p className="text-sm text-red-600">
							This reset link is missing a token. Request a new one from{" "}
							<Link to="/forgot-password" className="text-nova-accent">
								forgot password
							</Link>
							.
						</p>
					) : (
						<form onSubmit={handleSubmit} className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-nova-muted">
									New password
								</label>
								<div className="relative mt-1">
									<Lock className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-nova-muted" />
									<input
										type="password"
										required
										minLength={6}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="block w-full rounded-md border border-nova-line bg-nova-bg py-2 pl-10 pr-3 text-sm"
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-nova-muted">
									Confirm password
								</label>
								<input
									type="password"
									required
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="mt-1 block w-full rounded-md border border-nova-line bg-nova-bg px-3 py-2 text-sm"
								/>
								{confirmPassword && password !== confirmPassword && (
									<p className="mt-1 text-xs text-red-600">Passwords do not match</p>
								)}
							</div>
							<button
								type="submit"
								disabled={loading || password !== confirmPassword}
								className="flex w-full justify-center rounded-md bg-nova-accent py-2 text-sm font-medium text-white disabled:opacity-50"
							>
								{loading ? <Loader className="h-5 w-5 animate-spin" /> : "Reset password"}
							</button>
						</form>
					)}
				</div>
			</motion.div>
		</div>
	);
};

export default ResetPasswordPage;
