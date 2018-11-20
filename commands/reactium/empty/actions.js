
const path       = require('path');
const chalk      = require('chalk');
const fs         = require('fs-extra');
const op         = require('object-path');
const handlebars = require('handlebars').compile;


module.exports = (spinner) => {
    const message = (text) => {
        if (spinner) {
            spinner.text = text;
        }
    };

    return {
        empty: ({ action, params, props }) => {
            const { cwd } = props;
            const { toolkit, demo } = params;

            const toolkitPaths = path.normalize(`${cwd}/src/app/toolkit`);

            const demoPaths = [
                path.normalize(`${cwd}/src/app/components/Demo`),
                path.normalize(`${cwd}/src/app/components/common-ui/form`),
                path.normalize(`${cwd}/src/app/components/common-ui/Icon`),
            ];

            if (demo) {
                demoPaths.forEach(p => fs.removeSync(p));
            }


            message(`Emptying ${chalk.cyan('Reactium')}...`);

            return new Promise((resolve, reject) => {

                resolve({ action, status: 200 });
            });
        },
    };
};
