import * as React from 'react';
import { MainPage, IconBar, ToolbarIcon, FlexLayout, MainContext, types } from 'vortex-api';
import { Panel } from 'react-bootstrap';
import { refreshLogicMods } from '../util/luaModsUtil';
import LuaModsLoadOrderInfo from './LuaModsLoadOrderInfo';
import LuaModsLoadOrderPanel from './LuaModsLoadOrderPanel';

// interface IProps {
//     active: boolean;
// }

function LuaModsLoadOrderPage(): JSX.Element {
    const context: types.IExtensionContext = React.useContext(MainContext) as unknown as types.IExtensionContext;

    const toolbar = [
        {
            component: ToolbarIcon,
            props: () => {
                return {
                    id: 'btn-refresh-logic-mods',
                    key: 'btn-refresh-logic-mods',
                    icon: 'refresh',
                    text: 'Refresh',
                    onClick: () => refreshLogicMods(context.api)
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