// Main 
const Logic = {
  _sections: {},
  _workspaces: [],
  _currentWorkspace: null,
  _currentTab: null,

  async init() {
  },

  // Getters
  workspaces() {
    return this._workspaces;
  },
  workspace(id) {
    return this.workspaces().find(ws => ws.id === id);
  },
  currentWorkspace() {
    return this._currentWorkspace;
  },

  tab(id) {
    return this.workspaces()
      .find(ws => ws.tabs.map(tab => tab.tabId).includes(id))
      .tabs
      .find(tab => tab.tabId === id);
  },
  currentTab() {
    return this._currentTab;
  },

  // Fetch workspace data from backend
  async refreshWorkspaces(){
    return browser.runtime.sendMessage({ type: 'FETCH_ALL_WORKSPACES' })
      .then(workspaces => {
        console.log('workspaces :>> ', workspaces);
        this._workspaces = workspaces;
        return;
      })
      .catch(e => console.log('Error > refreshWorkspaces >> ', e)); 
  },

  // Refresh data and process section 
  async showSection(sectionName, ids = {}) {

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

  // 
  async pinTab (tab) {
    const tabs = [{ ...tab, pinned: !tab.pinned }];
    console.log('tabs :>> ', tabs);
    await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_TABS', tabs });
    this.showSection('workspace', { wsId: tab.wsId });
  },

  // Pre-build and init section
  registerSection(name, section) {
    this._sections[name] = section;
    section.init();
  },
};

// -------------------------------------------------------------------------
// Helpers

// Clears all listeners from html element by replacing the node in DOM
function removeListeners(id) {
  const node = document.getElementById(id);
  const clone = node.cloneNode(true);
  node.parentNode.replaceChild(clone, node);
}

// -------------------------------------------------------------------------
// Sections

Logic.registerSection('workspaces', {
  sectionId: 'container-workspaces',
  init() {
    document.getElementById('settings-button').addEventListener('click', () => { 
      Logic.showSection('settings'); 
    });
    document.getElementById('new-workspace-button').addEventListener('click', () => { 
      Logic.showSection('workspace-form'); 
    });
  },
  async render() {
    const fragment = document.createDocumentFragment();
    Logic.workspaces().forEach(workspace => {
      const div = document.createElement('div');
      div.classList.add('item', 'clickable');

      // Add 'open in new window' button
      const button_open = document.createElement('button');
      button_open.classList.add('ui', 'tiny', 'basic', 'green', 'icon', 'button', 'right', 'floated');
      button_open.innerHTML = '<i class="external alternate icon"></i>';
      button_open.title = 'Open in new window';
      button_open.addEventListener('click', event => { 
        event.stopPropagation();
        browser.runtime.sendMessage({ type: 'OPEN_WORKSPACE', tabs: workspace.tabs });
      });
      div.appendChild(button_open);

      // Add 'add tab to workspace' button
      const button_add = document.createElement('button');
      button_add.classList.add('ui', 'tiny', 'basic', 'secondary', 'icon', 'button', 'right', 'floated');
      button_add.innerHTML = '<i class="plus icon"></i>';
      button_add.title = 'Add current tab';
      button_add.addEventListener('click', async event => { 
        event.stopPropagation();
        await browser.runtime.sendMessage({ type: 'ADD_CURRENT_TAB_TO_WORKSPACE', workspace });
        Logic.showSection('workspaces'); 
      });
      div.appendChild(button_add);

      // Tab count label
      const tag = document.createElement('div');
      tag.classList.add('ui', 'tiny', 'secondary', 'horizontal', 'label');
      tag.innerHTML = workspace.tabs.length;
      div.appendChild(tag);

      // Workspace title
      const title = document.createElement('h2');
      title.innerHTML = workspace.title;
      div.appendChild(title);

      // Main click event
      div.addEventListener('click', () => { 
        Logic.showSection('workspace', { wsId: workspace.id }); 
      });

      fragment.appendChild(div);
    });
    document.getElementById('container-workspaces-content').innerHTML = '';
    document.getElementById('container-workspaces-content').appendChild(fragment);
    // return Promise.resolve();
  }
});

Logic.registerSection('workspace', {
  sectionId: 'container-workspace',
  init() {
    document.getElementById('workspace-back-button').addEventListener('click', () => { 
      Logic.showSection('workspaces'); 
    });
  },
  async render() {
    const fragment = document.createDocumentFragment();
    const workspace = Logic.currentWorkspace();

    // Buttons
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
      await browser.runtime.sendMessage({ type: 'DELETE_WORKSPACE_TABS', workspace });
      Logic.showSection('workspace', { wsId: workspace.id }); 
    });
    removeListeners('workspace-delete-button');
    document.getElementById('workspace-delete-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'DELETE_WORKSPACE', workspace });
      Logic.showSection('workspaces'); 
    });

    // Tab list
    workspace.tabs.forEach(tab => {
      const { title, tabId, wsId } = tab;
      const div = document.createElement('div');
      div.classList.add('item', 'clickable', 'tab');
      div.innerHTML = title;

      const grp = document.createElement('div');
      grp.classList.add('ui', 'small', 'basic', 'icon', 'buttons');

      const btnUp = document.createElement('button');
      btnUp.classList.add('ui', 'button', 'move-up');
      btnUp.innerHTML = '<i class="caret up icon"></i>';
      grp.appendChild(btnUp);
      btnUp.addEventListener('click', () => Logic.moveTab(tab, 'up')); 

      const btnDown = document.createElement('button');
      btnDown.classList.add('ui', 'button', 'move-down');
      btnDown.innerHTML = '<i class="caret down icon"></i>';
      grp.appendChild(btnDown);
      btnDown.addEventListener('click', () => Logic.moveTab(tab, 'down')); 

      const btnPin = document.createElement('button');
      btnPin.classList.add('ui', 'button');
      if (tab.pinned) btnPin.classList.add('pinned');
      btnPin.innerHTML = '<i class="pin icon"></i>';
      grp.appendChild(btnPin);
      btnPin.addEventListener('click', () => Logic.pinTab(tab)); 

      const btnEdit = document.createElement('button');
      btnEdit.classList.add('ui', 'button');
      btnEdit.innerHTML = '<i class="pencil icon"></i>';
      grp.appendChild(btnEdit);
      btnEdit.addEventListener('click', () => Logic.showSection('tab-form', { tabId })); 

      const btnDelete = document.createElement('button');
      btnDelete.classList.add('ui', 'button');
      btnDelete.innerHTML = '<i class="trash icon"></i>';
      grp.appendChild(btnDelete);
      btnDelete.addEventListener('click', async () => {
        await browser.runtime.sendMessage({ type: 'DELETE_TAB_BY_ID', tabId }); 
        Logic.showSection('workspace', { wsId }); 
      }); 

      div.appendChild(grp);
      fragment.appendChild(div);
    });

    document.getElementById('container-workspace-tablist').innerHTML = '';
    document.getElementById('container-workspace-tablist').appendChild(fragment);
  }
});

Logic.registerSection('workspace-form', {
  sectionId: 'container-workspace-form',
  init() {
    document.getElementById('workspace-form-back-button').addEventListener('click', () => { 
      Logic.showSection('workspaces'); 
    });
  },
  async render() {
    const workspace = Logic.currentWorkspace() || {};
    
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
  init() {
  },
  async render() {
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
  init() {
    document.getElementById('settings-back-button').addEventListener('click', () => { 
      Logic.showSection('workspaces'); 
    });
    document.getElementById('delete-all-workspaces-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'CLEAR_WORKSPACES' }); 
      Logic.showSection('workspaces'); 
    });
  },
  async render() {}
});

Logic.init();
// Logic.showSection('tab-form', { tabId: 3 });
Logic.showSection('workspaces');

// eslint-disable-next-line no-undef
$('.ui.dropdown').dropdown();