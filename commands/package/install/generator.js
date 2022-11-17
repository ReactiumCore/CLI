import Actions from './actions.js';
import ActionsUnattended from './actions-unattended.js';

export default async ({ params, props }) => {
    const { ActionSequence, op, ora } = arcli;

    const spinner = ora({ spinner: 'dots', color: 'cyan' });

    spinner.start();

    const actions = op.get(params, 'name')
        ? Actions(spinner)
        : ActionsUnattended(spinner);

    return ActionSequence({ actions, options: { params, props } })
        .then(() => console.log(''))
        .catch(error => {
            spinner.fail('error!');
            console.log(error);
            return error;
        });
};
