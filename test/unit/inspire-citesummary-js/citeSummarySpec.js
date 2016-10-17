'use strict';

describe('Unit: testing dependencies', function() {

    var module;
    var dependencies;
    dependencies = [];

    var hasModule = function(module) {
        return dependencies.indexOf(module) >= 0;
    };

    beforeEach(function() {
        // Get module
        module = angular.module('citeSummary');
        dependencies = module.requires;
    });

    it('should load directives module', function() {
        expect(hasModule('citeSummary.directives')).to.be.ok;
    });

    it('should load services module', function() {
        expect(hasModule('citeSummary.services')).to.be.ok;
    });

});