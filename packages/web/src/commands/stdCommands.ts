import { currentDatabase, currentTheme, extensions, getExtensions, getVisibleToolbar, visibleToolbar } from '../stores';
import registerCommand from './registerCommand';
import { get } from 'svelte/store';
import { ThemeDefinition } from 'dbgate-types';
import ConnectionModal from '../modals/ConnectionModal.svelte';
import AboutModal from '../modals/AboutModal.svelte';
import AddDbKeyModal from '../modals/AddDbKeyModal.svelte';
import SettingsModal from '../settings/SettingsModal.svelte';
import ImportExportModal from '../modals/ImportExportModal.svelte';
import SqlGeneratorModal from '../modals/SqlGeneratorModal.svelte';
import { showModal } from '../modals/modalTools';
import newQuery from '../query/newQuery';
import saveTabFile from '../utility/saveTabFile';
import openNewTab from '../utility/openNewTab';
import getElectron from '../utility/getElectron';
import { openElectronFile } from '../utility/openElectronFile';
import { getDefaultFileFormat } from '../plugins/fileformats';
import { getCurrentConfig, getCurrentDatabase } from '../stores';
import './recentDatabaseSwitch';
import './changeDatabaseStatusCommand';
import hasPermission from '../utility/hasPermission';
import _ from 'lodash';
import { findEngineDriver } from 'dbgate-tools';
import { openArchiveFolder } from '../utility/openArchiveFolder';
import InputTextModal from '../modals/InputTextModal.svelte';
import { removeLocalStorage } from '../utility/storageCache';
import { showSnackbarSuccess } from '../utility/snackbar';
import { apiCall } from '../utility/api';
import runCommand from './runCommand';
import { openWebLink } from '../utility/exportFileTools';
import { getSettings } from '../utility/metadataLoaders';

// function themeCommand(theme: ThemeDefinition) {
//   return {
//     text: theme.themeName,
//     onClick: () => currentTheme.set(theme.themeClassName),
//     // onPreview: () => {
//     //   const old = get(currentTheme);
//     //   currentTheme.set(css);
//     //   return ok => {
//     //     if (!ok) currentTheme.set(old);
//     //   };
//     // },
//   };
// }

registerCommand({
  id: 'theme.changeTheme',
  category: 'Theme',
  name: 'Change',
  toolbarName: 'Change theme',
  onClick: () => showModal(SettingsModal, { selectedTab: 1 }),
  // getSubCommands: () => get(extensions).themes.map(themeCommand),
});

registerCommand({
  id: 'toolbar.show',
  category: 'Toolbar',
  name: 'Show',
  onClick: () => visibleToolbar.set(true),
  testEnabled: () => !getVisibleToolbar(),
});

registerCommand({
  id: 'toolbar.hide',
  category: 'Toolbar',
  name: 'Hide',
  onClick: () => visibleToolbar.set(false),
  testEnabled: () => getVisibleToolbar(),
});

registerCommand({
  id: 'about.show',
  category: 'About',
  name: 'Show',
  toolbarName: 'About',
  onClick: () => showModal(AboutModal),
});

registerCommand({
  id: 'new.connection',
  toolbar: true,
  icon: 'icon new-connection',
  toolbarName: 'Add connection',
  category: 'New',
  toolbarOrder: 1,
  name: 'Connection',
  testEnabled: () => !getCurrentConfig()?.runAsPortal,
  onClick: () => showModal(ConnectionModal),
});

registerCommand({
  id: 'new.query',
  category: 'New',
  icon: 'icon file',
  toolbar: true,
  toolbarOrder: 2,
  name: 'Query',
  toolbarName: 'New query',
  keyText: 'Ctrl+Q',
  onClick: () => newQuery(),
});

registerCommand({
  id: 'new.shell',
  category: 'New',
  icon: 'img shell',
  name: 'JavaScript Shell',
  menuName: ' New JavaScript shell',
  onClick: () => {
    openNewTab({
      title: 'Shell #',
      icon: 'img shell',
      tabComponent: 'ShellTab',
    });
  },
});

registerCommand({
  id: 'new.archiveFolder',
  category: 'New',
  icon: 'img archive',
  name: 'Archive folder',
  onClick: () => {
    showModal(InputTextModal, {
      value: '',
      label: 'New archive folder name',
      header: 'Create archive folder',
      onConfirm: async folder => {
        apiCall('archive/create-folder', { folder });
      },
    });
  },
});

registerCommand({
  id: 'new.application',
  category: 'New',
  icon: 'img app',
  name: 'Application',
  onClick: () => {
    showModal(InputTextModal, {
      value: '',
      label: 'New application name',
      header: 'Create application',
      onConfirm: async folder => {
        apiCall('apps/create-folder', { folder });
      },
    });
  },
});

