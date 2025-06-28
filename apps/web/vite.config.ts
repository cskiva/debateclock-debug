import { defineConfig } from "vite"
import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		host: true, // 👈 exposes to local network
		port: 5173,
		allowedHosts: ["63b118aadb64.ngrok.app", "debate-clock-frontend.ngrok.app"]
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
})