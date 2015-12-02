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

    // var signup = function() {
    //     ref.createUser({
    //       email    : $scope.email,
    //       password : $scope.password
    //     }, function(error, userData) {
    //       if (error) {
    //         console.log("Error creating user:", error);
    //       } else {
    //         console.log("Successfully created user account with uid:", userData.uid);
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
            $scope.passwordsMatch = function(value) {
                if (angular.isUndefined(value)) {
                    return false;
                }
                if ($scope.value === $scope.password) {
                    return true;
                }
                return false;
            }

            var ref = new Firebase("https://uwcarpool.firebaseio.com/data");
            var signup = function() {
                ref.createUser({
                  email    : $scope.email,
                  password : $scope.password
                }, function(error, userData) {
                  if (error) {
                    console.log("Error creating user:", error);
                  } else {
                    console.log("Successfully created user account with uid:", userData.uid);
                  }
                });
            }
        }
    })
});