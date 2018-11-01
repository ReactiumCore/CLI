
const ora = require('ora');
const ActionSequence = require('action-sequence');


const spinner = ora({
    spinner : 'dots',
    color   : 'cyan'
});

const actions = require('./actions')(spinner);

module.exports = ({ params, props }) => {
    spinner.start();

    return ActionSequence({
        actions,
        options: { params, props }
    }).then((success) => {
        spinner.succeed('Config set complete!');
        return success;
    }).catch((error) => {
        spinner.fail('Config set error!');
        return error;
    });
};
