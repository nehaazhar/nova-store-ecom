import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LogIn, Mail, Lock, ArrowRight, Loader } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";

const LoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const { login, loading, resendVerification } = useUserStore();
	const [needsVerify, setNeedsVerify] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		const result = await login(email, password);
		if (result && result.code === "EMAIL_NOT_VERIFIED") {
			setNeedsVerify(true);
		}
	};

	return (
		<div className='flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
			<motion.div
				className='sm:mx-auto sm:w-full sm:max-w-md'
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8 }}
			>
				<p className="text-center font-display text-3xl font-extrabold tracking-tight text-nova-ink">NOVA</p>
				<h2 className="mt-2 text-center text-xl font-semibold text-nova-muted">Welcome back</h2>
			</motion.div>

			<motion.div
				className='mt-8 sm:mx-auto sm:w-full sm:max-w-md'
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8, delay: 0.2 }}
			>
				<div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
					<form onSubmit={handleSubmit} className='space-y-6'>
						<div>
							<label htmlFor='email' className='block text-sm font-medium text-nova-muted'>
								Email address
							</label>
							<div className='mt-1 relative rounded-md shadow-sm'>
								<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
									<Mail className='h-5 w-5 text-nova-muted' aria-hidden='true' />
								</div>
								<input
									id='email'
									type='email'
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className=' block w-full px-3 py-2 pl-10 bg-nova-bg border border-nova-line 
									rounded-md shadow-sm
									 placeholder:text-nova-muted focus:outline-none focus:ring-nova-accent 
									 focus:border-nova-accent sm:text-sm'
									placeholder='you@example.com'
								/>
							</div>
						</div>

						<div>
							<label htmlFor='password' className='block text-sm font-medium text-nova-muted'>
								Password
							</label>
							<div className='mt-1 relative rounded-md shadow-sm'>
								<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
									<Lock className='h-5 w-5 text-nova-muted' aria-hidden='true' />
								</div>
								<input
									id='password'
									type='password'
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className=' block w-full px-3 py-2 pl-10 bg-nova-bg border border-nova-line 
									rounded-md shadow-sm placeholder:text-nova-muted focus:outline-none focus:ring-nova-accent focus:border-nova-accent sm:text-sm'
									placeholder='••••••••'
								/>
							</div>
						</div>

						<button
							type='submit'
							className='w-full flex justify-center py-2 px-4 border border-transparent 
							rounded-md shadow-sm text-sm font-medium text-nova-ink bg-nova-accent
							 hover:bg-nova-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2
							  focus:ring-nova-accent transition duration-150 ease-in-out disabled:opacity-50'
							disabled={loading}
						>
							{loading ? (
								<>
									<Loader className='mr-2 h-5 w-5 animate-spin' aria-hidden='true' />
									Loading...
								</>
							) : (
								<>
									<LogIn className='mr-2 h-5 w-5' aria-hidden='true' />
									Login
								</>
							)}
						</button>
					</form>

					{needsVerify && (
						<button
							type="button"
							onClick={() => resendVerification(email)}
							className="mt-4 w-full text-sm text-nova-accent"
						>
							Resend verification email
						</button>
					)}

					<p className="mt-4 text-center text-sm">
						<Link to="/forgot-password" className="font-medium text-nova-accent">
							Forgot password?
						</Link>
					</p>

					<p className='mt-6 text-center text-sm text-nova-muted'>
						Not a member?{" "}
						<Link to='/signup' className='font-medium text-nova-accent hover:text-nova-accent'>
							Sign up now <ArrowRight className='inline h-4 w-4' />
						</Link>
					</p>
				</div>
			</motion.div>
		</div>
	);
};
export default LoginPage;
