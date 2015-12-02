'use strict';
var carpoolApp = angular.module('carpoolApp', ['ui.router', 'ui.validate', 'firebase']);

carpoolApp.controller('carpoolCtrl', function($scope, $http, $firebaseObject) {

    $scope.validUwEmail = function(value) {
        if (angular.isUndefined(value)) {
            return false;
        }
        var host  = value.split("@").pop();
        if (host == "uw.edu" || host == "u.washington.edu") {
          // it is valid
          return true;
        }
        return false;
    };

    var ref = new Firebase("https://uwcarpool.firebaseio.com/data");

    // var login = function() {
    //     ref.authWithPassword({
    //       email    : $scope.email,
    //       password : $scope.password
    //     }, function(error, authData) {
    //       if (error) {
    //         console.log("Login Failed!", error);
    //       } else {
    //         console.log("Authenticated successfully with payload:", authData);
    //       }
    //     });
    // }

    // download the data into a local object
    var syncObject = $firebaseObject(ref);
    // synchronize the object with a three-way data binding
    // click on `index.html` above to see it used in the DOM!
    syncObject.$bindTo($scope, "firebaseData");

});

carpoolApp.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
    //
    // For any unmatched url, redirect to /state1
    $urlRouterProvider.otherwise("/");
    // $locationProvider.html5Mode(true);

    //
    // Now set up the states
    $stateProvider
    .state('Template', {
        url: "/route/to/:id",
        templateUrl: function (stateParams){
            return 'partial/template/by/' + stateParams.step + '.html';
        }
    })
    .state('Login', {
        url: "/",
        templateUrl: "partial/login.html",
        controller: function($scope, $firebaseObject) {
            var ref = new Firebase("https://uwcarpool.firebaseio.com/data");
            var login = function() {
                ref.authWithPassword({
                  email    : $scope.email,
                  password : $scope.password
                }, function(error, authData) {
                  if (error) {
                    console.log("Login Failed!", error);
                  } else {
                    console.log("Authenticated successfully with payload:", authData);
                  }
                });
            }
        }
    })
    .state('Signup', {
        url: "/singup",
        templateUrl: "partial/signup.html",
        controller: function($scope, $firebaseObject) {
            $scope.match = function(value1, value2) {
                if (angular.isUndefined(value1) || angular.isUndefined(value12)) {
                    return false;
                }
                if (value1 == value2) {
                    return true;
                }
                return false;
            }

            console.log("here");
            var map = L.map('map').setView([47.745169, -122.288939], 11);
            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: 18,
                id: 'mapbox.outdoors',
                accessToken: 'pk.eyJ1IjoibHVpc25hcmFuam83MzMiLCJhIjoiY2lmeDVra3Q1M3A0Z3U2a3N3d2JzNXFicCJ9.nLZGt1FxRVUxOUL-_1wrIg'
            }).addTo(map);

            var addressMarker;
            var exists = false;

            map.on('click', function(e) {
                $scope.$apply(function() {
                    if(exists) {
                        map.removeLayer(addressMarker);
                    }
                    addressMarker = L.marker([e.latlng.lat, e.latlng.lng], {opacity: 0.6});
                    addressMarker.addTo(map);
                    $scope.signup.lat = e.latlng.lat;
                    $scope.signup.lng = e.latlng.lng;
                    exists = true;
                });
            });

            var ref = new Firebase("https://uwcarpool.firebaseio.com/data");

            $scope.signupUser = function() {
                console.log("signup fired");
                console.log($scope.signup);
                ref.createUser({
                  email    : $scope.signup.email,
                  password : $scope.signup.password
                }, function(error, userData) {
                  if (error) {
                    console.log("Error creating user:", error);
                  } else {
                    console.log("Successfully created user account with uid:", userData.uid);
                  }
                });
            }
        },
        controllerAs: "singupController"
    })


})

.run(function($rootScope){

    $rootScope
        .$on('$viewContentLoaded',
            function(event){
                // var event = new Event('partialLoad');
                // console.log(this.event);
                // document.dispatchEvent(event);
                $(document).trigger("partialLoad");
                // console.log("View Load: the view is loaded, and DOM rendered!");
        });

});