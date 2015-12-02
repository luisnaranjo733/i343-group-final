'use strict';
var carpoolApp = angular.module('carpoolApp', ['ui.router', 'firebase']);

carpoolApp.controller('carpoolCtrl', function($scope, $http, $firebaseObject) {

    var ref = new Firebase("https://uwcarpool.firebaseio.com/data");
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
    .state('Home', {
        url: "/",
        templateUrl: "partial/login.html",
    })
});
