(function () {
  'use script';

  const os = require('os');
  const fs = require('fs');
  const path = require('path');
  const electron = require('electron');
  const app = electron.app;
  const autoUpdater = electron.autoUpdater;
  const title = app.getName();
  const version = app.getVersion();
  const platform = os.platform();
  const app_config = require('./lib/config.js');
  const notifier = require('node-notifier');

  require('electron-dl')();
  require('electron-context-menu')();

  let mainWindow;
  let isQuitting = false;

  //autoUpdater.setFeedURL(`https://localhost:3000/update/${platform}?version=${version}`);

  function createMainWindow() {
    const lastWindowState = app_config.get('lastWindowState');
    const app_view = new electron.BrowserWindow({
      title: title,
      x: lastWindowState.x,
      y: lastWindowState.y,
      width: lastWindowState.width,
      height: lastWindowState.height,
      //titleBarStyle: 'hidden-inset', // Uncomment this to remove the mac titlebar.
      center: true,
      movable: true,
      resizable: true,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        plugins: true
      }
    });

    app_view.loadURL('file://' + __dirname + '/dist/index.html');

    app_view.on('close', e => {
      if (!isQuitting) {
        e.preventDefault();
        if (platform === 'darwin') {
          app.hide();
        } else {
          app.quit();
        }
      }
    });
    return app_view;
  }


  app.on('ready', () => {
    mainWindow = createMainWindow();

    const app_page = mainWindow.webContents;

    electron.Menu.setApplicationMenu(require('./lib/menu.js'));

    app_page.on('dom-ready', () => {
      mainWindow.show();
      autoUpdater.checkForUpdates();

      // Open external links in browser
      app_page.on('new-window', (e, url) => {
        e.preventDefault();
        electron.shell.openExternal(url);
      });

      // Shortcut to reload the page.
      electron.globalShortcut.register('CmdOrCtrl+R', (item, focusedWindow) => {
        if (focusedWindow) {
          mainWindow.webContents.reload();
        }
      });
      // Shortcut to go back a page.
      electron.globalShortcut.register('Command+Left', (item, focusedWindow) => {
        if (focusedWindow && focusedWindow.webContents.canGoBack()) {
          focusedWindow.webContents.goBack();
          focusedWindow.webContents.reload();
        }
      });

      // Navigate the window back when the user hits their mouse back button
      mainWindow.on('app-command', (e, cmd) => {
        if (cmd === 'browser-backward' && mainWindow.webContents.canGoBack()) {
          mainWindow.webContents.goBack();
        }
      });
    });

  });

  app.on('window-all-closed', () => {
    if (platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    mainWindow.show();
  });

  app.on('before-quit', () => {
    isQuitting = true;

    // Saves the current window position and window size to the config file.
    if (!mainWindow.isFullScreen()) {
      app_config.set('lastWindowState', mainWindow.getBounds());
    }
  });

//Auto updates
  autoUpdater.addListener("update-available", (event) => {
    notifier.notify({
      'title': 'Update available',
      'message': 'A new update is available',
      'icon': 'resources/windows/icon.ico'
    });
  });

  autoUpdater.addListener("update-downloaded", (event, releaseNotes, releaseName, releaseDate, updateURL) => {
    notifier.notify({
      'title': 'New version available',
      'message': `Version ${releaseName} is downloaded and will be automatically installed on Quit`,
      'icon': 'resources/windows/icon.ico'
    });
    autoUpdater.quitAndInstall();
    return true;
  });

  autoUpdater.addListener("error", (error) => {
    notifier.notify('error', error);
  });

  autoUpdater.addListener("checking-for-update", (event) => {
    notifier.notify("checking-for-update");
  });

  autoUpdater.addListener("update-not-available", () => {
    notifier.notify("update-not-available");
  });


  /**
   app_page.insertCSS(fs.readFileSync(path.join(__dirname, 'app.css'), 'utf8'));
   app_page.executeJavaScript(fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8'));
   */
})();