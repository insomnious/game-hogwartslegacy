import { createAction } from 'redux-act';

interface ILuaMod {
    folderName: string;
    enabled: boolean;
}

export const setLuaLoadOrder = createAction('SET_LUA_LOADORDER',
    (profileId: string, loadOrder: ILuaMod[]) => ({ profileId, loadOrder }));

export const setLuaModStatus = createAction('SET_LUA_MOD_STATUS',
    (profileId: string, folderName: string, enabled: boolean) => ({ profileId, folderName, enabled }));
