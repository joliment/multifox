/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


const BrowserWindow = {

  register: function(win) {
    var profileId = Profile.getIdentity(win);

    if (Profile.isNativeProfile(profileId)) {
      console.log("BrowserWindow.register NOP");
      return;
    }

    console.log("BrowserWindow.register " + profileId);

    var ns = {}; // BUG util is undefined???
    Cu.import("${PATH_MODULE}/new-window.js", ns);
    if (ns.util.networkListeners.active === false) {
      // first multifox window!

      if (isDeprecatedVersion()) {
        Cu.import("${PATH_MODULE}/actions.js", {}).migrateCookies();
      }

      Cookies.start();
      DocStartScriptInjection.init();
      ns.util.networkListeners.enable(httpListeners.request, httpListeners.response);
    }

    // some MultifoxContentEvent_* listeners are not called when
    // there are "unload" listeners with useCapture=true. o_O
    // But they are called if event listener is an anonymous function.
    win.addEventListener("unload", onUnloadChromeWindow, false);

    // update icon status
    win.getBrowser().tabContainer.addEventListener("TabSelect", tabSelected, false);
  },


  // should keep id for session restore?
  unregister: function(win) {
    var idw = Profile.getIdentity(win);
    console.log("BrowserWindow.unregister " + idw);

    if (Profile.isNativeProfile(idw)) {
      return; // nothing to unregister
    }

    win.removeEventListener("unload", onUnloadChromeWindow, false);
    win.getBrowser().tabContainer.removeEventListener("TabSelect", tabSelected, false);

    var ns = {}; // BUG util is undefined???
    Cu.import("${PATH_MODULE}/new-window.js", ns);
    if (ns.util.networkListeners.active) {
      this._checkLastWin(win);
    }
  },


  _checkLastWin: function(win) {
    var sessions = Profile.activeIdentities(win);
    var onlyNative = true;
    for (var idx = sessions.length - 1; idx > -1; idx--) {
      if (Profile.isExtensionProfile(sessions[idx])) {
        onlyNative = false;
        break;
      }
    }
    if (onlyNative) {
      var ns = {}; // BUG util is undefined???
      Cu.import("${PATH_MODULE}/new-window.js", ns);
      ns.util.networkListeners.disable();
      DocStartScriptInjection.stop();
      Cookies.stop();
    }
  }
};


function onUnloadChromeWindow(evt) {
  var win = evt.currentTarget;
  BrowserWindow.unregister(win);
}


function tabSelected(evt) {
  var tab = evt.originalTarget;
  ErrorHandler.updateButtonAsync(tab.linkedBrowser);
}


function getDOMUtils(win) {
  console.assert(typeof win === "object", "win should be an object", win);
  return win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
}
