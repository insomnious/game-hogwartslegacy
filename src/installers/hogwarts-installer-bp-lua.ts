import { types } from 'vortex-api';
import * as path from 'path';
import { 
    GAME_ID, IGNORE_CONFLICTS, PAK_EXTENSIONS  
} from '../common';

const LUA_EXT = '.lua';
const LUAInstallPath = path.join('Phoenix','Binaries','Win64','Mods'); // Phoenix\Binaries\Win64\Mods
const BlueprintInstallPath = path.join('Phoenix','Content','PAKS','LogicMods');

const HogwartsBluePrintOrLuaInstaller = {
    test,
    install,
}

async function test(files: string[], gameId: string): Promise<types.ISupportedResult> {
    const hasFiles = (list: string[]): boolean => {
        const validFiles = list.filter(f => 
            // look for LUA files
            path.extname(f) === LUA_EXT || 
            // look for UE4SS qualifiers
            IGNORE_CONFLICTS.includes(f.toLowerCase())
        );
        return !!validFiles.length;
    }

    return {
        supported: gameId === GAME_ID && hasFiles(files),
        requiredFiles: []
    }
}

async function install(files: string[]): Promise<types.IInstallResult> {
    let instructions = [];
    // Remove directories
    const filesCleaned = files.filter(f => !!path.extname(f));
    // Check for Blueprints and map them to the right folder. (PAK/UCAS/UTOC)
    const pakFiles = filesCleaned.filter(f => PAK_EXTENSIONS.includes(path.extname(f).toLowerCase()));
    const pakInstructions = pakFiles.map(p => ({
        type: 'copy',
        source: p,
        destination: path.join(BlueprintInstallPath, path.basename(p))
    }));
    if (pakInstructions.length) instructions = pakInstructions;

    // Check for Lua scripts and map them to the right folder.
    const luaFiles = filesCleaned.filter(f => f.toLowerCase().includes('scripts') && path.extname(path.basename(f)) === LUA_EXT);
    // Get a list of Lua parent folders
    const luaFolders = luaFiles.map(f => {
        const splitPath = f.toLowerCase().split(path.sep);
        const folderIndex: number = splitPath.indexOf('scripts') - 1;
        if (folderIndex !== -1) {
            const folderNameLowercased = splitPath[folderIndex];
            const folderPos = f.toLowerCase().indexOf(folderNameLowercased)
            return f.substring(folderPos, folderPos+folderNameLowercased.length);
        }
    });
    // Ensure we only have one of each.
    const luaFoldersUnique = new Set(luaFolders);

    const luaInstallableFiles = [...luaFoldersUnique].reduce((prev, cur) => {
        const luaModFiles = filesCleaned.filter(f => f.includes(cur)).filter(f => !!path.extname(f));
        const luaInstructions = luaModFiles.map(f => {
            const splitPath = f.split(path.sep);
            const folderIndex = splitPath.indexOf(cur);
            const endOfPath = splitPath.splice(folderIndex + 1, splitPath.length).join(path.sep);            
            return {
                type: 'copy',
                source: f,
                destination: path.join(LUAInstallPath, f, endOfPath)
            }
        });

        prev = [...luaInstructions, ...prev];
        return prev;
    }, []);

    instructions = [...luaInstallableFiles, ...instructions];
    
    // Extract the unused files too, just for completeness
    const unusedInstructions = filesCleaned.filter(f => !instructions.find(i => i.source.toLowerCase() === f.toLowerCase()));
    if (unusedInstructions.length) instructions = [...instructions, ...unusedInstructions.map(i => ({ type: 'copy', source: i, desination: i }))];

    return { instructions };
}

export default HogwartsBluePrintOrLuaInstaller;