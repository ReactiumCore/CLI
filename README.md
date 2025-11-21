

# Atomic Reactor CLI
A CLI for creating Reactium / Actinium projects.


# Installation
```
$ npm install -g reactium
```


# Usage

```
$ reactium <command> [options]

Usage: reactium <command> [options]

Options:
  -v, --version             output the version number
  -h, --help                display help for command

Commands:
  init [options]            Initialize a new Reactium project
  label [options]           Label a directory for use in other commands.
  update                    Update Reactium / Actinium in current directory.
  commander [options]       Create a CLI function.
  config [options]          Set ARCLI key:value pairs.
  install [options] [name]  Install an Actinium or Reactium Plugin.
  list                      List arcli packages.
  publish [options]         Publish an Actinium or Reactium module.
  uninstall <name>          Uninstall an Actinium or Reactium Plugin.
```

## Commands

### Reactium Install

Downloads and installs Reactium into the current working directory. If the directory is not empty, you will be prompted to overwrite it or cancel the operation.

#### Usage

```
$ reactium init
```

> _The config `reactium.repo` url is used when downloading Reactium. The config `actinium.repo` url is used when downloading Reactium._

### `<update>`
Detects if the current directory is a Reactium or Actinium project and updates the framework core dependencies in `package.json`.

**Note**: Modern Reactium projects use the `@atomic-reactor/reactium-core` plugin installed in `reactium_modules/` via workspace dependencies. Some legacy projects may use a `.core` directory structure. The update command handles both architectures appropriately.

The current version of your project will be backed up to the `.BACKUP` directory before update.

#### Usage
```
$ reactium update
```

### `<config>`
Set or change configuration options.

#### Usage
```
$ reactium config --key 'reactium.repo' --value 'https://github.com/Atomic-Reactor/Reactium/archive/develop.zip'
```

_The above would set the Reactium install package to the `develop` branch._


#### Flags:
--key, --value

##### -- key
The config object key.
Use dot notation to access deeper keys in the config object.

##### --value
The config object value.
You can set array values by putting a space between each value.

```
$ reactium config --key 'toolkit.types' --value 'atom molecule organism template link page'
```

###### Default config
```
{
  "prompt": {
    "delimiter": "",
    "prefix": "[ARCLI] > ",
    "prefixColor": "cyan"
  },
  "commands": [
    "[root]/commands",                      // Resolves to the ~/global/node_modules/ARCLI/commands directory. Used for global commands.
    "[cwd]/.core/.cli/commands",            // Resolves to the ~/project/.core/.cli/commands directory. Used for legacy core commands.
    "[cwd]/.cli/commands",                  // Resolves to the ~/project/.cli/commands directory. Used for project specific commands.
    "[cwd]/node_modules/**/.cli/commands"   // Resolves to any .cli/commands directories in the ~/project/node_modules directory.
  ],
  "reactium": {
    "repo": "https://github.com/Atomic-Reactor/Reactium/archive/master.zip",
    "types": [
      "functional",
      "class"
    ]
  },
  "actinium": {
    "repo": "https://github.com/Atomic-Reactor/Actinium-2.0/archive/master.zip"
  },
  "registry": {
    "app": "ReactiumRegistry",
    "server": "https://v1.reactium.io/api"
  },
  "toolkit": {
    "types": [
      "atom",
      "molecule",
      "organism",
      "template",
      "link"
    ]
  }
}
```


### `<commander>`
Create custom ARCLI commands.

#### Usage
```
$ reactium commander
```

> _You will be prompted for a destination and command name_


#### Flags:
--destination, --command, --overwrite

##### -d, --destination
Path where the command is saved.

If you're creating a project specific command, use the shortcut: `cwd/` when specifying the destination.

> _This is the recommended location for custom commands._
```
$ reactium commander --destination 'cwd/my/function'
```

_The boilerplate code for a new ARCLI function will be created in the `~/.cli/commands/my/function` directory._


If you're creating an application specific command, use the shortcut `app/` when specifying the destination.

> Beware: _Application specific commands are only suggested if you're contributing to framework core. In modern Reactium projects, core commands are in the `reactium_modules/@atomic-reactor/reactium-core/.cli/commands/` directory. Legacy projects may use `~/.core/.cli/commands/`. These will be overwritten when you update the framework._
```
$ reactium commander -d 'app/my/function'
```

_The boilerplate code for a new ARCLI function will be created in the appropriate core commands directory for your project structure._


If you're creating a new ARCLI command, use the shortcut `root/` when specifying the destination.

> Beware: _Root commands are only suggested if you're contributing to ARCLI and plan on submitting a pull request for your new feature. Otherwise, they will be overwritten whenever you update your version of ARCLI._

