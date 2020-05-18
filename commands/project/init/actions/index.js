const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const _ = require('underscore');
const op = require('object-path');
const ActionSequence = require('action-sequence');

const { arcli, Hook, Spinner } = global;

const normalize = arcli.normalizePath;
const mod = path.dirname(require.main.filename);

module.exports = () => {
    const cwd = op.get(arcli, 'props.cwd');

    return {
        package: ({ params }) => {
            Spinner.message('Creating', chalk.cyan('package.json') + '...');
            Spinner.stop();
            const pkg = require(`${mod}/commands/project/init/template/package`);

            pkg.name = params.project;

            Hook.runSync('project-package', pkg);

            fs.writeJsonSync(normalize(cwd, 'package.json'), pkg);
        },
    };
};
