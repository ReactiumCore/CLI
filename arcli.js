#!/usr/bin/env node

'use strict';

// Imports
const config = require(__dirname + '/config.json');
const ver = require('./package').version;
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const program = require('commander');
const prompt = require('prompt');
const globby = require('globby').sync;
const op = require('object-path');
const axios = require('axios');
const moment = require('moment');
const cwd = path.resolve(process.cwd());
const semver = require('semver');
const homedir = require('os').homedir();
const prettier = require('prettier');

// Build the props object
const props = { cwd, root: __dirname, prompt, config };

// Get application config
const appConfigFile = path.normalize(`${cwd}/.core/.cli/config.json`);
if (fs.existsSync(appConfigFile)) {
    const appConfig = require(appConfigFile);
    props.config = Object.assign(props.config, appConfig);
}

// Get local config
const localConfigFile = path.join(homedir, '.arcli', 'config.json');
if (fs.existsSync(localConfigFile)) {
    const localConfig = require(localConfigFile);
    props.config = Object.assign(props.config, localConfig);
} else {
    // Create the localized config if it doesn't exist
    const contents = prettier.format(JSON.stringify(props.config), {
        parser: 'json-stringify',
    });

    fs.ensureFileSync(localConfigFile);
    fs.writeFileSync(localConfigFile, contents);
}

// Get project config
const projConfigFile = path.normalize(`${cwd}/.cli/config.json`);
if (fs.existsSync(projConfigFile)) {
    const projConfig = require(projConfigFile);
    props.config = Object.assign(props.config, projConfig);
}

const lastCheck = op.get(props.config, 'updated', Date.now());

function initialize() {
    console.log('');

    // Configure prompt
    prompt.message = chalk[config.prompt.prefixColor](config.prompt.prefix);
    prompt.delimiter = config.prompt.delimiter;

    // Initialize the CLI
    program.version(ver, '-v, --version');
    program.usage('<command> [options]');

    // Find commands
    const dirs = config.commands || [];
    const globs = dirs.map(dir =>
        // globby only allows posix separators
        path.normalize(String(`${dir}/**/*index.js`)
            .replace(/\[root\]/gi, props.root)
            .replace(/\[cwd\]/gi, props.cwd))
            .split(/[\\\/]/g).join(path.posix.sep)
    );

    /**
     * Since commands is an Object, you can replace pre-defined commands with custom ones.
     * The order in which commands are aggregated:
     * 1. CLI Root : ./commands
     * 2. Core     : ~/PROJECT/.core/.cli/commands -> overwrites CLI Root.
     * 3. Project  : ~/PROJECT/.cli/commands       -> overwrites CLI Root & Core.
     */
    const commands = {};
    const subcommands = {};

    globby(globs).forEach(cmd => {
        const req = require(cmd);
        if (op.has(req, 'COMMAND') && typeof req.COMMAND === 'function') {
            if (op.has(req, 'NAME')) {
                commands[req.NAME] = req;
            } else {
                if (op.has(req, 'ID')) {
                    let { ID } = req;
                    ID = String(ID)
                        .split('<')
                        .join('')
                        .split('>')
                        .join('')
                        .split(' ')
                        .join('.');

                    op.set(subcommands, ID, req);
                }
            }
        }
    });

    props.args = process.argv.filter(item => {
        return String(item).substr(0, 1) !== '-';
    });

    props.commands = commands;
    props.subcommands = subcommands;

    // Apply commands
    Object.values(commands).forEach(req => req.COMMAND({ program, props }));

    // Is valid command?
    if (process.argv.length > 2) {
        const command = process.argv[2];
        const isFlag = String(command).substr(0, 1) === '-';

        if (
            !Object.keys(commands).find(key =>
                new RegExp(`^${command}`).test(key),
            ) &&
            !isFlag
        ) {
            console.log('\n');
            console.log(chalk.red('Invalid command:'), chalk.cyan(command));
            console.log('\n');
            program.help();
            return;
        }
    }

    // Start the CLI
    program.parse(process.argv);

    // Output the help if nothing is passed
    if (!process.argv.slice(2).length) {
        program.help();
    }
}

const lastUpdateCheck = moment().diff(moment(new Date(lastCheck)), 'days');

if (lastUpdateCheck > 1) {
    axios
        .get(
            'https://raw.githubusercontent.com/Atomic-Reactor/CLI/master/package.json',
        )
        .then(result => {
            const { version: currentVersion } = result.data;
            if (semver.lt(ver, currentVersion)) {
                console.log('\n');
                console.log(
                    chalk.red(
                        `Yo... you're using ARCLI version: ${ver}. You should update to ${currentVersion}`,
                    ),
                );
                console.log(chalk.cyan('  $ npm i -g atomic-reactor-cli'));
                console.log('\n');
            }
        })
        .then(() => {
            props.config.checked = Date.now();
            props.config.updated = Date.now();
            const contents = prettier.format(JSON.stringify(props.config), {
                parser: 'json-stringify',
            });

            fs.ensureFileSync(localConfigFile);
            fs.writeFileSync(localConfigFile, contents);
        })
        .then(() => initialize())
        .catch(err => {
            console.log(err);
        });
} else {
    initialize();
}
