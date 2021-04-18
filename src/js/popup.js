const DEBUG = false;

// Main 
const Logic = {
  _sections: {},
  _workspaces: [],
  _currentWorkspace: null,
  _currentTab: null,

  async init () {
  },

  // Getters - Workspace
  workspaces () {
    return this._workspaces;
  },
  workspace (id) {
    return this.workspaces().find(ws => ws.id === id);
  },
  currentWorkspace () {
    return this._currentWorkspace;
  },
  nextWorkspaceId () {
    const ids = this.workspaces().map(w => w.id);
    return Math.max(...ids.length ? ids : [0]) + 1;
  },

  // Getters - Tabs
  tab (id) {
    return this.workspaces()
      .find(ws => ws.tabs.map(tab => tab.tabId).includes(id))
      .tabs
      .find(tab => tab.tabId === id);
  },
  currentTab () {
    return this._currentTab;
  },
  allTabs () {
    return this.workspaces()
      .reduce((tabs, ws) => [...tabs, ...ws.tabs], []);
  },

  // Fetch workspace data from backend
  async refreshWorkspaces (){
    return browser.runtime.sendMessage({ type: 'FETCH_ALL_WORKSPACES' })
      .then(workspaces => {
        if (DEBUG) console.log('Loaded workspaces :>> ', workspaces);
        this._workspaces = workspaces;
        return;
      })
      .catch(e => console.log('Error > refreshWorkspaces >> ', e)); 
  },

  // Refresh data and process section 
  async showSection (sectionName, ids = {}) {

    // Reload workspaces from db
    await this.refreshWorkspaces();

    // Set or remove current workspace data
    const { wsId, tabId } = ids;
    this._currentWorkspace = null;
    this._currentTab = null;

    if (wsId) {
      this._currentWorkspace = this.workspace(wsId);
    }

    if (tabId) {
      this._currentTab = this.tab(tabId);
      // Current tab workspace has precedence over function param
      this._currentWorkspace = this._currentTab.wsId;
    }

    // Set and render current section
    const section = this._sections[sectionName];
    await section.render();
    
    // Hide all sections
    Object.keys(this._sections).forEach(k => {
      const sectionContainer = document.getElementById(this._sections[k].sectionId);
      if (!sectionContainer.classList.contains('hide')) {
        sectionContainer.classList.add('hide');
      }
    });

    // Un-hide current section
    const sectionSelector = document.getElementById(section.sectionId);
    sectionSelector.classList.remove('hide');
  },

  // Swap tab positions
  async moveTab (tab, direction) {
    if (!['up', 'down'].includes(direction)) return console.log('Invalid direction:', direction);
    
    const wsTabs = this._currentWorkspace.tabs;
    const tabIndex = wsTabs.findIndex(t => t.tabId === tab.tabId);

    const mod = direction === 'down' ? 1 : -1;
    const modTabs = [tab, wsTabs[tabIndex + mod]];
    const positions = modTabs.map(t => t.position).reverse();

    const tabs = modTabs.map((t, i) => ({ ...t, position: positions[i] }));
    await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_TABS', tabs });
    this.showSection('workspace', { wsId: this._currentWorkspace.id });
  },

  // Toggle pinning tab on top section of the list
  async pinTab (tab) {
    const tabs = [{ ...tab, pinned: !tab.pinned }];
    await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_TABS', tabs });
    this.showSection('workspace', { wsId: tab.wsId });
  },

  // Register and render static elements
  registerSection (name, section) {
    this._sections[name] = section;
    section.renderStatic();
  },

  // Export all workspaces and tabs as a JSON file in Downloads folder
  async exportAsJSON () {
    const type = 'text/json;charset=utf-8';
    const filename = 'workspacer_data_' + new Date().getTime() + '.json';

    const json = JSON.stringify({ 
      // Remove tabs from workspaces to preserve consistency with v1 data format
      ws: this.workspaces().map(({ tabs, ...ws }) => ({ ...ws })),  // eslint-disable-line
      tabs: this.allTabs() 
    });

    const url = URL.createObjectURL(new Blob([json], { type }));
    if (DEBUG) console.log('Exporting workspaces :>> ', JSON.parse(json));

    return browser.downloads.download({ url, filename });
  }
};

// -------------------------------------------------------------------------
// Helpers

