(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"],{

/***/ "./src/$$_lazy_route_resource lazy recursive":
/*!**********************************************************!*\
  !*** ./src/$$_lazy_route_resource lazy namespace object ***!
  \**********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var e = new Error('Cannot find module "' + req + '".');
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = "./src/$$_lazy_route_resource lazy recursive";

/***/ }),

/***/ "./src/app/app.component.css":
/*!***********************************!*\
  !*** ./src/app/app.component.css ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/app.component.html":
/*!************************************!*\
  !*** ./src/app/app.component.html ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<main>\n  <router-outlet></router-outlet>\n</main>"

/***/ }),

/***/ "./src/app/app.component.ts":
/*!**********************************!*\
  !*** ./src/app/app.component.ts ***!
  \**********************************/
/*! exports provided: AppComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppComponent", function() { return AppComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var AppComponent = /** @class */ (function () {
    function AppComponent() {
    }
    AppComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-root',
            template: __webpack_require__(/*! ./app.component.html */ "./src/app/app.component.html"),
            styles: [__webpack_require__(/*! ./app.component.css */ "./src/app/app.component.css")]
        })
    ], AppComponent);
    return AppComponent;
}());



/***/ }),

/***/ "./src/app/app.material.module.ts":
/*!****************************************!*\
  !*** ./src/app/app.material.module.ts ***!
  \****************************************/
/*! exports provided: AppMaterialModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppMaterialModule", function() { return AppMaterialModule; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser/animations */ "./node_modules/@angular/platform-browser/fesm5/animations.js");
/* harmony import */ var _angular_material__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/material */ "./node_modules/@angular/material/esm5/material.es5.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};



var AppMaterialModule = /** @class */ (function () {
    function AppMaterialModule() {
    }
    AppMaterialModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["NgModule"])({
            imports: [
                _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_1__["BrowserAnimationsModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatButtonModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatIconModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatCheckboxModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatCardModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatInputModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatProgressSpinnerModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatTooltipModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatDialogModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatSlideToggleModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatListModule"]
            ],
            exports: [
                _angular_platform_browser_animations__WEBPACK_IMPORTED_MODULE_1__["BrowserAnimationsModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatButtonModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatIconModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatCheckboxModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatCardModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatInputModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatProgressSpinnerModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatTooltipModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatDialogModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatSlideToggleModule"],
                _angular_material__WEBPACK_IMPORTED_MODULE_2__["MatListModule"]
            ],
        })
    ], AppMaterialModule);
    return AppMaterialModule;
}());



/***/ }),

/***/ "./src/app/app.module.ts":
/*!*******************************!*\
  !*** ./src/app/app.module.ts ***!
  \*******************************/
/*! exports provided: AppModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppModule", function() { return AppModule; });
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/platform-browser */ "./node_modules/@angular/platform-browser/fesm5/platform-browser.js");
/* harmony import */ var _angular_flex_layout__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/flex-layout */ "./node_modules/@angular/flex-layout/esm5/flex-layout.es5.js");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_forms__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/forms */ "./node_modules/@angular/forms/fesm5/forms.js");
/* harmony import */ var _angular_http__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @angular/http */ "./node_modules/@angular/http/fesm5/http.js");
/* harmony import */ var hammerjs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! hammerjs */ "./node_modules/hammerjs/hammer.js");
/* harmony import */ var hammerjs__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(hammerjs__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _app_routing__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./app.routing */ "./src/app/app.routing.ts");
/* harmony import */ var app_app_material_module__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! app/app.material.module */ "./src/app/app.material.module.ts");
/* harmony import */ var _services_info_service__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./services/info.service */ "./src/app/services/info.service.ts");
/* harmony import */ var _services_rest_service__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./services/rest.service */ "./src/app/services/rest.service.ts");
/* harmony import */ var _app_component__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./app.component */ "./src/app/app.component.ts");
/* harmony import */ var _components_dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./components/dashboard/dashboard.component */ "./src/app/components/dashboard/dashboard.component.ts");
/* harmony import */ var _components_session_details_session_details_component__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./components/session-details/session-details.component */ "./src/app/components/session-details/session-details.component.ts");
/* harmony import */ var _components_dashboard_credentials_dialog_component__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./components/dashboard/credentials-dialog.component */ "./src/app/components/dashboard/credentials-dialog.component.ts");
/* harmony import */ var _components_layouts_layout_best_fit_layout_best_fit_component__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./components/layouts/layout-best-fit/layout-best-fit.component */ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts");
/* harmony import */ var _components_layouts_ov_video_component__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./components/layouts/ov-video.component */ "./src/app/components/layouts/ov-video.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
















var AppModule = /** @class */ (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_2__["NgModule"])({
            declarations: [
                _app_component__WEBPACK_IMPORTED_MODULE_10__["AppComponent"],
                _components_dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_11__["DashboardComponent"],
                _components_session_details_session_details_component__WEBPACK_IMPORTED_MODULE_12__["SessionDetailsComponent"],
                _components_dashboard_credentials_dialog_component__WEBPACK_IMPORTED_MODULE_13__["CredentialsDialogComponent"],
                _components_layouts_layout_best_fit_layout_best_fit_component__WEBPACK_IMPORTED_MODULE_14__["LayoutBestFitComponent"],
                _components_layouts_ov_video_component__WEBPACK_IMPORTED_MODULE_15__["OpenViduVideoComponent"],
            ],
            imports: [
                _angular_platform_browser__WEBPACK_IMPORTED_MODULE_0__["BrowserModule"],
                _angular_forms__WEBPACK_IMPORTED_MODULE_3__["FormsModule"],
                _angular_http__WEBPACK_IMPORTED_MODULE_4__["HttpModule"],
                _app_routing__WEBPACK_IMPORTED_MODULE_6__["routing"],
                app_app_material_module__WEBPACK_IMPORTED_MODULE_7__["AppMaterialModule"],
                _angular_flex_layout__WEBPACK_IMPORTED_MODULE_1__["FlexLayoutModule"]
            ],
            entryComponents: [
                _components_dashboard_credentials_dialog_component__WEBPACK_IMPORTED_MODULE_13__["CredentialsDialogComponent"],
            ],
            providers: [_services_info_service__WEBPACK_IMPORTED_MODULE_8__["InfoService"], _services_rest_service__WEBPACK_IMPORTED_MODULE_9__["RestService"]],
            bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_10__["AppComponent"]]
        })
    ], AppModule);
    return AppModule;
}());



/***/ }),

/***/ "./src/app/app.routing.ts":
/*!********************************!*\
  !*** ./src/app/app.routing.ts ***!
  \********************************/
/*! exports provided: routing */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "routing", function() { return routing; });
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm5/router.js");
/* harmony import */ var app_components_dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! app/components/dashboard/dashboard.component */ "./src/app/components/dashboard/dashboard.component.ts");
/* harmony import */ var app_components_session_details_session_details_component__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! app/components/session-details/session-details.component */ "./src/app/components/session-details/session-details.component.ts");
/* harmony import */ var app_components_layouts_layout_best_fit_layout_best_fit_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! app/components/layouts/layout-best-fit/layout-best-fit.component */ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts");




var appRoutes = [
    {
        path: '',
        component: app_components_dashboard_dashboard_component__WEBPACK_IMPORTED_MODULE_1__["DashboardComponent"],
        pathMatch: 'full'
    },
    {
        path: 'session/:sessionId',
        component: app_components_session_details_session_details_component__WEBPACK_IMPORTED_MODULE_2__["SessionDetailsComponent"],
        pathMatch: 'full'
    },
    {
        path: 'layout-best-fit/:sessionId/:secret',
        component: app_components_layouts_layout_best_fit_layout_best_fit_component__WEBPACK_IMPORTED_MODULE_3__["LayoutBestFitComponent"],
        pathMatch: 'full'
    }
];
var routing = _angular_router__WEBPACK_IMPORTED_MODULE_0__["RouterModule"].forRoot(appRoutes, { useHash: true });


/***/ }),

/***/ "./src/app/components/dashboard/credentials-dialog.component.ts":
/*!**********************************************************************!*\
  !*** ./src/app/components/dashboard/credentials-dialog.component.ts ***!
  \**********************************************************************/
/*! exports provided: CredentialsDialogComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CredentialsDialogComponent", function() { return CredentialsDialogComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var CredentialsDialogComponent = /** @class */ (function () {
    function CredentialsDialogComponent() {
    }
    CredentialsDialogComponent.prototype.testVideo = function () {
        this.myReference.close(this.secret);
    };
    CredentialsDialogComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-credentials-dialog',
            template: "\n        <div>\n            <h1 mat-dialog-title>\n                Insert your secret\n            </h1>\n            <form #dialogForm (ngSubmit)=\"testVideo()\">\n                <mat-dialog-content>\n                    <mat-form-field>\n                        <input matInput name=\"secret\" type=\"password\" [(ngModel)]=\"secret\" required>\n                    </mat-form-field>\n                </mat-dialog-content>\n                <mat-dialog-actions>\n                    <button mat-button mat-dialog-close>CANCEL</button>\n                    <button mat-button id=\"join-btn\" type=\"submit\">TEST</button>\n                </mat-dialog-actions>\n            </form>\n        </div>\n    ",
            styles: ["\n        #quality-div {\n            margin-top: 20px;\n        }\n        #join-div {\n            margin-top: 25px;\n            margin-bottom: 20px;\n        }\n        #quality-tag {\n            display: block;\n        }\n        h5 {\n            margin-bottom: 10px;\n            text-align: left;\n        }\n        #joinWithVideo {\n            margin-right: 50px;\n        }\n        mat-dialog-actions {\n            display: block;\n        }\n        #join-btn {\n            float: right;\n        }\n    "],
        }),
        __metadata("design:paramtypes", [])
    ], CredentialsDialogComponent);
    return CredentialsDialogComponent;
}());



/***/ }),

