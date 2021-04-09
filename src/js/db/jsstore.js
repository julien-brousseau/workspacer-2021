import { schema } from './schema.js';

// eslint-disable-next-line no-undef
export const connection = new JsStore.Connection(
  new Worker('../lib/jsstore.worker.min.js')
);
// connection.setLogStatus(true);

export async function initDb() {
  var isDbCreated = await connection.initDb(schema());
  if (isDbCreated) {
    seedWorkspaces();
    console.log('db created');
  } else {
    console.log('db opened');
  }
}

// Temporary seed during dev
const seedWorkspaces = async () => {
  await connection.insert({
    into: 'workspaces',
    values: [
      { title: 'Workspace 1', description: 'Facebook, Twitter, etc' },
      { title: 'Workspace 2', description: 'Coding' },
      { title: 'Workspace 3', description: 'Studying' },
    ],
  });

  await connection.insert({
    into: 'tabs',
    values: [
      { wsId: 1, title: 'Tab 1', url: '1.com', position: 1 },
      { wsId: 1, title: 'Tab 2', url: '2.com', position: 2 },
      { wsId: 1, title: 'Tab 3', url: '3.com', position: 3 },
      { wsId: 2, title: 'Tab 4', url: '4.com', position: 1 },
      { wsId: 2, title: 'Tab 5', url: '5.com', position: 2 },
      { wsId: 3, title: 'Tab 6', url: '6.com', position: 1 },
    ],
  });
  return;
};
