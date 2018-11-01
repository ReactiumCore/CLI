const fs       = require('fs-extra');
const path     = require('path');
const op       = require('object-path');
const prettier = require('prettier');


module.exports = (spinner) => {
    const message = (text) => {
        if (spinner) {
            spinner.text = text;
        }
    };

    return {
        backup: ({ props, action }) => {
            const { config, root } = props;

            message('backing up config.json...');

            fs.ensureDirSync(path.join(root, '.BACKUP'));

            const now = Date.now();
            const file = path.normalize(path.join(root, 'config.json'));
            const backup = path.normalize(path.join(
                root, '.BACKUP', `${now}.config.json.BACKUP`
            ));

            return new Promise((resolve, reject) => {
                fs.copy(file, backup, error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ action, status: 200 });
                    }
                });
            });
        },

        update: ({ params, props, action }) => {
            const { root } = props;
            const { newConfig } = params;

            const file = path.normalize(path.join(root, 'config.json'));
            const fileContent = prettier.format(
                JSON.stringify(newConfig),
                {parser: 'json-stringify'}
            );

            message('updating config.json...');

            return new Promise((resolve, reject) => {
                fs.writeFile(file, fileContent, error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ action, status: 200 });
                    }
                });
            });
        }
    };
};