registerCommand({
  id: 'new.table',
  category: 'New',
  icon: 'icon table',
  name: 'Table',
  toolbar: true,
  toolbarName: 'New table',
  testEnabled: () => {
    const driver = findEngineDriver(get(currentDatabase)?.connection, getExtensions());
    return !!get(currentDatabase) && driver?.databaseEngineTypes?.includes('sql');
  },
  onClick: () => {
    const $currentDatabase = get(currentDatabase);
    const connection = _.get($currentDatabase, 'connection') || {};
    const database = _.get($currentDatabase, 'name');

    openNewTab(
      {
        title: 'Table #',
        icon: 'img table-structure',
        tabComponent: 'TableStructureTab',
        props: {
          conid: connection._id,
          database,
        },
      },
      {
        editor: {
          columns: [],
        },
      },
      {
        forceNewTab: true,
      }
    );
  },
});

registerCommand({
  id: 'new.collection',
  category: 'New',
  icon: 'icon table',
  name: 'Collection',
  toolbar: true,
  toolbarName: 'New collection',
  testEnabled: () => {
    const driver = findEngineDriver(get(currentDatabase)?.connection, getExtensions());
    return !!get(currentDatabase) && driver?.databaseEngineTypes?.includes('document');
  },
  onClick: async () => {
    const $currentDatabase = get(currentDatabase);
    const connection = _.get($currentDatabase, 'connection') || {};
    const database = _.get($currentDatabase, 'name');

    const dbid = { conid: connection._id, database };

    showModal(InputTextModal, {
      value: '',
      label: 'New collection name',
      header: 'Create collection',
      onConfirm: async newCollection => {
        await apiCall('database-connections/run-script', { ...dbid, sql: `db.createCollection('${newCollection}')` });
        apiCall('database-connections/sync-model', dbid);
      },
    });
  },
});

registerCommand({
  id: 'new.dbKey',
  category: 'New',
  name: 'Key',
  toolbar: true,
  toolbarName: 'New key',
  testEnabled: () => {
    const driver = findEngineDriver(get(currentDatabase)?.connection, getExtensions());
    return !!get(currentDatabase) && driver?.databaseEngineTypes?.includes('keyvalue');
  },
  onClick: async () => {
    const $currentDatabase = get(currentDatabase);
    const connection = _.get($currentDatabase, 'connection') || {};
    const database = _.get($currentDatabase, 'name');
    const driver = findEngineDriver(get(currentDatabase)?.connection, getExtensions());

    showModal(AddDbKeyModal, {
      conid: connection._id,
      database,
      driver,
    });
  },
});

registerCommand({
  id: 'new.markdown',
  category: 'New',
  icon: 'img markdown',
  name: 'Markdown page',
  onClick: () => {
    openNewTab({
      title: 'Page #',
      icon: 'img markdown',
      tabComponent: 'MarkdownEditorTab',
    });
  },
});

registerCommand({
  id: 'new.modelCompare',
  category: 'New',
  icon: 'icon compare',
  name: 'Compare DB',
  toolbar: true,
  onClick: () => {
    openNewTab({
      title: 'Compare',
      icon: 'img compare',
      tabComponent: 'CompareModelTab',
    });
  },
});

registerCommand({
  id: 'new.freetable',
  category: 'New',
  icon: 'img markdown',
  name: 'Data sheet',
  menuName: 'New data sheet',
  onClick: () => {
    openNewTab({
      title: 'Data #',
      icon: 'img free-table',
      tabComponent: 'FreeTableTab',
    });
  },
});

registerCommand({
  id: 'new.jsonl',
  category: 'New',
  icon: 'img archive',
  name: 'JSON Lines',
  menuName: 'New JSON lines file',
  onClick: () => {
    openNewTab(
      {
        title: 'Lines #',
        icon: 'img archive',
        tabComponent: 'JsonLinesEditorTab',
      },
      {
        editor: '{"col1": "val1", "col2": "val2"}',
      }
    );
  },
});

registerCommand({
  id: 'new.sqliteDatabase',
  category: 'New',
  icon: 'img sqlite-database',
  name: 'SQLite database',
  menuName: 'New SQLite database',
  onClick: () => {
    showModal(InputTextModal, {
      value: 'newdb',
      label: 'New database name',
      header: 'Create SQLite database',
      onConfirm: async file => {
        const resp = await apiCall('connections/new-sqlite-database', { file });
        const connection = resp;
        currentDatabase.set({ connection, name: `${file}.sqlite` });
      },
    });
  },
});

