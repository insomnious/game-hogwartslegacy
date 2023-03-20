import * as React from 'react';
import { Toggle } from 'vortex-api';

interface IProps {
    folderName: string;
    enabled: boolean;
}

function LuaModsLoadOrderEntry(props: IProps) {
    const { folderName, enabled } = props;

    return (
    <div style={{fontSize: 'large'}}>
        <Toggle 
            checked={enabled}
            onToggle={() => null}
        >
            {folderName}
        </Toggle>
    </div>
    );
}

export default LuaModsLoadOrderEntry;