/***/ "./src/app/components/dashboard/dashboard.component.css":
/*!**************************************************************!*\
  !*** ./src/app/components/dashboard/dashboard.component.css ***!
  \**************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "#dashboard-div {\n  height: 100%;\n  padding: 20px;\n}\n\n#log {\n  height: 90%;\n}\n\n#log-content {\n  height: 90%;\n  font-family: Consolas, 'Liberation Mono', Menlo, Courier, monospace;\n  overflow-y: auto;\n  overflow-x: hidden\n}\n\nul {\n  margin: 0;\n}\n\n#test-btn {\n  text-transform: uppercase;\n}\n\nmat-card-title button.blue {\n  color: #ffffff;\n  background-color: #0088aa;\n}\n\nmat-card-title button.yellow {\n  color: rgba(0, 0, 0, 0.87);\n  background-color: #ffcc00;\n}\n\nmat-spinner {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tick-div {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n          transform: translate(-50%, -50%);\n}\n\n#tooltip-tick {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  z-index: 2;\n}\n\n.circ {\n  opacity: 0;\n  stroke-dasharray: 130;\n  stroke-dashoffset: 130;\n  transition: all 1s;\n}\n\n.tick {\n  stroke-dasharray: 50;\n  stroke-dashoffset: 50;\n  transition: stroke-dashoffset 1s 0.5s ease-out;\n}\n\n.drawn+svg .path {\n  opacity: 1;\n  stroke-dashoffset: 0;\n}\n\n#mirrored-video {\n  position: relative;\n}\n\n@media screen and (max-width: 599px) {\n  mat-card-title {\n     font-size: 20px;\n  }\n}\n\n/* Pure CSS loader */\n\n#loader {\n  width: 100px;\n  height: 100px;\n  z-index: 1;\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  -webkit-transform: translate(-50%, -50%);\n  transform: translate(-50%, -50%);\n}\n\n#loader * {\n  box-sizing: border-box;\n}\n\n#loader ::after {\n  box-sizing: border-box;\n}\n\n#loader ::before {\n  box-sizing: border-box;\n}\n\n.loader-1 {\n  height: 100px;\n  width: 100px;\n  -webkit-animation: loader-1-1 4.8s linear infinite;\n  animation: loader-1-1 4.8s linear infinite;\n}\n\n@-webkit-keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n  }\n}\n\n@keyframes loader-1-1 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(360deg);\n            transform: rotate(360deg);\n  }\n}\n\n.loader-1 span {\n  display: block;\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  -webkit-animation: loader-1-2 1.2s linear infinite;\n  animation: loader-1-2 1.2s linear infinite;\n}\n\n@-webkit-keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n  }\n}\n\n@keyframes loader-1-2 {\n  0% {\n    -webkit-transform: rotate(0deg);\n            transform: rotate(0deg);\n  }\n  100% {\n    -webkit-transform: rotate(220deg);\n            transform: rotate(220deg);\n  }\n}\n\n.loader-1 span::after {\n  content: \"\";\n  position: absolute;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin: auto;\n  height: 100px;\n  width: 100px;\n  clip: rect(0, 100px, 100px, 50px);\n  border: 8px solid #4d4d4d;\n  border-radius: 50%;\n  -webkit-animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n  animation: loader-1-3 1.2s cubic-bezier(0.770, 0.000, 0.175, 1.000) infinite;\n}\n\n@-webkit-keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n  }\n}\n\n@keyframes loader-1-3 {\n  0% {\n    -webkit-transform: rotate(-140deg);\n            transform: rotate(-140deg);\n  }\n  50% {\n    -webkit-transform: rotate(-160deg);\n            transform: rotate(-160deg);\n  }\n  100% {\n    -webkit-transform: rotate(140deg);\n            transform: rotate(140deg);\n  }\n}"

/***/ }),

/***/ "./src/app/components/dashboard/dashboard.component.html":
/*!***************************************************************!*\
  !*** ./src/app/components/dashboard/dashboard.component.html ***!
  \***************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div id=\"dashboard-div\" fxLayout=\"row\" fxLayout.xs=\"column\" fxLayoutGap=\"20px\" fxLayoutGap.xs=\"20px\">\n\n  <div fxFlex=\"66%\" fxFlexOrder=\"1\" fxFlexOrder.xs=\"2\">\n    <mat-card id=\"log\">\n      <mat-card-title>Server events\n        <mat-slide-toggle title=\"Lock Scroll\" [(ngModel)]=\"lockScroll\" style=\"float: right; margin-left: auto;\">\n          <mat-icon>lock_outline</mat-icon>\n        </mat-slide-toggle>\n      </mat-card-title>\n      <mat-divider></mat-divider>\n      <mat-card-content #scrollMe id=\"log-content\">\n        <ul>\n          <li *ngFor=\"let i of info\">\n            <p>{{i}}</p>\n          </li>\n        </ul>\n      </mat-card-content>\n    </mat-card>\n  </div>\n\n  <div fxFlex=\"33%\" fxFlex.xs=\"auto\" fxFlexOrder=\"2\" fxFlexOrder.xs=\"1\">\n    <mat-card id=\"video-loop\">\n      <mat-card-title>Test the connection\n        <button id=\"test-btn\" mat-raised-button [ngClass]=\"testStatus == 'DISCONNECTED' ? 'blue' : (testStatus == 'PLAYING' ? 'yellow' : 'disabled')\" (click)=\"toggleTestVideo()\" [disabled]=\"testStatus==='CONNECTING' || testStatus==='CONNECTED'\">{{testButton}}</button>\n      </mat-card-title>\n      <mat-divider></mat-divider>\n      <mat-card-content>\n        <div id=\"mirrored-video\">\n          <div *ngIf=\"showSpinner\" id=\"loader\">\n            <div class=\"loader-1 center\"><span></span></div>\n          </div>\n          <div *ngIf=\"session\" id=\"tick-div\">\n            <div id=\"tooltip-tick\" *ngIf=\"testStatus=='PLAYING'\" matTooltip=\"The connection is successful\" matTooltipPosition=\"below\"></div>\n            <div [ngClass]=\"testStatus=='PLAYING' ? 'trigger drawn' : 'trigger'\"></div>\n            <svg version=\"1.1\" id=\"tick\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\n              viewBox=\"-1 -1 39 39\" style=\"enable-background:new 0 0 37 37;\" xml:space=\"preserve\">\n              <path class=\"circ path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" d=\"\n\tM30.5,6.5L30.5,6.5c6.6,6.6,6.6,17.4,0,24l0,0c-6.6,6.6-17.4,6.6-24,0l0,0c-6.6-6.6-6.6-17.4,0-24l0,0C13.1-0.2,23.9-0.2,30.5,6.5z\"\n              />\n              <polyline class=\"tick path\" style=\"fill:none;stroke:#06d362;stroke-width:4;stroke-linejoin:round;stroke-miterlimit:10;\" points=\"\n\t11.6,20 15.9,24.2 26.4,13.8 \" />\n            </svg>\n          </div>\n        </div>\n        <div id=\"msg-chain\"><p *ngFor=\"let msg of msgChain\">{{msg}}</p></div>\n      </mat-card-content>\n    </mat-card>\n  </div>\n</div>\n"

/***/ }),

/***/ "./src/app/components/dashboard/dashboard.component.ts":
/*!*************************************************************!*\
  !*** ./src/app/components/dashboard/dashboard.component.ts ***!
  \*************************************************************/
/*! exports provided: DashboardComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DashboardComponent", function() { return DashboardComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/material */ "./node_modules/@angular/material/esm5/material.es5.js");
/* harmony import */ var _services_info_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../services/info.service */ "./src/app/services/info.service.ts");
/* harmony import */ var _services_rest_service__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../services/rest.service */ "./src/app/services/rest.service.ts");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! openvidu-browser */ "./node_modules/openvidu-browser/lib/index.js");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(openvidu_browser__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _credentials_dialog_component__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./credentials-dialog.component */ "./src/app/components/dashboard/credentials-dialog.component.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};






var DashboardComponent = /** @class */ (function () {
    function DashboardComponent(infoService, restService, dialog) {
        var _this = this;
        this.infoService = infoService;
        this.restService = restService;
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
        this.restService.getOpenViduPublicUrl()
            .then(function (url) {
            _this.openviduPublicUrl = url.replace('https://', 'wss://').replace('http://', 'ws://');
        })
            .catch(function (error) {
            console.error(error);
        });
    };
    DashboardComponent.prototype.beforeunloadHandler = function () {
        // On window closed leave test session and close info websocket
        if (this.session) {
            this.endTestVideo();
        }
        this.websocket.close();
    };
    DashboardComponent.prototype.ngOnDestroy = function () {
        // On component destroyed leave test session and close info websocket
        if (this.session) {
            this.endTestVideo();
        }
        this.websocket.close();
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
        dialogRef = this.dialog.open(_credentials_dialog_component__WEBPACK_IMPORTED_MODULE_5__["CredentialsDialogComponent"]);
        dialogRef.componentInstance.myReference = dialogRef;
        dialogRef.afterClosed().subscribe(function (secret) {
            if (secret) {
                if (!_this.openviduPublicUrl) {
                    _this.restService.getOpenViduPublicUrl()
                        .then((function (url) {
                        _this.openviduPublicUrl = url.replace('https://', 'wss://').replace('http://', 'ws://');
                        _this.connectToSession(_this.openviduPublicUrl + '?sessionId=testSession&secret=' + secret);
                    }))
                        .catch(function (error) {
                        console.error(error);
                    });
                }
                else {
                    _this.connectToSession(_this.openviduPublicUrl + '?sessionId=testSession&secret=' + secret);
                }
            }
        });
    };
    DashboardComponent.prototype.connectToSession = function (token) {
        var _this = this;
        this.msgChain = [];
        var OV = new openvidu_browser__WEBPACK_IMPORTED_MODULE_4__["OpenVidu"]();
        this.session = OV.initSession();
        this.testStatus = 'CONNECTING';
        this.testButton = 'Testing...';
        this.session.connect(token)
            .then(function () {
            _this.msgChain.push('Connected to session');
            _this.testStatus = 'CONNECTED';
            var publisherRemote = OV.initPublisher('mirrored-video', {
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480'
            }, function (e) {
                if (!!e) {
                    console.error(e);
                }
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
            publisherRemote.on('streamCreated', function (video) {
                _this.msgChain.push('Stream created');
            });
            publisherRemote.on('streamPlaying', function (video) {
                _this.msgChain.push('Stream playing');
                _this.testButton = 'End test';
                _this.testStatus = 'PLAYING';
                _this.showSpinner = false;
            });
            publisherRemote.subscribeToRemote();
            _this.session.publish(publisherRemote);
        })
            .catch(function (error) {
            if (error.code === 401) {
                _this.endTestVideo();
                var dialogRef = void 0;
                dialogRef = _this.dialog.open(_credentials_dialog_component__WEBPACK_IMPORTED_MODULE_5__["CredentialsDialogComponent"]);
                dialogRef.componentInstance.myReference = dialogRef;
                dialogRef.afterClosed().subscribe(function (secret) {
                    if (secret) {
                        _this.connectToSession(_this.openviduPublicUrl + '?sessionId=testSession&secret=' + secret);
                    }
                });
            }
            else {
                console.error(error);
                _this.msgChain.push('Error connecting to session');
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
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('scrollMe'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], DashboardComponent.prototype, "myScrollContainer", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('window:beforeunload'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], DashboardComponent.prototype, "beforeunloadHandler", null);
    DashboardComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-dashboard',
            template: __webpack_require__(/*! ./dashboard.component.html */ "./src/app/components/dashboard/dashboard.component.html"),
            styles: [__webpack_require__(/*! ./dashboard.component.css */ "./src/app/components/dashboard/dashboard.component.css")],
        }),
        __metadata("design:paramtypes", [_services_info_service__WEBPACK_IMPORTED_MODULE_2__["InfoService"], _services_rest_service__WEBPACK_IMPORTED_MODULE_3__["RestService"], _angular_material__WEBPACK_IMPORTED_MODULE_1__["MatDialog"]])
    ], DashboardComponent);
    return DashboardComponent;
}());



/***/ }),

