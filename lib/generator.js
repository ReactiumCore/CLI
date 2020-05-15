const ActionSequence = require('action-sequence');

module.exports = ({ arcli, params, props }) => {
    console.log('');

    const { Hook, spinner } = arcli;

    spinner.start();

    const actions = require('./actions')(spinner);

    const onError = error => {
        const { message } = error.message;
        spinner.fail(message);
        return new Error(message);
    };

    return ActionSequence({
        actions,
        options: { arcli, params, props },
    })
        .then(success => {
            const message = 'complete!';
            spinner.succeed(message);
            return success;
        })
        .catch(onError);
};
