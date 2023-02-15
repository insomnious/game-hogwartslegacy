import path from "path";
import React, { ComponentProps } from "react";
import { actions, FlexLayout, fs, log, selectors, types, util } from "vortex-api";
import { IDialogResult } from "vortex-api/lib/actions";
import { ILoadOrderGameInfo, IValidationResult } from "vortex-api/lib/types/api";
import { IExtensionApi, IExtensionContext, IInstruction, ISupportedResult } from "vortex-api/lib/types/IExtensionContext";
import { IGame } from "vortex-api/lib/types/IGame";
import { IGameStoreEntry } from "vortex-api/lib/types/IGameStoreEntry";
import { IDiscoveryResult, IMod, IState } from "vortex-api/lib/types/IState";
import UnrealGameHelper from "vortex-ext-common";
import { VortexCommands } from "./VortexCommands";
import { VortexEvents, WillDeployEventArgs } from "./VortexEvents";
import * as VortexUtils from "./VortexUtils";
import { ILoadOrderEntry, IProps, ISerializableData, LoadOrder } from "./types";
import semver from "semver";

// IDs for different stores and nexus
const EPIC_ID = "fa4240e57a3c46b39f169041b7811293";
const STEAM_ID = "990080";
const NEXUS_ID = "hogwartslegacy";

const LOADORDER_FILE = "loadOrder.json";
const EXECUTABLE = "HogwartsLegacy.exe"; // path to executable, relative to game root
const MODSFOLDER_PATH = path.join("Phoenix", "Content", "Paks", "~mods"); // relative to game root
const VERSION_PATH = path.join("Phoenix", "Content", "Data", "Version", "DA_Version.txt"); // relative to game root

// important that will be updated in main once function
let CONTEXT: IExtensionContext;
let API: IExtensionApi;

let vortexCommands: VortexCommands;
let vortexEvents: VortexEvents;

async function getGameVersion(discoveryPath: string) {
  const fullPath = path.join(discoveryPath, VERSION_PATH);

  try {
    const contents = await fs.readFileAsync(fullPath, { encoding: "utf8" });
    console.log(contents);
    return Promise.resolve(contents);
  } catch (error) {
    return Promise.reject(error);
  }
}

async function OnWillDeploy(context: IExtensionContext, willDeployEventArgs: WillDeployEventArgs) {
  const state = context.api.getState();
  const profile: types.IProfile = selectors.activeProfile(state);
  /*
  console.log("OnWillDeploy");
  console.log(context);
  console.log(willDeployEventArgs);
  console.log(util.getSafe(state, ["persistent", "loadOrder", profile.id], []));
  console.log("---");*/
}

function main(context: types.IExtensionContext) {
  context.once(() => {
    // event and command references
    vortexCommands = new VortexCommands(context);
    vortexEvents = new VortexEvents(context);

    CONTEXT = context;
    API = context.api;

    vortexEvents.onWillDeploy.subscribe(OnWillDeploy);

    console.log("initialising the hogwarts extension! context.once()");
  });

  // register a whole game, basic metadata and folder paths
  context.registerGame({
    id: NEXUS_ID,
    name: "Hogwarts Legacy",
    mergeMods: (mod) => MergeMods(mod, context),
    getGameVersion: getGameVersion,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: () => MODSFOLDER_PATH,
    logo: "gameart.jpg",
    executable: () => EXECUTABLE,
    requiredFiles: [EXECUTABLE],
    setup: setup,
    compatible: {
      symlinks: false
    },
    environment: {
      ["SteamAppId"]: STEAM_ID,
      ["EpicAppId"]: EPIC_ID
    },
    details: {
      ["SteamAppId"]: parseInt(STEAM_ID, 10),
      ["EpicAppId"]: EPIC_ID,
      stopPatterns: ["[^/]*\\.pak$"]
    },
    requiresLauncher: requiresLauncher
  });

  context.registerLoadOrder({
    gameId: NEXUS_ID,
    validate: async () => Promise.resolve(undefined), // no validation needed
    deserializeLoadOrder: async () => await DeserializeLoadOrder(context),
    serializeLoadOrder: async (loadOrder, previousLoadOrder) => await SerializeLoadOrder(context, loadOrder, previousLoadOrder),
    toggleableEntries: false,
    usageInstructions:
      "Re-position entries by draging and dropping them - note that the mod further down the list will be loaded last and win any conflicts."
  });

  context.registerMigration((oldVer) => Migrate(context, oldVer));

  return true;
}

