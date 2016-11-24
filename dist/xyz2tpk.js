'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.writeConf = writeConf;
exports.writeBounds = writeBounds;
exports.writeItemInfo = writeItemInfo;
exports.writeJson = writeJson;
exports.writeLyrFile = writeLyrFile;
exports.ziptpk = ziptpk;
exports.generateDirectories = generateDirectories;
exports.deleteTempDirectory = deleteTempDirectory;
exports.copyTiles = copyTiles;
exports.xyz2tpk = xyz2tpk;

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _xmldom = require('xmldom');

var _xmldom2 = _interopRequireDefault(_xmldom);

var _sphericalmercator = require('sphericalmercator');

var _sphericalmercator2 = _interopRequireDefault(_sphericalmercator);

var _tilelive = require('tilelive');

var _tilelive2 = _interopRequireDefault(_tilelive);

var _tileliveArcgis = require('tilelive-arcgis');

var _tileliveArcgis2 = _interopRequireDefault(_tileliveArcgis);

var _tileliveHttp = require('tilelive-http');

var _tileliveHttp2 = _interopRequireDefault(_tileliveHttp);

var _archiver = require('archiver');

var _archiver2 = _interopRequireDefault(_archiver);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _jsonfile = require('jsonfile');

var _jsonfile2 = _interopRequireDefault(_jsonfile);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DOMParser = _xmldom2.default.DOMParser;
var templatePath = _path2.default.resolve(__dirname, '..', 'templates');

function writeConf(minzoom, maxzoom, format, paths) {
    var confPath = _path2.default.resolve(templatePath, 'templateConf.xml');
    return new Promise(function (resolve, reject) {
        _fsExtra2.default.readFile(confPath, function (err, data) {
            if (err) reject(err);
            var doc = new DOMParser().parseFromString(data.toString('utf-8'));
            var levelids = doc.getElementsByTagName('LevelID');
            var nodesToRemove = [];
            for (var index = 0; index < levelids.length; index += 1) {
                var levelid = levelids[index];
                var level = parseInt(levelid.textContent, 10);
                if (level < minzoom || level > maxzoom) {
                    nodesToRemove.push(levelid.parentNode);
                }
            }
            nodesToRemove.forEach(function (node) {
                node.parentNode.removeChild(node);
            });
            var formattedFormat = null;
            if (format.substring(0, 3) === 'jpg') {
                formattedFormat = 'JPEG';
            } else {
                formattedFormat = format.toUpperCase();
            }
            doc.getElementsByTagName('CacheTileFormat')[0].textContent = formattedFormat;

            _fsExtra2.default.writeFile(paths.layerPath + '/conf.xml', doc, function (error) {
                if (error) reject(error);
                resolve(paths);
            });
        });
    });
}

function boundsToMercator(bounds) {
    var sphericalmercator = new _sphericalmercator2.default();
    var mercatorBounds = sphericalmercator.convert(bounds, '900913');
    return mercatorBounds;
}

function writeBounds(bounds, paths) {
    var confPath = _path2.default.resolve(templatePath, 'templateConf.cdi');
    return new Promise(function (resolve, reject) {
        _fsExtra2.default.readFile(confPath, function (err, data) {
            if (err) reject(err);
            var mercatorBounds = boundsToMercator(bounds);
            var doc = new DOMParser().parseFromString(data.toString('utf-8'));
            doc.getElementsByTagName('XMin')[0].textContent = mercatorBounds[0];
            doc.getElementsByTagName('YMin')[0].textContent = mercatorBounds[1];
            doc.getElementsByTagName('XMax')[0].textContent = mercatorBounds[2];
            doc.getElementsByTagName('YMax')[0].textContent = mercatorBounds[3];
            _fsExtra2.default.writeFile(paths.layerPath + '/conf.cdi', doc, function (error) {
                if (error) reject(error);
                resolve(paths.layerPath);
            });
        });
    });
}

function writeItemInfo(paths) {
    var itemTemplatePath = _path2.default.resolve(templatePath, 'templateItem.pkinfo');
    var itemInfoTemplatePath = _path2.default.resolve(templatePath, 'templateItemInfo.xml');
    return new Promise(function (resolve, reject) {
        _fsExtra2.default.copy(itemTemplatePath, paths.esriInfoPath + '/item.pkinfo', function (err) {
            if (err) reject(err);
            _fsExtra2.default.copy(itemInfoTemplatePath, paths.esriInfoPath + '/iteminfo.xml', function (error) {
                if (error) reject(error);
                resolve(paths);
            });
        });
    });
}

