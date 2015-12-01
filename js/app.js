'use strict';

// conversion factor between meters/miles
// meters = miles * const
// miles  = meters / const
const meters_miles_const = 1609.34;

var map = L.map('map').setView([47.745169, -122.288939], 11);
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

var carpoolApp = angular.module('carpoolApp', []);

carpoolApp.controller('carpoolCtrl', ['$scope', '$http',  function($scope, $http) {
    $scope.latitude = 47.752629;
    $scope.longitude = -122.285041;
    var center = L.circleMarker([$scope.latitude, $scope.longitude]);
    $scope.radius = 2;

    var circle = L.circle([$scope.latitude, $scope.longitude], $scope.radius * meters_miles_const).addTo(map);
    
    // Lat, long of circle
    var circle_lat_long = circle.getLatLng();

    // Create an event listener while mouse is being held down on the circle
    circle.on('mousedown', function(mousedown_event) {
        map.on('mousemove', function(mousemove_event) {
            circle.setLatLng(mousemove_event.latlng);
            $scope.latitude = mousemove_event.latlng.lat;
            $scope.longitude = mousemove_event.latlng.lng;
            // this is needed since $scope is modified outside of angular context
            // otherwise scope changes would not be noticed, so manually apply them
            $scope.$apply();
 
            // highlights markers within radius of circle
            // dims all others
            filter_markers(circle);
        })
    });

    // remove event listener when mouse is removed
    map.on('mouseup', function(e) {
        map.removeEventListener('mousemove');
    })
    
    $http.get('data/marker_coordinates.json').then(function(response) {
        response.data.forEach(function(coordinate) {
            var marker = L.marker([coordinate.lat, coordinate.lng], {opacity: 0.6});
            marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();
            marker.addTo(rider_markers);
        });
        rider_markers.addTo(map)
        filter_markers(circle);
    })

    $scope.update_radius = function() {
        circle.setRadius($scope.radius * meters_miles_const);
        filter_markers(circle);
    }

}]);
