const ora = require('ora');
const ActionSequence = require('action-sequence');

module.exports = ({ params, props }) => {
    console.log('');
    const spinner = ora({
        spinner: 'dots',
        color: 'cyan',
    });

    spinner.start();

    let actions;

    try {
        actions = require('./actions')(spinner);
    } catch (err) {
        spinner.stop();
        console.log(err);
        return;
    }

    return ActionSequence({
        actions,
        options: { params, props },
    })
        .then(success => {
            console.log('');
            return success;
        })
        .catch(error => {
            spinner.fail('error!');
            console.error(error);
            return error;
        });
};
