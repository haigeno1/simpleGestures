const inputMouse = new Mouse();
const inputKeyboard = new Keyboard();
const mainGestureMan = new LibGesture();
const option = new LibOption();
option.load();

var lockerOn = false;
var nextMenuSkip = true;

/**
 * 現在のジェスチャ軌跡に対応するアクション名を返す
 * @returns {*}
 */
const getNowGestureActionName = function () {
	const gestureString = mainGestureMan.getGestureString();
	if ( ! gestureString) {
		return null;
	}

	return option.getGestureActionName(gestureString);
};

/**
 * フロントからのメッセージリクエストに対する処理
 * 
 * @type {{load_options: requestFunction.load_options}}
 */
const requestFunction = {
	reset_input: function(request) {
		inputKeyboard.lock();
		inputKeyboard.reset();
		inputMouse.reset();

		setTimeout(function(){
			inputKeyboard.unlock();
		}, 100);
	},
	reload_option: function() {
		option.load();
	},
	load_options: function(request) {
		return {message: "yes", "options_json": option.getRawStorageData()};
	},
	keydown: function(request) {
		inputKeyboard.setOn(request.keyCode);

		return {message: "yes"};
	},
	keyup: function (request) {
		inputKeyboard.setOff(request.keyCode);

		return {message: "yes"};
	},
	mousedown: function(request) {
		responseString = request.which === inputMouse.LEFT_BUTTON ? "LEFT" : "RIGHT";
		console.log(responseString);

		const response = {
			message: "yes",
			action: null,
			href: request.href,
			gestureString: '',
			gestureAction: '',
			canvas: {
				clear: false,
				draw: false,
				x: request.x,
				y: request.y,
				toX: request.x,
				toY: request.y,
			}
		};

		// Ctrlが押された状態だと、マウスジェスチャ無効な仕様
		if (inputKeyboard.isOn(inputKeyboard.KEY_CTRL)) {
			console.log('on KEY_CTRL. skip gesture.');
			return;
		}

		inputMouse.setOn(request.which);

		if (request.which === inputMouse.LEFT_BUTTON) {
			if (inputMouse.isLeft() && inputMouse.isRight()) {
				lockerOn = true;
				response.canvas.clear = true;

				response.action = "back";
			}
		}
		else if (request.which === inputMouse.RIGHT_BUTTON) {
			nextMenuSkip = false;

			// locker gesture
			if (inputMouse.isLeft() && inputMouse.isRight()) {
				lockerOn = true;

				response.action = "forward";
			}

			mainGestureMan.clear();

			if ( ! lockerOn) {
				console.log("select request.href: " + request.href );

				response.canvas.draw = true;
				mainGestureMan.startGestrue(request.x, request.y, request.href);
			}
		}

		return response;
	},
	mousemove: function(request) {
		// mousemove の event.whichには、最初に押されたボタンが入る。
		const response = {
			message: "yes",
			action: null,
			href: request.href,
			gestureString: mainGestureMan.getGestureString(),
			gestureAction: getNowGestureActionName(),
			canvas: {
				clear: false,
				draw: false,
				x: request.x,
				y: request.y,
				toX: request.x,
				toY: request.y,
			}
		};

		if (request.which == 0) {
			inputMouse.reset();
			mainGestureMan.clear();
			response.canvas.clear = true;
			return response;
		}

		if (inputMouse.isRight() && request.which == inputMouse.RIGHT_BUTTON) {
			if ( ! lockerOn) {
				if (mainGestureMan.registPoint(request.x, request.y)) {
					response.canvas.draw = true;
					response.canvas.x = mainGestureMan.getLastX();
					response.canvas.y = mainGestureMan.getLastY();
					response.canvas.toX = mainGestureMan.getX();
					response.canvas.toY = mainGestureMan.getY();
				}
			}
		}

		return response;
	},
	mouseup: function(request) {
		const doAction = getNowGestureActionName();

		const response = {
			message: "yes",
			action: null,
			href: mainGestureMan.getURL(),
			gestureString: mainGestureMan.getGestureString(),
			gestureAction: doAction,
			canvas: {
				clear: false,
				draw: false,
				x: request.x,
				y: request.y,
				toX: request.x,
				toY: request.y,
			}
		};

		inputMouse.setOff(request.which);

		if (request.which === inputMouse.RIGHT_BUTTON) {
			if (lockerOn) {
				nextMenuSkip = true;
			}
			else if (doAction) {
				nextMenuSkip = true;

				if (typeof gestureFunction[doAction] === 'function') {
					const optionParams = {
						href: mainGestureMan.getURL()
					};
					gestureFunction[doAction](optionParams);
				}
				else {
					// バックグラウンドで処理できないものはフロントに任せる
					response.action = doAction;
				}
			}

			mainGestureMan.endGesture();
			lockerOn = false;
		}

		return response;
	},
};

