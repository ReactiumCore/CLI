
/**
 * @function padding(str:String, max:Number, pad:String, side:String|left|right);
 *
 * @description Pad a string with another string, typically a space or 0.
 *
 * @param str {String} The string to pad. Required.
 * @param max {Number} The maximum length of characters. Required.
 * @param pad {String} The string to prepend. Default: ' '.
 * @param side {String|left|right} The side of the string to apply the padding. Default: left.
 * 
 * @return {String} The string with the padding applied if applicable.
 * @example
    padding(1, 2, '0', 'left') === 01
 */
const padding = (str, max, pad = ' ', side = 'left') => {
    let len = String(str).length;
    let diff = max - len;

    if (diff !== 0) {
        str = (side === 'left')
            ? String(pad).repeat(diff) + str
            : str + String(pad).repeat(diff);
    }

    return str;
};

module.exports = padding;
