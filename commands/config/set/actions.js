const path = require('path');
const fs = require('fs-extra');
const op = require('object-path');
const prettier = require('prettier');
const homedir = require('os').homedir();

module.exports = spinner => {
    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    return {
        backup: ({ props, action }) => {
            const { config, cwd, root } = props;

            message('backing up config.json...');

            const backupPath = path.normalize(path.join(homedir, '.arcli', path.basename(cwd), '.BACKUP'));

            fs.ensureDirSync(backupPath);

            const now = Date.now();
            const file = path.normalize(path.join(homedir, '.arcli', 'config.json'));
            const backup = path.normalize(
                path.join(backupPath, `${now}.config.json.BACKUP`),
            );

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
            const { newConfig } = params;

            const file = path.normalize(path.join(homedir, '.arcli', 'config.json'));
            const fileContent = prettier.format(JSON.stringify(newConfig), {
                parser: 'json-stringify',
            });

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
        },
    };
};
