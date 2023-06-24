import path from "path";
import {
  actions,
  fs,
  log,
  selectors,
  types,
  util,
} from "vortex-api";
// import UnrealGameHelper from "vortex-ext-common";
// import { VortexCommands } from "./VortexCommands";
// import { VortexEvents } from "./VortexEvents";
import * as VortexUtils from "./VortexUtils";
import { ILoadOrderEntry, IProps } from "./types";
import Migrate from "./migration";
import { LuaModsMonitor, refreshLuaMods, writeManifest } from './util/luaModsUtil';
import LuaModsLoadOrderPage from './views/LuaModsLoadOrderPage';
import { luaModReducer } from './reducers/luaReducer';

// IDs for different stores and nexus
import { 
  EPIC_ID, STEAM_ID, GAME_ID, GAME_NAME, EXECUTABLE, MODSFOLDER_PATH, 
  MOVIESMOD_PATH, IGNORE_CONFLICTS, IGNORE_DEPLOY, STOP_PATTERNS,
  UEPROJECTNAME, GAME_FOLDER_STEAM, GAME_FOLDER_EPIC
} from './common';

// Abstract away a lot of the code for specific features into their own classes.
import UnrealMovieInstaller from './installers/unreal-installer-movies';
import UnrealBluePrintOrLuaInstaller from './installers/unreal-installer-bp-lua';
import UnrealMovieModType from './modtypes/unreal-modtype-movies';
import UnrealPAKModType from './modtypes/unreal-PAK-modtype';
import UnrealMovieMerger from './merges/movies-merge';

let monitor: LuaModsMonitor;

const LOADORDER_FILE = "loadOrder.json";
const VERSION_PATH = path.join(
  UEPROJECTNAME,
  "Content",
  "Data",
  "Version",
  "DA_Version.txt",
); // relative to game root


// important that will be updated in main once function
// let CONTEXT: IExtensionContext;
// let API: IExtensionApi;

// let vortexCommands: VortexCommands;
// let vortexEvents: VortexEvents;

async function getGameVersion(discoveryPath: string) {
  const fullPath = path.join(discoveryPath, VERSION_PATH);

  try {
    const contents = await fs.readFileAsync(fullPath, { encoding: "utf8" });
    // console.log(contents);
    return Promise.resolve(contents);
  } catch (error) {
    return Promise.reject(error);
  }
}

// async function OnWillDeploy(
//   context: IExtensionContext,
//   willDeployEventArgs: WillDeployEventArgs,
// ) {
//   const state = context.api.getState();
//   const profile: types.IProfile = selectors.activeProfile(state);

//   /*
//   // console.log("OnWillDeploy");
//   // console.log(context);
//   // console.log(willDeployEventArgs);
//   // console.log(util.getSafe(state, ["persistent", "loadOrder", profile.id], []));
//   // console.log("---");*/
// }

