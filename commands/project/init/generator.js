const op = require('object-path');
const ActionSequence = require('action-sequence');

const { arcli, Hook, Spinner } = global;

module.exports = params => {
    console.log('');

    let actions;

    switch (op.get(params, 'type')) {
        case 'app':
            actions = require('./actions/app');
            break;

        default:
            actions = require('./actions');
    }

    const onError = error => {
        let message = op.get(error, 'message', op.get(error, 'msg', error));
        Hook.runSync('project-init-error', { message, params });
        Spinner.fail(message);
        return new Error(message);
    };

    // Run actions hook
    try {
        Hook.runSync('project-init-actions', { actions, params });
    } catch (error) {
        onError(error);
    }

    return ActionSequence({
        actions: actions(),
        options: { params },
    })
        .then(success => {
            let message = 'project init complete!';

            // Run complete hook
            try {
                Hook.runSync('project-init-complete', {
                    params,
                    message,
                    success,
                });
                Spinner.succeed(message);
            } catch (error) {
                return onError(error);
            }

            return success;
        })
        .catch(onError);
};
