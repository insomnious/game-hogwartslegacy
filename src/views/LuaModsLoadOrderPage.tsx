import * as React from 'react';
import { useSelector } from 'react-redux';
import { MainPage, IconBar, ToolbarIcon, FlexLayout, MainContext, types, selectors } from 'vortex-api';
import { Panel } from 'react-bootstrap';
import { refreshLuaMods, openLuaModsFolder } from '../util/luaModsUtil';
import LuaModsLoadOrderInfo from './LuaModsLoadOrderInfo';
import LuaModsLoadOrderPanel from './LuaModsLoadOrderPanel';

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

function LuaModsLoadOrderPage(): JSX.Element {
    const context: types.IExtensionContext = React.useContext(MainContext) as unknown as types.IExtensionContext;
    const profile = useSelector((state: types.IState) => selectors.activeProfile(state));
    const luaMods = useSelector((state: IStateWithLuaLoadOrder) => state.session.lualoadorder?.[profile.id] || {});

    const toolbar = [
        {
            component: ToolbarIcon,
            props: () => {
                return {
                    id: 'btn-refresh-logic-mods',
                    key: 'btn-refresh-logic-mods',
                    icon: 'refresh',
                    text: 'Refresh',
                    onClick: () => refreshLuaMods(context.api),
                    tooltip: 'Reload the list of available Lua Mods'
                }
            }
        },
        {
            component: ToolbarIcon,
            props: () => {
                return {
                    id: 'btn-browse-logic-mods',
                    key: 'btn-browse-logic-mods',
                    icon: 'open-ext',
                    text: 'Open Folder',
                    onClick: () => openLuaModsFolder(context.api),
                    disabled: (Object.keys(luaMods).length === 0),
                    tooltip: 'Open Lua Mods folder'
                }
            }
        }
    ]

    return (
        <MainPage>
            <MainPage.Header>
                <IconBar
                    t={null}
                    group='logic-mods-icons'
                    staticElements={toolbar}
                    className='menubar'
                />
            </MainPage.Header>
            <MainPage.Body>
                <Panel>
                    <Panel.Body>
                        <FlexLayout type='row'>
                            <FlexLayout.Flex>
                                <LuaModsLoadOrderPanel/>
                            </FlexLayout.Flex>
                            <FlexLayout.Flex>
                                <LuaModsLoadOrderInfo/>
                            </FlexLayout.Flex>
                        </FlexLayout>
                    </Panel.Body>
                </Panel>
            </MainPage.Body>
        </MainPage>
    );
};



export default LuaModsLoadOrderPage;