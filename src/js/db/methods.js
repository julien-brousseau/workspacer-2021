import { connection } from './jsstore.js';

import { WORKSPACES_TABLE, TABS_TABLE } from './schema.js';

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
  });
  return workspaces.map(w => ({ ...w, tabs: tabs.filter(t => t.wsId == w.id) }));
};

export const createOrUpdateTabs = async (tabs) => {
  const insertedTabs = await connection.insert({
    into: TABS_TABLE,
    values: tabs,
    return: true,
    upsert: true,
  });
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
