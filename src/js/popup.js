// Main 
const Logic = {
  _sections: {},
  _workspaces: [],
  _currentWorkspace: null,

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

  // Fetch workspace data from backend
  async refreshWorkspaces(){
    return browser.runtime.sendMessage({ type: 'FETCH_ALL_WORKSPACES' })
      .then(workspaces => {
        this._workspaces = workspaces;
        return;
      })
      .catch(e => console.log('Error > refreshWorkspaces >> ', e)); 
  },

  // Refresh data and process section 
  async showSection(sectionName, wsId = null) {

    // Reload workspaces from db
    await this.refreshWorkspaces();

    // Set or remove current workspace data
    this._currentWorkspace = null;
    if (wsId) this._currentWorkspace = this.workspace(wsId);

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

  // Pre-build and init section
  registerSection(name, section) {
    this._sections[name] = section;
    section.init();
  },
};

// -------------------------------------------------------------------------
// Helpers

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
        Logic.showSection('workspace', workspace.id); 
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
      Logic.showSection('workspace', workspace.id); 
    });
    removeListeners('workspace-add-all-tabs-button');
    document.getElementById('workspace-add-all-tabs-button').addEventListener('click', async () => { 
      await browser.runtime.sendMessage({ type: 'ADD_CURRENT_WINDOW_TO_WORKSPACE', workspace });
      Logic.showSection('workspace', workspace.id); 
    });
    document.getElementById('workspace-open-in-new-window-button').addEventListener('click', () => { 
      browser.runtime.sendMessage({ type: 'OPEN_WORKSPACE', tabs: workspace.tabs });
    });
    document.getElementById('workspace-open-in-current-window-button').addEventListener('click', () => { 
      browser.runtime.sendMessage({ type: 'OPEN_WORKSPACE', currentWindow: true, tabs: workspace.tabs });
    });
    document.getElementById('workspace-rename-button').addEventListener('click', () => { 
      Logic.showSection('workspace-form', workspace.id); 
    });

    // Tab list
    workspace.tabs.forEach(tab => {
      const div = document.createElement('div');
      div.classList.add('item');
      div.classList.add('clickable');
      div.innerHTML = tab.title;
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
    removeListeners('workspace-form-submit-button');
    document.getElementById('workspace-submit-button').innerHTML = workspace.id ? 'Save' : 'Create';
    document.getElementById('workspace-form-submit-button').addEventListener('submit', async event => { 
      event.preventDefault();
      if (!event.target.elements[0].value) return;
      await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_WORKSPACE', workspace: { ...workspace, title: event.target.elements[0].value } }); 
      Logic.showSection('workspaces'); 
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
      await browser.runtime.sendMessage({ type: 'DELETE_ALL_WORKSPACES' }); 
      Logic.showSection('workspaces'); 
    });
  },
  async render() {}
});

Logic.init();
Logic.showSection('workspaces');