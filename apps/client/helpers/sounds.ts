let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!audioContext) {
		audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
	}
	return audioContext;
}

function playTone(
	ctx: AudioContext,
	frequency: number,
	durationSeconds: number,
	startTime: number = 0
): void {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.connect(gain);
	gain.connect(ctx.destination);
	osc.type = 'sine';
	osc.frequency.value = frequency;
	gain.gain.setValueAtTime(0.12, ctx.currentTime + startTime);
	gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + durationSeconds);
	osc.start(ctx.currentTime + startTime);
	osc.stop(ctx.currentTime + startTime + durationSeconds);
}

export function playNewOrderSound(): void {
	const ctx = getContext();
	if (!ctx) return;
	if (ctx.state === 'suspended') {
		ctx.resume().catch(() => {});
	}
	try {
		playTone(ctx, 880, 0.12, 0);
		playTone(ctx, 1100, 0.15, 0.15);
	} catch {}
}

export function playDeliveredSound(): void {
	const ctx = getContext();
	if (!ctx) return;
	if (ctx.state === 'suspended') {
		ctx.resume().catch(() => {});
	}
	try {
		playTone(ctx, 660, 0.2, 0);
	} catch {}
}
