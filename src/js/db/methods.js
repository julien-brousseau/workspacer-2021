import { connection } from './jsstore.js';

import { WORKSPACES_TABLE, TABS_TABLE } from './schema.js';

// Returns array of Workspaces, each containing a list of Tabs
export const fetchAllWorkspaces = async () => {
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
  return workspaces.map(w => ({ ...w, tabs: tabs.filter(t => t.wsId == w.id) }));
};

// 
export const fetchAllTabsFromWorkspace = async wsId => {
  const tabs = await connection.select({
    from: TABS_TABLE,
    where: { wsId },
    order: {
      by: 'position',
      type: 'asc'
    }
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
export const deleteWorkspace = async (workspace) => {
  await connection.remove({
    from: WORKSPACES_TABLE,
    where: { id: workspace.id }
  });
  await connection.remove({
    from: TABS_TABLE,
    where: { wsId: workspace.id }
  });
  return;
};

export const deleteTabsFromWorkspace = async (wsId) => {
  await connection.remove({
    from: TABS_TABLE,
    where: { wsId }
  });
  return;
};

export const deleteTab = async (tabId) => {
  await connection.remove({
    from: TABS_TABLE,
    where: { tabId }
  });
  return;
};

export const deleteEverything = async () => {
  await connection.clear(WORKSPACES_TABLE);
  await connection.clear(TABS_TABLE);
  return true;
};
