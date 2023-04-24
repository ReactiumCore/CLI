import chalk from 'chalk';
import fs from 'fs-extra';
import axios from 'axios';
import _ from 'underscore';
import moment from 'moment';
import semver from 'semver';
import prompt from 'prompt';
import op from 'object-path';
import inquirer from 'inquirer';
import commander from 'commander';
import bootstrap from './bootstrap.js';
import fuzzyPath from 'inquirer-fuzzy-path';
import autoComplete from 'inquirer-autocomplete-prompt';

export default async () => {
    await bootstrap();

    const { createCommand } = commander;

    // Extend inquirer
    inquirer.registerPrompt('fuzzypath', fuzzyPath);
    inquirer.registerPrompt('autocomplete', autoComplete);

    const { props } = arcli;
    const { config, ver } = props;

    props.commands = {};
    props.subcommands = {};

    const cmds = async globs => {
        const commands = props.commands;
        const subcommands = props.subcommands;

        for (let i = 0; i < globs.length; i++) {
            let req;
            const cmd = globs[i];

            try {
                req = await import(cmd);
            } catch (err) {
                console.error(err);
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

                        subcommands[ID] = req;
                    }
                }
            }
        }

        arcli.props.commands = commands;
        arcli.props.subcommands = subcommands;
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
            const isFlag = String(command).substring(0, 1) === '-';

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

    const shortInit = () =>
        new Promise(async (resolve, reject) => {
            const program = createCommand();

            // allow unknown options for short init
            program.allowUnknownOption(true);

            // prevent exit on error
            program.exitOverride();

            // root commands only
            await cmds(arcli.rootCommands());

            // go to long init if help
            const { operands = [], unknown: flags = [] } = program.parseOptions(
                [...process.argv],
            );

            if (
                String(_.last(operands)).endsWith('arcli') &&
                flags.length === 0
            ) {
                reject('help');
                return;
            }

            if (flags.find(flag => flag === '-h' || flag === '--help')) {
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

    const longInit = async () => {
        const program = createCommand();

        // search for commands
        await cmds(arcli.commands());

        // attach all commands to commander
        attachCommands({ program, props, arcli });

        if (!validArguments(program)) process.exit(1);

        // Start the CLI
        program.parse(process.argv);

        // Output the help if nothing is passed
        if (!process.argv.slice(2).length) program.help();
    };

    const initialize = async () => {
        props.args = process.argv.filter(
            item => String(item).substring(0, 1) !== '-',
        );

        // try short init before looking for commands everywhere
        try {
            await shortInit().catch(longInit);
        } catch (err) {}
    };

    const lastCheck = op.get(props.config, 'updated', Date.now());
    const lastUpdateCheck = moment().diff(moment(new Date(lastCheck)), 'days');

    if (lastUpdateCheck > 1) {
        await axios
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
            .then(initialize)
            .catch(console.log);
    } else {
        await initialize();
    }
};
