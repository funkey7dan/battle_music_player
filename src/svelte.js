import App from './App.svelte';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Howler } from 'howler';

const app = new App({
	target: document.body,
	props: {
		name: 'MOMONGA',
		Howler: Howler,
	}
});

export default app;