import * as React from 'react';
import { Checkbox } from 'react-bootstrap';
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
        {/*<Checkbox
            id={folderName}
            key={folderName}
            checked={enabled}
            onChange={() => null}
            disabled={false}
        >
        {folderName}
        </Checkbox>*/}
    </div>
    );
}

export default LuaModsLoadOrderEntry;