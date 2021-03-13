import { initDb } from '../db/jsstore.js';
import * as db from '../db/methods.js';

initDb();

browser.runtime.onMessage.addListener(handleMessageFromBackground);

async function handleMessageFromBackground(action) {
  if (action.type === 'FETCH_ALL_WORKSPACES') {
    return await db.fetchAll();
  }
  else if (action.type === 'ADD_CURRENT_TAB_TO_WORKSPACE') {
    const tab = await fetchActiveTab();
    return tab ? await db.createOrUpdateTab({ ...tab, wsId: action.workspace.id }) : false;
  }
  else if (action.type === 'OPEN_WORKSPACE_IN_NEW_WINDOW') {
    openTabsInWindow(action.tabs);
  }
  else if (action.type === 'CREATE_WORKSPACE') {
    return await db.createOrUpdateWorkspace(action.workspace);
  }
  else if (action.type === 'DELETE_ALL_WORKSPACES') {
    return await db.deleteEverything();
  }
  else {
    console.log('ACTION NOT FOUND');
  }
}

// Fetch the active {tab} from current window
async function fetchActiveTab () {
  return browser.tabs.query({ currentWindow: true, active: true })
    .then(([tab]) => {
      // Exclude invalid tabs
      if (tab.url.slice(0, 6) === 'about:') {
        console.log('Warning: Pages using about: protocol cannot be saved in workspaces');
        return false;
      }
      // Filter relevant properties
      const props = ['title', 'url', 'pinned', 'discarded', 'favIconUrl'];
      return props.reduce((obj, key) => ({ ...obj, [key]: tab[key] }), {});
    })
    .catch(e => 'fetchActiveTab >> ' + e);
}

// Query browser to create a new window containing [tabs]
async function openTabsInWindow (tabs, currentWindow = false) {
  // Select the target window
  const window = currentWindow
    ? await browser.windows.getCurrent({ populate: true })
    : await browser.windows.create();

  // List of tabs to remove (previous tabs in current window or empty tab in new window)
  const tabsToRemove = window.tabs.map(t => t.id);

  // Props to filter out from tab object
  const conflictingProps = ['tabId', 'position', 'wsId', 'favIconUrl'];

  // Create a new tabs
  await tabs.forEach(tab => {
    browser.tabs.create({
      // Remove properties conflicting with browser tab creation
      ...Object.keys(tab).reduce((obj, prop) => !conflictingProps.includes(prop) ? { ...obj, [prop]: tab[prop] } : { ...obj }, {}),
      windowId: window.id,
      // Force title only for undiscarded tabs
      title: tab.discarded ? tab.title : null,
      // Auto-discard tab if not pinned
      discarded: !tab.pinned
    });
  });
  // Clear un-needed tabs
  browser.tabs.remove(tabsToRemove);
}