/***/ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.css":
/*!**********************************************************************************!*\
  !*** ./src/app/components/layouts/layout-best-fit/layout-best-fit.component.css ***!
  \**********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ".bounds {\n  background-color: black;\n  overflow: hidden;\n  cursor: none !important;\n  position: absolute;\n  left: 0;\n  right: 0;\n  top: 0;\n  bottom: 0;\n}\n\napp-ov-video video {\n  -o-object-fit: cover;\n  object-fit: cover;\n  display: block;\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  color: #ffffff;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  font-size: 100%;\n  font-family: Arial, Helvetica, sans-serif;\n}\n\n/*!\n * Copyright (c) 2017 TokBox, Inc.\n * Released under the MIT license\n * http://opensource.org/licenses/MIT\n */\n\n.custom-class {\n  min-height: 0px !important;\n}\n\n/**\n * OT Base styles\n */\n\n/* Root OT object, this is where our CSS reset happens */\n\n.OT_root, .OT_root * {\n  color: #ffffff;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  font-size: 100%;\n  font-family: Arial, Helvetica, sans-serif;\n  vertical-align: baseline;\n}\n\n.OT_dialog-centering {\n  display: table;\n  width: 100%;\n  height: 100%;\n}\n\n.OT_dialog-centering-child {\n  display: table-cell;\n  vertical-align: middle;\n}\n\n.OT_dialog {\n  position: relative;\n  box-sizing: border-box;\n  max-width: 576px;\n  margin-right: auto;\n  margin-left: auto;\n  padding: 36px;\n  text-align: center;\n  /* centers all the inline content */\n  background-color: #363636;\n  color: #fff;\n  box-shadow: 2px 4px 6px #999;\n  font-family: 'Didact Gothic', sans-serif;\n  font-size: 13px;\n  line-height: 1.4;\n}\n\n.OT_dialog * {\n  font-family: inherit;\n  box-sizing: inherit;\n}\n\n.OT_closeButton {\n  color: #999999;\n  cursor: pointer;\n  font-size: 32px;\n  line-height: 36px;\n  position: absolute;\n  right: 18px;\n  top: 0;\n}\n\n.OT_dialog-messages {\n  text-align: center;\n}\n\n.OT_dialog-messages-main {\n  margin-bottom: 36px;\n  line-height: 36px;\n  font-weight: 300;\n  font-size: 24px;\n}\n\n.OT_dialog-messages-minor {\n  margin-bottom: 18px;\n  font-size: 13px;\n  line-height: 18px;\n  color: #A4A4A4;\n}\n\n.OT_dialog-messages-minor strong {\n  color: #ffffff;\n}\n\n.OT_dialog-actions-card {\n  display: inline-block;\n}\n\n.OT_dialog-button-title {\n  margin-bottom: 18px;\n  line-height: 18px;\n  font-weight: 300;\n  text-align: center;\n  font-size: 14px;\n  color: #999999;\n}\n\n.OT_dialog-button-title label {\n  color: #999999;\n}\n\n.OT_dialog-button-title a, .OT_dialog-button-title a:link, .OT_dialog-button-title a:active {\n  color: #02A1DE;\n}\n\n.OT_dialog-button-title strong {\n  color: #ffffff;\n  font-weight: 100;\n  display: block;\n}\n\n.OT_dialog-button {\n  display: inline-block;\n  margin-bottom: 18px;\n  padding: 0 1em;\n  background-color: #1CA3DC;\n  text-align: center;\n  cursor: pointer;\n}\n\n.OT_dialog-button:disabled {\n  cursor: not-allowed;\n  opacity: 0.5;\n}\n\n.OT_dialog-button-large {\n  line-height: 36px;\n  padding-top: 9px;\n  padding-bottom: 9px;\n  font-weight: 100;\n  font-size: 24px;\n}\n\n.OT_dialog-button-small {\n  line-height: 18px;\n  padding-top: 9px;\n  padding-bottom: 9px;\n  background-color: #444444;\n  color: #999999;\n  font-size: 16px;\n}\n\n.OT_dialog-progress-bar {\n  display: inline-block;\n  /* prevents margin collapse */\n  width: 100%;\n  margin-top: 5px;\n  margin-bottom: 41px;\n  border: 1px solid #4E4E4E;\n  height: 8px;\n}\n\n.OT_dialog-progress-bar-fill {\n  height: 100%;\n  background-color: #29A4DA;\n}\n\n.OT_dialog-plugin-upgrading .OT_dialog-plugin-upgrade-percentage {\n  line-height: 54px;\n  font-size: 48px;\n  font-weight: 100;\n}\n\n/* Helpers */\n\n.OT_centered {\n  position: fixed;\n  left: 50%;\n  top: 50%;\n  margin: 0;\n}\n\n.OT_dialog-hidden {\n  display: none;\n}\n\n.OT_dialog-button-block {\n  display: block;\n}\n\n.OT_dialog-no-natural-margin {\n  margin-bottom: 0;\n}\n\n/* Publisher and Subscriber styles */\n\n.OT_publisher, .OT_subscriber {\n  position: relative;\n  min-width: 48px;\n  min-height: 48px;\n}\n\n.OT_publisher .OT_video-element, .OT_subscriber .OT_video-element {\n  display: block;\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  -webkit-transform-origin: 0 0;\n  transform-origin: 0 0;\n}\n\n/* Styles that are applied when the video element should be mirrored */\n\n.OT_publisher.OT_mirrored .OT_video-element {\n  -webkit-transform: scale(-1, 1);\n  transform: scale(-1, 1);\n  -webkit-transform-origin: 50% 50%;\n  transform-origin: 50% 50%;\n}\n\n.OT_subscriber_error {\n  background-color: #000;\n  color: #fff;\n  text-align: center;\n}\n\n.OT_subscriber_error>p {\n  padding: 20px;\n}\n\n/* The publisher/subscriber name/mute background */\n\n.OT_publisher .OT_bar, .OT_subscriber .OT_bar, .OT_publisher .OT_name, .OT_subscriber .OT_name, .OT_publisher .OT_archiving, .OT_subscriber .OT_archiving, .OT_publisher .OT_archiving-status, .OT_subscriber .OT_archiving-status, .OT_publisher .OT_archiving-light-box, .OT_subscriber .OT_archiving-light-box {\n  -ms-box-sizing: border-box;\n  box-sizing: border-box;\n  top: 0;\n  left: 0;\n  right: 0;\n  display: block;\n  height: 34px;\n  position: absolute;\n}\n\n.OT_publisher .OT_bar, .OT_subscriber .OT_bar {\n  background: rgba(0, 0, 0, 0.4);\n}\n\n.OT_publisher .OT_edge-bar-item, .OT_subscriber .OT_edge-bar-item {\n  z-index: 1;\n  /* required to get audio level meter underneath */\n}\n\n/* The publisher/subscriber name panel/archiving status bar */\n\n.OT_publisher .OT_name, .OT_subscriber .OT_name {\n  background-color: transparent;\n  color: #ffffff;\n  font-size: 15px;\n  line-height: 34px;\n  font-weight: normal;\n  padding: 0 4px 0 36px;\n}\n\n.OT_publisher .OT_archiving-status, .OT_subscriber .OT_archiving-status {\n  background: rgba(0, 0, 0, 0.4);\n  top: auto;\n  bottom: 0;\n  left: 34px;\n  padding: 0 4px;\n  color: rgba(255, 255, 255, 0.8);\n  font-size: 15px;\n  line-height: 34px;\n  font-weight: normal;\n}\n\n.OT_micro .OT_archiving-status, .OT_micro:hover .OT_archiving-status, .OT_mini .OT_archiving-status, .OT_mini:hover .OT_archiving-status {\n  display: none;\n}\n\n.OT_publisher .OT_archiving-light-box, .OT_subscriber .OT_archiving-light-box {\n  background: rgba(0, 0, 0, 0.4);\n  top: auto;\n  bottom: 0;\n  right: auto;\n  width: 34px;\n  height: 34px;\n}\n\n.OT_archiving-light {\n  width: 7px;\n  height: 7px;\n  border-radius: 30px;\n  position: absolute;\n  top: 14px;\n  left: 14px;\n  background-color: #575757;\n  box-shadow: 0 0 5px 1px #575757;\n}\n\n.OT_archiving-light.OT_active {\n  background-color: #970d13;\n  animation: OT_pulse 1.3s ease-in;\n  -webkit-animation: OT_pulse 1.3s ease-in;\n  -moz-animation: OT_pulse 1.3s ease-in;\n  -webkit-animation: OT_pulse 1.3s ease-in;\n  animation-iteration-count: infinite;\n  -webkit-animation-iteration-count: infinite;\n  -moz-animation-iteration-count: infinite;\n  -webkit-animation-iteration-count: infinite;\n}\n\n@-webkit-keyframes OT_pulse {\n  0% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n  30% {\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n  50% {\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n  80% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n  100% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n}\n\n@-webkit-keyframes OT_pulse {\n  0% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n  30% {\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n  50% {\n    box-shadow: 0 0 5px 1px #c70019;\n  }\n  80% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n  100% {\n    box-shadow: 0 0 0px 0px #c70019;\n  }\n}\n\n.OT_mini .OT_bar, .OT_bar.OT_mode-mini, .OT_bar.OT_mode-mini-auto {\n  bottom: 0;\n  height: auto;\n}\n\n.OT_mini .OT_name.OT_mode-off, .OT_mini .OT_name.OT_mode-on, .OT_mini .OT_name.OT_mode-auto, .OT_mini:hover .OT_name.OT_mode-auto {\n  display: none;\n}\n\n.OT_publisher .OT_name, .OT_subscriber .OT_name {\n  left: 10px;\n  right: 37px;\n  height: 34px;\n  padding-left: 0;\n}\n\n.OT_publisher .OT_mute, .OT_subscriber .OT_mute {\n  border: none;\n  cursor: pointer;\n  display: block;\n  position: absolute;\n  text-align: center;\n  text-indent: -9999em;\n  background-color: transparent;\n  background-repeat: no-repeat;\n}\n\n.OT_publisher .OT_mute, .OT_subscriber .OT_mute {\n  right: 0;\n  top: 0;\n  border-left: 1px solid rgba(255, 255, 255, 0.2);\n  height: 36px;\n  width: 37px;\n}\n\n.OT_mini .OT_mute, .OT_publisher.OT_mini .OT_mute.OT_mode-auto.OT_mode-on-hold, .OT_subscriber.OT_mini .OT_mute.OT_mode-auto.OT_mode-on-hold {\n  top: 50%;\n  left: 50%;\n  right: auto;\n  margin-top: -18px;\n  margin-left: -18.5px;\n  border-left: none;\n}\n\n.OT_publisher .OT_mute {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAcCAMAAAC02HQrAAAA1VBMVEUAAAD3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pn3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pn3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj3+Pj39/j3+Pj3+Pn4+Pk/JRMlAAAAQ3RSTlMABAUHCQoLDhAQERwdHiAjLjAxOD9ASFBRVl1mbnZ6fH2LjI+QkaWqrrC1uLzAwcXJycrL1NXj5Ofo6u3w9fr7/P3+d4M3+QAAAQBJREFUGBlVwYdCglAABdCLlr5Unijm3hMUtBzlBLSr//9JgUToOQgVJgceJgU8aHgMeA38K50ZOpcQmTPwcyXn+JM8M3JJIqQypiIkeXelTyIkGZPwKS1NMia1lgKTVkaE3oQQGYsmHNqSMWnTgUFbMiZtGlD2dpaxrL1XgM0i4ZK8MeAmFhsAs29MGZniawagS63oMOQUNXYB5D0D1RMDpyoMLw/fiE2og/V+PVDR5AiBl0/2Uwik+vx4xV3a5G5Ye68Nd1czjUjZckm6VhmPciRzeCZICjwTJAViQq+3e+St167rAoHK8sLYZVkBYPCZAZ/eGa+2R5LH7Wrc0YFf/O9J3yBDFaoAAAAASUVORK5CYII=);\n  background-position: 9px 5px;\n}\n\n.OT_publisher .OT_mute.OT_active {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAdCAYAAABFRCf7AAADcElEQVRIiaWVXWhcRRTHf7NNd2aDtUKMIjTpg4ufFIuiUOmDEWm0Vi3VYhXRqIggQh4sWJFSig9+oOhTKSpIRUWMIBIr2kptoTbgU6ooxCiIjR+14kcJmf9sNceHnd3ebnc3Uv9wuXfOzPzmnDMz5zozGwdWAbc65w5RUJQ8cC2wDJgFJioh/MJCMrNxq2vOzK4HmIvRRemxKP0RJWt53o7S+d2Yzsx6gQ+AIUDAnUqpBLzXZd4RYFUlhB/bdZacc3PAOmAcCMC7wfvFwLNdoAPAyx09bXyYWRl4E7gDmAdGlNKFwLYu8GolhO9O87RJd64GbMrgEvB68P4osMWdXLtVV7czlooNpVRWSs8DO7NpR/B+3rBHsvetCgtCMTxwQCm9BbyQrc8F7/uBex3uRCeXO0PrUZ4NfKyUPgWeyj3bg/crDNsIRGwBaJQGorQ3Svdn2wHgc2BUKb0DPJHtjwfvbwRucc7tz+N+i9LFUdoXpfVN36I0CVwBTFI/q9e1LPxT8P4qYEdu70q12mYzWw1MYQzjeJF6zq+shHC4B7jklOBPP/TzSunh4P0DwKvAfb5c9krpe+CcwsEoZdbhEvBM9wxRAl5RShcA9wAngE3B+8tLpdLuwrhp4MNmK0pfRWkySr7NXS8+L5nZbWZWy/Vin1IaitJnUTqvwevJ71lgSSWEFKUfHG7Q2m/xqFJaGry/GXgfGPLl8mJgrXPur2JoUC8Qy3OpG+sAbGhEKT0ErAWOA6uBPWbW1wr9BOgFbgKezot0kAPYqJQA1gC/A9cA+82svzksSn1R+jNKX0SpnM/e1x3yqig92JhrZivM7FjO8bSZLSuCR/Ok16K0KMNHojQWpYko7Y7S1igN5PE3ROl4lNaZ2UVmNpPBU01orvZvZPCeKFXbBR+lEKVtUapFaSZKg9njqpl9aWYTrmXCImA7sCWb9lK/jj9TrwkrgA1AH3AQuKsSwkzbrLfxpgpsBtYDxf/R3xm2ExirhNCuHHZXTsmRwiat+S/zSt06eysVA/4pmGr/G3qm6ik28v29FKgCg8BS6pvS0KNRGgZ+Bb4FpsxsOkfUlMuwDcBWYOUZOHYM2AU8WQmhBifDv70O7PjX7KZ+4G7g3FM8zd6uBIaBy4AqxnIcZwFLCovPAhE4Sj38b4BDwEeVEFKD9S94Khjn486v3QAAAABJRU5ErkJggg==);\n  background-position: 9px 4px;\n}\n\n.OT_subscriber .OT_mute {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAATCAYAAAB7u5a2AAABx0lEQVQ4jaWUv48NURiGn3ONmCs32ZBd28ht1gqyZAkF21ylQkEiSp2ehpDlD1BoFGqqVdJohYKI7MaPxMoVNghCWMF+7ybLUewnOXfcMWO9yeQ857zne8+XmZOBGjJpr0kvTIomvTZpS526UCO4DUwD64FjwCFgqZnnR+oc8LfgzKQ73vGsr42ZtGjSQFV9o8KfBCacZwCaef4YmAf2rzjcpN3A2WSpm/AssKcqPDNpDBjs410CViXzTwk/A7b1C4wxDgOngAsZcAXY2buDfp/6S4F3lDS8DjgBzDWAjX/Y/e/QgYS/AhsKHa+OMQ6GEJ4Cj4BOAxgq6aCowyZtdf4OtAr+FHDO+R4wWnVbihr3cQnICt4boO38GWj9a/icjwOACt4m4K3zEPA+AxaAtTWCnwN3lzHkEL8V/OPAGud9wK2GF9XR1Wae/1zG2AI+pGYI4VUIoRtjHAc2A9cz4LRPevYCZ+i9/4sJt4GXJU10gaPAzdI2TTro/5Tfz8XEe2LSZGmxq/SDNvP8BnA5WRrx4BwYBe6vONx1EnjovGvBLAAd4Adwuyq8UiaNmDTvr+a8SQ9MuvbfwckBHZPe+QEfTdpep+4XZmPBHiHgz74AAAAASUVORK5CYII=);\n  background-position: 8px 7px;\n}\n\n.OT_subscriber .OT_mute.OT_active {\n  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAUCAYAAACXtf2DAAACtklEQVQ4jZ2VSYiURxTHf+/T9Nc9iRrBuYySmIsXUU9iFMEFERRBvAjJLUQi5ioiHvSScfTmgqC4XAT1ZIgLuJHkICaaQAgKI2hAUBT30bjUq7bbv4eukXK029F3+eqtv/fqK6qQdEnSNUmT6CDB/bvgfjO4N9zj2RD8007xg1IABkwEzkma0qb4PGAPMBZYLtSD8eNwAEjqTlNI0gNJM4YU7w7ut4O7gvuhZFsR3C8NC5BBLiTIY0mzM8AvqbiC++pk+zLpE95XuwAws3vAQuBPYDRwWtL84P4tsDSLv5oaug4EYOawAMF9jMdoLxqNZcDvQA04UVYqL4G/svj7AF21mhJscrvCksYBFO7xc2AAGGg2mrdjvf4rcAyomNn+slLZmUEGBgsYdh945xZJmgvckDSrEJpK6ySBgV6q12O8ABwGPjGzfWWlsjdN9rpjoSfA+DYDXARGAksK4Is3XC1Ub4z1f4CDQGFmu6tleQSYk0U+p7WVeefLJc00s4fAeWB6Qeunvj0m2ugx9gO7kmlrtSxvBfcy6fXUZS6rgG/S+jLQUwCVNmMC9HqM14EtSe+rluWazN8YEv8IqKZ1E1qnaIDO0ucx3gX6kv6TpM3AM+D/IbGjgP60/gq4WQA33gMA2OQxPgHWJX1ttSwL4FAeZGYLgB2SasBs4A8L7qOBf9M0uXQB3a+TMYSmVctyDrA9mfcBK82smSdKWgCcAaa1bTm4fxbc/8uuCQX3RanAD5Ka6Wo5IGnE0HxJPZ03pQX5Org3MsD3AO5xXLPZXJ9BjkrqdFg6QjZkgG3Jtsw93pG0VFI9QU5K6voYQBHcTydAfwheBI9HgvvPAJIWS3qeIL9JGvUxkO7gfi1BrqTvwkG/pPmSnibIqTzXPgAyEVgBjAEu1qrVPbk/PVTHgb/NbPGg/RVIzOQqzSTBaQAAAABJRU5ErkJggg==);\n  background-position: 7px 7px;\n}\n\n/**\n * Styles for display modes\n *\n * Note: It's important that these completely control the display and opacity\n * attributes, no other selectors should atempt to change them.\n */\n\n/* Default display mode transitions for various chrome elements */\n\n.OT_publisher .OT_edge-bar-item, .OT_subscriber .OT_edge-bar-item {\n  transition-property: top, bottom, opacity;\n  transition-duration: 0.5s;\n  transition-timing-function: ease-in;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_mode-off, .OT_subscriber .OT_edge-bar-item.OT_mode-off, .OT_publisher .OT_edge-bar-item.OT_mode-auto, .OT_subscriber .OT_edge-bar-item.OT_mode-auto, .OT_publisher .OT_edge-bar-item.OT_mode-mini-auto, .OT_subscriber .OT_edge-bar-item.OT_mode-mini-auto {\n  top: -25px;\n  opacity: 0;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_mode-off, .OT_subscriber .OT_edge-bar-item.OT_mode-off {\n  display: none;\n}\n\n.OT_mini .OT_mute.OT_mode-auto, .OT_publisher .OT_mute.OT_mode-mini-auto, .OT_subscriber .OT_mute.OT_mode-mini-auto {\n  top: 50%;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-off, .OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-off, .OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto, .OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto, .OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-mini-auto, .OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-mini-auto {\n  top: auto;\n  bottom: -25px;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_mode-on, .OT_subscriber .OT_edge-bar-item.OT_mode-on, .OT_publisher .OT_edge-bar-item.OT_mode-auto.OT_mode-on-hold, .OT_subscriber .OT_edge-bar-item.OT_mode-auto.OT_mode-on-hold, .OT_publisher:hover .OT_edge-bar-item.OT_mode-auto, .OT_subscriber:hover .OT_edge-bar-item.OT_mode-auto, .OT_publisher:hover .OT_edge-bar-item.OT_mode-mini-auto, .OT_subscriber:hover .OT_edge-bar-item.OT_mode-mini-auto {\n  top: 0;\n  opacity: 1;\n}\n\n.OT_mini .OT_mute.OT_mode-on, .OT_mini:hover .OT_mute.OT_mode-auto, .OT_mute.OT_mode-mini, .OT_root:hover .OT_mute.OT_mode-mini-auto {\n  top: 50%;\n}\n\n.OT_publisher .OT_edge-bar-item.OT_edge-bottom.OT_mode-on, .OT_subscriber .OT_edge-bar-item.OT_edge-bottom.OT_mode-on, .OT_publisher:hover .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto, .OT_subscriber:hover .OT_edge-bar-item.OT_edge-bottom.OT_mode-auto {\n  top: auto;\n  bottom: 0;\n  opacity: 1;\n}\n\n/* Contains the video element, used to fix video letter-boxing */\n\n.OT_widget-container {\n  width: 100%;\n  height: 100%;\n  position: absolute;\n  background-color: #000000;\n  overflow: hidden;\n}\n\n/* Load animation */\n\n.OT_root .OT_video-loading {\n  position: absolute;\n  z-index: 1;\n  width: 100%;\n  height: 100%;\n  display: none;\n  background-color: rgba(0, 0, 0, .75);\n}\n\n.OT_root .OT_video-loading .OT_video-loading-spinner {\n  background: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0yMCAtMjAgMjQwIDI0MCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9IjAiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9IjEiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9IjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iLjA4Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImMiIHgxPSIxIiB4Mj0iMCIgeTE9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuMDgiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iLjE2Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImQiIHgyPSIwIiB5MT0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9Ii4xNiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuMzMiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iZSIgeDI9IjEiIHkxPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iLjMzIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9Ii42NiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJmIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuNjYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmYiLz48L2xpbmVhckdyYWRpZW50PjxtYXNrIGlkPSJnIj48ZyBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjQwIj48cGF0aCBzdHJva2U9InVybCgjYSkiIGQ9Ik04Ni42LTUwYTEwMCAxMDAgMCAwIDEgMCAxMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwMCAxMDApIi8+PHBhdGggc3Ryb2tlPSJ1cmwoI2IpIiBkPSJNODYuNiA1MEExMDAgMTAwIDAgMCAxIDAgMTAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAgMTAwKSIvPjxwYXRoIHN0cm9rZT0idXJsKCNjKSIgZD0iTTAgMTAwYTEwMCAxMDAgMCAwIDEtODYuNi01MCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAwIDEwMCkiLz48cGF0aCBzdHJva2U9InVybCgjZCkiIGQ9Ik0tODYuNiA1MGExMDAgMTAwIDAgMCAxIDAtMTAwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAgMTAwKSIvPjxwYXRoIHN0cm9rZT0idXJsKCNlKSIgZD0iTS04Ni42LTUwQTEwMCAxMDAgMCAwIDEgMC0xMDAiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwMCAxMDApIi8+PHBhdGggc3Ryb2tlPSJ1cmwoI2YpIiBkPSJNMC0xMDBhMTAwIDEwMCAwIDAgMSA4Ni42IDUwIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAgMTAwKSIvPjwvZz48L21hc2s+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHg9Ii0yMCIgeT0iLTIwIiBtYXNrPSJ1cmwoI2cpIiBmaWxsPSIjZmZmIi8+PC9zdmc+) no-repeat;\n  position: absolute;\n  width: 32px;\n  height: 32px;\n  left: 50%;\n  top: 50%;\n  margin-left: -16px;\n  margin-top: -16px;\n  -webkit-animation: OT_spin 2s linear infinite;\n  animation: OT_spin 2s linear infinite;\n}\n\n@-webkit-keyframes OT_spin {\n  100% {\n    -webkit-transform: rotate(360deg);\n  }\n}\n\n@keyframes OT_spin {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n\n.OT_publisher.OT_loading .OT_video-loading, .OT_subscriber.OT_loading .OT_video-loading {\n  display: block;\n}\n\n.OT_video-centering {\n  display: table;\n  width: 100%;\n  height: 100%;\n}\n\n.OT_video-container {\n  display: table-cell;\n  vertical-align: middle;\n}\n\n.OT_video-poster {\n  position: absolute;\n  z-index: 1;\n  width: 100%;\n  height: 100%;\n  display: none;\n  opacity: .25;\n  background-repeat: no-repeat;\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDcxIDQ2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSI2Ni42NiUiIHN0b3AtY29sb3I9IiNmZmYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iMCIvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZmlsbD0idXJsKCNhKSIgZD0iTTc5IDMwOGMxNC4yNS02LjUgNTQuMjUtMTkuNzUgNzEtMjkgOS0zLjI1IDI1LTIxIDI1LTIxczMuNzUtMTMgMy0yMmMtMS43NS02Ljc1LTE1LTQzLTE1LTQzLTIuNSAzLTQuNzQxIDMuMjU5LTcgMS0zLjI1LTcuNS0yMC41LTQ0LjUtMTYtNTcgMS4yNS03LjUgMTAtNiAxMC02LTExLjI1LTMzLjc1LTgtNjctOC02N3MuMDczLTcuMzQ2IDYtMTVjLTMuNDguNjM3LTkgNC05IDQgMi41NjMtMTEuNzI3IDE1LTIxIDE1LTIxIC4xNDgtLjMxMi0xLjMyMS0xLjQ1NC0xMCAxIDEuNS0yLjc4IDE2LjY3NS04LjY1NCAzMC0xMSAzLjc4Ny05LjM2MSAxMi43ODItMTcuMzk4IDIyLTIyLTIuMzY1IDMuMTMzLTMgNi0zIDZzMTUuNjQ3LTguMDg4IDQxLTZjLTE5Ljc1IDItMjQgNi0yNCA2czc0LjUtMTAuNzUgMTA0IDM3YzcuNSA5LjUgMjQuNzUgNTUuNzUgMTAgODkgMy43NS0xLjUgNC41LTQuNSA5IDEgLjI1IDE0Ljc1LTExLjUgNjMtMTkgNjItMi43NSAxLTQtMy00LTMtMTAuNzUgMjkuNS0xNCAzOC0xNCAzOC0yIDQuMjUtMy43NSAxOC41LTEgMjIgMS4yNSA0LjUgMjMgMjMgMjMgMjNsMTI3IDUzYzM3IDM1IDIzIDEzNSAyMyAxMzVMMCA0NjRzLTMtOTYuNzUgMTQtMTIwYzUuMjUtNi4yNSAyMS43NS0xOS43NSA2NS0zNnoiLz48L3N2Zz4=);\n  background-size: auto 76%;\n}\n\n.OT_fit-mode-cover .OT_video-element {\n  -o-object-fit: cover;\n  object-fit: cover;\n}\n\n/* Workaround for iOS freezing issue when cropping videos */\n\n/* https://bugs.webkit.org/show_bug.cgi?id=176439 */\n\n@media only screen and (orientation: portrait) {\n  .OT_subscriber.OT_ForceContain.OT_fit-mode-cover .OT_video-element {\n    -o-object-fit: contain !important;\n    object-fit: contain !important;\n  }\n}\n\n.OT_fit-mode-contain .OT_video-element {\n  -o-object-fit: contain;\n  object-fit: contain;\n}\n\n.OT_fit-mode-cover .OT_video-poster {\n  background-position: center bottom;\n}\n\n.OT_fit-mode-contain .OT_video-poster {\n  background-position: center;\n}\n\n.OT_audio-level-meter {\n  position: absolute;\n  width: 25%;\n  max-width: 224px;\n  min-width: 21px;\n  top: 0;\n  right: 0;\n  overflow: hidden;\n}\n\n.OT_audio-level-meter:before {\n  /* makes the height of the container equals its width */\n  content: '';\n  display: block;\n  padding-top: 100%;\n}\n\n.OT_audio-level-meter__bar {\n  position: absolute;\n  width: 192%;\n  /* meter value can overflow of 8% */\n  height: 192%;\n  top: -96%/* half of the size */\n  ;\n  right: -96%;\n  border-radius: 50%;\n  background-color: rgba(0, 0, 0, .8);\n}\n\n.OT_audio-level-meter__audio-only-img {\n  position: absolute;\n  top: 22%;\n  right: 15%;\n  width: 40%;\n  opacity: .7;\n  background: url(data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNzkgODYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTkuNzU3IDQwLjkyNGMzLjczOC01LjE5MSAxMi43MTEtNC4zMDggMTIuNzExLTQuMzA4IDIuMjIzIDMuMDE0IDUuMTI2IDI0LjU4NiAzLjYyNCAyOC43MTgtMS40MDEgMS4zMDEtMTEuNjExIDEuNjI5LTEzLjM4LTEuNDM2LTEuMjI2LTguODA0LTIuOTU1LTIyLjk3NS0yLjk1NS0yMi45NzV6bTU4Ljc4NSAwYy0zLjczNy01LjE5MS0xMi43MTEtNC4zMDgtMTIuNzExLTQuMzA4LTIuMjIzIDMuMDE0LTUuMTI2IDI0LjU4Ni0zLjYyNCAyOC43MTggMS40MDEgMS4zMDEgMTEuNjExIDEuNjI5IDEzLjM4LTEuNDM2IDEuMjI2LTguODA0IDIuOTU1LTIyLjk3NSAyLjk1NS0yMi45NzV6Ii8+PHBhdGggZD0iTTY4LjY0NyA1OC42Yy43MjktNC43NTMgMi4zOC05LjU2MSAyLjM4LTE0LjgwNCAwLTIxLjQxMi0xNC4xMTUtMzguNzctMzEuNTI4LTM4Ljc3LTE3LjQxMiAwLTMxLjUyNyAxNy4zNTgtMzEuNTI3IDM4Ljc3IDAgNC41NDEuNTE1IDguOTM2IDEuODAyIDEyLjk1IDEuNjk4IDUuMjk1LTUuNTQyIDYuOTkxLTYuNjE2IDIuMDczQzIuNDEgNTUuMzk0IDAgNTEuNzg3IDAgNDguMTAzIDAgMjEuNTM2IDE3LjY4NSAwIDM5LjUgMCA2MS4zMTYgMCA3OSAyMS41MzYgNzkgNDguMTAzYzAgLjcxOC0yLjg5OSA5LjY5My0zLjI5MiAxMS40MDgtLjc1NCAzLjI5My03Ljc1MSAzLjU4OS03LjA2MS0uOTEyeiIvPjxwYXRoIGQ9Ik01LjA4NCA1MS4zODVjLS44MDQtMy43ODIuNTY5LTcuMzM1IDMuMTM0LTcuOTIxIDIuNjM2LS42MDMgNS40ODUgMi4xNSA2LjI4OSA2LjEzMi43OTcgMy45NDgtLjc1MiA3LjQ1Ny0zLjM4OCA3Ljg1OS0yLjU2Ni4zOTEtNS4yMzctMi4zMTgtNi4wMzQtNi4wN3ptNjguODM0IDBjLjgwNC0zLjc4Mi0uNTY4LTcuMzM1LTMuMTMzLTcuOTIxLTIuNjM2LS42MDMtNS40ODUgMi4xNS02LjI4OSA2LjEzMi0uNzk3IDMuOTQ4Ljc1MiA3LjQ1NyAzLjM4OSA3Ljg1OSAyLjU2NS4zOTEgNS4yMzctMi4zMTggNi4wMzQtNi4wN3ptLTIuMDM4IDguMjg4Yy0uOTI2IDE5LjY1OS0xNS4xMTIgMjQuNzU5LTI1Ljg1OSAyMC40NzUtNS40MDUtLjYwNi0zLjAzNCAxLjI2Mi0zLjAzNCAxLjI2MiAxMy42NjEgMy41NjIgMjYuMTY4IDMuNDk3IDMxLjI3My0yMC41NDktLjU4NS00LjUxMS0yLjM3OS0xLjE4Ny0yLjM3OS0xLjE4N3oiLz48cGF0aCBkPSJNNDEuNjYyIDc4LjQyMmw3LjU1My41NWMxLjE5Mi4xMDcgMi4xMiAxLjE1MyAyLjA3MiAyLjMzNWwtLjEwOSAyLjczOGMtLjA0NyAxLjE4Mi0xLjA1MSAyLjA1NC0yLjI0MyAxLjk0NmwtNy41NTMtLjU1Yy0xLjE5MS0uMTA3LTIuMTE5LTEuMTUzLTIuMDcyLTIuMzM1bC4xMDktMi43MzdjLjA0Ny0xLjE4MiAxLjA1Mi0yLjA1NCAyLjI0My0xLjk0N3oiLz48L2c+PC9zdmc+) no-repeat center;\n}\n\n.OT_audio-level-meter__audio-only-img:before {\n  /* makes the height of the container equals its width */\n  content: '';\n  display: block;\n  padding-top: 100%;\n}\n\n.OT_audio-level-meter__value {\n  position: absolute;\n  border-radius: 50%;\n  background-image: radial-gradient(circle, rgba(151, 206, 0, 1) 0%, rgba(151, 206, 0, 0) 100%);\n}\n\n.OT_audio-level-meter.OT_mode-off {\n  display: none;\n}\n\n.OT_audio-level-meter.OT_mode-on, .OT_audio-only .OT_audio-level-meter.OT_mode-auto {\n  display: block;\n}\n\n.OT_audio-only.OT_publisher .OT_video-element, .OT_audio-only.OT_subscriber .OT_video-element {\n  display: none;\n}\n\n.OT_video-disabled-indicator {\n  opacity: 1;\n  border: none;\n  display: none;\n  position: absolute;\n  background-color: transparent;\n  background-repeat: no-repeat;\n  background-position: bottom right;\n  pointer-events: none;\n  top: 0;\n  left: 0;\n  bottom: 3px;\n  right: 3px;\n}\n\n.OT_video-disabled {\n  background-image: url(data:image/png;base64,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);\n  background-size: 33px auto;\n}\n\n.OT_video-disabled-warning {\n  background-image: url(data:image/png;base64,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);\n  background-size: 33px auto;\n}\n\n.OT_video-disabled-indicator.OT_active {\n  display: block;\n}\n\n.OT_audio-blocked-indicator {\n  opacity: 1;\n  border: none;\n  display: none;\n  position: absolute;\n  background-color: transparent;\n  background-repeat: no-repeat;\n  background-position: center;\n  pointer-events: none;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n}\n\n.OT_audio-blocked {\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjkwIj48ZGVmcz48cGF0aCBkPSJNNjcgMTJMNi40NDggNzIuNTUyIDAgMzFWMThMMjYgMGw0MSAxMnptMyA3bDYgNDctMjkgMTgtMzUuNTAyLTYuNDk4TDcwIDE5eiIgaWQ9ImEiLz48L2RlZnM+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSI5MCIgcng9IjM1IiByeT0iNDUiIG9wYWNpdHk9Ii41Ii8+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNikiPjxtYXNrIGlkPSJiIiBmaWxsPSIjZmZmIj48dXNlIHhsaW5rOmhyZWY9IiNhIi8+PC9tYXNrPjxwYXRoIGQ9Ik0zOS4yNDkgNTEuMzEyYy42OTcgMTAuMzcgMi43ODUgMTcuODk3IDUuMjUxIDE3Ljg5NyAzLjAzOCAwIDUuNS0xMS40MTcgNS41LTI1LjVzLTIuNDYyLTI1LjUtNS41LTI1LjVjLTIuNTEgMC00LjYyOCA3Ljc5Ny01LjI4NyAxOC40NTNBOC45ODkgOC45ODkgMCAwIDEgNDMgNDRhOC45ODggOC45ODggMCAwIDEtMy43NTEgNy4zMTJ6TTIwLjk4NSAzMi4yMjRsMTUuNzQ2LTE2Ljg3N2E3LjM4NSA3LjM4NSAwIDAgMSAxMC4zNzQtLjQyQzUxLjcwMiAxOS4xMTQgNTQgMjkuMjA4IDU0IDQ1LjIwOGMwIDE0LjUyNy0yLjM0MyAyMy44OC03LjAzIDI4LjA1OGE3LjI4IDcuMjggMCAwIDEtMTAuMTY4LS40NjhMMjAuNDA1IDU1LjIyNEgxMmE1IDUgMCAwIDEtNS01di0xM2E1IDUgMCAwIDEgNS01aDguOTg1eiIgZmlsbD0iI0ZGRiIgbWFzaz0idXJsKCNiKSIvPjwvZz48cGF0aCBkPSJNMTA2LjUgMTMuNUw0NC45OTggNzUuMDAyIiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9nPjwvc3ZnPg==);\n  background-size: 90px auto;\n}\n\n.OT_container-audio-blocked {\n  cursor: pointer;\n}\n\n.OT_container-audio-blocked.OT_mini .OT_edge-bar-item {\n  display: none;\n}\n\n.OT_container-audio-blocked .OT_mute {\n  display: none;\n}\n\n.OT_audio-blocked-indicator.OT_active {\n  display: block;\n}\n\n.OT_video-unsupported {\n  opacity: 1;\n  border: none;\n  display: none;\n  position: absolute;\n  background-color: transparent;\n  background-repeat: no-repeat;\n  background-position: center;\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTciIGhlaWdodD0iOTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxwYXRoIGQ9Ik03MCAxMkw5LjQ0OCA3Mi41NTIgMCA2MmwzLTQ0TDI5IDBsNDEgMTJ6bTggMmwxIDUyLTI5IDE4LTM1LjUwMi02LjQ5OEw3OCAxNHoiIGlkPSJhIi8+PC9kZWZzPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOCAzKSI+PG1hc2sgaWQ9ImIiIGZpbGw9IiNmZmYiPjx1c2UgeGxpbms6aHJlZj0iI2EiLz48L21hc2s+PHBhdGggZD0iTTkuMTEgMjAuOTY4SDQ4LjFhNSA1IDAgMCAxIDUgNVY1OC4xOGE1IDUgMCAwIDEtNSA1SDkuMTFhNSA1IDAgMCAxLTUtNVYyNS45N2E1IDUgMCAwIDEgNS01em00Ny4wOCAxMy4zOTRjMC0uMzQ1IDUuNDcyLTMuMTU5IDE2LjQxNS04LjQ0M2EzIDMgMCAwIDEgNC4zMDQgMi43MDJ2MjYuODM1YTMgMyAwIDAgMS00LjMwNSAyLjcwMWMtMTAuOTQyLTUuMjg2LTE2LjQxMy04LjEtMTYuNDEzLTguNDQ2VjM0LjM2MnoiIGZpbGw9IiNGRkYiIG1hc2s9InVybCgjYikiLz48L2c+PHBhdGggZD0iTTgxLjUgMTYuNUwxOS45OTggNzguMDAyIiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9nPjwvc3ZnPg==);\n  background-size: 58px auto;\n  pointer-events: none;\n  top: 0;\n  left: 0;\n  bottom: 0;\n  right: 0;\n  margin-top: -30px;\n}\n\n.OT_video-unsupported-bar {\n  display: none;\n  position: absolute;\n  width: 192%;\n  /* copy the size of the audio meter bar for symmetry */\n  height: 192%;\n  top: -96%/* half of the size */\n  ;\n  left: -96%;\n  border-radius: 50%;\n  background-color: rgba(0, 0, 0, .8);\n}\n\n.OT_video-unsupported-img {\n  display: none;\n  position: absolute;\n  top: 11%;\n  left: 15%;\n  width: 70%;\n  opacity: .7;\n  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTciIGhlaWdodD0iOTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxkZWZzPjxwYXRoIGQ9Ik03MCAxMkw5LjQ0OCA3Mi41NTIgMCA2MmwzLTQ0TDI5IDBsNDEgMTJ6bTggMmwxIDUyLTI5IDE4LTM1LjUwMi02LjQ5OEw3OCAxNHoiIGlkPSJhIi8+PC9kZWZzPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOCAzKSI+PG1hc2sgaWQ9ImIiIGZpbGw9IiNmZmYiPjx1c2UgeGxpbms6aHJlZj0iI2EiLz48L21hc2s+PHBhdGggZD0iTTkuMTEgMjAuOTY4SDQ4LjFhNSA1IDAgMCAxIDUgNVY1OC4xOGE1IDUgMCAwIDEtNSA1SDkuMTFhNSA1IDAgMCAxLTUtNVYyNS45N2E1IDUgMCAwIDEgNS01em00Ny4wOCAxMy4zOTRjMC0uMzQ1IDUuNDcyLTMuMTU5IDE2LjQxNS04LjQ0M2EzIDMgMCAwIDEgNC4zMDQgMi43MDJ2MjYuODM1YTMgMyAwIDAgMS00LjMwNSAyLjcwMWMtMTAuOTQyLTUuMjg2LTE2LjQxMy04LjEtMTYuNDEzLTguNDQ2VjM0LjM2MnoiIGZpbGw9IiNGRkYiIG1hc2s9InVybCgjYikiLz48L2c+PHBhdGggZD0iTTgxLjUgMTYuNUwxOS45OTggNzguMDAyIiBzdHJva2U9IiNGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9nPjwvc3ZnPg==);\n  background-repeat: no-repeat;\n  background-position: center;\n  background-size: 100% auto;\n}\n\n.OT_video-unsupported-img:before {\n  /* makes the height of the container 93% of its width (90/97 px) */\n  content: '';\n  display: block;\n  padding-top: 93%;\n}\n\n.OT_video-unsupported-text {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  text-align: center;\n  height: 100%;\n  margin-top: 40px;\n}"

/***/ }),

