import { fs, types, selectors, util } from 'vortex-api';
import * as path from 'path';
import { GAME_ID, GAME_NAME, PAK_EXTENSIONS, MOVIES_EXTENSION } from '../common';

const UnrealMovieMerger = {
    test: TestMerge,
    merge: DoMerge,
    modtype: 'unreal-modtype-movies'
}

function TestMerge(
  context: types.IExtensionContext,
  game: types.IGame,
//   gameDiscovery: types.IDiscoveryResult,
): types.IMergeFilter|undefined {
  if (game.id !== GAME_ID) {
    console.warn(
      `${GAME_NAME}: TestMerge() ${game.id} isn't for this merge function.`,
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
  context: types.IExtensionContext,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadOrder: types.ILoadOrderEntry[] = ((context.api.getState()).persistent as any).loadOrder?.[profile.id] ?? [];

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
      `${GAME_NAME}: DoMerge() ${path.extname(
        filePath,
      )} is an unknown extension and no idea how that slipped through the net.`,
    );
    Promise.reject("Unknown file extension");
  }

  return Promise.resolve();
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

export default UnrealMovieMerger;