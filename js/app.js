'use strict';

const miles_to_meters = 1609.34;

var map = L.map('map').setView([47.6550, -122.3080], 10);
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.outdoors',
    accessToken: 'pk.eyJ1IjoibHVpc25hcmFuam83MzMiLCJhIjoiY2lmeDVra3Q1M3A0Z3U2a3N3d2JzNXFicCJ9.nLZGt1FxRVUxOUL-_1wrIg'
}).addTo(map);

var carpoolApp = angular.module('carpoolApp', []);

carpoolApp.controller('carpoolCtrl', ['$scope', '$http', function($scope, $http) {
    $scope.greeting = "Hello, World!";
    $scope.latitude = 47.752629;
    $scope.longitude = -122.285041;
    var center = L.circleMarker([$scope.latitude, $scope.longitude]);
    $scope.radius = 1;

    var circle = L.circle([$scope.latitude, $scope.longitude], $scope.radius * miles_to_meters).addTo(map);
  
    map.on('click', function(e) {
        $scope.latitude = e.latlng.lat;
        $scope.longitude = e.latlng.lng;
        circle.setLatLng(e.latlng);
    })
    
    $http.get('data/marker_coordinates.json').then(function(response) {
        response.data.forEach(function(coordinate) {
            var marker = L.marker([coordinate.lat, coordinate.lng]);
            marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();
            marker.addTo(map);
        })
    })

    $scope.update_radius = function() {
        circle.setRadius($scope.radius * miles_to_meters);
    }

}]);
