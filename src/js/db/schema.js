
export const WORKSPACES_TABLE = 'workspaces';
export const TABS_TABLE = 'tabs';

export const schema = () => {
  const workspaces_table = {
    name: WORKSPACES_TABLE,
    columns: {
      id: {
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        dataType: 'string',
        notNull: true,
      },
      description: {
        dataType: 'string',
        // notNull: true
      },
      icon: {
        dataType: 'string',
        notNull: true,
        default: 'circle'
      },
    },
  };
  const tabs_table = {
    name: TABS_TABLE,
    columns: {
      // Not using 'id' as PK to prevent mixup with browser tab id
      tabId: {
        primaryKey: true,
        autoIncrement: true,
      },
      wsId: {
        dataType: 'number',
        notNull: true,
      },
      title: {
        dataType: 'string',
        notNull: true,
      },
      url: {
        dataType: 'string',
        notNull: true,
      },
      position: {
        dataType: 'number',
        notNull: true
      },
      pinned: {
        dataType: 'boolean',
        notNull: true,
        default: false
      },
      favIconUrl: {
        dataType: 'string',
        notNull: false
      },
      //     discarded: {
      //       dataType: DATA_TYPE.Boolean,
      //       notNull: true,
      //       default: false
      //     },
      //     // cookieStoreId: {
      //     //   dataType: DATA_TYPE.Integer,
      //     //   notNull: true,
      //     //   default: false
      //     // },
      //     // isInReaderMode: {
      //     //   dataType: DATA_TYPE.Boolean,
      //     //   notNull: false
      //     // },
    },
  };

  return { name: 'workspacer_db', tables: [workspaces_table, tabs_table]};
};