/***/ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.html":
/*!***********************************************************************************!*\
  !*** ./src/app/components/layouts/layout-best-fit/layout-best-fit.component.html ***!
  \***********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<div id=\"layout\" class=\"bounds\">\n  <div *ngFor=\"let s of subscribers\" class=\"OT_root OT_publisher custom-class\">\n    <div class=\"OT_widget-container\">\n      <app-ov-video [subscriber]=\"s\"></app-ov-video>\n    </div>\n  </div>\n</div>\n"

/***/ }),

/***/ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts":
/*!*********************************************************************************!*\
  !*** ./src/app/components/layouts/layout-best-fit/layout-best-fit.component.ts ***!
  \*********************************************************************************/
/*! exports provided: LayoutBestFitComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "LayoutBestFitComponent", function() { return LayoutBestFitComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/router */ "./node_modules/@angular/router/fesm5/router.js");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! openvidu-browser */ "./node_modules/openvidu-browser/lib/index.js");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(openvidu_browser__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _openvidu_layout__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../openvidu-layout */ "./src/app/components/layouts/openvidu-layout.ts");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};




var LayoutBestFitComponent = /** @class */ (function () {
    function LayoutBestFitComponent(route, appRef) {
        var _this = this;
        this.route = route;
        this.appRef = appRef;
        this.subscribers = [];
        this.numberOfScreenStreams = 0;
        this.layoutOptions = {
            maxRatio: 3 / 2,
            minRatio: 9 / 16,
            fixedRatio: false,
            bigClass: 'OV_big',
            bigPercentage: 0.8,
            bigFixedRatio: false,
            bigMaxRatio: 3 / 2,
            bigMinRatio: 9 / 16,
            bigFirst: true,
            animate: true // Whether you want to animate the transitions
        };
        this.route.params.subscribe(function (params) {
            _this.sessionId = params.sessionId;
            _this.secret = params.secret;
        });
    }
    LayoutBestFitComponent.prototype.beforeunloadHandler = function () {
        this.leaveSession();
    };
    LayoutBestFitComponent.prototype.sizeChange = function (event) {
        var _this = this;
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(function () {
            _this.openviduLayout.updateLayout();
        }, 20);
    };
    LayoutBestFitComponent.prototype.ngOnDestroy = function () {
        this.leaveSession();
    };
    LayoutBestFitComponent.prototype.ngOnInit = function () {
        var _this = this;
        var OV = new openvidu_browser__WEBPACK_IMPORTED_MODULE_2__["OpenVidu"]();
        this.session = OV.initSession();
        this.session.on('streamCreated', function (event) {
            var changeFixedRatio = false;
            if (event.stream.typeOfVideo === 'SCREEN') {
                _this.numberOfScreenStreams++;
                changeFixedRatio = true;
            }
            var subscriber = _this.session.subscribe(event.stream, undefined);
            subscriber.on('streamPlaying', function (e) {
                var video = subscriber.videos[0].video;
                video.parentElement.parentElement.classList.remove('custom-class');
                _this.updateLayout(changeFixedRatio);
            });
            _this.addSubscriber(subscriber);
        });
        this.session.on('streamDestroyed', function (event) {
            var changeFixedRatio = false;
            if (event.stream.typeOfVideo === 'SCREEN') {
                _this.numberOfScreenStreams--;
                changeFixedRatio = true;
            }
            _this.deleteSubscriber(event.stream.streamManager);
            _this.updateLayout(changeFixedRatio);
        });
        var port = !!location.port ? (':' + location.port) : '';
        var token = 'wss://' + location.hostname + port + '?sessionId=' + this.sessionId + '&secret=' + this.secret + '&recorder=true';
        this.session.connect(token)
            .catch(function (error) {
            console.error(error);
        });
        this.openviduLayout = new _openvidu_layout__WEBPACK_IMPORTED_MODULE_3__["OpenViduLayout"]();
        this.openviduLayout.initLayoutContainer(document.getElementById('layout'), this.layoutOptions);
    };
    LayoutBestFitComponent.prototype.addSubscriber = function (subscriber) {
        this.subscribers.push(subscriber);
        this.appRef.tick();
    };
    LayoutBestFitComponent.prototype.deleteSubscriber = function (subscriber) {
        var index = -1;
        for (var i = 0; i < this.subscribers.length; i++) {
            if (this.subscribers[i] === subscriber) {
                index = i;
                break;
            }
        }
        if (index > -1) {
            this.subscribers.splice(index, 1);
        }
        this.appRef.tick();
    };
    LayoutBestFitComponent.prototype.leaveSession = function () {
        if (this.session) {
            this.session.disconnect();
        }
        ;
        this.subscribers = [];
        this.session = null;
    };
    LayoutBestFitComponent.prototype.updateLayout = function (changeFixedRatio) {
        if (changeFixedRatio) {
            this.layoutOptions.fixedRatio = this.numberOfScreenStreams > 0;
            this.openviduLayout.setLayoutOptions(this.layoutOptions);
        }
        this.openviduLayout.updateLayout();
    };
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('window:beforeunload'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
    ], LayoutBestFitComponent.prototype, "beforeunloadHandler", null);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["HostListener"])('window:resize', ['$event']),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], LayoutBestFitComponent.prototype, "sizeChange", null);
    LayoutBestFitComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-layout-best-fit',
            template: __webpack_require__(/*! ./layout-best-fit.component.html */ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.html"),
            styles: [__webpack_require__(/*! ./layout-best-fit.component.css */ "./src/app/components/layouts/layout-best-fit/layout-best-fit.component.css")],
            encapsulation: _angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewEncapsulation"].None
        }),
        __metadata("design:paramtypes", [_angular_router__WEBPACK_IMPORTED_MODULE_1__["ActivatedRoute"], _angular_core__WEBPACK_IMPORTED_MODULE_0__["ApplicationRef"]])
    ], LayoutBestFitComponent);
    return LayoutBestFitComponent;
}());



