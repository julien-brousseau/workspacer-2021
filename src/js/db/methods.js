import { connection } from './jsstore.js';

import { WORKSPACES_TABLE, TABS_TABLE } from './schema.js';

// Fetch
export const fetchAll_separated = async () => {
  const workspaces = await connection.select({
    from: WORKSPACES_TABLE,
  });
  const tabs = await connection.select({
    from: TABS_TABLE,
  });
  return { workspaces, tabs };
};

export const fetchAll = async () => {
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

export const fetchTabsFromWorkspace = async wsId => {
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

// Create/edit
export const createOrUpdateTabs = async (tabs) => {
  const { wsId } = tabs[0];

  // Fetch tabs from workspace and exclude those in args
  const tabIds = tabs.map(t => t.tabId || 0);
  const tabsFromWorkspace = (await fetchTabsFromWorkspace(wsId))
    .filter(t => !tabIds.includes(t.tabId));

  // Merge filtered workspace tabs with new tabData
  const values = [...tabsFromWorkspace, ...tabs]
    // Sort by position and pinned status
    .sort((a, b) => a.position === b.position ? 0 : a.position > b.position ? 1 : -1)
    .sort((a, b) => b.pinned - a.pinned)
    // Reset the position of each tab
    .map((t, i) => ({ ...t, position: i + 1 }));
  
  console.log('values :>> ', values);
  const insertedTabs = await connection.insert({
    into: TABS_TABLE,
    values,
    return: true,
    upsert: true,
  });
  console.log('insertedTabs :>> ', insertedTabs);
  return insertedTabs[0];
};

export const createOrUpdateWorkspace = async (ws) => {
  const workspace = await connection.insert({
    into: WORKSPACES_TABLE,
    values: [ws],
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

// export const fetchOneWorkspace = async (id) => {
//   const workspace = await connection.select({
//     from: WORKSPACES_TABLE,
//     where: { id },
//     limit: 1,
//   });
//   const tabs = await connection.select({
//     from: TABS_TABLE,
//     where: { wsId: id },
//   });
//   return { ...workspace[0], tabs };
// };
