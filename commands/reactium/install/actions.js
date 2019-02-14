const fs = require('fs-extra');
const path = require('path');
const op = require('object-path');
const request = require('request');
const decompress = require('decompress');

module.exports = spinner => {
    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    return {
        download: ({ params, props, action }) => {
            const { config, cwd } = props;

            message('downloading payload, this may take awhile...');

            // Create the tmp directory if it doesn't exist.
            fs.ensureDirSync(path.normalize(`${cwd}/tmp`));

            // Download the most recent version of reactium
            return new Promise((resolve, reject) => {
                request(config.reactium.repo)
                    .pipe(
                        fs.createWriteStream(
                            path.normalize(`${cwd}/tmp/reactium.zip`),
                        ),
                    )
                    .on('error', error => reject(error))
                    .on('close', () => resolve({ action, status: 200 }));
            });
        },

        unzip: ({ params, props, action }) => {
            const { config, cwd } = props;

            message('unpacking...');

            const zipFile = path.normalize(`${cwd}/tmp/reactium.zip`);

            return new Promise((resolve, reject) => {
                decompress(zipFile, cwd, { strip: 1 })
                    .then(() => resolve({ action, status: 200 }))
                    .catch(error => reject(error));
            });
        },

        prettier: ({ params, props, action }) => {
            message('updating prettier ignore...');

            const { cwd } = props;
            const prettierFile = path.normalize(`${cwd}/.prettierignore`);
            const cont = fs.readFileSync(prettierFile);

            fs.writeFileSync(prettierFile, `.core\n${cont}`);

            return Promise.resolve({ action, status: 200 });
        },

        cleanup: ({ params, props, action }) => {
            const { config, cwd } = props;

            message('removing temp files...');

            return new Promise((resolve, reject) => {
                fs.remove(path.normalize(`${cwd}/tmp`), error => {
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
