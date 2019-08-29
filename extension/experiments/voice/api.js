/* globals browser, AppConstants, CustomizableUI, ExtensionCommon, Services, ExtensionAPI, ViewPopup */

"use strict";

/*
ChromeUtils.defineModuleGetter(
  this,
  "AppConstants",
  "resource://gre/modules/AppConstants.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "CustomizableUI",
  "resource:///modules/CustomizableUI.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "ExtensionCommon",
  "resource://gre/modules/ExtensionCommon.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "PageActions",
  "resource:///modules/PageActions.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "Services",
  "resource://gre/modules/Services.jsm"
);
*/

ChromeUtils.defineModuleGetter(
  this,
  "BrowserActions",
  "resource://gre/modules/BrowserActions.jsm"
);

ChromeUtils.defineModuleGetter(
  this,
  "ExtensionParent",
  "resource://gre/modules/ExtensionParent.jsm"
);

ChromeUtils.defineModuleGetter(
  this,
  "ViewPopup",
  "resource:///modules/ExtensionPopups.jsm"
);

XPCOMUtils.defineLazyGetter(this, "browserActionFor", () => {
  return ExtensionParent.apiManager.global.browserActionFor;
});

this.voice = class extends ExtensionAPI {
  getAPI(context) {
    const { extension } = context;

    return {
      experiments: {
        voice: {
          async bouncePopup() {
            const browserAction = browserActionFor(extension);
            const windowTracker = ChromeUtils.import(
              "resource://gre/modules/Extension.jsm",
              {}
            ).Management.global.windowTracker;
            const window = windowTracker.topWindow;
            browserAction.triggerAction(window);
            /*
            const popup = ViewPopup.for(extension, window);
            if (popup) {
              popup.closePopup();
            }
            const widget = this.widget.forWindow(window);
            const tab = window.gBrowser.selectedTab;
            if (!widget.node || !this.getProperty(tab, "enabled")) {
              return;
            }
            if (this.widget.areaType === CustomizableUI.TYPE_MENU_PANEL) {
              await window.document
                .getElementById("nav-bar")
                .overflowable.show();
            }
            const event = new window.CustomEvent("command", {
              bubbles: true,
              cancelable: true,
            });
            widget.node.dispatchEvent(event);
            */
            /*
            const tabTracker = ChromeUtils.import(
              "resource://gre/modules/Extension.jsm",
              {}
            ).Management.global.tabTracker;
            const tab = tabTracker.activeTab;
            tabManager.addActiveTabPermission(tab);
            const popup = extension.manifest.browser_action.default_popup;
            console.log("!!! popup", popup, extension.manifest);
            tabTracker.openExtensionPopupTab(popup);
            */
          },
        },
      },
    };
  }
};
