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

  // 


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

// Generate, attach and returns a DOM node
function appendElement (parent, { tag = 'div', classes = [], text = '', title = '', src = null } = {}) {
  const element = document.createElement(tag);
  element.innerHTML = text;
  element.title = title;

  element.classList.add(...classes.filter(c => c && c !== ''));

  if (src) element.src = src;

  parent.appendChild(element);
  return element;
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
    workspaces.forEach((workspace) => {
      const { id, title, tabs } = workspace;

      // Item container
      const container = appendElement(fragment, { classes: ['item', 'clickable']});
      container.addEventListener('click', () => Logic.showSection('workspace', { wsId: id }));

      // Tab count label
      const nbTabs = tabs.length;
      appendElement(container, { 
        text: nbTabs,
        classes: ['ui', 'basic', 'circular', 'label'],
        title: `This worspace contains ${ nbTabs || 'no' } tab${ nbTabs > 1 ? 's' : '' }`
      });
      // Workspace title
      appendElement(container, { 
        tag: 'h2', 
        text: title 
      });
      
      // Controls
      const btnGroup = appendElement(container, { 
        classes: ['ui', 'icon', 'buttons']
      });
      // Add 'add tab to workspace' button
      appendElement(btnGroup, { 
        tag: 'button',
        text: '<i class="plus icon"></i>',
        classes: ['ui', 'basic', 'green', 'button'],
        title: 'Add current tab',
      }).addEventListener('click', async event => { 
          event.stopPropagation();
          await browser.runtime.sendMessage({ type: 'ADD_CURRENT_TAB_TO_WORKSPACE', workspace });
          Logic.showSection('workspaces'); 
        });
      // Add 'open in new window' button
      appendElement(btnGroup, { 
        tag: 'button',
        text: '<i class="external alternate icon"></i>',
        classes: ['ui', 'basic', 'orange', 'button'],
        title: 'Open in new window',
      }).addEventListener('click', event => { 
          event.stopPropagation();
          browser.runtime.sendMessage({ type: 'OPEN_WORKSPACE', tabs });
        });
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
    const { id: wsId, title, tabs } = workspace;
    if (DEBUG) console.log('Current workspace :>> ', workspace);

    const fragment = document.createDocumentFragment();
    document.getElementById('workspace-title').innerHTML = title;

    // Static buttons
    removeListeners('workspace-add-current-tab-button');
    document.getElementById('workspace-add-current-tab-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'ADD_CURRENT_TAB_TO_WORKSPACE', workspace });
      Logic.showSection('workspace', { wsId }); 
    });
    removeListeners('workspace-add-all-tabs-button');
    document.getElementById('workspace-add-all-tabs-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'ADD_CURRENT_WINDOW_TO_WORKSPACE', workspace });
      Logic.showSection('workspace', { wsId }); 
    });
    removeListeners('workspace-open-in-new-window-button');
    document.getElementById('workspace-open-in-new-window-button').addEventListener('click', () => { 
      browser.runtime.sendMessage({ type: 'OPEN_WORKSPACE', tabs });
    });
    removeListeners('workspace-open-in-current-window-button');
    document.getElementById('workspace-open-in-current-window-button').addEventListener('click', () => { 
      browser.runtime.sendMessage({ type: 'OPEN_WORKSPACE', currentWindow: true, tabs });
    });
    removeListeners('workspace-rename-button');
    document.getElementById('workspace-rename-button').addEventListener('click', () => { 
      Logic.showSection('workspace-form', { wsId }); 
    });
    removeListeners('workspace-delete-tabs-button');
    document.getElementById('workspace-delete-tabs-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'CLEAR_WORKSPACE_TABS', workspace });
      Logic.showSection('workspace', { wsId }); 
    });
    removeListeners('workspace-delete-button');
    document.getElementById('workspace-delete-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'DELETE_WORKSPACE', workspace });
      Logic.showSection('workspaces'); 
    });

    // Tab list
    tabs.forEach(tab => {
      const { title, tabId, favIconUrl: icon, pinned } = tab;
      const container = appendElement(fragment, { classes: ['item', 'tab']});

      // Append favicon image or placeholder
      appendElement(container, { 
        tag: icon ? 'img' : 'div',
        classes: ['favIcon', !icon ? 'empty' : ''],
        src: icon ? icon : null
      });
      // Append title
      appendElement(container, { 
        tag: 'span', 
        text: title, 
        classes: ['title']
      });

      // Append controls
      const btnGroup = appendElement(container, { 
        classes: ['ui', 'mini', 'basic', 'icon', 'buttons']
      });
      // Move up
      appendElement(btnGroup, { 
        tag: 'button',
        text: '<i class="caret up icon"></i>',
        classes: ['ui', 'button', 'move-up'],
        title: 'Move up'
      }).addEventListener('click', () => Logic.moveTab(tab, 'up')); 
      // Move down
      appendElement(btnGroup, { 
        tag: 'button',
        text: '<i class="caret down icon"></i>',
        classes: ['ui', 'button', 'move-down'],
        title: 'Move down'
      }).addEventListener('click', () => Logic.moveTab(tab, 'down')); 
      // Pin
      appendElement(btnGroup, {
        tag: 'button',
        text: '<i class="pin icon"></i>',
        classes: ['ui', 'button', pinned ? 'pinned' : ''],
        title: pinned ? 'Unpin tab' : 'Pin tab'
      }).addEventListener('click', () => Logic.pinTab(tab)); 
      // Modify
      appendElement(btnGroup, {
        tag: 'button',
        text: '<i class="pencil icon"></i>',
        classes: ['ui', 'button'],
        title: 'Modify tab info'
      }).addEventListener('click', () => Logic.showSection('tab-form', { tabId })); 
      // Delete
      appendElement(btnGroup, {
        tag: 'button',
        text: '<i class="trash icon"></i>',
        classes: ['ui', 'button'],
        title: 'Delete this tab'
      }).addEventListener('click', async () => {
          await browser.runtime.sendMessage({ type: 'DELETE_TAB_BY_ID', tabId }); 
          Logic.showSection('workspace', { wsId }); 
        }); 
    });

    // Empty item
    if (!tabs.length) {
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
    const { id, title } = workspace;
    
    // Title
    document.getElementById('workspace-form-header-title').innerHTML = id ? 'Edit existing workspace' : 'Create new workspace';
    
    // Fields
    document.getElementById('workspace-form-title').value = id ? title : '';
    
    // Submit button
    removeListeners('workspace-form');
    document.getElementById('workspace-submit-button').innerHTML = id ? 'Save' : 'Create';
    document.getElementById('workspace-form').addEventListener('submit', async event => { 
      event.preventDefault();
      if (!event.target.elements[0].value) return;
      const { id: wsId } = await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_WORKSPACE', workspace: { ...workspace, title: event.target.elements[0].value } });
      Logic.showSection('workspace', { wsId }); 
    });
  }
});