/***/ }),

/***/ "./src/app/components/layouts/openvidu-layout.ts":
/*!*******************************************************!*\
  !*** ./src/app/components/layouts/openvidu-layout.ts ***!
  \*******************************************************/
/*! exports provided: OpenViduLayout */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "OpenViduLayout", function() { return OpenViduLayout; });
var OpenViduLayout = /** @class */ (function () {
    function OpenViduLayout() {
    }
    OpenViduLayout.prototype.fixAspectRatio = function (elem, width) {
        var sub = elem.querySelector('.OT_root');
        if (sub) {
            // If this is the parent of a subscriber or publisher then we need
            // to force the mutation observer on the publisher or subscriber to
            // trigger to get it to fix it's layout
            var oldWidth = sub.style.width;
            sub.style.width = width + 'px';
            // sub.style.height = height + 'px';
            sub.style.width = oldWidth || '';
        }
    };
    OpenViduLayout.prototype.positionElement = function (elem, x, y, width, height, animate) {
        var _this = this;
        var targetPosition = {
            left: x + 'px',
            top: y + 'px',
            width: width + 'px',
            height: height + 'px'
        };
        this.fixAspectRatio(elem, width);
        if (animate && $) {
            $(elem).stop();
            $(elem).animate(targetPosition, animate.duration || 200, animate.easing || 'swing', function () {
                _this.fixAspectRatio(elem, width);
                if (animate.complete) {
                    animate.complete.call(_this);
                }
            });
        }
        else {
            $(elem).css(targetPosition);
        }
        this.fixAspectRatio(elem, width);
    };
    OpenViduLayout.prototype.getVideoRatio = function (elem) {
        if (!elem) {
            return 3 / 4;
        }
        var video = elem.querySelector('video');
        if (video && video.videoHeight && video.videoWidth) {
            return video.videoHeight / video.videoWidth;
        }
        else if (elem.videoHeight && elem.videoWidth) {
            return elem.videoHeight / elem.videoWidth;
        }
        return 3 / 4;
    };
    OpenViduLayout.prototype.getCSSNumber = function (elem, prop) {
        var cssStr = $(elem).css(prop);
        return cssStr ? parseInt(cssStr, 10) : 0;
    };
    // Really cheap UUID function
    OpenViduLayout.prototype.cheapUUID = function () {
        return (Math.random() * 100000000).toFixed(0);
    };
    OpenViduLayout.prototype.getHeight = function (elem) {
        var heightStr = $(elem).css('height');
        return heightStr ? parseInt(heightStr, 10) : 0;
    };
    OpenViduLayout.prototype.getWidth = function (elem) {
        var widthStr = $(elem).css('width');
        return widthStr ? parseInt(widthStr, 10) : 0;
    };
    OpenViduLayout.prototype.getBestDimensions = function (minR, maxR, count, WIDTH, HEIGHT, targetHeight) {
        var maxArea, targetCols, targetRows, targetWidth, tWidth, tHeight, tRatio;
        // Iterate through every possible combination of rows and columns
        // and see which one has the least amount of whitespace
        for (var i = 1; i <= count; i++) {
            var colsAux = i;
            var rowsAux = Math.ceil(count / colsAux);
            // Try taking up the whole height and width
            tHeight = Math.floor(HEIGHT / rowsAux);
            tWidth = Math.floor(WIDTH / colsAux);
            tRatio = tHeight / tWidth;
            if (tRatio > maxR) {
                // We went over decrease the height
                tRatio = maxR;
                tHeight = tWidth * tRatio;
            }
            else if (tRatio < minR) {
                // We went under decrease the width
                tRatio = minR;
                tWidth = tHeight / tRatio;
            }
            var area = (tWidth * tHeight) * count;
            // If this width and height takes up the most space then we're going with that
            if (maxArea === undefined || (area > maxArea)) {
                maxArea = area;
                targetHeight = tHeight;
                targetWidth = tWidth;
                targetCols = colsAux;
                targetRows = rowsAux;
            }
        }
        return {
            maxArea: maxArea,
            targetCols: targetCols,
            targetRows: targetRows,
            targetHeight: targetHeight,
            targetWidth: targetWidth,
            ratio: targetHeight / targetWidth
        };
    };
    ;
    OpenViduLayout.prototype.arrange = function (children, WIDTH, HEIGHT, offsetLeft, offsetTop, fixedRatio, minRatio, maxRatio, animate) {
        var targetHeight;
        var count = children.length;
        var dimensions;
        if (!fixedRatio) {
            dimensions = this.getBestDimensions(minRatio, maxRatio, count, WIDTH, HEIGHT, targetHeight);
        }
        else {
            // Use the ratio of the first video element we find to approximate
            var ratio = this.getVideoRatio(children.length > 0 ? children[0] : null);
            dimensions = this.getBestDimensions(ratio, ratio, count, WIDTH, HEIGHT, targetHeight);
        }
        // Loop through each stream in the container and place it inside
        var x = 0, y = 0;
        var rows = [];
        var row;
        // Iterate through the children and create an array with a new item for each row
        // and calculate the width of each row so that we know if we go over the size and need
        // to adjust
        for (var i = 0; i < children.length; i++) {
            if (i % dimensions.targetCols === 0) {
                // This is a new row
                row = {
                    children: [],
                    width: 0,
                    height: 0
                };
                rows.push(row);
            }
            var elem = children[i];
            row.children.push(elem);
            var targetWidth = dimensions.targetWidth;
            targetHeight = dimensions.targetHeight;
            // If we're using a fixedRatio then we need to set the correct ratio for this element
            if (fixedRatio) {
                targetWidth = targetHeight / this.getVideoRatio(elem);
            }
            row.width += targetWidth;
            row.height = targetHeight;
        }
        // Calculate total row height adjusting if we go too wide
        var totalRowHeight = 0;
        var remainingShortRows = 0;
        for (var i = 0; i < rows.length; i++) {
            row = rows[i];
            if (row.width > WIDTH) {
                // Went over on the width, need to adjust the height proportionally
                row.height = Math.floor(row.height * (WIDTH / row.width));
                row.width = WIDTH;
            }
            else if (row.width < WIDTH) {
                remainingShortRows += 1;
            }
            totalRowHeight += row.height;
        }
        if (totalRowHeight < HEIGHT && remainingShortRows > 0) {
            // We can grow some of the rows, we're not taking up the whole height
            var remainingHeightDiff = HEIGHT - totalRowHeight;
            totalRowHeight = 0;
            for (var i = 0; i < rows.length; i++) {
                row = rows[i];
                if (row.width < WIDTH) {
                    // Evenly distribute the extra height between the short rows
                    var extraHeight = remainingHeightDiff / remainingShortRows;
                    if ((extraHeight / row.height) > ((WIDTH - row.width) / row.width)) {
                        // We can't go that big or we'll go too wide
                        extraHeight = Math.floor(((WIDTH - row.width) / row.width) * row.height);
                    }
                    row.width += Math.floor((extraHeight / row.height) * row.width);
                    row.height += extraHeight;
                    remainingHeightDiff -= extraHeight;
                    remainingShortRows -= 1;
                }
                totalRowHeight += row.height;
            }
        }
        // vertical centering
        y = ((HEIGHT - (totalRowHeight)) / 2);
        // Iterate through each row and place each child
        for (var i = 0; i < rows.length; i++) {
            row = rows[i];
            // center the row
            var rowMarginLeft = ((WIDTH - row.width) / 2);
            x = rowMarginLeft;
            for (var j = 0; j < row.children.length; j++) {
                var elem = row.children[j];
                var targetWidth = dimensions.targetWidth;
                targetHeight = row.height;
                // If we're using a fixedRatio then we need to set the correct ratio for this element
                if (fixedRatio) {
                    targetWidth = Math.floor(targetHeight / this.getVideoRatio(elem));
                }
                elem.style.position = 'absolute';
                // $(elem).css('position', 'absolute');
                var actualWidth = targetWidth - this.getCSSNumber(elem, 'paddingLeft') -
                    this.getCSSNumber(elem, 'paddingRight') -
                    this.getCSSNumber(elem, 'marginLeft') -
                    this.getCSSNumber(elem, 'marginRight') -
                    this.getCSSNumber(elem, 'borderLeft') -
                    this.getCSSNumber(elem, 'borderRight');
                var actualHeight = targetHeight - this.getCSSNumber(elem, 'paddingTop') -
                    this.getCSSNumber(elem, 'paddingBottom') -
                    this.getCSSNumber(elem, 'marginTop') -
                    this.getCSSNumber(elem, 'marginBottom') -
                    this.getCSSNumber(elem, 'borderTop') -
                    this.getCSSNumber(elem, 'borderBottom');
                this.positionElement(elem, x + offsetLeft, y + offsetTop, actualWidth, actualHeight, animate);
                x += targetWidth;
            }
            y += targetHeight;
        }
    };
    OpenViduLayout.prototype.filterDisplayNone = function (element) {
        return element.style.display !== 'none';
    };
    OpenViduLayout.prototype.updateLayout = function () {
        if (this.layoutContainer.style.display === 'none') {
            return;
        }
        var id = this.layoutContainer.id;
        if (!id) {
            id = 'OT_' + this.cheapUUID();
            this.layoutContainer.id = id;
        }
        var HEIGHT = this.getHeight(this.layoutContainer) -
            this.getCSSNumber(this.layoutContainer, 'borderTop') -
            this.getCSSNumber(this.layoutContainer, 'borderBottom');
        var WIDTH = this.getWidth(this.layoutContainer) -
            this.getCSSNumber(this.layoutContainer, 'borderLeft') -
            this.getCSSNumber(this.layoutContainer, 'borderRight');
        var availableRatio = HEIGHT / WIDTH;
        var offsetLeft = 0;
        var offsetTop = 0;
        var bigOffsetTop = 0;
        var bigOffsetLeft = 0;
        var bigOnes = Array.prototype.filter.call(this.layoutContainer.querySelectorAll('#' + id + '>.' + this.opts.bigClass), this.filterDisplayNone);
        var smallOnes = Array.prototype.filter.call(this.layoutContainer.querySelectorAll('#' + id + '>*:not(.' + this.opts.bigClass + ')'), this.filterDisplayNone);
        if (bigOnes.length > 0 && smallOnes.length > 0) {
            var bigWidth = void 0, bigHeight = void 0;
            if (availableRatio > this.getVideoRatio(bigOnes[0])) {
                // We are tall, going to take up the whole width and arrange small
                // guys at the bottom
                bigWidth = WIDTH;
                bigHeight = Math.floor(HEIGHT * this.opts.bigPercentage);
                offsetTop = bigHeight;
                bigOffsetTop = HEIGHT - offsetTop;
            }
            else {
                // We are wide, going to take up the whole height and arrange the small
                // guys on the right
                bigHeight = HEIGHT;
                bigWidth = Math.floor(WIDTH * this.opts.bigPercentage);
                offsetLeft = bigWidth;
                bigOffsetLeft = WIDTH - offsetLeft;
            }
            if (this.opts.bigFirst) {
                this.arrange(bigOnes, bigWidth, bigHeight, 0, 0, this.opts.bigFixedRatio, this.opts.bigMinRatio, this.opts.bigMaxRatio, this.opts.animate);
                this.arrange(smallOnes, WIDTH - offsetLeft, HEIGHT - offsetTop, offsetLeft, offsetTop, this.opts.fixedRatio, this.opts.minRatio, this.opts.maxRatio, this.opts.animate);
            }
            else {
                this.arrange(smallOnes, WIDTH - offsetLeft, HEIGHT - offsetTop, 0, 0, this.opts.fixedRatio, this.opts.minRatio, this.opts.maxRatio, this.opts.animate);
                this.arrange(bigOnes, bigWidth, bigHeight, bigOffsetLeft, bigOffsetTop, this.opts.bigFixedRatio, this.opts.bigMinRatio, this.opts.bigMaxRatio, this.opts.animate);
            }
        }
        else if (bigOnes.length > 0 && smallOnes.length === 0) {
            this.
                // We only have one bigOne just center it
                arrange(bigOnes, WIDTH, HEIGHT, 0, 0, this.opts.bigFixedRatio, this.opts.bigMinRatio, this.opts.bigMaxRatio, this.opts.animate);
        }
        else {
            this.arrange(smallOnes, WIDTH - offsetLeft, HEIGHT - offsetTop, offsetLeft, offsetTop, this.opts.fixedRatio, this.opts.minRatio, this.opts.maxRatio, this.opts.animate);
        }
    };
    OpenViduLayout.prototype.initLayoutContainer = function (container, opts) {
        this.opts = {
            maxRatio: (opts.maxRatio != null) ? opts.maxRatio : 3 / 2,
            minRatio: (opts.minRatio != null) ? opts.minRatio : 9 / 16,
            fixedRatio: (opts.fixedRatio != null) ? opts.fixedRatio : false,
            animate: (opts.animate != null) ? opts.animate : false,
            bigClass: (opts.bigClass != null) ? opts.bigClass : 'OT_big',
            bigPercentage: (opts.bigPercentage != null) ? opts.bigPercentage : 0.8,
            bigFixedRatio: (opts.bigFixedRatio != null) ? opts.bigFixedRatio : false,
            bigMaxRatio: (opts.bigMaxRatio != null) ? opts.bigMaxRatio : 3 / 2,
            bigMinRatio: (opts.bigMinRatio != null) ? opts.bigMinRatio : 9 / 16,
            bigFirst: (opts.bigFirst != null) ? opts.bigFirst : true
        };
        this.layoutContainer = typeof (container) === 'string' ? $(container) : container;
    };
    OpenViduLayout.prototype.setLayoutOptions = function (options) {
        this.opts = options;
    };
    return OpenViduLayout;
}());



