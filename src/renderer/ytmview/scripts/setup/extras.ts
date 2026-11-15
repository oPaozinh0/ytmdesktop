import ytmhook from "../ytmhook";

export function overrideHistoryButtonDisplay() {
  const historyButton = document.querySelector<HTMLElement>(
    "#history-link .history-button",
  );
  if (historyButton) historyButton.style = "display: inline-block !important;";
  else
    console.warn(
      "Could not override history button display. Element not found",
    );
}

export async function hideChromecastButton() {
  const ytmStore = ytmhook.ytmStateStore.store;

  ytmStore.dispatch({ type: "SET_CAST_AVAILABLE", payload: false });
  // YTM has independent code which sets the cast available so we're subscribing to ensure it's overriden if they do later call it
  ytmStore.subscribe(() => {
    try {
      const ytmStore = ytmhook.ytmStateStore.store;
      if (ytmStore.getState().castStatus.castAvailable) {
        ytmStore.dispatch({ type: "SET_CAST_AVAILABLE", payload: false });
      }
    } catch (err) {
      console.error("[ytmd-err(hideChromecastButton)]", err);
    }
  });
}

export async function createAdditionalPlayerBarControls() {
  const playerBar = document.querySelector("ytmusic-app-layout>ytmusic-player-bar");
  if (!playerBar) return;

  const ytmStore = ytmhook.ytmStateStore.store;
  const playerApi = ytmhook.ytmPlayerController.playerApi;

  let currentVideoId = "";

  let libraryFeedbackDefaultToken = "";
  let libraryFeedbackToggledToken = "";

  let sleepTimerTimeout: NodeJS.Timeout | null = null;

  const libraryButton = document.createElement("yt-button-shape") as any;
  libraryButton.classList.add("ytmd-player-bar-control");
  libraryButton.classList.add("library-button");
  const libraryButtonData = {
    focused: false,
    iconPosition: "icon-only",
    onTap: function () {
      const closePopupEvent = {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail: {
          actionName: "yt-close-popups-action",
          args: [["ytmusic-menu-popup-renderer"]],
          optionalAction: false,
          returnValue: [],
        },
      };
      const feedbackEvent = {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail: {
          actionName: "yt-service-request",
          args: [
            this,
            {
              feedbackEndpoint: {
                feedbackToken: libraryButtonData.toggled
                  ? libraryFeedbackToggledToken
                  : libraryFeedbackDefaultToken,
              },
            },
          ],
          optionalAction: false,
          returnValue: [],
        },
      };
      this.dispatchEvent(new CustomEvent("yt-action", closePopupEvent));
      this.dispatchEvent(new CustomEvent("yt-action", feedbackEvent));
      ytmhook.ytmStateStore.store.dispatch({
        type: "SET_FEEDBACK_TOGGLE_STATE",
        payload: {
          defaultEndpointFeedbackToken: libraryFeedbackDefaultToken,
          isToggled: !libraryButtonData.toggled,
        },
      });
    }.bind(libraryButton),
    style: "mono",
    toggled: false,
    toggleable: true,
    type: "text",
  };
  libraryButton.rawProps = {
    iconName: "yt-sys-icons:library_add",
    data: libraryButtonData,
  };
  document
    .querySelector("ytmusic-app-layout>ytmusic-player-bar")
    ?.querySelector("ytmusic-like-button-renderer")
    ?.insertAdjacentElement("afterend", libraryButton);

  const playlistButton = document.createElement("yt-button-shape") as any;
  playlistButton.classList.add("ytmd-player-bar-control");
  playlistButton.classList.add("playlist-button");
  const playlistButtonData = {
    focused: false,
    iconPosition: "icon-only",
    onTap: function () {
      const closePopupEvent = {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail: {
          actionName: "yt-close-popups-action",
          args: [["ytmusic-menu-popup-renderer"]],
          optionalAction: false,
          returnValue: [],
        },
      };
      const returnValue: any[] = [];
      const serviceRequestEvent = {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail: {
          actionName: "yt-service-request",
          args: [
            this,
            {
              addToPlaylistEndpoint: {
                videoId: currentVideoId,
              },
            },
          ],
          optionalAction: false,
          returnValue,
        },
      };
      this.dispatchEvent(new CustomEvent("yt-action", closePopupEvent));
      this.dispatchEvent(new CustomEvent("yt-action", serviceRequestEvent));
      returnValue[0].ajaxPromise.then(
        (response) => {
          const addToPlaylistEvent = {
            bubbles: true,
            cancelable: false,
            composed: true,
            detail: {
              actionName: "yt-open-popup-action",
              args: [
                {
                  openPopupAction: {
                    popup: {
                      addToPlaylistRenderer:
                        response.data.contents[0].addToPlaylistRenderer,
                    },
                    popupType: "DIALOG",
                  },
                },
                this,
              ],
              optionalAction: false,
              returnValue: [],
            },
          };
          this.dispatchEvent(new CustomEvent("yt-action", addToPlaylistEvent));
          this.dispatchEvent(new CustomEvent("yt-action", closePopupEvent));
        },
        () => {
          // service request errored
        },
        this,
      );
    }.bind(playlistButton),
    style: "mono",
    toggled: false,
    type: "text",
  };
  playlistButton.rawProps = {
    iconName: "yt-sys-icons:playlist_add",
    data: playlistButtonData,
  };
  libraryButton.insertAdjacentElement("afterend", playlistButton);

  playerApi.addEventListener("onVideoDataChange", (event) => {
    if (
      event.playertype === 1 &&
      (event.type === "dataloaded" || event.type === "dataupdated")
    ) {
      currentVideoId = playerApi.getPlayerResponse().videoDetails.videoId;
    }
  });

  const rightControls = document.querySelector(
    "ytmusic-app-layout > ytmusic-player-bar .right-controls-buttons, ytmusic-player-bar .right-controls-buttons, #right-controls .right-controls-buttons",
  );
  if (!rightControls) return;
  const sleepTimerButton = document.createElement("yt-icon-button");

  const sleepTimerIcon = document.createElement("yt-icon") as any;
  sleepTimerIcon.set("icon", "TIMER");
  sleepTimerButton.appendChild(sleepTimerIcon);

  sleepTimerButton.setAttribute("title", "Sleep timer off");
  sleepTimerButton.classList.add("ytmusic-player-bar");
  sleepTimerButton.classList.add("ytmd-player-bar-control");
  sleepTimerButton.classList.add("sleep-timer-button");
  sleepTimerButton.onclick = () => {
    sleepTimerButton.dispatchEvent(
      new CustomEvent("yt-action", {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail: {
          actionName: "yt-open-popup-action",
          args: [
            {
              openPopupAction: {
                popup: {
                  menuPopupRenderer: {
                    accessibilityData: {
                      label: "Action menu",
                    },
                    items: [
                      {
                        menuServiceItemRenderer: {
                          icon: {
                            iconType: "CLOCK",
                          },
                          serviceEndpoint: {
                            ytmdSleepTimerServiceEndpoint: {
                              time: 5,
                            },
                          },
                          text: {
                            runs: [
                              {
                                text: "5 minutes",
                              },
                            ],
                          },
                        },
                      },
                      {
                        menuServiceItemRenderer: {
                          icon: {
                            iconType: "CLOCK",
                          },
                          serviceEndpoint: {
                            ytmdSleepTimerServiceEndpoint: {
                              time: 10,
                            },
                          },
                          text: {
                            runs: [
                              {
                                text: "10 minutes",
                              },
                            ],
                          },
                        },
                      },
                      {
                        menuServiceItemRenderer: {
                          icon: {
                            iconType: "CLOCK",
                          },
                          serviceEndpoint: {
                            ytmdSleepTimerServiceEndpoint: {
                              time: 15,
                            },
                          },
                          text: {
                            runs: [
                              {
                                text: "15 minutes",
                              },
                            ],
                          },
                        },
                      },
                      {
                        menuServiceItemRenderer: {
                          icon: {
                            iconType: "CLOCK",
                          },
                          serviceEndpoint: {
                            ytmdSleepTimerServiceEndpoint: {
                              time: 30,
                            },
                          },
                          text: {
                            runs: [
                              {
                                text: "30 minutes",
                              },
                            ],
                          },
                        },
                      },
                      {
                        menuServiceItemRenderer: {
                          icon: {
                            iconType: "CLOCK",
                          },
                          serviceEndpoint: {
                            ytmdSleepTimerServiceEndpoint: {
                              time: 45,
                            },
                          },
                          text: {
                            runs: [
                              {
                                text: "45 minutes",
                              },
                            ],
                          },
                        },
                      },
                      {
                        menuServiceItemRenderer: {
                          icon: {
                            iconType: "CLOCK",
                          },
                          serviceEndpoint: {
                            ytmdSleepTimerServiceEndpoint: {
                              time: 60,
                            },
                          },
                          text: {
                            runs: [
                              {
                                text: "1 hour",
                              },
                            ],
                          },
                        },
                      },
                      {
                        menuServiceItemRenderer: {
                          icon: {
                            iconType: "CLOCK",
                          },
                          serviceEndpoint: {
                            ytmdSleepTimerServiceEndpoint: {
                              time: "end_of_track",
                            },
                          },
                          text: {
                            runs: [
                              {
                                text: "End of current track",
                              },
                            ],
                          },
                        },
                      },
                      sleepTimerTimeout !== null
                        ? {
                            menuServiceItemRenderer: {
                              icon: {
                                iconType: "DELETE",
                              },
                              serviceEndpoint: {
                                ytmdSleepTimerServiceEndpoint: {
                                  time: 0,
                                },
                              },
                              text: {
                                runs: [
                                  {
                                    text: "Clear sleep timer",
                                  },
                                ],
                              },
                            },
                          }
                        : {},
                    ],
                  },
                },
                popupType: "DROPDOWN",
              },
            },
            sleepTimerButton,
          ],
          optionalAction: false,
          returnValue: [],
        },
      }),
    );
  };
  const shuffleControl = rightControls.querySelector(".shuffle");
  if (shuffleControl) {
    shuffleControl.insertAdjacentElement("afterend", sleepTimerButton);
  } else {
    rightControls.prepend(sleepTimerButton);
  }

  const humanizeTime = (time: number | string) => {
    if (time === "end_of_track") return "end of current track";
    const mins = Number(time);
    if (mins === 1) return `${mins} minute`;
    if (mins > 1 && mins < 60) return `${mins} minutes`;
    if (mins >= 60 && mins < 120) return `${mins / 60} hour`;
    if (mins >= 120) return `${mins / 60} hours`;
    return "";
  };

  window.addEventListener("yt-action", (e: any) => {
    if (e.detail.actionName === "yt-service-request") {
      if (e.detail.args[1].ytmdSleepTimerServiceEndpoint) {
        const option = e.detail.args[1].ytmdSleepTimerServiceEndpoint.time;
        window.postMessage({ type: "ytmd-sleep-timer-set", option }, "*");

        if (sleepTimerTimeout !== null) {
          clearTimeout(sleepTimerTimeout);
          sleepTimerTimeout = null;
          if (sleepTimerButton.classList.contains("active")) {
            sleepTimerButton.classList.remove("active");
            sleepTimerButton.setAttribute("title", "Sleep timer off");
          }
        }

        if (option === "end_of_track") {
          sleepTimerButton.classList.add("active");
          sleepTimerButton.setAttribute("title", "Sleep timer: End of current track");
          document.body.dispatchEvent(
            new CustomEvent("yt-action", {
              bubbles: true,
              cancelable: false,
              composed: true,
              detail: {
                actionName: "yt-open-popup-action",
                args: [
                  {
                    openPopupAction: {
                      popup: {
                        notificationActionRenderer: {
                          responseText: {
                            runs: [{ text: "Sleep timer set to end of current track" }]
                          }
                        }
                      },
                      popupType: "TOAST",
                      uniqueId: crypto.randomUUID()
                    }
                  },
                  document.querySelector("ytmusic-app")
                ],
                optionalAction: false,
                returnValue: []
              }
            })
          );
        } else if (option > 0) {
          if (!sleepTimerButton.classList.contains("active")) {
            sleepTimerButton.classList.add("active");
            sleepTimerButton.setAttribute(
              "title",
              `Sleep timer ${humanizeTime(e.detail.args[1].ytmdSleepTimerServiceEndpoint.time)}`,
            );
          }

          document.body.dispatchEvent(
            new CustomEvent("yt-action", {
              bubbles: true,
              cancelable: false,
              composed: true,
              detail: {
                actionName: "yt-open-popup-action",
                args: [
                  // Endpoint details
                  {
                    openPopupAction: {
                      popup: {
                        notificationActionRenderer: {
                          responseText: {
                            runs: [
                              {
                                text: `Sleep timer set to ${humanizeTime(e.detail.args[1].ytmdSleepTimerServiceEndpoint.time)}`,
                              },
                            ],
                          },
                        },
                      },
                      popupType: "TOAST",
                      uniqueId: crypto.randomUUID(),
                    },
                  },
                  document.querySelector("ytmusic-app"),
                ],
                optionalAction: false,
                returnValue: [],
              },
            }),
          );

          sleepTimerTimeout = setTimeout(
            () => {
              sleepTimerTimeout = null;
              sleepTimerButton.classList.remove("active");
              sleepTimerButton.setAttribute("title", "Sleep timer off");

              if (playerApi.getPlayerState() === 1) {
                playerApi.pauseVideo();

                document.body.dispatchEvent(
                  new CustomEvent("yt-action", {
                    bubbles: true,
                    cancelable: false,
                    composed: true,
                    detail: {
                      actionName: "yt-open-popup-action",
                      args: [
                        {
                          openPopupAction: {
                            popup: {
                              dismissableDialogRenderer: {
                                title: {
                                  runs: [
                                    {
                                      text: "Music paused",
                                    },
                                  ],
                                },
                                dialogMessages: [
                                  {
                                    runs: [
                                      {
                                        text: "Sleep timer expired and your music has been paused",
                                      },
                                    ],
                                  },
                                ],
                              },
                            },
                            popupType: "DIALOG",
                          },
                        },
                        document.querySelector("ytmusic-app"),
                      ],
                      optionalAction: false,
                      returnValue: [],
                    },
                  }),
                );
              }
            },
            e.detail.args[1].ytmdSleepTimerServiceEndpoint.time * 1000 * 60,
          );
        } else {
          document.body.dispatchEvent(
            new CustomEvent("yt-action", {
              bubbles: true,
              cancelable: false,
              composed: true,
              detail: {
                actionName: "yt-open-popup-action",
                args: [
                  // Endpoint details
                  {
                    openPopupAction: {
                      popup: {
                        notificationActionRenderer: {
                          responseText: {
                            runs: [
                              {
                                text: `Sleep timer cleared`,
                              },
                            ],
                          },
                        },
                      },
                      popupType: "TOAST",
                      uniqueId: crypto.randomUUID(),
                    },
                  },
                  document.querySelector("ytmusic-app"),
                ],
                optionalAction: false,
                returnValue: [],
              },
            }),
          );
        }
      }
    }
  });

  ytmStore.subscribe(() => {
    const state = ytmStore.getState();

    // Update library button for current data
    const currentMenu = (
      document.querySelector("ytmusic-app-layout>ytmusic-player-bar") as any
    )?.getMenuRenderer();
    if (currentMenu) {
      if (playlistButton.classList.contains("hidden")) {
        playlistButton.classList.remove("hidden");
      }

      let foundLibraryButton = false;
      for (let i = 0; i < currentMenu.items.length; i++) {
        const item = currentMenu.items[i];
        if (item.toggleMenuServiceItemRenderer) {
          if (
            item.toggleMenuServiceItemRenderer.defaultIcon.iconType ===
              "LIBRARY_SAVED" ||
            item.toggleMenuServiceItemRenderer.defaultIcon.iconType ===
              "LIBRARY_ADD"
          ) {
            foundLibraryButton = true;
            libraryFeedbackDefaultToken =
              item.toggleMenuServiceItemRenderer.defaultServiceEndpoint
                .feedbackEndpoint.feedbackToken;
            libraryFeedbackToggledToken =
              item.toggleMenuServiceItemRenderer.toggledServiceEndpoint
                .feedbackEndpoint.feedbackToken;

            if (
              state.toggleStates.feedbackToggleStates[
                libraryFeedbackDefaultToken
              ] !== undefined &&
              state.toggleStates.feedbackToggleStates[
                libraryFeedbackDefaultToken
              ] !== null
            ) {
              libraryButtonData.toggled =
                state.toggleStates.feedbackToggleStates[
                  libraryFeedbackDefaultToken
                ];
              libraryButton.setters?.data?.(libraryButtonData);
            } else {
              libraryButtonData.toggled = false;
              libraryButton.setters?.data?.(libraryButtonData);
            }

            if (
              item.toggleMenuServiceItemRenderer.defaultIcon.iconType ===
              "LIBRARY_SAVED"
            ) {
              // Default value is saved to library (false == remove from library, true == add to library)
              if (libraryButtonData.toggled) {
                libraryButton.setters?.iconName?.("yt-sys-icons:library_add");
              } else {
                libraryButton.setters?.iconName?.("yt-sys-icons:library_saved");
              }
            } else if (
              item.toggleMenuServiceItemRenderer.defaultIcon.iconType ===
              "LIBRARY_ADD"
            ) {
              // Default value is add to library (false == add to library, true == remove from library)
              if (libraryButtonData.toggled) {
                libraryButton.setters?.iconName?.("yt-sys-icons:library_saved");
              } else {
                libraryButton.setters?.iconName?.("yt-sys-icons:library_add");
              }
            }
            break;
          }
        }
      }

      if (!foundLibraryButton) {
        if (!libraryButton.classList.contains("hidden")) {
          libraryButton.classList.add("hidden");
        }
      } else {
        if (libraryButton.classList.contains("hidden")) {
          libraryButton.classList.remove("hidden");
        }
      }
    } else {
      if (!libraryButton.classList.contains("hidden")) {
        libraryButton.classList.add("hidden");
      }
      if (!playlistButton.classList.contains("hidden")) {
        playlistButton.classList.add("hidden");
      }
    }
  });
}

