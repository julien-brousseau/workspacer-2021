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
    return await db.createOrUpdateTab({ ...tab, wsId: action.workspace.id });
  }
  else if (action.type === 'CREATE_WORKSPACE') {
    return await db.createWorkspace(action.workspace);
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
      if (!isTabValid(tab)) {
        console.log('Warning: Pages using about: protocol cannot be saved in workspaces');
        return;
      }
      // const props = ['tabId', 'wsId', 'title', 'url', 'pinned', 'discarded', 'favIconUrl', 'position']
      // TODO: filter props
      return tab;
    })
    .catch(e => 'fetchActiveTab >> ' + e);
}

// 
function isTabValid(tab) {
  return tab.url.slice(0, 6) !== 'about:';
}