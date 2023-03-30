import * as React from 'react';
import { useSelector } from 'react-redux';
import LogicModsLoadOrderEntry from './LuaModsLoadOrderEntry';
import { types, selectors, Icon } from 'vortex-api';

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

    if (!Object.keys(luaMods).length) {
        return (
            <div style={{textAlign: 'center'}} className='placeholder'>
                <Icon name='in-progress' className='placeholder-icon'/>
                <div className='placeholder-text'>No Lua Mods installed</div>
            </div>
        )
    }
    
    return (
        <div style={{overflow: 'auto', height: '100%'}}>
            {Object.keys(luaMods).map((folderName: string) => <LogicModsLoadOrderEntry folderName={folderName} />)}
        </div>
    );
}

export default LogicModsLoadOrderPanel;