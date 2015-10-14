'use strict';

var css = require('css'),
    fs = require('fs'),
    less = require('less'),
    path = require('path'),
	properties = require('./lib/properties'),
    sass = require('node-sass'),
    util = require('util'),
	_ = require('lodash');

var parse = function (file, cb) {
    var input = fs.readFileSync(file, { encoding: 'utf8' });
    switch (path.extname(file)) {
        case '.css':
            cb(null, renderReactNative(input));
            break;
        case '.less':
            less.render(input, function (err, result) {
                if (err) {
                    cb(err, null);
                } else {
                    cb(null, renderReactNative(result.css));
                }
            });
            break;
        case '.sass':
        case '.scss':
            sass.render({ data: input }, function (err, result) {
                if (err) {
                    cb(err, null);
                } else {
                    cb(null, renderReactNative(result.css.toString()));
                }
            });
            break;
        default:
            cb(util.format('Unrecognized file format: %s', file), null);
            break;
    }
};

var renderReactNative = function (input) {
	var stylesheet = css.parse(input).stylesheet,
		result = _.zipObject(stylesheet.rules.filter(filterRules).map(mapProperties));
    return util.format(
		"module.exports = require('react-native').StyleSheet.create(%s);", JSON.stringify(result, null, 4)
	);
};

var filterRules = function (rule) {
	return rule.type === 'rule';
};

var mapProperties = function (rule) {
	var selector = rule.selectors.join(' ').replace(/\.|#/g, ''),
		properties = _.zipObject(rule.declarations.map(parseDeclaration));
	return [selector, properties];
};

var parseDeclaration = function (declaration) {
    // TODO: object types
    // TODO: multiple values for margin, padding (2 3 -> 2 2 3 3)
    // TODO: special treatment for shadowOffset, transform
	var name = _.camelCase(declaration.property),
		value = declaration.value,
		propType = properties[name];
	if (_.isUndefined(propType)) {
        // unknown
        console.error(util.format('Unknown property "%s"', name));
		value = undefined;
	} else if (_.isEqual(propType, 'number')) {
        // number
        var match = value.match(/^(\d+)/);
        if (_.isNull(match)) {
            console.error(util.format('Invalid value "%s" for integer property "%s"', value, name));
            value = undefined;
        } else {
            value = parseInt(match[1]);
        }
	} else if (_.isEqual(propType, 'string')) {
        // string
		value = value;
	} else if (_.isArray(propType)) {
        // enum
        if (_.includes(propType, value)) {
            value = value;
        } else {
            console.error(util.format('Invalid value "%s" for enum property "%s".  Valid values are [%s]', value, name, propType));
            value = undefined;
        }
	} else if (_.isObject(propType)) {
        // object
        value = value;
	} else {
        // unrecognized propType.  we should never get here...
        console.error(util.format('Unknown type "%s" for property "%s"', propType, name));
		value = undefined;
	}
	return [name, value];
};

module.exports = {
    parse: parse
};