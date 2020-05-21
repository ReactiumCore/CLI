const fs = require('fs-extra');
const path = require('path');
const op = require('object-path');
const chalk = require('chalk');
const handlebars = require('handlebars').compile;
const homedir = require('os').homedir();

module.exports = spinner => {
    const NOW = Date.now();

    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    const generate = ({ action, params, props, templateFile }) => {
        const { cwd } = props;
        const { destination, command, overwrite } = params;

        const filepath = path.normalize(path.join(destination, templateFile));

        if (fs.existsSync(filepath)) {
            backup({ cwd, filepath });
        }

        const actionType = overwrite === true ? 'overwritting' : 'creating';

        message(
            `${actionType} command ${command} ${chalk.cyan(templateFile)}...`,
        );

        fs.ensureDirSync(path.normalize(destination));

        // Template content
        const template = path.normalize(
            `${__dirname}/template/${templateFile}.hbs`,
        );
        const content = handlebars(fs.readFileSync(template, 'utf-8'))(params);

        return new Promise((resolve, reject) => {
            fs.writeFile(filepath, content, error => {
                if (error) {
                    reject(error.Error);
                } else {
                    resolve({ action, status: 200 });
                }
            });
        });
    };

    const backup = ({ cwd, filepath }) => {
        const destination = path.normalize(
            path.join(
                homedir,
                '.arcli',
                path.basename(cwd),
                '.BACKUP',
                'commands',
                path.basename(path.dirname(filepath)),
            ),
        );

        const newfile = path.normalize(
            path.join(destination, `${NOW}.${path.basename(filepath)}`),
        );

        fs.ensureDirSync(destination);

        fs.copySync(filepath, newfile);
    };

    return {
        index: ({ action, params, props }) =>
            generate({
                action,
                params,
                props,
                templateFile: 'index.js',
            }),

        actions: ({ action, params, props }) =>
            generate({
                action,
                params,
                props,
                templateFile: 'actions.js',
            }),

        generator: ({ action, params, props }) => {
            if (op.get(params, 'generator') !== true) return;
            generate({
                action,
                params,
                props,
                templateFile: 'generator.js',
            });
        },

        templatedir: ({ action, params, props }) => {
            const { destination } = params;

            const templateDirectory = path.join(destination, 'template');

            return new Promise((resolve, reject) => {
                fs.ensureDir(templateDirectory, error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ action, status: 200 });
                    }
                });
            });
        },
    };
};
