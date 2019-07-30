// browserService.js delegates the various browser-level actions that the extension needs to handle, like finding content within tabs, muting, etc.
var port;
const connected = p => {
  port = p;
  port.onMessage.addListener(async function(data) {
    await parseIntent(data.transcript);
  });
};

browser.runtime.onConnect.addListener(connected);

const parseIntent = async transcript => {
  console.log(
    `[Snips Intent Parsing] Sending transcript to Snips NLU: ${transcript}`
  );
  var snipsResults = await browser.runtime.sendNativeMessage(
    "snips_nlu",
    transcript
  );
  console.log(`Snips response!!!`);
  console.log(snipsResults);
  await executeActionForIntent(snipsResults);
};

const executeActionForIntent = async data => {
  const intent = data.intent.intentName.replace("julia:", "");
  const slots = data.slots;
  const simpleSlot = slots.length ? slots[0].value.value : ""; // TODO FIX

  console.log(
    `INTENT: ${intent} \n\n SLOTS: ${JSON.stringify(
      slots
    )} \n\n SIMPLE SLOT: ${simpleSlot}`
  );

  switch (intent) {
    case "mute":
      mute();
      break;
    case "unmute":
      unmute();
      break;
    case "FindTab":
      await superNavigate(simpleSlot);
      break;
    case "play":
      play(simpleSlot);
      break;
    case "pause":
      pause();
      break;
    case "openWebsite":
      superNavigate(simpleSlot);
      break;
    case "search":
      superNavigate(simpleSlot);
      break;
    case "amazonSearch":
      amazonSearch(simpleSlot);
      break;
    case "dismissCurrentTab":
      dismissExtensionTab(0);
      break;
    case "read":
      read();
      break;
    default:
      search(simpleSlot);
      break;
  }
};

const read = () => {
  browser.tabs.toggleReaderMode(triggeringTabId).then(
    () => {
      browser.tabs.executeScript(triggeringTabId, {
        code: `setTimeout(function(){ document.getElementsByClassName("narrate-start-stop")[0].click(); }, 1000);`,
      });
      dismissExtensionTab();
    },
    error => {
      console.error(error);
    }
  );
};

const search = query => {
  const searchURL = constructGoogleQuery(query);
  navigateToURLAfterTimeout(searchURL);
};

const amazonSearch = query => {
  const searchURL = constructAmazonQuery(query);
  navigateToURLAfterTimeout(searchURL);
};

const navigate = query => {
  const searchURL = constructGoogleQuery(query, true);
  navigateToURLAfterTimeout(searchURL);
};

const find = async query => {
  console.log("the most likely query text is " + query);

  // Fuse options
  const options = {
    id: "tabId",
    shouldSort: true,
    tokenize: true,
    findAllMatches: true,
    includeScore: true,
    threshold: 0.3,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 3,
    keys: [
      {
        name: "title",
        weight: 0.8,
      },
      {
        name: "url",
        weight: 0.2,
      },
    ],
  };

  let combinedTabContent = [];

  const tabs = await browser.tabs.query({});

  for (let tab of tabs) {
    if (tab.id === extensionTabId || tab.id === triggeringTabId) {
      continue;
    }

    const result = {
      tabId: tab.id,
      title: tab.title,
      url: tab.url,
    };

    combinedTabContent.push(result);
  }

  combinedTabContent = combinedTabContent.flat();

  // use Fuse.js to parse the most probable response?
  let fuse = new Fuse(combinedTabContent, options);
  const matches = fuse.search(query);
  console.log(matches);
  return matches;
};

const mute = () => {
  browser.tabs
    .query({
      audible: true,
    })
    .then(audibleTabs => {
      if (audibleTabs.empty) {
        // pass a message back to the content script to update the UI and indicate that we don't have any audible tabs
      } else {
        // pass a message back to indicate that the tabs are currently being muted
        console.log("these are the audible tabs");
        console.log(audibleTabs);
        // mute each audible tab
        for (let tab of audibleTabs) {
          browser.tabs.update(tab.id, {
            muted: true,
          });
        }
      }
    });

  // dismiss mute tab after delay
  dismissExtensionTab();
};