export async function addTimedLyrics() {
  const ytmStore = ytmhook.ytmStateStore.store;
  const playerApi = ytmhook.ytmPlayerController.playerApi;

  let currentLyricBrowseId = "";
  let currentTimedLyrics: { timedLyrics: any; source: any } | null = null;
  let autoScrolling = false;
  let autoScrollPaused = false;
  let autoScrollRafId: number | null = null;
  let viewingLyricsTab = false;
  let ytmLyricTabContents: any[] | null = null;

  const timedLyricsContainer = document.createElement("div");
  timedLyricsContainer.classList.add("ytmd-lyrics");
  const timedLyricsSource = document.createElement("p");
  timedLyricsSource.classList.add("ytmd-lyrics-source");
  const timedLyricsYTMDNote = document.createElement("p");
  timedLyricsYTMDNote.classList.add("ytmd-lyrics-ytmdnote");
  timedLyricsYTMDNote.innerText = "Timed lyrics system provided by YTM Shield";

  const returnToLiveContainer = document.createElement("div");
  returnToLiveContainer.classList.add("ytmd-lyrics-return-live-container");
  const returnToLive = document.createElement("yt-button-renderer") as any;
  returnToLive.classList.add("ytmd-lyrics-return-live");
  returnToLive.data = {
    text: {
      runs: [
        {
          text: "Sync to video time",
        },
      ],
    },
    style: "STYLE_OVERLAY",
  };

  function enableAutoScroll() {
    autoScrollPaused = false;
    returnToLive.hidden = true;
  }

  function disableAutoScroll() {
    autoScrollPaused = true;
    returnToLive.hidden = false;
  }

  returnToLive.onClick = () => {
    enableAutoScroll();
    autoScrolling = true;
    timedLyricsContainer.querySelector(".active")?.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "center",
    });
  };
  returnToLiveContainer.appendChild(returnToLive);

  const tabRenderer = document.querySelector("#player-page #tab-renderer");
  function onUserScroll() {
    if (!viewingLyricsTab) return;
    if (autoScrolling) {
      //cancelAnimationFrame(autoScrollRafId);
      autoScrolling = false;
    }
    disableAutoScroll();
  }
  tabRenderer?.addEventListener("wheel", onUserScroll, { passive: true });
  tabRenderer?.addEventListener("touchstart", onUserScroll, { passive: true });

  async function getTimedLyrics() {
    try {
      // This is an anonymous request and could be broken by Google at any time
      const browseRes = await fetch("/youtubei/v1/browse", {
        method: "POST",
        body: JSON.stringify({
          browseId: currentLyricBrowseId,
          context: {
            client: {
              clientName: "ANDROID_MUSIC",
              clientVersion: "7.12.5",
            },
          },
        }),
      });
      const json = await browseRes.json();

      // This is likely a timed lyrics response
      if (json.contents && json.contents.elementRenderer) {
        const timedLyrics =
          json.contents.elementRenderer.newElement.type.componentType.model
            .timedLyricsModel.lyricsData.timedLyricsData;
        const source =
          json.contents.elementRenderer.newElement.type.componentType.model
            .timedLyricsModel.lyricsData.sourceMessage;

        timedLyricsSource.innerText = source;

        const lyricElements: Element[] = [];
        for (const lyric of timedLyrics) {
          const lyricElement = document.createElement("p");
          lyricElement.innerText = lyric.lyricLine;
          lyricElement.classList.add("ytmd-lyric-line");
          lyricElement.setAttribute(
            "data-start-ms",
            lyric.cueRange.startTimeMilliseconds,
          );
          lyricElement.setAttribute(
            "data-end-ms",
            lyric.cueRange.endTimeMilliseconds,
          );
          lyricElement.onclick = () => {
            enableAutoScroll();
            playerApi.seekTo(
              parseInt(lyric.cueRange.startTimeMilliseconds) / 1000,
            );
          };
          lyricElements.push(lyricElement);
        }
        timedLyricsContainer.replaceChildren(...lyricElements);

        currentTimedLyrics = {
          timedLyrics,
          source,
        };
      } else {
        currentTimedLyrics = null;
      }
    } catch {
      /* empty */
    }
  }

  function waitForElement(root, selector) {
    return new Promise((resolve) => {
      if (root.querySelector(selector)) {
        return resolve(root.querySelector(selector));
      }

      const observer = new MutationObserver(() => {
        if (root.querySelector(selector)) {
          observer.disconnect();
          resolve(root.querySelector(selector));
        }
      });

      observer.observe(root, {
        childList: true,
        subtree: true,
      });
    });
  }

  async function updateLyricsTab() {
    if (currentTimedLyrics) {
      const tabRenderer = document.querySelector("#player-page #tab-renderer");

      const contents = (await waitForElement(
        tabRenderer,
        ".ytmusic-tab-renderer[page-type='MUSIC_PAGE_TYPE_TRACK_LYRICS'] > #contents",
      )) as any;
      if (!ytmLyricTabContents)
        ytmLyricTabContents = Array.from(contents.children);
      contents.replaceChildren(
        timedLyricsContainer,
        timedLyricsSource,
        timedLyricsYTMDNote,
        returnToLiveContainer,
      );
    }
  }

  function easeOutQuad(x: number): number {
    return 1 - (1 - x) * (1 - x);
  }

  function smoothScrollToCenter(container, element, duration = 250, easing = easeOutQuad) {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const targetScrollTop =
      container.scrollTop +
      (elementRect.top - containerRect.top) -
      (container.clientHeight / 2 - elementRect.height / 2);

    const start = container.scrollTop;
    const change = targetScrollTop - start;
    const startTime = performance.now();

    return new Promise<void>((resolve, reject) => {
      let lastKnownRafId;
      function animate(now) {
        // If we're not auto scrolling (interruption) or the last known raf id is not the same (another scroll operation) we cancel this one
        if (!autoScrolling || lastKnownRafId != autoScrollRafId) {
          reject();
          return;
        }

        const t = Math.min(1, (now - startTime) / duration);
        container.scrollTop = start + change * easing(t);

        if (t < 1) {
          autoScrollRafId = lastKnownRafId = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }
      autoScrollRafId = lastKnownRafId = requestAnimationFrame(animate);
    });
  }

  // This could definitely be optimized far better
  async function updateLyricLines(progress) {
    const msProgress = progress * 1000;
    for (const lyric of timedLyricsContainer.children) {
      const lyricStart = parseInt(lyric.getAttribute("data-start-ms")!);
      const lyricEnd = parseInt(lyric.getAttribute("data-end-ms")!);

      if (msProgress >= lyricStart && msProgress < lyricEnd) {
        if (!lyric.classList.contains("active")) {
          lyric.classList.add("active");
          if (!autoScrollPaused && viewingLyricsTab) {
            autoScrolling = true;
            try {
              await smoothScrollToCenter(tabRenderer, lyric, 500);
            } catch {}
            autoScrolling = false;
          }
        }
      } else {
        if (lyric.classList.contains("active"))
          lyric.classList.remove("active");
      }
    }
  }

  ytmStore.subscribe(async () => {
    const state = ytmStore.getState();
    if (state.playerPage && state.playerPage.playerPageTabs) {
      let lyricsTab = -1;
      for (let i = 0; i < state.playerPage.playerPageTabs.length; i++) {
        const tab = state.playerPage.playerPageTabs[i];
        // Check if this is the Music Page Lyrics tab
        if (
          tab.tabRenderer?.endpoint?.browseEndpoint?.browseId.startsWith("MPLY")
        ) {
          lyricsTab = i;
          break;
        }
      }

      if (lyricsTab === -1) return;
      const lyricBrowseId =
        state.playerPage.playerPageTabs[lyricsTab]?.tabRenderer?.endpoint
          ?.browseEndpoint?.browseId;
      if (!lyricBrowseId) return;
      if (currentLyricBrowseId !== lyricBrowseId) {
        currentLyricBrowseId = lyricBrowseId;
        enableAutoScroll();
        await getTimedLyrics();
      }

      if (state.playerPage.playerPageTabSelectedIndex === lyricsTab) {
        viewingLyricsTab = true;
        if (
          state.player.playerResponse.videoDetails.musicVideoType !==
          "MUSIC_VIDEO_TYPE_OMV"
        ) {
          await updateLyricsTab();
          enableAutoScroll();
          autoScrolling = true;
          timedLyricsContainer.querySelector(".active")?.scrollIntoView({
            behavior: "instant",
            block: "center",
            inline: "center",
          });
        } else {
          if (currentTimedLyrics) {
            const contents = (await waitForElement(
              tabRenderer,
              ".ytmusic-tab-renderer[page-type='MUSIC_PAGE_TYPE_TRACK_LYRICS'] > #contents",
            )) as any;
            if (ytmLyricTabContents)
              contents.replaceChildren(...ytmLyricTabContents);
          }
        }
      } else if (state.playerPage.playerPageTabSelectedIndex !== lyricsTab) {
        viewingLyricsTab = false;
        ytmLyricTabContents = null;
      }
    }
  });

  playerApi.addEventListener("onVideoProgress", (progress) => {
    updateLyricLines(progress);
  });
}

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

