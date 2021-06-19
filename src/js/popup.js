import { appendElement, resetElement } from './helpers.js';

// 
const DEBUG = false;

// Main logic
const Logic = {
  _sections: {},
  _workspaces: [],
  _currentWorkspace: null,
  _currentTab: null,
  _msgTimeout: null,

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

  // Fetch workspace data from local storage
  async resetWorkspaces () {
    // Clear current data
    this._currentWorkspace = null;
    this._currentTab = null;
    // Fetch local storage data
    return browser.runtime.sendMessage({ type: 'FETCH_ALL_WORKSPACES' })
      .then(workspaces => {
        if (DEBUG) console.log('Loaded workspaces :>> ', workspaces);
        this._workspaces = workspaces;
        return;
      })
      .catch(e => console.log('Error > resetWorkspaces >> ', e)); 
  },

  // Refresh data and process section 
  async showSection (sectionName, ids = {}) {
    // Reload workspace data
    await this.resetWorkspaces();

    // Conditionnaly set current workspace and/or tab
    const { wsId, tabId } = ids;
    if (tabId) this._currentTab = this.tab(tabId);
    if (wsId) this._currentWorkspace = this.workspace(!tabId ? wsId : this._currentTab.wsId);
    
    // Set and show the section UI
    this.renderSection(sectionName);
  },

  // Build and manage sections DOM elements
  async renderSection (sectionName) {
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

    return sectionSelector;
  },

  // Register and render static elements
  registerSection (name, section) {
    this._sections[name] = section;
    section.renderStatic();
  },

  // Show the top message tag with auto-hide timer
  msg (text, color = 'green') {
    const colors = ['red', 'green'];
    const el = document.getElementById('msg').childNodes[0];

    el.innerHTML = text;
    el.classList.remove(...colors, 'hide');
    el.classList.add(color);

    clearTimeout(this._msgTimeout);
    this._msgTimeout = setTimeout(() => el.classList.add('hide'), 2500);
  },

  // Show a shallow Confirm section and returns user action as boolean
  // TODO: This is ugly. Fix it.
  async confirm (method, { workspace: ws } = {}) {
    let ok = null;

    // DOM list helper
    const list = (tabs) => '<ul>' + tabs
      .map(t => {
        const i = t.icon ? '<i class="icon ' + t.icon + '"></i>' 
          : t.favIconUrl ? '<img src="' + t.favIconUrl + '">'
          : '<div style="width: 22px;"></div>';
        return '<li>' + i + t.title.slice(0, 45) + '</li>';
      })
      .join('') + '</ul>';

    // Shallow render
    await this.renderSection('confirm');
      
    // Content
    const titles = {
      deleteWorkspace: 'Delete workspace',
      deleteWorkspaces: 'Delete all workspaces',
      deleteTabs: 'Delete tabs',
      replaceTabs: 'Replace tabs'
    };

    // Message
    const text = 
      method === 'deleteWorkspace' ? 'This operation will <strong>permanently delete</strong> the workspace <span>' + ws.title + '</span>, containing the following tabs:' + list(ws.tabs) : 
      method === 'deleteWorkspaces' ? 'This operation will <strong>permanently delete</strong> all the following workspaces:' + list(this.workspaces()) : 
      method === 'deleteTabs' ? 'This operation will <strong>permanently delete</strong> all the following tabs:' + list(ws.tabs) :
      method === 'replaceTabs' ? 'This operation will <strong>permanently delete</strong> all the following tabs and replace them with the current window:' + list(ws.tabs) : null;

    document.getElementById('confirm-title').innerHTML = titles[method];
    document.getElementById('confirm-text').innerHTML = text;

    // Button listeners
    document.getElementById('confirm-accept-button').addEventListener('click', () => { ok = true; });
    document.getElementById('confirm-cancel-button').addEventListener('click', () => { ok = false; });

    // Await user choice
    const timeout = async t => new Promise(res => setTimeout(res, t));
    async function awaitConfirm () { while (ok === null) await timeout(50); }
    await awaitConfirm();

    return ok;
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
  
  // Open tabs in a window
  async openTabs (tabs, currentWindow = false) {
    if (!tabs.length) return;
    await browser.runtime.sendMessage({ type: 'OPEN_WORKSPACE', tabs, currentWindow });
    return;
  },

  // Create stuff
  async submitWorkspace (workspace) {
    const { id } = workspace;
    const { id: wsId } = await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_WORKSPACE', workspace });
    if (wsId) {
      this.msg(id ? 'Workspace updated!' : 'Workspace created!');
      return id || 0; // Return 0 if created
    }
    return false;
  },
  async submitTab (tabData) {
    const tab = { ...this.currentTab() };
    const tabs = [{ ...tab, ...tabData }];
    return await browser.runtime.sendMessage({ type: 'CREATE_OR_EDIT_TABS', tabs });
  },
  async addCurrentTab (workspace, currentWindow = false) {
    const type = currentWindow ? 'ADD_CURRENT_WINDOW_TO_WORKSPACE' : 'ADD_CURRENT_TAB_TO_WORKSPACE';
    const added = await browser.runtime.sendMessage({ type, workspace });

    if (added) this.msg(`${ added } tab${ added > 1 ? 's' : '' } added`);
    else this.msg('Error: Invalid tab', 'red');

    return added;
  },

  // Delete stuff
  async deleteWorkspaces () {
    const confirmed = await this.confirm('deleteWorkspaces'); 
    if (confirmed) {
      await browser.runtime.sendMessage({ type: 'CLEAR_WORKSPACES' }); 
      this.msg('User data cleared!', 'red');
      this.showSection('workspaces'); 
    } else {
      Logic.showSection('settings'); 
    }
  },
  async deleteWorkspace (wsId) {
    await browser.runtime.sendMessage({ type: 'DELETE_WORKSPACE', wsId });
    Logic.msg('Workspace deleted', 'red');
    return;
  },
  async deleteTabs (tabs) {
    if (!Array.isArray(tabs)) tabs = [tabs];
    const num = await browser.runtime.sendMessage({ type: 'DELETE_TABS', tabs });
    Logic.msg(num + ' tabs deleted', 'red');
    return;
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

    this.msg('User data exported!');
    return browser.downloads.download({ url, filename });
  },
  // Import previously exported json data (workspaces and tabs) 
  async importAsJSON (jsonData) {
    const newTabs = [];

    try {
      const { ws, tabs } = JSON.parse(jsonData);

      // Create new workspace ids and assign it to tabs
      let wsId = this.nextWorkspaceId();
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

      this.msg('User data imported!');
      this.showSection('workspaces'); 
      return;

    } catch (e) {
      this.msg('Invalid data', 'red');
      return e;
    }
  }
};

// -------------------------------------------------------------------------
// Sections

Logic.registerSection('workspaces', {
  sectionId: 'container-workspaces',
  renderStatic () {
    document.getElementById('settings-button').addEventListener('click', () => Logic.showSection('settings'));
    document.getElementById('new-workspace-button').addEventListener('click', () => Logic.showSection('workspace-form'));
  },
  async render () {
    const workspaces = Logic.workspaces();

    // Workspace list
    const fragment = document.createDocumentFragment();
    workspaces.forEach(workspace => {
      const { id: wsId, title, tabs, icon } = workspace;

      // Item container
      const container = appendElement(fragment, { classes: ['item', 'clickable']});
      container.addEventListener('click', () => Logic.showSection('workspace', { wsId }));

      // Favicon (with tab count as :hover title)
      const nbTabs = tabs.length;
      appendElement(container, { 
        tag: 'i', 
        classes: [...icon.split('-'), 'feature', 'icon'],
        title: `This worspace contains ${ nbTabs || 'no' } tab${ nbTabs > 1 ? 's' : '' }`
      });

      // Workspace title
      appendElement(container, { 
        tag: 'h2', 
        text: title 
      });
      
      // Add 'add tab to workspace' button
      appendElement(container, { 
        tag: 'button',
        text: '<i class="plus icon"></i>',
        classes: ['ui', 'wsBtn', 'chain', 'icon', 'button'],
        title: 'Add current tab',
      }).addEventListener('click', async event => { 
          event.stopPropagation();
          const added = await Logic.addCurrentTab(workspace);
          if (added) Logic.showSection('workspaces');
        });
      // Add 'open in new window' button
      appendElement(container, { 
        tag: 'button',
        text: '<i class="external alternate icon"></i>',
        classes: ['ui', 'wsBtn', 'chain', 'icon', 'button'],
        title: 'Open in new window',
      }).addEventListener('click', event => { 
          event.stopPropagation();
          Logic.openTabs(tabs);
        });
    });

    // Empty item
    if (!workspaces.length) {
      appendElement(fragment, { 
        classes: ['item', 'empty'],
        text: '<h2>You have no workspace</h2>'
      });
    }

    document.getElementById('container-workspaces-content').innerHTML = '';
    document.getElementById('container-workspaces-content').appendChild(fragment);
  }
});

Logic.registerSection('workspace', {
  sectionId: 'container-workspace',
  renderStatic () {
    document.getElementById('workspace-back-button').addEventListener('click', () => Logic.showSection('workspaces'));
  },
  async render () {
    const workspace = Logic.currentWorkspace();
    const { id: wsId, title, tabs, icon } = workspace;
    if (DEBUG) console.log('Current workspace :>> ', workspace);

    // Title
    const fragment = document.createDocumentFragment();
    document.getElementById('workspace-title').innerHTML = title;

    // Icon
    const i = document.getElementById('workspace-title-icon');
    i.classList.remove(...i.classList);
    i.classList.add(...icon.split('-'), 'feature', 'icon');

    // Static buttons
    resetElement('workspace-add-current-tab-button');
    document.getElementById('workspace-add-current-tab-button').addEventListener('click', async () => { 
      const added = await Logic.addCurrentTab(workspace);
      if (added) Logic.showSection('workspace', { wsId }); 
    });
    resetElement('workspace-add-all-tabs-button');
    document.getElementById('workspace-add-all-tabs-button').addEventListener('click', async () => { 
      const added = await Logic.addCurrentTab(workspace, true);
      if (added) Logic.showSection('workspace', { wsId }); 
    });
    resetElement('workspace-replace-tabs-button');
    document.getElementById('workspace-replace-tabs-button').addEventListener('click', async () => { 
      const confirmed = tabs.length ? await Logic.confirm('replaceTabs', { workspace }) : true;
      if (confirmed) {
        await Logic.deleteTabs(tabs);
        const added = await Logic.addCurrentTab(workspace, true);
        if (added) Logic.showSection('workspace', { wsId }); 
      }
    });
    resetElement('workspace-open-in-new-window-button');
    document.getElementById('workspace-open-in-new-window-button').addEventListener('click', () => { 
      Logic.openTabs(tabs);
    });
    resetElement('workspace-open-in-current-window-button');
    document.getElementById('workspace-open-in-current-window-button').addEventListener('click', () => { 
      Logic.openTabs(tabs, true);
    });
    resetElement('workspace-rename-button');
    document.getElementById('workspace-rename-button').addEventListener('click', () => { 
      Logic.showSection('workspace-form', { wsId }); 
    });
    resetElement('workspace-delete-tabs-button');
    document.getElementById('workspace-delete-tabs-button').addEventListener('click', async () => { 
      if (!tabs.length) return Logic.msg('No tabs to delete', 'red');
      const confirmed = await Logic.confirm('deleteTabs', { workspace }); 
      if (confirmed) {
        await Logic.deleteTabs(tabs);
        Logic.showSection('workspace', { wsId }); 
      }
    });
    resetElement('workspace-delete-button');
    document.getElementById('workspace-delete-button').addEventListener('click', async () => { 
      const confirmed = await Logic.confirm('deleteWorkspace', { workspace }); 
      if (confirmed) {
        await Logic.deleteWorkspace(wsId);
        Logic.showSection('workspaces'); 
      } else {
        Logic.showSection('workspace', { wsId }); 
      }
    });

    // Containers for pinned/unpinned tabs
    const pinnedTabsContainer = appendElement(fragment, { classes: ['tabs', 'pinned']});
    const tabsContainer = appendElement(fragment, { classes: ['tabs']});

    // Tab list
    tabs.forEach(tab => {
      const { title, tabId, favIconUrl: icon, pinned } = tab;
      const container = appendElement(
        pinned ? pinnedTabsContainer : tabsContainer, 
        { classes: ['item', 'tab']}
      );

      // Append pin button
      appendElement(container, {
        tag: 'button',
        text: '<i class="pin icon"></i>',
        classes: ['ui', 'wsBtn', 'pin', 'icon', 'button', pinned ? 'pinned' : ''],
        title: pinned ? 'Unpin tab' : 'Pin tab'
      }).addEventListener('click', () => Logic.pinTab(tab)); 

      // Append favicon image or placeholder
      appendElement(container, { 
        tag: icon ? 'img' : 'div',
        classes: ['favIcon', !icon ? 'empty' : ''],
        src: icon ? icon : null
      });
      // Append title
      appendElement(container, { 
        tag: 'h2', 
        text: title, 
        classes: ['title']
      });

      // Move up
      appendElement(container, { 
        tag: 'button',
        text: '<i class="caret up icon"></i>',
        classes: ['ui', 'wsBtn', 'icon', 'chain', 'button', 'move-up'],
        title: 'Move up'
      }).addEventListener('click', () => Logic.moveTab(tab, 'up')); 
      // Move down
      appendElement(container, { 
        tag: 'button',
        text: '<i class="caret down icon"></i>',
        classes: ['ui', 'wsBtn', 'icon', 'chain', 'button', 'move-down'],
        title: 'Move down'
      }).addEventListener('click', () => Logic.moveTab(tab, 'down')); 
      // Modify
      appendElement(container, {
        tag: 'button',
        text: '<i class="pencil icon"></i>',
        classes: ['ui', 'wsBtn', 'icon', 'chain', 'button'],
        title: 'Modify tab info'
      }).addEventListener('click', () => Logic.showSection('tab-form', { tabId })); 
      // Delete
      appendElement(container, {
        tag: 'button',
        text: '<i class="trash icon"></i>',
        classes: ['ui', 'wsBtn', 'danger', 'icon', 'chain', 'button'],
        title: 'Delete this tab'
      }).addEventListener('click', async () => {
          await Logic.deleteTabs(tab);
          Logic.showSection('workspace', { wsId }); 
        }); 
    });

    // Empty item
    if (!tabs.length) appendElement(fragment, {
      classes: ['item', 'empty'],
      text: 'This workspace contains no tabs'
    });

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
    const icons = ['headphones', 'rss', 'book', 'certificate', 'calendar alternate outline', 'chart bar outline', 
      'compass', 'folder outline', 'pencil alternate', 'tag', 'shield alternate', 'comments', 'paper plane', 'server', 
      'tv', 'dollar sign', 'eye slash outline', 'tint', 'file outline', 'heart outline', 'calculator', 'cloud', 'flag outline', 'user outline'];
    
    // Title
    document.getElementById('workspace-form-header-title').innerHTML = id ? 'Edit existing workspace' : 'Create new workspace';
    
    // Fields
    document.getElementById('workspace-form-title').value = id ? title : '';

    // Icon picker
    const iconList = document.getElementById('workspace-form-icons');
    iconList.innerHTML = '';
    icons.forEach(i => {
      const _i = i.replaceAll(' ', '-');

      const checkbox = appendElement(iconList, { 
        tag: 'input', 
        id: 'ico-' + _i, 
        type: 'radio', 
        name: 'icon-list', 
        classes: ['ico'], 
        value: _i
      });
      const label = appendElement(iconList, { 
        tag: 'label', 
        _for: 'ico-' + _i, 
        classes: ['ico-label'], 
        title: i 
      });
      label.innerHTML = '<i class="' + i + ' icon"></i>';
      if (workspace.icon === _i) checkbox.setAttribute('checked', 'checked');
    });
    
    // Submit button
    resetElement('workspace-form');
    document.getElementById('workspace-submit-button').innerHTML = id ? 'Save' : 'Create';
    document.getElementById('workspace-form').addEventListener('submit', async event => { 
      event.preventDefault();

      // TODO: Improve validation

      // Reset errors
      const titleField = document.getElementById('workspace-form-title-field');
      const iconField = document.getElementById('workspace-form-icon-field');
      titleField.classList.remove('error');
      iconField.classList.remove('error');

      // Validate fields
      const title = document.getElementById('workspace-form-title').value;
      if (!title) titleField.classList.add('error');

      const icons = document.querySelectorAll('input[name="icon-list"]:checked');
      if (!icons.length) iconField.classList.add('error');
      const icon = icons.length ? icons[0].value : false;

      if (title && icon) {
        const id = await Logic.submitWorkspace({ ...workspace, title, icon });
        if (id) Logic.showSection('workspace', { wsId: id });
        else Logic.showSection('workspaces');
      }
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
    resetElement('tab-form-back-button');
    document.getElementById('tab-form-back-button').addEventListener('click', () => { 
      Logic.showSection('workspace', { wsId }); 
    });

    // Fields
    document.getElementById('tab-form-title').value = title;
    document.getElementById('tab-form-url').value = url;
    
    // Submit button
    resetElement('container-tab-form-content');
    document.getElementById('container-tab-form-content').addEventListener('submit', async event => { 
      event.preventDefault();

      // TODO: Improve validation
      
      // Reset errors
      const titleField = document.getElementById('tab-form-title-field');
      const urlField = document.getElementById('tab-form-url-field');
      titleField.classList.remove('error');
      urlField.classList.remove('error');

      // Validate fields
      const title = document.getElementById('tab-form-title').value;
      if (!title) titleField.classList.add('error');
      if (!url) urlField.classList.add('error');

      if (title && url) {
        await Logic.submitTab({ ...tab, title, url });
        Logic.showSection('workspace', { wsId });
      }
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
      if (!Logic.workspaces().length) return Logic.msg('You have no workspaces', 'red');
      Logic.deleteWorkspaces();
    });
  },
  async render () {
    // Export button
    resetElement('export-all-workspaces-button');
    document.getElementById('export-all-workspaces-button').addEventListener('click', async () => { 
      Logic.exportAsJSON();
    });

    // Import button
    resetElement('import-all-workspaces-button');
    document.getElementById('import-field').value = '';
    document.getElementById('import-all-workspaces-button').addEventListener('click', async () => { 
      const { value } = document.getElementById('import-field');
      Logic.importAsJSON(value);
    });
  }
});

Logic.registerSection('confirm', {
  sectionId: 'container-confirm',
  renderStatic () {},
  async render () {
    resetElement('tab-form-back-button');
    document.getElementById('confirm-back-button').addEventListener('click', () => { 
      Logic.showSection('workspaces'); 
    });
  }
});

// Default section
Logic.showSection('workspaces');

// eslint-disable-next-line no-undef
$('.ui.dropdown').dropdown();
