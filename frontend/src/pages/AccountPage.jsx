import { useState } from "react";
import { Loader, Lock, User } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";

const AccountPage = () => {
	const { user, loading, updateProfile, changePassword } = useUserStore();
	const [name, setName] = useState(user?.name || "");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");

	const handleProfile = async (e) => {
		e.preventDefault();
		await updateProfile(name);
	};

	const handlePassword = async (e) => {
		e.preventDefault();
		const ok = await changePassword({ currentPassword, newPassword });
		if (ok) {
			setCurrentPassword("");
			setNewPassword("");
		}
	};

	return (
		<div className="nova-container py-10">
			<div className="mx-auto max-w-xl space-y-6">
				<div>
					<p className="text-sm font-medium uppercase tracking-wider text-nova-accent">
						Account
					</p>
					<h1 className="mt-1 font-display text-3xl font-bold text-nova-ink">
						Profile & security
					</h1>
					<p className="mt-1 text-sm text-nova-muted">{user?.email}</p>
				</div>

				<form onSubmit={handleProfile} className="nova-card space-y-4 p-5 sm:p-6">
					<h2 className="flex items-center gap-2 text-lg font-semibold text-nova-ink">
						<User size={18} /> Display name
					</h2>
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						className="w-full rounded-md border border-nova-line bg-nova-bg px-3 py-2 text-sm"
					/>
					<button
						type="submit"
						disabled={loading}
						className="rounded-md bg-nova-accent px-4 py-2 text-sm text-white disabled:opacity-50"
					>
						{loading ? <Loader className="h-4 w-4 animate-spin" /> : "Save name"}
					</button>
				</form>

				<form onSubmit={handlePassword} className="nova-card space-y-4 p-5 sm:p-6">
					<h2 className="flex items-center gap-2 text-lg font-semibold text-nova-ink">
						<Lock size={18} /> Change password
					</h2>
					<input
						type="password"
						placeholder="Current password"
						value={currentPassword}
						onChange={(e) => setCurrentPassword(e.target.value)}
						required
						className="w-full rounded-md border border-nova-line bg-nova-bg px-3 py-2 text-sm"
					/>
					<input
						type="password"
						placeholder="New password (min 6 characters)"
						minLength={6}
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						required
						className="w-full rounded-md border border-nova-line bg-nova-bg px-3 py-2 text-sm"
					/>
					<button
						type="submit"
						disabled={loading}
						className="rounded-md bg-nova-accent px-4 py-2 text-sm text-white disabled:opacity-50"
					>
						Update password
					</button>
				</form>
			</div>
		</div>
	);
};

export default AccountPage;
