#!/usr/bin/env node

'use strict';


/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
const path        = require('path');
const fs          = require('fs-extra');
const _           = require('underscore');
const program     = require('commander');
const pkg         = require('./package.json');
const beautify    = require('js-beautify').js_beautify;

/**
 * -----------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------
 */
const dirname         = __dirname;
const base           = path.resolve(process.cwd());
const config         = require(__dirname + "/config.json");
const params         = Object.assign({}, {...config}, {base: base, package: pkg, dirname: dirname});
const toolkit        = require('./lib/toolkit')(params);
const actinium       = require('./lib/actinium')(params);
const reactium       = require('./lib/reactium')(params);


/**
 * -----------------------------------------------------------------------------
 * Initialize the CLI
 * -----------------------------------------------------------------------------
 */
program.version(pkg.version);


/**
 * -----------------------------------------------------------------------------
 * Global Commands
 * -----------------------------------------------------------------------------
 */
program.command('set <type>')
.description('Set Atomic Reactor CLI configuration key:value pairs')
.option('-k, --key <key>', 'the configuration property to set ['+_.keys(config).join('|')+']')
.option('-v, --value <value>', 'the configuration property value')
.action((type, opt) => {
    config[type][opt.key] = opt.value;

    let cfile = __dirname + '/config.json';
    fs.writeFileSync(cfile, beautify(JSON.stringify(config)));

    log(prefix, 'updated config.json');
    log(fs.readFileSync(cfile, 'utf-8'));
})
.on('--help', () => {
    log('  Examples:');
    log('    $ arcli set actinium --key install --value "https://github.com/camdagr8/jam/archive/master.zip"');
    log('    $ arcli set toolkit --key theme --value "my theme"');
    log('');
});


/**
 * -----------------------------------------------------------------------------
 * Actinium Commands
 * -----------------------------------------------------------------------------
 */
program.command('act:gen <type>')
.description('Generates the specified Actinium module <type>: ' + actinium.types.join(' | '))
.option('-c, --core', '{Boolean} determines if the module is to be created inside the _core application')
.option('-n, --name [name]', '{String} the name of the module')
.option('-p, --path [path]', '{String} the absolute path where to create the module')
.action(actinium.generate)
.on('--help', actinium.help.generate);

program.command('act:list')
.description('Lists installed modules and helpers')
.action(actinium.list)
.on('--help', actinium.help.list);

program.command('act:backup')
.description('Backup MongoDB <db> to directory <path>')
.option('-d, --db <db>', '{String} URI for MongoDB connection')
.option('-p, --path <path>', '{String} the absolute path where to save the backup')
.option('-z, --zip [zip]', '{String} pack collections into a <zip>.tar file')
.option('-t, --type [type]', '{String} the parser type (bson|json)')
.option('-c, --collections [collections]', '{Array} which collections to save')
.action(actinium.backup)
.on('--help', actinium.help.backup);

program.command('act:restore')
.description('Restore MongoDB <db> from directory <path>')
.option('-d, --db <db>', '{String} URI for MongoDB connection')
.option('-p, --path <path>', '{String} the absolute path where to restore from')
.option('-z, --zip [zip]', '{Boolean} unpack collections from a .tar file')
.option('-t, --type [type]', '{String} the parser type (bson|json)')
.option('-collections, --collections [collections]', '{Array} which collections to restore')
.option('-c, --clear [clear]', '{Boolean} drop collections before restore. If (--collections) is specified, only those collections will be dropped')
.action(actinium.restore)
.on('--help', actinium.help.restore);

program.command('act:install')
.description('Install Actinium from repository')
.option('-u, --username [username]', '{String} the admin username')
.option('-p, --password [password]', '{String} the admin password')
.option('-d, --db [database]', '{String} MongoDB connection string')
.option('-o, --overwrite [overwrite]', '{Boolean} clear the install directory')
.option('--port [port]', '{Number} local server port (default: 9090)')
.action(actinium.install)
.on('--help', actinium.help.install);

program.command('act:launch')
.description('Launch Actinium local development environment')
.action(actinium.launch)
.on('--help', actinium.help.launch);

