import { SignalDispatcher, SimpleEventDispatcher, EventDispatcher } from "strongly-typed-events";
import { IExtensionApi } from "vortex-api/lib/types/api";

/** 
 * A wrapper class to strongly-type vortex events that are normally accessed via api.events.on
 * Events can be subscribed/unsubscribed to via .subscribe and .unsubscribe functions 
 */
export class VortexEvents  {
    
    private _onGameModeActivated = new EventDispatcher<IExtensionApi, string>();
    //private _api:IExtensionApi;
    
    constructor(api: IExtensionApi) {
        const _this = this;
        const _api = api;
        
        // listen for vortex event so we can refire
        api.events.on("gamemode-activated",  async (gameMode: string) => 
            this._onGameModeActivated.dispatch(api, gameMode));
    }

    public get onGameModeActivated() {
        return this._onGameModeActivated.asEvent();
    }
}