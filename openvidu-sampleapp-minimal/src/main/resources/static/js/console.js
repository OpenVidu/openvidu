/*
 * (C) Copyright 2013 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/**
 * Object that piggy-back the browser console and show their messages on a DIV
 *
 * Inspired by Node.js ClIM module (https://github.com/epeli/node-clim)
 *
 * @constructor
 *
 * @param {String}
 *            id: id attribute of the DIV tag where to show the messages
 * @param console:
 *            reference to the original browser console
 */
function Console(id, console) {
	var div = document.getElementById(id);

	function createMessage(msg, color) {
		// Sanitize the input
		msg = msg.toString().replace(/</g, '&lt;');
		var span = document.createElement('SPAN');
		if (color != undefined) {
			span.style.color = color;
		}
		span.appendChild(document.createTextNode(new Date() +':'+msg));
		return span;
	}

	this._append = function(element) {
		div.appendChild(element);
		div.appendChild(document.createElement('BR'));
		// $(window).scrollTo('max', {duration: 500});
	};

	/**
	 * Show an Error message both on browser console and on defined DIV
	 *
	 * @param msg:
	 *            message or object to be shown
	 */
	this.error = function(msg) {
		console.error(msg);
		this._append(createMessage(msg, "#FF0000"));
	};

	/**
	 * Show an Warn message both on browser console and on defined DIV
	 *
	 * @param msg:
	 *            message or object to be shown
	 */
	this.warn = function(msg) {
		console.warn(msg);
		this._append(createMessage(msg, "#FFA500"));
	};

	/**
	 * Show an Info message both on browser console and on defined DIV
	 *
	 * @param msg:
	 *            message or object to be shown
	 */
	this.info = this.log = function(msg) {
		console.info(msg);
		this._append(createMessage(msg));
	};

	/**
	 * Show an Debug message both on browser console and on defined DIV
	 *
	 * @param msg:
	 *            message or object to be shown
	 */
	this.debug = function(msg) {
		console.log(msg);
		// this._append(createMessage(msg, "#0000FF"));
	};
}
