import * as React from 'react';
import { logicMods } from '../util/luaModsUtil';
import LogicModsLoadOrderEntry from './LuaModsLoadOrderEntry';

function LogicModsLoadOrderPanel() {
    return (
        <div>
            {logicMods.map(m => LogicModsLoadOrderEntry(m))}
        </div>
    );
}

export default LogicModsLoadOrderPanel;