// Clears all listeners from html element by replacing the node in DOM
function removeListeners (id) {
  const node = document.getElementById(id);
  const clone = node.cloneNode(true);
  node.parentNode.replaceChild(clone, node);
}

// -------------------------------------------------------------------------
// Sections

Logic.registerSection('workspaces', {
  sectionId: 'container-workspaces',
  renderStatic () {
    document.getElementById('settings-button').addEventListener('click', () => { 
      Logic.showSection('settings'); 
    });
    document.getElementById('new-workspace-button').addEventListener('click', () => { 
      Logic.showSection('workspace-form'); 
    });
  },
  async render () {
    const workspaces = Logic.workspaces();

    const fragment = document.createDocumentFragment();
    workspaces.forEach(workspace => {
      const container = document.createElement('div');
      container.classList.add('item', 'clickable');

      // Tab count label
      const tag = document.createElement('div');
      const nbTabs = workspace.tabs.length;
      tag.classList.add('ui', 'basic', 'circular', 'label');
      tag.innerHTML = nbTabs;
      tag.title = `This worspace contains ${ nbTabs || 'no' } tab${ nbTabs > 1 ? 's' : '' }`;
      container.appendChild(tag);

      // Workspace title
      const title = document.createElement('h2');
      title.innerHTML = workspace.title;
      container.appendChild(title);
      
      // Controls
      const btnGroup = document.createElement('div');
      btnGroup.classList.add('ui', 'icon', 'buttons');

        // Add 'add tab to workspace' button
        const button_add = document.createElement('button');
        button_add.classList.add('ui', 'basic', 'green', 'button');
        button_add.innerHTML = '<i class="plus icon"></i>';
        button_add.title = 'Add current tab';
        button_add.addEventListener('click', async event => { 
          event.stopPropagation();
          await browser.runtime.sendMessage({ type: 'ADD_CURRENT_TAB_TO_WORKSPACE', workspace });
          Logic.showSection('workspaces'); 
        });
        btnGroup.appendChild(button_add);

        // Add 'open in new window' button
        const button_open = document.createElement('button');
        button_open.classList.add('ui', 'basic', 'orange', 'button');
        button_open.innerHTML = '<i class="external alternate icon"></i>';
        button_open.title = 'Open in new window';
        button_open.addEventListener('click', event => { 
          event.stopPropagation();
          browser.runtime.sendMessage({ type: 'OPEN_WORKSPACE', tabs: workspace.tabs });
        });
        btnGroup.appendChild(button_open);
      container.appendChild(btnGroup);

      // Main click event
      container.addEventListener('click', () => { 
        Logic.showSection('workspace', { wsId: workspace.id }); 
      });

      fragment.appendChild(container);
    });

    // Empty item
    if (!workspaces.length) {
      const emptyItem = document.createElement('div');
      emptyItem.classList.add('item', 'empty');
      emptyItem.innerHTML = '<h2>You have no workspace</h2>Create a new workspace to continue.';
      fragment.appendChild(emptyItem);
    }

    document.getElementById('container-workspaces-content').innerHTML = '';
    document.getElementById('container-workspaces-content').appendChild(fragment);
    // return Promise.resolve();
  }
});