registerCommand({
  id: 'tabs.changelog',
  category: 'Tabs',
  name: 'Changelog',
  onClick: () => {
    openNewTab({
      title: 'ChangeLog',
      icon: 'img markdown',
      tabComponent: 'ChangelogTab',
      props: {},
    });
  },
});

registerCommand({
  id: 'group.save',
  category: null,
  isGroupCommand: true,
  name: 'Save',
  keyText: 'Ctrl+S',
  group: 'save',
});

registerCommand({
  id: 'group.saveAs',
  category: null,
  isGroupCommand: true,
  name: 'Save As',
  keyText: 'Ctrl+Shift+S',
  group: 'saveAs',
});

registerCommand({
  id: 'group.undo',
  category: null,
  isGroupCommand: true,
  name: 'Undo',
  keyText: 'Ctrl+Z',
  group: 'undo',
});

registerCommand({
  id: 'group.redo',
  category: null,
  isGroupCommand: true,
  name: 'Redo',
  keyText: 'Ctrl+Y',
  group: 'redo',
});

registerCommand({
  id: 'file.open',
  category: 'File',
  name: 'Open',
  keyText: 'Ctrl+O',
  testEnabled: () => getElectron() != null,
  onClick: openElectronFile,
});

registerCommand({
  id: 'file.openArchive',
  category: 'File',
  name: 'Open DB Model/Archive',
  testEnabled: () => getElectron() != null,
  onClick: openArchiveFolder,
});

registerCommand({
  id: 'file.import',
  category: 'File',
  name: 'Import data',
  toolbar: true,
  icon: 'icon import',
  onClick: () =>
    showModal(ImportExportModal, {
      importToCurrentTarget: true,
      initialValues: { sourceStorageType: getDefaultFileFormat(get(extensions)).storageType },
    }),
});

registerCommand({
  id: 'view.reset',
  category: 'View',
  name: 'Reset view',
  onClick: () => {
    const keys = [
      'leftPanelWidth',
      'visibleToolbar',
      'selectedWidget',
      'currentTheme',

      'connectionsWidget',
      'pinnedItemsWidget',
      'dbObjectsWidget',

      'favoritesWidget',
      'savedFilesWidget',

      'closedTabsWidget',
      'queryHistoryWidget',

      'archiveFoldersWidget',
      'archiveFilesWidget',

      'installedPluginsWidget',
      'allPluginsWidget',

      'currentArchive',
    ];
    for (const key of keys) removeLocalStorage(key);
    showSnackbarSuccess('Restart DbGate (or reload on web) for applying changes');
  },
});

registerCommand({
  id: 'sql.generator',
  category: 'SQL',
  name: 'SQL Generator',
  toolbar: true,
  icon: 'icon sql-generator',
  testEnabled: () => getCurrentDatabase() != null,
  onClick: () =>
    showModal(SqlGeneratorModal, {
      conid: getCurrentDatabase()?.connection?._id,
      database: getCurrentDatabase()?.name,
    }),
});

if (hasPermission('settings/change')) {
  registerCommand({
    id: 'settings.commands',
    category: 'Settings',
    name: 'Keyboard shortcuts',
    onClick: () => {
      openNewTab({
        title: 'Keyboard Shortcuts',
        icon: 'icon keyboard',
        tabComponent: 'CommandListTab',
        props: {},
      });
    },
  });

  registerCommand({
    id: 'settings.show',
    category: 'Settings',
    name: 'Change',
    toolbarName: 'Settings',
    onClick: () => showModal(SettingsModal),
  });
}

registerCommand({
  id: 'file.exit',
  category: 'File',
  name: 'Exit',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('close-window'),
});

