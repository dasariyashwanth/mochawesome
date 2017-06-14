'use strict';

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var mocha = require('mocha');
var uuid = require('uuid');
var stringify = require('json-stringify-safe');
var conf = require('./config');
var marge = require('mochawesome-report-generator');
var utils = require('./utils');

// Import the utility functions
var log = utils.log,
    getPercentClass = utils.getPercentClass,
    cleanTest = utils.cleanTest,
    traverseSuites = utils.traverseSuites;

// Track the total number of tests registered

var totalTestsRegistered = { total: 0 };

/**
 * Done function gets called before mocha exits
 *
 * Creates and saves the report HTML and JSON files
 *
 * @param {Object} output
 * @param {Object} config
 * @param {Function} exit
 *
 * @return {Promise} Resolves with successful report creation
 */

function done(output, config, failures, exit) {
  return marge.create(output, config).then(function (_ref) {
    var _ref2 = (0, _slicedToArray3.default)(_ref, 2),
        htmlFile = _ref2[0],
        jsonFile = _ref2[1];

    log('Report JSON saved to ' + jsonFile, null, config);
    log('Report HTML saved to ' + htmlFile, null, config);

    
  }).catch(function (err) {
    log(err, 'error', config);
  })
  .then(function () {
    /*html graphical reports starts here*/
    let http = require('http'),
    fs = require('fs'),
    reportFile = require('../../../output/mochawesome.json'),
    dateFormat = require('dateformat');
    var startDate = reportFile.stats.start,
      splitStartDate = startDate.split('.'),
      finalStartDate = splitStartDate[0].replace('T', " "),
      endDate = reportFile.stats.end,
      splitEndDate = endDate.split('.'),
      finalEndDate = splitEndDate[0].replace('T', " ");
    fs.readFile('./doughnut.html', 'utf-8', function (err, data) {        
        
      let failure = reportFile.stats.failures,
          success  = reportFile.stats.passes,
          pending = reportFile.stats.pending,
          total = reportFile.stats.tests,
          allTests = reportFile.suites.suites,
          result = '',
          timeTitle = '',
          timeValues = '',
          moduleCount = '',
          duration = 0,
          j=0;

      for(var i = 0; i<allTests.length; i++){
          duration = allTests[i].duration/1000;
          timeValues += duration+',';
          j = i+1;
          moduleCount += j+',';
          timeTitle += '"'+allTests[i].title+'",';
      }
      /*table data starts*/
      var passData = reportFile.allPasses,
          failData = reportFile.allFailures,
          passj = 0,
          failj = 0,
          failTableData = '',
          passTableData = '';
        if(passData.length != 0){
            passTableData   += '<table border="1"><thead></thead><tbody><tr><td>Sno</td><td>Success Test case Names</td></tr>';
            for (var i = 0; i < passData.length; i++) {
                passj = i+1;
                passTableData += '<tr><td>'+passj+'</td>';
                passTableData += '<td>'+passData[i].title+'</td>';
            }
        }
      if(failData.length != 0){
          failTableData   += '<table border="1"><thead></thead><tbody><tr><td>Sno</td><td>Failure Test case Names</td><td>Reason</td></tr>';
          for (var i = 0; i < failData.length; i++) {
              failj = i+1;
              failTableData += '<tr><td>'+failj+'</td>';
              failTableData += '<td>'+failData[i].title+'</td>';
              failTableData += '<td>'+failData[i].err.message+'</td></tr>';
          }
      }
      var tableData = failTableData+'<br/><br/>'+passTableData;
      result = data.replace('tableData', tableData);
      // result = result.replace('failTableData', failTableData);
      /*table ends here*/

      /*replace starts here*/
      result = result.replace('redPercentage', failure);
      result = result.replace('greenPercentage', success);
      result = result.replace('orangePercentage', pending);
      result = result.replace('successCount', success);
      result = result.replace('failureCount', failure);
      result = result.replace('pendingCount', pending);
      result = result.replace('totalCount', total);
      result = result.replace('finalStartDate', dateFormat(reportFile.stats.start));
      result = result.replace('finalEndDate', dateFormat(reportFile.stats.end));
      /*test cases time comparision data*/         
      result = result.replace('timeTitle',timeTitle);
      result = result.replace('timeValues',timeValues);
      result = result.replace('moduleCount',moduleCount);
      /*lie chart data*/
      result = result.replace('lineValues',timeValues);
      result = result.replace('lineValues1',timeValues);
      /*replace ends here*/

      /*creating and saving graphical html file with timestamp*/
      var milliseconds = new Date().getTime(),
          filePath = __dirname + '/output/htmlreport_'+milliseconds+'.html',
          open = require('open');
      filePath = filePath.replace('/node_modules/mochawesome/dist','');
          //destpath = __dirname + '/output/htmlreport_'+milliseconds+'.pdf',
      fs.exists(filePath, function (exists){
          if(exists){
              fs.truncate(filePath, 0, function(){});    
          }
          fs.writeFile(filePath, result,  function (err) {
              if (err) throw err;                
              open(filePath,'firefox');
              console.log("Graphical HTML File save to"+filePath);
          });
      });
    });
    /*html reports ends here*/
  })
  .then(function () {
    exit && exit(failures);
  });
}