Logic.registerSection('workspace', {
  sectionId: 'container-workspace',
  renderStatic () {
    document.getElementById('workspace-back-button').addEventListener('click', () => { 
      Logic.showSection('workspaces'); 
    });
  },
  async render () {
    const workspace = Logic.currentWorkspace();
    if (DEBUG) console.log('Current workspace :>> ', workspace);

    const fragment = document.createDocumentFragment();
    document.getElementById('workspace-title').innerHTML = workspace.title;

    // Static buttons
    removeListeners('workspace-add-current-tab-button');
    document.getElementById('workspace-add-current-tab-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'ADD_CURRENT_TAB_TO_WORKSPACE', workspace });
      Logic.showSection('workspace', { wsId: workspace.id }); 
    });
    removeListeners('workspace-add-all-tabs-button');
    document.getElementById('workspace-add-all-tabs-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'ADD_CURRENT_WINDOW_TO_WORKSPACE', workspace });
      Logic.showSection('workspace', { wsId: workspace.id }); 
    });
    removeListeners('workspace-open-in-new-window-button');
    document.getElementById('workspace-open-in-new-window-button').addEventListener('click', () => { 
      browser.runtime.sendMessage({ type: 'OPEN_WORKSPACE', tabs: workspace.tabs });
    });
    removeListeners('workspace-open-in-current-window-button');
    document.getElementById('workspace-open-in-current-window-button').addEventListener('click', () => { 
      browser.runtime.sendMessage({ type: 'OPEN_WORKSPACE', currentWindow: true, tabs: workspace.tabs });
    });
    removeListeners('workspace-rename-button');
    document.getElementById('workspace-rename-button').addEventListener('click', () => { 
      Logic.showSection('workspace-form', { wsId: workspace.id }); 
    });
    removeListeners('workspace-delete-tabs-button');
    document.getElementById('workspace-delete-tabs-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'CLEAR_WORKSPACE_TABS', workspace });
      Logic.showSection('workspace', { wsId: workspace.id }); 
    });
    removeListeners('workspace-delete-button');
    document.getElementById('workspace-delete-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'DELETE_WORKSPACE', workspace });
      Logic.showSection('workspaces'); 
    });

    // Tab list
    workspace.tabs.forEach(tab => {
      const { title, tabId, wsId, favIconUrl: icon, pinned } = tab;
      const container = document.createElement('div');
      container.classList.add('item', 'tab');

      // Append favicon image or placeholder
      const favIcon = document.createElement(icon ? 'img' : 'div');
      favIcon.classList.add('favIcon');
      if (icon) favIcon.src = icon;
      else favIcon.classList.add('empty');
      container.appendChild(favIcon);

      // Append title
      const labelTitle = document.createElement('span');
      labelTitle.innerHTML = title;
      // labelTitle.innerHTML = `[${ tabId }] ${ title }`;
      labelTitle.classList.add('title');
      container.appendChild(labelTitle);

      // Append controls
      const btnGroup = document.createElement('div');
      btnGroup.classList.add('ui', 'mini', 'basic', 'icon', 'buttons');

        // Move up
        const btnUp = document.createElement('button');
        btnUp.classList.add('ui', 'button', 'move-up');
        btnUp.innerHTML = '<i class="caret up icon"></i>';
        btnUp.title = 'Move up';
        btnGroup.appendChild(btnUp);
        btnUp.addEventListener('click', () => Logic.moveTab(tab, 'up')); 

        // Move down
        const btnDown = document.createElement('button');
        btnDown.classList.add('ui', 'button', 'move-down');
        btnDown.innerHTML = '<i class="caret down icon"></i>';
        btnDown.title = 'Move down';
        btnGroup.appendChild(btnDown);
        btnDown.addEventListener('click', () => Logic.moveTab(tab, 'down')); 

        // Pin
        const btnPin = document.createElement('button');
        btnPin.classList.add('ui', 'button');
        if (pinned) btnPin.classList.add('pinned');
        btnPin.innerHTML = '<i class="pin icon"></i>';
        btnPin.title = pinned ? 'Unpin tab' : 'Pin tab';
        btnGroup.appendChild(btnPin);
        btnPin.addEventListener('click', () => Logic.pinTab(tab)); 

        // Modify
        const btnEdit = document.createElement('button');
        btnEdit.classList.add('ui', 'button');
        btnEdit.innerHTML = '<i class="pencil icon"></i>';
        btnEdit.title = 'Modify tab info';
        btnGroup.appendChild(btnEdit);
        btnEdit.addEventListener('click', () => Logic.showSection('tab-form', { tabId })); 

        // Delete
        const btnDelete = document.createElement('button');
        btnDelete.classList.add('ui', 'button');
        btnDelete.innerHTML = '<i class="trash icon"></i>';
        btnDelete.title = 'Delete this tab';
        btnGroup.appendChild(btnDelete);
        btnDelete.addEventListener('click', async () => {
          await browser.runtime.sendMessage({ type: 'DELETE_TAB_BY_ID', tabId }); 
          Logic.showSection('workspace', { wsId }); 
        }); 

        container.appendChild(btnGroup);
      fragment.appendChild(container);
    });

    // Empty item
    if (!workspace.tabs.length) {
      const emptyItem = document.createElement('div');
      emptyItem.classList.add('item', 'empty');
      emptyItem.innerHTML = 'This workspace contains no tabs';
      fragment.appendChild(emptyItem);
    }

    document.getElementById('container-workspace-tablist').innerHTML = '';
    document.getElementById('container-workspace-tablist').appendChild(fragment);
  }
});

