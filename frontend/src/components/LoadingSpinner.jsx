const LoadingSpinner = () => {
	return (
		<div className="flex min-h-screen items-center justify-center bg-nova-bg">
			<div className="relative">
				<div className="h-16 w-16 rounded-full border-2 border-nova-glow" />
				<div className="absolute left-0 top-0 h-16 w-16 animate-spin rounded-full border-t-2 border-nova-accent" />
				<div className="sr-only">Loading</div>
			</div>
		</div>
	);
};

export default LoadingSpinner;
