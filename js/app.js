'use strict';
var carpoolApp = angular.module('carpoolApp', ['ui.router', 'ui.validate', 'firebase']);

carpoolApp.constant("FIREBASE_URI", "https://uwcarpool.firebaseio.com/");

carpoolApp.factory('userService', function($firebaseArray, $firebaseObject, FIREBASE_URI) {
    var ref = new Firebase(FIREBASE_URI + 'users');
    var users = $firebaseArray(ref);

    // var obj = new $firebaseObject(ref);
    // users.$loaded().then(function() {
    // });
    // // change the value at path foo/ to "baz"
    // obj.$value = "baz";
    // obj.$save();
    // // delete the value and see what is returned
    // obj.$remove().then(function() {
    //     console.log(obj.$value); // null!
    // });

    return {
        getUsers: function() {
            return users;
        },
        getUser: function(id) {
            var userRef = new Firebase(FIREBASE_URI + 'users/' + id);
            return $firebaseObject(userRef);
        },
        addUser: function(user) {
            users.$add(user);
        },
        updateUser: function(id) {
            users.save(id);
        },
        removeUser: function(id) {
            users.$remove(id);
        }
    }
})
.factory('authService', function($firebaseObject, FIREBASE_URI) {
    var ref = new Firebase(FIREBASE_URI + 'users');

    return {
        validate: function() {
            console.log("cookie: " + localStorage.getItem('whirlpoolAuthCookie'));
            if(localStorage.getItem('whirlpoolAuthCookie') == null) {
                console.log('failed');
                return false;
            }else {
                var cookieString = localStorage.getItem('whirlpoolAuthCookie');
                var cookie = JSON.parse(cookieString);
                var timeStamp = Math.floor(Date.now() / 1000);
                if (cookie.expire < timeStamp) {
                    console.log("expired");
                    localStorage.removeItem('whirlpoolAuthCookie');
                    return false;
                }else {
                    console.log("refeshing");
                    cookie.expire = timeStamp + (30 * 60);
                    cookieString = JSON.stringify(cookie);
                    localStorage.setItem('whirlpoolAuthCookie', cookieString);
                    return true;
                }
            }
        },
        authorize: function(auth) {
            var timeStamp = Math.floor(Date.now() / 1000);
            var expire = timeStamp + (30 * 60);
            var cookie = {
                uid : auth.uid,
                setTime: timeStamp,
                expire: expire
            }
            var cookieString = JSON.stringify(cookie);
            localStorage.setItem('whirlpoolAuthCookie', cookieString);
        }
    }
});



carpoolApp.controller('carpoolCtrl', function($scope, $http, $firebaseObject, authService, $state) {

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


    $scope.$on('$viewContentLoaded',
    function(event){
        if(authService.validate()) {
            if($state.current.name == "Login" || $state.current.name == "Signup") {
                console.log("already validated");
                $state.go("Home");
            }else {

            }
        } else {
            console.log($state.current.name);
            if($state.current.name == "Login" || $state.current.name == "Signup") {

            } else {
                console.log("Access Denied");
                $state.go("Login");
            }

        }
    });
})
.controller('singupController', ['$scope', '$firebaseObject', 'userService', 'FIREBASE_URI', function($scope, $firebaseObject, userService, FIREBASE_URI) {



    //draw address map
    var map = L.map('map').setView([47.745169, -122.288939], 11);
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.outdoors',
        accessToken: 'pk.eyJ1IjoibHVpc25hcmFuam83MzMiLCJhIjoiY2lmeDVra3Q1M3A0Z3U2a3N3d2JzNXFicCJ9.nLZGt1FxRVUxOUL-_1wrIg'
    }).addTo(map);

    var addressMarker;
    var exists = false;

    //move marker and update models
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

    // var ref = new Firebase("https://uwcarpool.firebaseio.com/data");
    // userService.getUsers().$bindTo($scope, 'users');
    // console.log($scope.users);
    var testUser = {
        uid: "oasjndoass",
        email: "test@email.com",
        name: "Liams test",
        phone: 2038325223,
        lat: -122,
        lng: 84
    }

    $scope.signupUser = function() {

        console.log("signup fired");
        console.log($scope.signup);

        console.log("creating auth user");
        var ref = new Firebase(FIREBASE_URI);

        ref.createUser({
            email    : $scope.signup.email,
            password : $scope.signup.password
        }, function(error, userData) {
            if (error) {
                console.log("Error creating user:", error);
            } else {
                console.log("Successfully created user account with uid:", userData.uid);

                var uid  = userData.uid;
                var user = {
                    uid : uid,
                    email : $scope.signup.email,
                    name : $scope.signup.name,
                    phone : $scope.signup.phone,
                    lat : $scope.signup.lat,
                    lng : $scope.signup.lng
                }
                // console.log(userService.getUsers());
                userService.addUser(user);
                // console.log(userService.getUsers());
            }
        });
    }
}])
.controller('loginController', ['$scope', '$firebaseObject', 'FIREBASE_URI', 'userService', '$state', 'authService', function($scope, $firebaseObject, FIREBASE_URI, userService, $state, authService){
    var ref = new Firebase(FIREBASE_URI);
    $scope.login = function() {
        ref.authWithPassword({
          email    : $scope.email,
          password : $scope.password
        }, function(error, authData) {
          if (error) {
            console.log("Login Failed!", error);
          } else {
            console.log("Authenticated successfully with payload:", authData);
            // console.log(authData.uid);

            var users = userService.getUsers();
            users.$loaded().then(function(x){
                x.forEach(function(user, id) {
                    if(user.uid == authData.uid) {
                        userService.getUser(user.$id).$bindTo($scope, "currentUser");
                        authService.authorize(authData);
                        $state.go("Home");
                    }
                });
            });


          }
        });
    }
}])
.controller('homeController', ['$scope', '$firebaseObject', 'FIREBASE_URI', 'userService', function($scope, $firebaseObject, FIREBASE_URI, userService){
    var ref = new Firebase(FIREBASE_URI);

}]);


carpoolApp.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
    // For any unmatched url, redirect to /state1
    $urlRouterProvider.otherwise("/login");
    // $locationProvider.html5Mode(true);
    // Now set up the states
    $stateProvider
    .state('Template', {
        url: "/route/to/:id",
        templateUrl: function (stateParams){
            return 'partial/template/by/' + stateParams.step + '.html';
        }
    })
    .state('Login', {
        url: "/login",
        templateUrl: "partial/login.html",
        controller: "loginController"
    })
    .state('Signup', {
        url: "/singup",
        templateUrl: "partial/signup.html",
        controller: "singupController"
    })
    .state('Home', {
        url: "/",
        templateUrl: "partial/home.html",
        controller: "homeController"
    })

});