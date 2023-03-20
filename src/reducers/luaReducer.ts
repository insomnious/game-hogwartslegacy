import * as actions from '../actions/luaActions';
import { types } from 'vortex-api';

const luaModReducer: types.IReducerSpec = {
    reducers: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [actions.setLuaLoadOrder as any]: 
            (state, payload) => state[payload.profileId] = payload.loadOrder,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [actions.setLuaModStatus as any]:
            (state, payload) => {
                const { profileId, folderName, enabled } = payload;
                const current = state[profileId] || [];
                const modCurrent = current.find(m => m.folderName === folderName);
                if (!modCurrent) {
                    current.push({ folderName, enabled });
                }
                else modCurrent.enabled = enabled;
            }
    },
    defaults: {}
}

export { luaModReducer };