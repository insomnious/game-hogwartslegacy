import { types } from 'vortex-api';
import * as path from 'path';
import { GAME_ID, MOVIESMOD_PATH } from '../common';

const HogwartsMoviesModType = {
    isSupported: (gameId: string) => gameId === GAME_ID,
    getPath: GetMoviesModTypeRootPath,
    test,
    options: { mergeMods: true, name: "Movie Replacer" }
}

function GetMoviesModTypeRootPath(
  context: types.IExtensionContext,
  game: types.IGame,
): string|undefined {
  const state: types.IState = context.api.getState();
  const gamePath: string|undefined = state.settings.gameMode.discovered?.[game.id]?.path;

  //// console.log(`HOGWARTS: GetMovieFolderPath() ${path.join(gamePath, MOVIESFOLDER_PATH)}`);

  if (gamePath != undefined) return path.join(gamePath, MOVIESMOD_PATH);
  else return undefined;
}

async function test(): Promise<boolean> { return false };



export default HogwartsMoviesModType;