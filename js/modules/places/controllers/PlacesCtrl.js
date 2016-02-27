'use strict';

define([
    '../module'
], function (module) {
    module.controller('PlacesCtrl', ['$scope', '$q', 'FeatureService', 'Cities', 'City', 'TIPs', 'TIP', 'User',
        'FBStorageService', 'AuthAdminService', 'AuthFBService', 'NotificationService', 'DialogService', 'ValidationService',
        function ($scope, $q, FeatureService, Cities, City, TIPs, TIP, User,
                  FBStorageService, AuthAdminService, AuthFBService, NotificationService, DialogService, ValidationService) {

            $scope.isAuthenticated = function () {
                return AuthAdminService.isAuthenticated;
            };
            $scope.isAuthFB = function () {
                return AuthFBService.isAuthFB;
            };
            $scope.getFBUserId = function () {
                return FBStorageService.getUserID();
            };
            $scope.filtersEnabled = false;
            $scope.filtersEmpty = true;
            $scope.types = TIP.getTypes();
            $scope.selectedTypes = [];
            $scope.cities = Cities.query();
            $scope.selectedCities = [];
            $scope.selectedFriends = [];
            $scope.friends = [];
            $scope.allowAddTIPs = false;
            $scope.loading = false;
            $scope.statsEnabled = false;

            $scope.addTIP = function () {
                $scope.displayHelpMessage();
                $scope.allowAddTIPs = true;
            };

            $scope.finishAddTIPs = function () {
                $scope.allowAddTIPs = false;
            };

            $scope.displayHelpMessage = function () {
                NotificationService.displayMessage("Click on the map to create Places");
            };

            $scope.$watch('isAuthenticated()', function (newVal) {
                if (angular.isDefined(newVal) && !newVal) {
                    $scope.allowAddTIPs = false;
                }
            });
            $scope.$watch('isAuthFB() && getFBUserId()', function (newVal) {
                if (angular.isDefined(newVal) && newVal) {
                    User.getFriends().$promise
                        .then(function(friends){
                            $scope.friends = friends;
                        });
                }
            });

            $scope.$watchCollection('selectedCities', function (newVal, oldVal) {
                if (ValidationService.arrayChanged(newVal, oldVal)) {
                    requestFeatures();
                }
            });
            $scope.$watchCollection('selectedTypes', function (newVal, oldVal) {
                if (ValidationService.arrayChanged(newVal, oldVal)) {
                    requestFeatures();
                }
            });
            $scope.$on('peopleSelector.value', function (event, favouritedBy) {
                $scope.favouritedBy = favouritedBy;
            });
            $scope.$on('socialChips.selectedFriends', function (event, selectedFriends) {
                $scope.selectedFriends = selectedFriends;
            });
            $scope.$watch('favouritedBy', function () {
                requestFeatures();
            });
            $scope.$watchCollection('selectedFriends', function () {
                requestFeatures();
            });

            $scope.$watch('selectedFriends.length || selectedCities.length  || selectedTypes.length || favouritedBy', function () {
                $scope.filtersEmpty =
                    !(angular.isDefined($scope.favouritedBy) || ($scope.selectedFriends.length > 0) ||
                    ($scope.selectedCities.length > 0) || ($scope.selectedTypes.length > 0));
            });

            $scope.clearFilters = function () {
                $scope.favouritedBy = undefined;
                $scope.selectedFriends = [];
                $scope.selectedCities = [];
                $scope.selectedTypes = [];

                $scope.$broadcast('peopleSelector.reset',undefined);
                $scope.$broadcast('socialChips.reset',[]);
            };

            var requestFeatures = function () {
                var types = _.map($scope.selectedTypes, function (type) {
                    return type.id;
                });
                var cities = _.map($scope.selectedCities, function (city) {
                    return city.id;
                });
                var URLparams = {
                    bounds: $scope.bounds,
                    types: types,
                    cities: cities
                };
                if ($scope.isAuthFB()) {
                    URLparams["favouritedBy"] = $scope.favouritedBy;
                    if (angular.isDefined($scope.favouritedBy) && $scope.favouritedBy == 1 && !_.isEmpty($scope.selectedFriends)) {
                        URLparams["friends"] = _.map($scope.selectedFriends, function (friend) {
                            return friend.facebookUserId;
                        });
                    }
                } else {
                    URLparams["favouritedBy"] = undefined;
                    URLparams["friends"] = undefined;
                }

                TIPs.query(URLparams).$promise
                    .then(function (resultFeatures) {
                        $scope.boundingboxfeatures = resultFeatures;
                    }, function (response) {
                        if (response.status == 500) {
                            NotificationService.displayMessage("Error retrieving TIPS");
                        }
                    });
            };

            $scope.$watch('boundschanged', function (bounds, boundsOld) {
                if (angular.isDefined(bounds) && angular.isDefined(boundsOld)) {
                    $scope.bounds = FeatureService.layer2WKT(bounds);
                    requestFeatures();
                }
            });

            var activateLoading = function () {
                $scope.loading = true;
            };

            var disableLoading = function () {
                $scope.loading = false;
            };

            $scope.$watch('locationclicked', function (location) {
                if ($scope.isAuthenticated() && $scope.allowAddTIPs && angular.isDefined(location)) {
                    var locationFeature = FeatureService.layer2WKT(location);

                    activateLoading();
                    City.get({location: locationFeature}).$promise.finally(disableLoading)
                        .then(function () {
                            return DialogService.showAddPlaceDialog()
                        }, function () {
                            NotificationService.displayMessage("The place should be located in a existing city");
                            return $q.reject();
                        })
                        .then(function (place) {
                            place["geometry"] = locationFeature;
                            activateLoading();
                            return TIP.save(place).$promise.finally(disableLoading)
                        }, function () {
                            return $q.reject();
                        })
                        .then(function () {
                            requestFeatures();
                            NotificationService.displayMessage("Place created!");
                            $scope.allowAddTIPs = false;
                        }, function (response) {
                            if (response && response.status == 500) {
                                NotificationService.displayMessage("Error creating Place");
                            }
                        });
                }
            });

            $scope.showPlaceDialog = function (layer) {
                DialogService.showPlaceDialog(layer.customFeature)
                    .then(function (operation) {
                        if (operation.delete != undefined && operation.delete) {
                            return DialogService.showConfirmDeleteTIPDialog(layer.customFeature.id, "Delete Place?", "Yes", "Cancel");
                        } else if (operation.edit != undefined) {
                            return {edit: operation.edit};
                        } else {
                            return $q.reject();
                        }
                    })
                    .then(function (operation) {
                        if (operation.edit == undefined) {
                            activateLoading();
                            return TIP.delete({id: layer.customFeature.id}).$promise.finally(disableLoading)
                        } else {
                            return {edit: operation.edit};
                        }
                    }, function (error) {
                        return $q.reject(error);
                    })
                    .then(function (operation) {
                        if (operation.edit == undefined) {
                            $scope.boundingboxlayers.removeLayer(layer);
                            NotificationService.displayMessage("Place deleted!");
                        } else {
                            if (operation.edit) {
                                requestFeatures();
                            }
                        }
                    }, function (error) {
                        if (error) {
                            if (error.status == 500) {
                                NotificationService.displayMessage("Error deleting Place");
                            }
                            if (error.confirm == false) {
                                $scope.showPlaceDialog(layer);
                            }
                        }
                    });

            };

            $scope.addStats = function () {
                $scope.statsEnabled = true;
            };

            $scope.clearStats = function () {
                $scope.statsEnabled = false;
            };


            $scope.$watch('layerclicked', function (layerClicked) {
                if (angular.isDefined(layerClicked)) {
                    var typeClicked = layerClicked.typeClicked;
                    var layer = layerClicked.layer;
                    if (typeClicked == "Point") {
                        $scope.showPlaceDialog(layer);
                        $scope.layerclicked = undefined;
                    }
                }
            });
        }]);
});