/**
 * Initialize a new reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function Mochawesome(runner, options) {
  var _this = this;

  // Done function will be called before mocha exits
  // This is where we will save JSON and generate the HTML report
  this.done = function (failures, exit) {
    return done(_this.output, _this.config, failures, exit);
  };

  // Reset total tests counter
  totalTestsRegistered.total = 0;

  // Create/Save necessary report dirs/files
  var reporterOpts = options && options.reporterOptions || {};
  this.config = conf(reporterOpts);

  // Call the Base mocha reporter
  mocha.reporters.Base.call(this, runner);

  // Show the Spec Reporter in the console
  new mocha.reporters.Spec(runner); // eslint-disable-line

  var allTests = [];
  var allPending = [];
  var allFailures = [];
  var allPasses = [];
  var endCalled = false;

  // Add a unique identifier to each test/hook
  runner.on('test', function (test) {
    return test.uuid = uuid.v4();
  });
  runner.on('hook', function (hook) {
    return hook.uuid = uuid.v4();
  });
  // Add test to array of all tests
  runner.on('test end', function (test) {
    return allTests.push(test);
  });

  // Add pending test to array of pending tests
  runner.on('pending', function (test) {
    test.uuid = uuid.v4();
    allPending.push(test);
  });

  // Add passing test to array of passing tests
  runner.on('pass', function (test) {
    return allPasses.push(test);
  });

  // Add failed test to array of failed tests
  runner.on('fail', function (test) {
    return allFailures.push(test);
  });

  // Process the full suite
  runner.on('end', function () {
    try {
      /* istanbul ignore else */
      if (!endCalled) {
        // end gets called more than once for some reason
        // so we ensure the suite is processed only once
        endCalled = true;

        var allSuites = _this.runner.suite;

        traverseSuites(allSuites, totalTestsRegistered);

        var obj = {
          stats: _this.stats,
          suites: allSuites,
          allTests: allTests.map(cleanTest),
          allPending: allPending.map(cleanTest),
          allPasses: allPasses.map(cleanTest),
          allFailures: allFailures.map(cleanTest),
          copyrightYear: new Date().getFullYear()
        };

        obj.stats.testsRegistered = totalTestsRegistered.total;

        var _obj$stats = obj.stats,
            passes = _obj$stats.passes,
            failures = _obj$stats.failures,
            pending = _obj$stats.pending,
            tests = _obj$stats.tests,
            testsRegistered = _obj$stats.testsRegistered;

        var passPercentage = Math.round(passes / (testsRegistered - pending) * 1000) / 10;
        var pendingPercentage = Math.round(pending / testsRegistered * 1000) / 10;

        obj.stats.passPercent = passPercentage;
        obj.stats.pendingPercent = pendingPercentage;
        obj.stats.other = passes + failures + pending - tests;
        obj.stats.hasOther = obj.stats.other > 0;
        obj.stats.skipped = testsRegistered - tests;
        obj.stats.hasSkipped = obj.stats.skipped > 0;
        obj.stats.failures -= obj.stats.other;
        obj.stats.passPercentClass = getPercentClass(passPercentage);
        obj.stats.pendingPercentClass = getPercentClass(pendingPercentage);

        // Save the final output to be used in the done function
        _this.output = stringify(obj, null, 2);
      }
    } catch (e) {
      // required because thrown errors are not handled directly in the
      // event emitter pattern and mocha does not have an "on error"
      /* istanbul ignore next */
      log('Problem with mochawesome: ' + e.stack, 'error');
    }
  });
}

module.exports = Mochawesome;