import { connection } from './jsstore.js';
import { WORKSPACES_TABLE, TABS_TABLE } from './schema.js';


// Update workspace timestamp ('updated' field)
const updateWorkspaceTS = async id => {
  const ids = Array.isArray(id) ? id : [id];
  return await connection.update({
    in: WORKSPACES_TABLE,
    set: { updated: (new Date()).getTime() },
    where: { id: { in: ids } }
  });
};

// Returns array of Workspaces, each containing a list of Tabs
export const fetchAllWorkspaces = async (identities = []) => {
  // TODO: Use kind of JOIN instead of 2 api calls
  const workspaces = await connection.select({
    from: WORKSPACES_TABLE,
    order: [
      { by: 'position', type: 'asc' }
    ]
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

  // Get id from first tab
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
  
  // Replace tabs in database
  const insert = await connection.insert({
    into: TABS_TABLE,
    values,
    return: true,
    upsert: true,
  });
  
  // Update workspace timestamp everytime a tab is added/modified
  if (insert) await updateWorkspaceTS(wsId);

  return insert
};

export const createOrUpdateWorkspace = async ws => {
  // Arrayify and add timestamp
  const values = Array.isArray(ws) ? ws : [ws];
  values[0].updated = (new Date()).getTime();

  const workspace = await connection.insert({
    into: WORKSPACES_TABLE,
    values,
    return: true,
    upsert: true,
  });
  return workspace[0];
};

// Delete
export const deleteWorkspace = async id => {
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

export const deleteTabsFromWorkspace = async wsId => {
  const remove = await connection.remove({
    from: TABS_TABLE,
    where: { wsId }
  });
  
  // Update workspace timestamp when tabs are removed
  if (remove) await updateWorkspaceTS(wsId);

  return remove;
};

export const deleteTabs = async tabs => {
  const ids = tabs.map(t => t.tabId);
  const wsIds = [...new Set(tabs.map(t => t.wsId))];
  
  const remove = await connection.remove({
    from: TABS_TABLE,
    where: { tabId: { in: ids } }
  });

  // Update timestamps for all workspaces where tabs are removed
  if (remove) await updateWorkspaceTS(wsIds);

  return remove;
};

export const deleteEverything = async () => {
  await connection.clear(WORKSPACES_TABLE);
  await connection.clear(TABS_TABLE);
  return true;
};
