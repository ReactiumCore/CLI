const ora = require('ora');
const path = require('path');
const mod = path.dirname(require.main.filename);
const ActionSequence = require('action-sequence');

module.exports = ({ params, props }) => {
    const spinner = ora({ spinner: 'dots', color: 'cyan' });

    spinner.start();

    const actions = require('./actions')(spinner);

    return ActionSequence({ actions, options: { params, props } })
        .then(success => console.log(''))
        .catch(error => {
            spinner.fail('error!');
            console.log(error);
            return error;
        });
};
