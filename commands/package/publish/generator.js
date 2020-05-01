const ora = require('ora');

const path = require('path');
const mod = path.dirname(require.main.filename);
const ActionSequence = require('action-sequence');
const auth = require(`${mod}/lib/auth`);

module.exports = ({ params, props }) => {
    const spinner = ora({
        spinner: 'dots',
        color: 'cyan',
    });

    spinner.start();

    const authActions = require(`${mod}/commands/auth/actions`);
    const packageActions = require('./actions')(spinner);

    const actions = {
        ...authActions,
        ...packageActions,
    };

    return ActionSequence({ actions, options: { params, props } })
        .then(success => {
            console.log('');
            return success;
        })
        .catch(error => {
            spinner.fail('error!');
            console.log(error);
            return error;
        });
};
