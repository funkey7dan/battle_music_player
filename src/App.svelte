<script>
	/**##################### IMPORTS ######################*/
	import {
		Button,
		ButtonGroup,
		Container,
		Col,
		Row,
		Progress,
		Styles,
		Icon,
	} from "sveltestrap";
	import { writable } from "svelte/store";
	import { createEventDispatcher } from "svelte";
	import { get } from "svelte/store";
	import { filelist_store, current_howl } from "./stores";
	const { App } = require("electron");
	import { Howl, Howler } from "howler";
	import Marquee from "svelte-fast-marquee";
	const fs = require("fs");
	const path = require("path");
	const Store = require("electron-store");
	/**##################### DECLARATIONS ######################*/
	const store = new Store();
	let barWidth;
	let nameWidth;

	class intesityPlaylist {
		constructor(name, trackList) {
			this.name = name;
			this.trackList = trackList;
			this.index = getRandomInt(0, trackList.length - 1);
			this.played = [];
		}
	}

	class musicTrack {
		constructor(name, file, howl) {
			this.name = name;
			this.file = file;
			this.howl = howl;
		}
	}
	var isPlaying = false;

	var myInterval;
	Howler.preload = true;
	var filelist;
	filelist_store.set(filelist);

	var sound = {
		name: "track",
		file: "track.mp3",
		howl: new Howl({
			src: ["track.mp3"],
			onplay: function () {
				myInterval = setInterval(() => {
					requestAnimationFrame(updateProgress);
				}, 100);
			},
		}),
	};
	current_howl.set(sound.howl);
	let seekStatus = $current_howl.seek() || 0;
	let timerLeft = $current_howl.duration();
	// let trackProgress =
	// 	($current_howl.seek() / $current_howl.duration()) * 100 || 0;
	const trackProgress = writable(
		($current_howl.seek() / $current_howl.duration()) * 100 || 0
	);
	current_howl.subscribe((value) => {
		console.log("current track updated");
		seekStatus = $current_howl.seek() || 0;
		timerLeft = $current_howl.duration();
		$trackProgress =
			($current_howl.seek() / $current_howl.duration()) * 100 || 0;
	});

	/**##################### FUNCTIONS ######################*/
	function getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function crossfadeTracks(old, next) {
		let ms = 200;
		old.fade(1, 0, ms);
		setTimeout(() => {
			old.stop();
			old.volume(1);
		}, ms);
		//next.volume(0);
		next.play();
		next.fade(0, 1, ms);
	}
	// get time in second and format to mm:ss
	function timeFormatter(secs) {
		Math.floor(secs);
		var minutes = Math.floor(secs / 60) || 0;
		var seconds = Math.floor(secs - minutes * 60) || 0;

		return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
	}
	let prevId;
	function playSound() {
		isPlaying = true;
		//console.log(sound);
		console.log(sound.howl);
		$current_howl.on("play", function () {
			myInterval = setInterval(() => {
				requestAnimationFrame(updateProgress);
			}, 300);
		});
		current_howl.set(sound.howl);
		prevId = $current_howl.play();
		console.log("prevID = " + prevId);
	}

	function pauseSound() {
		isPlaying = false;
		$current_howl.pause();
		get(current_howl).pause();
	}

	function stopSound() {
		isPlaying = false;
		get(current_howl).stop();
	}

	function changeTrack(value) {
		if (currentIntensity) {
			currentIntensity.index =
				(currentIntensity.index + value) %
				(currentIntensity.trackList.length - 1);
			if (isPlaying) {
				const src = currentIntensity.trackList[currentIntensity.index];
				crossfadeTracks($current_howl, src.howl);
				console.log(src);
				sound = src;
				current_howl.update((n) => sound.howl);
			} else {
				const src = currentIntensity.trackList[currentIntensity.index];
				console.log(src);
				sound = src;
				current_howl.update((n) => sound.howl);
			}
		}
	}

	function updateProgress() {
		if ($current_howl.playing()) {
			seekStatus = $current_howl.seek() || 0;
			$trackProgress = (seekStatus / $current_howl.duration()) * 100 || 0;
			timerLeft = $current_howl.duration() - seekStatus;
			//console.log(trackProgress);
		}
	}

	import Buttons from "./Control.svelte";
	import { electron } from "process";
	import { randomInt } from "crypto";
	//import MyProgressBar from "./MyProgressBar.svelte";
	let dialog = window.dialog;

	const ipc = require("electron").ipcRenderer;
	// ipc.on("data_path", function (event, arg) {
	// 	storage.setDataPath(arg);
	// });

	ipc.on("music_files", function (event, arg) {
		console.log(event);
		filelist = arg;
		console.log("ipc got " + arg);
	});

	ipc.on("request_files", function (event, arg) {
		console.log("received request for files ipc");
		ipc.send("music_files", filelist);
	});

	ipc.on("file_path", function (event, arg) {
		console.log("ipc got " + arg);
		createPlaylist(arg);
		//storage.set("filelist", filelist);
		store.set("music-path", arg);
	});

	if (store.has("filelist")) {
		filelist = store.get("filelist");
		console.log("loaded filelist from storage" + filelist);
	}
	if (store.has("music-path") && !filelist) {
		createPlaylist(store.get("music-path"));
	}
	// storage.has("filelist", function (error, hasKey) {
	// 	if (error) {
	// 		console.error(error);
	// 	}
	// 	if (hasKey) {
	// 		filelist = storage.getSync("filelist");
	// 		console.log("loaded filelist from storage" + filelist);
	// 	}
	// });
	let currentIntensity;

	// received intesity change event push from controller
	function handleMessage(event) {
		// find the intesity that was pressedin the filelist
		if (currentIntensity) {
			currentIntensity.index =
				(currentIntensity.index +
					getRandomInt(0, currentIntensity.trackList.length)) %
				(currentIntensity.trackList.length - 1);
		}
		currentIntensity = filelist.find((s) => {
			return s.name === event.detail;
		});

		const src = currentIntensity.trackList[currentIntensity.index];

		if (isPlaying) {
			crossfadeTracks(get(current_howl), src.howl);
		}
		console.log(src);
		sound = src;
		current_howl.update((n) => sound.howl);
	}

	function walkSync(filelist, dir) {
		var files = fs.readdirSync(dir);
		var filelist = filelist || [];
		files.forEach(function (file) {
			let filepath = path.join(dir, file);
			if (fs.statSync(filepath).isDirectory()) {
				console.log(file);
				let temp = new intesityPlaylist(file, walkSync(null, filepath));
				filelist.push(temp);
			} else {
				if (
					file.endsWith(".mp3") ||
					file.endsWith(".m4a") ||
					file.endsWith(".wav") ||
					file.endsWith(".ogg")
				) {
					console.log(path.join(dir, file));
					filelist.push(
						new musicTrack(
							file,
							path.join(dir, file),
							new Howl({
								src: [path.join(dir, file)],
								html5: true,
								onfade: function (event) {
									console.log(event);
								},
								onend: function () {
									$trackProgress = 100;
									clearInterval(myInterval);
									changeTrack(1);
								},
							})
						)
					);
				}
			}
		});
		filelist_store.set(filelist);
		return filelist;
	}

	function createPlaylist(musicPath) {
		var collator = new Intl.Collator(undefined, {
			numeric: true,
			sensitivity: "base",
		});
		filelist = walkSync(null, musicPath).sort((a, b) => {
			return collator.compare(a.name, b.name);
		});
	}

	function seekToClick(e) {
		$current_howl.seek($current_howl.duration() * (e.offsetX / barWidth));
	}
