import { getPreload } from 'utils/preload';

describe('getPreload', function() {

    it('should default to metadata when nothing set', function() {
        const preload = getPreload();

        expect(preload).to.equal('metadata');
    });

    it('should be set when value is valid', function() {
        const preload = getPreload('auto');

        expect(preload).to.equal('auto');
    });

    it('should default to metadata value is invalid', function() {
        const preload = getPreload('aut');

        expect(preload).to.equal('metadata');
    });

    it('should be fallback when invalid', function() {
        const preload = getPreload('aut', 'auto');

        expect(preload).to.equal('auto');
    });

    it('should be auto when set', function() {
        const preload = getPreload('auto', 'none');

        expect(preload).to.equal('auto');
    });

    it('should be none when set', function() {
        const preload = getPreload('none', 'auto');

        expect(preload).to.equal('none');
    });
});