/***/ }),

/***/ "./src/app/components/layouts/ov-video.component.ts":
/*!**********************************************************!*\
  !*** ./src/app/components/layouts/ov-video.component.ts ***!
  \**********************************************************/
/*! exports provided: OpenViduVideoComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "OpenViduVideoComponent", function() { return OpenViduVideoComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! openvidu-browser */ "./node_modules/openvidu-browser/lib/index.js");
/* harmony import */ var openvidu_browser__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(openvidu_browser__WEBPACK_IMPORTED_MODULE_1__);
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var OpenViduVideoComponent = /** @class */ (function () {
    function OpenViduVideoComponent() {
    }
    OpenViduVideoComponent.prototype.ngAfterViewInit = function () {
        this._subscriber.addVideoElement(this.elementRef.nativeElement);
    };
    Object.defineProperty(OpenViduVideoComponent.prototype, "subscriber", {
        set: function (subscriber) {
            this._subscriber = subscriber;
            if (!!this.elementRef) {
                this._subscriber.addVideoElement(this.elementRef.nativeElement);
            }
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ViewChild"])('videoElement'),
        __metadata("design:type", _angular_core__WEBPACK_IMPORTED_MODULE_0__["ElementRef"])
    ], OpenViduVideoComponent.prototype, "elementRef", void 0);
    __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Input"])(),
        __metadata("design:type", openvidu_browser__WEBPACK_IMPORTED_MODULE_1__["Subscriber"]),
        __metadata("design:paramtypes", [openvidu_browser__WEBPACK_IMPORTED_MODULE_1__["Subscriber"]])
    ], OpenViduVideoComponent.prototype, "subscriber", null);
    OpenViduVideoComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-ov-video',
            template: '<video #videoElement></video>'
        })
    ], OpenViduVideoComponent);
    return OpenViduVideoComponent;
}());



