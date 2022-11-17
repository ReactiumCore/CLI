import generator from './generator.js';

const { chalk, op, inquirer, message } = arcli;

const NAME = 'reactium <empty>';
const CANCELED = ' Reactium empty canceled!';
const DESC = 'Reactium: Remove demo pages, styles, and components.';

const CONFIRM = config =>
    inquirer.prompt([
        {
            type: 'confirm',
            prefix: chalk[config.prompt.prefixColor](config.prompt.prefix),
            suffix: chalk.magenta(': '),
            name: 'confirm',
            default: false,
            message: chalk.cyan(
                'This is a destructive operation.\n           Are you sure?',
            ),
        },
    ]);

const HELP = () => {
    console.log('');
    console.log('Usage:');
    console.log('');
    console.log(' Keep the default toolkit:');
    console.log('  $ arcli reactium empty --no-style');
    console.log('');
    console.log(' Keep the demo site:');
    console.log('  $ arcli reactium empty --no-demo');
    console.log('');
};

const FLAGS = ['confirm', 'demo', 'font', 'images', 'style'];

const FLAGS_TO_PARAMS = ({ opt = {} }) =>
    FLAGS.reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        if (val) {
            obj[key] = val;
        }

        return obj;
    }, {});

const ACTION = async ({ opt, props }) => {
    const { config } = props;

    const params = FLAGS_TO_PARAMS({ opt });

    console.log('');

    if (!params.confirm) {
        const { confirm } = await CONFIRM(config);
        params.confirm = confirm;
    }

    if (!params.confirm) {
        message(CANCELED);
        return;
    }

    return generator({ params, props }).catch(err =>
        message(op.get(err, 'message', CANCELED)),
    );
};

export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((action, opt) => ACTION({ action, opt, props }))
        .option('-D, --no-demo', 'Keep the demo site and components.')
        .option(
            '-S, --no-style',
            'Do not empty the ~/src/assets/style/style.scss file.',
        )
        .option(
            '-F, --no-font',
            'Do not empty the ~/src/assets/fonts directory.',
        )
        .option(
            '-I, --no-images',
            'Do not empty the ~/src/assets/images directory.',
        )
        .option('-y, --confirm', 'Skip confirmation.')
        .on('--help', HELP);

export const ID = NAME;
