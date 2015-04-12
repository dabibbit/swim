/* Basic SWM app */

var path = require('path');

var express = require('express');
var logger = require('morgan');

var debug = require('debug')('swim:app');

var swim = require('./');

var _config = null;

try {
  _config = require(path.resolve(process.cwd(),
        process.env.CONFIG_FILE || 'config.json'));
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error(process.env.CONFIG_FILE ? 'Config file not found'
        : 'No config.json available');
  } else {
    console.error('Invalid config');
  }
  process.exit(1);
}

function getPort() {
  return process.env.PORT || 3000;
}

var config = {
  root: process.argv[2] || _config.root || path.join(__dirname, 'content'),

  working:   path.join(__dirname, '.data'),
  published: path.join(__dirname, 'public', 'snapshot'),

  view: '402',

  'ttl': _config.ttl || 10,

  'content': {
    baseUri: (_config.baseUrl || 'http://localhost:' + getPort())
               + '/snapshot',
  },

  'payment': [],

  'validity': 3600,
};

var modules = [];

if (_config.payment) {
  _config.payment.forEach(function (option) {
    var network = option.network;

    var address = null;

    try {
      address = swim[network].addressFromKey(option.key);
    } catch (error) {
      console.error('WARNING: Invalid private key ' + option.key
          + '. Skipping.');
      return;
    }

    var amount = option.price;

    config['payment'].push({
      'network': network,
      'address': address,
      'amount':  amount
    });

    modules.push(swim[network](option.key));
  });
}

if (config.payment.length === 0) {
  console.error('WARNING: No payment information available.');
}

var instance = swim(config);

instance.initialize(modules);
instance.run();

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', instance.router());

debug('Serving from ' + path.resolve(config.root));

module.exports = app;

// vim: et ts=2 sw=2
