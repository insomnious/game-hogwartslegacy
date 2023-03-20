import path from "path";
import {
  actions,
  fs,
  log,
  selectors,
  types,
  util,
} from "vortex-api";
import {
  IExtensionApi,
  IExtensionContext,
  IInstruction,
  IMergeFilter,
  ISupportedResult,
} from "vortex-api/lib/types/IExtensionContext";
import { IGame } from "vortex-api/lib/types/IGame";
import { IGameStoreEntry } from "vortex-api/lib/types/IGameStoreEntry";
import { IDiscoveryResult, IMod, IState } from "vortex-api/lib/types/IState";
// import UnrealGameHelper from "vortex-ext-common";
import { VortexCommands } from "./VortexCommands";
import { VortexEvents, WillDeployEventArgs } from "./VortexEvents";
import * as VortexUtils from "./VortexUtils";
import { ILoadOrderEntry, IProps } from "./types";
import semver from "semver";
import { migrate0_2_11 } from "./migration";
import { LuaModsMonitor, refreshLogicMods } from './util/luaModsUtil';
import LuaModsLoadOrderPage from './views/LuaModsLoadOrderPage';

// IDs for different stores and nexus
const EPIC_ID = "fa4240e57a3c46b39f169041b7811293";
const STEAM_ID = "990080";
const GAME_ID = "hogwartslegacy";

let monitor: LuaModsMonitor;

const LOADORDER_FILE = "loadOrder.json";
const EXECUTABLE = "HogwartsLegacy.exe"; // path to executable, relative to game root
const MODSFOLDER_PATH = path.join("Phoenix", "Content", "Paks", "~mods"); // relative to game root
const MOVIESMOD_PATH = path.join("Phoenix", "Content"); // relative to game root, can't be /movies as we need to add pak files too sometimes
const VERSION_PATH = path.join(
  "Phoenix",
  "Content",
  "Data",
  "Version",
  "DA_Version.txt",
); // relative to game root
const MOVIES_EXTENSION = ".bk2";
const PAK_EXTENSIONS = [".pak", ".utoc", ".ucas"];
const MOVIESMOD_EXTENSIONS = PAK_EXTENSIONS.concat(MOVIES_EXTENSION);

// Do not deploy these files
const ignoreDeploy = ['enabled.txt'];

// important that will be updated in main once function
let CONTEXT: IExtensionContext;
let API: IExtensionApi;

let vortexCommands: VortexCommands;
let vortexEvents: VortexEvents;

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

async function OnWillDeploy(
  context: IExtensionContext,
  willDeployEventArgs: WillDeployEventArgs,
) {
  const state = context.api.getState();
  const profile: types.IProfile = selectors.activeProfile(state);

  /*
  // console.log("OnWillDeploy");
  // console.log(context);
  // console.log(willDeployEventArgs);
  // console.log(util.getSafe(state, ["persistent", "loadOrder", profile.id], []));
  // console.log("---");*/
}

