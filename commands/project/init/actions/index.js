const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const _ = require('underscore');
const op = require('object-path');
const ActionSequence = require('action-sequence');

const { arcli, Hook, Spinner } = global;

const normalize = arcli.normalizePath;

module.exports = () => {
    const cwd = op.get(arcli, 'props.cwd');

    return {
        package: ({ params }) => {
            const pkgPath = normalize(cwd, 'package.json');

            if (fs.existsSync(pkgPath)) return;

            Spinner.message('Creating', chalk.cyan('package.json') + '...');

            const pkg = require(`${arcli.props.root}/commands/project/init/template/package`);

            pkg.name = params.project;

            Hook.runSync('project-package', pkg);

            fs.writeJsonSync(pkgPath, pkg);
        },
        updateConfig: ({ params }) => {
            const { homedir, props } = arcli;
            const configFilePath = normalize(homedir, '.arcli', 'config.json');

            const config = op.get(props, 'config', {});

            const { update } = require(`${props.root}/commands/config/set/actions`)(
                Spinner,
            );

            op.set(config, ['projects', params.project, 'path'], cwd);
            arcli.props.config = config;
            return update({ action: 'update', params: { ...params, newConfig: config }, props });
        },
    };
};
