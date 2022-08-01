<script>
	/**##################### IMPORTS ######################*/
	import {
		Button,
		ButtonGroup,
		Container,
		Col,
		Row,
		Progress,
	} from "sveltestrap";
	import { createEventDispatcher } from "svelte";
	import { Howl, Howler } from "howler";

	/**##################### DECLARATIONS ######################*/

	//const { dialog } = require("electron").dialog;
	//console.log(dialog);

	var isPlaying = false;
	var myInterval;
	Howler.preload = true;
	var filelist;
	var sound = new Howl({
		src: ["track.mp3"],
		onplay: function () {
			myInterval = setInterval(() => {
				requestAnimationFrame(updateProgress);
			}, 100);
		},
	});
	let seekStatus = sound.seek() || 0;
	let timerLeft = sound.duration();
	let trackProgress = (sound.seek() / sound.duration()) * 100 || 0;
	sound.on("end", function () {
		isPlaying = false;
		trackProgress = 100;
		clearInterval(myInterval);
	});

	/**##################### FUNCTIONS ######################*/

	function playSound() {
		isPlaying = true;
		//console.log(sound);
		sound.play();
	}

	function pauseSound() {
		isPlaying = false;
		sound.pause();
	}

	function playNext() {
		dialog.showOpenDialog({
			properties: ["openFile", "multiSelections", "showHiddenFiles"],
			filters: [
				{ name: "CSV files", extensions: ["csv"] },
				{ name: "All Files", extensions: ["*"] },
			],
			message: "Select a CSV file to open",
			defaultPath: `${__dirname}/samples`,
		});
	}

	function updateProgress() {
		if (sound.playing()) {
			seekStatus = sound.seek() || 0;
			trackProgress = (seekStatus / sound.duration()) * 100 || 0;
			timerLeft = sound.duration() - seekStatus;
			//console.log(trackProgress);
		}
	}

	import Buttons from "./Buttons.svelte";
	let dialog = window.dialog;
	const ipc = require("electron").ipcRenderer;

	ipc.on("music_files", function (event, arg) {
		console.log(event);
		filelist = arg;
		console.log("ipc got " + arg);
	});

	function handleMessage(event) {
		//alert(event.detail);
		//console.log(filelist);
		const src = filelist.find((s) => {
			//console.log(s);
			return s.name === event.detail;
		}).trackList[0];
		console.log(src);
		sound = new Howl({
			src: [src],
			onplay: function () {
				myInterval = setInterval(() => {
					requestAnimationFrame(updateProgress);
				}, 100);
			},
		});
		//console.log(event.detail);
	}
</script>

<main>
	<h1>REMINDER! i'm not empty</h1>
	<Container fluid>
		<Row>
			<Container>
				<Row>
					<Col>{Math.round(seekStatus)}</Col>
					<Col>{Math.round(timerLeft)}</Col>
				</Row>
				<Progress
					color="danger"
					bind:trackProgress
					on:click={(e) => console.log(e)}
				/>

				<br />
				<ButtonGroup>
					<Button>Prev</Button>
					{#if isPlaying}
						<Button on:click={pauseSound}>Pause</Button>
					{:else}
						<Button on:click={playSound}>Play</Button>
					{/if}
					<Button on:click={playNext}>Next</Button>
				</ButtonGroup>
			</Container>
		</Row>
		<br />
		<Row>
			<Buttons on:play={handleMessage} />
		</Row>
	</Container>
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