/**
 * 各マウスジェスチャの処理
 * @type type
 */
const gestureFunction = {
	"new_tab": function(options) {
		let _url = '';

		if (options && typeof options.href !== 'undefined') {
			_url = options.href;
		}

		chrome.tabs.query({active: true}, function(tabs) {
			const current_tab = tabs[0];
			const append_index = current_tab.index+1;
			if ( ! _url) {
				chrome.tabs.create({index:append_index});
			}
			else {
				chrome.tabs.create({url:_url, index:append_index});
			}
		});
	},
	"close_tab": function() {
		chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
			const current_tab = tabs[0];
			chrome.tabs.remove(current_tab.id);
		});
	},
	"reload": function() {
		chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
			const current_tab = tabs[0];
			chrome.tabs.reload(current_tab.id);
		});
	},
	"reload_all": function() {
		chrome.tabs.getAllInWindow(null, function(tabs) {
			tabs.forEach(function(tab){
				chrome.tabs.reload(tab.id);
			});
		});
	},
	"next_tab": function() {
		chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
			const current_tab = tabs[0];
			chrome.tabs.getAllInWindow(null, function(tabs) {
				if (current_tab.index == tabs.length-1) {
					chrome.tabs.update(tabs[0].id, {active:true});
				}
				else {
					chrome.tabs.update(tabs[current_tab.index+1].id, {active:true});
				}
			});
		});
	},
	"prev_tab": function() {
		chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
			const current_tab = tabs[0];
			chrome.tabs.getAllInWindow(null, function(tabs) {
				if (current_tab.index == 0) {
					chrome.tabs.update(tabs[tabs.length-1].id, {active:true});
				}
				else {
					chrome.tabs.update(tabs[current_tab.index-1].id, {active:true});
				}
			});
		});
	},
	"close_all_background": function() {
		chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
			const current_tab = tabs[0];
			chrome.tabs.getAllInWindow(null, function(tabs) {
				tabs.forEach(function(tab){
					if (tab.id != current_tab.id) {
						chrome.tabs.remove(tab.id);
					}
				});
			});
		});
	},
	"close_all": function() {
		chrome.tabs.getAllInWindow(null, function(tabs) {
			tabs.forEach(function(tab){
				chrome.tabs.remove(tab.id);
			});
		});
	},
	"open_option": function() {
		chrome.tabs.create({
			"url": chrome.extension.getURL("html/options_page.html"),
		});
	},
	"open_extension": function() {
		const chromeExtURL = "chrome://extensions/";
		chrome.tabs.getAllInWindow(null, function(tabs) {
			tabs.forEach(function(tab){
				if (tab.url == chromeExtURL) {
					chrome.tabs.update(tab.id, {selected:true});
					return;
				}
			});
			chrome.tabs.create({url:chromeExtURL, selected:true});
		});
	},
	"restart": function() {
		chrome.tabs.create({url:"chrome://restart", selected:true});
	},
	"last_tab": function() {
		chrome.sessions.getRecentlyClosed({maxResults:1}, function(sessions){
			if (sessions.length) {
				chrome.sessions.restore();
			}
		});
	},
};

/**
 * フロントサイドからのメッセージ受信した時に発生するイベント
 *
 * @param {type} param
 */
chrome.extension.onMessage.addListener(function onMessage_handler(request, sender, sendResponse) {
	const reqFunc = requestFunction[request.msg];
	if (typeof reqFunc === 'function') {
		sendResponse(reqFunc(request, sender));
	} else {
		sendResponse({message: "unknown command"});
	}
});