function main(context: types.IExtensionContext) {
  context.once(() => {
    // event and command references
    // vortexCommands = new VortexCommands(context);
    // vortexEvents = new VortexEvents(context);

    // CONTEXT = context;
    // API = context.api;

    // vortexEvents.onWillDeploy.subscribe(OnWillDeploy);

    // console.log("initialising the hogwarts extension! context.once()");
  });

  // register a whole game, basic metadata and folder paths
  context.registerGame({
    id: GAME_ID,
    name: GAME_NAME,
    mergeMods: true,
    getGameVersion: getGameVersion,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: () => ".",
    logo: "gameart.jpg",
    executable: () => EXECUTABLE,
    requiredFiles: [EXECUTABLE],
    setup: setup,
    requiresCleanup: true,
    compatible: {
      symlinks: false,
    },
    environment: {
      ["SteamAppId"]: STEAM_ID,
      ["EpicAppId"]: EPIC_ID,
    },
    details: {
      ["SteamAppId"]: parseInt(STEAM_ID, 10),
      ["EpicAppId"]: EPIC_ID,
      stopPatterns: STOP_PATTERNS,
      ignoreDeploy: IGNORE_DEPLOY,
      ignoreConflicts: IGNORE_CONFLICTS
    },
    requiresLauncher: requiresLauncher,
  });

  context.registerLoadOrder({
    gameId: GAME_ID,
    validate: async () => Promise.resolve(undefined), // no validation needed
    deserializeLoadOrder: async () => await DeserializeLoadOrder(context),
    serializeLoadOrder: async (loadOrder) =>
      await SerializeLoadOrder(context, loadOrder),
    toggleableEntries: false,
    usageInstructions: `Re-position entries by draging and dropping them - note that the mod further down the list will be loaded last and win any conflicts. Mods that replace the .bk2 video files located in ${MOVIESMOD_PATH} aren't affected, only PAK (and their associated) files are.`,
  });

  context.registerMainPage('highlight-lab', 'Lua Mods', LuaModsLoadOrderPage, {
    id: `${GAME_ID}-lua-mods`,
    group: 'per-game',
    hotkey: 'U',
    visible: () => {
      const state = context.api.getState();
      const activeGameId = selectors.activeGameId(state);
      return (activeGameId === GAME_ID);
    },
    priority: 120
  });

  // Register State controls for LUA load order
  context.registerReducer(['session', 'lualoadorder'], luaModReducer);

  context.registerMigration((oldVer) => Migrate(context, oldVer));

  context.registerModType(
    "unreal-modtype-movies",
    95,
    UnrealMovieModType.isSupported,
    (game) => UnrealMovieModType.getPath(context, game),
    UnrealMovieModType.test,
    UnrealMovieModType.options,
  );

  context.registerModType(
    "unreal-PAK-modtype",
    25,
    UnrealPAKModType.isSupported,
    (game) => UnrealPAKModType.getPath(context, game),
    UnrealPAKModType.test,
    { mergeMods: (mod) => UnrealPAKModType.options.mergeMods(mod, context), name: "PAK Mod" },
  );

  context.registerInstaller(
    "unreal-installer-movies",
    90,
    UnrealMovieInstaller.test,
    (files) => UnrealMovieInstaller.install(files, context),
  );
  
  context.registerInstaller(
    "unreal-installer-bp-lua", 
    90, 
    UnrealBluePrintOrLuaInstaller.test, 
    UnrealBluePrintOrLuaInstaller.install
  );

  context.registerMerge(
    (game) => UnrealMovieMerger.test(context, game),
    (filePath, mergePath) => UnrealMovieMerger.merge(context, filePath, mergePath),
    UnrealMovieMerger.modtype,
  );

  // 200 so it goes to bottom of menu list?
  context.registerAction(
    "mod-icons",
    120,
    "open-ext",
    {},
    "Open Save Game Folder",
    () => {
      const api = context.api;
      const state = api.getState();

      const discovery: types.IDiscoveryResult =
        state.settings.gameMode.discovered?.[GAME_ID];

      if (discovery == undefined) {
        //console.warn(`discovery is undefined`);
        return;
      }

      //console.log("discovery", discovery);

      // because of course epic is using a different folder name to Steam to store save game data in
      const gameFolderName: string =
        discovery?.store == "epic" ? GAME_FOLDER_EPIC : GAME_FOLDER_STEAM;
      const saveGameFolderPath: string = path.join(
        VortexUtils.GetLocalAppDataPath(),
        gameFolderName,
        "Saved",
        "SaveGames",
      );

      try {
        util.opn(saveGameFolderPath);
      } catch (error) {
        log('warn', `Error opening ${GAME_NAME} save folder`, error)
        // console.warn(`${error}`);
        return;
      }      
    },
    () => selectors.activeGameId(context.api.getState()) === GAME_ID,
  );

  context.once(() => {
    monitor = new LuaModsMonitor(context.api);
    context.api.events.on('gamemode-activated', async (gameId) => gameId === GAME_ID ? monitor?.start() : monitor?.stop());
    // Pause the monitor during deployment
    context.api.events.on('will-deploy', () => monitor.pause());
    context.api.events.on('will-purge', () => monitor.pause());
    context.api.events.on('did-deploy', () => {
      monitor.resume();
      refreshLuaMods(context.api);
    });
    context.api.events.on('did-purge', () => {
      monitor.resume();
      refreshLuaMods(context.api);
    });
    context.api.events.on('profile-did-change', (profileId: string) => {
      const state = context.api.getState();
      const profile = selectors.profileById(state, profileId);
      // Do nothing if this isn't hogwarts!
      if (profile.gameId !== GAME_ID) return;
      // When the actual profile change happens
      refreshLuaMods(context.api);
    });

    context.api.setStylesheet('unreal-styles', path.join(__dirname, 'custom-styles.scss'));

    // When the loadorder changes, update the manifest on disk.
    context.api.onStateChange(['session', 'lualoadorder'], (previous, current) => {
      // Get game and profile info.
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      const profile = selectors.activeProfile(state);
      // Not Hogwarts of we swapped to an invalid profile.
      if (gameId !== GAME_ID || !profile) return;
      // Get the actual load orders to compare.
      const prevLoadOrder = previous[profile.id];
      const currLoadOrder = current[profile.id];
      // If there's no previous state, we've probably just loaded it from the disk. Also ignore identical states.
      if (!prevLoadOrder || (prevLoadOrder === currLoadOrder)) return;
      // Get the path to the Mods.txt file.
      const gamePath: string | undefined = state.settings.gameMode.discovered[GAME_ID]?.path || undefined;
      if (!gamePath) return;
      const modsPath = path.join(gamePath, UEPROJECTNAME, 'Binaries', 'Win64', 'Mods', 'Mods.txt');
      // Stop monitoring the mods.txt file, write the new manifest, resume the monitor.
      monitor.pause();
      writeManifest(currLoadOrder, modsPath)
        .catch((err) => log('error', 'Could not write LUA manifest', err))
        .finally(() => monitor.resume());
    });
  })

  return true;
}

