import * as path from 'path';

export const GAME_ID = 'hogwartslegacy';
export const GAME_NAME = "Hogwarts Legacy";
export const GAME_FOLDER_STEAM = "Hogwarts Legacy";
export const GAME_FOLDER_EPIC = "HogwartsLegacy";
export const EXECUTABLE = "HogwartsLegacy.exe"; // path to executable, relative to game root
export const UEPROJECTNAME = "Phoenix";  // the name of the game project
export const EPIC_ID = "fa4240e57a3c46b39f169041b7811293";
export const STEAM_ID = "990080";

export const UE4SSMODURL = "https://www.nexusmods.com/hogwartslegacy/mods/942";


export const MODSFOLDER_PATH = path.join(UEPROJECTNAME, "Content", "Paks", "~mods"); // relative to game root
export const MOVIESMOD_PATH = path.join(UEPROJECTNAME, "Content"); // relative to game root, can't be /movies as we need to add pak files too sometimes

export const MOVIES_EXTENSION = ".bk2";
export const PAK_EXTENSIONS = [".pak", ".utoc", ".ucas"];
export const IGNORE_CONFLICTS = ["ue4sslogicmod.info", ".ue4sslogicmod", ".logicmod"];
export const IGNORE_DEPLOY = [path.join('**', 'enabled.txt')];
export const STOP_PATTERNS = ["[^/]*\\.pak$"];