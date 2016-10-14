var openVidu_room = angular.module('openVidu_room', ['ngRoute', 'FBAngular', 'lumx', 'angular-clipboard']);

openVidu_room.config(['$routeProvider', function ($routeProvider) {
   $routeProvider
        .when('/', {
            templateUrl: 'angular/login/login.html',
            controller: 'loginController'
        })
        .when('/login', {
            templateUrl: 'angular/login/login.html',
            controller: 'loginController'
        })
        .when('/rooms/:existingRoomName', {
            templateUrl: 'angular/login/login.html',
            controller: 'loginController'
        })
        .when('/call', {
            templateUrl: 'angular/call/call.html',
            controller: 'callController',
            resolve: {
                factory: checkRouting
            }
        })
        .otherwise('/'); //redirect to login
}]);

var checkRouting= function ($rootScope, $location) {
   if ($rootScope.isParticipant) {
       return true;
   } else {
       console.log('Not a participant, routing to login');
       $location.path($rootScope.contextpath + '/');
       return false;
   }
};