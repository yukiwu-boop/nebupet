const { app, BrowserWindow, Tray, Menu, screen, ipcMain, dialog, nativeImage, desktopCapturer, globalShortcut } = require('electron');
const path = require('path');
const express = require('express');
const { execSync } = require('child_process');

let mainWindow;
let tray;
const WEBHOOK_PORT = 18790;
const OPENCLAW_URL = 'http://127.0.0.1:18789';

// --- Active Window Detection ---
function getActiveWindow() {
  try {
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
      end tell
      return frontApp
    `;
    return execSync(`osascript -e '${script}'`).toString().trim();
  } catch (e) {
    return '';
  }
}

// --- OpenClaw Chat ---
async function askOpenClaw(message) {
  try {
    const tokenLine = execSync("grep -o '\"token\": *\"[^\"]*\"' ~/.openclaw/openclaw.json | head -1").toString();
    const token = tokenLine.match(/"token": *"([^"]*)"/)?.[1] || '';

    const res = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: [{ role: 'user', content: message }],
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.error('[OpenClaw] Chat failed:', e.message);
    return '';
  }
}

// --- OpenClaw Webhook Server ---
const webhookApp = express();
webhookApp.use(express.json());

webhookApp.get('/health', (req, res) => res.json({ status: 'Online' }));

webhookApp.post('/webhook', (req, res) => {
  const body = req.body;
  const content = body.content || body.message || body.text || (body.context && body.context.content) || '';
  const status = body.status || body.state || '';

  if (content && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pet-event', { type: 'message', content });
  }
  if (status && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pet-event', { type: 'status', status });
  }
  res.json({ status: 'ok' });
});

// --- Electron App ---
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  // Mouse events for dragging
  ipcMain.on('set-ignore-mouse', (event, ignore) => {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.handle('get-screen-size', () => {
    return screen.getPrimaryDisplay().workAreaSize;
  });

  // Get active app name
  ipcMain.handle('get-active-window', () => {
    return getActiveWindow();
  });

  // Screenshot
  ipcMain.handle('take-screenshot', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      });
      if (sources.length > 0) {
        return sources[0].thumbnail.toDataURL();
      }
    } catch (e) {
      console.error('[Screenshot] Failed:', e);
    }
    return null;
  });

  // Ask OpenClaw
  ipcMain.handle('ask-openclaw', async (_, message) => {
    return await askOpenClaw(message);
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA4ElEQVQ4T2NkoBAwUqifgWoGsP3/z8DEwMDwn4GBgRFdDMMFjP///2f8D1Tw/z8jIwMjw38GBkZkNcguwOoChv///zMyMTIy/v//n4EBpyuQXcD4H+iC/4yMDP+BLmBkYGT4/x/oAhQXEHABMAwYmYBBCnMBcBzEBf8Z2RgZGRkZkAPxPyMsEBkJ+QWbO5gxOcCoC8ZgQb8B7ogBtyAzADbQPwP9YD//v+ZGP4BXfAf4QKCQPwfxQXAQPwPcgHQFShDJC7AE4hYwoDhP9AFjDAXAF3wn4ERGQAAYWJMEVBvDGIAAAAASUVORK5CYII='
  );
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'NebuPet 🐱', enabled: false },
    { type: 'separator' },
    {
      label: '问问当前屏幕 (Cmd+Shift+Space)',
      click: () => mainWindow.webContents.send('ask-screen'),
    },
    {
      label: '截图分析 (Cmd+Shift+/)',
      click: () => mainWindow.webContents.send('analyze-screenshot'),
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setToolTip('NebuPet');
  tray.setContextMenu(contextMenu);
}

function registerShortcuts() {
  // Cmd+Shift+Space: Ask about current app
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    mainWindow.webContents.send('ask-screen');
  });

  // Cmd+Shift+/: Screenshot analysis
  globalShortcut.register('CommandOrControl+Shift+/', () => {
    mainWindow.webContents.send('analyze-screenshot');
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcuts();
  webhookApp.listen(WEBHOOK_PORT, () => {
    console.log(`[NebuPet] Webhook server on http://127.0.0.1:${WEBHOOK_PORT}`);
  });

  // Periodically detect active window and greet
  let lastApp = '';
  setInterval(() => {
    const currentApp = getActiveWindow();
    if (currentApp && currentApp !== lastApp && currentApp !== 'Electron') {
      lastApp = currentApp;
      mainWindow.webContents.send('pet-event', { type: 'app-change', app: currentApp });
    }
  }, 10000);
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