/**
 * Should be used to filter and insert wanted data into Vortex's loadOrder application state. Once that's done, Vortex
 * will trigger a serialization event which will ensure the data is written to the load order file.
 */
async function DeserializeLoadOrder(
  context: types.IExtensionContext,
): Promise<types.LoadOrder> {
  //// console.log("HOGWARTS: DeserializeLoadOrder");

  // get all the main vortex properties
  const props: IProps = GetVortexProperties(context);

  // build path to load order file
  const loadOrderPath = path.join(
    VortexUtils.GetUserDataPath(),
    props.profile.gameId,
    props.profile.id + "_" + LOADORDER_FILE,
  );
  //// console.log(`loadOrderPath=${loadOrderPath}`);

  // get current state of the mods
  const currentModsState = util.getSafe(props.profile, ["modState"], {});

  // we only want to insert enabled mods.
  const enabledModIds = Object.keys(currentModsState).filter((modId) =>
    util.getSafe(currentModsState, [modId, "enabled"], false),
  );
  const mods: Record<string, types.IMod> = util.getSafe(
    props.state,
    ["persistent", "mods", GAME_ID],
    {},
  );

  // set up blank load order entry array and we will try to fill it with loaded data from the file
  let data: ILoadOrderEntry[] = [];

  // try to load serialized data
  try {
    const fileData = await fs.readFileAsync(loadOrderPath, {
      encoding: "utf8",
    });
    //// console.log(fileData);

    // try to parse loaded file into array of load order entry
    try {
      data = JSON.parse(fileData);
    } catch (error) {
      log('error', `Error decoding saved JSON for ${GAME_NAME} load order`, error)
      // console.error(error);
    }
  } catch (error) {
    // file doesn't exist
    //console.warn(error);
  }

  // User may have disabled/removed a mod from the mods page - we need to filter out any existing
  //  entries from the data we parsed.
  const filteredData = data.filter((entry) => enabledModIds.includes(entry.id));

  // Check if the user added any new mods, and only add things that aren't in collections and aren't movies types
  const newMods = enabledModIds.filter(
    (id) =>
      ["unreal-PAK-modtype", "unreal-modtype-movies"].includes(
        mods[id]?.type,
      ) && filteredData.find((loEntry) => loEntry.id === id) === undefined,
  );

  // removed mods[id]?.type != "unreal-modtype-movies"

  // Add any newly added mods to the bottom of the loadOrder.
  newMods.forEach((newMod) => {
    filteredData.push({
      id: newMod,
      modId: newMod,
      enabled: true,
      name:
        mods[newMod] !== undefined ? util.renderModName(mods[newMod]) : newMod,
    });
  });

  return Promise.resolve(filteredData);
}