function writeJson(minzoom, maxzoom, bounds, paths) {
    var jsonPath = _path2.default.resolve(templatePath, 'templateMapServer.json');
    var mercatorBounds = boundsToMercator(bounds);
    return new Promise(function (resolve, reject) {
        _jsonfile2.default.readFile(jsonPath, function (err, file) {
            if (err) reject(err);
            var obj = file;
            obj.contents.fullExtent.xmin = mercatorBounds[0];
            obj.contents.fullExtent.ymin = mercatorBounds[1];
            obj.contents.fullExtent.xmax = mercatorBounds[2];
            obj.contents.fullExtent.ymax = mercatorBounds[3];

            obj.contents.initialExtent.xmin = mercatorBounds[0];
            obj.contents.initialExtent.ymin = mercatorBounds[1];
            obj.contents.initialExtent.xmax = mercatorBounds[2];
            obj.contents.initialExtent.ymax = mercatorBounds[3];

            var minLod = obj.contents.tileInfo.lods.find(function (lod) {
                return lod.level === minzoom;
            });
            obj.contents.minScale = minLod.scale;

            var maxLod = obj.contents.tileInfo.lods.find(function (lod) {
                return lod.level === maxzoom;
            });
            obj.contents.maxScale = maxLod.scale;

            _jsonfile2.default.writeFile(paths.serviceDescPath + '/mapserver.json', obj, function (error) {
                if (error) reject(error);
                resolve(paths);
            });
        });
    });
}

function writeLyrFile(paths) {
    var lyrFilePath = _path2.default.resolve(paths.layerPath, '..', 'Layers.lyr');
    var layerTemplatePath = _path2.default.resolve(templatePath, 'templateLayers.lyr');
    return new Promise(function (resolve, reject) {
        _fsExtra2.default.copy(layerTemplatePath, lyrFilePath, null, function (err) {
            if (err) reject(err);
            resolve(paths);
        });
    });
}

function ziptpk(layerPath) {
    var tmpDirectory = _path2.default.resolve(layerPath, '..', '..', '..');
    var name = _path2.default.resolve(layerPath, '..', '..');
    var zipFile = _path2.default.resolve(tmpDirectory, name + '.tpk');
    var output = _fsExtra2.default.createWriteStream(zipFile);
    // 0 compression works with ArcGIS online but not Collector
    var archive = (0, _archiver2.default)('zip', { store: true });
    //const archive = archiver('zip');
    return new Promise(function (resolve, reject) {
        archive.on('error', function (err) {
            reject(err);
        });
        archive.pipe(output);
        archive.directory(name, '');
        archive.finalize();
        output.on('close', function () {
            resolve(zipFile);
        });
    });
}

function generateDirectories(directory) {
    var layerPath = _path2.default.resolve(directory, 'v101', 'Layers');
    var serviceDescPath = _path2.default.resolve(directory, 'servicedescriptions', 'mapserver');
    var esriInfoPath = _path2.default.resolve(directory, 'esriinfo');
    var paths = { layerPath: layerPath, serviceDescPath: serviceDescPath, esriInfoPath: esriInfoPath };
    return new Promise(function (resolve, reject) {
        (0, _mkdirp2.default)(layerPath, function (layerPathErr) {
            if (layerPathErr) reject(layerPathErr);
            (0, _mkdirp2.default)(serviceDescPath, function (serviceDescPathError) {
                if (serviceDescPathError) reject(serviceDescPathError);
                (0, _mkdirp2.default)(esriInfoPath, function (esriInfoPathError) {
                    if (esriInfoPathError) reject(esriInfoPathError);
                    resolve(paths);
                });
            });
        });
    });
}

function deleteTempDirectory(directory, zipFile) {
    return new Promise(function (resolve, reject) {
        _fsExtra2.default.remove(directory, null, function (err) {
            if (err) reject(err);
            resolve(zipFile);
        });
    });
}

function copyTiles(bounds, minzoom, maxzoom, service, token, format, layerPath) {
    // Register sources with tilelive
    // Will fail on http without retry true.
    (0, _tileliveHttp2.default)(_tilelive2.default, { retry: true });
    _tileliveArcgis2.default.registerProtocols(_tilelive2.default);

    var options = {
        type: 'scanline',
        close: 'true',
        timeout: 100000000,
        bounds: bounds,
        minzoom: minzoom,
        maxzoom: maxzoom
    };
    var httpTemplate = 'http://api.tiles.mapbox.com/v4/' + service + '/{z}/{x}/{y}.' + format + '?access_token=' + token;
    console.log(httpTemplate);
    var arcgisTemplate = 'arcgis://' + layerPath;
    return new Promise(function (resolve, reject) {
        _tilelive2.default.copy(httpTemplate, arcgisTemplate, options, function (err) {
            if (err) reject(err);
            resolve(layerPath);
        });
    });
}

function xyz2tpk(bounds, minzoom, maxzoom, service, token, directory, callback) {
    var format = 'jpg90';
    generateDirectories(directory).then(writeLyrFile).then(writeConf.bind(null, minzoom, maxzoom, format)).then(writeItemInfo).then(writeJson.bind(null, minzoom, maxzoom, bounds)).then(writeBounds.bind(null, bounds)).then(copyTiles.bind(null, bounds, minzoom, maxzoom, service, token, format)).then(ziptpk).then(function (zipFile) {
        return callback(null, zipFile);
    }).catch(callback);
}