#!/usr/bin/env node

'use strict';

// Imports
const chalk = require('chalk');
const fs = require('fs-extra');
const axios = require('axios');
const _ = require('underscore');
const moment = require('moment');
const semver = require('semver');
const prompt = require('prompt');
const op = require('object-path');
const { createCommand } = require('commander');
const inquirer = require('inquirer');
const bootstrap = require('./bootstrap');

// Extend inquirer
inquirer.registerPrompt('fuzzypath', require('inquirer-fuzzy-path'));
inquirer.registerPrompt(
    'autocomplete',
    require('inquirer-autocomplete-prompt'),
);

// Extend arcli props
global.arcli.props.inquirer = inquirer;
global.arcli.props.prompt = prompt;
global.arcli.prefix = chalk.cyan(
    String(arcli.props.config.prompt.prefix).trim(),
);

const { props } = bootstrap;
const { config, ver } = props;

props.commands = {};
props.subcommands = {};

const cmds = globs => {
    const commands = props.commands;
    const subcommands = props.subcommands;

    globs.forEach(cmd => {
        let req;

        try {
            req = require(cmd);
        } catch (err) {
            req = () => {};
        }

        if (op.has(req, 'COMMAND') && typeof req.COMMAND === 'function') {
            if (op.has(req, 'NAME')) {
                commands[req.NAME] = req;
            } else {
                if (op.has(req, 'ID')) {
                    let { ID } = req;
                    ID = String(ID)
                        .replace(/\<|\>/g, '')
                        .replace(/\s/g, '.');
                    op.set(subcommands, ID, req);
                }
            }
        }
    });
};

const attachCommands = ({ program, props, arcli }) => {
    program.storeOptionsAsProperties(false);
    program.passCommandToAction(false);
    program.addHelpCommand(false);

    const commands = props.commands;

    // Apply commands
    Object.values(commands).forEach(req =>
        req.COMMAND({ program, props, arcli }),
    );

    // Configure prompt
    prompt.message = chalk[config.prompt.prefixColor](config.prompt.prefix);
    prompt.delimiter = config.prompt.delimiter;

    // Initialize the CLI
    program.version(ver, '-v, --version');
    program.usage('<command> [options]');
};

const validArguments = program => {
    const commands = props.commands;

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
            return false;
        }
    }

    return true;
};

const shortInit = () => {
    return new Promise((resolve, reject) => {
        const program = createCommand();

        // allow unknown options for short init
        program.allowUnknownOption(true);

        // prevent exit on error
        program.exitOverride();

        // root commands only
        cmds(bootstrap.rootCommands());

        // go to long init if help
        const { operands = [], unknown: flags = [] } = program.parseOptions([
            ...process.argv,
        ]);
        if (
            flags.length === 0 ||
            flags.find(flag => flag === '-h' || flag === '--help')
        ) {
            reject('help');
            return;
        }

        try {
            // attach all root commands
            attachCommands({ program, props, arcli });

            // ignore unknown command for short init
            const [, , commandOperand] = operands;
            // private commander api, may change
            if (commandOperand && !program._findCommand(commandOperand)) {
                reject('unknown command');
                return;
            }

            program.parse(process.argv);
            resolve();
        } catch (error) {
            // ignore commander.version error
            if (error.code === 'commander.version') {
                resolve();
                return;
            }

            reject(error);
        }
    });
};

const longInit = () => {
    const program = createCommand();

    // search for commands
    cmds(bootstrap.commands());

    // attach all commands to commander
    attachCommands({ program, props, arcli });

    if (!validArguments(program)) process.exit(1);

    // Start the CLI
    program.parse(process.argv);

    // Output the help if nothing is passed
    if (!process.argv.slice(2).length) program.help();
};

const initialize = () => {
    props.args = process.argv.filter(item => String(item).substr(0, 1) !== '-');

    // try short init before looking for commands everywhere
    shortInit()
        // do nothing if short init satisfied request
        .then(() => {})

        // short init failed, full long init
        .catch(error => {
            longInit();
        });
};

const lastCheck = op.get(props.config, 'updated', Date.now());
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
                console.log(chalk.cyan('  $ npm i -g @atomic-reactor/cli'));
                console.log('\n');
            }
        })
        .then(() => {
            props.config.checked = Date.now();
            props.config.updated = Date.now();
            const contents = JSON.stringify(props.config, null, 2);
            fs.ensureFileSync(props.localConfigFile);
            fs.writeFileSync(props.localConfigFile, contents);
        })
        .then(() => initialize())
        .catch(err => {
            console.log(err);
        });
} else {
    initialize();
}
