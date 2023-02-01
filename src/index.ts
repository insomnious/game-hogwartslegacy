import path from "path";
import { log, types } from "vortex-api";
import UnrealGameHelper from "vortex-ext-common";
import { VortexCommands } from "./VortexCommands";
import { VortexEvents } from "./VortexEvents";

// Nexus Mods domain for the game. e.g. nexusmods.com/bloodstainedritualofthenight
const GAME_ID: string = "hogwartslegacy";

//Steam Application ID, you can get this from https://steamdb.info/apps/
const STEAMAPP_ID: string = "990080";

// filename of main executable
const EXECUTABLE_FILENAME: string = "HogwartsLegacy.exe";

// path to folder that is relative to game root "/Path/To/Mods"
const RELATIVE_MODSFOLDER_PATH = path.join("Game", "Content", "Paks", "~mods");

let vortexCommands: VortexCommands;
let vortexEvents: VortexEvents;

function main(context: types.IExtensionContext) {
  // event and command stuff
  vortexCommands = new VortexCommands(context.api);
  vortexEvents = new VortexEvents(context.api);

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
    id: GAME_ID,
    name: "Hogwarts Legacy",
    mergeMods: true,
    queryPath: undefined,
    supportedTools: [],
    queryModPath: () => RELATIVE_MODSFOLDER_PATH,
    logo: "gameart.jpg",
    executable: () => EXECUTABLE_FILENAME,
    requiredFiles: [EXECUTABLE_FILENAME],
    setup: undefined,
    environment: {
      SteamAppId: STEAMAPP_ID
    },
    details: {
      SteamAppId: STEAMAPP_ID
    }
  });

  context.once(() => {
    log("debug", "initialising your new extension!");
  });

  vortexEvents.onGameModeActivated.subscribe(() =>
    console.log("onGameModeActivated")
  );

  return true;
}

export default main;
