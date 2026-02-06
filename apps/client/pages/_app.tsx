import { ToastContainer } from "@/components/Toast/ToastContainer"
import { OrdersProvider } from "@/contexts/Orders.context"
import { SoundProvider } from "@/contexts/Sound.context"
import { ThemeProvider } from "@/contexts/Theme.context"
import { ToastProvider } from "@/contexts/Toast.context"
import "@/styles/globals.scss"
import type { AppProps } from "next/app"
import Head from "next/head"
import { useEffect } from "react"
import type { IndexPageProps } from "./index"

type PageProps = IndexPageProps

const env = process.env.NODE_ENV ?? "development"

export default function App({ Component, pageProps }: AppProps<PageProps>) {
	useEffect(() => {
		console.log("🚀 Entorno:", env)
	}, [])

	return (
		<>
			<Head>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>Pink&apos;s KDS: Krazy Display Service</title>
			</Head>
			<ThemeProvider>
			<SoundProvider>
				<ToastProvider>
					<OrdersProvider initialOrders={pageProps.initialOrders} initialNow={pageProps.initialNow}>
						<Component {...pageProps} />
						<ToastContainer />
					</OrdersProvider>
				</ToastProvider>
			</SoundProvider>
		</ThemeProvider>
		</>
	)
}