function main(context: types.IExtensionContext) {
  context.once(() => {
    // event and command references
    vortexCommands = new VortexCommands(context);
    vortexEvents = new VortexEvents(context);

    CONTEXT = context;
    API = context.api;

    vortexEvents.onWillDeploy.subscribe(OnWillDeploy);

    // console.log("initialising the hogwarts extension! context.once()");
  });

  // register a whole game, basic metadata and folder paths
  context.registerGame({
    id: GAME_ID,
    name: "Hogwarts Legacy",
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
      stopPatterns: ["[^/]*\\.pak$"],
      ignoreDeploy,
    },
    requiresLauncher: requiresLauncher,
  });

  context.registerLoadOrder({
    gameId: GAME_ID,
    validate: async () => Promise.resolve(undefined), // no validation needed
    deserializeLoadOrder: async () => await DeserializeLoadOrder(context),
    serializeLoadOrder: async (loadOrder, previousLoadOrder) =>
      await SerializeLoadOrder(context, loadOrder, previousLoadOrder),
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

  context.registerMigration((oldVer) => Migrate(context, oldVer));

  context.registerModType(
    "hogwarts-modtype-movies",
    95,
    (gameId) => gameId === GAME_ID,
    (game) => GetMoviesModTypeRootPath(context, game),
    () => false,
    { mergeMods: true, name: "Movie Replacer" },
  );

  context.registerModType(
    "hogwarts-PAK-modtype",
    25,
    (gameId) => gameId === GAME_ID,
    (game) => GetPakModsPath(context, game),
    (instructions) => TestForPakModType(instructions),
    { mergeMods: (mod) => MergeMods(mod, context), name: "PAK Mod" },
  );

  context.registerInstaller(
    "hogwarts-installer-movies",
    90,
    TestForMoviesMod,
    (files) => InstallMoviesMod(files, context),
  );

  context.registerMerge(
    (game, gameDiscovery) => TestMerge(context, game, gameDiscovery),
    (filePath, mergePath) => DoMerge(context, filePath, mergePath),
    "hogwarts-modtype-movies",
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

      if (discovery?.store == undefined) {
        console.warn(`discovery is undefined`);
      }

      // console.log(discovery);

      // because of course epic is using a different folder name to Steam to store save game data in
      const gameFolderName: string =
        discovery.store == "epic" ? "HogwartsLegacy" : "Hogwarts Legacy";
      const saveGameFolderPath: string = path.join(
        VortexUtils.GetLocalAppDataPath(),
        gameFolderName,
        "Saved",
        "SaveGames",
      );

      try {
        util.opn(saveGameFolderPath);
      } catch (error) {
        console.warn(`${error}`);
        return;
      }
      // } catch (error) {
      //    console.warn(`${saveGameFolderPath} doesn't exist`);
      //return;
      // }
    },
  );

  context.once(() => {
    monitor = new LuaModsMonitor(context.api);
    context.api.events.on('gamemode-activated', async (gameId) => gameId === GAME_ID ? monitor?.start() : monitor?.stop());
    // Pause the monitor during deployment
    context.api.events.on('will-deploy', (profileId, oldDeployment) => monitor.pause());
    context.api.events.on('did-deploy', (profileId, newDeployment) => {
      monitor.resume();
      refreshLogicMods(context.api);
    });
    context.api.events.on('profile-did-change', (newProfileId) => null);
  })

  return true;
}

function GetMoviesModTypeRootPath(
  context: IExtensionContext,
  game: IGame,
): string {
  const state: IState = context.api.getState();
  const gamePath: string = state.settings.gameMode.discovered?.[game.id]?.path;

  //// console.log(`HOGWARTS: GetMovieFolderPath() ${path.join(gamePath, MOVIESFOLDER_PATH)}`);

  if (gamePath != undefined) return path.join(gamePath, MOVIESMOD_PATH);
  else return undefined;
}

function GetPakModsPath(context: IExtensionContext, game: IGame): string {
  const state: IState = context.api.getState();
  const gamePath: string = state.settings.gameMode.discovered?.[game.id]?.path;

  //// console.log(`HOGWARTS: GetMovieFolderPath() ${path.join(gamePath, MOVIESFOLDER_PATH)}`);

  if (gamePath != undefined) return path.join(gamePath, MODSFOLDER_PATH);
  else return undefined;
}

async function TestForPakModType(
  insturctions: IInstruction[],
): Promise<boolean> {
  const copyInstructions = insturctions.filter((i) => i.type === "copy");
  const pakInstallInstructions = copyInstructions.filter(
    (i) => path.extname(i.source) === ".pak",
  );
  if (!pakInstallInstructions.length) return false;

  // Exclude criteria. Ignore LUA scripts, or logic mods.
  const excludeInstructions = copyInstructions.find(
    (i) =>
      i.source.toLowerCase().endsWith(".lua") ||
      i.source.toLowerCase().endsWith("ue4sslogicmod.info") ||
      i.source.toLowerCase().endsWith(".ue4sslogicmod") ||
      i.source.toLowerCase().endsWith(".logicmod"),
  );
  // // console.log('Pak mod?', !!excludeInstructions ? false : true);
  return !excludeInstructions ? false : true;
}

