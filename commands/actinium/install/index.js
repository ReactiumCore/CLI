import generator from './generator.js';

const { chalk, fs, op, inquirer } = arcli;

const NAME = 'actinium <install>';
const DESC = 'Actinium: Download and install.';
const CANCELED = ' Actinium install canceled!';

const HELP = () => {
    console.log('');
    console.log('Beware:');
    console.log('');
    console.log('  Installation will overwrite existing files');
    console.log('');
};

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

const FLAGS = ['tag', 'overwrite'];

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

    const { message } = arcli;

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

export const ID = NAME;

export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((action, opt) => ACTION({ action, opt, props }))
        .option(
            '-o, --overwrite [overwrite]',
            'Overwrite the current directory.',
        )
        .option('-t, --tag [tag]', 'Install a specific Actinium version.')
        .on('--help', HELP);
