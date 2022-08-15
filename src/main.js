// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, Menu, ipcMain } = require('electron')
const { Howl, Howler } = require("howler")

const path = require('path')
const fs = require('fs')
//const storage = require('electron-json-storage')
const Store = require('electron-store');
const store = new Store();
const spawn = require('child_process').spawn;
const execSync = require('child_process').execSync;
const Docker = require('dockerode');
const parser = require("./parser");
MonsterName = {
    values: ["Ancient Artillery", "Bandit Archer", "Bandit Guard", "Black Imp", "Cave Bear", "City Archer", "City Guard", "Cultist", "Deep Terror", "Earth Demon", "Flame Demon", "Frost Demon", "Forest Imp", "Giant Viper", "Harrower Infester", "Hound", "Inox Archer", "Inox Guard", "Inox Shaman", "Living Bones", "Living Corpse", "Living Spirit", "Lurker", "Ooze", "Night Demon", "Rending Drake", "Savvas Icestorm", "Savvas Lavaflow", "Spitting Drake", "Stone Golem", "Sun Demon", "Vermling Scout", "Vermling Shaman", "Wind Demon", "Bandit Commander", "The Betrayer", "Captain of the Guard", "The Colorless", "Dark Rider", "Elder Drake", "The Gloom", "Inox Bodyguard", "Jekserah", "Merciless Overseer", "Prime Demon", "The Sightless Eye", "Winged Horror", "Aesther Ashblade", "Aesther Scout", "Bear - Drake Abomination", "Valrath Tracker", "Valrath Savage", "Wolf - Viper Abomination", "Human Commander", "Valrath Commander", "Manifestation of Corruption"]
};
var gameState = {
}
var parsed;
var docker = new Docker();
var child;
var container;
var enableDocker = true;
var scriptOutput = "";
var monstersN;
var playersN;
var totalN;
var round;

var isDev = process.env.APP_DEV ? (process.env.APP_DEV.trim() == "true") : false;

if (isDev) {
    console.log("Dev mode")
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
        label: 'View',
        role: 'viewMenu'
    },
    {
        label: 'Window',
        role: 'windowMenu'
    },

]
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
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
    // start docker container
    child = spawn('docker', ['run', '--rm', '--name', 'temp', 'myvimage', "bash", "-c", "python3 -u my_test.py"]);
    container = docker.getContainer('temp');
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
            }
            parsed[0] = Array.from(new Set(parsed[0]));
            consumeParsed();
            scriptOutput = "";
        }
    });

    function parse(data) {
        try {
            return parser.parse(data);
        } catch (error) {
            console.error(error);
        }
    }

    function mapPlayer(arr) {
        let seen = {}
        return (arr.map(x => {
            let content = Object.assign({}, ...x['player']['content']);
            if (seen[content['character_class']]) {
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
        var monsterProps = monsterIndices.map(x => {
            let i = 2;
            let arr = [];
            while (parsed[0][x + i]['instance']) {

                const [number, type, is_new, hp, hp_max] = parsed[0][x + i]['instance'];
                var yourObject = { number, type, is_new, hp, hp_max };
                //arr.push(parsed[0][x + i]['instance']);
                arr.push(yourObject);
                i++;

            }
            let ID = parsed[0][x]['monster']['properties']['content'][0]['id'];
            let monsterName = MonsterName.values[ID];

            let obj = {}
            obj['instances'] = (i - 2);
            obj[monsterName] = arr;
            return obj;
        })

        //var players = new Set(actors.filter(x => x['player']).map(x => x['player']['content'][1]['character_class']))

        var players = mapPlayer(actors.filter(x => x['player']));
        //var monsters = actors.filter(x => x['monster']).map(x => x['monster']['content'][0]['id']);
        monstersN = monsterProps.reduce((prev, curr) => prev += curr['instances'], 0);
        playersN = players.length;
        round = parsed[0].find(x => { if (typeof (x) === 'string' && x.includes('round')) return x; }).match(/round ([0-9]+)/)[1]
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
    // if (isDev) {
    //     storage.clear(function (error) {
    //         if (error) throw error;
    //     });
    // }
    if (store.has('folder')) {
        musicPath = store.get('folder')
        console.log("loaded folder path from storage" + musicPath)
        mainWindow.webContents.send("file_path", musicPath)
    }
    if (store.has('docker')) {
        enableDocker = store.get('docker')
        console.log("loaded docker settings from storage" + enableDocker)
    }
    // storage.has('folder', function (error, hasKey) {
    //     if (error) console.error(error)
    //     if (hasKey) {
    //         musicPath = storage.getSync('folder')
    //         console.log("loaded folder path from storage" + musicPath)
    //         mainWindow.webContents.send("file_path", musicPath)
    //     }
    // })
    // storage.has('filelist', function (error, hasKey) {
    //     if (error) {
    //         console.error(error)
    //     }
    //     if (hasKey) {
    //         filelist = storage.getSync('filelist')
    //         mainWindow.webContents.send("music_files", filelist)
    //         console.log("loaded filelist from storage" + filelist)
    //     }
    // })
}

// function for the open folder menu item
const openFolderDialog = () => {
    if (!(musicPath = dialog.showOpenDialogSync({ properties: ['openDirectory'] }))) return;// if canceled or didn't choose
    else musicPath = musicPath[0];
    //console.log(musicPath)
    store.set('folder', musicPath);
    //storage.set('folder', musicPath)
    mainWindow.webContents.send("file_path", musicPath)

    // var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    // filelist = walkSync(null, musicPath).sort((a, b) => {

    //     return collator.compare(a.name, b.name);
    // })
    //storage.set('filelist', filelist);
    //mainWindow.webContents.send("music_files", filelist)
    //console.log(filelist)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {

    createWindow();
    loadSettings();

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
    //execSync("docker kill temp");
    //child.kill();
    app.quit()
})

app.on("before-quit", () => {
    //execSync("docker kill temp");
    //child.kill();
    container.kill();
})

// ipcMain.on("request_files", function (event, arg) {
//     console.log("received request for files ipc")
//     mainWindow.webContents.send("music_files", filelist)
// });


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.