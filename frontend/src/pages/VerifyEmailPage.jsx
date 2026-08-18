import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";

const VerifyEmailPage = () => {
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token") || "";
	const { verifyEmail } = useUserStore();
	const [status, setStatus] = useState(token ? "loading" : "missing");
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (!token) return undefined;
		let cancelled = false;
		verifyEmail(token)
			.then((data) => {
				if (!cancelled) {
					setStatus("ok");
					setMessage(data.message || "Email verified.");
				}
			})
			.catch((error) => {
				if (!cancelled) {
					setStatus("error");
					setMessage(error.response?.data?.message || "Verification failed.");
				}
			});
		return () => {
			cancelled = true;
		};
	}, [token, verifyEmail]);

	return (
		<div className="mx-auto max-w-md px-4 py-16 text-center">
			{status === "loading" && (
				<p className="inline-flex items-center gap-2 text-nova-muted">
					<Loader className="h-5 w-5 animate-spin" /> Verifying your email...
				</p>
			)}
			{status === "ok" && (
				<>
					<h1 className="font-display text-2xl font-bold text-nova-ink">Email verified</h1>
					<p className="mt-2 text-sm text-nova-muted">{message}</p>
					<Link to="/login" className="mt-6 inline-block text-nova-accent">
						Continue to login
					</Link>
				</>
			)}
			{status === "error" && (
				<>
					<h1 className="font-display text-2xl font-bold text-nova-ink">Link expired</h1>
					<p className="mt-2 text-sm text-nova-muted">{message}</p>
					<Link to="/login" className="mt-6 inline-block text-nova-accent">
						Resend from the login page
					</Link>
				</>
			)}
			{status === "missing" && (
				<p className="text-sm text-nova-muted">This verification link is incomplete.</p>
			)}
		</div>
	);
};

export default VerifyEmailPage;
