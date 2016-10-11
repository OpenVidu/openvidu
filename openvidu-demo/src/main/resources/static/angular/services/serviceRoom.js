/*
 * @author Raquel Díaz González
 */

kurento_room.service('ServiceRoom', function () {

    var kurento;
    var roomName;
    var userName;
    var localStream;
    var filterRequestParam;

    this.getKurento = function () {
        return kurento;
    };

    this.getRoomName = function () {
        return roomName;
    };

    this.setKurento = function (value) {
        kurento = value;
    };

    this.setRoomName = function (value) {
        roomName = value;
    };

    this.getLocalStream = function () {
        return localStream;
    };

    this.setLocalStream = function (value) {
        localStream = value;
    };

    this.getUserName = function () {
        return userName;
    };

    this.setUserName = function (value) {
        userName = value;
    };

    this.closeKurento = function () {
       if (kurento && kurento instanceof KurentoRoom) {
           kurento.close();
       } else {
           console.log('KurentoRoom instance is not set');
       }
    };

    this.getFilterRequestParam = function () {
        return filterRequestParam;
    };

    this.setFilterRequestParam = function (value) {
        filterRequestParam = value;
    };
});
