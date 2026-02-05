import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '@/contexts/Sound.context';
import styles from './SoundToggle.module.scss';

export function SoundToggle() {
	const { soundEnabled, toggleSound } = useSound();

	return (
		<button
			type="button"
			className={styles.btn}
			onClick={toggleSound}
			aria-label={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
			aria-pressed={!soundEnabled}
			title={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
		>
			{soundEnabled ? (
				<Volume2 className={styles.icon} size={20} aria-hidden />
			) : (
				<VolumeX className={styles.icon} size={20} aria-hidden />
			)}
		</button>
	);
}
