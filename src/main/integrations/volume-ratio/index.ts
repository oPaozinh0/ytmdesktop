import enableScript from "./script/enable.script?raw";
import disableScript from "./script/disable.script?raw";
import forceUpdateVolume from "./script/forceupdatevolume.script?raw";
import Integration from "../integration";
import YTMViewManager from "../../services/ytmviewmanager";

export default class VolumeRatio extends Integration {
  public override name = "VolumeRatio";
  public override storeEnableProperty: Integration["storeEnableProperty"] = "playback.ratioVolume";
  public override disableFlags = ["disable_volume_ratio"];

  // This integration is based upon the following GreasyFork script:
  // https://greasyfork.org/en/scripts/397686-youtube-music-fix-volume-ratio
  // Made by: Marco Pfeiffer <git@marco.zone>

  private injected = false;
  private ytmViewRecreatedListener = () => {
    this.injected = false;
    this.onEnabled();
  };

  public onSetup() {}

  public onEnabled() {
    const ytmViewManager = this.getService(YTMViewManager);

    ytmViewManager.on("view-recreated", this.ytmViewRecreatedListener);

    void this.applyVolumeRatio();
  }

  public onDisabled() {
    const ytmViewManager = this.getService(YTMViewManager);

    ytmViewManager.off("view-recreated", this.ytmViewRecreatedListener);

    void this.removeVolumeRatio();
  }

  private async applyVolumeRatio() {
    const ytmViewManager = this.getService(YTMViewManager);

    if (!this.injected) {
      await ytmViewManager.ready();
      if (!this.isEnabled || this.injected) return;
      this.executeYTMScript(enableScript);
      this.forceUpdateVolume();
      this.injected = true;
    }
  }

  private async removeVolumeRatio() {
    const ytmViewManager = this.getService(YTMViewManager);

    if (this.injected) {
      await ytmViewManager.ready();
      if (this.isEnabled || !this.injected) return;
      this.executeYTMScript(disableScript);
      this.forceUpdateVolume();
      this.injected = false;
    }
  }

  private forceUpdateVolume(): void {
    this.executeYTMScript(forceUpdateVolume);
  }
}
