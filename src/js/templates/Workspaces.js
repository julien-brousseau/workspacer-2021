

// Logic.registerSection('workspaces', {
//   sectionId: 'container-workspaces',
//   renderStatic () {
//     document.getElementById('settings-button').addEventListener('click', () => Logic.showSection('settings'));
//     document.getElementById('new-workspace-button').addEventListener('click', () => Logic.showSection('workspace-form'));
//   },
//   async render () {
//     const workspaces = Logic.workspaces();

//     const fragment = document.createDocumentFragment();
//     workspaces.forEach(workspace => {
//       const { id: wsId, title, tabs, icon } = workspace;

//       // Item container
//       const container = appendElement(fragment, { classes: ['item', 'clickable']});
//       container.addEventListener('click', () => Logic.showSection('workspace', { wsId }));

//       // Tab count label
//       // const nbTabs = tabs.length;
//       // appendElement(container, { 
//       //   text: nbTabs,
//       //   classes: ['ui', 'tiny', 'basic', 'circular', 'label'],
//       //   title: `This worspace contains ${ nbTabs || 'no' } tab${ nbTabs > 1 ? 's' : '' }`
//       // });

//       // Favicon
//       const nbTabs = tabs.length;
//       appendElement(container, { 
//         tag: 'i', 
//         classes: [...icon.split('-'), 'feature', 'icon'],
//         title: `This worspace contains ${ nbTabs || 'no' } tab${ nbTabs > 1 ? 's' : '' }`
//       });

//       // Workspace title
//       appendElement(container, { 
//         tag: 'h2', 
//         text: title 
//       });
      
//       // Controls
//       // const btnGroup = appendElement(container, { 
//       //   classes: ['ui', 'icon', 'buttons']
//       // });
//       // Add 'add tab to workspace' button
//       appendElement(container, { 
//         tag: 'button',
//         text: '<i class="plus icon"></i>',
//         classes: ['ui', 'ghost', 'chain', 'icon', 'button'],
//         title: 'Add current tab',
//       }).addEventListener('click', async event => { 
//           event.stopPropagation();
//           await Logic.addCurrentTab(workspace);
//           Logic.showSection('workspaces'); 
//         });
//       // Add 'open in new window' button
//       appendElement(container, { 
//         tag: 'button',
//         text: '<i class="external alternate icon"></i>',
//         classes: ['ui', 'ghost', 'chain', 'icon', 'button'],
//         title: 'Open in new window',
//       }).addEventListener('click', event => { 
//           event.stopPropagation();
//           Logic.openTabs(tabs);
//         });
//     });

//     // Empty item
//     if (!workspaces.length) appendElement(fragment, { 
//       classes: ['item', 'empty'],
//       text: '<h2>You have no workspace</h2>Create a new workspace to continue.'
//     });

//     document.getElementById('container-workspaces-content').innerHTML = '';
//     document.getElementById('container-workspaces-content').appendChild(fragment);
//   }
// });
