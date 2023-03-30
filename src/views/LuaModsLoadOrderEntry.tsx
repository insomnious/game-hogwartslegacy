import * as React from 'react';
import { Toggle } from 'vortex-api';
import { useDispatch, useSelector } from 'react-redux';
import { types, selectors } from 'vortex-api';
import { setLuaModStatus } from '../actions/luaActions';

interface IProps {
    folderName: string;
}

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

function LuaModsLoadOrderEntry(props: IProps) {
    const { folderName } = props;
    const profile = useSelector((state: types.IState) => selectors.activeProfile(state));
    const entry = useSelector((state: IStateWithLuaLoadOrder) => state.session.lualoadorder?.[profile.id]?.[folderName]);
    const dispatch = useDispatch();
    const setStatus = (enabled: boolean) => dispatch(setLuaModStatus(profile.id, folderName, enabled));

    return (
    <div style={{fontSize: 'large'}} className='luamod-entry'>
        <Toggle 
            checked={entry.enabled}
            onToggle={(e) => setStatus(e.valueOf())}
        >
            <span title={folderName}>{folderName}</span>
        </Toggle>
    </div>
    );
}

export default LuaModsLoadOrderEntry;