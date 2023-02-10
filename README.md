# Vortex Extension for Hogwarts Legacy

This is an extension for [Vortex](https://www.nexusmods.com/about/vortex/) to add support for Hogwarts Legacy. This is available for the PC on [Steam](https://store.steampowered.com/app/990080/Hogwarts_Legacy/) and [Epic](https://store.epicgames.com/en-US/p/hogwarts-legacy).

# Features

- Support for PAK-based mods
- Automatic game detection
<!-- - Installation of archives which include more than one mod.
- Automatic detection of ModBuddy (the XCOM 2 modding toolkit).
  Load order management (including Steam Workshop entires) -->

# Game detection

The Hogwarts Legacy game extension enables Vortex to automatically locate installs from the Steam and Epic apps.

It is also possible to manually set the game folder if the auto detection doesn't find the correct installation. A valid Hogwarts Legacy game folder contains:

- `HogwartsLegacy.exe`
- `/Engine`
- `/Phoenix`

If your game lacks these files/folders then it is likely that your installation has become corrupted somehow.

# Mod Management

Vortex will deploy files to the game's mod folder (`/Phoenix/Content/Paks/~mods`) and extracts all nested files in the archive to this folder, ignoring archive folder structure. Any files that are overwritten are backed up for when the mod is disabled or removed.

<!--Individual mod entries can be enabled/disabled from the load order section.


## Load Order Management

This extension utilises the "File Based Load Order (FBLO)" framework provided by the core Vortex application. A list of `XComMod` installations present in the game folder is generated and each entry can be re-ordered, enabled or disabled.

A list of enabled mods in the load order is automatically written to the `DefaultModOptions.ini` file, which tells the game which mods to load and in what order.

## Steam Workshop detection

The load order section will also detect mods installed from the Steam Workshop and display them in the load order. These entries can be managed like any other, however, the mod files themselves are not managed by Vortex and must be managed by Steam. You can also use the [Import from Steam Workshop](https://www.nexusmods.com/site/mods/114) extension to import these mods into Vortex.-->

# See also

<!--- [Source Code (GitHub)](https://github.com/insomnious/game-halothemasterchiefcollection)-->

- [Mods for Hogwarts Legacy (Nexus Mods)](https://www.nexusmods.com/hogwartslegacy)
- [Download Vortex (Nexus Mods)](https://www.nexusmods.com/about/vortex/)
- [Vortex Knowledge Base (Nexus Mods)](https://wiki.nexusmods.com/index.php/Category:Vortex)
