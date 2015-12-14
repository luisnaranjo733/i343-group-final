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
.factory('alertService', ['$rootScope', 'userService', 'FIREBASE_URI', function($rootScope, userService, FIREBASE_URI) {
    var alertService = {};
    $rootScope.alerts = [];

    alertService.loadPendingAlerts = function(user) {
        if (user.alerts) {
            user.alerts.forEach(function(alert) {
                if (!alert.displayed) {
                    $rootScope.alerts.push(alert);
                    alert.displayed =  true;
                    user.$save();
                }

            })
        } else {
            console.log('no unseen alerts')
        }

    }


    alertService.saveAlert = function(uid, message, alert_type) {
        var alert = {
            msg: message,
            type: alert_type,
            displayed: false
        };

        console.log('saving alert')
        console.log(uid)

        // if alert for current user, just display
        if ($rootScope.currentUser.$id === uid) {
            $rootScope.alerts.push(alert);
            alert.displayed = true;
        // if alert for another user, save to firebase
        } else {
            userService.getUser(uid).$loaded(function(user) {
                if (user.alerts) {
                    user.alerts.push(alert);
                } else {
                    user.alerts = [alert];
                }
                user.$save();
            })
        }


    }
    $rootScope.saveAlert = alertService.saveAlert;

    alertService.closeAlert = function(index) {
        console.log('closing alert: ' +  index);
        $rootScope.alerts.splice(index, 1);
    }
    $rootScope.closeAlert = alertService.closeAlert;

    return alertService


}])
.factory('authService', function($firebaseObject, FIREBASE_URI) {
    var ref = new Firebase(FIREBASE_URI + 'users');

    return {
        validate: function() {

            //check to see if cookie even exists
            if(localStorage.getItem('whirlpoolAuthCookie') == null) {
                // console.log('failed');
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



carpoolApp.controller('carpoolCtrl', function($rootScope, $scope, $http, $firebaseObject, authService, userService, $state, alertService) {

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
        console.log("going to login");
        $state.go("Login");
    }

    //validates the cookie on every view load to simulate how it would work in a page refresh situation
    $scope.$on('$viewContentLoaded',
    function(event){
        if(authService.validate()) {
            if($state.current.name == "Login" || $state.current.name == "Signup") {
                console.log("already validated sending to homescreen");
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

            addressMarker = L.marker([e.latlng.lat, e.latlng.lng]);
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
.controller('homeController', ['$scope', '$rootScope', '$firebaseObject', 'FIREBASE_URI', 'userService', '$http', '$firebaseAuth', '$state', 'alertService', function($scope, $rootScope, $firebaseObject, FIREBASE_URI, userService, $http, $firebaseAuth, $state, alertService){

    $rootScope.directions = ['to', 'from'];
    $rootScope.days = ["mon", "tues", "wed", "thurs", "fri"];
    $rootScope.currentUser.$loaded(function(user) {

        $rootScope.testDrivers = {};
        if($rootScope.currentUser.riderTimes) {
            angular.forEach($rootScope.directions, function(direction, directionKey){
                console.log($rootScope.currentUser.riderTimes);
                if($rootScope.currentUser.riderTimes[direction]){
                    $rootScope.testDrivers[direction] = {};
                    angular.forEach($rootScope.days, function(day, dayKey){
                        if($rootScope.currentUser.riderTimes[direction][day]) {
                            if ($rootScope.currentUser.riderTimes[direction][day].driver) {
                                $rootScope.testDrivers[direction][day] = {};
                                $rootScope.testDrivers[direction][day].driver = userService.getUser($rootScope.currentUser.riderTimes[direction][day].driver).$loaded(function(driver) {
                                    return driver;
                                });
                                console.log($rootScope.testDrivers);
                            }
                        }
                    })
                }
            });
        }
    });

    $scope.toggleDriverView = function() {
        $state.go('Home.Drivers')
    }

    $scope.toggleRiderView = function() {
        $state.go('Home.Riders')
    }
    console.log('home controller')
    $rootScope.currentUser.$loaded(function(user) {
        alertService.loadPendingAlerts(user)
    })


}])
.controller('driversController', ['$rootScope', '$scope', '$firebaseObject', '$uibModal', 'FIREBASE_URI', 'userService', '$http', '$firebaseAuth', '$state', '$timeout', 'alertService', function($rootScope, $scope, $firebaseObject, $uibModal, FIREBASE_URI, userService, $http, $firebaseAuth, $state, $timeout, alertService){

    $scope.openDriverDaySummaryModal = function(day, direction) {
        $rootScope.day = day;
        console.log(day)

        if (direction === 'to') {
            $rootScope.direction = 'Morning'
        } else {
            $rootScope.direction = 'Evening'
        }

        $rootScope.summaryRiders =  []

        $rootScope.currentUser.$loaded(function(user) {
            if (user.car) {
                if (user.car.riders) {
                    if (user.car.riders[direction]) {
                        var ridesInThisDirection = user.car.riders[direction];
                        if (ridesInThisDirection[day]) {
                            // var rider_uids = user.car.riders[direction][day]
                            // console.log(rider_uids)
                            // rider_uids.forEach(function(uid) {
                            //     userService.getUser(uid).$loaded(function(user) {
                            //         console.log(user)
                            //         $rootScope.summaryRiders.push(user)
                            //     })
                            // })
                            var rider_time_objects = user.car.riders[direction][day]
                            rider_time_objects.forEach(function(rider_time_obj) {
                                userService.getUser(rider_time_obj.uid).$loaded(function(user) {
                                    user.rider_time_obj = rider_time_obj
                                    $rootScope.summaryRiders.push(user)
                                });
                            })
                        }
                    }
                }
            }
        })

        var modal = $uibModal.open({
              animation: $scope.animationsEnabled,
              templateUrl: 'driverDaySummary.html',
              size: "lg"
        });
    }


    $scope.createCar = function() {
        console.log($scope.car);
        $rootScope.currentUser.car = $scope.car;
        $rootScope.currentUser.$save();
    }

    $rootScope.clearMessagesFor = function(key) {
        console.log('clearing messages for: ' + key);
        $rootScope.messages[key].mType = null;
        $rootScope.messages[key].message = null;
        // $rootScope.messages[key] = null;
    }

    $scope.initMessages = function() {
        if(!$rootScope.messages) {
          $rootScope.messages = {};
          if (!$rootScope.messages.modal) {
              $rootScope.messages.modal = {
                mType : null,
                message: null
              };
          }
        }
    }
    $scope.initMessages();

    $rootScope.addUserToCar = function(id, time, direction, exactTime) {
        console.log("fired");
        console.log(exactTime)
        console.log('extra')
        user = userService.getUser(id).$loaded(function(user) {
            $timeout(function() {
              var thisTime = user.riderTimes[direction][time];
              // var thisCar = $rootScope.currentUser.car.riders[direction][time];

              if (thisTime.driver) {
                  $rootScope.messages.modal.mType = "error";
                  console.log($rootScope.messages.modal.mType);
                  $rootScope.messages.modal.message = user.name + " already has a driver at that time.";
                  console.log("already has driver");
                  $scope.$apply();
                  return;
              } else {
                  if ($rootScope.currentUser.car.riders) {
                    if($rootScope.currentUser.car.riders[direction]) {
                        if($rootScope.currentUser.car.riders[direction][time]) {
                            if($rootScope.currentUser.car.riders[direction][time].length >= $rootScope.currentUser.car.seats){
                                $rootScope.messages.modal.mType = "error";
                                $rootScope.messages.modal.message = "I'm sorry but your car is full at that time.";
                                console.log("car is Full");
                                return;
                            } else {
                                if($rootScope.currentUser.car.riders[direction][time].indexOf(user.$id) == -1) {
                                    var rider_time_obj = {
                                        uid: user.$id,
                                        direction: direction,
                                        time: time,
                                        exactTime: exactTime
                                    }
                                    $rootScope.currentUser.car.riders[direction][time].push(rider_time_obj);
                                    $rootScope.messages.modal.mType = "success";
                                    $rootScope.messages.modal.message = user.name + " was added succesfully.";

                                    var alertMessage = "you have been added to " + $rootScope.currentUser.name + "'s car going " + direction + " school on " + time + " at " + $scope.getTime(user.riderTimes[direction][time].time);
                                    alertService.saveAlert(user.$id, alertMessage, "success");


                                } else {
                                    console.log($rootScope.messages);
                                    $rootScope.messages.modal.mType = "error";
                                    $rootScope.messages.modal.message = user.name + " is already in your car at that time.";
                                    console.log("already in the car");
                                    return;
                                }
                            }
                        } else {
                            var rider_time_obj = {
                                uid: user.$id,
                                direction: direction,
                                time: time,
                                exactTime: exactTime
                            }
                            $rootScope.currentUser.car.riders[direction][time] = [rider_time_obj];
                            $rootScope.messages.modal.mType = "success";
                            $rootScope.messages.modal.message = user.name + " was added succesfully.";

                            var alertMessage = "you have been added to " + $rootScope.currentUser.name + "'s car going " + direction + " school on " + time + " at " + $scope.getTime(user.riderTimes[direction][time].time);
                            alertService.saveAlert(user.$id, alertMessage, "success");


                        }
                    } else {
                        var rider_time_obj = {
                            uid: user.$id,
                            direction: direction,
                            time: time,
                            exactTime: exactTime
                        }
                        $rootScope.messages.modal.mType = "success";
                        $rootScope.messages.modal.message = user.name + " was added succesfully.";
                        console.log("creating new direction array");
                        $rootScope.currentUser.car.riders[direction] = {};
                        $rootScope.currentUser.car.riders[direction][time] = [rider_time_obj];


                        var alertMessage = "you have been added to " + $rootScope.currentUser.name + "'s car going " + direction + " school on " + time + " at " + $scope.getTime(user.riderTimes[direction][time].time);
                        alertService.saveAlert(user.$id, alertMessage, "success");


                    }

                  } else {
                      $rootScope.messages.modal.mType = "success";
                      $rootScope.messages.modal.message = user.name + " was added succesfully.";


                      var alertMessage = "you have been added to " + $rootScope.currentUser.name + "'s car going " + direction + " school on " + time + " at " + $scope.getTime(user.riderTimes[direction][time].time);
                      alertService.saveAlert(user.$id, alertMessage, "success");

                      console.log("creating new riders array");
                        var rider_time_obj = {
                            uid: user.$id,
                            direction: direction,
                            time: time,
                            exactTime: exactTime
                        }
                      $rootScope.currentUser.car.riders = {};
                      $rootScope.currentUser.car.riders[direction] = {};
                      $rootScope.currentUser.car.riders[direction][time] = [rider_time_obj];
                  }

                  thisTime.driver = $rootScope.currentUser.$id;
              }
              $rootScope.currentUser.$save();
              user.$save();
            }, 0);

        });

    }

    $rootScope.removeUserFromCar = function(id, time, direction) {
        var user = userService.getUser(id).$loaded(function(user) {
            user.riderTimes[direction][time].driver = null;
            var index = $rootScope.currentUser.car.riders[direction][time].indexOf(id);
            $rootScope.currentUser.car.riders[direction][time].splice(index, 1);

            $rootScope.messages.modal.mType = "success";
            $rootScope.messages.modal.message = user.name + " was removed succesfully.";

            var alertMessage = "you have been removed from " + $rootScope.currentUser.name + "'s car going " + direction + " school on " + time + " at " + $scope.getTime(user.riderTimes[direction][time].time);
                                    alertService.saveAlert(user.$id, alertMessage, "warning");

            user.$save();
            $rootScope.currentUser.$save();
        });
    }

    $rootScope.getTime = function (time) {
        if(time == null) {
            return "None";
        } else {
            var split = "";
            var hold = "";
            if (time >= 1200) {
                split = 'PM';
            } else {
                split = 'AM';
            }
            if (time >= 1300) {
                time = time - 1200;
            }
            time = time.toString();
            hold = time.substring(0,time.length-2) + ":";
            hold = hold + time.substring(time.length-2,time.length) + " " + split;
            return hold;
        }
    }


    var slider = new Slider('#ex1', {
        formatter: function(value) {
            return 'Pick-Up Zone Radius: ' + value;
        },
        tooltip: 'hover'
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
            circle.bindPopup("<h2>Check it out!</h2><h4>You can drag this pick up zone around to reposition it, or you can adjust the slider to change its radius</h4><h4>When you refresh the page, this circle will be right where you left it!</h4>");
            var feature_info_displayed = false
            map.on('mouseover', function() {
                if (!feature_info_displayed) {
                    feature_info_displayed = true
                    circle.openPopup()
                }

            })
            map.on('mouseout', function() {
                circle.closePopup()
            })
            circle.on('popupclose', function() {
                circle.unbindPopup()
            })

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
                        var marker;
                        // console.log(user.$id)
                        // console.log($rootScope.currentUser.$id)
                        if (user.$id == $rootScope.currentUser.$id) {
                            // console.log('darkred')
                            var ourMarker = L.AwesomeMarkers.icon({icon: 'home', markerColor: 'darkred'});
                            marker = L.marker([user.lat, user.lng], {opacity: 0.6, icon: ourMarker});
                            $rootScope.homeMarker = marker;
                        } else {
                            // console.log('darkblue')
                            var othersMarker = L.AwesomeMarkers.icon({icon: 'user', markerColor: 'darkblue'});
                            marker = L.marker([user.lat, user.lng], {opacity: 0.6, icon: othersMarker});
                        }

                        // var output = Mustache.render(template, template_scope);
                        // marker.bindPopup(output).openPopup();

                        marker.user = user;

                        marker.addTo(rider_markers);

                        marker.on('click', function(e){

                            $scope.$apply(function(){
                                $rootScope.modalUser = e.target.user;
                                // console.log($scope.modalUser);
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
                            })
                        }
                    )}
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
                    if ($rootScope.homeMarker) {
                        $rootScope.homeMarker.setLatLng(mousemove_event.latlng)
                    }

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
.controller('ridersController', ['$rootScope', '$scope', '$firebaseObject', 'FIREBASE_URI', 'userService', '$http', '$firebaseAuth', '$state', function($rootScope, $scope, $firebaseObject, FIREBASE_URI, userService, $http, $firebaseAuth, $state) {
/*    var ref = new Firebase(FIREBASE_URI);
    $scope.authObj = $firebaseAuth(ref);
    var authData = $scope.authObj.$getAuth();
    var user = userService.getUser(authData.uid).$loaded(function(user) {
*/
    $scope.user = $rootScope.currentUser;
    $scope.editSchedule = !$scope.user.scheduled;
    $scope.AM = {'6:30': 630, '6:45': 645, '7:00': 700, '7:15': 715, '7:30': 730, '7:45': 745, '8:00': 800, '8:15': 815, '8:30': 830, '8:45': 845, '9:00': 900, '9:15': 915, '9:30': 930, '9:45': 945, '10:00': 1000, '10:15': 1015, '10:30': 1030, '10:45': 1045, '11:00': 1100};
    $scope.PM = {'12:00': 1200, '12:15': 1215, '12:30':1230 , '12:45': 1245, '1:00': 1300, '1:15': 1315, '1:30': 1330, '1:45': 1345, '2:00': 1400, '2:15': 1415, '2:30': 1430, '2:45': 1445, '3:00': 1500, '3:15': 1515, '3:30': 1530, '3:45': 1545, '4:00': 1600, '4:15': 1615, '4:30': 1630};

    $scope.updateSchedule = function () {
        $rootScope.currentUser.$loaded(function(user) {
            $scope.editSchedule = $scope.editSchedule === false ? true: false;
            user.scheduled = true;
            angular.forEach($rootScope.directions, function(direction, directionKey){
                angular.forEach($rootScope.days, function(day, dayKey){
                    if($rootScope.currentUser.riderTimes[direction][day].driver) {
                        console.log("Driver exists");
                    }    
                    $rootScope.currentUser.riderTimes[direction][day].time = $scope.setTime([direction][day].value);
                })
            });
            user.$save();
            /*
            var alertMessage = $rootScope.currentUser.name + " has changed their time going " + [direction] + " school on " + [day] + " and has been removed from your carpool.";
            alertService.saveAlert(user.$id, alertMessage, "warning"); */
        });
    }

    /* Only used during the set function, turns time into an int value */
    $scope.setTime = function (time) {
        if (time == null || time == "") {
            return null;
        } else {
            return parseInt(time);
        }
    }

    /* Used to get a formated time back from the stored int */
    $scope.getTime = function (time) {
        if(time == null) {
            return "None";
        } else {
            var split = "";
            var hold = "";
            if (time >= 1200) {
                split = 'PM';
            } else {
                split = 'AM';
            }
            if (time >= 1300) {
                time = time - 1200;
            }
            time = time.toString();
            hold = time.substring(0,time.length-2) + ":";
            hold = hold + time.substring(time.length-2,time.length) + " " + split;
            return hold;
        }
    }

    $scope.getDriver = function (driverID) {
        if (driverID == null) {
            return "None";
        } else {
            var driver = userService.getUser(driverID).$loaded(function(driver) {
                $scope.driver = driver;
            });
        return $scope.driver.name;
        }
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