# MMM-Weather-SMHI-Hourly
Magic Mirror module that displays weather from SMHI hourly. Weather icons changes upon sunrise and sunset.
Relys on [SMHI Api](https://opendata.smhi.se/apidocs/metfcst/index.html) and [Sunrise Sunset Api](https://sunrise-sunset.org/api)

![Snyk Vulnerabilities for GitHub Repo](https://img.shields.io/snyk/vulnerabilities/github/Menturan/MMM-Weather-SMHI-Hourly.svg?style=flat-square)
![LGTM Alerts](https://img.shields.io/lgtm/alerts/g/Menturan/MMM-Weather-SMHI-Hourly.svg?style=flat-square)
![LGTM Grade](https://img.shields.io/lgtm/grade/javascript/g/Menturan/MMM-Weather-SMHI-Hourly.svg?style=flat-square)
![Yarn](https://img.shields.io/badge/dependency%20manager-Yarn-blue.svg?style=flat-square)

![Maintenance](https://img.shields.io/maintenance/yes/2022.svg?style=flat-square)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Menturan/MMM-Weather-SMHI-Hourly.svg?style=flat-square)
![GitHub](https://img.shields.io/github/license/Menturan/MMM-Weather-SMHI-Hourly.svg?style=flat-square)

## Screenshot
![Screenshot](screenshot.png)

## Install
This module uses Yarn.
1. `yarn install`

## Configuration

| Key | Value | Required | Default | Description |
|-----|-------|---------|---------|---------|
|lon|_numeric_| Y| -| Longitude |
|lat|_numeric_| Y|-| Latitude |
|hours|_numeric_| N| 12| Hours to show. |
|updateInterval | _numeric_ milliseconds |N| 3600000 (60min)| Number of milliseconds between updates |
|debug|_boolean_| N| false| Debug output. |

## Example config

``` json
{
    module: "MMM-Weather-SMHI-Hourly",
    position: "top_right",
    header: "Väder", // Optional
    config: {
        lon: "xx.xxxxxx",
        lat: "yy.yyyyyy",
        hours: 12
    }
}
```
## Development
This module isn't perfect. If you find a bug or has a feature request don't hesitate to create an issue OR even better, create a pull request! :D
