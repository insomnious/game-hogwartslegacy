import path from "path";
import { fs, log, selectors, types, util } from "vortex-api";
import { IDialogResult } from "vortex-api/lib/actions";
import {
  IExtensionApi,
  IExtensionContext,
  IInstruction,
  ISupportedResult
} from "vortex-api/lib/types/IExtensionContext";
import { IGame } from "vortex-api/lib/types/IGame";
import { IGameStoreEntry } from "vortex-api/lib/types/IGameStoreEntry";
import { IDiscoveryResult, IState } from "vortex-api/lib/types/IState";
import UnrealGameHelper from "vortex-ext-common";
import { VortexCommands } from "./VortexCommands";
import { VortexEvents } from "./VortexEvents";

// IDs for different stores and nexus
const EPIC_ID = "fa4240e57a3c46b39f169041b7811293";
const STEAM_ID = "990080";
const NEXUS_ID = "hogwartslegacy";

const EXECUTABLE: string = "HogwartsLegacy.exe"; // path to executable, relative to game root
const MODSFOLDER_PATH = path.join("Phoenix", "Content", "Paks", "~mods"); // relative to game root
const VERSION_PATH = path.join(
  "Phoenix",
  "Content",
  "Data",
  "Version",
  "DA_Version.txt"
); // relative to game root

// important that will be updated in main once function
let CONTEXT: IExtensionContext;

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

function main(context: types.IExtensionContext) {
  context.once(() => {
    // event and command references
    vortexCommands = new VortexCommands(context.api);
    vortexEvents = new VortexEvents(context.api);

    CONTEXT = context;

    console.log("initialising the hogwarts extension! context.once()");
  });

  /*
  context.registerAction('global-icons', 100, 'menu', {}, 'Sample', () => {
    context.api.showDialog('info', 'Success!', {
      text: 'Hello World',
    }, [
      { label: 'Close' },
    ]);
  });*/

  // register a whole game, basic metadata and folder paths
  context.registerGame({
    id: NEXUS_ID,
    name: "Hogwarts Legacy",
    mergeMods: true,
    getGameVersion: getGameVersion,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: () => MODSFOLDER_PATH,
    logo: "gameart.jpg",
    executable: () => EXECUTABLE,
    requiredFiles: [EXECUTABLE],
    setup: setup,
    environment: {
      ["SteamAppId"]: STEAM_ID,
      ["EpicAppId"]: EPIC_ID
    },
    details: {
      ["SteamAppId"]: parseInt(STEAM_ID, 10),
      ["EpicAppId"]: EPIC_ID,
      stopPatterns: ["[^/]*\\.pak$"]
    }
  });

  return true;
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

async function findGame() {
  //debugger;
  //console.log("findGame()");

  try {
    const game: IGameStoreEntry = await util.GameStoreHelper.findByAppId([
      EPIC_ID,
      STEAM_ID
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

export default main;
