/**
 * Created by cleme_000 on 11/10/2014.
 */
angular.module('app', [
    'angular-websocket',
    'controllers'
])
    .config(function(WebSocketProvider){
        WebSocketProvider
            .prefix('')
            .uri('ws:localhost:3000');
    });

angular.module('controllers', [])
    .controller('MainCtrl', function($scope, WebSocket) {

        WebSocket.onopen(function() {
            console.log('connection');
            WebSocket.send('message')
        });

        WebSocket.onmessage(function(event) {
            console.log('message: ', event.data);
        });



    });