# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased] - yyyy-mm-dd

To be announced

### Added

### Changed

### Fixed

## [0.2.0] - 2023-02-21

Supporting mods that replace movie files in the `Phoenix/Content/Movies` folder. Setting load order is currently only enabled for regular `.pak` file mods.

### Added

- Support for mods that replace the `.bk2` movies like those in picture frames and newspapers. Folder structure of the archive doesn't matter as the files to replace are searched for based on what is in the mod. This allows us not to have to set a strict mod format however it does rely on the files being in the game already to replace, any `bk2` files not found to replace are just ignored.

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
