webpackJsonp(["main"],{

/***/ "../../../../../src/$$_lazy_route_resource lazy recursive":
/***/ (function(module, exports) {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncatched exception popping up in devtools
	return Promise.resolve().then(function() {
		throw new Error("Cannot find module '" + req + "'.");
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = "../../../../../src/$$_lazy_route_resource lazy recursive";

/***/ }),

/***/ "../../../../../src/app/app.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/app.component.html":
/***/ (function(module, exports) {

module.exports = "<main>\n  <router-outlet></router-outlet>\n</main>"

/***/ }),

/***/ "../../../../../src/app/app.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_app_services_info_service__ = __webpack_require__("../../../../../src/app/services/info.service.ts");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var AppComponent = (function () {
    function AppComponent(infoService) {
        this.infoService = infoService;
    }
    AppComponent.prototype.ngOnInit = function () {
        var _this = this;
        var protocol = location.protocol.includes('https') ? 'wss://' : 'ws://';
        var port = (location.port) ? (':' + location.port) : '';
        this.websocket = new WebSocket(protocol + location.hostname + port + '/info');
        this.websocket.onopen = function (event) {
            console.log('Info websocket connected');
        };
        this.websocket.onclose = function (event) {
            console.log('Info websocket closed');
        };
        this.websocket.onerror = function (event) {
            console.log('Info websocket error');
        };
        this.websocket.onmessage = function (event) {
            console.log('Info websocket message');
            console.log(event.data);
            _this.infoService.updateInfo(event.data);
        };
    };
    AppComponent.prototype.ngOnDestroy = function () {
        this.websocket.close();
    };
    AppComponent.prototype.beforeUnloadHander = function (event) {
        console.warn('Closing info websocket');
        this.websocket.close();
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["A" /* HostListener */])('window:beforeunload', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], AppComponent.prototype, "beforeUnloadHander", null);
    AppComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["n" /* Component */])({
            selector: 'app-root',
            template: __webpack_require__("../../../../../src/app/app.component.html"),
            styles: [__webpack_require__("../../../../../src/app/app.component.css")]
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_app_services_info_service__["a" /* InfoService */]])
    ], AppComponent);
    return AppComponent;
}());



/***/ }),

/***/ "../../../../../src/app/app.material.module.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppMaterialModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__ = __webpack_require__("../../../platform-browser/esm5/animations.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_material__ = __webpack_require__("../../../material/esm5/material.es5.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};



var AppMaterialModule = (function () {
    function AppMaterialModule() {
    }
    AppMaterialModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["K" /* NgModule */])({
            imports: [
                __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__["a" /* BrowserAnimationsModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["a" /* MatButtonModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["f" /* MatIconModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["c" /* MatCheckboxModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["b" /* MatCardModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["g" /* MatInputModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["i" /* MatProgressSpinnerModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["k" /* MatTooltipModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["e" /* MatDialogModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["j" /* MatSlideToggleModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["h" /* MatListModule */]
            ],
            exports: [
                __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_animations__["a" /* BrowserAnimationsModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["a" /* MatButtonModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["f" /* MatIconModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["c" /* MatCheckboxModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["b" /* MatCardModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["g" /* MatInputModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["i" /* MatProgressSpinnerModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["k" /* MatTooltipModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["e" /* MatDialogModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["j" /* MatSlideToggleModule */],
                __WEBPACK_IMPORTED_MODULE_2__angular_material__["h" /* MatListModule */]
            ],
        })
    ], AppMaterialModule);
    return AppMaterialModule;
}());



/***/ }),

