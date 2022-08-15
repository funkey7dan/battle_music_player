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
	} from "sveltestrap";
	import { writable } from "svelte/store";
	import { get } from "svelte/store";
	import { filelist_store, current_howl, state } from "./stores";
	import { Howl, Howler } from "howler";
	import Marquee from "svelte-fast-marquee";
	import Buttons from "./Control.svelte";
	const ipc = require("electron").ipcRenderer;
	const fs = require("fs");
	const path = require("path");
	const Store = require("electron-store");
	import { createEventDispatcher } from "svelte";
	const dispatch = createEventDispatcher();

	/**##################### DECLARATIONS ######################*/
	const store = new Store();
	let barWidth; // the width of the progress bar
	let nameWidth; // the width of the trackname
	let currentIntensity; // a 'pointer' to the currently chosen intesityPlaylist
	let currentVolume; // save the currently set volume
	let intensityChange = ""; // a stack holding the intensity changes
	if (store.has("volume")) {
		currentVolume = store.get("volume");
	} else {
		store.set("volume", 1);
	}
	var filelist; // a list of intesityPlaylists that we populate
	filelist_store.set(filelist); // svelte store to listen for changes in file list value

	/**
	 * A class to represent an intesity level
	 *
	 */
	class intensityPlaylist {
		constructor(name, trackList) {
			this.name = name;
			this.trackList = trackList;
			this.index = getRandomInt(0, trackList.length - 1);
			this.played = [];
		}
	}

	/**
	 * A class to represent a music track with metadata
	 */
	class musicTrack {
		constructor(name, file, howl) {
			this.name = name;
			this.file = file; // the path to the file
			this.howl = howl; // the howl object
		}
	}
	var isPlaying = false;

	var updateInterval; // variable to save the interval we set for the progress update, so we can clear it
	//Howler.preload = true;

	// a variable to hold the initial,default sound
	var sound = {
		name: "track",
		file: "track.mp3",
		howl: new Howl({
			src: ["track.mp3"],
			// we set a function to update the progress-bar every 100 ms
			onplay: function () {
				updateInterval = setInterval(() => {
					requestAnimationFrame(updateProgress);
				}, 100);
			},
		}),
	};

	currentIntensity = new intensityPlaylist("placeholder", [sound]);

	current_howl.set(sound.howl); // save the initial sound in a store, so we can listen for changes and access the currently playing track
	let seekStatus = $current_howl.seek() || 0; // the seek location in the track, in seconds
	let timerLeft = $current_howl.duration();
	let prevId; // the howl id of the track that started

	// another store, the precentage of the progress-bar that passed
	const trackProgress = writable(
		($current_howl.seek() / $current_howl.duration()) * 100 || 0
	);

	// subscribe to listen for track changes
	current_howl.subscribe((value) => {
		// when the track is changed updates it's progress
		seekStatus = $current_howl.seek() || 0;
		timerLeft = $current_howl.duration();
		$trackProgress =
			($current_howl.seek() / $current_howl.duration()) * 100 || 0;
	});

	// send the list of files to the controller
	ipc.on("request_files", function (event, arg) {
		ipc.send("music_files", filelist);
	});

	// on folder change we receive an event from the electron main so we update our store, and we use the passed path to build the list
	ipc.on("file_path", function (event, arg) {
		createPlaylist(arg);
		store.set("music-path", arg);
	});

	ipc.on("intensity_change", function (event, arg) {
		// if the current track is less than half done, or if there is more than 1 minute left
		//if ($trackProgress < 50 || timerLeft > 60) {
		if (
			currentIntensity.name === "victory" ||
			currentIntensity.name === "defeat"
		) {
			return;
		}
		if (timerLeft > 60) {
			handleMessage(
				new CustomEvent("play_message", { detail: "intensity " + arg })
			);
		} else {
			intensityChange = "intensity " + arg;
		}
	});

	// if we have a previously saved music path rebuild the filelist from it
	if (store.has("music-path") && !filelist) {
		createPlaylist(store.get("music-path"));
	}

	/**##################### FUNCTIONS ######################*/
	function getRandomInt(min, max) {
		if (min === max) {
			return min;
		}
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function crossfadeTracks(old, next) {
		if (old == next) {
			return;
		}
		let ms;
		if (store.has("fade-ms")) {
			ms = store.get("fade-ms");
		} else {
			ms = 200;
			store.set("fade-ms", ms);
		}
		isPlaying = false;

		old.fade(currentVolume, 0, ms);
		setTimeout(() => {
			old.stop();
			old.volume(currentVolume);
		}, ms);
		next.volume(currentVolume);
		sound.howl = next;
		playSound();
		next.fade(0, currentVolume, ms);
	}

	// get time in second and format to mm:ss
	function timeFormatter(secs) {
		Math.floor(secs);
		var minutes = Math.floor(secs / 60) || 0;
		var seconds = Math.floor(secs - minutes * 60) || 0;

		return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
	}

	function playSound() {
		isPlaying = true;
		//console.log(sound);
		console.log(sound.howl);
		$current_howl.on("play", function () {
			updateInterval = setInterval(() => {
				requestAnimationFrame(updateProgress);
			}, 300);
		});

		current_howl.set(sound.howl);
		$current_howl.volume(currentVolume);
		prevId = $current_howl.play();
		console.log("prevID = " + prevId);
	}

	function pauseSound() {
		isPlaying = false;
		$current_howl.pause();
		get(current_howl).pause();
	}

	// change the track in the current intesity tracklist according to the passed value
	function changeTrack(value) {
		if (intensityChange !== "") {
			handleMessage(
				new CustomEvent("play_message", { detail: intensityChange })
			);
			//dispatch("play_message", intensityChange);
			intensityChange = "";
			return;
		}
		if (currentIntensity) {
			currentIntensity.index =
				(currentIntensity.index + value) %
				Math.max(currentIntensity.trackList.length - 1, 1);
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

	// received intesity change event push from controller
	function handleMessage(event) {
		// find the intesity that was pressedin the filelist
		if (currentIntensity != null) {
			// advance the index of the previous intesity to a random one
			currentIntensity.index =
				(currentIntensity.index +
					getRandomInt(0, currentIntensity.trackList.length)) %
				Math.max(currentIntensity.trackList.length - 1, 1);
		}
		// find the name of intensity level requested in the filelist
		currentIntensity = filelist.find((s) => {
			return s.name === event.detail;
		});

		if (currentIntensity == null) {
			alert(event.detail + "playlist was not found!");
			return;
		}

		if (event.detail === "town") {
			$state = "town";
		} else {
			$state = "battle";
		}

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
				//console.log(file);
				let temp = new intensityPlaylist(
					file,
					walkSync(null, filepath)
				);
				filelist.push(temp);
			} else {
				if (
					file.endsWith(".mp3") ||
					file.endsWith(".m4a") ||
					file.endsWith(".wav") ||
					file.endsWith(".ogg")
				) {
					//console.log(path.join(dir, file));
					filelist.push(
						new musicTrack(
							file,
							path.join(dir, file),
							new Howl({
								src: [path.join(dir, encodeURIComponent(file))],
								html5: true,
								onfade: function (event) {
									//console.log(event);
								},
								onend: function () {
									$trackProgress = 100;
									clearInterval(updateInterval);
									changeTrack(1);
								},
								onplay: function () {
									updateInterval = setInterval(() => {
										requestAnimationFrame(updateProgress);
									}, 100);
								},
							})
						)
					);
				}
			}
		});
		if (filelist.length === 1) {
			filelist[0].howl.loop(true);
		}
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
	<Container>
		<Styles />
		<h1>Battle Music Intensity Regulator</h1>
		{#if currentIntensity && currentIntensity.name.replace(/\D/g, "") != ""}
			<h2>
				Current intesity is: {currentIntensity.name.replace(/\D/g, "")}
			</h2>
		{:else if currentIntensity.name === "victory"}
			<h2>WE ARE VICTORIOUS!</h2>
		{:else if currentIntensity.name === "defeat"}
			<h2>Defeat...</h2>
		{:else}
			<h2>Current intesity is: 0</h2>
		{/if}

		<span style="display: none" bind:clientWidth={nameWidth}
			>{sound.name}</span
		>
		<Container>
			<Row>
				<Container>
					<Row>
						<div id="name">
							<!-- {#if nameWidth < barWidth * 0.75}
							<span bind:clientWidth={nameWidth}
								>{sound.name}</span
							>
						{:else} -->
							<Marquee pauseOnHover="true" speed={0.1 * barWidth}>
								{sound.name}
							</Marquee>
							<!-- {/if} -->
						</div>
					</Row>

					<Row>
						<Col sm="1" xs="1">{timeFormatter(seekStatus)}</Col>
						<Col style="width:min-content len:min-content">
							<div
								on:click={seekToClick}
								bind:clientWidth={barWidth}
								style="width:min-content len:min-content"
							>
								<Progress
									color="danger"
									value={$trackProgress}
								/>
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
					<!-- <Col sm="1" xs="1">
					<Icon name="volume-down-fill" />
				</Col> -->
					<Col
						><input
							on:input={(e) => {
								$current_howl.volume(e.target.valueAsNumber);
								currentVolume = e.target.valueAsNumber;
							}}
							type="range"
							max="1"
							min="0"
							step="0.1"
						/>
					</Col>
					<!-- <Col sm="1" xs="1">
					<Icon name="volume-up-fill" />
				</Col> -->
				</Row>
			</Container>

			<br />
			<Row>
				<Buttons on:play_message={handleMessage} />
			</Row>
		</Container>
	</Container>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		height: 100vh;
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
