import actions from './actions.js';

const {
    fs,
    Spinner,
    chalk,
    generator,
    message,
    op,
    prefix,
    flagsToParams,
    path,
} = arcli;

export const NAME = 'update';
const CANCELED = 'update canceled!';
const DESC = 'Update Reactium / Actinium in current directory.';

// prettier-ignore
const HELP = () => console.log(`
Example:
  $ arcli update -h
`);

const CONFORM = (input, props) =>
    Object.keys(input).reduce((output, key) => {
        let val = input[key];

        output[key] = val;

        return output;
    }, {});

const INPUT = ({ inquirer }) =>
    inquirer.prompt([
        {
            type: 'input',
            name: 'sample',
            prefix,
            message: 'Sample Input',
            suffix: chalk.magenta(': '),
        },
    ]);

const CONFIRM = ({ inquirer }) =>
    inquirer.prompt([
        {
            default: false,
            type: 'confirm',
            name: 'confirm',
            message: 'Proceed?',
            prefix,
            suffix: chalk.magenta(': '),
        },
    ]);

const DETECT = async ({ props, params }) => {
    const { cwd } = props;

    const reactiumConfigFile = path.normalize(
        `${cwd}/.core/reactium-config.js`,
    );

    const actiniumConfigFile = path.normalize(
        `${cwd}/.core/actinium-config.js`,
    );

    if (fs.existsSync(reactiumConfigFile)) params.type = 'Reactium';
    if (fs.existsSync(actiniumConfigFile)) params.type = 'Actinium';

    if (!params.type) throw new Error('No project found');
};

const ACTION = async ({ opt, props }) => {
    const flags = ['type'];
    let params = flagsToParams({ opt, flags });

    try {
        await DETECT({ props, params });
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    console.log(`Update ${params.type}?`);
    const { confirm } = await CONFIRM(props);
    if (confirm !== true) {
        message(CANCELED);
        return;
    }

    return generator({
        actions: actions(Spinner),
        params,
        props,
    }).catch(err => message(op.get(err, 'message', CANCELED)));
};

export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ opt, props }))
        .on('--help', HELP);

export const ID = NAME;
