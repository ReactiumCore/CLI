const { ActionSequence, ora, path } = arcli;

const mod = path.dirname(require.main.filename);

module.exports = ({ params, props }) => {
    const spinner = ora({ spinner: 'dots', color: 'cyan' });

    console.log('');

    spinner.start();

    const authActions = require(`${mod}/commands/auth/actions`)(spinner);
    const cmdActions = require('./actions')(spinner);

    const actions = { ...authActions, ...cmdActions };

    return ActionSequence({ actions, options: { params, props } })
    .then(() => {
        spinner.stop();
        console.log('');
    }).catch(
        error => {
            spinner.stop();
            //console.log(JSON.stringify(error));
            console.log(36, error);
            return error;
        },
    );
};
