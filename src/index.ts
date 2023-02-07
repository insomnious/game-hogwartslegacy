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
const EPIC_ID = "TBC";
const STEAM_ID = "990080";
const NEXUS_ID = "hogwartslegacy";

const EXECUTABLE: string = "HogwartsLegacy.exe"; // path to executable, relative to game root
const MODSFOLDER_PATH = path.join("Game", "Content", "Paks", "~mods"); // relative to game root

// important that will be updated in main once function
let CONTEXT: IExtensionContext;

let vortexCommands: VortexCommands;
let vortexEvents: VortexEvents;

function main(context: types.IExtensionContext) {
  context.once(() => {
    // event and command references
    vortexCommands = new VortexCommands(context.api);
    vortexEvents = new VortexEvents(context.api);

    console.log("initialising the hogwarts extension! context.once()");

    // subscribe to events
    vortexEvents.onGameModeActivated.subscribe((api, gameMode) => {
      console.log("hogwarts onGameModeActivated()");
      console.log(api);
      console.log(gameMode);
    });
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
    queryPath: undefined,
    supportedTools: [],
    queryModPath: () => MODSFOLDER_PATH,
    logo: "gameart.jpg",
    executable: () => EXECUTABLE,
    requiredFiles: [EXECUTABLE],
    setup: undefined,
    environment: {
      ["SteamAppId"]: STEAM_ID,
      ["EpicAppId"]: EPIC_ID
    },
    details: {
      ["SteamAppId"]: STEAM_ID,
      ["EpicAppId"]: EPIC_ID
    }
  });

  return true;
}

export default main;
