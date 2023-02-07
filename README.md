# Vortex Extension for Hogwarts Legacy

This is an extension for [Vortex](https://www.nexusmods.com/about/vortex/) to add support for Hogwarts Legacy. This is available for the PC on [Steam](https://store.steampowered.com/app/976730/Halo_The_Master_Chief_Collection/) and [Epic](https://www.xbox.com/en-GB/games/halo-the-master-chief-collection).

# Features

- Support for managing the new mod format that was introduced during the December 2022 game update.
- Support for older style mods that rely on file replacement.
- Automatic game detection.
<!-- - Installation of archives which include more than one mod.
- Automatic detection of ModBuddy (the XCOM 2 modding toolkit).
  Load order management (including Steam Workshop entires) -->

# Game detection

The Halo: The Master Chief Collection game extension enables Vortex to automatically locate installs from Steam and Xbox apps.

It is also possible to manually set the game folder if the auto detection doesn't find the correct installation. A valid Halo: The Master Chief Collection game folder contains:

- A folder for each game of the collection that is installed i.e. `/halo1`
- `/mcclauncher.exe`
- `/gamelaunchhelper.exe`

If your game lacks these files/folders then it is likely that your installation has become corrupted somehow.

Vortex will only launch the game with it's Easy Anti Cheat (EAC) disabled. This is necessary for new style mods to work. Please be aware that multiplayer isn't supported while the game is running in anti-cheat disabled mode.

# Mod Management

This game extension uses two dedicated installers to identify and unpack mods correctly.

## New style (Official format since December 2022)

If a mod archive contains a `ModInfo.json` file then it will use the new style mod installer and extract to the `/Mods` folder. The extension also adds an entry to the game's `ModManifest.txt` file as per the [official documentation](https://learn.microsoft.com/en-us/halo-master-chief-collection/). If this json file is not found then Vortex will resort to the generic format installer below.

## Generic format

This fallback installer will install files to the game's root folder and does respect the folder structure within the archive file. Any files that are overwritten are backed up for when the mod is disabled or removed. Mod's for this type need to have a folder structure that matches exactly to what they are modding. For instance, if I created a mod to replace the Halo campaign for the first Halo game, then the archive needs to match where this campaign exists in the game folder. In this case, it would be `/halo1/maps/a30.map` that needs replacing and the archive mod that is distributed would match this layout. For example:

```
my halo mod.zip
  |--halo1
      |--maps
          |--a30.map
```

> **Note:** If a halo game can't be identified through it's folder structure, then the mod will unlikely be able to be installed automatically. The user will be notified during install and asked if they'd like to continue anyway or to abort the installation. Solutions to this are either contact the mod author and ask them repackage their mod in a generic way (prefered) or install the contents of the mod manually.

<!--Individual mod entries can be enabled/disabled from the load order section.


## Load Order Management

This extension utilises the "File Based Load Order (FBLO)" framework provided by the core Vortex application. A list of `XComMod` installations present in the game folder is generated and each entry can be re-ordered, enabled or disabled.

A list of enabled mods in the load order is automatically written to the `DefaultModOptions.ini` file, which tells the game which mods to load and in what order.

## Steam Workshop detection

The load order section will also detect mods installed from the Steam Workshop and display them in the load order. These entries can be managed like any other, however, the mod files themselves are not managed by Vortex and must be managed by Steam. You can also use the [Import from Steam Workshop](https://www.nexusmods.com/site/mods/114) extension to import these mods into Vortex.-->

# See also

- [Official Modding Documentation (Microsoft)](https://learn.microsoft.com/en-us/halo-master-chief-collection/)
- [Source Code (GitHub)](https://github.com/insomnious/game-halothemasterchiefcollection)
- [Mods for Halo: The Master Chief Collection (Nexus Mods)](https://www.nexusmods.com/halothemasterchiefcollection)
- [Download Vortex (Nexus Mods)](https://www.nexusmods.com/about/vortex/)
- [Vortex Knowledge Base (Nexus Mods)](https://wiki.nexusmods.com/index.php/Category:Vortex)