const unmute = () => {
  browser.tabs
    .query({
      audible: false,
    })
    .then(mutedTabs => {
      if (mutedTabs.empty) {
        // pass a message back to the content script to update the UI and indicate that we don't have any muted tabs
      } else {
        // pass a message back to indicate that the tabs are currently being un-muted
        // unmute each muted tab
        for (let tab of mutedTabs) {
          browser.tabs.update(tab.id, {
            muted: false,
          });
        }
      }
    });

  dismissExtensionTab();
};

// Plays the first(?) video or audio element on the current tab. Video given higher precedence than audio
const play = query => {
  let playerTab;
  if (query.length) {
    // Multi-part execution task: will do magical IFL Google Search, then execute play once the page loads
    const googleQueryURL = constructGoogleQuery(query, true);
    playerTab = browser.tabs.update({
      url: googleQueryURL,
    });
  } else {
    playerTab = browser.tabs.get(triggeringTabId);
  }

  playerTab
    .then(tab => {
      // get video content for the current tab
      let waitForLoad = setTimeout(function() {
        browser.tabs
          .executeScript(tab.id, {
            file: "/js/playMedia.js",
          })
          .then(result => {
            console.log(result);
          });
      }, 3000);
    })
    .then(() => {
      if (!query.length) dismissExtensionTab();
    });
};

const pause = () => {
  var getCurrentTab = browser.tabs.get(triggeringTabId);

  getCurrentTab.then(tab => {
    console.log("argh here");
    // get video content for the current tab
    browser.tabs
      .executeScript(tab.id, {
        file: "/js/pauseMedia.js",
      })
      .then(result => {
        console.log(result);
      });
  });
};

const dismissExtensionTab = (timeout = 2000) => {
  let dismissMuteTab = setTimeout(function() {
    browser.tabs.remove(extensionTabId);
  }, timeout);
};

const constructGoogleQuery = (query, feelingLucky = false) => {
  let searchURL = new URL("https://www.google.com/search");
  searchURL.searchParams.set("q", query);
  if (feelingLucky) searchURL.searchParams.set("btnI", "");
  return searchURL.href;
};

const constructAmazonQuery = query => {
  let searchURL = new URL("https://www.amazon.com/s");
  searchURL.searchParams.set("k", query);
  return searchURL.href;
};

const navigateToURLAfterTimeout = searchURL => {
  setTimeout(function() {
    browser.tabs.update({
      url: searchURL,
    });
  }, 1000);
};

const searchRecentHistory = async query => {
  console.log("the query is ");
  console.log(query);

  const searchResults = await browser.history.search({
    text: query,
    startTime: 0,
    maxResults: 1,
  });

  console.log(searchResults);
  return searchResults;
};

const supportedSearchEngine = query => {
  browser.search.search({
    query: query,
    engine: "Wikipedia (en)", // TODO FIX
    tabId: extensionTabId,
  });
};

const superNavigate = async query => {
  const matchingTabs = await find(query);
  console.log(JSON.stringify(matchingTabs));
  const matchingTab = matchingTabs[0];
  if (matchingTab && 1 - matchingTab.score > 0.8) {
    const matchingTabId = parseInt(matchingTab.item);
    setActiveTab(matchingTabId);
    return;
  }

  let topHistoryResult = await searchRecentHistory(query);
  console.log("the top history result is this!!!");
  console.log(JSON.stringify(topHistoryResult));
  if (topHistoryResult.length) {
    topHistoryResult = topHistoryResult[0];
    navigateToURLAfterTimeout(topHistoryResult.url);
    return;
  }

  // supportedSearchEngineDetected =

  // if (supportedSearchEngineDetected) {
  //     supportedSearchEngine(query, searchEngine);
  //     return;
  // }

  // If all the previous efforts to find a relevant page fail, default to I'm Feeling Lucky Google Search
  navigate(query);
};

const setActiveTab = tabId => {
  browser.tabs
    .update(tabId, {
      active: true,
    })
    .then(() => {
      dismissExtensionTab();
    });
};
