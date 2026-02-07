import type { GetServerSideProps } from "next"
import OrdersLayout from "@/layouts/OrdersLayout/OrdersLayout"
import type { Order } from "@kds/shared"

export type IndexPageProps = {
  initialOrders?: Order[]
  initialSimulationStatus?: { isRunning: boolean }
}

export const getServerSideProps: GetServerSideProps<IndexPageProps> = async () => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  try {
    const [ordersRes, simRes] = await Promise.all([
      fetch(`${API_URL}/orders`),
      fetch(`${API_URL}/simulation/status`),
    ])
    const initialOrders = ordersRes.ok ? await ordersRes.json() : undefined
    const simData = simRes.ok ? await simRes.json() : undefined
    const initialSimulationStatus =
      simData != null && typeof simData.isRunning === "boolean"
        ? { isRunning: simData.isRunning }
        : undefined
    return {
      props: {
        initialOrders: initialOrders ?? undefined,
        initialSimulationStatus,
      },
    }
  } catch {
    return { props: {} }
  }
}

export default function Index({ initialSimulationStatus }: IndexPageProps) {
  return <OrdersLayout initialSimulationStatus={initialSimulationStatus} />
}
