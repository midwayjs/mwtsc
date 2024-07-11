#!/usr/bin/env node
'use strict';
const { run } = require('../lib/index');
const { check } = require('../lib/version/check');
check(run);