/***/ "../../../../../src/app/app.module.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AppModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_platform_browser__ = __webpack_require__("../../../platform-browser/esm5/platform-browser.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_flex_layout__ = __webpack_require__("../../../flex-layout/esm5/flex-layout.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__angular_forms__ = __webpack_require__("../../../forms/esm5/forms.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__angular_http__ = __webpack_require__("../../../http/esm5/http.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_hammerjs__ = __webpack_require__("../../../../hammerjs/hammer.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_hammerjs___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_hammerjs__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__app_routing__ = __webpack_require__("../../../../../src/app/app.routing.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_app_app_material_module__ = __webpack_require__("../../../../../src/app/app.material.module.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__services_info_service__ = __webpack_require__("../../../../../src/app/services/info.service.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__app_component__ = __webpack_require__("../../../../../src/app/app.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__components_dashboard_dashboard_component__ = __webpack_require__("../../../../../src/app/components/dashboard/dashboard.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__components_session_details_session_details_component__ = __webpack_require__("../../../../../src/app/components/session-details/session-details.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__ = __webpack_require__("../../../../../src/app/components/dashboard/credentials-dialog.component.ts");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};













var AppModule = (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_2__angular_core__["K" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_9__app_component__["a" /* AppComponent */],
                __WEBPACK_IMPORTED_MODULE_10__components_dashboard_dashboard_component__["a" /* DashboardComponent */],
                __WEBPACK_IMPORTED_MODULE_11__components_session_details_session_details_component__["a" /* SessionDetailsComponent */],
                __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__["a" /* CredentialsDialogComponent */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_0__angular_platform_browser__["a" /* BrowserModule */],
                __WEBPACK_IMPORTED_MODULE_3__angular_forms__["c" /* FormsModule */],
                __WEBPACK_IMPORTED_MODULE_4__angular_http__["a" /* HttpModule */],
                __WEBPACK_IMPORTED_MODULE_6__app_routing__["a" /* routing */],
                __WEBPACK_IMPORTED_MODULE_7_app_app_material_module__["a" /* AppMaterialModule */],
                __WEBPACK_IMPORTED_MODULE_1__angular_flex_layout__["a" /* FlexLayoutModule */]
            ],
            entryComponents: [
                __WEBPACK_IMPORTED_MODULE_12__components_dashboard_credentials_dialog_component__["a" /* CredentialsDialogComponent */],
            ],
            providers: [__WEBPACK_IMPORTED_MODULE_8__services_info_service__["a" /* InfoService */]],
            bootstrap: [__WEBPACK_IMPORTED_MODULE_9__app_component__["a" /* AppComponent */]]
        })
    ], AppModule);
    return AppModule;
}());



/***/ }),

/***/ "../../../../../src/app/app.routing.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return routing; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_router__ = __webpack_require__("../../../router/esm5/router.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_app_components_dashboard_dashboard_component__ = __webpack_require__("../../../../../src/app/components/dashboard/dashboard.component.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_app_components_session_details_session_details_component__ = __webpack_require__("../../../../../src/app/components/session-details/session-details.component.ts");



var appRoutes = [
    {
        path: '',
        component: __WEBPACK_IMPORTED_MODULE_1_app_components_dashboard_dashboard_component__["a" /* DashboardComponent */]
    },
    {
        path: 'session/:id',
        component: __WEBPACK_IMPORTED_MODULE_2_app_components_session_details_session_details_component__["a" /* SessionDetailsComponent */]
    }
];
var routing = __WEBPACK_IMPORTED_MODULE_0__angular_router__["a" /* RouterModule */].forRoot(appRoutes);


/***/ }),

