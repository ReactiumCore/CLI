const ora = require('ora');
const chalk = require('chalk');
const ActionSequence = require('action-sequence');

const spinner = ora({
    spinner: 'dots',
    color: 'cyan',
});

module.exports = ({ params, props }) => {
    spinner.start(`Installing ${chalk.cyan('Reactium')}...`);

    const { empty } = params;

    let { deps, ...actions } = require('./actions')(spinner);

    if (empty) {
        params['demo'] = true;
        params['font'] = true;
        params['images'] = true;
        params['style'] = true;
        params['toolkit'] = true;

        const emptyActions = require('../empty/actions')(spinner);
        actions = { ...actions, ...emptyActions };
    }

    actions = { ...actions, deps };

    return ActionSequence({
        actions,
        options: { params, props },
    })
        .then(success => {
            console.log('');
            spinner.succeed('Reactium install complete!');
            return success;
        })
        .catch(error => {
            console.log('');
            spinner.fail('Reactium install error!');
            console.error(error);
            return error;
        });
};
