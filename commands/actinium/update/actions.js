const path = require('path');
const fs = require('fs-extra');
const pkg = require('./package');
const semver = require('semver');
const op = require('object-path');
const request = require('request');
const decompress = require('@atomic-reactor/decompress');

module.exports = spinner => {
    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    return {
        download: ({ params, props, action }) => {
            message('downloading payload, this may take awhile...');

            const { config, cwd } = props;

            // Create the tmp directory.
            fs.ensureDirSync(path.normalize(`${cwd}/tmp/update`));

            // Download the most recent version of actinium
            return new Promise((resolve, reject) => {
                request(config.actinium.repo)
                    .pipe(
                        fs.createWriteStream(
                            path.normalize(`${cwd}/tmp/update/actinium.zip`),
                        ),
                    )
                    .on('error', error => reject(error))
                    .on('close', () => resolve({ action, status: 200 }));
            });
        },

        unzip: ({ params, props, action }) => {
            message('unpacking...');

            const { config, cwd } = props;

            const zipFile = path.normalize(`${cwd}/tmp/update/actinium.zip`);
            const updateDir = path.normalize(`${cwd}/tmp/update`);

            // Create the update directory
            fs.ensureDirSync(updateDir);

            return new Promise((resolve, reject) => {
                decompress(zipFile, updateDir, { strip: 1 })
                    .then(() => resolve({ action, status: 200 }))
                    .catch(error => reject(error));
            });
        },

        core: ({ params, props, action }) => {
            message('updating core...');

            const { cwd } = props;

            const coreDir = path.normalize(`${cwd}/.core/`);
            const updateDir = path.normalize(`${cwd}/tmp/update/.core/`);

            fs.ensureDirSync(coreDir);
            fs.emptyDirSync(coreDir);

            return new Promise((resolve, reject) => {
                fs.copy(updateDir, coreDir, error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ action, status: 200 });
                    }
                });
            });
        },

        files: ({ params, props, action }) => {
            // Add/Remove src files
            const { cwd } = props;
            const actinium = require(path.normalize(
                `${cwd}/tmp/update/.core/actinium-config`,
            ));
            const actiniumVersion = op.get(actinium, 'version');
            const add = op.get(actinium, 'update.files.add') || [];
            const remove = op.get(actinium, 'update.files.remove') || [];

            if (add.length > 0 || remove.length > 0) {
                message('updating files...');
            } else {
                return Promise.resolve({ action, status: 200 });
            }

            // Remove files from src
            remove
                .filter(({ version }) =>
                    semver.satisfies(actiniumVersion, version),
                )
                .forEach(({ source }) => {
                    source = path.normalize(`${cwd}/${source}`);
                    if (fs.existsSync(source)) {
                        fs.removeSync(source);
                    }
                });

            // Add files to src
            add.filter(({ version }) =>
                semver.satisfies(actiniumVersion, version),
            ).forEach(({ destination, overwrite, source }) => {
                destination = path.normalize(`${cwd}/${destination}`);
                source = path.normalize(`${cwd}/${source}`);
                if (!fs.existsSync(destination) || overwrite === true) {
                    fs.copySync(source, destination);
                }
            });

            return Promise.resolve({ action, status: 200 });
        },

        package: ({ params, props, action }) => {
            message('updating package.json...');

            const { cwd } = props;
            const newPackage = pkg(props, path.normalize(`${cwd}/tmp/update/`));
            const oldPackage = path.normalize(`${cwd}/package.json`);

            fs.writeFileSync(oldPackage, newPackage);

            return Promise.resolve({ action, status: 200 });
        },

        cleanup: ({ params, props, action }) => {
            message('removing temp files...');

            const { cwd } = props;

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
