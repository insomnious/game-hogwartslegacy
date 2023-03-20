import * as React from 'react';
import { useSelector } from 'react-redux';
import LogicModsLoadOrderEntry from './LuaModsLoadOrderEntry';
import { types, selectors } from 'vortex-api';

interface IStateWithLuaLoadOrder {
    session: {
        lualoadorder?: {
            [key: string]: {folderName: string, enabled: boolean}[]
        }
    }
}

function LogicModsLoadOrderPanel() {
    const profile = useSelector((state: types.IState) => selectors.activeProfile(state));
    const logicMods = useSelector((state: IStateWithLuaLoadOrder) => state.session.lualoadorder?.[profile.id] || []);
    
    return (
        <div>
            {logicMods.map(LogicModsLoadOrderEntry)}
        </div>
    );
}

export default LogicModsLoadOrderPanel;