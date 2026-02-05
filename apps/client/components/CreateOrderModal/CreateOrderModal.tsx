import { useState, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { OrderStatus } from "@kds/shared";
import type { Order } from "@kds/shared";
import type { CreateOrderPayload } from "@/services/api.service";
import s from "./CreateOrderModal.module.scss";

export type CreateOrderModalProps = {
	onClose: () => void;
	onSubmit: (payload: CreateOrderPayload) => Promise<void>;
	initialOrder?: Order | null;
};

const DEFAULT_CURRENCY = "EUR";

function allowMaxTwoDecimals(value: string): boolean {
	if (value === "") return true;
	return /^\d*\.?\d{0,2}$/.test(value);
}

export function CreateOrderModal({ onClose, onSubmit, initialOrder }: CreateOrderModalProps) {
	const [customerName, setCustomerName] = useState("");
	const [itemName, setItemName] = useState("");
	const [itemQuantity, setItemQuantity] = useState(1);
	const [itemPriceEur, setItemPriceEur] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const customerNameRef = useRef<HTMLInputElement>(null);
	const itemNameRef = useRef<HTMLInputElement>(null);
	const quantityRef = useRef<HTMLInputElement>(null);
	const priceRef = useRef<HTMLInputElement>(null);

	const isEdit = !!initialOrder?._id;

	useEffect(() => {
		if (!initialOrder) return;
		setCustomerName(initialOrder.customerName ?? "");
		const first = initialOrder.items?.[0];
		if (first) {
			setItemName(first.name ?? "");
			setItemQuantity(first.quantity ?? 1);
			const amount = first.price?.amount ?? 0;
			setItemPriceEur(amount ? String(amount / 100) : "");
		} else {
			setItemName("");
			setItemQuantity(1);
			setItemPriceEur("");
		}
	}, [initialOrder]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError(null);

			const priceEur = Number.parseFloat(itemPriceEur);
			if (
				!customerName.trim() ||
				!itemName.trim() ||
				Number.isNaN(priceEur) ||
				priceEur < 0
			) {
				setError("Completa todos los campos correctamente.");
				customerNameRef.current?.focus();
				return;
			}
			if (itemQuantity < 1) {
				setError("La cantidad debe ser al menos 1.");
				quantityRef.current?.focus();
				return;
			}

			const priceEurRounded = Math.round(priceEur * 100) / 100;

			setIsSubmitting(true);
			try {
				const itemId = initialOrder?.items?.[0]?.id ?? "item-1";
				const payload: CreateOrderPayload = {
					customerName: customerName.trim(),
					...(isEdit ? {} : { status: OrderStatus.PENDING }),
					items: [
						{
							id: itemId,
							name: itemName.trim(),
							price: {
								amount: Math.round(priceEurRounded * 100),
								currency: DEFAULT_CURRENCY,
							},
							quantity: itemQuantity,
						},
					],
				};
				await onSubmit(payload);
				onClose();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Error al crear la orden");
			} finally {
				setIsSubmitting(false);
			}
		},
		[customerName, itemName, itemQuantity, itemPriceEur, onSubmit, onClose, initialOrder, isEdit]
	);

	return (
		<div
			className={s["create-modal-backdrop"]}
			onClick={onClose}
			role="presentation"
		>
			<div
				className={s["create-modal"]}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="create-order-title"
				data-cy="create-order-dialog"
			>
				<div className={s["create-modal__header"]}>
					<h2 id="create-order-title" className={s["create-modal__title"]}>
						{isEdit ? "Editar orden" : "Crear orden"}
					</h2>
					<button
						type="button"
						className={s["create-modal__close"]}
						onClick={onClose}
						aria-label="Cerrar"
						data-cy="create-order-dialog-close"
					>
						<X size={20} aria-hidden />
					</button>
				</div>
				<form
					className={s["create-modal__form"]}
					onSubmit={handleSubmit}
					noValidate
				>
					<div className={s["create-modal__body"]}>
						{error && (
							<p className={s["create-modal__error"]} role="alert">
								{error}
							</p>
						)}
						<label className={s["create-modal__label"]} htmlFor="create-order-customer">
							Nombre del cliente
							<input
								id="create-order-customer"
								name="customerName"
								type="text"
								className={s["create-modal__input"]}
								value={customerName}
								onChange={(e) => setCustomerName(e.target.value)}
								placeholder="Ej. Juan Pérez…"
								autoComplete="off"
								ref={customerNameRef}
							/>
						</label>
						<label className={s["create-modal__label"]} htmlFor="create-order-item">
							Nombre del producto
							<input
								id="create-order-item"
								name="itemName"
								type="text"
								className={s["create-modal__input"]}
								value={itemName}
								onChange={(e) => setItemName(e.target.value)}
								placeholder="Ej. Hamburguesa KDS…"
								autoComplete="off"
								ref={itemNameRef}
							/>
						</label>
						<div className={s["create-modal__row"]}>
							<label className={s["create-modal__label"]} htmlFor="create-order-quantity">
								Cantidad
								<input
									id="create-order-quantity"
									name="quantity"
									type="number"
									min={1}
									inputMode="numeric"
									className={s["create-modal__input"]}
									value={itemQuantity}
									onChange={(e) =>
										setItemQuantity(Number.parseInt(e.target.value, 10) || 1)
									}
									ref={quantityRef}
								/>
							</label>
							<label className={s["create-modal__label"]} htmlFor="create-order-price">
								Precio (€)
								<input
									id="create-order-price"
									name="price"
									type="number"
									min={0}
									step={0.01}
									inputMode="decimal"
									className={s["create-modal__input"]}
									value={itemPriceEur}
									onChange={(e) => {
										const v = e.target.value;
										if (allowMaxTwoDecimals(v)) setItemPriceEur(v);
									}}
									placeholder="Ej. 10.50…"
									ref={priceRef}
								/>
							</label>
						</div>
					</div>
					<div className={s["create-modal__footer"]}>
						<button
							type="button"
							className={s["create-modal__btn-secondary"]}
							onClick={onClose}
							disabled={isSubmitting}
						>
							Cancelar
						</button>
						<button
							type="submit"
							className={s["create-modal__btn-primary"]}
							disabled={isSubmitting}
							data-cy="create-order-submit"
						>
							{isSubmitting
								? (isEdit ? "Guardando…" : "Creando…")
								: isEdit
									? "Guardar cambios"
									: "Crear orden"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
