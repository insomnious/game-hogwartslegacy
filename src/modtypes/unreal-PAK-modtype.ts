import { types, util, selectors } from 'vortex-api';
import * as path from 'path';
import { GAME_ID, MODSFOLDER_PATH } from '../common';
import { IProps } from '../types';

const UnrealPAKModType = {
    isSupported: (gameId: string) => gameId === GAME_ID,
    getPath: GetPakModsPath,
    test: TestForPakModType,
    options: { mergeMods: MergeMods, name: "PAK Mod" }
}

function GetPakModsPath(context: types.IExtensionContext, game: types.IGame): string|undefined {
  const state: types.IState = context.api.getState();
  const gamePath: string|undefined = state.settings.gameMode.discovered?.[game.id]?.path;

  if (gamePath != undefined) return path.join(gamePath, MODSFOLDER_PATH);
  else return undefined;
}

async function TestForPakModType(
  instructions: types.IInstruction[],
): Promise<boolean> {
  const copyInstructions = instructions.filter((i) => i.type === "copy");
  const pakInstallInstructions = copyInstructions.filter(
    (i) => i.source && path.extname(i.source) === ".pak",
  );
  if (!pakInstallInstructions.length) return false;

  // Exclude criteria. Ignore LUA scripts, or logic mods.
  const excludeInstructions: types.IInstruction | undefined = copyInstructions.find(
    (i) =>
      i.source?.toLowerCase().endsWith(".lua") ||
      i.source?.toLowerCase().endsWith("ue4sslogicmod.info") ||
      i.source?.toLowerCase().endsWith(".ue4sslogicmod") ||
      i.source?.toLowerCase().endsWith(".logicmod"),
  );
  // If excludeInstructions found an excludable file, return false otherwise true. 
  return excludeInstructions !== undefined ? false : true;
}

function MergeMods(mod: types.IMod, context: types.IExtensionContext): string {
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
  if (mod.type == "unreal-modtype-movies") {
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

function MakePrefixFromIndex(input: number): string {
  let res = "";
  let rest = input;
  while (rest > 0) {
    res = String.fromCharCode(65 + (rest % 25)) + res;
    rest = Math.floor(rest / 25);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return util.pad(res as any, "A", 3);
}


function GetVortexProperties(
  context: types.IExtensionContext,
  profileId?: string,
): IProps|undefined {
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

export default UnrealPAKModType;