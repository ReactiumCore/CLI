const op = require('object-path');
const ActionSequence = require('action-sequence');

const { arcli, Hook, Spinner } = global;
const { props, normalizePath:normalize } = arcli;

module.exports = params => {
    console.log('');

    let actions = require('./actions')();
    let cwd = op.get(props, 'cwd');

    switch (op.get(params, 'type')) {
        case 'app':
            actions = arcli.mergeActions(actions, require('./actions/app')());

            // Add api actions
            if (op.get(params, 'api') === true) {
                actions = arcli.mergeActions(
                    actions,
                    require('./actions/api')(),
                );
            }

            if (op.get(params, 'admin') === true) {
                actions = arcli.mergeActions(
                    actions,
                    require('./actions/admin')(),
                );
            }
            break;

        case 'api':
            actions = arcli.mergeActions(actions, require('./actions/api')());

            if (op.get(params, 'admin') === true) {
                actions = arcli.mergeActions(
                    actions,
                    require('./actions/admin')(),
                );
            }
            break;

        case 'full-stack':
            actions = arcli.mergeActions(
                actions,
                require('./actions/admin')(),
                require('./actions/app')(),
                require('./actions/api')(),
            );
            break;

        case 'admin-plugin':
            actions = arcli.mergeActions(
                actions,
                require('./actions/admin')(),
                require('./actions/app')(),
                require('./actions/api')(),
                require('./actions/admin-plugin')()
            );
            break;
    }

    const onError = error => {
        Spinner.stop();
        console.log(error);

        let message = op.get(error, 'message', op.get(error, 'msg', error));

        if (message) {
            Hook.runSync('project-init-error', { message, params });
            Spinner.fail(message);
            return new Error(message);
        } else {
            return new Error(error);
        }
    };

    // Run actions hook
    try {
        Hook.runSync('project-init-actions', { actions, params });
    } catch (error) {
        onError(error);
    }

    return ActionSequence({
        actions: actions,
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
