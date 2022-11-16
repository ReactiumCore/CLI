import ora from 'ora';
import Actions from './actions.js';
import ActionSequence from 'action-sequence';

export default ({ params, props }) => {
    console.log('');
    const spinner = ora({
        spinner: 'dots',
        color: 'cyan',
    });

    spinner.start();

    const actions = Actions(spinner);

    return ActionSequence({
        actions,
        options: { params, props },
    })
        .then(success => {
            spinner.succeed('complete!');
            console.log('');
            return success;
        })
        .catch(error => {
            spinner.fail(`error! ${error.msg}`);
            return error;
        });
};
