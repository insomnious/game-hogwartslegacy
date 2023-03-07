import path from 'path';
import { types, log, actions } from 'vortex-api';

const GAME_ID = "hogwartslegacy";
const MODSFOLDER_PATH = path.join("Phoenix", "Content", "Paks", "~mods");


export async function migrate0_2_11(context: types.IExtensionContext, oldversion: string) {
    log('info', 'Migrating to 0.2.11');

    const state = context.api.getState();
    const mods = state.persistent.mods[GAME_ID] ?? {};

    if (!!Object.keys(mods)) {
        log('info', 'No mods to migrate for Hogwarts Legacy');
        return;
    }

    // Find mods that have PAKs and change the modtype.
    const defaultMods = Object.values(mods).filter(m => m.type === '');
    if (!defaultMods.length) return;

    // Clean up the ~mods folder.
    try {
        const gamePath = state.settings.gameMode.discovered?.[GAME_ID]?.path;
        if (!gamePath) {
            log('info', 'No path save for Hogwarts Legacy, aborting migration');
            return;
        }
        const modsFolder = path.join(gamePath, MODSFOLDER_PATH);
        await context.api.emitAndAwait('purge-mods-in-path', GAME_ID, '', modsFolder);
    }
    catch(err) {
        log('error', 'Failed to clean up ~mods folder for Hogwarts Legacy', err);
    }

    for (const mod of defaultMods) {
        const dispatch = context.api.store?.dispatch
        dispatch(actions.setModType(GAME_ID, mod.id, 'hogwarts-PAK-modtype'));
    }

}