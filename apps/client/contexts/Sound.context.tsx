import type { ReactNode } from 'react';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';

const STORAGE_KEY = 'kds-sound-enabled';
const DEFAULT_SOUND_ENABLED = true;

function getStored(): boolean {
	if (typeof window === 'undefined') return DEFAULT_SOUND_ENABLED;
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		return v === null ? DEFAULT_SOUND_ENABLED : v === '1';
	} catch {
		return DEFAULT_SOUND_ENABLED;
	}
}

type SoundContextValue = {
	soundEnabled: boolean;
	toggleSound: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
	const [soundEnabled, setSoundEnabled] = useState(DEFAULT_SOUND_ENABLED);

	useEffect(() => {
		setSoundEnabled(getStored());
	}, []);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, soundEnabled ? '1' : '0');
	}, [soundEnabled]);

	const toggleSound = useCallback(() => {
		setSoundEnabled((prev) => !prev);
	}, []);

	const value = useMemo<SoundContextValue>(
		() => ({ soundEnabled, toggleSound }),
		[soundEnabled, toggleSound]
	);

	return (
		<SoundContext.Provider value={value}>
			{children}
		</SoundContext.Provider>
	);
}

export function useSound(): SoundContextValue {
	const ctx = useContext(SoundContext);
	if (!ctx) {
		throw new Error('useSound must be used within a SoundProvider');
	}
	return ctx;
}
