import * as React from 'react';

function LuaModsLoadOrderInfo() {
    return (
        <div style={{paddingLeft: '8px'}}>
            <h3>Lua Mods</h3>
            <p>This page allows you to enabled and disable Lua script mods which have been installed to the Phoenix\Binaries\Win64\Mods folder.</p>
            <p>Lua mods are used to inject changes into the game without requiring a PAK file. <a href='https://www.nexusmods.com/hogwartslegacy/mods/942'>UE4SS</a> must be installed for these mods to work correctly.</p>
        </div>
    );
}

export default LuaModsLoadOrderInfo;