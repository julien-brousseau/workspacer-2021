import { initDb } from '../db/jsstore.js';
import * as db from '../db/methods.js';

initDb();

browser.runtime.onMessage.addListener(handleMessageFromBackground);

async function handleMessageFromBackground (action) {
  // Fetch
  if (action.type === 'FETCH_ALL_WORKSPACES') {
    return await db.fetchAllWorkspaces();

  // Create/edit
  } else if (action.type === 'CREATE_OR_EDIT_WORKSPACE') {
    return await db.createOrUpdateWorkspace(action.workspace);

  } else if (action.type === 'CREATE_OR_EDIT_TABS') {
    return await db.createOrUpdateTabs(action.tabs);

  } else if (action.type === 'ADD_CURRENT_TAB_TO_WORKSPACE') {
    const tab = await getCurrentTab();
    if (!tab) return 0;
    await db.createOrUpdateTabs([{ ...tab, wsId: action.workspace.id }]);
    return 1;

  } else if (action.type === 'ADD_CURRENT_WINDOW_TO_WORKSPACE') {
    const tabs = await fetchAllTabsFromWindow();
    if (!tabs.length) return 0;
    await db.createOrUpdateTabs(tabs.map(t => ({ ...t, wsId: action.workspace.id })));
    return tabs.length;
    
  // Delete
  // } else if (action.type === 'DELETE_TAB_BY_ID') {
  //   return await db.deleteTab(action.tabId);

  } else if (action.type === 'DELETE_TABS') {
    return await db.deleteTabs(action.tabs);

  } else if (action.type === 'CLEAR_WORKSPACE_TABS') {
    return await db.deleteTabsFromWorkspace(action.wsId);

  } else if (action.type === 'DELETE_WORKSPACE') {
    return await db.deleteWorkspace(action.wsId);

  } else if (action.type === 'CLEAR_WORKSPACES') {
    return await db.deleteEverything();
    
  // Browser actions
  } else if (action.type === 'OPEN_WORKSPACE') {
    const { currentWindow, tabs } = action;
    openTabsInWindow(tabs, currentWindow);
    
  } else {
    console.log('ACTION NOT FOUND');
  }
}

// Fetch the active {tab} from current window
async function getCurrentTab () {
  return browser.tabs.query({ currentWindow: true, active: true })
    .then(([tab]) => {
      // Exclude invalid tabs
      if (tab.url.slice(0, 6) === 'about:') {
        console.log('Warning: Pages using about: protocol cannot be saved in workspaces');
        return false;
      }
      return filterRawTab(tab);
    })
    .catch(e => 'Error > getCurrentTab >> ' + e);
}

// Fetch all tabs from the current window
async function fetchAllTabsFromWindow () {
  return browser.tabs.query({ currentWindow: true })
    .then(tabs => tabs
      .filter(t => t.url.slice(0, 6) !== 'about:')
      .map(t => filterRawTab(t)))
    .catch(e => console.log('Error > fetchAllTabsFromWindow :>> ', e));
}

// Filter out un-necessary props from a browser's tab object
function filterRawTab (tab) {
  const props = ['title', 'url', 'pinned', 'discarded', 'favIconUrl'];
  return props.reduce((filteredProps, prop) => ({ ...filteredProps, [prop]: tab[prop] }), {});
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
