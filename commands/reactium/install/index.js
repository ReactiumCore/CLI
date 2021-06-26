const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const op = require('object-path');
const inquirer = require('inquirer');
const generator = require('./generator');
const mod = path.dirname(require.main.filename);
const { message } = require(`${mod}/lib/messenger`);

const NAME = 'reactium <install>';
const DESC = 'Reactium: Install from master branch.';
const CANCELED = 'Reactium install canceled!';

// prettier-ignore
const HELP = () => console.log(`
Beware:
  Installation will overwrite existing files
`);

const isEmpty = () => fs.readdirSync(process.cwd()).length < 1;

const OVERWRITE = config =>
    inquirer.prompt([
        {
            type: 'confirm',
            prefix: chalk[config.prompt.prefixColor](config.prompt.prefix),
            suffix: chalk.magenta(': '),
            name: 'overwrite',
            default: false,
            message: chalk.cyan(
                'The current directory is not empty.\n           Overwrite?',
            ),
        },
    ]);

const FLAGS = ['tag', 'overwrite', 'empty'];

const FLAGS_TO_PARAMS = ({ opt = {} }) =>
    FLAGS.reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        if (val) {
            obj[key] = val;
        }

        return obj;
    }, {});

const ACTION = async ({ action, opt, props }) => {
    if (action !== 'install') return;

    console.log('');

    const { config, cwd } = props;

    const params = FLAGS_TO_PARAMS({ opt });

    if (params.overwrite !== true && !isEmpty()) {
        const { overwrite } = await OVERWRITE(config);
        if (overwrite !== true) {
            message(CANCELED);
            return;
        }
        params.overwrite = overwrite;
    }

    message(` Installing to:\n\t   ${cwd}`);

    return generator({ params, props })
        .then(() =>
            message(
                `Run: ${chalk.cyan(
                    '$ npm run local',
                )} to launch the development environment`,
            ),
        )
        .catch(err => message(op.get(err, 'message', CANCELED)));
};

/**
 * COMMAND Function
 * @description Function that executes program.command()
 */
const COMMAND = ({ program, props }) => {
    return program
        .command(NAME)
        .description(DESC)
        .action((action, opt) => ACTION({ action, opt, props }))
        .option(
            '-o, --overwrite [overwrite]',
            'Overwrite the current directory.',
        )
        .option('-t, --tag [tag]', 'Install a specific Reactium version.')
        .option(
            '-e, --empty [empty]',
            'Install without demo site and components.',
        )
        .on('--help', HELP);
};

module.exports = {
    COMMAND,
    ID: NAME,
};
