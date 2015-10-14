'use strict';

var css = require('css'),
    fs = require('fs'),
    less = require('less'),
    path = require('path'),
    sass = require('node-sass'),
    util = require('util'),
	_ = require('lodash');

var parse = function (file, cb) {
    var input = fs.readFileSync(file, { encoding: 'utf8' });
    switch (path.extname(file)) {
        case '.css':
            cb(null, renderReactWeb(input));
            break;
        case '.less':
            less.render(input, function (err, result) {
                if (err) {
                    cb(err, null);
                } else {
                    cb(null, renderReactWeb(result.css));
                }
            });
            break;
        case '.sass':
        case '.scss':
            sass.render({ data: input }, function (err, result) {
                if (err) {
                    cb(err, null);
                } else {
                    cb(null, renderReactWeb(result.css.toString()));
                }
            });
            break;
        default:
            cb(util.format('Unrecognized file format: %s', file), null);
            break;
    }
};

var renderReactWeb = function (input) {
	var stylesheet = css.parse(input).stylesheet,
		result = _.zipObject(stylesheet.rules.filter(filterRules).map(mapProperties));
    return util.format(
		"module.exports = %s;", JSON.stringify(result, null, 4)
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
	var name = _.camelCase(declaration.property),
		value = declaration.value;
    if (!isNaN(value)) {
        value = parseInt(value);
    }
    return [name, value];
};

module.exports = {
    parse: parse
};