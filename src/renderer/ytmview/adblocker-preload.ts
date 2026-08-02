// Cosmetic filtering and scriptlet injection for the adblocker integration.
//
// Scriptlets are injected first and synchronously, see adblocker-scriptlets. Element hiding is
// handled by @ghostery/adblocker-electron-preload, which we bundle here because the path the
// library resolves for it points into node_modules and doesn't survive being packaged into an asar.
import "./adblocker-scriptlets";
import "@ghostery/adblocker-electron-preload";
