import Actions from './actions.js';
import { AuthValidated } from '../../../lib/auth.js';
import AuthActions from '../../../commands/auth/actions.js';

export default async ({ params, props }) => {
    const { ActionSequence, ora } = arcli;

    const spinner = ora({ spinner: 'dots', color: 'cyan' });

    console.log('');

    spinner.start();

    const authorized = await AuthValidated(params);

    const actions = !authorized
        ? { ...AuthActions(spinner), ...Actions(spinner) }
        : Actions(spinner);

    return ActionSequence({ actions, options: { params, props } })
        .then(() => {
            spinner.stop();
            console.log('');
        })
        .catch(error => {
            spinner.stop();
            console.log(36, error);
            return error;
        });
};