/***/ "../../../../../src/app/components/dashboard/credentials-dialog.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CredentialsDialogComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var CredentialsDialogComponent = (function () {
    function CredentialsDialogComponent() {
    }
    CredentialsDialogComponent.prototype.testVideo = function () {
        this.myReference.close(this.secret);
    };
    CredentialsDialogComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["n" /* Component */])({
            selector: 'app-credentials-dialog',
            template: "\n        <div>\n            <h1 mat-dialog-title>\n                Insert your secret\n            </h1>\n            <form #dialogForm (ngSubmit)=\"testVideo()\">\n                <mat-dialog-content>\n                    <mat-input-container>\n                        <input matInput name=\"secret\" type=\"password\" [(ngModel)]=\"secret\">\n                    </mat-input-container>\n                </mat-dialog-content>\n                <mat-dialog-actions>\n                    <button mat-button mat-dialog-close>CANCEL</button>\n                    <button mat-button id=\"join-btn\" type=\"submit\">TEST</button>\n                </mat-dialog-actions>\n            </form>\n        </div>\n    ",
            styles: ["\n        #quality-div {\n            margin-top: 20px;\n        }\n        #join-div {\n            margin-top: 25px;\n            margin-bottom: 20px;\n        }\n        #quality-tag {\n            display: block;\n        }\n        h5 {\n            margin-bottom: 10px;\n            text-align: left;\n        }\n        #joinWithVideo {\n            margin-right: 50px;\n        }\n        mat-dialog-actions {\n            display: block;\n        }\n        #join-btn {\n            float: right;\n        }\n    "],
        }),
        __metadata("design:paramtypes", [])
    ], CredentialsDialogComponent);
    return CredentialsDialogComponent;
}());



/***/ }),

