import path from "path";
import * as VortexUtils from "./VortexUtils";
import { types, log, actions, fs, selectors } from "vortex-api";

const GAME_ID = "hogwartslegacy";
const MODSFOLDER_PATH = path.join("Phoenix", "Content", "Paks", "~mods");

export async function migrate0_2_11(context: types.IExtensionContext, oldversion: string) {
  log("info", "Migrating to 0.2.11", oldversion);

  const state = context.api.getState();
  const mods = state.persistent.mods[GAME_ID] ?? {};

  if (!Object.keys(mods).length) {
    log("info", "No mods to migrate for Hogwarts Legacy");
    return;
  }

  // Find mods that have PAKs and change the modtype.
  const defaultMods = Object.values(mods).filter((m) => m.type === "");
  if (!defaultMods.length) return;

  // Clean up the ~mods folder.
  try {
    const gamePath = state.settings.gameMode.discovered?.[GAME_ID]?.path;
    if (!gamePath) {
      log("info", "No path save for Hogwarts Legacy, aborting migration");
      return;
    }
    const modsFolder = path.join(gamePath, MODSFOLDER_PATH);
    await context.api.emitAndAwait("purge-mods-in-path", GAME_ID, "", modsFolder);
  } catch (err) {
    log("error", "Failed to clean up ~mods folder for Hogwarts Legacy", err);
  }

  // Reset the load order by deleting the JSON file.
  try {
    const loadorderPath = path.join(VortexUtils.GetUserDataPath(), GAME_ID);
    const loFiles = (await fs.readdirAsync(loadorderPath)).filter((f) => f.endsWith("loadOrder.json"));
    for (const file of loFiles) {
      log("debug", "Removing LO file");
      await fs.unlinkAsync(path.join(loadorderPath, file));
    }
  } catch (err) {
    log("error", "Could not remove load order files", err);
  }

  const stagingPath = selectors.installPathForGame(state, GAME_ID);

  for (const mod of defaultMods) {
    const modFolder = path.join(stagingPath, mod.installationPath);

    try {
      const modFiles = await fs.readdirAsync(modFolder);
      // If no PAKs, skip.
      if (!modFiles.find((f) => path.extname(f) === ".pak")) continue;
      const exceptions = modFiles.find(
        (f) =>
          f.toLowerCase().endsWith(".lua") ||
          f.toLowerCase().endsWith("ue4sslogicmod.info") ||
          f.toLowerCase().endsWith(".ue4sslogicmod") ||
          f.toLowerCase().endsWith(".logicmod")
      );
      // If exception files, skip.
      if (exceptions) continue;

      log("debug", `Changing mod type: ${mod.attributes.name}`);
      const dispatch = context.api.store?.dispatch;
      dispatch(actions.setModType(GAME_ID, mod.id, "hogwarts-PAK-modtype"));
    } catch (err) {
      log("error", `Error checking mod ${mod.id}`, err);
    }
  }
}
