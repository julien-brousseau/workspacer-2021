import { initDb } from '../db/jsstore.js';
import * as db from '../db/methods.js';

initDb();

browser.runtime.onMessage.addListener(handleMessageFromBackground);
// console.log("BACKGROUND LOADED :>> ");

async function handleMessageFromBackground(action) {
  // console.log('HANDLE ACTION :>> ', action);

  switch (action.type) {
    case 'FETCH_ALL_WORKSPACES':
      return await db.fetchAll();

    case 'FETCH_SINGLE_WORKSPACE':
      return await db.fetchOneWorkspace(action.id);

    case 'CREATE_WORKSPACE':
      return await db.createWorkspace(action.workspace);

    case 'DELETE_ALL_WORKSPACES':
      return await db.deleteEverything();

    default:
      console.log('ACTION NOT FOUND');
  }
}
