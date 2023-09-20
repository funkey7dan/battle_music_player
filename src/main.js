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
// writes logs to AppData\Roaming\BMIR\logs
const log = require('electron-log');
const { count } = require('console');
log.info('Log from the main process');

var dockerStarted;
var scenLevel;
var parsed;
var parsedObj;
var old_parsedObj;
var docker = new Docker();
var child;
var container;
var enableDocker;
var scriptOutput = "";
var monsterProps;
var playerProps;
var monstersN;
var playersN;
var scenario_number;
var round;
var isSfx;
var currIntensity = 0;
var roundChanged = false;

// client object that will be sent to the docker container, contains the host and port of the client aquired from the config file
var client =
{
    'clientHost': "",
    'clientPort': "",
}

var isDev = process.env.APP_DEV ? (process.env.APP_DEV.trim() == "true") : false;

if (store.has('docker')) {
    enableDocker = store.get('docker')
    console.log("loaded docker settings from storage" + enableDocker); log.info("loaded docker settings from storage" + enableDocker)
}

if (isDev) {
    console.log("Dev mode"); log.info("Dev mode")
    //store.clear();
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '../node_modules', '.bin', 'electron'),
        awaitWriteFinish: true,
    });
}

var musicPath // the path of the music library
var narrationPath // the path of the narration library
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
            {
                label: 'Narration', accelerator: 'CommandOrControl+n', click: function () {
                    openNarrationDialog();
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
            contextIsolation: false,
            devTools: isDev,
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

const docker_run = () => {
    return spawn('docker', ['run', '--rm', '--name', 'temp', 'funkey7dan/myvimage', "bash", "-c", "python3 -u client.py " + client.clientHost + " " + client.clientPort]);
}


const gameListen = () => {
    //check if docker is running:
    try {
        execSync("docker ps");
    }
    catch (e) {
        if (e.toString().includes("daemon is not running")) {
            console.log("docker is not running"); log.info("docker is not running");

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
    //child = spawn('docker', ['run', '--rm', '--name', 'temp', 'funkey7dan/myvimage', "bash", "-c", "python3 -u client.py " + client.clientHost + " " + client.clientPort]);
    child = docker_run();
    container = docker.getContainer('temp');
    dockerStarted = true;

    child.on('close', function (code) {
        //Here you can get the exit code of the script
        // if the container is running kill it and retry
        console.log('closing code: ' + code); log.info('closing code: ' + code);
        if (code === 125 || code === '125') {

            try {
                container.kill();
            }
            catch (e) {
                console.error(e); log.error(e);
            }
            //child = spawn('docker', ['run', '--rm', '--name', 'temp', 'myvimage', "bash", "-c", "python3 -u my_test.py"]);
            child = docker_run();
        }
        //console.log('Full output of script: ', scriptOutput); log.info('Full output of script: ', scriptOutput);
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', function (data) {
        //Here is where the output goes
        //console.log('stdout: ' + data); log.info('stdout: ' + data);
        data = data.toString()
        timestamp = new Date().toLocaleString()
        //fs.writeFileSync('./docker_log.txt', timestamp + '\n' + data);
        fs.appendFileSync('./docker_log.txt', timestamp + '\n' + data);
        scriptOutput += data;
        if (scriptOutput.includes('###')) {

            scriptOutput = scriptOutput.replace(/monster ability deck: id: ([0-9]+)/g, "monster ability deck: id $1")
            //parsed = parse(scriptOutput);
            try {
                parsed = parser.parse(scriptOutput);
            } catch (error) {
                console.error(error);
                try {
                    timestamp = new Date().toLocaleString()
                    //fs.writeFileSync('./error.txt', error.toString());
                    //fs.writeFileSync('./error.txt', scriptOutput.toString());
                    fs.writeFileSync('./error.txt', timestamp + '\n' + error.toString() + '\n' + scriptOutput.toString());
                    log.error(error);
                    // file written successfully
                } catch (err) {
                    console.error(err);
                }
                return;
            }
            // pegjs returns an array of arrays, the first array contains the parsed objects, the second contains a counter
            // we remove the duplicates from the first array
            parsed[0] = Array.from(new Set(parsed[0]));

            // we now have a list of objects, and some strings.
            // we need to reduce the list of objects to a single object, where the keys are the properties, and the values are arrays of the values of the property
            // Accumulator is the object we're building, curr is the current object in the list, 
            // the pairs are for example 'actor' : {type:'player', properties: {...}}
            parsedObj = parsed[0].reduce((accumulator, curr) => {
                if (typeof (curr) === 'string') {
                    return accumulator;
                }
                //get the key of the object
                let k = Object.keys(curr)[0];

                // if the key is already in the accumulator, merge the values
                if (!(k in accumulator)) {
                    accumulator[k] = [curr[k]]
                }
                else {
                    if (!(Array.isArray(accumulator[k]))) {
                        accumulator[k] = [accumulator[k]];
                    }
                    //if (!(accumulator[k].includes(curr[k]))) accumulator[k].push(curr[k]);
                    if (!accumulator[k].some(val => JSON.stringify(val) === JSON.stringify(curr[k]))) {
                        accumulator[k].push(curr[k]);
                    }
                }
                return accumulator;
            }, {});
            // we compare the saved old parsed object to the new one, to see if there are any changes. Here we can also monitor specific changes (for example, if a monster is DOOMED)
            compareParsed();
            old_parsedObj = parsedObj;

            // we consume the parsed object, and calculate the intensity based on it
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

    /**
     * Compares the old and new parsed objects, and updates the intensity object accordingly
     * @param {*} obj1 the old parsed object
     * @param {*} obj2 the new parsed object
     * @returns object with the differences between the two objects,where the key is the property, and the value is an object with the values of the property in the two objects
     */
    function deepDiff(obj1, obj2) {
        const differences = {};

        // Check for properties in obj1 that are not in obj2
        for (const prop in obj1) {
            if (!(prop in obj2)) {
                differences[prop] = { obj1: obj1[prop], obj2: undefined };
            }
        }

        // Check for properties in obj2 that are not in obj1
        for (const prop in obj2) {
            if (!(prop in obj1)) {
                differences[prop] = { obj1: undefined, obj2: obj2[prop] };
            }
        }

        // Check for properties that have different values
        for (const prop in obj1) {
            if (prop in obj2) {
                if (typeof obj1[prop] === "object" && typeof obj2[prop] === "object") {
                    // Recurse on nested objects
                    const nestedDiff = deepDiff(obj1[prop], obj2[prop]);
                    if (Object.keys(nestedDiff).length > 0) {
                        differences[prop] = nestedDiff;
                    }
                } else if (obj1[prop] !== obj2[prop]) {
                    differences[prop] = { obj1: obj1[prop], obj2: obj2[prop] };
                }
            }
        }

        return differences;
    }


    function compareParsed() {
        // if there is a previous parsed object and it's not the same as the current one
        if (old_parsedObj && parsedObj != old_parsedObj) {
            // diff will contain the differences between the two objects as a nested object,

            // with the keys being the changed value, and the values being the old and new values
            diff = deepDiff(old_parsedObj, parsedObj)

            // if a monster instance was changed
            if ('instance' in diff) {
                // iterate over the instances that changed
                for (i in diff['instance']) {

                    // if there are new conditions added in this instance
                    if (diff['instance'][i]
                        && diff['instance'][i][5]
                        && diff['instance'][i][5]['list']
                        && parsedObj['instance'][i][5]['list'].length > old_parsedObj['instance'][i][5]['list'].length) {
                        // count the number of occurences of the value we're looking for
                        let counter = 0
                        // iterate over the changed conditions
                        for (j in diff['instance'][i][5]['list']) {
                            // value13 is the "doom" condition
                            if (diff['instance'][i][5]['list'][j]['obj2'] == 'value13') {
                                counter++;
                            }
                            if (diff['instance'][i][5]['list'][j]['obj1'] == 'value13') {
                                counter--;
                            }
                        }

                        // if the number of occurences is odd, it was added
                        if (counter > 0 && counter % 2 == 1) {
                            // play sound
                            mainWindow.webContents.send("playEffect", 'doom');
                        }
                    }
                }
            }
            if ('round' in diff) {
                roundChanged = true;
            }
        }
    }

    function consumeParsed() {
        // if the scenario number changed or wasn't, update the scenario number to be displayed
        if (scenario_number != parsedObj["scen nr"]) {
            scenario_number = parsedObj["scen nr"][0];
        }
        if (scenario_number) mainWindow.webContents.send("scenario", parseInt(scenario_number));

        // the actors aren't always in the same order, so we need to filter them by type, and then map them to an array of objects
        var actors = parsed[0]
            .filter(element => element["actor"])
            .map(x => x['actor'])
            .map(x => {
                var obj = {};
                obj[x['type']] = x['properties'];
                return obj;
            }
            )
        // wind all the types of monsters in the scenario
        var monsterIndices = getAllIndexes(parsed[0], 'monster');
        // for each monster type, get an object with the number of instances, and an array of the instances
        monsterProps = monsterIndices.map(x => {
            let i = 2;
            let arr = [];

            let ID = parsed[0][x]['monster']['properties']['content'][0]['id'];
            let monsterName = MonsterName.values[ID];


            while (parsed[0][x + i]['instance']) {
                // takes all the properties of the instance object, and puts them in a new object
                var yourObject = Object.assign({}, ...parsed[0][x + i]['instance']); //
                // load the difficulty of the monster from the constants file
                yourObject['difficullty'] = MonsterRating[monsterName];
                //
                arr.push(yourObject);
                i++;

            }
            // create an object with the number of instances of the monster, and the array of the instances
            let obj = {}
            obj['instances'] = (i - 2);
            obj[monsterName] = arr;
            return obj;
        })

        playerProps = mapPlayer(actors.filter(x => x['player']));
        // get actor counts
        monstersN = monsterProps.reduce((prev, curr) => prev += curr['instances'], 0);
        playersN = playerProps.length;
        // find the round number from the round string
        round = parsed[0].find(x => { if (typeof (x) === 'string' && x.includes('round')) return x; }).match(/round ([0-9]+)/)[1]
    }


    function calculateIntensity() {

        if (monstersN == 0) {
            mainWindow.webContents.send("intensity_change", 1);
            console.log("No Enemies,Intensity set: " + 1); log.info("No Enemies,Intensity set: " + 1)
            return;
        }
        scenLevel = parseInt(parsedObj['scen lvl']);
        let out = 0;
        let boss = false;
        let ELITE_MODIFIER = 1.25;

        //generate an array on ratios of monster hp weight, if monster is elite increase value
        let monsterRatios = monsterProps.map(curr => {

            // get the key of the monster object, which is the monster name
            let k = Object.keys(curr)[1];
            // get the array of instances of the monster
            let instanceArr = curr[k];
            // map the array of instances to an array of "how badly hurt is this monster"
            return instanceArr.map((curr, index, arr) => {
                if (curr.type === 'Boss') {
                    boss = true;
                }
                let mult;
                mult = (curr.type === 'Elite') ? ELITE_MODIFIER : 1; // apply multiplier for elites
                if (curr.difficullty !== undefined) {
                    mult += parseFloat(curr.difficullty);
                }
                return mult * (parseInt(curr.hp) / parseInt(curr.hp_max));
            });
        })
        //generate an array on ratios of player hp
        let playerRatios = playerProps.map(curr => {
            return (parseInt(curr.hp) / parseInt(curr.hp_max));
        })
        // calculate averages of monsters and players hp's
        let playersVar = playerRatios.reduce((p, c) => p += (c), 0) / playersN;

        let monstersVar = monsterRatios.reduce((p, c) =>
            p += (c.reduce((p, c) => p += c, 0)), 0) / monstersN;

        // evil floating point bit level hacking
        // what the fuck?
        out = 0.1 * (1.2 ** round) + 0.4 * (12 - 10 * playersVar) + 0.5 * (1.2 * monstersVar ** 1.75);
        out = Math.round(out);
        // if a boss is present, the intensity is 10 automatically
        if (boss) out = 10;
        // the intensity is at least 1
        else out = Math.max(Math.min(9, out), 1);
        if (out === currIntensity) return;

        if (roundChanged) {
            mainWindow.webContents.send("intensity_change", out);
            currIntensity = out;
            console.log("Intensity set: " + out); log.info("Intensity set: " + out)
            roundChanged = false;
        }
    }


}

const loadSettings = () => {
    if (store.has('folder')) {
        musicPath = store.get('folder')
        console.log("loaded folder path from storage" + musicPath); log.info("loaded folder path from storage" + musicPath)
        mainWindow.webContents.send("file_path", musicPath)
    }
    if (store.has('narration')) {
        narrationPath = store.get('narration')
        console.log("loaded narration path from storage" + narrationPath); log.info("loaded narration path from storage" + narrationPath)
        mainWindow.webContents.send("narration_path", narrationPath)
    }
}

// function for the open folder menu item
const openFolderDialog = () => {
    if (!(musicPath = dialog.showOpenDialogSync({ properties: ['openDirectory'] }))) return;// if canceled or didn't choose
    else musicPath = musicPath[0];
    //console.log(musicPath); log.info(musicPath)
    store.set('folder', musicPath);
    //storage.set('folder', musicPath)
    mainWindow.webContents.send("file_path", musicPath)

}

// function for the open folder menu item
const openNarrationDialog = () => {
    if (!(narrationPath = dialog.showOpenDialogSync({ properties: ['openDirectory'] }))) return;// if canceled or didn't choose
    else narrationPath = narrationPath[0];
    //console.log(musicPath); log.info(musicPath)
    store.set('narration', narrationPath);
    //storage.set('folder', musicPath)
    mainWindow.webContents.send("narration_path", narrationPath)
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
    console.log(client); log.info(client);
}