// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, Menu, ipcMain, crashReporter } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store');
const store = new Store();
const spawn = require('child_process').spawn;
const execSync = require('child_process').execSync;
const execFile = require('child_process').execFile;
const Docker = require('dockerode');
const parser = require("./parser");
const MonsterName = require("./constants").MonsterName;
const MonsterRating = require("./constants").MonsterRating;
var dockerStarted;
var scenLevel;
var parsed;
var parsedObj;
var docker = new Docker();
var child;
var container;
var enableDocker;
var scriptOutput = "";
var monsterProps;
var playerProps;
var monstersN;
var playersN;
var round;
var isSfx;
var currIntensity;
var client =
{
    'clientHost': "",
    'clientPort': "",
}

var isDev = process.env.APP_DEV ? (process.env.APP_DEV.trim() == "true") : false;

if (store.has('docker')) {
    enableDocker = store.get('docker')
    console.log("loaded docker settings from storage" + enableDocker)
}

if (isDev) {
    console.log("Dev mode")
    //store.clear();
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '../node_modules', '.bin', 'electron'),
        awaitWriteFinish: true,
    });
}

var musicPath // the path of the music library
var filelist // list of all intensity folders
let mainWindow


class intesityPlaylist {
    constructor(name, trackList) {
        this.name = name;
        this.trackList = trackList;
    }
}

class musicTrack {
    constructor(name, file, howl) {
        this.name = name;
        this.file = file;
        this.howl = howl;
    }
}

const template = [
    // { role: 'fileMenu' }
    {
        label: 'File',
        submenu: [
            {
                label: 'Folder', accelerator: 'CommandOrControl+o', click: function () {
                    openFolderDialog();
                }
            },
            { role: 'quit' }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
        ]
    },
    {
        label: 'View',
        role: 'viewMenu'
    },
    {
        label: 'Window',
        role: 'windowMenu'
    },
    {
        label: 'Settings',
        submenu: [{
            label: "Sound effects",
            type: "checkbox",
            accelerator: "M",
            click: () => {
                isSfx = !isSfx;
                //store.set('docker', enableDocker);
                //if (!dockerStarted) gameListen();
                mainWindow.webContents.send("sfx", isSfx);
            },
        }]
    },
    {
        label: 'Listener',
        submenu: [
            {
                label: "On",
                type: "radio",
                click: () => {
                    enableDocker = true;
                    store.set('docker', enableDocker);
                    if (!dockerStarted) gameListen();
                    mainWindow.webContents.send("toast", "Docker on");
                },
                checked: enableDocker
            },
            {
                label: "Off",
                type: "radio",
                click: () => {
                    enableDocker = false;
                    store.set('docker', enableDocker);
                    try {
                        dockerStarted = false;
                        container.kill();
                    }
                    catch (e) {
                        console.error(e);
                    }
                    mainWindow.webContents.send("toast", "Docker off");
                },
                checked: !enableDocker
            },
            {
                label: "Client settings",
                click: () => {
                    let configFile;
                    if (!(configFile = dialog.showOpenDialogSync(mainWindow, {
                        defaultPath: path.join(__dirname, '..'),
                        properties: ['openFile',],
                        filters: [{ name: "Configuration Files", extensions: ['json'] }]
                    })[0])) return;
                    if (configFile) {
                        store.set("client_config", configFile);
                        loadClientConfig(configFile);
                    }
                }
            }
        ]
    },

]
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        "minWidth": 660,
        icon: __dirname + "/bard.png",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            enableRemoteModule: true,
            nodeIntegration: true,
            contextIsolation: false
        },
        //icon: path.join(__dirname + '../public/bard.ico')
    })
    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
    // Open the DevTools.
    if (isDev) {
        mainWindow.webContents.openDevTools()
    }
    if (enableDocker) {
        gameListen();
    }

}


