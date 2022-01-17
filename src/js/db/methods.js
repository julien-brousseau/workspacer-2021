import { connection } from './jsstore.js';
import { WORKSPACES_TABLE, TABS_TABLE } from './schema.js';

// Returns array of Workspaces, each containing a list of Tabs
export const fetchAllWorkspaces = async (identities = []) => {
  // TODO: Use kind of JOIN instead of 2 api calls
  const workspaces = await connection.select({
    from: WORKSPACES_TABLE,
  });
  const tabs = await connection.select({
    from: TABS_TABLE,
    order: [
      { by: 'position', type: 'asc' }, 
      { by: 'pinned', type: 'desc' }
    ]
  });
  
  return workspaces.map(w => ({ 
    ...w, 
    tabs: tabs
      .filter(t => t.wsId == w.id) 
      .map(t => {
        // Get browser container corresponding to tab's cookieStoreId
        const { cookieStoreId = null, name: cookieStoreName = null } = identities.find(i => i.cookieStoreId === t.cookieStoreId) || {};
        return { ...t, cookieStoreName, cookieStoreId };
      })
  }));
};

// 
export const fetchAllTabsFromWorkspace = async wsId => {
  const tabs = await connection.select({
    from: TABS_TABLE,
    where: { wsId },
    order: { by: 'position', type: 'asc' }
  });
  return tabs;
};

// Create new tab, or edit if tab argument contains tabId, then rebuild positions
export const createOrUpdateTabs = async tabs => {
  if (!tabs.length) return;
  const { wsId } = tabs[0];

  // Fetch tabs from workspace and exclude those in args
  const tabIds = tabs.map(t => t.tabId || 0);
  const tabsFromWorkspace = (await fetchAllTabsFromWorkspace(wsId))
    .filter(t => !tabIds.includes(t.tabId));

  // Merge filtered workspace tabs with new tabData
  const values = [...tabsFromWorkspace, ...tabs]
    // Sort by position and pinned status
    .sort((a, b) => a.position === b.position ? 0 : a.position > b.position ? 1 : -1)
    .sort((a, b) => b.pinned - a.pinned)
    // Reset the position of each tab
    .map((t, i) => ({ ...t, position: i + 1 }));
  
  // Replace tabs in database and return promise
  return await connection.insert({
    into: TABS_TABLE,
    values,
    return: true,
    upsert: true,
  });
};

export const createOrUpdateWorkspace = async ws => {
  const workspace = await connection.insert({
    into: WORKSPACES_TABLE,
    values: Array.isArray(ws) ? ws : [ws],
    return: true,
    upsert: true,
  });
  return workspace[0];
};

// Delete
export const deleteWorkspace = async (id) => {
  await connection.remove({
    from: WORKSPACES_TABLE,
    where: { id }
  });
  await connection.remove({
    from: TABS_TABLE,
    where: { wsId: id }
  });
  return;
};

export const deleteTabsFromWorkspace = async (id) => {
  return await connection.remove({
    from: TABS_TABLE,
    where: { wsId: id }
  });
};

export const deleteTabs = async tabs => {
  const ids = tabs.map(t => t.tabId);
  return await connection.remove({
    from: TABS_TABLE,
    where: { tabId: { in: ids } }
  });
};

export const deleteEverything = async () => {
  await connection.clear(WORKSPACES_TABLE);
  await connection.clear(TABS_TABLE);
  return true;
};