/***/ "../../../../../src/app/components/dashboard/dashboard.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "#dashboard-div {\n  padding: 20px;\n}\n\n#log {\n  height: 90%;\n}\n\n#log-content {\n  height: 90%;\n  font-family: Consolas, 'Liberation Mono', Menlo, Courier, monospace;\n  overflow-y: auto;\n  overflow-x: hidden\n}\n\nul {\n  margin: 0;\n}\n\n#test-btn {\n  text-transform: uppercase;\n  float: right;\n}\n\nmat-card-title button.blue {\n  color: #ffffff;\n  background-color: #0088aa;\n}\n\nmat-card-title button.yellow {\n  color: rgba(0, 0, 0, 0.87);\n  background-color: #ffcc00;\n}\n\nmat-spinner {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tick-div {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tooltip-tick {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  z-index: 2;\n}\n\n.circ {\n  opacity: 0;\n  stroke-dasharray: 130;\n  stroke-dashoffset: 130;\n  transition: all 1s;\n}\n\n.tick {\n  stroke-dasharray: 50;\n  stroke-dashoffset: 50;\n  transition: stroke-dashoffset 1s 0.5s ease-out;\n}\n\n.drawn+svg .path {\n  opacity: 1;\n  stroke-dashoffset: 0;\n}\n\n#mirrored-video {\n  position: relative;\n}\n\n\n/* Pure CSS loader */\n\n#loader {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n  transform: translate(-50%, -50%);\n}\n\n#loader * {\n  box-sizing: border-box;\n}\n\n#loader ::after {\n  box-sizing: border-box;\n}\n\n#loader ::before {\n  box-sizing: border-box;\n}\n\n.loader-1 {\n  height: 100px;\n  width: 100px;\n  -webkit-animation: loader-1-1 4.8s linear infinite;\n  animation: loader-1-1 4.8s linear infinite;\n}\n\n@-webkit-keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n  }\n}\n\n@keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n            transform: rotate(360deg);\n  }\n}\n\n.loader-1 span {\n  display: block;\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  -webkit-animation: loader-1-2 1.2s linear infinite;\n  animation: loader-1-2 1.2s linear infinite;\n}\n\n@-webkit-keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n  }\n}\n\n@keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n            transform: rotate(220deg);\n  }\n}\n\n.loader-1 span::after {\n  content: \"\";\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  border: 8px solid #4d4d4d;\n  border-radius: 50%;\n  -webkit-animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n  animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n}\n\n@-webkit-keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n  }\n}\n\n@keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n            transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n            transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n            transform: rotate(140deg);\n  }\n}", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/components/dashboard/dashboard.component.html":
/***/ (function(module, exports) {

module.exports = "<div id=\"dashboard-div\" fxLayout=\"row\" fxLayout.xs=\"column\" fxLayoutGap=\"20px\" fxFlexFill>\n\n  <div fxLayout=\"column\" fxFlex=\"66%\" fxFlexOrder=\"1\" fxFlexOrder.xs=\"2\">\n    <mat-card id=\"log\">\n      <mat-card-title>Server events\n        <mat-slide-toggle title=\"Lock Scroll\" [(ngModel)]=\"lockScroll\" style=\"float: right; margin-left: auto;\">\n          <mat-icon>lock_outline</mat-icon>\n        </mat-slide-toggle>\n      </mat-card-title>\n      <mat-divider></mat-divider>\n      <mat-card-content #scrollMe id=\"log-content\">\n        <ul>\n          <li *ngFor=\"let i of info\">\n            <p>{{i}}</p>\n          </li>\n        </ul>\n      </mat-card-content>\n    </mat-card>\n  </div>\n\n  <div fxLayout=\"column\" fxFlex=\"33%\" fxFlexOrder=\"2\" fxFlexOrder.xs=\"1\">\n    <mat-card id=\"video-loop\">\n      <mat-card-title>Test the connection\n        <button id=\"test-btn\" mat-raised-button [ngClass]=\"testStatus == 'DISCONNECTED' ? 'blue' : (testStatus == 'PLAYING' ? 'yellow' : 'disabled')\" (click)=\"toggleTestVideo()\" [disabled]=\"testStatus==='CONNECTING' || testStatus==='CONNECTED'\">{{testButton}}</button>\n      </mat-card-title>\n      <mat-card-content>\n        <div id=\"mirrored-video\">\n          <div *ngIf=\"showSpinner\" id=\"loader\">\n            <div class=\"loader-1 center\"><span></span></div>\n          </div>\n          <div *ngIf=\"session\" id=\"tick-div\">\n            <div id=\"tooltip-tick\" *ngIf=\"testStatus=='PLAYING'\" matTooltip=\"The connection is successful\" matTooltipPosition=\"below\"></div>\n            <div [ngClass]=\"testStatus=='PLAYING' ? 'trigger drawn' : 'trigger'\"></div>\n            <svg version=\"1.1\" id=\"tick\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n              viewBox=\"-1 -1 39 39\" style=\"enable-background:new 0 0 37 37;\" xml:space=\"preserve\">\n              <path class=\"circ path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" d=\"\n\tM30.5,6.5L30.5,6.5c6.6,6.6,6.6,17.4,0,24l0,0c-6.6,6.6-17.4,6.6-24,0l0,0c-6.6-6.6-6.6-17.4,0-24l0,0C13.1-0.2,23.9-0.2,30.5,6.5z\"\n              />\n              <polyline class=\"tick path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" points=\"\n\t11.6,20 15.9,24.2 26.4,13.8 \" />\n            </svg>\n          </div>\n        </div>\n        <div id=\"msg-chain\"><p *ngFor=\"let msg of msgChain\">{{msg}}</p></div>\n      </mat-card-content>\n    </mat-card>\n  </div>\n</div>\n"

/***/ }),

/***/ "../../../../../src/app/components/dashboard/dashboard.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return DashboardComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_material__ = __webpack_require__("../../../material/esm5/material.es5.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__services_info_service__ = __webpack_require__("../../../../../src/app/services/info.service.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_openvidu_browser__ = __webpack_require__("../../../../openvidu-browser/lib/OpenVidu/index.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_openvidu_browser___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_openvidu_browser__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__credentials_dialog_component__ = __webpack_require__("../../../../../src/app/components/dashboard/credentials-dialog.component.ts");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};