Logic.registerSection('workspace-form', {
  sectionId: 'container-workspace-form',
  renderStatic () {
    document.getElementById('workspace-form-back-button').addEventListener('click', () => { 
      Logic.showSection('workspaces'); 
    });
  },
  async render () {
    const workspace = Logic.currentWorkspace() || {};
    
    // Title
    document.getElementById('workspace-form-header-title').innerHTML = workspace.id ? 'Edit existing workspace' : 'Create new workspace';
    
    // Fields
    document.getElementById('workspace-form-title').value = workspace.id ? workspace.title : '';
    
    // Submit button
    removeListeners('workspace-form');
    document.getElementById('workspace-submit-button').innerHTML = workspace.id ? 'Save' : 'Create';
    document.getElementById('workspace-form').addEventListener('submit', async event => { 
      event.preventDefault();
      if (!event.target.elements[0].value) return;
      await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_WORKSPACE', workspace: { ...workspace, title: event.target.elements[0].value } }); 
      Logic.showSection('workspaces'); 
    });
  }
});

Logic.registerSection('tab-form', {
  sectionId: 'container-tab-form',
  renderStatic () {
  },
  async render () {
    const tab = Logic.currentTab() || { tabId: 999, title: 'This title should not be shown', wsId: 1, url: 'www.perdu.com' };
    
    // Back button
    document.getElementById('tab-form-back-button').addEventListener('click', () => { 
      Logic.showSection('workspace', { wsId: tab.wsId }); 
    });

    // Fields
    document.getElementById('tab-form-title').value = tab.title;
    document.getElementById('tab-form-url').value = tab.url;
    
    // Submit button
    removeListeners('tab-form');
    document.getElementById('tab-form').addEventListener('submit', async event => { 
      event.preventDefault();
      if (!event.target.elements[0].value) return;  // TODO: Replace with validation

      // Merge form data with tab, and make it a single-element array
      const allowedFields = ['title', 'url'];
      const tabs = [Object.assign(tab, [...event.target.elements]
        .filter(e => allowedFields.includes(e.name))
        .map(e => ({ [e.name]: e.value }))
        .reduce((data, e) => Object.assign(data, e), {}))];

      await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_TABS', tabs }); 
      Logic.showSection('workspace', { wsId: tab.wsId }); 
    });
  }
});

Logic.registerSection('settings', {
  sectionId: 'container-settings',
  renderStatic () {
    document.getElementById('settings-back-button').addEventListener('click', () => { 
      Logic.showSection('workspaces'); 
    });
    document.getElementById('delete-all-workspaces-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'CLEAR_WORKSPACES' }); 
      Logic.showSection('workspaces'); 
    });
  },
  async render () {
    // Export button
    removeListeners('export-all-workspaces-button');
    document.getElementById('export-all-workspaces-button').addEventListener('click', async () => { 
      Logic.exportAsJSON();
    });

    // Import button
    removeListeners('import-all-workspaces-button');
    document.getElementById('import-field').value = '';
    document.getElementById('import-all-workspaces-button').addEventListener('click', async () => { 
      // Fetch ws and tabs from textarea
      const { value } = document.getElementById('import-field');
      const { ws, tabs } = JSON.parse(value);
      const newTabs = [];

      // Create new workspace ids and assign it to tabs
      let wsId = Logic.nextWorkspaceId();
      ws.forEach(w => {
        newTabs.push(...tabs
          // Remove tab ID and set new workspace ID
          .filter(t => t.wsId === w.id)
          .map(({ tabId, ...t }) => ({ ...t, wsId })) // eslint-disable-line
        );
        w.id = wsId ++;
      });

      // Add to database
      await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_WORKSPACE', workspace: ws }); 
      await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_TABS', tabs: newTabs }); 
      if (DEBUG) console.log('Imported workspaces :>> ', ws);
      if (DEBUG) console.log('Imported tabs :>> ', newTabs);

      Logic.showSection('workspaces'); 
    });
  }
});

// Logic.init();
// Logic.showSection('tab-form', { tabId: 3 });
Logic.showSection('workspaces');

// eslint-disable-next-line no-undef
$('.ui.dropdown').dropdown();
