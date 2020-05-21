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

    let appDir, apiDir;
    return {
        init: ({ params }) => {
            const name = op.get(params, 'pluginName');
            adminDir = normalize(
                cwd,
                'ADMIN',
                'src',
                'app',
                'components',
                name,
            );
            apiDir = normalize(cwd, 'API');
        },
        directories: ({ params }) => {
            fs.ensureDirSync(adminDir);
            fs.ensureDirSync(normalize(adminDir, 'style'));
            fs.ensureDirSync(normalize(adminDir, 'static', 'assets'));
            fs.ensureDirSync(normalize(adminDir, 'Middleware'));
        },
        actiniumPluginCmd: async() => {
            Spinner.stop();
            console.log('');
            await arcli.runCommand('arcli', ['plugin'], { cwd: apiDir }).catch(() => process.exit());
        },
    };
};
