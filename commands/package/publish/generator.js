import Actions from './actions.js';
import AuthActions from '../../../commands/auth/actions.js';

export default ({ params, props }) => {
    const { ActionSequence, ora, path } = arcli;
    const spinner = ora({ spinner: 'dots', color: 'cyan' });

    console.log('');

    spinner.start();

    const authActions = AuthActions(spinner);
    const cmdActions = Actions(spinner);
    const actions = { ...authActions, ...cmdActions };

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
