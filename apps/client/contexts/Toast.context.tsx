import type { ReactNode } from 'react';
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from 'react';

export type ToastVariant = 'info' | 'success';

export type ToastItem = {
	id: string;
	message: string;
	variant: ToastVariant;
};

type ToastContextValue = {
	toasts: ToastItem[];
	addToast: (message: string, variant?: ToastVariant) => void;
	removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const idRef = useRef(0);
	const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

	const removeToast = useCallback((id: string) => {
		const timeout = timeoutsRef.current.get(id);
		if (timeout) {
			clearTimeout(timeout);
			timeoutsRef.current.delete(id);
		}
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
		const id = `toast-${++idRef.current}-${Date.now()}`;
		const item: ToastItem = { id, message, variant };

		setToasts((prev) => [...prev, item]);

		const timeout = setTimeout(() => {
			removeToast(id);
			timeoutsRef.current.delete(id);
		}, TOAST_DURATION_MS);
		timeoutsRef.current.set(id, timeout);
	}, [removeToast]);

	const value = useMemo<ToastContextValue>(
		() => ({ toasts, addToast, removeToast }),
		[toasts, addToast, removeToast]
	);

	return (
		<ToastContext.Provider value={value}>
			{children}
		</ToastContext.Provider>
	);
}

export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return ctx;
}
