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
		Toast,
		ToastBody,
	} from "sveltestrap";
	import { SvelteToast, toast } from "@zerodevx/svelte-toast";
	import { writable } from "svelte/store";
	import { get } from "svelte/store";
	import { filelist_store, current_howl, state, isSfx } from "./stores";
	import { Howl, Howler } from "howler";
	import Marquee from "svelte-fast-marquee";
	import Control from "./Control.svelte";
	const ipc = require("electron").ipcRenderer;
	const fs = require("fs");
	const path = require("path");
	const Store = require("electron-store");

	/**##################### DECLARATIONS ######################*/
	Howl.preload = true;
	Howler.preload = true;
	const store = new Store();
	let barWidth; // the width of the progress bar
	let nameWidth; // the width of the trackname
	let currentIntensityPlaylist; // a 'pointer' to the currently chosen intesityPlaylist
	let currentVolume; // save the currently set volume
	let intensityChange = ""; // a stack holding the intensity change pushes from the main app
	let isOpen = false; // boolean for notfications
	if (store.has("volume")) {
		currentVolume = store.get("volume");
	} else {
		store.set("volume", 1);
	}
	let ms;
	if (store.has("fade-ms")) {
		ms = store.get("fade-ms");
	} else {
		ms = 200;
		store.set("fade-ms", ms);
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
	// a variable to hold the initial,default sound
	var sound = {
		name: "track",
		file: "track.mp3",
		howl: new Howl({
			src: ["track.mp3"],
			autoplay: false,
			onend: function () {
				$trackProgress = 100;
				clearInterval(updateInterval);
			},
			// we set a function to update the progress-bar every 100 ms
			onplay: function () {
				isPlaying = true;
				updateInterval = setInterval(() => {
					requestAnimationFrame(updateProgress);
				}, 100);
			},
		}),
	};

	var btn_sfx = {
		menu: new Howl({
			preload: true,
			volume: $isSfx ? 1 : 0, // check if sfx sounds are enabled
			src: ["Menu_Select_00.mp3"], // the sound file path
		}),
		page: new Howl({
			preload: true,
			volume: $isSfx ? 1 : 0,
			src: ["turn_page.wav"],
		}),
		click: new Howl({
			preload: true,
			volume: $isSfx ? 1 : 0,
			src: ["click1.wav"],
		}),
	};

	var general_sfx = {
		doom: new Howl({
			preload: true,
			volume: 1, // check if sfx sounds are enabled
			src: ["doom.mp3"], // the sound file path
		}),
	};

	currentIntensityPlaylist = new intensityPlaylist("placeholder", [sound]);

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

	ipc.on("sfx", function (event, arg) {
		$isSfx = arg;
		if (!$isSfx) {
			btn_sfx.click.volume(0);
			btn_sfx.page.volume(0);
		} else {
			btn_sfx.click.volume(currentVolume);
			btn_sfx.page.volume(currentVolume);
		}
	});

	ipc.on("playEffect", function (event, arg) {
		console.log(arg);
		general_sfx[arg].play();
	});

	// on folder change we receive an event from the electron main so we update our store, and we use the passed path to build the list
	ipc.on("file_path", function (event, arg) {
		createPlaylist(arg);
	});

	ipc.on("toast", function (event, arg) {
		toast.push(arg);
	});

	ipc.on("intensity_change", function (event, arg) {
		// if the current track is less than half done, or if there is more than 1 minute left
		if ($trackProgress < 50 || timerLeft > 60) {
			if (
				currentIntensityPlaylist.name === "victory" ||
				currentIntensityPlaylist.name === "defeat"
			) {
				return;
			}
			// if there is more than 60 sec left, change intensity immediately TODO: check this
			if (timerLeft > 60) {
				handleIntensityChange(
					new CustomEvent("play_message", {
						detail: "intensity " + arg,
					})
				);
			} else {
				intensityChange = "intensity " + arg;
			}
		}
	});

	// if we have a previously saved music path rebuild the filelist from it
	if (store.has("music-path") && !filelist) {
		createPlaylist(store.get("music-path"));
	}

	/**##################### FUNCTIONS ######################*/

	function mod(n, m) {
		return ((n % m) + m) % m;
	}

	function getRandomInt(min, max) {
		if (min === max) {
			return min;
		}
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	// function crossfadeTracks(old, next) {
	// 	if (old === next) {
	// 		return;
	// 	}
	// 	isPlaying = false;
	// 	old.fade(currentVolume, 0, ms);
	// 	setTimeout(() => {
	// 		old.stop();
	// 		old.volume(currentVolume);
	// 	}, ms);
	// 	next.volume(currentVolume);
	// 	sound.howl = next;
	// 	playSound();
	// 	next.fade(0, currentVolume, ms);
	// }

	function crossfadeTracks(old, next, src) {
		if (old === next) {
			return;
		}
		isPlaying = false;
		old.fade(currentVolume, 0, ms);
		setTimeout(() => {
			old.stop();
			old.volume(currentVolume);
		}, ms);
		next.volume(currentVolume);
		sound = src;
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
		//console.log(sound);
		$current_howl = sound.howl;
		$current_howl.volume(currentVolume);
		$current_howl.on("play", function () {
			updateInterval = setInterval(() => {
				requestAnimationFrame(updateProgress);
			}, 300);
		});
		$current_howl.on("end", function () {
			$trackProgress = 100;
			clearInterval(updateInterval);
			changeTrack(1);
		});
		console.log(sound.howl);
		prevId = $current_howl.play();
		isPlaying = true;
		console.log("prevID = " + prevId);
	}

	function pauseSound() {
		isPlaying = false;
		$current_howl.pause();
		get(current_howl).pause();
	}

	// change the track in the current intesity tracklist according to the passed value
	function changeTrack(value) {
		// if there is a push waiting to be played, play that instead
		if (intensityChange !== "") {
			// change the intensity according to the push
			handleIntensityChange(
				new CustomEvent("play_message", { detail: intensityChange })
			);
			intensityChange = "";
			return;
		}
		// if the current intensity is defined
		if (currentIntensityPlaylist) {
			// advance the index of the current playlist
			currentIntensityPlaylist.index = mod(
				currentIntensityPlaylist.index + value,
				Math.max(currentIntensityPlaylist.trackList.length - 1, 1)
			);
			var src =
				currentIntensityPlaylist.trackList[
					currentIntensityPlaylist.index
				];
			// if the music is playing during the track change,
			if (isPlaying) {
				crossfadeTracks($current_howl, src.howl, src);
			} else {
				sound = src;
			}
			console.log(src);
			$current_howl = sound.howl;
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

	function handleButtonClick(event) {
		if (event.detail === "next") {
			changeTrack(1);
		} else if (event.detail === "prev") {
			changeTrack(-1);
		} else if (event.detail === "volup") {
			$current_howl.volume(Math.min(currentVolume + 0.1, 1));
			currentVolume = Math.min(currentVolume + 0.1, 1);
			return;
		} else if (event.detail === "voldown") {
			$current_howl.volume(Math.max(currentVolume - 0.1, 0));
			currentVolume = Math.max(currentVolume - 0.1, 0);
			return;
		} else if (event.detail === "space") {
			isPlaying ? pauseSound() : playSound();
		} else if (event.detail === "page") {
			btn_sfx.page.play();
			return;
		} else if (event.detail === "click") {
			// btn_sfx.click.play();
			// return;
		}
		btn_sfx.click.play();
	}

	// received intesity change event push from controller
	function handleIntensityChange(event) {
		if (currentIntensityPlaylist != null) {
			// advance the index of the previous intesity to a random one
			currentIntensityPlaylist.index = mod(
				currentIntensityPlaylist.index +
					getRandomInt(1, currentIntensityPlaylist.trackList.length),
				Math.max(currentIntensityPlaylist.trackList.length - 1, 1)
			);
		}

		// if received intensity change push for the same level
		if (
			currentIntensityPlaylist != null &&
			event.detail === currentIntensityPlaylist.name
		) {
			console.log("Same intesity level requested, doing nothing.");
			return;
		}

		// find the name of intensity level requested in the filelist
		currentIntensityPlaylist = filelist.find((s) => {
			return s.name === event.detail;
		});

		if (currentIntensityPlaylist == null) {
			console.log(event.detail + "playlist was not found!");
			alert(event.detail + "playlist was not found!");
			return;
		}

		if (event.detail === "town") {
			$state = "town";
		} else {
			$state = "battle";
		}

		var src =
			currentIntensityPlaylist.trackList[currentIntensityPlaylist.index];
		if (isPlaying) {
			crossfadeTracks(get(current_howl), src.howl, src);
		} else {
			sound = src;
		}
		console.log(src);
		$current_howl = sound.howl;
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
					let temp = new Howl({
						src: [path.join(dir, encodeURIComponent(file))],
						html5: true,
						preload: false,
						onend: function () {
							$trackProgress = 100;
							clearInterval(updateInterval);
							changeTrack(1);
						},
						onplay: function () {
							console.log("onplay");
							updateInterval = setInterval(() => {
								requestAnimationFrame(updateProgress);
							}, 100);
						},
					});
					filelist.push(
						new musicTrack(file, path.join(dir, file), temp)
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
		$trackProgress =
			($current_howl.seek() / $current_howl.duration()) * 100 || 0;
	}
</script>

<main>
	<Container>
		<Styles />
		<SvelteToast options={{ duration: 2000, intro: { x: 250 } }} />
		<h1>Battle Music Intensity Regulator</h1>
		{#if currentIntensityPlaylist && currentIntensityPlaylist.name.replace(/\D/g, "") != ""}
			<h2>
				Current intesity is: {currentIntensityPlaylist.name.replace(
					/\D/g,
					""
				)}
			</h2>
		{:else if currentIntensityPlaylist.name === "victory"}
			<h2>WE ARE VICTORIOUS!</h2>
		{:else if currentIntensityPlaylist.name === "defeat"}
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
						<Button
							on:click={function () {
								changeTrack(-1);
								btn_sfx.click.play();
							}}>Prev</Button
						>
						{#if isPlaying}
							<Button
								on:click={function () {
									btn_sfx.click.play();
									pauseSound();
								}}>Pause</Button
							>
						{:else}
							<Button
								on:click={function () {
									btn_sfx.click.play();
									playSound();
								}}>Play</Button
							>
						{/if}
						<Button
							on:click={function () {
								changeTrack(1);
								btn_sfx.click.play();
							}}>Next</Button
						>
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
							bind:value={currentVolume}
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
				<Control
					on:play_message={handleIntensityChange}
					on:key_press={handleButtonClick}
				/>
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

	:root {
		--toastContainerTop: auto;
		--toastContainerRight: auto;
		/* --toastContainerBottom: 4rem; */
		--toastContainerLeft: calc(50vw - 8rem);
		--toastBarWidth: 0;
		--toastBackground: rgba(66, 66, 66, 0.6);
	}
</style>
