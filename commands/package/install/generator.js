import ora from 'ora';
import op from 'object-path';
import ActionSequence from 'action-sequence';

module.exports = async ({ params, props }) => {
    const spinner = ora({ spinner: 'dots', color: 'cyan' });

    spinner.start();

    const name = op.get(params, 'name');

    const Actions = name
        ? await import('./actions.js')
        : await import('./actions-unattended.js');

    const actions = Actions(spinner);

    return ActionSequence({ actions, options: { params, props } })
        .then(() => console.log(''))
        .catch(error => {
            spinner.fail('error!');
            console.log(error);
            return error;
        });
};
