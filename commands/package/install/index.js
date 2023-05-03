/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */

import GENERATOR from './generator.js';

const { message, op } = arcli;

export const NAME = 'install [name]';
const DESC = 'Install an Actinium or Reactium Plugin.';
const CANCELED = 'Action canceled!';

const HELP = () =>
    console.log(`
Example:
  $ arcli install @atomic-reactor/admin

For devops purposes you can call:
  $ arcli install

This will install any previously installed plugins registered in the package.json > reactiumDependencies and package.json actiniumDependencies
`);

const ACTION = ({ name, opt, props }) => {
    if (name) {
        let [app, tag] = name.split('@');

        if (app === 'actinium' || app === 'reactium') {
            tag = tag || 'latest';
            return arcli.runCommand('arcli', [app, 'install', '-t', tag, '-e']);
        }
    }

    const ovr = FLAGS_TO_PARAMS({ opt });

    const params = { ...ovr, name };

    return GENERATOR({ params, props })
        .then(() => process.exit())
        .catch(err =>
            message(op.get(err, 'message', op.get(err, 'msg', CANCELED))),
        );
};

const FLAGS = [];

const FLAGS_TO_PARAMS = ({ opt = {} }) =>
    FLAGS.reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        if (val) {
            obj[key] = val;
        }

        return obj;
    }, {});

export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((name, opt) => ACTION({ name, opt, props }))
        .on('--help', HELP);