async function Migrate(context: IExtensionContext, oldVersion: string) {
  /*
   * Performed on main thread, and not render thread, so we can't use usual console.log
   */

  log("info", `Migrate oldVersion=${oldVersion}`);

  console.log(`HOGWARTS: Migrate oldVersion=${oldVersion}`);
  //context.api  (`HOGWARTS: Migrate oldVersion=${oldVersion}`);

  // if old version is newer than or equal to this version, then we just ignore
  if (semver.gte(oldVersion, "0.1.1")) {
    return Promise.resolve();
  }

  // get all the main vortex properties
  const props: IProps = GetVortexProperties(context);

  const modsPath = path.join(props.discovery.path, MODSFOLDER_PATH);

  log("info", `modsPath=${modsPath}`);

  return context.api
    .awaitUI()
    .then(() => fs.ensureDirWritableAsync(modsPath))
    .then(() => context.api.emitAndAwait("purge-mods-in-path", NEXUS_ID, "", modsPath))
    .then(() => context.api.store.dispatch(actions.setDeploymentNecessary(NEXUS_ID, true)));

  // migration needs to happen as we are upgrading

  // purge mods?
  //await vortexCommands.PurgeModsAsync(true);

  // deploy mods?
  //await vortexCommands.DeployModsAsync();
}

function MergeMods(mod: IMod, context: IExtensionContext): string {
  //console.log(`HOGWARTS: Start MergeMods id=${mod.id}`);

  const props: IProps = GetVortexProperties(context);

  if (props == undefined) {
    return "ZZZZ-" + mod.id;
  }

  // Retrieve the load order as stored in Vortex's application state.
  const loadOrder = util.getSafe(props.state, ["persistent", "loadOrder", props.profile.id], []);

  // Find the mod entry in the load order state and insert the prefix in front
  //  of the mod's name/id/whatever
  //const loEntry: ILoadOrderEntry = loadOrder.find((loEntry) => loEntry.id === mod.id);
  const index: number = loadOrder.findIndex((loEntry) => loEntry.id === mod.id);
  const prefix: string = MakePrefixFromIndex(index);

  //console.log("load order from application state");
  //console.log(util.getSafe(props.state, ["persistent", "loadOrder", props.profile.id], []));

  console.log(`HOGWARTS: End MergeMods id=${mod.id} installationPath=${mod.installationPath} index=${index} prefix=${prefix}`);

  // use prefix if it's found, if not, then use ZZZZ
  return prefix != undefined ? prefix + "-" + mod.id : "ZZZZ-" + mod.id;
}

/**
 * Should be used to filter and insert wanted data into Vortex's loadOrder application state. Once that's done, Vortex
 * will trigger a serialization event which will ensure the data is written to the load order file.
 */
