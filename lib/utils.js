/**
 * Extends the target object with properties from another object.
 */
module.exports.extend = function(target, object) {
    var property, src, copy;
    for (property in object) {
        if (target[property] === undefined) {
            copy = object[property];
            if (typeof copy === object) {
                target[property] = extend(target[property] || {}, copy)
            } else if (copy !== undefined) {
                target[property] = copy;
            }
        }
    }
    return target;
}