function TestMerge(
  context: IExtensionContext,
  game: IGame,
  gameDiscovery: IDiscoveryResult,
): IMergeFilter {
  if (game.id !== GAME_ID) {
    console.warn(
      `HOGWARTS: TestMerge() ${game.id} isn't for this merge function.`,
    );
    return undefined;
  }

  // don't need basefiles
  // don't think we need to do another filter here as it's taken care of during the installer, but we'll see
  return {
    baseFiles: () => [],
    filter: (filePath) => {
      return PAK_EXTENSIONS.includes(path.extname(filePath));
    }, //isConfig(filePath)
  };
}

/**
 * Function to manipulate each file inside of a mod in relation to it's staging folder
 * @param context
 * @param filePath Extracted from the original archive, after a custom installer has potentially manipulated it, this is our absolute source
 * @param mergePath New merge folder where files need to be copied/linked ready for deployment to take over
 */
async function DoMerge(
  context: IExtensionContext,
  filePath: string,
  mergePath: string,
): Promise<void> {
  const state = context.api.getState();

  const profile: types.IProfile = selectors.activeProfile(state);
  const installPath: string = selectors.installPathForGame(state, GAME_ID); // this is the root of staging mods folder for this game
  const relativeStagingPath: string = path.relative(installPath, filePath); // path of the extracted file, when the above has been stripped out. essentially an accurate relative path the same as the isntructions array during the custom installer
  const relativePath: string = relativeStagingPath
    .split(path.sep)
    .slice(1)
    .join(path.sep); //
  const modId: string = relativeStagingPath.split(path.sep)[0]; //
  const targetPath: string = path.join(mergePath, relativePath); // the empty merged staging folder, plus the file and path from the archive

  // console.log(
  //   `HOGWARTS: DoMerge() filePath=${filePath} mergePath=${mergePath} installPath=${installPath} relativeStagingPath=${relativeStagingPath} relativePath=${relativePath} targetPath=${targetPath} modId=${modId}`,
  // );

  // Retrieve the load order as stored in Vortex's application state.
  const loadOrder = util.getSafe(
    context.api.getState(),
    ["persistent", "loadOrder", profile.id],
    [],
  );

  //// console.log(loadOrder);
  // Find the mod entry in the load order state and insert the prefix in front
  //  of the mod's name/id/whatever
  //const loEntry: ILoadOrderEntry = loadOrder.find((loEntry) => loEntry.id === mod.id);
  const index: number = loadOrder.findIndex((loEntry) => loEntry.id === modId);
  const prefix: string = MakePrefixFromIndex(index);

  //// console.log(`HOGWARTS: DoMerge() index=${index} prefix=${prefix}`);

  // just in case?
  await fs.ensureDirWritableAsync(path.dirname(targetPath), () =>
    Promise.resolve(),
  );

  // lets decide what to do with what file
  if (path.extname(filePath) == MOVIES_EXTENSION) {
    // console.log(
    //   `HOGWARTS: DoMerge() this is a movie so I think it needs to go here... ${targetPath}`,
    // );

    // hard link instead of actual copy seeing as we are just renaming and changing folders, not changing contents
    await fs.linkAsync(filePath, targetPath);
  } else if (PAK_EXTENSIONS.includes(path.extname(filePath))) {
    // add a folder with a prefix before the filename
    const prefixedTargetPath: string = path.join(
      path.dirname(targetPath),
      prefix + "-" + modId,
      path.basename(targetPath),
    );

    // creates any necessary folders
    await fs.ensureDirWritableAsync(path.dirname(prefixedTargetPath), () =>
      Promise.resolve(),
    );

    // console.log(
    //   `HOGWARTS: DoMerge() this is a pak|utoc|ucas so I think it needs to go here... ${prefixedTargetPath}`,
    // );

    // hard link instead of actual copy seeing as we are just renaming and changing folders, not changing contents
    await fs.linkAsync(filePath, prefixedTargetPath);
  } else {
    console.warn(
      `HOGWARTS: DoMerge() ${path.extname(
        filePath,
      )} is an unknown extension and no idea how that slipped through the net.`,
    );
    Promise.reject("Unknown file extension");
  }

  return Promise.resolve();
}

