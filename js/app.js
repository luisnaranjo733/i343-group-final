'use strict';

const meters_miles_const = 1609.34;

var carpoolApp = angular.module('carpoolApp', ['ui.router', 'ui.validate', 'ui.bootstrap', 'firebase']);

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


    var obj = {
        getUsers: function() {
            return users;
        },
        getUser: function(id) {
            var userRef = new Firebase(FIREBASE_URI + 'users/' + id);
            return $firebaseObject(userRef);
        },
        addUser: function(user) {
            //users.$add(user);
            console.log('adding user')
            var userRef = users.$ref().child(user.uid);
            userRef.set(user);
            return $firebaseObject(userRef);

        },
        updateUser: function(id) {
            users.save(id);
        },
        removeUser: function(id) {
            users.$remove(id);
        },
        getCurrent: function () {
            var cookieString = localStorage.getItem('whirlpoolAuthCookie');
            var cookie = JSON.parse(cookieString);
            var userRef = new Firebase(FIREBASE_URI + 'users/' + cookie.uid);
            return $firebaseObject(userRef);
        }
    };
    return obj
})
.factory('authService', function($firebaseObject, FIREBASE_URI) {
    var ref = new Firebase(FIREBASE_URI + 'users');

    return {
        validate: function() {

            //check to see if cookie even exists
            if(localStorage.getItem('whirlpoolAuthCookie') == null) {
                console.log('failed');
                return false;
            }else {

                //gets cookie, parses and gets current time
                var cookieString = localStorage.getItem('whirlpoolAuthCookie');
                var cookie = JSON.parse(cookieString);
                var timeStamp = Math.floor(Date.now() / 1000);

                //checks to see if cookie has passed its expiration date
                if (cookie.expire < timeStamp) {
                    // console.log("expired");
                    localStorage.removeItem('whirlpoolAuthCookie');
                    return false;
                }else {
                    //refeshes the expiration date
                    // console.log("refeshing");
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
            console.log(cookie);
            var cookieString = JSON.stringify(cookie);
            localStorage.setItem('whirlpoolAuthCookie', cookieString);
        },
        logout: function() {
            localStorage.removeItem('whirlpoolAuthCookie');
        }
    }
});



carpoolApp.controller('carpoolCtrl', function($rootScope, $scope, $http, $firebaseObject, authService, userService, $state) {

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

    $scope.logout = function() {
        authService.logout();
        delete $rootScope.currentUser;
        $state.go("Login");
    }

    //validates the cookie on every view load to simulate how it would work in a page refresh situation
    $scope.$on('$viewContentLoaded',
    function(event){
        if(authService.validate()) {
            if($state.current.name == "Login" || $state.current.name == "Signup") {
                console.log("already validated");
                $rootScope.currentUser = userService.getCurrent();
                $state.go("Home");
            }else {
                $rootScope.currentUser = userService.getCurrent();
            }
        } else {
            // console.log($state.current.name);
            if($state.current.name == "Login" || $state.current.name == "Signup" || $state.current.name == null) {

            } else {
                console.log("Access Denied");
                $scope.logout();
            }

        }
    });
})
.controller('signupController', ['$scope', '$firebaseObject', 'userService', 'FIREBASE_URI', '$state', function($scope, $firebaseObject, userService, FIREBASE_URI, $state) {



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

    //rather than remove layer, just update the current marker lat and long
    map.on('click', function(e) {
        $scope.$apply(function() {
            if(map.hasLayer(addressMarker)) {
                map.removeLayer(addressMarker);
            }

            addressMarker = L.marker([e.latlng.lat, e.latlng.lng], {opacity: 0.6});
            addressMarker.addTo(map);
            $scope.signup.lat = e.latlng.lat;
            $scope.signup.lng = e.latlng.lng;
            exists = true;
        });
        console.log(exists);
    });

    //creates the firebase auth user and then attaches the uid to the user object. inserts the user object into users
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
                    lng : $scope.signup.lng,
                    scheduled: false
                }

                userService.addUser(user);
                $state.go("Login");
            }
        });
    }
}])
.controller('loginController', ['$rootScope', '$scope', '$firebaseObject', 'FIREBASE_URI', 'userService', '$state', 'authService', function($rootScope, $scope, $firebaseObject, FIREBASE_URI, userService, $state, authService){
    var ref = new Firebase(FIREBASE_URI);

    //logs in the user with firebase and then attaches their associated user object
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

            //iterates over users to find a match
            users.$loaded().then(function(x){
                x.forEach(function(user, id) {
                    if(user.uid == authData.uid) {

                        //three way binds the match to currentUser so it will persist around site
                        $rootScope.currentUser = userService.getUser(user.$id);
                        //adds the authorization cookie
                        authService.authorize(authData);

                        //goes to the homepage
                        $state.go("Home");
                    }
                });
            });


          }
        });
    }
}])
.controller('homeController', ['$scope', '$firebaseObject', 'FIREBASE_URI', 'userService', '$http', '$firebaseAuth', '$state', function($scope, $firebaseObject, FIREBASE_URI, userService, $http, $firebaseAuth, $state){

    $scope.toggleDriverView = function() {
        $state.go('Home.Drivers')
    }

    $scope.toggleRiderView = function() {
        $state.go('Home.Riders')
    }

}])
.controller('driversController', ['$rootScope', '$scope', '$firebaseObject', '$uibModal', 'FIREBASE_URI', 'userService', '$http', '$firebaseAuth', '$state', function($rootScope, $scope, $firebaseObject, $uibModal, FIREBASE_URI, userService, $http, $firebaseAuth, $state){



    //LIAM WORK
    //
    //
    $scope.createCar = function() {
        console.log($scope.car);
        $rootScope.currentUser.car = $scope.car;
        $rootScope.currentUser.$save();
    }

    $rootScope.addUserToCar = function(id, time) {
        console.log("fired");
        user = userService.getUser(id).$loaded(function(user) {

            switch (time) {
                case "MonAM":
                    if(!user.riderTimes.MonAM.driver) {
                        user.riderTimes.MonAM.driver = $rootScope.currentUser.$id;
                    } else {
                        console.log("already has driver");
                        return;
                    }

                    if ($rootScope.currentUser.car.riders) {
                        if($rootScope.currentUser.car.riders.MonAM) {
                            if($rootScope.currentUser.car.riders.MonAM.length >= $rootScope.currentUser.car.seats){
                                console.log("car is Full");
                                return;
                            }

                            if($rootScope.currentUser.car.riders.MonAM.indexOf(user.$id) > -1) {
                                $rootScope.currentUser.car.riders.MonAM.push(user.$id);
                            } else {
                                console.log("already in the car");
                                return;
                            }
                        } else {
                            $rootScope.currentUser.car.riders.MonAM = [user.$id];
                        }
                    } else {
                        console.log("creating new riders array");
                        $rootScope.currentUser.car.riders = {
                            "MonAM": [user.$id]
                        }
                    }
                break;
                case "MonPM":
                    if(!user.riderTimes.MonPM.driver) {
                        user.riderTimes.MonPM.driver = $rootScope.currentUser.$id;
                    } else {
                        console.log("already has driver");
                        return;
                    }

                    user.riderTimes.MonPM.driver = $rootScope.currentUser.$id;
                    if ($rootScope.currentUser.car.riders) {
                        if($rootScope.currentUser.car.riders.MonPM) {
                            if($rootScope.currentUser.car.riders.MonPM.length >= $rootScope.currentUser.car.seats){
                                console.log("car is Full");
                                return;
                            }

                            if($rootScope.currentUser.car.riders.MonPM.indexOf(user.$id) > -1) {
                                $rootScope.currentUser.car.riders.MonPM.push(user.$id);
                            } else {
                                console.log("already in the car");
                                return;
                            }
                        } else {
                            $rootScope.currentUser.car.riders.MonPM = [user.$id];
                        }
                    } else {
                        console.log("creating new riders array");
                        $rootScope.currentUser.car.riders = {
                            "MonPM": [user.$id]
                        }
                    }
                break;
                case "TuesAM":
                    if(!user.riderTimes.TuesAM.driver) {
                        user.riderTimes.TuesAM.driver = $rootScope.currentUser.$id;
                    } else {
                        console.log("already has driver");
                        return;
                    }

                    user.riderTimes.TuesAM.driver = $rootScope.currentUser.$id;
                    if ($rootScope.currentUser.car.riders) {
                        if($rootScope.currentUser.car.riders.TuesAM) {
                            if($rootScope.currentUser.car.riders.TuesAM.length >= $rootScope.currentUser.car.seats){
                                console.log("car is Full");
                                return;
                            }

                            if($rootScope.currentUser.car.riders.TuesAM.indexOf(user.$id) > -1) {
                                $rootScope.currentUser.car.riders.TuesAM.push(user.$id);
                            } else {
                                console.log("already in the car");
                                return;
                            }
                        } else {
                            $rootScope.currentUser.car.riders.TuesAM = [user.$id];
                        }
                    } else {
                        console.log("creating new riders array");
                        $rootScope.currentUser.car.riders = {
                            "TuesAM": [user.$id]
                        }
                    }
                break;
                case "TuesPM":
                    if(!user.riderTimes.TuesPM.driver) {
                        user.riderTimes.TuesPM.driver = $rootScope.currentUser.$id;
                    } else {
                        console.log("already has driver");
                        return;
                    }

                    user.riderTimes.TuesPM.driver = $rootScope.currentUser.$id;
                    if ($rootScope.currentUser.car.riders) {
                        if($rootScope.currentUser.car.riders.TuesPM) {
                            if($rootScope.currentUser.car.riders.TuesPM.length >= $rootScope.currentUser.car.seats){
                                console.log("car is Full");
                                return;
                            }

                            if($rootScope.currentUser.car.riders.TuesPM.indexOf(user.$id) > -1) {
                                $rootScope.currentUser.car.riders.TuesPM.push(user.$id);
                            } else {
                                console.log("already in the car");
                                return;
                            }
                        } else {
                            $rootScope.currentUser.car.riders.TuesPM = [user.$id];
                        }
                    } else {
                        console.log("creating new riders array");
                        $rootScope.currentUser.car.riders = {
                            "TuesPM": [user.$id]
                        }
                    }
                break;
                case "WedAM":
                    if(!user.riderTimes.WedAM.driver) {
                        user.riderTimes.WedAM.driver = $rootScope.currentUser.$id;
                    } else {
                        console.log("already has driver");
                        return;
                    }

                    user.riderTimes.WedAM.driver = $rootScope.currentUser.$id;
                    if ($rootScope.currentUser.car.riders) {
                        if($rootScope.currentUser.car.riders.WedAM) {
                            if($rootScope.currentUser.car.riders.WedAM.length >= $rootScope.currentUser.car.seats){
                                console.log("car is Full");
                                return;
                            }

                            if($rootScope.currentUser.car.riders.WedAM.indexOf(user.$id) > -1) {
                                $rootScope.currentUser.car.riders.WedAM.push(user.$id);
                            } else {
                                console.log("already in the car");
                                return;
                            }
                        } else {
                            $rootScope.currentUser.car.riders.WedAM = [user.$id];
                        }
                    } else {
                        console.log("creating new riders array");
                        $rootScope.currentUser.car.riders = {
                            "WedAM": [user.$id]
                        }
                    }
                break;
                case "WedPM":
                    if(!user.riderTimes.WedPM.driver) {
                        user.riderTimes.WedPM.driver = $rootScope.currentUser.$id;
                    } else {
                        console.log("already has driver");
                        return;
                    }

                    user.riderTimes.WedPM.driver = $rootScope.currentUser.$id;
                    if ($rootScope.currentUser.car.riders) {
                        if($rootScope.currentUser.car.riders.WedPM) {
                            if($rootScope.currentUser.car.riders.WedPM.length >= $rootScope.currentUser.car.seats){
                                console.log("car is Full");
                                return;
                            }

                            if($rootScope.currentUser.car.riders.WedPM.indexOf(user.$id) > -1) {
                                $rootScope.currentUser.car.riders.WedPM.push(user.$id);
                            } else {
                                console.log("already in the car");
                                return;
                            }
                        } else {
                            $rootScope.currentUser.car.riders.WedPM = [user.$id];
                        }
                    } else {
                        console.log("creating new riders array");
                        $rootScope.currentUser.car.riders = {
                            "WedPM": [user.$id]
                        }
                    }
                break;
                case "ThursAM":
                    if(!user.riderTimes.ThursAM.driver) {
                        user.riderTimes.ThursAM.driver = $rootScope.currentUser.$id;
                    } else {
                        console.log("already has driver");
                        return;
                    }

                    user.riderTimes.ThursAM.driver = $rootScope.currentUser.$id;
                    if ($rootScope.currentUser.car.riders) {
                        if($rootScope.currentUser.car.riders.ThursAM) {
                            if($rootScope.currentUser.car.riders.ThursAM.length >= $rootScope.currentUser.car.seats){
                                console.log("car is Full");
                                return;
                            }

                            if($rootScope.currentUser.car.riders.ThursAM.indexOf(user.$id) > -1) {
                                $rootScope.currentUser.car.riders.ThursAM.push(user.$id);
                            } else {
                                console.log("already in the car");
                                return;
                            }
                        } else {
                            $rootScope.currentUser.car.riders.ThursAM = [user.$id];
                        }
                    } else {
                        console.log("creating new riders array");
                        $rootScope.currentUser.car.riders = {
                            "ThursAM": [user.$id]
                        }
                    }
                break;
                case "ThursPM":
                    if(!user.riderTimes.ThursPM.driver) {
                        user.riderTimes.ThursPM.driver = $rootScope.currentUser.$id;
                    } else {
                        console.log("already has driver");
                        return;
                    }

                    user.riderTimes.ThursPM.driver = $rootScope.currentUser.$id;
                    if ($rootScope.currentUser.car.riders) {
                        if($rootScope.currentUser.car.riders.ThursPM) {
                            if($rootScope.currentUser.car.riders.ThursPM.length >= $rootScope.currentUser.car.seats){
                                console.log("car is Full");
                                return;
                            }

                            if($rootScope.currentUser.car.riders.ThursPM.indexOf(user.$id) > -1) {
                                $rootScope.currentUser.car.riders.ThursPM.push(user.$id);
                            } else {
                                console.log("already in the car");
                                return;
                            }
                        } else {
                            $rootScope.currentUser.car.riders.ThursPM = [user.$id];
                        }
                    } else {
                        console.log("creating new riders array");
                        $rootScope.currentUser.car.riders = {
                            "ThursPM": [user.$id]
                        }
                    }
                break;
                case "FriAM":
                    if(!user.riderTimes.FriAM.driver) {
                        user.riderTimes.FriAM.driver = $rootScope.currentUser.$id;
                    } else {
                        console.log("already has driver");
                        return;
                    }

                    user.riderTimes.FriAM.driver = $rootScope.currentUser.$id;
                    if ($rootScope.currentUser.car.riders) {
                        if($rootScope.currentUser.car.riders.FriAM) {
                            if($rootScope.currentUser.car.riders.FriAM.length >= $rootScope.currentUser.car.seats){
                                console.log("car is Full");
                                return;
                            }

                            if($rootScope.currentUser.car.riders.FriAM.indexOf(user.$id) > -1) {
                                $rootScope.currentUser.car.riders.FriAM.push(user.$id);
                            } else {
                                console.log("already in the car");
                                return;
                            }
                        } else {
                            $rootScope.currentUser.car.riders.FriAM = [user.$id];
                        }
                    } else {
                        console.log("creating new riders array");
                        $rootScope.currentUser.car.riders = {
                            "FriAM": [user.$id]
                        }
                    }
                break;
                case "FriPM":
                    if(!user.riderTimes.FriPM.driver) {
                        user.riderTimes.FriPM.driver = $rootScope.currentUser.$id;
                    } else {
                        console.log("already has driver");
                        return;
                    }

                    user.riderTimes.FriPM.driver = $rootScope.currentUser.$id;
                    if ($rootScope.currentUser.car.riders) {
                        if($rootScope.currentUser.car.riders.FriPM) {
                            if($rootScope.currentUser.car.riders.FriPM.length >= $rootScope.currentUser.car.seats){
                                console.log("car is Full");
                                return;
                            }

                            if($rootScope.currentUser.car.riders.FriPM.indexOf(user.$id) > -1) {
                                console.log($rootScope.currentUser.car.riders.FriPM.indexOf(user.$id));
                                $rootScope.currentUser.car.riders.FriPM.push(user.$id);
                            } else {
                                console.log("already in the car");
                                return;
                            }
                        } else {
                            $rootScope.currentUser.car.riders.FriPM = [user.$id];
                        }
                    } else {
                        console.log("creating new riders array");
                        $rootScope.currentUser.car.riders = {
                            "FriPM": [user.$id]
                        }
                    }
                break;
            }

            $rootScope.currentUser.$save();
            user.$save();
        });

    }







    var slider = new Slider('#ex1', {
        formatter: function(value) {
            return 'Pick up zone radius: ' + value;
        },
        tooltip: 'always'
    });
    slider.disable();

    var ref = new Firebase(FIREBASE_URI);
    $scope.authObj = $firebaseAuth(ref);

    var map_center = [47.745169, -122.288939];
    var map = L.map('map').setView(map_center, 11);
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.outdoors',
        accessToken: 'pk.eyJ1IjoibHVpc25hcmFuam83MzMiLCJhIjoiY2lmeDVra3Q1M3A0Z3U2a3N3d2JzNXFicCJ9.nLZGt1FxRVUxOUL-_1wrIg'
    }).addTo(map);

    var rider_markers = L.layerGroup([]);

    // loops over each marker in rider_markers layerGroup
    // highlights it if its is within the circle
    // dims it if is not
    // called from  $scope.update_radius()
    // which is called from the html view
    var filter_markers = function(circle) {
        rider_markers.eachLayer(function(layer) {
            // Lat, long of current point
            var layer_lat_long = layer.getLatLng();
            var circle_lat_long = circle.getLatLng();
            var distance_from_layer_circle = layer_lat_long.distanceTo(circle_lat_long);
            //console.log(distance_from_layer_circle / meters_miles_const);
            var miles_away = distance_from_layer_circle / meters_miles_const;

            if (miles_away < circle.getRadius() / meters_miles_const) {
                layer.setOpacity(1);
            } else {
                layer.setOpacity(0.6);
            }

        })
    }


    var authData = $scope.authObj.$getAuth();
    if (authData) {
        var user = userService.getUser(authData.uid).$loaded(function(user) {
            if (user.lat && user.lng) {
                map.setView([user.lat, user.lng], 13);
            }

            // radius in miles
            // attach to angular model
            // and html input element

            if (user.pickUpRadius) {
                $scope.pickUpRadius = user.pickUpRadius;
            } else {
                user.pickUpRadius = 2;
                user.$save();
                $scope.pickUpRadius = user.pickUpRadius;
            }

            slider.setValue($scope.pickUpRadius)
            slider.enable();

            slider.on('slide', function(value) {
                $scope.pickUpRadius = value;
                $scope.update_radius();
            });


            var circle = L.circle([user.lat, user.lng], $scope.pickUpRadius * meters_miles_const).addTo(map);

            // load made up markers for development
            // $http.get('data/marker_coordinates.json').then(function(response) {
            //     response.data.forEach(function(coordinate) {
            //         var marker = L.marker([coordinate.lat, coordinate.lng], {opacity: 0.6});
            //         marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();
            //         marker.addTo(rider_markers);
            //     });
            //     rider_markers.addTo(map)
            //     filter_markers(circle)

            // });


            var users = userService.getUsers();

            // find users looking for a rider
            // add them to the map
            users.$loaded().then(function(user){
                $http.get('partial/mustache/driver_marker.html').then(function(response) {
                    var template = response.data;

                    user.forEach(function(user, id) {
                        var riderTimes = user.riderTimes;
                        // if riderTimes defined
                        // this is a rider who is
                        // requesting a driver
                        if (riderTimes) {
                            var template_scope = {
                                user: user
                            };
                            // console.log(JSON.stringify(user.riderTimes.MonAM))
                            var marker = L.marker([user.lat, user.lng], {opacity: 0.6});

                            // var output = Mustache.render(template, template_scope);
                            // marker.bindPopup(output).openPopup();

                            marker.user = user;

                            marker.addTo(rider_markers);

                            marker.on('click', function(e){
                            //var authData = $scope.authObj.$getAuth();
                            //find out how to get id
                                $scope.$apply(function(){
                                    $rootScope.modalUser = e.target.user;
                                    console.log($scope.modalUser);
                                    // document.getElementById("myModal").modal()

                                    // $scope.items = ['output'];
                                    var modal = $uibModal.open({
                                          animation: $scope.animationsEnabled,
                                          templateUrl: 'driverModal.html',
                                          size: "lg",
                                          resolve: {
                                            items: function () {
                                              return $scope.items;
                                            }
                                          }
                                    });
                                    // var modal = $uibModal.open({templateUrl: 'partial/driverModal.html',
                                    //     scope: $scope,
                                    //     resolve: {
                                    //         items: function () {
                                    //             return $scope.items;
                                    //     }}
                                    // });
                                })
                            }
                        )}
                    });
                    rider_markers.addTo(map);
                    filter_markers(circle);

                })

            });



            $scope.update_radius = function() {
                circle.setRadius($scope.pickUpRadius * meters_miles_const);
                filter_markers(circle);
                user.pickUpRadius = $scope.pickUpRadius;
                user.$save();
            }

            // Create an event listener while mouse is being held down on the circle
            circle.on('mousedown', function(mousedown_event) {
                map.on('mousemove', function(mousemove_event) {
                    circle.setLatLng(mousemove_event.latlng);


                    // highlights markers within radius of circle
                    // dims all others
                    filter_markers(circle);
                })
            });

            // remove event listener when mouse is removed
            map.on('mouseup', function(mousemove_event) {
                map.removeEventListener('mousemove');

                // in miles
                var miles_away = mousemove_event.latlng.distanceTo(circle.getLatLng()) / meters_miles_const;

                if (miles_away < circle.getRadius() / meters_miles_const) {
                    console.log('Updating user home coordinate')
                    user.lat = mousemove_event.latlng.lat;
                    user.lng = mousemove_event.latlng.lng;
                    user.$save();
                }
            })
        });
    }
}])
.controller('ridersController', ['$scope', '$firebaseObject', 'FIREBASE_URI', 'userService', '$http', '$firebaseAuth', '$state', function($scope, $firebaseObject, FIREBASE_URI, userService, $http, $firebaseAuth, $state) {
    var ref = new Firebase(FIREBASE_URI);
    $scope.authObj = $firebaseAuth(ref);
    var authData = $scope.authObj.$getAuth();
    var user = userService.getUser(authData.uid).$loaded(function(user) {
        $scope.user = user;
        $scope.editSchedule = !user.scheduled;
        $scope.AM = {'6:30': 630, '6:45': 645, '7:00': 700, '7:15': 715, '7:30': 730, '7:45': 745, '8:00': 800, '8:15': 815, '8:30': 830, '8:45': 845, '9:00': 900, '9:15': 915, '9:30': 930, '9:45': 945, '10:00': 1000, '10:15': 1015, '10:30': 1030, '10:45': 1045, '11:00': 1100};
        $scope.PM = {'12:00': 1200, '12:15': 1215, '12:30':1230 , '12:45': 1245, '1:00': 1300, '1:15': 1315, '1:30': 1330, '1:45': 1345, '2:00': 1400, '2:15': 1415, '2:30': 1430, '2:45': 1445, '3:00': 1500, '3:15': 1515, '3:30': 1530, '3:45': 1545, '4:00': 1600, '4:15': 1615, '4:30': 1630};
    });
    $scope.updateSchedule = function () {
        var user = userService.getUser(authData.uid).$loaded(function(user) {
            $scope.editSchedule = $scope.editSchedule === false ? true: false;
            user.scheduled = true;
            user.riderTimes = {
                MonAM: {
                    time: parseInt(MonAM.value)
                },
                TuesAM: {
                    time: parseInt(TuesAM.value)
                },
                WedAM: {
                    time: parseInt(WedAM.value)
                },
                ThursAM: {
                    time: parseInt(ThursAM.value)
                },
                FriAM: {
                    time: parseInt(FriAM.value)
                },
                MonPM: {
                    time: parseInt(MonPM.value)
                },
                TuesPM: {
                    time: parseInt(TuesPM.value)
                },
                WedPM: {
                    time: parseInt(WedPM.value)
                },
                ThursPM: {
                    time: parseInt(ThursPM.value)
                },
                FriPM: {
                    time: parseInt(FriPM.value)
                }
            }
            user.$save();
        });
    }
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
        url: "/signup",
        templateUrl: "partial/signup.html",
        controller: "signupController"
    })
    .state('Home', {
        url: "/",
        templateUrl: "partial/home.html",
        controller: "homeController"
    })
    .state('Home.Drivers', {
        url: "drivers",
        templateUrl: "partial/drivers.html",
        controller: "driversController"
    })
    .state('Home.Riders', {
        url: "riders",
        templateUrl: "partial/riders.html",
        controller: "ridersController"
    })
});