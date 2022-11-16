import ora from 'ora';
import Actions from './actions.js';
import ActionSequence from 'action-sequence';

const spinner = ora({
    spinner: 'dots',
    color: 'cyan',
});

const actions = Actions(spinner);

export default ({ params, props }) => {
    spinner.start('Actinium installing...');

    return ActionSequence({
        actions,
        options: { params, props },
    })
        .then(success => {
            spinner.succeed('Actinium install complete!');
            return success;
        })
        .catch(error => {
            spinner.fail('Actinium install error!');
            return error;
        });
};
