const { app, BrowserWindow, Menu, Tray, nativeImage, globalShortcut, shell, screen, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { APP_URL, ORIGIN, classifyUrl } = require('./navigation.cjs');
let win, tray, quitting = false;
let preferences = { pinned: true, startupConfigured: false };
function savePreferences() {
  fs.writeFileSync(path.join(app.getPath('userData'), 'preferences.json'), JSON.stringify(preferences));
}
function show() { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
function toggle() { if (win.isVisible() && win.isFocused()) win.hide(); else show(); }
function openExternal(url) { if (classifyUrl(url) === 'external') void shell.openExternal(url); }
function menus() {
  const actions = [
    { label: 'Mostrar Talki Mini', click: show },
    { label: 'Sempre por cima', type: 'checkbox', checked: preferences.pinned, click: item => { preferences.pinned = item.checked; win.setAlwaysOnTop(item.checked); savePreferences(); menus(); } },
    { label: 'Iniciar com o computador', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: item => { app.setLoginItemSettings({ openAtLogin: item.checked }); preferences.startupConfigured = true; savePreferences(); menus(); } },
    { label: 'Atualizar', accelerator: 'CmdOrCtrl+R', click: () => win.loadURL(APP_URL) },
    { label: 'Abrir Talki completo', click: () => openExternal(`${ORIGIN}/`) },
    { type: 'separator' },
    { label: 'Recolher', accelerator: 'CmdOrCtrl+W', click: () => win.hide() },
    { label: 'Sair do aplicativo', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
  ];
  tray?.setContextMenu(Menu.buildFromTemplate(actions));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Talki Mini', submenu: actions },
    { label: 'Editar', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
  ]));
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => win && show());
  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', () => { if (quitting) app.quit(); });
  app.on('activate', () => win && show());
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.whenReady().then(() => {
    try { preferences = { ...preferences, ...JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'preferences.json'), 'utf8')) }; } catch { /* first launch */ }
    if (app.isPackaged && !preferences.startupConfigured) {
      app.setLoginItemSettings({ openAtLogin: true });
      preferences.startupConfigured = true; savePreferences();
    }
    const area = screen.getPrimaryDisplay().workArea;
    win = new BrowserWindow({
      width: 430, height: Math.min(700, area.height - 40), minWidth: 360, minHeight: 440,
      x: area.x + area.width - 450, y: area.y + 20,
      title: 'Talki Mini', backgroundColor: '#10111b', show: false,
      alwaysOnTop: preferences.pinned, autoHideMenuBar: process.platform === 'win32',
      icon: path.join(__dirname, 'assets/icon.png'),
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, backgroundThrottling: false, partition: 'persist:talki-mini' },
    });
    if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    const ses = session.fromPartition('persist:talki-mini');
    ses.setPermissionRequestHandler((contents, permission, callback, details) => callback(permission === 'notifications' && contents === win.webContents && details.isMainFrame && classifyUrl(details.requestingUrl) === 'mini'));
    ses.setPermissionCheckHandler((contents, permission, origin, details) => permission === 'notifications' && contents === win.webContents && origin === ORIGIN && details.isMainFrame && classifyUrl(contents.getURL()) === 'mini');
    ses.on('will-download', event => event.preventDefault());
    win.webContents.on('will-attach-webview', event => event.preventDefault());
    win.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
    for (const eventName of ['will-navigate', 'will-redirect']) {
      win.webContents.on(eventName, (event, url) => {
        if (classifyUrl(url) !== 'mini') { event.preventDefault(); openExternal(url); }
      });
    }
    win.webContents.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
      if (isMainFrame && code !== -3) void win.loadFile(path.join(__dirname, 'offline.html'));
    });
    win.webContents.on('render-process-gone', () => win.loadFile(path.join(__dirname, 'offline.html')));
    win.on('close', event => { if (!quitting && tray) { event.preventDefault(); win.hide(); } });
    win.once('ready-to-show', show);
    const icon = nativeImage.createFromPath(path.join(__dirname, process.platform === 'darwin' ? 'assets/tray.png' : 'assets/icon.png')).resize({ width: 32, height: 32 });
    icon.setTemplateImage(process.platform === 'darwin');
    tray = new Tray(icon);
    tray.setToolTip('Talki Mini — suas tarefas');
    tray.on('click', show);
    menus();
    globalShortcut.register('CommandOrControl+Alt+T', toggle);
    void win.loadURL(APP_URL);
  });
}