/***/ }),

/***/ "./src/app/components/session-details/session-details.component.css":
/*!**************************************************************************!*\
  !*** ./src/app/components/session-details/session-details.component.css ***!
  \**************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ""

/***/ }),

/***/ "./src/app/components/session-details/session-details.component.html":
/*!***************************************************************************!*\
  !*** ./src/app/components/session-details/session-details.component.html ***!
  \***************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = "<p>\n  session-details works!\n</p>\n"

/***/ }),

/***/ "./src/app/components/session-details/session-details.component.ts":
/*!*************************************************************************!*\
  !*** ./src/app/components/session-details/session-details.component.ts ***!
  \*************************************************************************/
/*! exports provided: SessionDetailsComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SessionDetailsComponent", function() { return SessionDetailsComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

var SessionDetailsComponent = /** @class */ (function () {
    function SessionDetailsComponent() {
    }
    SessionDetailsComponent.prototype.ngOnInit = function () {
    };
    SessionDetailsComponent = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"])({
            selector: 'app-session-details',
            template: __webpack_require__(/*! ./session-details.component.html */ "./src/app/components/session-details/session-details.component.html"),
            styles: [__webpack_require__(/*! ./session-details.component.css */ "./src/app/components/session-details/session-details.component.css")]
        }),
        __metadata("design:paramtypes", [])
    ], SessionDetailsComponent);
    return SessionDetailsComponent;
}());