```
$ reactium commander -d 'root/my/function'
```

##### -c, --command
The command prompt.

```
$ reactium commander --command fubar --destination 'cwd/fubar'
```

You can create a command that accepts parameters as well:

```
$ reactium commander --command 'fubar test'
```

_Creates a command that would be run by entering the following: `reactium fubar test`_


## Reactium Commands

### `<component>`
Create or replace a Reactium component.

#### Usage
```
$ reactium component
```

#### Flags:
--name, --destination, --type, --type, --route, --redux, --redux-all, --actions, --actionTypes, --reducers, --services, --stylesheet, --overwrite

##### -n, --name
The component name. Used when importing the component.

##### -d, --destination
Path of the component's parent directory.
If you're creating a component named `Fubar` and specify `components/` as the `--destination`, the component will be saved to:

```
~/project/src/app/components/Fubar
```

##### -t, --type
The type of component to create.
Uses the config `reactium.types` value for the list of types.
Default types: `functional | class`

##### --route
Includes the `route.js` file for a routed component.

##### --stylesheet
Include `_style.scss` file and import into a parent stylesheet.

### `<style>`
Create a Reactium or Toolkit stylesheet.

#### Usage
```
$ reactium style -d 'cwd/public/assets/style' -f 'my-style.scss' -o
```

#### Flags:
--destination, --filename, --overwrite

##### -d, --destination
Path where the stylesheet is saved.

> _You can use the shortcut `components/`, `common-ui/`, or `cwd/` when specifying the destination._

##### -f, --filename
The file name of the stylesheet.

##### -o, --overwrite
Overwrite an existing version of the stylesheet.


## Toolkit Commands


### `<element> <create|update|remove>`
Manage toolkit elements.

#### Usage
```
$ reactium element create

$ reactium element update

$ reactium element remove
```

_If no flags are specified, you will be prompted to input corresponding values._

#### Flags:
--id, --name, --group, --label, --menu-order, --stylesheet, --documentation, --code, --dna

##### --id
The element ID. Used when indexing the element in the toolkit manifest file.

##### --name
The element name. Used when importing the element into other components.

##### --group
The group the element is apart of.
Groups are how the toolkit menu structures elements.

##### --label
The menu link text.

##### --menu-order
The menu link index relative to other elements in the group.

##### --stylesheet
Add a stylesheet for the element.

##### --documentation
Create a readme for the element and display it in the toolkit.

##### --code
Show the Code View for the element.

##### --dna
Show the DNA info for the element.


### `<group> <create|update|remove>`
Manage toolkit groups. Use this command to move things around in the toolkit manifest.

#### Usage

```
$ reactium group create
```

#### Flags:
--id, --menu-order, --label, --overwrite

##### --id
The group id.

##### --menu-order
The toolkit manifest index.

##### --label
The menu item text label.

##### --overwrite
Overwrite the group object,


## Actinium Commands


### Actinium Install
Downloads and installs Actinium into the current working directory. If the directory is not empty, you will be prompted to overwrite it or cancel the operation.

#### Usage
```
$ reactium init -t api
```

### `<cloud>`
Actinium uses The [Parse Platform](https://parseplatform.org/) and this command helps in creating new Parse.Cloud functions.

#### Usage
```
$ reactium cloud
```

#### Flags:
--destination, --collection, --definitions, --beforeFind, --beforeDelete, --beforeSave, --afterSave, --afterDelete, --overwrite

##### --destination
Parent directory of the Cloud Function.

> _Actinium looks in the `~/src/app/cloud` directory for .js files and loads them as cloud functions._
> _You can use the `cloud/` shortcut when specifying the destination. Example: `$ reactium element --destination 'cloud/my/function` will put the cloud function in the `~/src/app/cloud/my/function` directory._

##### --collection
The database collection for before/after hooks.

```
// Use the Parse.User collection
$ reactium element --collection '_User'
```

##### --definition
Parse.Cloud.define() definitions.
```
$ reactium element --definitions 'userSave userDelete'
```

> _Note: you can specify multiple definitions by putting a space between values._

##### --beforeFind
Include Parse.Cloud.beforeFind(COLLECTION) function.

##### --beforeDelete
Include Parse.Cloud.beforeDelete(COLLECTION) function.

##### --beforeSave
Include Parse.Cloud.beforeSave(COLLECTION) function.

##### --afterDelete
Include Parse.Cloud.afterDelete(COLLECTION) function.

##### --afterSave
Include Parse.Cloud.afterSave(COLLECTION) function.


> _See the [Parse Cloud Guide](https://docs.parseplatform.org/cloudcode/guide/) for more information on Cloud functions._


_Masterfully Powered By:_
![](https://image.ibb.co/ee2WaG/atomic_reactor.png)
