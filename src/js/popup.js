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
    console.log('object :>> ', wsId);
    this._currentWorkspace = wsId ? this.workspace(wsId) : null;

    // Set and build current section
    const section = this._sections[sectionName];
    await section.build();
    
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
    section.preset();
  },
};

// SECTIONS

Logic.registerSection('workspaces', {
  sectionId: 'container-workspaces',
  preset() {
    document.getElementById('settings-button').addEventListener('click', () => { 
      Logic.showSection('settings'); 
    });
    document.getElementById('new-workspace-button').addEventListener('click', () => { 
      Logic.showSection('workspace-form'); 
    });
    // document.getElementById('delete-all-workspaces-button').addEventListener('click', () => { 
    //   browser.runtime.sendMessage({ type: 'DELETE_ALL_WORKSPACES' }); 
    // });
  },
  async build() {
    const fragment = document.createDocumentFragment();
    Logic.workspaces().forEach(workspace => {

      const div = document.createElement('div');
      div.classList.add('item', 'clickable');

      const tag = document.createElement('div');
      tag.classList.add('ui', 'tiny', 'secondary', 'horizontal', 'label', 'right', 'floated');
      tag.innerHTML = workspace.tabs.length;
      div.appendChild(tag);

      const title = document.createElement('h2');
      title.innerHTML = workspace.title;
      div.appendChild(title);

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
  preset() {
    document.getElementById('workspace-back-button').addEventListener('click', () => { 
      Logic.showSection('workspaces'); 
    });
  },
  async build() {
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
  preset() {
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
  async build() {}
});

Logic.registerSection('settings', {
  sectionId: 'container-settings',
  preset() {
    document.getElementById('settings-back-button').addEventListener('click', () => { 
      Logic.showSection('workspaces'); 
    });
  },
  async build() {}
});

Logic.init();
Logic.showSection('workspaces');