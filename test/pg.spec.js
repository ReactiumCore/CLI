import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('blah test', () => {
    it('Output current directory and file paths', done => {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(fileURLToPath(import.meta.url));

        console.log('\t', __dirname);
        console.log('\t', __filename);
        done();
    });
});
