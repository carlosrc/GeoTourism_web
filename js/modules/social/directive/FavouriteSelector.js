'use strict';

define([
    '../module'
], function (module) {
    module.directive('favouriteSelector', ['ValidationService', function(ValidationService){
        return {
            restrict: 'E',
            templateUrl: 'partials/social/favouriteSelector.html',
            link: function(scope) {
                scope.people = [
                    {
                        value: 0,
                        text: "Me"
                    },
                    {
                        value: 1,
                        text: "My Friends"
                    }
                ];
                scope.$watch('favouritedBy',function(newVal,oldVal){
                    if (ValidationService.valueChanged(newVal,oldVal)){
                        scope.$emit('favouriteSelector.favouritedBy',newVal);
                    }
                });
            }
        };
    }]);
});