//#region SOMETHING

async function SerializeLoadOrder(
  context: types.IExtensionContext,
  loadOrder: types.LoadOrder,
  // previousLoadOrder: types.LoadOrder,
): Promise<void> {
  // console.log("HOGWARTS: SerializeLoadOrder");

  const props: IProps = GetVortexProperties(context);

  // build path to load order file
  const loadOrderPath = path.join(
    VortexUtils.GetUserDataPath(),
    props.profile.gameId,
    props.profile.id + "_" + LOADORDER_FILE,
  );
  // console.log(`loadOrderPath=${loadOrderPath}`);

  // write prefixed load order to file
  try {
    await fs.writeFileAsync(loadOrderPath, JSON.stringify(loadOrder, null, 4), {
      encoding: "utf8",
    });
  } catch (error) {
    return Promise.reject(error);
  }

  // something has changed so we need to tell vortex that a deployment will be necessary
  context.api.store.dispatch(actions.setDeploymentNecessary(GAME_ID, true));

  return Promise.resolve();
}

//#endregion

async function setup(discovery: types.IDiscoveryResult) {
  const absoluteModFolderPath = path.join(discovery.path, MODSFOLDER_PATH);

  try {
    // make sure the mod folder exists (! is for trusting that it won't be null)
    await fs.ensureDirWritableAsync(absoluteModFolderPath);
    return Promise.resolve;
  } catch (error) {
    return Promise.reject(error);
  }
}

async function requiresLauncher(gamePath: string, store?: string) {
  // console.log(`requiresLauncher ${gamePath} ${store} {}`);

  if (store === "steam") {
    return Promise.resolve({
      launcher: "steam",
      addInfo: {
        appId: STEAM_ID,
        parameters: [],
        launchType: "gamestore",
      },
    });
  } else if (store === "epic") {
    return Promise.resolve({
      launcher: "epic",
      addInfo: {
        appId: EPIC_ID,
      },
    });
  }

  // return a void promise if nothing else
  return Promise.resolve();
}

async function findGame() {
  //debugger;
  //// console.log("findGame()");

  try {
    const game: types.IGameStoreEntry = await util.GameStoreHelper.findByAppId([
      EPIC_ID,
      STEAM_ID,
    ]);
    return Promise.resolve(game.gamePath);
  } catch (error) {
    //console.error(error);
    return Promise.reject(error);
  }

  /*
  return util.GameStoreHelper.findByAppId([MSAPP_ID, STEAM_ID]).then((game: IGameStoreEntry) => {
    GAME_STORE_ID = game.gameStoreId;
    GAME_ROOT_PATH = game.gamePath;
    return game.gamePath;
  });*/
}

function GetVortexProperties(
  context: types.IExtensionContext,
  profileId?: string,
): IProps {
  const api = context.api;
  const state = api.getState();
  const profile: types.IProfile =
    profileId !== undefined
      ? selectors.profileById(state, profileId)
      : selectors.activeProfile(state);

  if (profile?.gameId !== GAME_ID) {
    return undefined;
  }

  const discovery: types.IDiscoveryResult = util.getSafe(
    state,
    ["settings", "gameMode", "discovered", GAME_ID],
    undefined,
  );
  if (discovery?.path === undefined) {
    return undefined;
  }

  const tempMods = util.getSafe(state, ["persistent", "mods", GAME_ID], {});
  const mods = tempMods;

  return { api, state, profile, mods, discovery };
}

export default main;
