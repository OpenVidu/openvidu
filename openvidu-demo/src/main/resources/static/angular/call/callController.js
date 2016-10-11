/*
 * @author Micael Gallego (micael.gallego@gmail.com)
 * @author Raquel Díaz González
 */

kurento_room.controller('callController', function ($scope, $window, ServiceParticipant, ServiceRoom, Fullscreen, LxNotificationService) {

    $scope.roomName = ServiceRoom.getRoomName();
    $scope.userName = ServiceRoom.getUserName();
    $scope.participants = ServiceParticipant.getParticipants();
    $scope.kurento = ServiceRoom.getKurento();
    $scope.filter = ServiceRoom.getFilterRequestParam();

    $scope.leaveRoom = function () {

        ServiceRoom.closeKurento();

        ServiceParticipant.removeParticipants();

        //redirect to login
        $window.location.href = '#/login';
    };

    window.onbeforeunload = function () {
        //not necessary if not connected
        if (ServiceParticipant.isConnected()) {
            ServiceRoom.closeKurento();
        }
    };

    $scope.$on("$locationChangeStart", function () {
        console.log("Changed location to: " + document.location);
        if (ServiceParticipant.isConnected()) {
            ServiceRoom.closeKurento();
            ServiceParticipant.removeParticipants();
        }
    });

    $scope.goFullscreen = function () {

        if (Fullscreen.isEnabled())
            Fullscreen.cancel();
        else
            Fullscreen.all();

    };

    $scope.disableMainSpeaker = function (value) {

        var element = document.getElementById("buttonMainSpeaker");
        if (element.classList.contains("md-person")) { //on
            element.classList.remove("md-person");
            element.classList.add("md-recent-actors");
            ServiceParticipant.enableMainSpeaker();
        } else { //off
            element.classList.remove("md-recent-actors");
            element.classList.add("md-person");
            ServiceParticipant.disableMainSpeaker();
        }
    }

    $scope.onOffVolume = function () {
        var localStream = ServiceRoom.getLocalStream();
        var element = document.getElementById("buttonVolume");
        if (element.classList.contains("md-volume-off")) { //on
            element.classList.remove("md-volume-off");
            element.classList.add("md-volume-up");
            localStream.audioEnabled = true;
        } else { //off
            element.classList.remove("md-volume-up");
            element.classList.add("md-volume-off");
            localStream.audioEnabled = false;

        }
    };

    $scope.onOffVideocam = function () {
        var localStream = ServiceRoom.getLocalStream();
        var element = document.getElementById("buttonVideocam");
        if (element.classList.contains("md-videocam-off")) {//on
            element.classList.remove("md-videocam-off");
            element.classList.add("md-videocam");
            localStream.videoEnabled = true;
        } else {//off
            element.classList.remove("md-videocam");
            element.classList.add("md-videocam-off");
            localStream.videoEnabled = false;
        }
    };

    $scope.disconnectStream = function () {
        var localStream = ServiceRoom.getLocalStream();
        var participant = ServiceParticipant.getMainParticipant();
        if (!localStream || !participant) {
            LxNotificationService.alert('Error!', "Not connected yet", 'Ok', function (answer) {
            });
            return false;
        }
        ServiceParticipant.disconnectParticipant(participant);
        ServiceRoom.getKurento().disconnectParticipant(participant.getStream());
    }

    //chat
    $scope.message;

    $scope.sendMessage = function () {
        console.log("Sending message", $scope.message);
        var kurento = ServiceRoom.getKurento();
        kurento.sendMessage($scope.roomName, $scope.userName, $scope.message);
        $scope.message = "";
    };

    //open or close chat when click in chat button
    $scope.toggleChat = function () {
        var selectedEffect = "slide";
        // most effect types need no options passed by default
        var options = {direction: "right"};
        if ($("#effect").is(':visible')) {
            $("#content").animate({width: '100%'}, 500);
        } else {
            $("#content").animate({width: '80%'}, 500);
        }
        // run the effect
        $("#effect").toggle(selectedEffect, options, 500);
    };

    var style = {
        hat: {
            "-1": "btn--indigo md-mood",
            "0": "btn--amber md-face-unlock"
        },
        marker: {
            "-1": "btn--indigo md-grid-off",
            "0": "btn--amber md-grid-on",
            "1": "btn--red md-grid-on"
        }
    };

    $scope.filterIndex = "-1"; //off
    $scope.filterState;
    $scope.filterStyle;
    updateFilterValues();

    function updateFilterValues() {
        $scope.filterState = parseInt($scope.filterIndex) < 0 ? "off" : "on";
        $scope.filterStyle = style[$scope.filter][$scope.filterIndex];
    }

    $scope.applyFilter = function () {
        var reqParams = {};
        if ($scope.filter === "marker") {
            reqParams[$scope.filter] = parseInt($scope.filterIndex);
        } else {
            if (parseInt($scope.filterIndex) < 0) { //off -> on
                $scope.filterIndex = "0";
                reqParams[$scope.filter] = true;
            } else { //on -> off
                $scope.filterIndex = "-1";
                reqParams[$scope.filter] = false;
            }
        }

        ServiceRoom.getKurento().sendCustomRequest(reqParams, function (error, response) {
            if (error) {
                console.error("Unable to toggle filter, currently " +
                    $scope.filterState, error);
                LxNotificationService.alert('Error!',
                    "Unable to toggle filter, currently " + $scope.filterState,
                    'Ok', function (answer) {
                    });
                return false;
            } else {
                if ($scope.filter === "marker") {
                    return;
                }

                updateFilterValues();
                console.log("Toggled filter " + $scope.filterState + " (idx " +
                    $scope.filterIndex + ")");
            }
        });
    };

    ServiceParticipant.addEventListener("marker-filter-status-changed", function (status) {
        console.log("Filter status changed", status);
        if ($scope.filter === "marker") {
            $scope.filterIndex = status;
            updateFilterValues();
            $scope.$apply();
        }
    });
});