var DashboardComponent = (function () {
    function DashboardComponent(infoService, dialog) {
        var _this = this;
        this.infoService = infoService;
        this.dialog = dialog;
        this.lockScroll = false;
        this.info = [];
        this.testStatus = 'DISCONNECTED';
        this.testButton = 'Test';
        this.tickClass = 'trigger';
        this.showSpinner = false;
        this.msgChain = [];
        // Subscription to info updated event raised by InfoService
        this.infoSubscription = this.infoService.newInfo$.subscribe(function (info) {
            _this.info.push(info);
            _this.scrollToBottom();
        });
    }
    DashboardComponent.prototype.ngOnInit = function () {
    };
    DashboardComponent.prototype.beforeunloadHandler = function () {
        // On window closed leave test session
        if (this.session) {
            this.endTestVideo();
        }
    };
    DashboardComponent.prototype.ngOnDestroy = function () {
        // On component destroyed leave test session
        if (this.session) {
            this.endTestVideo();
        }
    };
    DashboardComponent.prototype.toggleTestVideo = function () {
        if (!this.session) {
            this.testVideo();
        }
        else {
            this.endTestVideo();
        }
    };
    DashboardComponent.prototype.testVideo = function () {
        var _this = this;
        var dialogRef;
        dialogRef = this.dialog.open(__WEBPACK_IMPORTED_MODULE_4__credentials_dialog_component__["a" /* CredentialsDialogComponent */]);
        dialogRef.componentInstance.myReference = dialogRef;
        dialogRef.afterClosed().subscribe(function (secret) {
            if (secret) {
                var port = (location.port) ? location.port : '8443';
                _this.connectToSession('wss://' + location.hostname + ':' + port + '/testSession?secret=' + secret);
            }
        });
    };
    DashboardComponent.prototype.connectToSession = function (mySessionId) {
        var _this = this;
        this.msgChain = [];
        var OV = new __WEBPACK_IMPORTED_MODULE_3_openvidu_browser__["OpenVidu"]();
        this.session = OV.initSession(mySessionId);
        this.testStatus = 'CONNECTING';
        this.testButton = 'Testing...';
        this.session.connect('token', function (error) {
            if (!error) {
                _this.testStatus = 'CONNECTED';
                var publisherRemote = OV.initPublisher('mirrored-video', {
                    audio: true,
                    video: true,
                    audioActive: true,
                    videoActive: true,
                    quality: 'MEDIUM'
                });
                publisherRemote.on('accessAllowed', function () {
                    _this.msgChain.push('Camera access allowed');
                });
                publisherRemote.on('accessDenied', function () {
                    _this.endTestVideo();
                    _this.msgChain.push('Camera access denied');
                });
                publisherRemote.on('videoElementCreated', function (video) {
                    _this.showSpinner = true;
                    _this.msgChain.push('Video element created');
                });
                publisherRemote.on('remoteVideoPlaying', function (video) {
                    _this.msgChain.push('Remote video playing');
                    _this.testButton = 'End test';
                    _this.testStatus = 'PLAYING';
                    _this.showSpinner = false;
                });
                publisherRemote.subscribeToRemote();
                _this.session.publish(publisherRemote);
            }
            else {
                if (error.code === 401) {
                    _this.endTestVideo();
                    var dialogRef = void 0;
                    dialogRef = _this.dialog.open(__WEBPACK_IMPORTED_MODULE_4__credentials_dialog_component__["a" /* CredentialsDialogComponent */]);
                    dialogRef.componentInstance.myReference = dialogRef;
                    dialogRef.afterClosed().subscribe(function (secret) {
                        if (secret) {
                            _this.connectToSession('wss://' + location.hostname + ':8443/testSession?secret=' + secret);
                        }
                    });
                }
                else {
                    console.error(error);
                }
            }
        });
    };
    DashboardComponent.prototype.endTestVideo = function () {
        this.session.disconnect();
        this.session = null;
        this.testStatus = 'DISCONNECTED';
        this.testButton = 'Test';
        this.showSpinner = false;
        this.info = [];
        this.msgChain = [];
    };
    DashboardComponent.prototype.scrollToBottom = function () {
        try {
            if (!this.lockScroll) {
                this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
            }
        }
        catch (err) {
            console.error('[Error]:' + err.toString());
        }
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_12" /* ViewChild */])('scrollMe'),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_0__angular_core__["u" /* ElementRef */])
    ], DashboardComponent.prototype, "myScrollContainer", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["A" /* HostListener */])('window:beforeunload'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], DashboardComponent.prototype, "beforeunloadHandler", null);
    DashboardComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["n" /* Component */])({
            selector: 'app-dashboard',
            template: __webpack_require__("../../../../../src/app/components/dashboard/dashboard.component.html"),
            styles: [__webpack_require__("../../../../../src/app/components/dashboard/dashboard.component.css")],
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2__services_info_service__["a" /* InfoService */], __WEBPACK_IMPORTED_MODULE_1__angular_material__["d" /* MatDialog */]])
    ], DashboardComponent);
    return DashboardComponent;
}());