/***/ }),

/***/ "./src/app/services/info.service.ts":
/*!******************************************!*\
  !*** ./src/app/services/info.service.ts ***!
  \******************************************/
/*! exports provided: InfoService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "InfoService", function() { return InfoService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/_esm5/index.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (undefined && undefined.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};


var InfoService = /** @class */ (function () {
    function InfoService() {
        this.newInfo$ = new rxjs__WEBPACK_IMPORTED_MODULE_1__["Subject"]();
    }
    InfoService.prototype.getInfo = function () {
        return this.info;
    };
    InfoService.prototype.updateInfo = function (info) {
        this.info = info;
        this.newInfo$.next(info);
    };
    InfoService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])(),
        __metadata("design:paramtypes", [])
    ], InfoService);
    return InfoService;
}());



/***/ }),

/***/ "./src/app/services/rest.service.ts":
/*!******************************************!*\
  !*** ./src/app/services/rest.service.ts ***!
  \******************************************/
/*! exports provided: RestService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RestService", function() { return RestService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};

var RestService = /** @class */ (function () {
    function RestService() {
    }
    RestService.prototype.getOpenViduPublicUrl = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!!_this.openviduPublicUrl) {
                resolve(_this.openviduPublicUrl);
            }
            else {
                var url = location.protocol + '//' + location.hostname + ((!!location.port) ? (':' + location.port) : '') +
                    '/config/openvidu-publicurl';
                var http_1 = new XMLHttpRequest();
                http_1.onreadystatechange = function () {
                    if (http_1.readyState === 4) {
                        if (http_1.status === 200) {
                            _this.openviduPublicUrl = http_1.responseText;
                            resolve(http_1.responseText);
                        }
                        else {
                            reject('Error getting OpenVidu publicurl');
                        }
                    }
                    ;
                };
                http_1.open('GET', url, true);
                http_1.send();
            }
        });
    };
    RestService = __decorate([
        Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"])()
    ], RestService);
    return RestService;
}());



/***/ }),

/***/ "./src/environments/environment.ts":
/*!*****************************************!*\
  !*** ./src/environments/environment.ts ***!
  \*****************************************/
/*! exports provided: environment */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "environment", function() { return environment; });
// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
var environment = {
    production: false
};


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "./node_modules/@angular/core/fesm5/core.js");
/* harmony import */ var _angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/platform-browser-dynamic */ "./node_modules/@angular/platform-browser-dynamic/fesm5/platform-browser-dynamic.js");
/* harmony import */ var _app_app_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./app/app.module */ "./src/app/app.module.ts");
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./environments/environment */ "./src/environments/environment.ts");




if (_environments_environment__WEBPACK_IMPORTED_MODULE_3__["environment"].production) {
    Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["enableProdMode"])();
}
Object(_angular_platform_browser_dynamic__WEBPACK_IMPORTED_MODULE_1__["platformBrowserDynamic"])().bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_2__["AppModule"]);


/***/ }),

/***/ 0:
/*!***************************!*\
  !*** multi ./src/main.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! /home/pablo/Documents/Git/openvidu/openvidu-server/src/angular/frontend/src/main.ts */"./src/main.ts");


/***/ })

},[[0,"runtime","vendor"]]]);
//# sourceMappingURL=main.js.map