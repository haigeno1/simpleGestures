
var opt = new LibOption();

var gestureFunction = {
	"new_tab": function(options) {
		var url = options.url;

		chrome.tabs.query({active: true}, function(tabs) {
			var current_tab = tabs[0];
			var append_index = current_tab.index+1;
			if (url == null) {
				chrome.tabs.create({index:append_index});
			}
			else {
				chrome.tabs.create({url:url, index:append_index});
			}
		});
	},
	"close_tab": function() {
		chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
			var current_tab = tabs[0];
			chrome.tabs.remove(current_tab.id);
		});
	},
	"reload": function() {
		chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
			var current_tab = tabs[0];
			chrome.tabs.reload(current_tab.id);
		});
	},
	"reload_all": function() {
		chrome.tabs.getAllInWindow(null, function(tabs) {
			for (var i = 0; i < tabs.length; i++) {
				chrome.tabs.reload(tabs[i].id);
			}
		});
	},
	"next_tab": function() {
		chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
			var current_tab = tabs[0];
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
			var current_tab = tabs[0];
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
			var current_tab = tabs[0];
			chrome.tabs.getAllInWindow(null, function(all_tabs) {
				for (var i = 0; i < all_tabs.length; i++) {
					if (all_tabs[i].id != current_tab.id) {
						chrome.tabs.remove(all_tabs[i].id);
					}
				}
			});
		});
	},
	"close_all": function() {
		chrome.tabs.getAllInWindow(null, function(tabs) {
			for (var i = 0; i < tabs.length; i++) {
				chrome.tabs.remove(tabs[i].id);
			}
		});
	},
	"open_option": function() {
		chrome.tabs.create({
			"url": chrome.extension.getURL("html/options_page.html"),
		});
	},
	"open_extension": function() {
		var chromeExtURL="chrome://extensions/";
		chrome.tabs.getAllInWindow(null, function(tabs) {
			for (var i = 0; i < tabs.length; i++) {
				if (tabs[i].url == chromeExtURL) {
					chrome.tabs.update(tabs[i].id, {selected:true});
					return;
				}
			}
			chrome.tabs.create({url:chromeExtURL,selected:true});
		});
	},
	"restart": function() {
		chrome.tabs.create({url:"chrome://restart",selected:true});
	},
	"last_tab": function() {
//		chrome.storage.local.get('lasturl', function(result){
//			chrome.tabs.create({'url':result.lasturl})
//		});
	},
};

chrome.extension.onMessage.addListener(
	function onMessage_handler(request, sender, sendResponse) {
		var responseString = "";

		if ("load_options" == request.msg) {
			sendResponse({message: "yes", "options_json": opt.loadOptionsString() });
			return;
		}
		else if (request.msg in gestureFunction) {
			gestureFunction[request.msg](request);
		}
		else {
			responseString= "unknown command";
		}

		sendResponse({message: responseString});
	}
);

