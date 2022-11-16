import fs from 'fs-extra';
import chalk from 'chalk';
import hb from 'handlebars';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export default spinner => {
    const message = text => {
        if (!spinner) return;
        spinner.text = text;
    };

    const generate = ({ params, templateFile }) => {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));

        // prettier-ignore
        const actionType = params.overwrite === true ? 'overwritting' : 'creating';

        // prettier-ignore
        message(`${actionType} ${params.command} command ${chalk.cyan(templateFile)}...`);

        // Template content
        // prettier-ignore
        const template = arcli.normalizePath(__dirname, 'template', `${templateFile}.hbs`);
        const content = hb.compile(fs.readFileSync(template, 'utf-8'))(params);
        const filepath = arcli.normalizePath(params.destination, templateFile);

        fs.writeFileSync(filepath, content);
    };

    return {
        destdir: ({ params }) =>
            fs.ensureDirSync(arcli.normalizePath(params.destination)),

        templatedir: ({ params }) =>
            fs.ensureDirSync(
                arcli.normalizePath(params.destination, 'template'),
            ),

        index: ({ params, props }) =>
            generate({ params, templateFile: 'index.js' }),

        actions: ({ params, props }) =>
            generate({ params, templateFile: 'actions.js' }),

        generator: ({ params, props }) =>
            generate({ params, templateFile: 'generator.js' }),
    };
};
