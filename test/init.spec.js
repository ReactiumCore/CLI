import ArcliNode from '../arcli-node.js';

describe('@atomic-reactor/cli', () => {
    it('initialize', done => {
        ArcliNode()
            .then(() => done())
            .catch(err => {
                console.log(1, err);
                done();
            });
    });
});