</script>

<main>
	<Styles />
	<h1>Battle Music Intensity Regulator</h1>
	{#if currentIntensity && currentIntensity.name.replace(/\D/g, "") != ""}
		<h2>Current intesity is: {currentIntensity.name.replace(/\D/g, "")}</h2>
	{/if}

	<Container>
		<Row>
			<Container>
				<Row>
					{#if nameWidth < barWidth}
						<span bind:clientWidth={nameWidth}>{sound.name}</span>
					{:else}
						<Marquee pauseOnHover="true" speed="50">
							{sound.name}
						</Marquee>
					{/if}
				</Row>

				<Row>
					<Col sm="1" xs="1">{timeFormatter(seekStatus)}</Col>
					<Col style="width:min-content len:min-content">
						<div
							on:click={seekToClick}
							bind:clientWidth={barWidth}
							style="width:min-content len:min-content"
						>
							<Progress color="danger" value={$trackProgress} />
						</div>
						<!-- <MyProgressBar value={trackProgress} /> -->
					</Col>
					<Col sm="1" xs="1">{timeFormatter(timerLeft)}</Col>
				</Row>

				<br />
				<ButtonGroup>
					<Button on:click={() => changeTrack(-1)}>Prev</Button>
					{#if isPlaying}
						<Button on:click={pauseSound}>Pause</Button>
					{:else}
						<Button on:click={playSound}>Play</Button>
					{/if}
					<Button on:click={() => changeTrack(1)}>Next</Button>
				</ButtonGroup>
			</Container>
		</Row>
		<Container>
			<Row>
				<Col sm="1" xs="1">
					<Icon name="volume-down-fill" />
				</Col>
				<Col
					><input
						on:input={(e) =>
							$current_howl.volume(e.target.valueAsNumber)}
						type="range"
						max="1"
						min="0"
						step="0.1"
					/>
				</Col>
				<Col sm="1" xs="1">
					<Icon name="volume-up-fill" />
				</Col>
			</Row>
		</Container>

		<br />
		<Row>
			<Buttons on:play_message={handleMessage} />
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
		font-size: 4vh;
		font-weight: 100;
	}
	h2 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 2vh;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
