// Fills in the Chrome extension APIs Electron doesn't implement.
//
// Electron ships chrome.webRequest, chrome.storage.local, chrome.runtime and a slice of
// chrome.tabs, but content blockers also touch browserAction/action, contextMenus, webNavigation
// and privacy. Without them their background page throws on startup and never gets as far as
// registering its request listeners, so the extension loads but blocks nothing.
//
// The stubs below are deliberately inert: they exist so startup gets past them, not to make the
// features work. Badges, context menus and popups genuinely don't exist here.
if (location.protocol === "chrome-extension:") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalScope = globalThis as any;
  const chromeApi = globalScope.chrome;

  if (chromeApi) {
    const noop = (): undefined => undefined;
    const asyncNoop = (...args: unknown[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === "function") callback();
      return Promise.resolve();
    };
    const eventStub = () => ({
      addListener: noop,
      removeListener: noop,
      hasListener: () => false,
      hasListeners: () => false,
      addRules: noop,
      removeRules: noop,
      getRules: noop
    });

    const actionStub = {
      setIcon: asyncNoop,
      setTitle: asyncNoop,
      setBadgeText: asyncNoop,
      setBadgeBackgroundColor: asyncNoop,
      setBadgeTextColor: asyncNoop,
      setPopup: asyncNoop,
      getPopup: asyncNoop,
      enable: asyncNoop,
      disable: asyncNoop,
      onClicked: eventStub()
    };

    if (!chromeApi.browserAction) chromeApi.browserAction = actionStub;
    if (!chromeApi.action) chromeApi.action = actionStub;

    if (!chromeApi.contextMenus) {
      chromeApi.contextMenus = {
        create: () => "",
        update: asyncNoop,
        remove: asyncNoop,
        removeAll: asyncNoop,
        onClicked: eventStub()
      };
    }

    if (!chromeApi.webNavigation) {
      chromeApi.webNavigation = {
        getFrame: asyncNoop,
        getAllFrames: asyncNoop,
        onBeforeNavigate: eventStub(),
        onCommitted: eventStub(),
        onDOMContentLoaded: eventStub(),
        onCompleted: eventStub(),
        onErrorOccurred: eventStub(),
        onCreatedNavigationTarget: eventStub(),
        onHistoryStateUpdated: eventStub(),
        onReferenceFragmentUpdated: eventStub()
      };
    }

    if (!chromeApi.privacy) {
      const setting = {
        get: (_details: unknown, callback?: (result: unknown) => void) => {
          const result = { value: false, levelOfControl: "not_controllable" };
          if (typeof callback === "function") callback(result);
          return Promise.resolve(result);
        },
        set: asyncNoop,
        clear: asyncNoop,
        onChange: eventStub()
      };

      chromeApi.privacy = {
        network: { networkPredictionEnabled: setting, webRTCIPHandlingPolicy: setting },
        websites: { hyperlinkAuditingEnabled: setting, referrersEnabled: setting },
        services: { autofillAddressEnabled: setting }
      };
    }

    if (!chromeApi.permissions) {
      chromeApi.permissions = {
        contains: (_details: unknown, callback?: (result: boolean) => void) => {
          if (typeof callback === "function") callback(true);
          return Promise.resolve(true);
        },
        request: (_details: unknown, callback?: (result: boolean) => void) => {
          if (typeof callback === "function") callback(false);
          return Promise.resolve(false);
        },
        remove: asyncNoop,
        getAll: asyncNoop,
        onAdded: eventStub(),
        onRemoved: eventStub()
      };
    }

    if (chromeApi.storage) {
      // Extensions expect sync storage to exist even when the user isn't signed in anywhere
      if (!chromeApi.storage.sync) chromeApi.storage.sync = chromeApi.storage.local;

      // Read by content blockers to pick up enterprise policy, always empty here
      if (!chromeApi.storage.managed) {
        chromeApi.storage.managed = {
          get: (_keys: unknown, callback?: (items: unknown) => void) => {
            if (typeof callback === "function") callback({});
            return Promise.resolve({});
          },
          set: asyncNoop,
          remove: asyncNoop,
          clear: asyncNoop,
          onChanged: eventStub()
        };
      }
    }

    if (chromeApi.tabs) {
      const tabStub = { id: -1, url: "", windowId: -1, active: false, index: -1 };
      if (!chromeApi.tabs.get) {
        chromeApi.tabs.get = (_tabId: number, callback?: (tab: unknown) => void) => {
          if (typeof callback === "function") callback(tabStub);
          return Promise.resolve(tabStub);
        };
      }
      if (!chromeApi.tabs.create) chromeApi.tabs.create = asyncNoop;
      if (!chromeApi.tabs.remove) chromeApi.tabs.remove = asyncNoop;
      if (!chromeApi.tabs.insertCSS) chromeApi.tabs.insertCSS = asyncNoop;
      if (!chromeApi.tabs.removeCSS) chromeApi.tabs.removeCSS = asyncNoop;
      if (!chromeApi.tabs.onCreated) chromeApi.tabs.onCreated = eventStub();
      if (!chromeApi.tabs.onUpdated) chromeApi.tabs.onUpdated = eventStub();
      if (!chromeApi.tabs.onRemoved) chromeApi.tabs.onRemoved = eventStub();
      if (!chromeApi.tabs.onActivated) chromeApi.tabs.onActivated = eventStub();
    }

    if (!chromeApi.windows) {
      const windowStub = { id: -1, focused: true, type: "normal", tabs: [] as unknown[] };
      chromeApi.windows = {
        WINDOW_ID_NONE: -1,
        WINDOW_ID_CURRENT: -2,
        get: (_id: number, _info: unknown, callback?: (win: unknown) => void) => {
          if (typeof callback === "function") callback(windowStub);
          return Promise.resolve(windowStub);
        },
        getCurrent: (_info: unknown, callback?: (win: unknown) => void) => {
          if (typeof callback === "function") callback(windowStub);
          return Promise.resolve(windowStub);
        },
        getAll: (_info: unknown, callback?: (wins: unknown[]) => void) => {
          if (typeof callback === "function") callback([windowStub]);
          return Promise.resolve([windowStub]);
        },
        create: asyncNoop,
        update: asyncNoop,
        remove: asyncNoop,
        onCreated: eventStub(),
        onRemoved: eventStub(),
        onFocusChanged: eventStub()
      };
    }

    if (!chromeApi.browsingData) {
      chromeApi.browsingData = { remove: asyncNoop, removeCache: asyncNoop, settings: asyncNoop };
    }

    if (!chromeApi.commands) {
      chromeApi.commands = { getAll: asyncNoop, onCommand: eventStub() };
    }

    if (!chromeApi.notifications) {
      chromeApi.notifications = {
        create: asyncNoop,
        clear: asyncNoop,
        getAll: asyncNoop,
        onClicked: eventStub(),
        onClosed: eventStub()
      };
    }

    if (!chromeApi.dns) {
      chromeApi.dns = { resolve: asyncNoop };
    }
  }
}
