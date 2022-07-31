<script>
	import MusicPlaye from "./MusicPlaye.svelte";
	let dialog = window.dialog;
	const ipc = require("electron").ipcRenderer;
</script>

<main>
	<h1>REMINDER! i'm not empty</h1>
	<MusicPlaye />
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
		content: center;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
