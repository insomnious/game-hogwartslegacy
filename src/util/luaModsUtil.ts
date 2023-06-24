import path from 'path';
import { fs, log, util, types, selectors } from 'vortex-api';
import * as actions from '../actions/luaActions';
import { GAME_ID, GAME_NAME, UEPROJECTNAME } from '../common';

interface ILuaMod {
    folderName: string;
    enabled: boolean;
}

interface ILuaModLoadOrder {
    [key: string]: {
        enabled: boolean;
        index?: number;
    }
}

export class LuaModsMonitor {
    public watcher?: fs.FSWatcher;
    public paused: boolean;
    private API: types.IExtensionApi;
    private updateDebouncer = new util.Debouncer(
        async (eventname: 'change' | 'rename', filename: string) => { this.fileChanged(eventname, filename) }, 
        2000, 
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
        const discoveryPath = state.settings.gameMode.discovered[GAME_ID]?.path ?? undefined;
        if (!discoveryPath) throw new Error(`${GAME_NAME} is not discovered!`);
        const luaModsPath = path.join(discoveryPath, UEPROJECTNAME, 'Binaries', 'Win64', 'Mods');

        // Check it exists
        try {
            await fs.statAsync(luaModsPath);
            // Set up the watcher
            this.watcher = fs.watch(
                luaModsPath,
                (eventname: 'change' | 'rename', filename: string) => this.updateDebouncer.schedule(undefined, eventname, filename)
            );

            // keep an eye out for errors
            this.watcher.on('error', async (error) => {
                
                // if this is permission error, it may well be when we purge
                if(error.message.startsWith('EPERM')) {

                    // check to see if lua mods folder exists, if it doesn't (expected) then just debug it
                    try{                        
                        await fs.statAsync(luaModsPath); 
                        log('error', error.message);
                    } catch {
                        log('debug', error.message);
                    }

                } else {
                    // any other error just catch and log in vortex
                    log('error', error.message);
                }                
            });
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
        if (this.paused === true) return;
        if (filename?.toLowerCase() !== 'mods.txt') return;
        return refreshLuaMods(this.API);
    }
}

export async function openLuaModsFolder(api: types.IExtensionApi) {
    const state = api.getState();
    const gamePath: string | undefined = state.settings.gameMode.discovered[GAME_ID]?.path || undefined;
    if (!gamePath) return api.showErrorNotification('Could not open Lua Mods Folder', `${GAME_NAME} is not properly installed`);
    const luaModsPath = path.join(gamePath, UEPROJECTNAME, 'Binaries', 'Win64', 'Mods');
    try {
        util.opn(luaModsPath);
    }
    catch(err) {
        log('error', 'Could not open Lua Mods Folder', { luaModsPath, err });
    }
}

export async function refreshLuaMods(api: types.IExtensionApi) {
    const state = api.getState();
    const profile: types.IProfile | undefined = selectors.activeProfile(api.getState());
    if (!profile|| profile.gameId !== GAME_ID) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stateLoadOrder = (state.session as any).lualoadorder?.[profile.id] || [];
    const gamePath: string | undefined = state.settings.gameMode.discovered[GAME_ID]?.path || undefined;
    if (!gamePath) {
        log('error', 'Error getting game path');
        api.showErrorNotification('Could not refresh logic mods', `Unable to locate ${GAME_NAME} install folder.`);
        return;
    }
    const luaModsPath = path.join(gamePath, UEPROJECTNAME, 'Binaries', 'Win64', 'Mods');
    // Get a list of folders.
    let folderList = [];
    try {
        folderList = await getFolders(luaModsPath);
    }
    catch(err) {
        log('error', 'Could not refresh logic mods', err);
    }
    // Parse the Mods.txt file and filter out any missing entries.
    let savedLoadOrder = [];
    try {
        savedLoadOrder = (await parseManifest(path.join(luaModsPath, 'Mods.txt')))
        .filter(entry => !!folderList.find(f => f.toLowerCase() === entry.folderName.toLowerCase()));
    }
    catch(err) {
        log('error', 'Could not get mods.txt data', err);
    }
    // Find any new mods
    const newEntries: ILuaMod[] = folderList.filter(f => !savedLoadOrder.find(e => e.folderName.toLowerCase() === f.toLowerCase()))
    .map(m => ({ enabled: true, folderName: m, index: -1 }));
    // Combine and index
    const newLoadOrder = [...savedLoadOrder, ...newEntries].map((entry, index) => ({ ...entry, index }));

    const loadOrderObject: ILuaModLoadOrder = newLoadOrder.reduce((prev, cur, index) => {
        prev[cur.folderName] = { enabled: cur.enabled, index };
        return prev;
    }, {});

    if (hasLoadOrderChanged(stateLoadOrder, loadOrderObject)) {
        api.store.dispatch(actions.setLuaLoadOrder(profile.id, loadOrderObject));
    }
    return newLoadOrder;
}

function hasLoadOrderChanged(oldLo: ILuaModLoadOrder, newLo: ILuaModLoadOrder): boolean {
    const oldString = JSON.stringify(oldLo);
    const newString = JSON.stringify(newLo);
    if (oldString == newString) return false;
    else return true;
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
        const entries = data.split('\n').filter(l => l !== '' && !l.startsWith(';')).map(l => l.trim());
        const mods = entries.reduce((prev, e, index) => {
            const text = e.trim()
            const enabledNumber: number | typeof NaN = parseInt(text.slice(-1));
            const folderName = text.substring(0, text.lastIndexOf(':')).trim();
            if (isNaN(enabledNumber)) {
                log('warn', 'Invalid logic mod entry', e);
                return prev;
            };
            prev.push({ folderName, enabled: enabledNumber === 1 ? true : false, index });
            return prev;        
        }, []);
        return mods;
    }
    catch(err) {
        log('error', 'Could not parse logic mods manifest', err);
        return [];
    }
}

export async function writeManifest(loadOrder: ILuaModLoadOrder, filePath: string) {
    const loFiltered = Object.keys(loadOrder).reduce((prev, cur) => {
        if (!['shared', 'keybinds'].includes(cur.toLowerCase())) {
            prev.push({ folderName: cur, enabled: loadOrder[cur].enabled, index: loadOrder[cur].index ?? 999 })
        }
        return prev;
    }, []).sort((a,b) => a.index >= b.index ? 1 : -1);
    const data = loFiltered.map(e => `${e.folderName} : ${e.enabled ? 1 : 0}`).join('\n');
    const keybindsEnabled = loadOrder[Object.keys(loadOrder).find(k => k.toLowerCase() === 'keybinds')]?.enabled || false;
    const document = `; Lua Mods Load order generated by Vortex\r\n${data}\r\n\r\n; Built-in keybinds, do not move up!\r\nKeybinds : ${keybindsEnabled ? 1 : 0}`;
    try {
        const exists = await fs.statAsync(filePath).then(() => true).catch(() => false);
        if(exists) await fs.writeFileAsync(filePath, document);
    }
    catch(err) {
        log('error', 'Unable to write load order file!', err);
    }
}
