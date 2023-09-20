# Battle Music Intensity Regulator

## About
Music is important in everything we do.
 When playing a boardgame, you want to be as immersed as possible,
and many random playlist on youtube are a mish-mash of different energies.
I wanted to have manual control over the mood of the game,
and later I decided to try and automate this for Gloomhaven. 

Built using:
[Electron](https://www.electronjs.org/)
[Svelte](https://svelte.technology) 
[HowlerJS](https://howlerjs.com/)
[Docker](https://www.docker.com/)

*You will need to have [Node.js](https://nodejs.org) installed.*


## Usage:
First point the app to the root folder containing your intensity playlists (See example in /public)
<details>
  <summary>Folder structure</summary>

```
📦battle_music
 ┣ 📂defeat
 ┃ ┗ 📜22 - Staggering Home.mp3
 ┣ 📂intensity 1
 ┃ ┗ 📜Torment  - 011 Valley of Dead Heroes Crisis [PA83Y6klRU4].mp3
 ┣ 📂intensity 10
 ┃ ┗ 📜Combat Music Megamix - The Witcher 3 - Wild Hunt - 008 The Hunt is Coming [lAGm9MTyRJ8].mp3
 ┣ 📂intensity 2
 ┃ ┗ 📜20 Stellar Battle.mp3
 ┣ 📂intensity 3
 ┃ ┗ 📜Oblivion Music - Daedra in Flight [afI9Mp_EuhE].mp3
 ┣ 📂intensity 4
 ┃ ┗ 📜Pillars of Eternity Soundtrack (Full) - 021 Combat C [mmAiP__OB9k].mp3
 ┣ 📂intensity 5
 ┃ ┗ 📜Pillars of Eternity Soundtrack (Full) - 020 Combat B [mmAiP__OB9k].mp3
 ┣ 📂intensity 6
 ┃ ┗ 📜06 - The Witcher 2 Score - Arena of Rage [j6xi0WQ4c-o].mp3
 ┣ 📂intensity 7
 ┃ ┗ 📜Baldur's Gate OST #- Hobgoblins and Worgs [lofCsfTEVzY].mp3
 ┣ 📂intensity 8
 ┃ ┗ 📜Icewind Dale II _ Full Soundtrack - 014 Roar of the White Dragon [22bd9soyRIA].mp3
 ┣ 📂intensity 9
 ┣ 📂Preparation
 ┃ ┗ 📜Three Ships [E-_It3orpFI].mp3
 ┣ 📂town
 ┃ ┗ 📜The inn at the Black Boar.mp3
 ┗ 📂victory
 ┃ ┗ 📜040 Triumph [m_isAVgI3KE].mp3
```

</details>

-Choose an intensity level and press play
-When Playing press any level to switch to it

If you want to enable integration with a python client listening to "Gloomhaven Helper" in a docker container:
After Installing Docker:
```bash
docker pull funkey7dan/myvimage
```

If you want to start docker through the app, change the path in the main.js.
*Note: the music track changes immediately if the current track has more than 60 seconds left to prevent jarring transitions.
## Demo

<vid>
  
After the round finishes (We press "next round" in GloomhavenHelper) the new intensity is calculated.
In the video we jump from 4 to 7 and the music changes accordingly.
 
https://github.com/funkey7dan/battle_music_player/assets/72495653/af346ce3-3878-41cd-818b-e8559eba4b8f

</vid>

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

## Acknowledgements
Special thank to  Robin Grönberg for publishing his Gloomhaven helper client and making this project possible:
https://github.com/Gronis/gloomhaven-helper-rfid


