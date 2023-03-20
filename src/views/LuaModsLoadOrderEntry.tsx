import * as React from 'react';
import { Toggle } from 'vortex-api';
import { useDispatch, useSelector } from 'react-redux';
import { types, selectors } from 'vortex-api';
import { setLuaModStatus } from '../actions/luaActions';

interface IProps {
    folderName: string;
    enabled: boolean;
}

function LuaModsLoadOrderEntry(props: IProps) {
    const { folderName, enabled } = props;
    const profile = useSelector((state: types.IState) => selectors.activeProfile(state));
    const dispatch = useDispatch();
    const setStatus = (enabled: boolean) => dispatch(setLuaModStatus(profile.id, folderName, enabled));

    return (
    <div style={{fontSize: 'large'}}>
        <Toggle 
            checked={enabled}
            onToggle={(e) => setStatus(e.valueOf())}
        >
            {folderName}
        </Toggle>
    </div>
    );
}

export default LuaModsLoadOrderEntry;