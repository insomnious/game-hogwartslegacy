import path from 'path';
import { fs, log, util, types } from 'vortex-api';

interface ILuaMod {
    folderName: string;
    enabled: boolean;
}

export let logicMods: ILuaMod[] = util.makeReactive([]);

export class LuaModsMonitor {
    public watcher?: fs.FSWatcher;
    public paused: boolean;
    private API: types.IExtensionApi;
    private updateDebouncer = new util.Debouncer(
        async (eventname: 'change' | 'rename', filename: string) => { this.fileChanged(eventname, filename) }, 
        1000, 
        true
    );

    constructor(api: types.IExtensionApi) {
        this.API = api;
        this.paused = false;
    }

    async start() {
        // Get the logic mods path.
        log('debug', 'Lua mods watcher starting')
        const state = this.API.getState();
        const discoveryPath = state.settings.gameMode.discovered['hogwartslegacy']?.path ?? undefined;
        if (!discoveryPath) throw new Error('Hogwarts Legacy is not discovered!');
        const luaModsPath = path.join(discoveryPath, 'Phoenix', 'Binaries', 'Win64', 'Mods');
        // Check it exists
        try {
            await fs.statAsync(luaModsPath);
            // Set up the watcher
            this.watcher = fs.watch(
                luaModsPath, 
                (eventname: 'change' | 'rename', filename: string) => this.updateDebouncer.schedule(undefined, eventname, filename)
            );
        }
        catch(err) {
            if (err.code === 'ENOENT') log('debug', 'Lua mods folder does not exist yet.');
            else log('warn', 'Could not monitor lua mods folder', err);
        }
    }

    stop() {
        log('debug', 'Lua mods watcher stopping')
        this.watcher?.close()
        this.watcher = undefined;
    }

    pause() {
        this.paused = true;
        log('debug', 'Lua mods watcher paused')
    }

    resume() {
        this.paused = false;
        log('debug', 'Lua mods watcher resumed')
    }

    private async fileChanged(eventname: 'change' | 'rename', filename: string) {
        // Ignore events when we are editing the file.
        console.log('File event', { eventname, filename });
        if (this.paused === true) return;
        if (filename.toLowerCase() !== 'mods.txt') return;
        return refreshLogicMods(this.API);
    }
}

export async function refreshLogicMods(api: types.IExtensionApi) {
    const state = api.getState();
    const gamePath: string | undefined = state.settings.gameMode.discovered['hogwartslegacy']?.path || undefined;
    if (!gamePath) {
        log('error', 'Error getting game path');
        api.showErrorNotification('Could not refresh logic mods', 'Unable to locate Hogwarts Legacy install folder.');
        return;
    }
    const logicModsPath = path.join(gamePath, 'Phoenix', 'Binaries', 'Win64', 'Mods');
    // Get a list of folders.
    let folderList = [];
    try {
        folderList = await getFolders(logicModsPath);
    }
    catch(err) {
        log('error', 'Could not refresh logic mods', err);
    }
    // Parse the Mods.txt file and filter out any missing entries.
    let savedLoadOrder = [];
    try {
        savedLoadOrder = (await parseManifest(path.join(logicModsPath, 'Mods.txt')))
        .filter(entry => !!folderList.find(f => f.toLowerCase() === entry.folderName.toLowerCase()));
    }
    catch(err) {
        log('error', 'Could not get mods.txt data', err);
    }
    // Interate over the folders and map them into load order entries.
    const newLoadOrder: ILuaMod[] = folderList.map(f => {
        const existing = savedLoadOrder.find(e => e.folderName.toLowerCase() === f.toLowerCase());
        if (existing) return existing;
        else return { folderName: f, enabled: true };
    });

    logicMods = newLoadOrder;

    console.log('New load order', newLoadOrder);

    await writeManifest(newLoadOrder, path.join(logicModsPath, 'mods1.txt'))

    return newLoadOrder;
}

async function getFolders(modsPath: string): Promise<string[]> {
    try {
        const allfiles = await fs.readdirAsync(modsPath);
        const folders = allfiles.filter(f => !path.extname(f));
        const validFolders = [];
        for (const folder of folders) {
            try {
                const stats = await fs.statAsync(path.join(modsPath, folder));
                if (folder.toLowerCase() === 'shared') continue;
                if (stats.isDirectory()) validFolders.push(folder);
            }
            catch(err) {
                log('warn', 'Error in directroy check', err);
            }
        }
        return validFolders;
    }
    catch(err) {
        log('error', 'Error getting folder list for logic mods load order', err);
        return[];
    }
}

async function parseManifest(filePath: string): Promise<ILuaMod[]> {
    // Split into an array by new line, remove comments and blank lines
    try {
        const data = await fs.readFileAsync(filePath, { encoding: 'utf8' });
        const entries = data.split('\r\n').filter(l => l !== '' && !l.startsWith(';'));
        const mods = entries.reduce((prev, e) => {
            const text = e.trim()
            const enabledNumber: number | typeof NaN = parseInt(text.slice(-1));
            const folderName = text.substring(0, text.lastIndexOf(':')).trim();
            if (isNaN(enabledNumber)) {
                log('warn', 'Invalid logic mod entry', e);
                return prev;
            };
            prev.push({ folderName, enabled: enabledNumber === 1 ? true : false });
            return prev;        
        }, []);
        return mods;
    }
    catch(err) {
        log('error', 'Could not parse logic mods manifest', err);
        return [];
    }
}

async function writeManifest(loadOrder: ILuaMod[], filePath: string) {
    const loFiltered = loadOrder.filter(l => !['shared', 'keybinds'].includes(l.folderName.toLowerCase()));
    const data = loFiltered.map(e => `${e.folderName} : ${e.enabled ? 1 : 0}`).join('\n');
    const keybindsEnabled = loadOrder.find(l => l.folderName.toLowerCase() === 'keybinds')?.enabled || false;
    const document = `; Lua Mods Load order generated by Vortex\r\n${data}\r\n\r\n; Built-in keybinds, do not move up!\r\nKeybinds : ${keybindsEnabled ? 1 : 0}`;
    try {
        await fs.writeFileAsync(filePath, document);
    }
    catch(err) {
        log('error', 'Unable to write load order file!', err);
    }
}