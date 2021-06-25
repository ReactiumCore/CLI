const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const op = require('object-path');
const request = require('request');
const decompress = require('@atomic-reactor/decompress');

module.exports = spinner => {
    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    const normalize = (...args) => path.normalize(path.join(...args));

    return {
        download: ({ params, props, action }) => {
            const { cwd } = props;
            const { tag } = params;

            message('downloading payload, this may take awhile...');

            // Create the tmp directory if it doesn't exist.
            fs.ensureDirSync(normalize(cwd, 'tmp'));

            // Get the download url
            let URL = String(
                op.get(
                    props,
                    'config.reactium.repo',
                    'https://github.com/Atomic-Reactor/Reactium/archive/master.zip',
                ),
            );
            if (tag && tag !== 'latest' && URL.endsWith('/master.zip')) {
                URL = URL.replace('/master.zip', `/refs/tags/${tag}.zip`);
            }

            // Download
            return new Promise((resolve, reject) => {
                request(URL)
                    .pipe(
                        fs.createWriteStream(
                            normalize(cwd, 'tmp', 'reactium.zip'),
                        ),
                    )
                    .on('error', error => reject(error))
                    .on('close', () => resolve({ action, status: 200 }));
            });
        },

        unzip: ({ params, props, action }) => {
            const { cwd } = props;

            message('unpacking...');

            const zipFile = normalize(cwd, 'tmp', 'reactium.zip');

            return new Promise((resolve, reject) => {
                decompress(zipFile, cwd, { strip: 1 })
                    .then(() => resolve({ action, status: 200 }))
                    .catch(error => reject(error));
            });
        },

        prettier: ({ params, props, action }) => {
            message('updating prettier ignore...');

            const { cwd } = props;
            const prettierFile = normalize(cwd, '.prettierignore');

            const cont = fs.readFileSync(prettierFile);

            fs.writeFileSync(prettierFile, `.core\n${cont}`);

            return Promise.resolve({ action, status: 200 });
        },

        cleanup: ({ params, props, action }) => {
            const { cwd } = props;

            message('removing temp files...');

            return new Promise((resolve, reject) => {
                fs.remove(normalize(cwd, 'tmp'), error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ action, status: 200 });
                    }
                });
            });
        },

        npm: async ({ props }) => {
            if (spinner) spinner.stop();
            console.log('');
            console.log(
                'Installing',
                chalk.cyan('Reactium'),
                'dependencies...',
            );
            console.log('');
            await arcli.runCommand('arcli', ['install']);
        },
    };
};