/***/ }),

/***/ "../../../../../src/app/components/session-details/session-details.component.css":
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__("../../../../css-loader/lib/css-base.js")(false);
// imports


// module
exports.push([module.i, "", ""]);

// exports


/*** EXPORTS FROM exports-loader ***/
module.exports = module.exports.toString();

/***/ }),

/***/ "../../../../../src/app/components/session-details/session-details.component.html":
/***/ (function(module, exports) {

module.exports = "<p>\n  session-details works!\n</p>\n"

/***/ }),

/***/ "../../../../../src/app/components/session-details/session-details.component.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return SessionDetailsComponent; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var SessionDetailsComponent = (function () {
    function SessionDetailsComponent() {
    }
    SessionDetailsComponent.prototype.ngOnInit = function () {
    };
    SessionDetailsComponent = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["n" /* Component */])({
            selector: 'app-session-details',
            template: __webpack_require__("../../../../../src/app/components/session-details/session-details.component.html"),
            styles: [__webpack_require__("../../../../../src/app/components/session-details/session-details.component.css")]
        }),
        __metadata("design:paramtypes", [])
    ], SessionDetailsComponent);
    return SessionDetailsComponent;
}());



/***/ }),

/***/ "../../../../../src/app/services/info.service.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return InfoService; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_rxjs_Subject__ = __webpack_require__("../../../../rxjs/_esm5/Subject.js");
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var InfoService = (function () {
    function InfoService() {
        this.newInfo$ = new __WEBPACK_IMPORTED_MODULE_1_rxjs_Subject__["a" /* Subject */]();
    }
    InfoService.prototype.getInfo = function () {
        return this.info;
    };
    InfoService.prototype.updateInfo = function (info) {
        this.info = info;
        this.newInfo$.next(info);
    };
    InfoService = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["C" /* Injectable */])(),
        __metadata("design:paramtypes", [])
    ], InfoService);
    return InfoService;
}());



/***/ }),

/***/ "../../../../../src/environments/environment.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return environment; });
// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
var environment = {
    production: false
};


/***/ }),

/***/ "../../../../../src/main.ts":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__("../../../core/esm5/core.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_dynamic__ = __webpack_require__("../../../platform-browser-dynamic/esm5/platform-browser-dynamic.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__app_app_module__ = __webpack_require__("../../../../../src/app/app.module.ts");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__environments_environment__ = __webpack_require__("../../../../../src/environments/environment.ts");




if (__WEBPACK_IMPORTED_MODULE_3__environments_environment__["a" /* environment */].production) {
    Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_18" /* enableProdMode */])();
}
Object(__WEBPACK_IMPORTED_MODULE_1__angular_platform_browser_dynamic__["a" /* platformBrowserDynamic */])().bootstrapModule(__WEBPACK_IMPORTED_MODULE_2__app_app_module__["a" /* AppModule */]);


/***/ }),

/***/ 0:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__("../../../../../src/main.ts");


/***/ })

},[0]);
//# sourceMappingURL=main.bundle.js.map