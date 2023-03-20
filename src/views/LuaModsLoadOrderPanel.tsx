import * as React from 'react';
import { useSelector } from 'react-redux';
import LogicModsLoadOrderEntry from './LuaModsLoadOrderEntry';
import { types, selectors } from 'vortex-api';

interface IStateWithLuaLoadOrder {
    session: {
        lualoadorder?: {
            [key: string]: {
                [key: string] : {
                    enabled: boolean;
                    index?: number;
                }
            }
        }
    }
}

function LogicModsLoadOrderPanel() {
    const profile = useSelector((state: types.IState) => selectors.activeProfile(state));
    const luaMods = useSelector((state: IStateWithLuaLoadOrder) => state.session.lualoadorder?.[profile.id] || {});
    
    return (
        <div>
            {Object.keys(luaMods).map((folderName: string) => LogicModsLoadOrderEntry({ folderName }))}
        </div>
    );
}

export default LogicModsLoadOrderPanel;