export function registerFileCommands({
  idPrefix,
  category,
  getCurrentEditor,
  folder,
  format,
  fileExtension,
  save = true,
  execute = false,
  toggleComment = false,
  findReplace = false,
  undoRedo = false,
  executeAdditionalCondition = null,
}) {
  if (save) {
    registerCommand({
      id: idPrefix + '.save',
      group: 'save',
      category,
      name: 'Save',
      // keyText: 'Ctrl+S',
      icon: 'icon save',
      toolbar: true,
      isRelatedToTab: true,
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => saveTabFile(getCurrentEditor(), 'save', folder, format, fileExtension),
    });
    registerCommand({
      id: idPrefix + '.saveAs',
      group: 'saveAs',
      category,
      name: 'Save As',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => saveTabFile(getCurrentEditor(), 'save-as', folder, format, fileExtension),
    });
    registerCommand({
      id: idPrefix + '.saveToDisk',
      category,
      name: 'Save to disk',
      testEnabled: () => getCurrentEditor() != null && getElectron() != null,
      onClick: () => saveTabFile(getCurrentEditor(), 'save-to-disk', folder, format, fileExtension),
    });
  }

  if (execute) {
    registerCommand({
      id: idPrefix + '.execute',
      category,
      name: 'Execute',
      icon: 'icon run',
      toolbar: true,
      isRelatedToTab: true,
      keyText: 'F5 | Ctrl+Enter',
      testEnabled: () =>
        getCurrentEditor() != null &&
        !getCurrentEditor()?.isBusy() &&
        (executeAdditionalCondition == null || executeAdditionalCondition()),
      onClick: () => getCurrentEditor().execute(),
    });
    registerCommand({
      id: idPrefix + '.kill',
      category,
      name: 'Kill',
      icon: 'icon close',
      toolbar: true,
      isRelatedToTab: true,
      testEnabled: () => getCurrentEditor()?.canKill && getCurrentEditor().canKill(),
      onClick: () => getCurrentEditor().kill(),
    });
  }

  if (toggleComment) {
    registerCommand({
      id: idPrefix + '.toggleComment',
      category,
      name: 'Toggle comment',
      keyText: 'Ctrl+/',
      disableHandleKeyText: 'Ctrl+/',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().toggleComment(),
    });
  }

  if (findReplace) {
    registerCommand({
      id: idPrefix + '.find',
      category,
      name: 'Find',
      keyText: 'Ctrl+F',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().find(),
    });
    registerCommand({
      id: idPrefix + '.replace',
      category,
      keyText: 'Ctrl+H',
      name: 'Replace',
      testEnabled: () => getCurrentEditor() != null,
      onClick: () => getCurrentEditor().replace(),
    });
  }
  if (undoRedo) {
    registerCommand({
      id: idPrefix + '.undo',
      category,
      name: 'Undo',
      group: 'undo',
      icon: 'icon undo',
      testEnabled: () => getCurrentEditor()?.canUndo(),
      onClick: () => getCurrentEditor().undo(),
    });
    registerCommand({
      id: idPrefix + '.redo',
      category,
      group: 'redo',
      name: 'Redo',
      icon: 'icon redo',
      testEnabled: () => getCurrentEditor()?.canRedo(),
      onClick: () => getCurrentEditor().redo(),
    });
  }
}

registerCommand({
  id: 'app.minimize',
  category: 'Application',
  name: 'Minimize',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'minimize'),
});

registerCommand({
  id: 'app.toggleFullScreen',
  category: 'Application',
  name: 'Toggle full screen',
  keyText: 'F11',
  testEnabled: () => getElectron() != null,
  onClick: async () => {
    const settings = await getSettings();
    const value = !settings['app.fullscreen'];
    apiCall('config/update-settings', { 'app.fullscreen': value });
    if (value) getElectron().send('window-action', 'fullscreen-on');
    else getElectron().send('window-action', 'fullscreen-off');
  },
});

registerCommand({
  id: 'app.toggleDevTools',
  category: 'Application',
  name: 'Toggle Dev Tools',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'devtools'),
});

registerCommand({
  id: 'app.reload',
  category: 'Application',
  name: 'Reload',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'reload'),
});

registerCommand({
  id: 'app.openDocs',
  category: 'Application',
  name: 'Documentation',
  onClick: () => openWebLink('https://dbgate.org/docs/'),
});

registerCommand({
  id: 'app.openWeb',
  category: 'Application',
  name: 'DbGate web',
  onClick: () => openWebLink('https://dbgate.org'),
});

registerCommand({
  id: 'app.openIssue',
  category: 'Application',
  name: 'Report problem or feature request',
  onClick: () => openWebLink('https://github.com/dbgate/dbgate/issues/new'),
});

registerCommand({
  id: 'app.openSponsoring',
  category: 'Application',
  name: 'Become sponsor',
  onClick: () => openWebLink('https://opencollective.com/dbgate'),
});

registerCommand({
  id: 'app.zoomIn',
  category: 'Application',
  name: 'Zoom in',
  keyText: 'Ctrl+=',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'zoomin'),
});

registerCommand({
  id: 'app.zoomOut',
  category: 'Application',
  name: 'Zoom out',
  keyText: 'Ctrl+-',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'zoomout'),
});

registerCommand({
  id: 'app.zoomReset',
  category: 'Application',
  name: 'Reset zoom',
  testEnabled: () => getElectron() != null,
  onClick: () => getElectron().send('window-action', 'zoomreset'),
});

const electron = getElectron();
if (electron) {
  electron.addEventListener('run-command', (e, commandId) => runCommand(commandId));
}
