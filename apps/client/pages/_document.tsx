import { Html, Head, Main, NextScript } from "next/document"

const themeScript = `
(function() {
  var stored = localStorage.getItem('kds-theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
})();
`

export default function Document() {
	return (
		<Html lang="es">
			<Head>
				<meta name="theme-color" content="#ffffff" />
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	)
}
