var request = require("request-promise");
var moment = require("moment-timezone");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

	start: function () {
		var self = this;
		self.log("Starting helper", new Error());
		this.started = false;
	},

	scheduleUpdate: function () {
		var self = this;
		this.updatetimer = setInterval(function () {
			self.getAndSetWeatherData();
		}, self.config.updateInterval);
		this.sunriseTimer = setInterval(function () {
			self.getAndSetSunriseSunsetData();
		}, 12 * 60 * 60 * 1000); // 12h
	},

	cancelUpdate: function () {
		clearInterval(this.updatetimer);
		clearInterval(this.sunriseTimer);
	},

	parseAndFilter: function (smhiResponse, sunrise, sunset) {
		var self = this;
		moment.locale(this.config.language);
		var data = {};
		var future = [];
		var currentWeather = null;
		var currentTime = moment().seconds(0).minutes(0);
		var untilTime = moment().add(this.config.hours, "hours").seconds(0).minutes(0);
		for (let i = 0; i < smhiResponse.timeSeries.length; i++) {
			const forecast = smhiResponse.timeSeries[i];
			// forecast.validTime format: 2018-06-02T12:00:00Z
			var forecastTime = moment(forecast.validTime, "YYYY-MM-DDTHH:mm:ss").seconds(0).minutes(0);
			var diffUntilEndTime = Number(untilTime.diff(forecastTime, "hours", true).toFixed(0));
			var diffUntilCurrentTime = Number(currentTime.diff(forecastTime, "hours", true).toFixed(0));
			if (diffUntilEndTime < 0) {
				break;
			} else if (diffUntilCurrentTime === 0) {
				currentWeather = self.formatForecastData(forecast, sunrise, sunset);
			} else if (diffUntilCurrentTime < 0) {
				var formattedForecast = self.formatForecastData(forecast, sunrise, sunset);
				future.push(formattedForecast);
			}
		}
		data.current = currentWeather;
		data.future = future;
		return data;
	},

	isNight: function(time, sunrise, sunset) {
		let targetTime = parseInt(time.format("kk")); // Hour 01-24
		let sunsetHour = parseInt(sunset.format("kk"));
		let sunriseHour = parseInt(sunrise.format("kk"));
		return targetTime > sunsetHour | targetTime < sunriseHour;
	},

	formatForecastData(forecastData, sunrise, sunset) {
		var self = this;
		var formattedParameters = {};
		formattedParameters["time"] = moment(forecastData.validTime, "YYYY-MM-DDTHH:mm:ss").format("LT");
		formattedParameters["night"] = self.isNight(moment(forecastData.validTime, "YYYY-MM-DDTHH:mm:ss"), sunrise, sunset);
		for (let i = 0; i < forecastData.parameters.length; i++) {
			var parameter = forecastData.parameters[i];
			switch (parameter.name) {
			case "Wsymb2":
				formattedParameters["icon"] = parameter.values[0];
				break;
			case "t":
				formattedParameters["temp"] = parseFloat(this.roundValue(parameter.values[0]));
				break;
			case "ws":
				formattedParameters["wind"] = parseFloat(this.roundValue(parameter.values[0]));
				break;
			case "wd":
				formattedParameters["windDirection"] = parseFloat(this.roundValue(parameter.values[0]));
				break;
			case "tcc_mean":
				formattedParameters["clouds"] = parseFloat(this.roundValue(parameter.values[0]));
				break;
			case "pmax":
				formattedParameters["rain"] = parseFloat(this.roundValue(parameter.values[0]));
				break;
			case "r":
				formattedParameters["humidity"] = parameter.values[0];
				break;
			}
		}
		return formattedParameters;
	},

	processWeatherCreateItem(index, item, diff) {
		var self = this;
		item.diff = diff;
		if (!isNaN(item.icon)){
			item.icon = this.config.iconTable[item.icon][index];}
		return item;
	},

	roundValue: function (value) {
		return parseFloat(value).toFixed(1);
	},

	fetchInitialData: function () {
		var self = this;
		self.debugLog("Fetch initial data...", new Error());
		var sunrisePromise = self.fetchSunriseSunset(this.config, this.name);
		var smhiPromise = self.fetchSmhi(this.config, this.name);
		Promise.all([smhiPromise, sunrisePromise]).then(function (value) {
			self.setSunriseAndSunsetData(value[1]);
			this.data = {};
			this.sunrise = moment(value[1].results.sunrise);
			this.sunset = moment(value[1].results.sunset);
			self.debugLog(this.sunrise, new Error())
			self.debugLog(this.sunset, new Error())
			var weatherData = self.parseAndFilter(value[0], this.sunrise, this.sunset);
			Object.assign(this.data, weatherData);
			self.sendSocketNotification("NEW_WHEATER_DATA", data);
		}).catch(reason => {
			self.log(reason, new Error());
			self.getAndSetWeatherData();
		});

	},

	getAndSetWeatherData: function () {
		var self = this;
		var smhiPromise = self.fetchSmhi(this.config, this.name);
		Promise.resolve(smhiPromise).then(function (value) {
			self.debugLog(this.sunrise, new Error());
			self.debugLog(this.sunset, new Error());
			this.data = {};
			var weatherData = self.parseAndFilter(value, this.sunrise, this.sunset);
			Object.assign(this.data, weatherData);
			self.sendSocketNotification("NEW_WHEATER_DATA", data);
		}).catch(reason => {
			self.log(reason, new Error());
			self.sendSocketNotification("SERVICE_FAILURE", { erorr: reason });
		});
	},

	fetchSmhi: function (config, name) {
		var self = this;
		self.log("Fetching weather data", new Error());
		return new Promise(function (resolve, reject) {
			var option = {
				uri: "https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/" + config.lon + "/lat/" + config.lat + "/data.json",
				qs: {},
				json: true
			};
			self.debugLog(": Calling " + option.uri, new Error());
			request(option)
				.then(function (response) {
					resolve(response);
				})
				.catch(function (error) {
					self.log("ERROR - SMHI-api: " + error, new Error());
					reject(self.sendSocketNotification("SERVICE_FAILURE", { erorr: error }));
				});
		});
	},

	getAndSetSunriseSunsetData: function () {
		var self = this;
		var sunrisePromise = self.fetchSunriseSunset(this.config, this.name);
		Promise.resolve(sunrisePromise).then(function (value) {
			self.setSunriseAndSunsetData(value);
		}).catch(reason => {
			self.log(reason, new Error());
			// self.sendSocketNotification("SERVICE_FAILURE", { erorr: reason });
		});
	},

	setSunriseAndSunsetData: function (data) {
		var self = this;
		this.sunrise = moment(data.results.sunrise);
		this.sunset = moment(data.results.sunset);
		self.debugLog("Result from sunrise- and sunset-api:", new Error());
		self.debugLog("Sunrise:", new Error());
		self.debugLog(this.sunrise, new Error());
		self.debugLog("Sunset:", new Error());
		self.debugLog(this.sunset, new Error());
	},

	fetchSunriseSunset: function (config, name) {
		var self = this;
		return new Promise(function (resolve, reject) {
			self.log("Fetching sunrise data", new Error());
			var option = {
				uri: "https://api.sunrise-sunset.org/json",
				qs: {
					lat: config.lat,
					lng: config.lon,
					formatted: 0
				},
				json: true
			};
			self.debugLog(": Calling " + option.uri, new Error());

			request(option)
				.then(function (response) {
					resolve(response);
				})
				.catch(function (error) {
					self.log( "ERROR: " + error, new Error());
					if(this.sunset == undefined){
						self.log("Setting sunset to 18 and sunrise to 06.", new Error())
						this.sunset = moment().hour(18);
						this.sunrise = moment().hour(6);
					}
					reject();
				});
		});
	},

	// --------------------------------------- Handle notifications
	socketNotificationReceived: function (notification, payload) {
		var self = this;
		this.config = payload;
		self.debugLog("Notification - " + notification, new Error());
		self.debugLog("Started - " + this.started, new Error());
		if (notification === "UPDATE_WEATHER") {
			this.config = payload;
			if (this.started == false) {
				moment.locale(this.config.language);
				this.started = true;
				self.scheduleUpdate();
			}
			// Fetch first time at start.
			self.fetchInitialData();
		} else {
			self.sendSocketNotification("NEW_WHEATER_DATA", this.data);
		};
	},
	log: function (msg, error) {
		var stack = error.stack.toString().split(/\r\n|\n/);
		console.log("[" + (new Date(Date.now())).toLocaleTimeString() + "] - " + this.name + " : ", msg, " - [" + stack[1] + "]");
	},
	debugLog: function (msg, error) {
		if (this.config.debug) {
			var stack = error.stack.toString().split(/\r\n|\n/);
			console.log("[" + (new Date(Date.now())).toLocaleTimeString() + "] - DEBUG - " + this.name + " : ", msg, " - [" + stack[1] + "]");
		}
	}

});
