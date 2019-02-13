/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */

const chalk = require('chalk');
const generator = require('./generator');
const prettier = require('prettier');
const path = require('path');
const op = require('object-path');
const mod = path.dirname(require.main.filename);
const { error, message } = require(`${mod}/lib/messenger`);

const formatDestination = (val, props) => {
    const { cwd } = props;

    val = path.normalize(val);
    val = String(val).replace(/^~\/|^\/cwd\/|^cwd\/|^cwd$/i, `${cwd}/`);
    return path.normalize(val);
};

const NAME = 'run';

const DESC = 'Run the hub UI and Adapter layer';

const CANCELED = 'Run canceled!';

const HELP = () =>
    console.log(`
Example:
  $ arcli run -a cwd/Adapter -u cwd/UI
`);

const FLAGS = ['adapter', 'ui'];

const FLAGS_TO_PARAMS = ({ opt = {} }) =>
    FLAGS.reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        if (val) {
            obj[key] = val;
        }

        return obj;
    }, {});

const CONFORM = ({ input, props }) => {
    const { cwd } = props;

    let output = {};

    Object.entries(input).forEach(([key, val]) => {
        switch (String(key).toLowerCase()) {
            case 'adapter':
            case 'ui':
                output[key] = formatDestination(val, props);
                break;

            default:
                output[key] = val;
        }
    });

    return output;
};

const SCHEMA = ({ props }) => {
    return {
        properties: {
            adapter: {
                description: chalk.white('Adapter Path:'),
                default: 'cwd/Adapter',
            },
            ui: {
                description: chalk.white('UI Path:'),
                default: 'cwd/UI',
            },
        },
    };
};

const ACTION = ({ opt, props }) => {
    console.log('');

    const { cwd, prompt } = props;
    const schema = SCHEMA({ props });
    const ovr = FLAGS_TO_PARAMS({ opt });

    prompt.override = ovr;
    prompt.start();

    return new Promise((resolve, reject) => {
        prompt.get(schema, (err, input = {}) => {
            if (err) {
                prompt.stop();
                reject(`${NAME} ${err.message}`);
                return;
            }

            input = { ...ovr, ...input };

            const params = CONFORM({ input, props });

            resolve(params);
        });
    })
        .then(params => {
            console.log('');
            return generator({ params, props });
        })
        .then(results => {
            console.log('');
        })
        .catch(err => {
            prompt.stop();
            message(op.get(err, 'message', CANCELED));
        });
};

const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ opt, props }))
        .option('-u, --ui [io]', 'UI Path.')
        .option('-a, --adapter [adapter]', 'Adapter Path.')
        .on('--help', HELP);

module.exports = {
    COMMAND,
    NAME,
};
