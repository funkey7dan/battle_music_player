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
	import {
		filelist_store,
		current_howl,
		current_narration_playlist,
		current_narration, // The current narration playlist of type narrationPlaylist
		state,
		isSfx,
		narrationFilelist_store,
	} from "./stores";
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
	let narration_path; // the path to the narration folder
	let nameWidth; // the width of the trackname
	let currentIntensityPlaylist; // a 'pointer' to the currently chosen intesityPlaylist
	let currentVolume; // save the currently set volume
	let intensityChange = ""; // a stack holding the intensity change pushes from the main app
	let scenario = "default"; // the current scenario
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
	if (store.has("fade-ms")) {
		ms = store.get("fade-ms");
	} else {
		ms = 200;
		store.set("fade-ms", ms);
	}
	if (store.has("scenario")) {
		scenario = store.get("scenario");
		console.log("FROM STORE: Scenario set to " + scenario);
	}
	// the path to the base folder containing the narration files
	if (store.has("narration")) {
		narration_path = store.get("narration");
		console.log("FROM STORE: Narration path set to " + narration_path);
	}

	var filelist; // a list of intesityPlaylists that we populate
	var narrationFilelist; // a list of narration files
	narrationFilelist = get(narrationFilelist_store);
	// svelte store to listen for changes in file list value
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
	 * A class to represent an narration element(Outro,Intro etc..)
	 *
	 */
	class narrationPlaylist {
		constructor(name, trackList) {
			this.name = name;
			this.trackList = trackList;
			this.index = 0;
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

	//on narration folder change we receive an event from the electron main so we update our store
	ipc.on("narration_path", function (event, arg) {
		console.log("narration path " + arg);
		narration_path = arg;
		store.set("narration", arg);
	});

	// on scenario number change we receive an event from the electron main so we update our store, and we use the passed path to build the list
	ipc.on("scenario", function (event, arg) {
		if (scenario == arg) return;
		console.log("Received scenario push " + arg);
		scenario = arg;
		store.set("scenario", arg);
		if (narration_path) {
			console.log(arg);
			let folder;
			if (arg < 10) folder = "Campaign_00" + arg.toString();
			else if (arg >= 10 && arg < 100)
				folder = "Campaign_0" + arg.toString();
			else folder = "Campaign_" + arg.toString();
			createNarrationPlaylist(path.join(narration_path, folder));
			store.set("narration_folder", folder);
			console.log(
				"Creating Narration Playlist from " +
					path.join(narration_path, folder)
			);
		}
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

	if (store.has("narration") && store.has("scenario") && !narrationFilelist) {
		let folder;
		let arg = parseInt(store.get("scenario"));
		if (arg < 10) folder = "Campaign_00" + arg.toString();
		else if (arg >= 10 && arg < 100) folder = "Campaign_0" + arg.toString();
		else folder = "Campaign_" + arg.toString();
		// check if the folder path includes the scenario number - which means it's correct
		createNarrationPlaylist(path.join(store.get("narration"), folder));
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

	function playSound(to_play = sound) {
		//console.log(sound);
		sound = to_play;
		$current_howl = sound.howl;
		$current_howl.volume(currentVolume);
		$current_howl.on("play", function () {
			updateInterval = setInterval(() => {
				requestAnimationFrame(updateProgress);
			}, 300);
		});
		if ($state == "battle") {
			$current_howl.on("end", function () {
				$trackProgress = 100;
				clearInterval(updateInterval);
				changeTrack(1);
			});
		}
		console.log($current_howl);
		console.log("prevID = " + prevId);
		prevId = $current_howl.play();
		isPlaying = true;
	}

	function pauseSound() {
		isPlaying = false;
		$current_howl.pause();
		//get(current_howl).pause();
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

	function handleNarration(event) {
		console.log("Handling Narration"); // find the narration block with the same name as the received event, for example "Outro"
		let currentNarration = narrationFilelist.find((s) => {
			return s.name === event.detail;
		});
		console.log("Current Narration is: " + currentNarration);
		current_narration_playlist.set(currentNarration);
		playNextNarration();
	}

	function playNextNarration(index_change = 0) {
		if ($current_narration_playlist) {
			if (
				$current_narration_playlist.index >=
				$current_narration_playlist.trackList.length
			) {
				console.log(
					"Narration Ended, Index is: " +
						$current_narration_playlist.index +
						"Out of " +
						$current_narration_playlist.trackList.length
				);
				return;
			}
			// advance the index of the current playlist
			$current_narration_playlist.index += index_change;
			// prevent index from going below 0
			$current_narration_playlist.index = Math.max(
				$current_narration_playlist.index,
				0
			);
			var src =
				$current_narration_playlist.trackList[
					$current_narration_playlist.index
				];
			console.log("Narration index " + $current_narration_playlist.index);

			console.log("Set src to " + src.name);
			console.log("Playing src " + src.name);
			if (isPlaying) {
				$current_howl.stop();
			}
			playSound(src);
			//src.play();
		}
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

		if (event.tail === "town") {
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

	function walkSync(filelist_arg, dir, mode = "intensity") {
		var files = fs.readdirSync(dir);
		var filelist = filelist_arg || [];
		files.forEach(function (file) {
			let filepath = path.join(dir, file);
			if (fs.statSync(filepath).isDirectory()) {
				//console.log(file);
				let temp;
				if (mode == "intensity") {
					temp = new intensityPlaylist(
						file,
						walkSync(null, filepath)
					);
				}
				if (mode == "narration") {
					temp = new narrationPlaylist(
						file,
						walkSync(null, filepath)
					);
				}
				filelist.push(temp);
			} else {
				if (
					file.endsWith(".mp3") ||
					file.endsWith(".m4a") ||
					file.endsWith(".wav") ||
					file.endsWith(".ogg")
				) {
					//console.log(path.join(dir, file));
					let temp;

					// if we are creating the narration playlist, we need to create a Howl object for each file which will be played in sequence
					if (mode == "narration") {
						temp = new Howl({
							src: [path.join(dir, encodeURIComponent(file))],
							html5: true,
							preload: false,
							onend: function () {
								setTimeout(() => {
									playNextNarration(1);
								}, 500);
							},
						});
						// if we are creating music, we need to create a Howl object for each file which will be played in sequence from global playlist
					} else {
						temp = new Howl({
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
					}

					filelist.push(
						new musicTrack(file, path.join(dir, file), temp)
					);
				}
			}
		});
		if (filelist.length === 1) {
			filelist[0].howl.loop(true);
		}
		return filelist;
	}

	// This function creates a playlist of music files found in a given directory path
	function createPlaylist(musicPath) {
		console.log("Creating Playlist");
		// Initialize a collator object with options for sorting filenames
		var collator = new Intl.Collator(undefined, {
			numeric: true,
			sensitivity: "base",
		});
		// Call a function to recursively traverse the directory structure and return a list of file objects
		filelist = walkSync(null, musicPath)
			// Sort the list of file objects using the collator object's compare() method
			.sort((a, b) => {
				return collator.compare(a.name, b.name);
			});
		filelist_store.set(filelist);
	}

	// helper function to sort the narration tracks by name in a specific order
	function narrationSort(a, b) {
		a = a.name.toLowerCase();
		b = b.name.toLowerCase();
		// Sort by "intro"
		if (a.includes("intro") && !b.includes("intro")) {
			return -1;
		} else if (!a.includes("intro") && b.includes("intro")) {
			return 1;
		}

		// Sort by "room"
		if (a.includes("room") && !b.includes("room")) {
			return -1;
		} else if (!a.includes("room") && b.includes("room")) {
			return 1;
		}

		// Sort by "success"
		if (a.includes("success") && !b.includes("success")) {
			return -1;
		} else if (!a.includes("success") && b.includes("success")) {
			return 1;
		}

		// Sort by "outro"
		if (a.includes("outro") && !b.includes("outro")) {
			return 1;
		} else if (!a.includes("outro") && b.includes("outro")) {
			return -1;
		}

		// Sort alphabetically
		return a.localeCompare(b);
	}

	// This function creates a narration playlist object out of the existing list
	function mergeNarrationTracks() {
		let temp_filelist = [];
		// we create an object where the key is the "type of the track", and the value is an array of all the tracks relevant
		// for example Campaign_057_Room_3_1,Campaign_057_Room_3_2 should be {Room_3 : [...Room_3_1,...Room_3_2]}
		let temp_dict = {};
		const re = /(Campaign_[0-9]{3})_(Room_[0-9]|[a-zA-Z]+)/;
		narrationFilelist.forEach((narr_track) => {
			// find the match to the regex
			let found = narr_track.name.match(re);
			// the part of the track is the second match, e.g. "intro", "room", "success", "outro"
			let track_name = found[2];
			console.log(track_name);
			if (!(track_name in temp_dict)) {
				temp_dict[track_name] = [narr_track];
			} else {
				temp_dict[track_name].push(narr_track);
			}
		});

		for (const [key, value] of Object.entries(temp_dict)) {
			temp_filelist.push(new narrationPlaylist(key, value));
		}

		narrationFilelist = temp_filelist;
	}

	function createNarrationPlaylist(narrationPath) {
		console.log("Creating narration playlist from path " + narrationPath);
		var collator = new Intl.Collator(undefined, {
			numeric: true,
			sensitivity: "base",
		});
		narrationFilelist = walkSync(
			narrationFilelist,
			narrationPath,
			"narration"
		).sort((a, b) => {
			return collator.compare(a.name, b.name);
		});
		narrationFilelist.sort(narrationSort);
		mergeNarrationTracks();

		//after we have created the playlist, we set the store to the new playlist
		narrationFilelist_store.set(narrationFilelist);
		current_narration_playlist.set(narrationFilelist[0]);
		console.log(
			"current_narration_playlist set to " + narrationFilelist[0]
		);
		console.log("Narration playlist created");
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
					<Row class="justify-content-center">
						Scenario number: {scenario}
					</Row>

					<br />
					<ButtonGroup>
						<!-- PREV button-->
						<Button
							on:click={function () {
								$state == "narration"
									? playNextNarration(-1)
									: changeTrack(-1);
								btn_sfx.click.play();
								console.log("prev button clicked");
							}}>Prev</Button
						>
						{#if isPlaying}
							<Button
								on:click={function () {
									btn_sfx.click.play();
									pauseSound();
									console.log("pause button clicked");
								}}>Pause</Button
							>
						{:else}
							<!-- PLAY button-->
							<Button
								on:click={function () {
									btn_sfx.click.play();
									playSound();
								}}>Play</Button
							>
						{/if}
						<!-- NEXT button-->
						<Button
							on:click={function () {
								$state == "narration"
									? playNextNarration(1)
									: changeTrack(1);
								btn_sfx.click.play();
								console.log("next button clicked");
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
			<!-- -->
			<Row>
				<Control
					on:play_narration={handleNarration}
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
