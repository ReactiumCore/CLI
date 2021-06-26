const path = require('path');
const chalk = require('chalk');
const op = require('object-path');
const inquirer = require('inquirer');
const generator = require('./generator');
const mod = path.dirname(require.main.filename);
const { message } = require(`${mod}/lib/messenger`);

const NAME = 'actinium <update>';
const DESC = 'Actinium: Update core';
const CANCELED = ' Actinium update cancelled!';

const HELP = () =>
    console.log(`
Example:
  $ arcli update -h
`);

const CONFIRM = config =>
    inquirer.prompt([
        {
            type: 'confirm',
            prefix: chalk[config.prompt.prefixColor](config.prompt.prefix),
            suffix: chalk.magenta(': '),
            name: 'confirm',
            default: false,
            message: chalk.cyan('Are you sure you want to update?'),
        },
    ]);

const FLAGS = ['tag'];

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
    if (action !== 'update') return;

    console.log('');

    const { config, cwd } = props;

    const { confirm } = await CONFIRM(config);

    if (confirm !== true) {
        message(CANCELED);
        return;
    }

    const params = FLAGS_TO_PARAMS({ opt });

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

const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((action, opt) => ACTION({ action, opt, props }))
        .option('-t, --tag [tag]', 'Update to a specific Actinium version.')
        .on('--help', HELP);

module.exports = {
    COMMAND,
    ID: NAME,
};
