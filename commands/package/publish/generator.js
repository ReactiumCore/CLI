const ora = require('ora');
const path = require('path');
const mod = path.dirname(require.main.filename);
const ActionSequence = require('action-sequence');

module.exports = ({ params, props }) => {    
    const spinner = ora({ spinner: 'dots', color: 'cyan' });

    console.log('');

    spinner.start();

    const authActions = require(`${mod}/commands/auth/actions`)(spinner);
    const cmdActions = require('./actions')(spinner);

    const actions = { ...authActions, ...cmdActions };

    return ActionSequence({ actions, options: { params, props } }).catch(
        error => {
            spinner.stop();
            //console.log(JSON.stringify(error));
            console.log(error);
            return error;
        },
    );
};