Logic.registerSection('tab-form', {
  sectionId: 'container-tab-form',
  renderStatic () {
  },
  async render () {
    const tab = Logic.currentTab() || { tabId: 999, title: 'This title should not be shown', wsId: 1, url: 'www.perdu.com' };
    const { wsId, title, url } = tab;
    
    // Back button
    document.getElementById('tab-form-back-button').addEventListener('click', () => { 
      Logic.showSection('workspace', { wsId }); 
    });

    // Fields
    document.getElementById('tab-form-title').value = title;
    document.getElementById('tab-form-url').value = url;
    
    // Submit button
    removeListeners('tab-form');
    document.getElementById('tab-form').addEventListener('submit', async event => { 
      event.preventDefault();
      if (!event.target.elements[0].value || !event.target.elements[1].value) return;  // TODO: Replace with validation

      // Merge form data with tab, and make it a single-element array
      const allowedFields = ['title', 'url'];
      const tabs = [Object.assign(tab, [...event.target.elements]
        .filter(e => allowedFields.includes(e.name))
        .map(e => ({ [e.name]: e.value }))
        .reduce((data, e) => Object.assign(data, e), {}))];

      await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_TABS', tabs }); 
      Logic.showSection('workspace', { wsId }); 
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

Logic.showSection('workspaces');

// eslint-disable-next-line no-undef
$('.ui.dropdown').dropdown();
