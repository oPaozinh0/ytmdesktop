export class YTMHook {
  private _ytmStateStore;
  private _ytmPlayerController;
  public get ytmStateStore(): any {
    return this._ytmStateStore;
  }
  public get ytmPlayerController(): any {
    return this._ytmPlayerController;
  }

  public init() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    // This hook is designed to capture addProvider calls which contain the dependency injection into elements within YTM
    const mapSet = Map.prototype.set;
    Object.defineProperty(Map.prototype, "set", {
      configurable: true,
      writable: true,
      value: function (key: any, value: any) {
        if (key?.name === "PLAYER_CONTROLLER_TOKEN") {
          if (value?.useClass) {
            const OriginalClass = value.useClass;

            value.useClass = new Proxy(OriginalClass, {
              construct(target, args, newTarget) {
                const instance = Reflect.construct(target, args, newTarget);
                self._ytmPlayerController = instance;
                return instance;
              },
              get(target, prop, receiver) {
                return Reflect.get(target, prop, receiver);
              }
            });
          }
        }

        if (key?.name === "STATE_STORE_TOKEN") {
          if (value?.useFactory) {
            const originalFactory = value.useFactory;

            value.useFactory = new Proxy(originalFactory, {
              apply(target, thisArg, args) {
                const instance = Reflect.apply(target, thisArg, args);
                self._ytmStateStore = instance;
                return instance;
              }
            });
          }
        }

        return mapSet.call(this, key, value);
      }
    });
  }

  private tryFallbackDiscovery() {
    if (!this._ytmStateStore) {
      const store = (document.querySelector("ytmusic-app") as any)?.polymerController?.store;
      if (store && typeof store.getState === "function" && typeof store.subscribe === "function") {
        this._ytmStateStore = { store };
      }
    }

    if (!this._ytmPlayerController) {
      const playerBarController = (document.querySelector("ytmusic-player-bar") as any)?.polymerController;
      if (playerBarController?.playerApi && playerBarController?.queue) {
        this._ytmPlayerController = playerBarController;
      } else {
        const appLayoutController = (document.querySelector("ytmusic-app-layout") as any)?.polymerController;
        const playerApi = appLayoutController?.playerApi ?? playerBarController?.playerApi ?? document.querySelector("#movie_player");
        const queue = (document.querySelector("ytmusic-player-queue") as any)?.polymerController?.queue ?? playerBarController?.queue;

        if (playerApi && queue) {
          this._ytmPlayerController = { playerApi, queue };
        }
      }
    }
  }

  public async ready(): Promise<void> {
    if (this._ytmStateStore && this._ytmPlayerController) return Promise.resolve();

    const startTime = Date.now();
    return new Promise<void>(resolve => {
      const interval = setInterval(() => {
        if (Date.now() - startTime > 1500) {
          this.tryFallbackDiscovery();
        }

        if (this._ytmStateStore && this._ytmPlayerController) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }
}

export default new YTMHook();
