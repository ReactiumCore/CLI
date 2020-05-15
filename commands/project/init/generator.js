const op = require('object-path');
const ActionSequence = require('action-sequence');

module.exports = ({ arcli, params, props }) => {
    console.log('');

    const { Hook, spinner } = arcli;

    const actions = require('./actions')(spinner);

    const onError = error => {
        let message = op.get(error, 'message', error);
        Hook.runSync('project-init-error', {
            arcli,
            message,
            params,
            props,
        });
        spinner.fail(message);
        return new Error(message);
    };

    // Run actions hook
    try {
        Hook.runSync('project-init-actions', { actions, arcli, params, props });
    } catch (error) {
        onError(error);
    }

    return ActionSequence({
        actions,
        options: { arcli, params, props },
    })
        .then(success => {
            let message = 'project init complete!';

            // Run complete hook
            try {
                Hook.runSync('project-init-complete', {
                    arcli,
                    params,
                    props,
                    message,
                    success,
                });
                spinner.succeed(message);
            } catch (error) {
                return onError(error);
            }

            return success;
        })
        .catch(onError);
};
