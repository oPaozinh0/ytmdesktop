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
  setAlwaysOnTopWindow: (alwaysOnTop: boolean) => ipcRenderer.send("windowControls:setAlwaysOnTop", alwaysOnTop),
  handleWindowEvents: (callback: (args: WindowsEventArguments) => void) =>
    ipcRenderer.on("windowControls:stateChanged", (event: Electron.IpcRendererEvent, args: WindowsEventArguments) => {
      callback(args);
    }),
  requestWindowState: () => ipcRenderer.send("windowControls:requestState"),

  playerStore: {
    getState: async () => {
      return await ipcRenderer.invoke("playerStateStore:getState");
    },
    handleStateChanged: (callback: (state: unknown) => void) =>
      ipcRenderer.on("playerStateStore:stateChanged", (event: Electron.IpcRendererEvent, state: unknown) => {
        callback(state);
      })
  },
  executeCommandInYTMView: (command: string, ...args: unknown[]) => {
    ipcRenderer.send("remoteControl:execute", command, ...args);
  },
  setSleepTimer: (option: number | "end_of_track") => {
    ipcRenderer.send("sleepTimer:set", option);
  },
  setCompactMode: (compact: boolean) => {
    ipcRenderer.send("miniplayer:setCompactMode", compact);
  },

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
  },

  isWayland: () => {
    // Vite overwrites "process.env" calls
    const runtimeProcess = process;
    return runtimeProcess.platform === "linux" && (!!runtimeProcess.env.WAYLAND_DISPLAY || runtimeProcess.env.XDG_SESSION_TYPE === "wayland")
  }
});
