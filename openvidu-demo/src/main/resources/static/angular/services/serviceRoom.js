/*
 * @author Raquel Díaz González
 */

openVidu_room.service('ServiceRoom', function () {

    var openVidu;
    var roomName;
    var userName;
    var localStream;
    var filterRequestParam;

    this.getOpenVidu = function () {
        return openVidu;
    };

    this.getRoomName = function () {
        return roomName;
    };

    this.setOpenVidu = function (value) {
        openVidu = value;
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

    this.closeOpenVidu = function () {
       if (openVidu && openVidu instanceof OpenVidu) {
           openVidu.close();
       } else {
           console.log('OpenVidu instance is not set');
       }
    };

    this.getFilterRequestParam = function () {
        return filterRequestParam;
    };

    this.setFilterRequestParam = function (value) {
        filterRequestParam = value;
    };
});
