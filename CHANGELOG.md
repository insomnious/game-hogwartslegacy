# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased] - yyyy-mm-dd

To be announced

### Added

### Changed

### Fixed

## [0.3.5] - 2023-05-24

### Changed
- Stop processing Lua mods if the game isn't installed (or the active profile isn't for Hogwarts Legacy)

## [0.3.4] - 2023-03-31

New installers and bug fixes

### Added
- Added an installer for UE4SS Blueprints that need to be installed to LogicMods.
- Added an installer for Lua mods

### Changed
- Made the Lua mods list scrollable.

### Fixed
- Fixed a bug refreshing the Lua mods load order when there is no active profile in Vortex
- Fixed a layout bug for Lua mods with exceedingly long names

## [0.3.3] - 2023-03-28

Bug fix

### Fixed

- Fixed bug where PAK mods weren't correctly being identified

## [0.3.2] - 2023-03-28

Bug fix

### Fixed

- Fixed bug where Lua file change event was being raised with null data 

## [0.3.1] - 2023-03-23

Bug fixes

### Fixed

- Fixes potential file permission error when purging Lua mods.  

## [0.3.0] - 2023-03-22

Expanded support for Lua mods and ability to enable/disable inside of Vortex. Refactored code and some bug fixes.

### Added

- New page to enable/disable Lua mods

### Fixed

- Fixed bug with 'Open Save Folder...' menu action being visible when managing other games. 
- Refactored code and fixed some eslint issues

## [0.2.11] - 2023-03-07

Created new mod type for regular PAK mods and made the default type now more generic to support UE4SS.

### Added

- Created new installer for regular PAK mods

### Changed

- Changed default mod type to be installed to the root game folder instead of the PAK folder. This allows basic support for UE4SS or any other mod that doesn't involve movies or PAKs.

### Fixed

## [0.2.10] - 2023-02-23

Support mods that replace movie files in the `Phoenix/Content/Movies` folder. Also supports mods that contain both movie and pak files in the same archive. Added menu item to open the save game folder.

### Added

- Support for mods that replace the `.bk2` movies like those in picture frames and newspapers. Folder structure of the archive doesn't matter as the files to replace are searched for based on what is in the mod. This allows us not to have to set a strict mod format however it does rely on the files being in the game already to replace, any `bk2` files not found to replace are just ignored. If a mod contains both movie files and `pak`/`utoc`/`ucas` files, this is also supported and works with load ordering.
- Added 'Open Save Game Folder' to the 'Open...' menu on the Mods page. This opens the save game folder normally located at `%AppData%\Local\HogwartsLegacy\Saved\SaveGames`.

### Changed

- Updated metadata to display the extension name correctly within Vortex

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

### Added

### Changed

### Fixed
