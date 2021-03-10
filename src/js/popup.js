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
    this._workspaces = await browser.runtime.sendMessage({ type: 'FETCH_ALL_WORKSPACES' }); 
    return;
  },

  // Refresh data and process section 
  async showSection(sectionName, wsId = null) {

    // Reload workspaces from db
    await this.refreshWorkspaces();

    // Set or remove current workspace data
    this._currentWorkspace = wsId ? this.workspace(wsId) : null;

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

  // 
  registerSection(name, section) {
    this._sections[name] = section;
    section.init();
  },
};

// SECTIONS

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

      // Add tab to workspace button
      const button = document.createElement('button');
      button.classList.add('ui', 'tiny', 'basic', 'secondary', 'icon', 'button', 'right', 'floated');
      button.innerHTML = '<i class="plus icon"></i>';
      button.addEventListener('click', async event => { 
        event.stopPropagation();
        const blop = await browser.runtime.sendMessage({ type: 'ADD_CURRENT_TAB_TO_WORKSPACE', workspace }); 
        console.log('blop :>> ', blop);
        Logic.showSection('workspaces'); 
      });

      div.appendChild(button);

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

    workspace.tabs.forEach(tab => {
      const div = document.createElement('div');
      div.classList.add('item');
      div.classList.add('clickable');
      div.innerHTML = tab.title;
      fragment.appendChild(div);
    });

    document.getElementById('container-workspace-content').innerHTML = '';
    document.getElementById('container-workspace-content').appendChild(fragment);
  }
});

Logic.registerSection('workspace-form', {
  sectionId: 'container-workspace-form',
  init() {
    document.getElementById('workspace-form-back-button').addEventListener('click', () => { 
      Logic.showSection('workspaces'); 
    });
    document.getElementById('workspace-form-submit-button').addEventListener('submit', async event => { 
      event.preventDefault();
      if (!event.target.elements[0].value) return;
      const workspace = { title: event.target.elements[0].value };
      await browser.runtime.sendMessage({ type: 'CREATE_WORKSPACE', workspace }); 
      Logic.showSection('workspaces'); 
    });
  },
  async render() {}
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