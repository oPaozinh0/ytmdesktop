// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import { MemoryStoreSchema, StoreSchema } from "~shared/store/schema";
import MemoryStore from "../../store-ipc/memory-store";
import Store from "../../store-ipc/store";
import { WindowsEventArguments } from "~shared/types";

const store = new Store<StoreSchema>();
const memoryStore = new MemoryStore<MemoryStoreSchema>();

contextBridge.exposeInMainWorld("ytmd", {
  minimizeWindow: () => ipcRenderer.send("windowControls:minimize"),
  maximizeWindow: () => ipcRenderer.send("windowControls:maximize"),
  restoreWindow: () => ipcRenderer.send("windowControls:restore"),
  closeWindow: () => ipcRenderer.send("windowControls:close"),
  handleWindowEvents: (callback: (args: WindowsEventArguments) => void) =>
    ipcRenderer.on("windowControls:stateChanged", (event: Electron.IpcRendererEvent, args: WindowsEventArguments) => {
      callback(args);
    }),
  requestWindowState: () => ipcRenderer.send("windowControls:requestState"),

  isMainWindow: () => process.argv.includes("is-main-window"),

  openSettingsWindow: (initialTab?: number) => ipcRenderer.send("window:openSettings", initialTab),
  openMiniplayerWindow: () => ipcRenderer.send("window:openMiniplayer"),
  switchFocus: (context: string) => ipcRenderer.send("ytmView:switchFocus", context),
  ytmViewNavigateDefault: () => ipcRenderer.send("ytmView:navigateDefault"),
  ytmViewRecreate: () => ipcRenderer.send("ytmView:recreate"),
  ytmViewGoBack: () => ipcRenderer.send("ytmView:goBack"),
  ytmViewGoForward: () => ipcRenderer.send("ytmView:goForward"),
  ytmViewReload: () => ipcRenderer.send("ytmView:reload"),
  restartApplicationForUpdate: () => ipcRenderer.send("app:restartApplicationForUpdate"),

  store: {
    set: (key: string, value: unknown) => store.set(key, value),
    get: async (key: keyof StoreSchema) => await store.get(key),
    reset: (key: keyof StoreSchema) => store.reset(key),
    onDidAnyChange: (callback: (newState: StoreSchema, oldState: StoreSchema) => void) => store.onDidAnyChange(callback)
  },

  memoryStore: {
    set: (key: string, value: unknown) => memoryStore.set(key, value),
    get: async (key: keyof MemoryStoreSchema) => await memoryStore.get(key),
    onStateChanged: (callback: (newState: MemoryStoreSchema, oldState: MemoryStoreSchema) => void) => memoryStore.onStateChanged(callback)
  }
});
