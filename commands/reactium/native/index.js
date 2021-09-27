const chalk = require('chalk');
const generator = require('./generator');

const NAME = 'reactium <native>';
const CANCELED = 'reactium native canceled!';
const DESC = 'Create a React Native project infused with Reactium Core';

// prettier-ignore
const HELP = () => console.log(`
Example:
  $ arcli reactium native -h
`);

const CONFORM = (input, props) =>
    Object.keys(input).reduce((output, key) => {
        let val = input[key];

        output[key] = val;

        return output;
    }, {});

const INPUT = ({ inquirer }, params) =>
    inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            prefix: arcli.prefix,
            message: 'App name',
            suffix: chalk.magenta(': '),
        },
    ], params);

const CONFIRM = ({ inquirer }) =>
    inquirer.prompt([
        {
            default: false,
            type: 'confirm',
            name: 'confirm',
            message: 'Proceed?',
            prefix: arcli.prefix,
            suffix: chalk.magenta(': '),
        },
    ]);

const ACTION = async ({ opt, props }) => {
    const flags = ['confirm', 'name', 'tag'];

    let params = arcli.flagsToParams({ opt, flags });

    const userInput = await INPUT(props, params);
    Object.entries(userInput).forEach(([key, val]) => (params[key] = val));

    params = CONFORM(params, props);

    arcli.message(
        `Reactium Native project ${chalk.cyan(
            params.name,
        )} will be created in:\n\t  ${chalk.magenta(arcli.props.cwd)}`,
    );

    if (!params.confirm) {
        const { confirm } = await CONFIRM(props);
        params.confirm = confirm;
    }

    if (params.confirm !== true) {
        arcli.message(CANCELED);
        return;
    }

    return generator({ params, props }).catch(err =>
        arcli.message(arcli.op.get(err, 'message', CANCELED)),
    );
};

const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((action, opt) => ACTION({ opt, props }))
        .option('-c, --confirm [confirm]', 'Skip confirmation')
        .option('-n, --name [name]', 'App name.')
        .option('-t, --tag [tag]', 'Specific Reactium Native tag to install.')
        .on('--help', HELP);

module.exports = {
    COMMAND,
    ID: NAME,
};