type AudioChainState = {
  ctx: AudioContext;
  filters: BiquadFilterNode[];
  compressor: DynamicsCompressorNode;
  makeupGain: GainNode;
};

type SbSegment = {
  UUID: string;
  segment: [number, number];
  category: string;
  actionType?: string;
};

export function initAudioEngineAndSponsorBlock() {
  const playerApi = ytmhook.ytmPlayerController.playerApi;

  let equalizerEnabled = false;
  let equalizerBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let loudnessNormalization = false;
  let sponsorBlockEnabled = false;
  let sponsorBlockCategories = ["sponsor", "selfpromo", "interaction", "intro", "outro", "music_offtopic"];

  const attachedElements = new WeakMap<HTMLMediaElement, AudioChainState>();
  let activeChain: AudioChainState | null = null;

  let currentSbVideoId: string | null = null;
  let currentSbSegments: SbSegment[] = [];
  const skippedUuids = new Set<string>();

  function applyAudioParams(chain: AudioChainState) {
    for (let i = 0; i < chain.filters.length; i++) {
      const targetGain = equalizerEnabled ? Math.max(-12, Math.min(12, Number(equalizerBands[i] ?? 0))) : 0;
      chain.filters[i].gain.value = Number.isFinite(targetGain) ? targetGain : 0;
    }

    if (loudnessNormalization) {
      chain.compressor.threshold.value = -18;
      chain.compressor.knee.value = 24;
      chain.compressor.ratio.value = 4;
      chain.compressor.attack.value = 0.005;
      chain.compressor.release.value = 0.25;
      chain.makeupGain.gain.value = 1.35;
    } else {
      chain.compressor.threshold.value = -1;
      chain.compressor.knee.value = 0;
      chain.compressor.ratio.value = 1;
      chain.compressor.attack.value = 0.003;
      chain.compressor.release.value = 0.1;
      chain.makeupGain.gain.value = 1.0;
    }
  }

  function ensureAudioChainAttached() {
    if (!equalizerEnabled && !loudnessNormalization) {
      if (activeChain) applyAudioParams(activeChain);
      return;
    }

    const video = document.querySelector<HTMLMediaElement>("video.html5-main-video, video");
    if (!video) return;

    const existing = attachedElements.get(video);
    if (existing) {
      activeChain = existing;
      applyAudioParams(existing);
      if (existing.ctx.state === "suspended") {
        void existing.ctx.resume();
      }
      return;
    }

    if (video.currentSrc && !video.currentSrc.startsWith("blob:") && !video.crossOrigin) {
      return;
    }

    try {
      const AudioCtx = window.AudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(video);
      const filters = EQ_FREQUENCIES.map((freq, index) => {
        const filter = ctx.createBiquadFilter();
        filter.frequency.value = freq;
        if (index === 0) {
          filter.type = "lowshelf";
        } else if (index === EQ_FREQUENCIES.length - 1) {
          filter.type = "highshelf";
        } else {
          filter.type = "peaking";
          filter.Q.value = 1.4;
        }
        return filter;
      });

      const compressor = ctx.createDynamicsCompressor();
      const makeupGain = ctx.createGain();

      let tail: AudioNode = source;
      for (const filter of filters) {
        tail.connect(filter);
        tail = filter;
      }
      tail.connect(compressor);
      compressor.connect(makeupGain);
      makeupGain.connect(ctx.destination);

      const chain: AudioChainState = { ctx, filters, compressor, makeupGain };
      attachedElements.set(video, chain);
      activeChain = chain;
      applyAudioParams(chain);

      const resumeIfNeeded = () => {
        if (ctx.state === "suspended") {
          void ctx.resume();
        }
      };
      video.addEventListener("play", resumeIfNeeded);
      video.addEventListener("playing", resumeIfNeeded);
      if (!video.paused) resumeIfNeeded();
    } catch (error) {
      console.warn("[ytmd-audio] Failed to initialize audio graph:", error);
    }
  }

  function requestSponsorBlockSegments(videoId: string) {
    if (!sponsorBlockEnabled || !videoId || sponsorBlockCategories.length === 0) {
      currentSbSegments = [];
      return;
    }
    window.postMessage(
      {
        type: "ytmd-sb-request",
        videoId,
        categories: [...sponsorBlockCategories]
      },
      "*"
    );
  }

  window.addEventListener("message", event => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === "ytmd-audio-config") {
      equalizerEnabled = Boolean(event.data.equalizerEnabled);
      equalizerBands = Array.isArray(event.data.equalizerBands) ? event.data.equalizerBands : equalizerBands;
      loudnessNormalization = Boolean(event.data.loudnessNormalization);

      const prevSbEnabled = sponsorBlockEnabled;
      const prevSbCategories = JSON.stringify(sponsorBlockCategories);
      sponsorBlockEnabled = Boolean(event.data.sponsorBlockEnabled);
      sponsorBlockCategories = Array.isArray(event.data.sponsorBlockCategories) ? event.data.sponsorBlockCategories : [];

      ensureAudioChainAttached();

      const activeVideoId = playerApi.getPlayerResponse?.()?.videoDetails?.videoId ?? null;
      if (sponsorBlockEnabled && activeVideoId && (!prevSbEnabled || prevSbCategories !== JSON.stringify(sponsorBlockCategories))) {
        currentSbVideoId = activeVideoId;
        skippedUuids.clear();
        requestSponsorBlockSegments(activeVideoId);
      } else if (!sponsorBlockEnabled) {
        currentSbSegments = [];
      }
    }

    if (event.data.type === "ytmd-sb-response") {
      if (event.data.videoId === currentSbVideoId && Array.isArray(event.data.segments)) {
        currentSbSegments = event.data.segments;
      }
    }

    if (event.data.type === "ytmd-navigate-search") {
      const query = typeof event.data.query === "string" ? event.data.query.trim() : "";
      if (!query) return;
      const ytmApp = document.querySelector("ytmusic-app");
      (ytmApp ?? document).dispatchEvent(
        new CustomEvent("yt-navigate", {
          bubbles: true,
          composed: true,
          detail: {
            endpoint: {
              searchEndpoint: {
                query
              }
            }
          }
        })
      );
    }
  });

  const handleVideoChange = () => {
    ensureAudioChainAttached();
    const videoId = playerApi.getPlayerResponse?.()?.videoDetails?.videoId ?? null;
    if (videoId && videoId !== currentSbVideoId) {
      currentSbVideoId = videoId;
      currentSbSegments = [];
      skippedUuids.clear();
      requestSponsorBlockSegments(videoId);
    }
  };

  playerApi.addEventListener("onVideoDataChange", handleVideoChange);
  playerApi.addEventListener("onVideoProgress", (progress: number) => {
    if (!sponsorBlockEnabled || currentSbSegments.length === 0 || !Number.isFinite(progress)) return;

    for (const seg of currentSbSegments) {
      if (seg.actionType && seg.actionType !== "skip") continue;
      const [start, end] = seg.segment;
      if (progress >= start && progress < end - 0.35 && !skippedUuids.has(seg.UUID)) {
        skippedUuids.add(seg.UUID);
        playerApi.seekTo(end, true);
        window.postMessage({ type: "ytmd-sb-skipped", category: seg.category }, "*");
        break;
      }
    }
  });

  window.postMessage({ type: "ytmd-page-audio-ready" }, "*");
}
