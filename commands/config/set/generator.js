import ora from 'ora';
import Actions from './actions.js';
import ActionSequence from 'action-sequence';

export default ({ params, props }) => {
    const spinner = ora({
        spinner: 'dots',
        color: 'cyan',
    });

    const actions = Actions(spinner);
    spinner.start();

    return ActionSequence({
        actions,
        options: { params, props },
    })
        .then(success => {
            spinner.succeed('Config set complete!');
            return success;
        })
        .catch(error => {
            spinner.fail('Config set error!');
            console.log(error);
            return error;
        });
};
