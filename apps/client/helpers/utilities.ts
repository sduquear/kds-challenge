export function formatDuration(ms: number): string {
	if (ms < 0 || !Number.isFinite(ms)) return "0:00";
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatPrice(amount: number, currency: string): string {
	const value = amount / 100;
	return new Intl.NumberFormat("es-ES", {
		style: "currency",
		currency: currency || "EUR",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

export function getRandomId() {
	const length = 5
	let result = ""
	const characters = "0123456789"
	const charactersLength = characters.length
	for (let i = 0; i < length; i++) {
		result += characters.charAt(
			Math.floor(Math.random() * charactersLength),
		)
	}
	return result
}

export function getRandomInterval(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}
