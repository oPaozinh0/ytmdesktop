# winget manifests

Manifests for publishing this fork to the [Windows Package Manager community
repository](https://github.com/microsoft/winget-pkgs). They live here so each release's manifest is
versioned alongside the code that produced it.

## Publishing a version

1. Build the installer with the update feed pointed at this fork, otherwise the app will update
   itself back to upstream and lose the ad blocking:

   ```powershell
   $env:YTMD_UPDATE_FEED_OWNER = "oPaozinh0"
   $env:YTMD_UPDATE_FEED_REPOSITORY = "ytmdesktop"
   yarn make
   ```

2. Attach `out/make/squirrel.windows/x64/YTMDesktop-Adblock-<version>-Setup.exe` to a GitHub release
   tagged `v<version>`. Winget requires a stable, publicly reachable installer URL.

3. Copy the previous version's manifest folder to the new version and update `PackageVersion`,
   `InstallerUrl`, `ReleaseDate`, `DisplayVersion` and `ReleaseNotes*`. The installer hash comes
   from:

   ```powershell
   (Get-FileHash out\make\squirrel.windows\x64\YTMDesktop-Adblock-<version>-Setup.exe -Algorithm SHA256).Hash
   ```

4. Check it before submitting:

   ```powershell
   winget validate --manifest winget\manifests\o\oPaozinh0\YTMDesktopAdblock\<version>
   ```

5. Copy the folder into a fork of `microsoft/winget-pkgs` under the same path and open a pull
   request. Validation runs automatically and a moderator reviews it afterwards.

## Things that will trip up validation

- **Silent install must work.** The pipeline installs the package unattended in a VM. Squirrel's
  installer takes `--silent`, which is what `InstallerSwitches` declares.
- **The Add/Remove Programs entry must be matchable.** Squirrel writes it with the upstream author
  as `Publisher`, which doesn't match the `Publisher` in the locale manifest, so the installer
  manifest spells out `AppsAndFeaturesEntries` instead of leaving winget to infer it.
- **The installer isn't code signed.** Winget allows this, but SmartScreen warns users on first run
  and unsigned installers get more scrutiny during moderation.