const gameListen = () => {
    //check if docker is running:
    try {
        execSync("docker ps");
    }
    catch (e) {
        if (e.toString().includes("daemon is not running")) {
            console.log("docker is not running");

            //const child = execFile("C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe");
            const child = spawn(`C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe`, {
                detached: true,
            });
            child.unref();
        }
        else {
            console.error(e);
        }
    }


    // start docker container
    child = spawn('docker', ['run', '--rm', '--name', 'temp', 'funkey7dan/myvimage', "bash", "-c", "python3 -u client.py " + client.clientHost + " " + client.clientPort]);
    container = docker.getContainer('temp');
    dockerStarted = true;
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function (data) {
        //Here is where the output goes
        //console.log('stdout: ' + data);
        data = data.toString()
        scriptOutput += data;
        if (scriptOutput.includes('###')) {
            // if round is defined - i.e that's not the first response we received from the client
            if (round) {
                // if the round didn't change - we received push because of some values change, drop the push(no impact on intensity)
                if (scriptOutput.match(/round ([0-9]+)/)[1] === round) {
                    scriptOutput = "";
                    return
                }
            }
            scriptOutput = scriptOutput.replace(/monster ability deck: id: ([0-9]+)/g, "monster ability deck: id $1")
            //parsed = parse(scriptOutput);
            try {
                parsed = parser.parse(scriptOutput);
            } catch (error) {
                console.error(error);
                try {
                    fs.writeFileSync('./error.txt', error.toString());
                    fs.writeFileSync('./error.txt', scriptOutput.toString());
                    // file written successfully
                } catch (err) {
                    console.error(err);
                }
                return;
            }
            parsed[0] = Array.from(new Set(parsed[0]));
            consumeParsed();
            scriptOutput = "";
            calculateIntensity();
        }
    });


    // map the player objects by their class (the client listener pushes duplicates)
    function mapPlayer(arr) {
        let seen = {}
        return (arr.map(x => {
            let content = Object.assign({}, ...x['player']['content']);
            // if the class was already seen previously, ignore the entry
            if (seen[content['character_class']]) {
                //nop
            }
            else {
                seen[content['character_class']] = true;
                return content;
            }
        })).filter(x => x !== undefined);
    }


    // gets an array of objects, and a value, and returns the indexes of the objects that have a matching key to the passed value.
    function getAllIndexes(arr, val) {
        return arr.reduce(function (a, e, i) {
            if (Object.keys(e).includes(val))
                a.push(i);
            return a;
        }, []);
    }

    function consumeParsed() {

        parsedObj = parsed[0].reduce((prev, curr) => {
            if (typeof (curr) === 'string') {
                return prev;
            }
            let k = Object.keys(curr)[0];
            prev[k] = curr[k];
            return prev;
        }, {});

        var actors = parsed[0]
            .filter(element => element["actor"])
            .map(x => x['actor'])
            .map(x => {
                var obj = {};
                obj[x['type']] = x['properties'];
                return obj;
            }
            )
        var monsterIndices = getAllIndexes(parsed[0], 'monster');
        monsterProps = monsterIndices.map(x => {
            let i = 2;
            let arr = [];

            let ID = parsed[0][x]['monster']['properties']['content'][0]['id'];
            let monsterName = MonsterName.values[ID];
            while (parsed[0][x + i]['instance']) {

                //const [number, type, is_new, hp, hp_max] = parsed[0][x + i]['instance'];
                var yourObject = Object.assign({}, ...parsed[0][x + i]['instance']);
                yourObject['difficullty'] = MonsterRating[monsterName];
                //arr.push(parsed[0][x + i]['instance']);
                arr.push(yourObject);
                i++;

            }
            let obj = {}
            obj['instances'] = (i - 2);
            obj[monsterName] = arr;
            return obj;
        })

        //var players = new Set(actors.filter(x => x['player']).map(x => x['player']['content'][1]['character_class']))

        playerProps = mapPlayer(actors.filter(x => x['player']));
        //var monsters = actors.filter(x => x['monster']).map(x => x['monster']['content'][0]['id']);
        monstersN = monsterProps.reduce((prev, curr) => prev += curr['instances'], 0);
        playersN = playerProps.length;
        round = parsed[0].find(x => { if (typeof (x) === 'string' && x.includes('round')) return x; }).match(/round ([0-9]+)/)[1]
    }


    function calculateIntensity() {

        if (monstersN == 0) {
            mainWindow.webContents.send("intensity_change", 1);
            console.log("Intensity set: " + 1)
            return;
        }
        scenLevel = parseInt(parsedObj['scen lvl']);
        let out = scenLevel;
        let boss = false;
        let AVG_ROUNDS = 8;
        let ELITE_MODIFIER = 1.25;


        //generate an array on ratios of monster hp weight, if monster is elite increase value
        let monsterRatios = monsterProps.map(curr => {

            let k = Object.keys(curr)[1];
            let instanceArr = curr[k];

            return instanceArr.map((curr, index, arr) => {
                if (curr.type === 'Boss') {
                    boss = true;
                }
                let mult;
                mult = (curr.type === 'Elite') ? ELITE_MODIFIER : 1; // multiplyer for elites
                mult += parseFloat(curr.difficullty);
                return mult * (parseInt(curr.hp) / parseInt(curr.hp_max));
            });
        })
        //generate an array on ratios of monster hp
        let playerRatios = playerProps.map(curr => {
            return (parseInt(curr.hp) / parseInt(curr.hp_max));
        })
        out += playerRatios.reduce((p, c) => p -= (c / playersN), out);
        out += monsterRatios.reduce((p, c) =>
            p += (c.reduce((p, c) => p += (c), 0) / monstersN), out);
        out *= 0.5 + (round / AVG_ROUNDS)
        out = Math.floor(out);
        if (boss) out = 10;
        else out = Math.max(Math.min(9, out), 1);
        mainWindow.webContents.send("intensity_change", out);
        console.log("Intensity set: " + out)
    }

    child.on('close', function (code) {
        //Here you can get the exit code of the script
        // if the container is running kill it and retry
        console.log('closing code: ' + code);
        if (code === 125 || code === '125') {
            container.kill();
            child = spawn('docker', ['run', '--rm', '--name', 'temp', 'myvimage', "bash", "-c", "python3 -u my_test.py"]);
        }
        //console.log('Full output of script: ', scriptOutput);
    });
}

const loadSettings = () => {
    if (store.has('folder')) {
        musicPath = store.get('folder')
        console.log("loaded folder path from storage" + musicPath)
        mainWindow.webContents.send("file_path", musicPath)
    }
}

// function for the open folder menu item
const openFolderDialog = () => {
    if (!(musicPath = dialog.showOpenDialogSync({ properties: ['openDirectory'] }))) return;// if canceled or didn't choose
    else musicPath = musicPath[0];
    //console.log(musicPath)
    store.set('folder', musicPath);
    //storage.set('folder', musicPath)
    mainWindow.webContents.send("file_path", musicPath)

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {


    if (store.has('client_config')) {
        loadClientConfig(store.get("client_config"));
    }
    createWindow();
    loadSettings();
    //app.show();
    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    app.quit()
})

app.on("before-quit", () => {

    container.kill();
    dockerStarted = false;
})

function loadClientConfig(path) {
    client = JSON.parse(fs.readFileSync(path));
    console.log(client);
}