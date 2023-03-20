import * as actions from '../actions/luaActions';
import { types, util } from 'vortex-api';

const luaModReducer: types.IReducerSpec = {
    reducers: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [actions.setLuaLoadOrder as any]: 
            (state, payload) => util.setSafe(state, [payload.profileId], payload.loadOrder),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [actions.setLuaModStatus as any]:
            (state, payload) => util.setSafe(state, [payload.profileId, payload.folderName, 'enabled'], payload.enabled)
            // {
            //     const { profileId, folderName, enabled } = payload;
            //     const lo = state[profileId] || [];
            //     const modCurrent = lo.find(m => m.folderName === folderName);
            //     if (!modCurrent) {
            //         lo.push({ folderName, enabled });
            //     }
            //     else modCurrent.enabled = enabled;
            //     return util.setSafe(state, [profileId], lo);
            // }
    },
    defaults: {}
}

export { luaModReducer };