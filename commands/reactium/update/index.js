/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */

const path = require('path');
const chalk = require('chalk');
const op = require('object-path');
const inquirer = require('inquirer');
const generator = require('./generator');
const mod = path.dirname(require.main.filename);
const { error, message } = require(`${mod}/lib/messenger`);

const NAME = 'reactium <update>';
const DESC = 'Reactium: Update core.';
const CANCELED = ' Reactium update canceled!';

// prettier-ignore
const HELP = () => console.log(`
Beware:
  Update will overwrite existing ~/.core files and possibly alter the ~/package.json
`);

const CONFIRM = ({ config }) =>
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

const FLAGS = ['core', 'tag', 'overwrite'];

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

    const params = FLAGS_TO_PARAMS({ opt });

    if (!params.overwrite) {
        const { confirm } = await CONFIRM(props.config);

        if (confirm !== true) {
            message(CANCELED);
            return;
        }
    }

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
        .option('-c, --core [core]', 'Update Reactium core only.')
        .option('-o, --overwrite [overwrite]', 'Confirm Reactium update')
        .option('-t, --tag [tag]', 'Update to a specific Reactium version.')
        .on('--help', HELP);

module.exports = {
    COMMAND,
    ID: NAME,
};
