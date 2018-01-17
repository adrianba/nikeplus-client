'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tcx = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _xmlHelper = require('./xmlHelper');

var _xmlHelper2 = _interopRequireDefault(_xmlHelper);

var _nikeHelper = require('./nikeHelper');

var _geolib = require('geolib');

var _geolib2 = _interopRequireDefault(_geolib);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Tcx = exports.Tcx = function () {
  function Tcx() {
    _classCallCheck(this, Tcx);
  }

  _createClass(Tcx, null, [{
    key: 'ConvertFromNikeActivity',
    value: function ConvertFromNikeActivity(res, options) {
      options = Object.assign({}, {
        notes: 'Generated on : nike.bullrox.net',
        authorName: 'Paul du Pavillon - https://nike.bullrox.net'
      }, options);
      var data = res.data;
      var elevations = _nikeHelper.NikeHelper.GetMetric(data, 'elevation');
      var latitudes = _nikeHelper.NikeHelper.GetMetric(data, 'latitude');
      var longitudes = _nikeHelper.NikeHelper.GetMetric(data, 'longitude');
      var speeds = _nikeHelper.NikeHelper.GetMetric(data, 'speed');
      var distances = _nikeHelper.NikeHelper.GetMetric(data, 'distance');
      var heartRates = _nikeHelper.NikeHelper.GetMetric(data, 'heart_rate');

      var result = {
        TrainingCenterDatabase: {
          '@xsi:schemaLocation': 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd',
          '@xmlns:ns5': 'http://www.garmin.com/xmlschemas/ActivityGoals/v1',
          '@xmlns:ns4': 'http://www.garmin.com/xmlschemas/ProfileExtension/v1',
          '@xmlns:ns3': 'http://www.garmin.com/xmlschemas/ActivityExtension/v2',
          '@xmlns:ns2': 'http://www.garmin.com/xmlschemas/UserProfile/v2',
          '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          '@xmlns': 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2',
          Activities: {
            Activity: {
              '@Sport': 'Running',
              'Notes': options.notes,
              Id: new Date(data.start_epoch_ms).toISOString(),
              Lap: {
                '@StartTime': new Date(data.start_epoch_ms).toISOString(),
                TotalTimeSeconds: (data.active_duration_ms / 1000.0).toString(),
                DistanceMeters: !!_nikeHelper.NikeHelper.GetSummary(data, 'distance') ? _nikeHelper.NikeHelper.GetSummary(data, 'distance').value * 1000 : null,
                MaximumSpeed: !!speeds ? speeds.map(function (s) {
                  return s.value;
                }).reduce(function (prev, next) {
                  return Math.max(prev, next);
                }) * 0.277778 : null, //km/h --> m/s
                Calories: !!_nikeHelper.NikeHelper.GetSummary(data, 'calories') ? _nikeHelper.NikeHelper.GetSummary(data, 'calories').value : null,
                Intensity: 'Active',
                TriggerMethod: 'Manual',
                AverageHeartRateBpm: null,
                MaximumHeartRateBpm: null,
                Track: {
                  Trackpoint: []
                }
              }
            }
          },
          Author: {
            '@xsi:type': 'Application_t',
            Name: options.authorName,
            Build: {
              Version: {
                VersionMajor: 1,
                VersionMinor: 0,
                BuildMajor: 1,
                BuildMinor: 0
              }
            },
            LangID: 'en'
          }
        }
      };
      var trackPoints = [];

      if (!!_nikeHelper.NikeHelper.GetSummary(data, 'heart_rate')) {
        result.TrainingCenterDatabase.Activities.Activity.Lap.AverageHeartRateBpm = { Value: _nikeHelper.NikeHelper.GetSummary(data, 'heart_rate').value };
      }
      if (heartRates) {
        result.TrainingCenterDatabase.Activities.Activity.Lap.MaximumHeartRateBpm = { Value: heartRates.map(function (h) {
            return h.value;
          }).reduce(function (prev, next) {
            return Math.max(prev, next);
          }) };
      }

      (latitudes || []).forEach(function (item, index) {
        return trackPoints.push({
          Time: item.end_epoch_ms,
          Position: {
            LatitudeDegrees: latitudes[index].value,
            LongitudeDegrees: longitudes[index].value
            //AltitudeMeters: elevations && elevations.length > 0 && elevations.length > index ? elevations[index].value : null //Elevation is not altitude
          } });
      });

      // (distances || []).forEach((d)=> {
      //   const matches = trackPoints.filter((t)=> t.Time >= d.start_epoch_ms && t.Time <= d.end_epoch_ms && t.DistanceMeters === undefined)
      //   matches.forEach((m) => m.DistanceMeters = ((d.value * 1000) / matches.length))
      // });

      trackPoints.forEach(function (t, i) {
        if (i - 1 >= 0) {
          t.DistanceMeters = _geolib2.default.getDistance({ latitude: trackPoints[i - 1].Position.LatitudeDegrees, longitude: trackPoints[i - 1].Position.LongitudeDegrees }, { latitude: t.Position.LatitudeDegrees, longitude: t.Position.LongitudeDegrees }, 1, 3);
        }
      });

      //cumulative distance
      var sum = 0;
      trackPoints.forEach(function (t) {
        sum += t.DistanceMeters >= 0 ? t.DistanceMeters : 0;
        t.DistanceMeters = t.DistanceMeters >= 0 ? sum : null;
      });

      (speeds || []).forEach(function (d) {
        var matches = trackPoints.filter(function (t) {
          return t.Time >= d.start_epoch_ms && t.Time <= d.end_epoch_ms;
        });
        matches.forEach(function (m) {
          return m.Extensions = {
            TPX: {
              '@xmlns': 'http://www.garmin.com/xmlschemas/ActivityExtension/v2',
              Speed: d.value * 0.277778 //km/h --> m/s
            }
          };
        });
      });

      (heartRates || []).forEach(function (d) {
        var matches = trackPoints.filter(function (t) {
          return t.Time >= d.start_epoch_ms && t.Time <= d.end_epoch_ms || t.Time <= d.end_epoch_ms && t.HeartRateBpm === undefined;
        }); //sometimes heartRates datetime are out of bound of lat/lng records
        matches.forEach(function (m) {
          return m.HeartRateBpm = { Value: d.value };
        });
      });

      trackPoints.forEach(function (t) {
        return t.Time = new Date(t.Time).toISOString();
      });
      result.TrainingCenterDatabase.Activities.Activity.Lap.Track.Trackpoint = trackPoints;
      return _xmlHelper2.default.ConvertFromObj(result);
    }
  }]);

  return Tcx;
}();