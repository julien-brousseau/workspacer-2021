
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
      //     position: {
      //       dataType: DATA_TYPE.Integer,
      //       notNull: false
      //     },
      //     pinned: {
      //       dataType: DATA_TYPE.Boolean,
      //       notNull: true,
      //       default: false
      //     },
      //     discarded: {
      //       dataType: DATA_TYPE.Boolean,
      //       notNull: true,
      //       default: false
      //     },
      //     favIconUrl: {
      //       dataType: DATA_TYPE.String,
      //       notNull: false
      //     }
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

  return { name: 'workspacer_db', tables: [workspaces_table, tabs_table] };
};
