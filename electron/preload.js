const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nebuPet', {
  onPetEvent: (callback) => ipcRenderer.on('pet-event', (_, data) => callback(data)),
  onLoadLive2D: (callback) => ipcRenderer.on('load-live2d', (_, path) => callback(path)),
  onUseSriteCat: (callback) => ipcRenderer.on('use-sprite-cat', () => callback()),
  onAskScreen: (callback) => ipcRenderer.on('ask-screen', () => callback()),
  onAnalyzeScreenshot: (callback) => ipcRenderer.on('analyze-screenshot', () => callback()),
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  askOpenClaw: (msg) => ipcRenderer.invoke('ask-openclaw', msg),
});
