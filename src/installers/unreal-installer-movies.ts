import { fs, types } from 'vortex-api';
import * as path from 'path';
import { 
    GAME_ID, GAME_NAME, MOVIESMOD_PATH, MOVIES_EXTENSION, PAK_EXTENSIONS 
} from '../common';

const UnrealMovieInstaller = {
    test: TestForMoviesMod,
    install: InstallMoviesMod,
}

async function TestForMoviesMod(
  files: string[],
  gameId: string,
): Promise<types.ISupportedResult> {
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

async function InstallMoviesMod(files: string[], context: types.IExtensionContext) {
  // can't type function return type as the return resolve needs to return an inline object

  const state = context.api.getState();
  const discovery = state.settings.gameMode?.discovered[GAME_ID];

  // console.log(discovery);
  if (discovery == undefined || !discovery.path) {
    return Promise.reject("discovery is undefined");
  }

  const gamePath = discovery.path;
  const rootPath = path.join(gamePath, MOVIESMOD_PATH);
//   const paksPath = path.join(gamePath, MODSFOLDER_PATH);
  const moviesPath = path.join(gamePath, MOVIESMOD_PATH, "Movies");

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
  const instructions: types.IInstruction[] = [];

  // adds instruction to set a different mod type
  instructions.push({ type: "setmodtype", value: "unreal-modtype-movies" });

  // loop through and find matching movies to replace
  for (const movieFile of movies) {
    // compare filename of mod file to filename of original file
    const foundFile: string|undefined = foundFiles.find(
      (file) =>
        path.basename(file).toLowerCase() ==
        path.basename(movieFile).toLowerCase(),
    );

    // console.log(
    //   `${GAME_NAME}: InstallMoviesMod() Looking for ${path
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
        `${GAME_NAME}: InstallMoviesMod() ${path
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



export default UnrealMovieInstaller;