async function DeserializeLoadOrder(context: types.IExtensionContext): Promise<types.LoadOrder> {
  console.log("HOGWARTS: DeserializeLoadOrder");

  // get all the main vortex properties
  const props: IProps = GetVortexProperties(context);

  // build path to load order file
  const loadOrderPath = path.join(VortexUtils.GetUserDataPath(), props.profile.gameId, props.profile.id + "_" + LOADORDER_FILE);
  console.log(`loadOrderPath=${loadOrderPath}`);

  // get current state of the mods
  const currentModsState = util.getSafe(props.profile, ["modState"], {});

  // we only want to insert enabled mods.
  const enabledModIds = Object.keys(currentModsState).filter((modId) => util.getSafe(currentModsState, [modId, "enabled"], false));
  const mods: Record<string, IMod> = util.getSafe(props.state, ["persistent", "mods", NEXUS_ID], {});

  // set up blank load order entry array and we will try to fill it with loaded data from the file
  let data: ILoadOrderEntry[] = [];

  // try to load serialized data
  try {
    const fileData = await fs.readFileAsync(loadOrderPath, { encoding: "utf8" });
    //console.log(fileData);

    // try to parse loaded file into array of load order entry
    try {
      data = JSON.parse(fileData);
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    // file doesn't exist
    console.error(error);
  }

  // User may have disabled/removed a mod from the mods page - we need to filter out any existing
  //  entries from the data we parsed.
  const filteredData = data.filter((entry) => enabledModIds.includes(entry.id));

  // Check if the user added any new mods.
  const newMods = enabledModIds.filter((id) => mods[id]?.type !== "collection" && filteredData.find((loEntry) => loEntry.id === id) === undefined);

  // Add any newly added mods to the bottom of the loadOrder.
  newMods.forEach((newMod) => {
    filteredData.push({
      id: newMod,
      modId: newMod,
      enabled: true,
      name: mods[newMod] !== undefined ? util.renderModName(mods[newMod]) : newMod
    });
  });

  return Promise.resolve(filteredData);
}

async function SerializeLoadOrder(context: types.IExtensionContext, loadOrder: types.LoadOrder, previousLoadOrder: types.LoadOrder): Promise<void> {
  console.log("HOGWARTS: SerializeLoadOrder");

  const props: IProps = GetVortexProperties(context);

  // build path to load order file
  const loadOrderPath = path.join(VortexUtils.GetUserDataPath(), props.profile.gameId, props.profile.id + "_" + LOADORDER_FILE);
  console.log(`loadOrderPath=${loadOrderPath}`);

  // write prefixed load order to file
  try {
    await fs.writeFileAsync(loadOrderPath, JSON.stringify(loadOrder, null, 4), { encoding: "utf8" });
  } catch (error) {
    return Promise.reject(error);
  }

  // something has changed so we need to tell vortex that a deployment will be necessary
  context.api.store.dispatch(actions.setDeploymentNecessary(NEXUS_ID, true));

  return Promise.resolve();
}

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
  console.log(`requiresLauncher ${gamePath} ${store} {}`);

  if (store === "steam") {
    return Promise.resolve({
      launcher: "steam",
      addInfo: {
        appId: STEAM_ID,
        parameters: [],
        launchType: "gamestore"
      }
    });
  } else if (store === "epic") {
    return Promise.resolve({
      launcher: "epic",
      addInfo: {
        appId: EPIC_ID
      }
    });
  }

  // return a void promise if nothing else
  return Promise.resolve();
}

async function findGame() {
  //debugger;
  //console.log("findGame()");

  try {
    const game: IGameStoreEntry = await util.GameStoreHelper.findByAppId([EPIC_ID, STEAM_ID]);
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

function GetVortexProperties(context: types.IExtensionContext, profileId?: string): IProps {
  const api = context.api;
  const state = api.getState();
  const profile: types.IProfile = profileId !== undefined ? selectors.profileById(state, profileId) : selectors.activeProfile(state);

  if (profile?.gameId !== NEXUS_ID) {
    return undefined;
  }

  const discovery: types.IDiscoveryResult = util.getSafe(state, ["settings", "gameMode", "discovered", NEXUS_ID], undefined);
  if (discovery?.path === undefined) {
    return undefined;
  }

  const tempMods = util.getSafe(state, ["persistent", "mods", NEXUS_ID], {});
  const mods = tempMods;

  return { api, state, profile, mods, discovery };
}

export default main;
