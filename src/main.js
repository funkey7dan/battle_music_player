// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, Menu, ipcMain } = require('electron')
const { Howl, Howler } = require("howler")

const path = require('path')
const fs = require('fs')
const storage = require('electron-json-storage')
const Store = require('electron-store');
const store = new Store();
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
    if (process.platform !== 'darwin') app.quit()
})

// ipcMain.on("request_files", function (event, arg) {
//     console.log("received request for files ipc")
//     mainWindow.webContents.send("music_files", filelist)
// });


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.