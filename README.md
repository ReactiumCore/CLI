
# Atomic Reactor CLI

```
Usage: arcli <command> [options]

Options:
  -v, --version                 Output the version number.
  -h, --help                    Output usage information.

Commands:
  config [options]              ARCLI:    Set ARCLI key:value pairs.
  commander [options]           ARCLI:    Create a CLI function.

  cloud [options]               Actinium: Create a new Parse.Cloud function file.
  actinium [options] <install>  Actinium: Download and install.

  component [options]           Reactium: Create or replace a component.
  reactium <install> [options]  Reactium: Download and install.
  rename [options]              Reactium: Rename a component.
  style [options]               Reactium: Create a style sheet.
  reactium <update> [options]   Reactium: Update core.

  element [options] [action]    Toolkit:  Manage toolkit elements.
                                          Available actions: create | updated | remove.
```


## Commands

### `<config>`
Set or change configuration options.

#### Usage
```
$ arcli config --key 'reactium.repo' --value 'https://github.com/Atomic-Reactor/Reactium/archive/develop.zip'
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
$ arcli config --key 'toolkit.types' --value 'atom molecule organism template link page'
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
    "[root]/commands",               // Resolves to the ~/global/node_modules/ARCLI/commands directory. Used for global commands.
    "[cwd]/.core/.cli/commands",     // Resolves to the ~/project/.core/.cli/commands directory. Used for application core commands.
    "[cwd]/.cli/commands"            // Resolves to the ~/project/.cli/commands directory. Used for project specific commands.
  ],
  "reactium": {
    "repo": "https://github.com/Atomic-Reactor/Reactium/archive/master.zip",
    "types": [
      "functional",
      "class",
      "hook"
    ]
  },
  "actinium": {
    "repo": "https://github.com/Atomic-Reactor/Actinium-2.0/archive/master.zip"
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
$ arcli commander
```
> _You will be prompted for a destination and command name_


#### Flags:
--destination, --command, --overwrite

##### -d, --destination
Path where the command is saved.

If you're creating a project specific command, use the shortcut: `cwd/` when specifying the destination.
> _This is the recommended location for custom commands._
```
$ arcli commander --destination 'cwd/my/function'
```
_The boilerplate code for a new ARCLI function will be created in the `~/.cli/commands/my/function` directory._


If you're creating an application specific command, use the shortcut `app/` when specifying the destination.
> Beware: _Application specific commands are only suggested if you're contributing to the application and want those commands pushed out to future versions. For instance if you want to create a new Reactium or Actinium core command and plan on submitting a pull request for your new feature. Otherwise, they will be overwritten when you update your version of Reactium or Actinium._
```
$ arcli commander -d 'app/my/function'
```
_The boilerplate code for a new ARCLI function will be created in the `~/.core/.cli/commands/my/function` directory._


If you're creating a new ARCLI command, use the shortcut `root/` when specifying the destination.
> Beware: _Root commands are only suggested if you're contributing to ARCLI and plan on submitting a pull request for your new feature. Otherwise, they will be overwritten whenever you update your version of ARCLI._
```
$ arcli commander -d 'root/my/function'
```

##### -c, --command
The command prompt.

```
$ arcli commander --command fubar --destination 'cwd/fubar'
```

You can create a command that accepts parameters as well:
```
$ arcli commander --command 'fubar test'
```
_Creates a command that would be run by entering the following: `arcli fubar test`_


## Reactium Commands

### `<reactium> <install>`
Downloads and installs Reactium into the current working directory. If the directory is not empty, you will be prompted to overwrite it or cancel the operation.

#### Usage
```
$ arcli reactium install
```

> _The config `reactium.repo` url is used when downloading Reactium._

##### -o, --overwrite
Overwrite the current working directory if it's not empty.


### `<reactium> <update>`
Downloads and installs Reactium `.core` and updates to the `package.json` into the current working directory.
The current version of your project will be backed up to the `.BACKUP` directory before update.

#### Usage
```
$ arcli reactium update
```

### `<component>`
Create or replace a Reactium component.

#### Usage
```
$ arcli component
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

##### --redux
Create a Redux Class component.

_`--redux` must be specified for any of the redux includes to apply._

##### --redux-all
Include all Redux related files.

##### --actions
Include Redux `actions.js` file.

##### --actionTypes
Include Redux `actionTypes.js` file.

##### --reducers
Include Redux `reducers.js` file.

##### --services
Include `services.js` file for creating adhoc service calls.

##### --stylesheet
Include `_style.scss` file and import into a parent stylesheet.




### `<rename>`
Rename a Reactium component.

#### Usage
```
$ arcli rename --from 'FooBar' --to 'Fubar' --replace
```

#### Flags:
--from, --to, --directory, --replace

##### -f, --from
Component's current name.

##### -t, --to
Component's new name.

##### -d, --directory
Component's parent directory.

##### -r, --replace
Replace the component name in other files.
Each file is backed up in the `~/.BACKUP` directory.

> _You can use the shortcut `components/`, `common-ui/`, or `cwd/` when specifying the directory._

### `<style>`
Create a Reactium or Toolkit stylesheet.

#### Usage
```
$ arcli style -d 'cwd/public/assets/style' -f 'my-style.scss' -o
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
$ arcli element create

$ arcli element update

$arcli element remove
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


## Actinium Commands


### `<actinium> <install>`
Downloads and installs Actinium into the current working directory. If the directory is not empty, you will be prompted to overwrite it or cancel the operation.

#### Usage
```
$ arcli actinium install
```

#### Flags:
--overwrite

##### -o, --overwrite
Overwrite the current working directory if it's not empty.


### `<cloud>`
Actinium uses The [Parse Platform](https://parseplatform.org/) and this command helps in creating new Parse.Cloud functions.

#### Usage
```
$ arcli cloud
```

#### Flags:
--destination, --collection, --definitions, --beforeFind, --beforeDelete, --beforeSave, --afterSave, --afterDelete, --overwrite

##### --destination
Parent directory of the Cloud Function.
_Actinium looks in the `~/src/app/cloud` directory for .js files and loads them as cloud functions.
_You can use the `cloud/` shortcut when specifying the destination. Example: `$ arcli element --destination 'cloud/my/function` will put the cloud function in the `~/src/app/cloud/my/function` directory._

##### --collection
The database collection for before/after hooks.

```
// Use the Parse.User collection
$ arcli element --collection '_User'
```

##### --definition
Parse.Cloud.define() definitions.
```
$ arcli element --definitions 'userSave userDelete'
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







_Powered by_
![](https://image.ibb.co/ee2WaG/atomic_reactor.png)
