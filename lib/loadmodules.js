/*
 * node-loadmodules
 * Loader to modulate application
 * 
 * Copyright(c) 2016 Leonardo Silva
 * 
 * Apache-2.0 Licensed
 */


var fs = require('fs')
  , path = require('path')
  , extend = require('extend')
  , __config = {
  		rootPath: 'modules/'
  	,	globalVar: 'modules'
  	,	extensions: ['*.js']
  	,	ignore: []
  	,	autoExec: ['modules/*/routes', 'modules/*/robots']
  	,	serverPath: './'
	};

var LoadModules = function(options, callback) {
	var vm = this;

	if(typeof options == 'function') {
		callback = options;
		options = {};
	}

	vm.__config = extend(__config, options);
	vm.__config.serverPath = vm.getServerPath();

	vm.readDir(function(err, result) {
		root[vm.__config.globalVar] = {};

		if(err) return callback ? callback(true, root[vm.__config.globalVar]) : false;

		vm.mountObject(result, function(err, object) {
			if(err) return callback ? callback(true, root[vm.__config.globalVar]) : false;
			
			root[vm.__config.globalVar] = vm.getModuleNode(object);

			vm.autoExec(object);

			if(callback) callback(false, root[vm.__config.globalVar]);
		});
	});
}//LoadModules

LoadModules.prototype.getServerPath = function() {
	var vm = this
	  , serverPath = __dirname.replace(path.dirname(require.main.filename), '');

	serverPath = serverPath.split('/');
	serverPath = serverPath.filter(function(r) {return r !== '';});
	serverPath = serverPath.map(function(r, i) { return (i === 0 ? './' : '') + '../'});

	return serverPath.join('');
};//getServerPath

LoadModules.prototype.readDir = function(fileList, rootPath, callback) {
	var vm = this;

	fileList = fileList || [];

	if(typeof fileList == 'function') {
		callback = fileList;
		fileList = [];
		rootPath = vm.__config.rootPath;
	}

	if(typeof rootPath == 'function') {
		callback = rootPath;
		rootPath = vm.__config.rootPath;
	}

	var _files = fs.readdirSync(rootPath)
	  , pending = _files.length;

	if(!pending) return callback(false, fileList);

	_files.forEach(function(file) {
		var filePath = path.join(rootPath, file);

		fs.stat(filePath, function(err, stats) {
			if(err) return callback(true, err);

			if(stats.isDirectory()) {
				vm.readDir(fileList, filePath, function(err, _dirs) {
					pending--;
					
					if(!pending) return callback(false, fileList);
				});
			} else {
				pending--;

				if(vm.mathExtension(file) && !vm.mathIgnore(filePath)) fileList.push(filePath);
				if(!pending) return callback(false, fileList);
			}
		});
	});
};//readDir

LoadModules.prototype.mathExtension = function(file) {
	return !!this.__config.extensions.filter(function(ext) {
		ext = ext.replace(/\*/g, '');

		var len = file.length - ext.length;

		if(file.lastIndexOf(ext) === len) return true;
	}).length;
};//mathExtension

LoadModules.prototype.mathIgnore = function(filePath) {
	return !!this.__config.ignore.filter(function(ignore) {
		var _ignore = ignore.split('*').filter(function(ig) {return ig !== ''});

		var _ignored = _ignore.map(function(ig) {
			var number = filePath.indexOf(ig);
			if(number >= 0) return number;
			return null;
		});

		_ignored = _ignored.filter(function(ig) {return ig !== null});

		if(_ignore.length === _ignored.length) {
			if(_ignored.length === 1) return true;

			for(var i = 0, l = _ignored.length; i < l; i++) {
				if(i > 0) {
					if(_ignored[i - 1] > _ignored[i]) return false;
				}
			}

			return true;
		}

		return false;
	}).length;
};//mathExtension

LoadModules.prototype.mountObject = function(files, callback) {
	var vm = this
	  , objMounted = {};

	files.forEach(function(file) {
		var _path = file.split('/')
		  , pathLength = _path.length - 1
		  , obj = {}
		  , objTemp = {};

		_path.reverse().forEach(function(path, index) {
			if(path !== '.' && path !== '..') {
				if(path.indexOf('-') >= 0) {
					path = path.split('-');

					path = path.map(function(ph, ind) {
						if(ind !== 0) return ph.charAt(0).toUpperCase() + ph.slice(1);

						return ph;
					});

					path = path.join('');
				}

				if(index === 0) {
					path = path.split('.')[0];
					objTemp[path] = require(vm.__config.serverPath + file) /*file*//*require('./' + file)*/;
				} else {
					objTemp[path] = obj;
				}

				obj = objTemp;
				objTemp = {};
			}
		});

		extend(true, objMounted, objMounted, obj);
	});

	callback(false, objMounted);
};//mountObject

LoadModules.prototype.getModuleNode = function(object) {
	var _path = this.__config.rootPath.split('/')
	  ,	_tmpObj = object;

	_path.forEach(function(path) {
		if(path && path !== '.' && path !== '..' && _tmpObj.hasOwnProperty(path)) {
			_tmpObj = _tmpObj[path];
		}
	});

	return _tmpObj;
};//getModuleNode

LoadModules.prototype.autoExec = function(object) {
	var vm = this;

	vm.__config.autoExec.forEach(function(auto) {
		var _paths = auto.split('/');

		loopPaths(_paths, root[vm.__config.globalVar]);
	});

	////////////////

	function loopPaths(paths, object) {
		var objTemp = object;

		for(var i = 0, l = paths.length; i < l; i++) {
			var path = paths[i];

			if(path !== vm.__config.globalVar) {
				if(path === '*') {
					for(var key in objTemp) {
						var obj = objTemp[key];

						loopPaths(paths.slice((i + 1), l), obj);
					}
					return false;
				}

				if(objTemp.hasOwnProperty(path)) objTemp = objTemp[path];
				else return;

				if((i + 1) >= l) {
					return loopObject(objTemp);
				}
			}
		}
	}//loopPaths

	function loopObject(object) {
		for(var key in object) {
			var obj = object[key];

			if(typeof obj === 'object') return loopObject(obj);
			if(typeof obj === 'function') obj();
		}
	}//loopObject
};//autoExec

module.exports = function(options, callback) {
	return new LoadModules(options, callback);
};
