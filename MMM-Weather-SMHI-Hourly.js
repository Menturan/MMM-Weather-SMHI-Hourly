/*
 * Notifications:
 *      UPDATE_WHEATER: Sent to update any listeners of the current configuration.
 *      NEW_WHEATER_DATA: Received when a new feed is available.
 *      SERVICE_FAILURE: Received when the service access failed.
 */
Module.register("MMM-Weather-SMHI-Hourly", {
	// Module defaults
	defaults: {
		updateInterval: 60 * 60 * 1000, // 60min
		lon: 0,
		lat: 0,
		hours: 12,
		useBeaufort: false, // Not implemented
		showWindDirection: true, // Not implemnted
	},

	// Required scripts
	getScripts: function () {
		return ["moment.js", this.file("node_modules/mustache/mustache.min.js")];
	},

	getStyles: function () {
		return [this.file("css/icons/weather-icons.min.css")];
	},

	// Start the module
	start: function () {
		Log.log("Starting module: " + this.name);
		this.prepearHtmlTemplates();
		this.config.language = config.language;
		moment.locale(config.language);
		this.loaded = false;
		this.sendSocketNotification("UPDATE_WEATHER", this.config); // Send config to helper and initiate an update
	},

	prepearHtmlTemplates: function () {
		var self = this;
		var currentWeatherHtmlTemplatePromise = fetch(this.file("currentWeather.mst"))
			.then(function (response) {
				return response.text();
			});

		var futureWeatherHtmlTemplatePromise = fetch(this.file("futureWeather.mst"))
			.then(function (response) {
				return response.text();
			});

		var values = Promise.all([currentWeatherHtmlTemplatePromise, futureWeatherHtmlTemplatePromise])
			.then(values => {
				self.setHtmlTemplates(values);
			});

	},

	setHtmlTemplates: function (templates) {
		this.currentWeatherHtmlTemplate = templates[0];
		this.futureWeatherHtmlTemplate = templates[1];
		Mustache.parse(this.currentWeatherHtmlTemplate);
		Mustache.parse(this.futureWeatherHtmlTemplate);
	},

	iconFunction: function (iconFunction) {
		var iconTable = {
			1: ["wi wi-day-sunny", "wi wi-night-clear"],
			2: ["wi wi-day-sunny", "wi wi-night-clear"],
			3: ["wi wi-day-sunny-overcast", "wi wi-night-alt-partly-cloudy"],
			4: ["wi wi-day-cloudy", "wi wi-night-alt-cloudy"],
			5: ["wi wi-cloudy", "wi wi-night-cloudy"],
			6: ["wi wi-cloudy", "wi wi-night-cloudy"],
			7: ["wi wi-day-fog", "wi wi-night-fog"],
			8: ["wi wi-day-showers", "wi wi-night-alt-showers"],
			9: ["wi wi-day-showers", "wi wi-night-alt-showers"],
			10: ["wi wi-day-rain", "wi wi-night-alt-rain"],
			11: ["wi wi-day-thunderstorm", "wi wi-night-alt-thunderstorm"],
			12: ["wi wi-day-sleet", "wi wi-night-alt-sleet"],
			13: ["wi wi-day-sleet", "wi wi-night-alt-sleet"],
			14: ["wi wi-sleet", "wi wi-night-sleet"],
			15: ["wi wi-day-snow", "wi wi-night-snow"],
			16: ["wi wi-day-snow", "wi wi-night-snow"],
			17: ["wi wi-snow", "wi wi-night-alt-snow"],
			18: ["wi wi-day-rain-mix", "wi wi-night-alt-rain-mix"],
			19: ["wi wi-day-rain-mix", "wi wi-night-alt-rain-mix"],
			20: ["wi wi-rain", "wi wi-rain"],
			21: ["wi wi-day-lightning", "wi wi-night-alt-lightning"],
			22: ["wi wi-day-sleet", "wi wi-night-alt-sleet"],
			23: ["wi wi-day-sleet", "wi wi-night-alt-sleet"],
			24: ["wi wi-sleet", "wi wi-night-sleet"],
			25: ["wi wi-day-snow", "wi wi-night-snow"],
			26: ["wi wi-day-snow", "wi wi-night-snow"],
			27: ["wi wi-snow", "wi wi-night-alt-snow"]
		}
		return this.night ? iconTable[this.icon][1] : iconTable[this.icon][0];
	},

	getDom: function () {
		var wrapper = document.createElement("div");
		if (!this.loaded) {
			wrapper.innerHTML = "Loading wheater...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var container = document.createElement("div");

		var currentWeatherHtml = document.createElement("div");
		currentWeatherHtml.innerHTML = Mustache.render(this.currentWeatherHtmlTemplate, this.currentWeather.current);
		container.appendChild(currentWeatherHtml);

		var headerWeatherHtml = document.createElement("div");
		headerWeatherHtml.innerHTML = "<header></header>";
		container.appendChild(headerWeatherHtml);

		var futureWeatherHtml = document.createElement("div");
		futureWeatherHtml.innerHTML = Mustache.render(this.futureWeatherHtmlTemplate, this.currentWeather);
		container.appendChild(futureWeatherHtml);

		wrapper.appendChild(container);

		return wrapper;
	},

	socketNotificationReceived: function (notification, payload) {
		this.debugLog("Notification - " + notification);
		if (notification === "NEW_WHEATER_DATA") {
			this.loaded = true;
			this.failure = undefined;
			this.currentWeather = payload;
			this.currentWeather["iconFunction"] = this.iconFunction;
			this.currentWeather.current["iconFunction"] = this.iconFunction;
			this.debugLog(this.currentWeather);
			this.updateDom(this.config.animationSpeed);
		}
		if (notification == "SERVICE_FAILURE") {
			this.failure = payload;
			Log.log("Service failure: " + this.failure.StatusCode + ":" + this.failure.Message);
			this.updateDom();
		}
	},

	debugLog: function (msg) {
		if (this.config.debug) {
			Log.log("[" + (new Date(Date.now())).toLocaleTimeString() + "] - DEBUG - " + this.name + " - " + new Error().lineNumber + " - : " + msg);
		}
	}
});