program.command('act:build')
.description('Build Actinium for deployment')
.action(actinium.build)
.on('--help', actinium.help.build);


/**
 * -----------------------------------------------------------------------------
 * Toolkit Commands
 * -----------------------------------------------------------------------------
 */
program.command('kit:install')
.description('Installs Toolkit in the current directory: ' + base)
.option('-o, --overwrite [overwrite]', 'overwrite the install path')
.option('-u, --username [username]', 'basic auth username')
.option('-p, --password [password]', 'basic auth password')
.action(toolkit.install)
.on('--help', toolkit.help.install);

program.command('kit:gen <type>')
.description('Generates the specified toolkit element <type>: ' + toolkit.types.join(' | '))
.option('-n, --name    <name>',  'the name of the element')
.option('-g, --group   [group]', 'the group to add the new element to')
.option('-s, --style   [style]', 'the style sheet to create')
.option('-d, --dna     [dna]',   'the DNA-ID for the new element')
.option('-l, --lib     [lib]',   'the library directory to add the element to')
.action(toolkit.generate)
.on('--help', toolkit.help.generate);

program.command('kit:launch')
.description('Launch Butter and listen for changes')
.option('-p, --port [port]', 'the server port')
.action(toolkit.launch)
.on('--help', toolkit.help.launch);

program.command('kit:build')
.description('Build Butter')
.action(toolkit.build)
.on('--help', toolkit.help.build);

program.command('kit:eject [path]')
.description('Ejects the toolkit ~/dist/assets directory to the specified <path>')
.action(toolkit.eject)
.on('--help', toolkit.help.eject);

program.command('kit:cleanse')
.description('Removes all materials, views, and styles')
.action(toolkit.cleanse)
.on('--help', toolkit.help.cleanse);

program.command('kit:infuse <toolkit>')
.description('Add a UI toolkit to the project')
.option('-t, --theme [theme]', 'theme name to target')
.option('-p, --pkg [pkg]', 'the directory or local .zip file containing the toolkit to infuse')
.option('-u, --url [url]', 'the url containing the toolkit to infuse. Must be a .zip file')
.action(toolkit.infuse)
.on('--help', toolkit.help.infuse);

program.command('kit:defuse <toolkit>')
.option('-r, --remove [remove]', 'delete the toolkit files')
.description('Remove a UI toolkit from the project')
.action(toolkit.defuse)
.on('--help', toolkit.help.defuse);


/**
 * -----------------------------------------------------------------------------
 * Reactium Commands
 * -----------------------------------------------------------------------------
 */
program.command('re:install')
.description('Installs Reactium in the current directory: ' + base)
.option('-o, --overwrite [overwrite]', 'overwrite the install path')
.action(reactium.install)
.on('--help', reactium.help.install);


program.command('re:gen <type>')
.description('Generates a new react component <type>: ' + reactium.types.join(' | '))
.option('-n, --name <name>', 'the name of the component.')
.option('-o, --overwrite [overwrite]', 'overwrite if the component already exists.')
.option('-p, --path [path]', 'absolute path to where the component is created. Default ~/src/app/components.')
.option('-c, --component [component]', 'the parent component when creating a child component.')
.option('-r, --route [route]', 'the route to associate with the component.')
.option('--open [open]', 'open the new file(s) in the default application.')
.option('--no-actions [actions]', 'exclude the actions.js file.')
.option('--no-types [types]', 'exclude the actionsTypes.js file.')
.option('--no-reducers [reducers]', 'exclude the reducers.js file.')
.option('--no-services [services]', 'exclude the services.js file.')
.option('--no-router [router]', 'exclude the route.js file.')
.option('--no-state [state]', 'exclude the state.js file.')
.action(reactium.generate)
.on('--help', reactium.help.generate);


/**
 * -----------------------------------------------------------------------------
 * DO NOT EDIT BELOW THIS LINE
 * -----------------------------------------------------------------------------
 */
program.parse(process.argv);

// output the help if nothing is passed
if (!process.argv.slice(2).length) {
    program.help();
}