async function TestForMoviesMod(
  files: string[],
  gameId: string,
): Promise<ISupportedResult> {
  // Make sure we're able to support this mod.

  // make sure the archive is for this game and contains at least 1 movie file
  const supported =
    gameId == GAME_ID &&
    files.find(
      (file) =>
        path.extname(file).toLowerCase() == MOVIES_EXTENSION.toLowerCase(),
    ) != undefined;

  // console.log(`HOGWARTS: TestForMoviesMod() supported=${supported}`);

  //// console.log("does modinfo exist? " + (files.find((file) => path.basename(file).toLowerCase() == MODINFO_FILENAME.toLowerCase()) != undefined));

  //// console.log(files);
  //// console.log(supported);

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

async function InstallMoviesMod(files: string[], context: IExtensionContext) {
  // can't type function return type as the return resolve needs to return an inline object

  const state = context.api.getState();
  const discovery = state.settings.gameMode?.discovered[GAME_ID];

  // console.log(discovery);
  if (discovery == undefined) {
    Promise.reject("discovery is undefined");
  }

  const gamePath = discovery.path;
  const rootPath = path.join(discovery.path, MOVIESMOD_PATH);
  const paksPath = path.join(discovery.path, MODSFOLDER_PATH);
  const moviesPath = path.join(discovery.path, MOVIESMOD_PATH, "Movies");

  // console.log(
  //   `HOGWARTS: InstallMoviesMod() gamePath=${gamePath} paksPath=${paksPath} moviesPath=${moviesPath} rootPath=${rootPath}`,
  // );

  // Remove empty directories (if we don't, we get an error in Vortex as it can't process empty directories)
  const filtered = files.filter((file) => !file.endsWith(path.sep));

  /*
   * We need to get5 a list of just the files and we also need to map them/find them, in the local /Movies folder so we can overwrite
   * then we can find those files locally and build the instructions array to specific files
   * i.e. we have 'ATL_Portrait_9_Music.bk2' and we need to find the path to put it i.e. 'Atlas/ATL_Portrait_9_Music.bk2'
   */

  // just movie files
  const movies = filtered.filter(
    (file) => path.extname(file) == MOVIES_EXTENSION,
  );
  const paks = filtered.filter((file) =>
    PAK_EXTENSIONS.includes(path.extname(file)),
  ); // add any of the pak, or associated, files

  // console.log("HOGWARTS: InstallMoviesMod() movies= paks=");
  // console.log(movies);
  // console.log(paks);

  // we need to find where the originals are now kept to install. basically search through subfolders nested in /Movies and match file names

  //if (props.discovery == undefined) {
  // Promise.reject("discovery is undefined");
  //}

  const foundFiles: string[] = await GetFilesInFolder(
    moviesPath,
    rootPath,
    true,
  );

  //// console.log("HOGWARTS: InstallMoviesMod() foundFiles=");
  //// console.log(foundFiles);

  //const matchedFiles = foundFiles.map((file) => path.basename(file));

  // empty instructions array
  const instructions: IInstruction[] = [];

  // adds instruction to set a different mod type
  instructions.push({ type: "setmodtype", value: "hogwarts-modtype-movies" });

  // loop through and find matching movies to replace
  for (const movieFile of movies) {
    // compare filename of mod file to filename of original file
    const foundFile: string = foundFiles.find(
      (file) =>
        path.basename(file).toLowerCase() ==
        path.basename(movieFile).toLowerCase(),
    );

    // console.log(
    //   `HOGWARTS: InstallMoviesMod() Looking for ${path
    //     .basename(movieFile)
    //     .toLowerCase()}... foundFile=${foundFile}`,
    // );

    // if we have a found a matching original file, then add it as needing replacing in the instructions array
    if (foundFile != undefined) {
      instructions.push({
        type: "copy",
        source: movieFile,
        destination: foundFile,
      });
    } else {
      console.warn(
        `HOGWARTS: InstallMoviesMod() ${path
          .basename(movieFile)
          .toLowerCase()} not found.`,
      );
    }
  }

  // now we do pak files if anything here?!

  for (const pakFile of paks) {
    instructions.push({
      type: "copy",
      source: pakFile,
      destination: path.join("Paks", "~mods", path.basename(pakFile)),
    });
  }

  // console.log(`HOGWARTS: InstallMoviesMod() instructions=`);
  // console.log(instructions);

  return Promise.resolve({ instructions });
}

async function GetFilesInFolder(
  folderPath: string,
  relativeTo?: string,
  recursive?: boolean,
): Promise<string[]> {
  let files: string[] = [];
  const items = await fs.readdirAsync(folderPath); // this array is list is relative to dirName, not absolute

  //// console.log(`HOGWARTS: GetFileList() folderPath=${folderPath} relativeTo=${relativeTo}`);
  //// console.log("HOGWARTS: GetFileList() items=");
  //// console.log(items);

  // loop through items in directory and get items (will be files and/or folders))
  for (const item of items) {
    // need absoltue path so we can check if it's a folder or not
    const absItemPath: string = path.join(folderPath, item);

    // if it's a folder we need to recursively search again. if it's a file, then we can add to the returning array
    if (await fs.isDirectoryAsync(absItemPath)) {
      //// console.log(`HOGWARTS: GetFileList() ${item} is a folder. Lets search inside of that`);

      // if searching recursively, lets dig in deeper
      if (recursive != undefined) {
        const moreFiles = await GetFilesInFolder(
          absItemPath,
          relativeTo,
          recursive,
        );
        files = files.concat(moreFiles);
      }
    } else {
      // if we've specified a relativeTo path, then lets try to remove the parts of the path we don't need
      //// console.log(`HOGWARTS: GetFileList() ${item} is a file. Lets add it`);
      if (relativeTo != undefined && folderPath.indexOf(relativeTo) != -1) {
        // we've matched a full path to make relative, so lets remove it and use that as our final path
        const relativePath = folderPath.substring(
          folderPath.indexOf(relativeTo) + relativeTo.length,
        );
        files.push(path.join(relativePath, item));
      } else {
        // nothing matched or we don't need to check, add full absolute path
        files.push(path.join(folderPath, item));
      }
    }
  }

  //// console.log(`HOGWARTS: GetFileList() ${folderPath} files=`);
  //// console.log(files);

  return Promise.resolve(files);
}

async function Migrate(context: IExtensionContext, oldVersion: string) {
  /*
   * Performed on main thread, and not render thread, so we can't use usual // console.log
   */

  log("info", `Migrate oldVersion=${oldVersion}`);

  if (semver.lt(oldVersion, "0.2.11")) {
    try {
      await migrate0_2_11(context, oldVersion);
    } catch (err) {
      log("error", "Failed to migrate Hogwarts Legacy to 0.2.11");
    }
  }

  // if old version is newer than or equal to this version, then we just ignore
  if (semver.gte(oldVersion, "0.2.10")) {
    log("info", "No need to migrate");
    return Promise.resolve();
  }

  const state = context.api.getState();
  const discoveryPath = util.getSafe(
    state,
    ["settings", "gameMode", "discovered", GAME_ID, "path"],
    undefined,
  );

  if (discoveryPath === undefined) {
    log("warn", "discoveryPath is undefined");
    return Promise.resolve();
  }

  const mods: { [modId: string]: types.IMod } = util.getSafe(
    state,
    ["persistent", "mods", GAME_ID],
    {},
  );
  if (Object.keys(mods).length === 0) {
    log("info", "mods length is 0 so no reason to migrate anything");
    return Promise.resolve();
    3283;
  }

  const modsPath = path.join(discoveryPath, MODSFOLDER_PATH);

  log("info", `modsPath=${modsPath}`);

  const result = context.api.sendNotification({
    type: "info",
    message:
      "The Hogwarts Legacy Extension has been updated. If you previously installed a mod modifying movie files (e.g. paintings) then there is a good chance that they haven't been working as those type of mods weren't officially supported. If this is the case then please reinstall those individual mods.",
  });

  return context.api
    .awaitUI()
    .then(() => fs.ensureDirWritableAsync(modsPath))
    .then(() =>
      context.api.emitAndAwait("purge-mods-in-path", GAME_ID, "", modsPath),
    )
    .then(() =>
      context.api.store.dispatch(actions.setDeploymentNecessary(GAME_ID, true)),
    );

  // migration needs to happen as we are upgrading

  // purge mods?
  //await vortexCommands.PurgeModsAsync(true);

  // deploy mods?
  //await vortexCommands.DeployModsAsync();
}

function MergeMods(mod: IMod, context: IExtensionContext): string {
  // console.log(`HOGWARTS: MergeMods id=${mod.id}`);

  const props: IProps = GetVortexProperties(context);
  //// console.log(props);
  //// console.log(mod);

  // if props is undefined then we won't be able to check load order to get prefixes
  if (props == undefined) {
    return "ZZZZ-" + mod.id;
  }

  // Retrieve the load order as stored in Vortex's application state.
  const loadOrder = util.getSafe(
    props.state,
    ["persistent", "loadOrder", props.profile.id],
    [],
  );

  // Find the mod entry in the load order state and insert the prefix in front
  //  of the mod's name/id/whatever
  //const loEntry: ILoadOrderEntry = loadOrder.find((loEntry) => loEntry.id === mod.id);
  const index: number = loadOrder.findIndex((loEntry) => loEntry.id === mod.id);
  const prefix: string = MakePrefixFromIndex(index);

  // check to see if this is a movies type, if so, we don't want an extra folder or a prefix added
  // so we return nothing and let our installer sort it out
  if (mod.type == "hogwarts-modtype-movies") {
    //return "ZZZZ-" + mod.id;
    //// console.log(mod);
    return "";
  }

  //// console.log("load order from application state");
  //// console.log(util.getSafe(props.state, ["persistent", "loadOrder", props.profile.id], []));

  //// console.log(`HOGWARTS: End MergeMods id=${mod.id} installationPath=${mod.installationPath} index=${index} prefix=${prefix}`);

  // use prefix if it's found, if not, then use ZZZZ
  return prefix != undefined ? prefix + "-" + mod.id : "ZZZZ-" + mod.id;
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
  const mods: Record<string, IMod> = util.getSafe(
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
      console.error(error);
    }
  } catch (error) {
    // file doesn't exist
    console.warn(error);
  }

  // User may have disabled/removed a mod from the mods page - we need to filter out any existing
  //  entries from the data we parsed.
  const filteredData = data.filter((entry) => enabledModIds.includes(entry.id));

  // Check if the user added any new mods, and only add things that aren't in collections and aren't movies types
  const newMods = enabledModIds.filter(
    (id) =>
      ["hogwarts-PAK-modtype", "hogwarts-modtype-movies"].includes(
        mods[id]?.type,
      ) && filteredData.find((loEntry) => loEntry.id === id) === undefined,
  );

  // removed mods[id]?.type != "hogwarts-modtype-movies"

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
  previousLoadOrder: types.LoadOrder,
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

async function setup(discovery: IDiscoveryResult) {
  const absoluteModFolderPath = path.join(discovery.path!, MODSFOLDER_PATH);

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
    const game: IGameStoreEntry = await util.GameStoreHelper.findByAppId([
      EPIC_ID,
      STEAM_ID,
    ]);
    return Promise.resolve(game.gamePath);
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }

  /*
  return util.GameStoreHelper.findByAppId([MSAPP_ID, STEAM_ID]).then((game: IGameStoreEntry) => {
    GAME_STORE_ID = game.gameStoreId;
    GAME_ROOT_PATH = game.gamePath;
    return game.gamePath;
  });*/
}

function MakePrefixFromIndex(input: number): string {
  let res = "";
  let rest = input;
  while (rest > 0) {
    res = String.fromCharCode(65 + (rest % 25)) + res;
    rest = Math.floor(rest / 25);
  }
  return util.pad(res as any, "A", 3);
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
