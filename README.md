

# Atomic Reactor CLI
A CLI for creating Reactium / Actinium projects.


# Installation
```
$ npm install -g reactium
```


# Usage

```
$ reactium <command> [options]

Options:
  -v, --version                 Output the version number.
  -h, --help                    Output usage information.

Commands:
  config [options]              ARCLI:    Set ARCLI key:value pairs.
  commander [options]           ARCLI:    Create a CLI function.

  cloud [options]               Actinium: Create a new Parse.Cloud function file.
  actinium [options] <install>  Actinium: Download and install.

  component [options]           Reactium: Create or replace a component.
  empty                         Reactium: Removes the default demo, styles, toolkit elements, and assets.
  reactium <install> [options]  Reactium: Download and install.
  reactium <update> [options]   Reactium: Update core.
  rename [options]              Reactium: Rename a component.
  style [options]               Reactium: Create a style sheet.

  element [action] [options]    Toolkit:  Manage toolkit elements.
                                          Available actions: create | updated | remove.
  group [action] [options]      Toolkit:  Manage toolkit groups.
                                          Available actions: create | updated | remove.
```


## Commands

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
    "[cwd]/.core/.cli/commands",            // Resolves to the ~/project/.core/.cli/commands directory. Used for application core commands.
    "[cwd]/.cli/commands"                   // Resolves to the ~/project/.cli/commands directory. Used for project specific commands.
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

> Beware: _Application specific commands are only suggested if you're contributing to the application and want those commands pushed out to future versions. For instance if you want to create a new Reactium or Actinium core command and plan on submitting a pull request for your new feature. Otherwise, they will be overwritten when you update your version of Reactium or Actinium._
```
$ reactium commander -d 'app/my/function'
```

_The boilerplate code for a new ARCLI function will be created in the `~/.core/.cli/commands/my/function` directory._


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

### `<reactium> <install>`

Downloads and installs Reactium into the current working directory. If the directory is not empty, you will be prompted to overwrite it or cancel the operation.

#### Usage

```
$ reactium reactium install
```

> _The config `reactium.repo` url is used when downloading Reactium._

##### -o, --overwrite
Overwrite the current working directory if it's not empty.

##### -e, --empty
Install Reactium without the default demo pages, components, and toolkit.


### `<reactium> <update>`
Downloads and installs Reactium `.core` and updates to the `package.json` into the current working directory.
The current version of your project will be backed up to the `.BACKUP` directory before update.

#### Usage
```
$ reactium reactium update
```

### `<empty>`
Removes the default demo, styles, toolkit elements, and assets.

#### Usage

```
$ reactium empty --no-demo
```

##### -D, --no-demo
Keep the default demo site and components.

##### -T, --no-toolkit
Keep the default toolkit elements.

##### -S, --no-style
Do not empty the ~/src/assets/style/style.scss file.

##### -F, --no-font
Do not empty the ~/src/assets/fonts directory.

##### -I, --no-images
Do not empty the ~/src/assets/images directory.



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
$ reactium rename --from 'FooBar' --to 'Fubar' --replace
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


### `<actinium> <install>`
Downloads and installs Actinium into the current working directory. If the directory is not empty, you will be prompted to overwrite it or cancel the operation.

#### Usage
```
$ reactium actinium install
```

#### Flags:
--overwrite

##### -o, --overwrite
Overwrite the current working directory if it's not empty.


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
