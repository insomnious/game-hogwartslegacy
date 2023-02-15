# Vortex Extension for Hogwarts Legacy

This is an extension for [Vortex](https://www.nexusmods.com/about/vortex/) to add support for Hogwarts Legacy. This is available for the PC on [Steam](https://store.steampowered.com/app/990080/Hogwarts_Legacy/) and [Epic](https://store.epicgames.com/en-US/p/hogwarts-legacy).

# Features

- Support for PAK-based mods
- Support for load order
- Automatic game detection
<!-- - Installation of archives which include more than one mod.
- Automatic detection of ModBuddy (the XCOM 2 modding toolkit).
  Load order management (including Steam Workshop entires) -->

# Installation

This extension requires Vortex >= 1.7.5. To install, click the Vortex button at the top of the page to open this extension within Vortex, and then click Install.

You can also manually install it by downloading the main file and dragging it into the 'drop zone' labelled Drop File(s) in the Extensions tab at the bottom right.

Afterwards, restart Vortex and you can begin installing supported Hogwarts Legacy mods with Vortex.

# Game detection

The Hogwarts Legacy game extension enables Vortex to automatically locate installs from the Steam and Epic apps.

It is also possible to manually set the game folder if the auto detection doesn't find the correct installation. A valid Hogwarts Legacy game folder contains:

- `HogwartsLegacy.exe`
- `/Engine`
- `/Phoenix`

If your game lacks these files/folders then it is likely that your installation has become corrupted somehow.

# Mod Management

Vortex will deploy files to the game's mod folder (`/Phoenix/Content/Paks/~mods`) and extracts all nested files in the archive to their own individual within this one, ignoring archive folder structure. Each mod folder will be prefixed based on the users load order set within Vortex. Any files that are overwritten are backed up for when the mod is disabled or removed.

# Load Order

The load order of mods can now be set within Vortex to allow greater control over what mods are loaded before other mods. This is important so as multiple mods can change the same thing and so load order can be used to minimize collisions. Mods loaded last will have priority over mods loaded first.

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

# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased] - yyyy-mm-dd

To be announced

### Added

### Changed

### Fixed

## [0.1.2] - 2023-02-16

Bug fixes

### Changed

- Fixed migration bug when it was the first time the extension was installed

## [0.1.1] - 2023-02-15

Load order added so that mods can be rearranged without the need to disable them completely. Migration to this version will happen automatically my purging the `/~mods` folder and redeploying the mods.

### Added

- Load Order has been added for mods.

### Changed

- Mods are now deployed into individual folders inside of the games `/~mods` folder
- Symlink deployment method has been disabled due to visual mods not working 100% of the time when it's used.

## [0.0.1] - 2023-02-09

Initial release for basic mod support
