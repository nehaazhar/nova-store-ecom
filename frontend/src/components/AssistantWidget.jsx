import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import axios from "../lib/axios";

const starterPrompts = [
	"black shoes under 2000",
	"what is return policy?",
	"college outfit under 3000",
];

const AssistantWidget = () => {
	const [open, setOpen] = useState(false);
	const [question, setQuestion] = useState("");
	const [loading, setLoading] = useState(false);
	const [messages, setMessages] = useState([
		{
			role: "assistant",
			text: "Ask me for product suggestions, budget picks, shipping, returns, or payment help.",
			products: [],
			sources: [],
		},
	]);

	const canAsk = useMemo(() => question.trim().length > 1 && !loading, [question, loading]);

	const askAssistant = async (prompt = question) => {
		const text = prompt.trim();
		if (!text || loading) return;

		setQuestion("");
		setLoading(true);
		setMessages((current) => [...current, { role: "user", text, products: [], sources: [] }]);

		try {
			const res = await axios.post("/assistant/ask", { question: text });
			setMessages((current) => [
				...current,
				{
					role: "assistant",
					text: res.data.answer,
					products: res.data.products || [],
					sources: res.data.sources || [],
				},
			]);
		} catch (error) {
			setMessages((current) => [
				...current,
				{
					role: "assistant",
					text: error.response?.data?.message || "Assistant could not answer right now.",
					products: [],
					sources: [],
				},
			]);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed bottom-5 right-5 z-50">
			{open && (
				<div className="mb-3 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-nova-line bg-white shadow-soft">
					<div className="flex items-center justify-between border-b border-nova-line px-4 py-3">
						<div className="flex items-center gap-2">
							<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-shine text-white">
								<Bot size={17} />
							</span>
							<div>
								<p className="text-sm font-bold text-nova-ink">NOVA Assistant</p>
								<p className="text-[11px] text-nova-muted">Catalog grounded help</p>
							</div>
						</div>
						<button
							type="button"
							className="rounded-lg p-2 text-nova-muted transition hover:bg-slate-100 hover:text-nova-ink"
							onClick={() => setOpen(false)}
							aria-label="Close assistant"
						>
							<X size={17} />
						</button>
					</div>

					<div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4">
						{messages.map((message, index) => (
							<div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-8" : "mr-4"}>
								<div
									className={`rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
										message.role === "user"
											? "bg-nova-ink text-white"
											: "border border-nova-line bg-white text-nova-ink"
									}`}
								>
									{message.text}
								</div>
								{message.products?.length > 0 && (
									<div className="mt-2 grid gap-2">
										{message.products.map((product) => (
											<Link
												key={product._id}
												to={`/product/${product._id}`}
												className="flex items-center gap-2 rounded-xl border border-nova-line bg-white p-2 text-xs shadow-sm transition hover:border-nova-accent"
												onClick={() => setOpen(false)}
											>
												{product.image && (
													<img src={product.image} alt="" className="h-11 w-11 rounded-lg object-cover" />
												)}
												<div className="min-w-0 flex-1">
													<p className="truncate font-semibold text-nova-ink">{product.name}</p>
													<p className="text-nova-muted">Rs {product.price} · {product.category}</p>
												</div>
											</Link>
										))}
									</div>
								)}
								{message.sources?.length > 0 && (
									<p className="mt-1 text-[10px] text-nova-muted">Sources: {message.sources.join(", ")}</p>
								)}
							</div>
						))}
						{loading && (
							<div className="mr-10 inline-flex items-center gap-2 rounded-2xl border border-nova-line bg-white px-3 py-2 text-sm text-nova-muted shadow-sm">
								<Loader2 size={14} className="animate-spin" />
								Thinking
							</div>
						)}
					</div>

					<div className="border-t border-nova-line bg-white p-3">
						<div className="mb-2 flex flex-wrap gap-1.5">
							{starterPrompts.map((prompt) => (
								<button
									key={prompt}
									type="button"
									className="rounded-full border border-nova-line px-2.5 py-1 text-[11px] text-nova-muted transition hover:border-nova-accent hover:text-nova-accent"
									onClick={() => askAssistant(prompt)}
								>
									{prompt}
								</button>
							))}
						</div>
						<form
							className="flex gap-2"
							onSubmit={(event) => {
								event.preventDefault();
								askAssistant();
							}}
						>
							<input
								value={question}
								onChange={(event) => setQuestion(event.target.value)}
								placeholder="Ask for products or help..."
								className="min-w-0 flex-1 rounded-xl border border-nova-line px-3 py-2 text-sm outline-none focus:border-nova-accent focus:ring-2 focus:ring-nova-accent/15"
							/>
							<button
								type="submit"
								disabled={!canAsk}
								className="flex h-10 w-10 items-center justify-center rounded-xl bg-nova-ink text-white transition hover:bg-nova-accent disabled:opacity-50"
								aria-label="Ask assistant"
							>
								<Send size={16} />
							</button>
						</form>
					</div>
				</div>
			)}

			<button
				type="button"
				className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-shine text-white shadow-lift transition hover:-translate-y-0.5 hover:brightness-110"
				onClick={() => setOpen((value) => !value)}
				aria-label="Open shopping assistant"
			>
				<MessageCircle size={24} />
			</button>
		</div>
	);
};

export default AssistantWidget;
