# Battle Music Intensity Regulator

A compact player to influence the mood of your tabletop game built using:
[Electron](https://www.electronjs.org/),
[Svelte](https://svelte.technology) ,
[HowlerJS](https://howlerjs.com/)

*You will need to have [Node.js](https://nodejs.org) installed.*

## Usage:
First point the app to the root folder containing your intensity playlists (See example in /public)
<details>
  <summary>Folder structure</summary>

```
📦battle_music
 ┣ 📂intensity 1
 ┃ ┗ 📜Torment  - 011 Valley of Dead Heroes Crisis .mp3
 ┣ 📂intensity 10
 ┃ ┗ 📜Combat Music Megamix - The Witcher 3 - Wild Hunt - 008 The Hunt is Coming .mp3
 ┣ 📂intensity 2
 ┃ ┗ 📜20 Stellar Battle.mp3
 ┣ 📂intensity 3
 ┃ ┗ 📜Oblivion Music - Daedra in Flight .mp3
 ┣ 📂intensity 4
 ┃ ┗ 📜Pillars of Eternity Soundtrack (Full) - 021 Combat C .mp3
 ┣ 📂intensity 5
 ┃ ┗ 📜Pillars of Eternity Soundtrack (Full) - 020 Combat B .mp3
 ┣ 📂intensity 6
 ┃ ┗ 📜06 - The Witcher 2 Score - Arena of Rage .mp3
 ┣ 📂intensity 7
 ┃ ┗ 📜Baldur's Gate OST #- Hobgoblins and Worgs .mp3
 ┣ 📂intensity 8
 ┃ ┗ 📜Icewind Dale II _ Full Soundtrack - 014 Roar of the White Dragon .mp3
 ┣ 📂intensity 9
 ┣ 📂Preparation
 ┃ ┗ 📜Three Ships .mp3
 ┗ 📂town
 ┃ ┗ 📜The inn at the Black Boar.mp3
```

</details>

Choose an intensity level and press play
When Playing press any level to switch to it

## Get started

Install the dependencies...

```bash
cd battle_music_player
npm install
```
## Development

Then start [Rollup](https://rollupjs.org) and [Electron](https://www.electronjs.org/):

```bash
npm run start
```

## Build / Deployment

To package into a portable windows Executable

```bash
npm run build
```
