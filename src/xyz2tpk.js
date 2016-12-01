import fs from 'fs-extra';
import path from 'path';
import xmldom from 'xmldom';
import Sphericalmercator from 'sphericalmercator';
import tilelive from 'tilelive';
//import tileliveArcGIS from 'tilelive-arcgis';
import tileliveArcGIS from '../../tilelive-arcgis';
import tileliveHttp from 'tilelive-http';
import archiver from 'archiver';
import mkdirp from 'mkdirp';
import jsonfile from 'jsonfile';

const DOMParser = xmldom.DOMParser;
const templatePath = path.resolve(__dirname, '..', 'templates');

export function writeConf(minzoom, maxzoom, format, paths) {
    const confPath = path.resolve(templatePath, 'templateConf.xml');
    return new Promise((resolve, reject) => {
        fs.readFile(confPath, (err, data) => {
            if (err) reject(err);
            const doc = new DOMParser().parseFromString(data.toString('utf-8'));
            const levelids = doc.getElementsByTagName('LevelID');
            const nodesToRemove = [];
            for (let index = 0; index < levelids.length; index += 1) {
                const levelid = levelids[index];
                const level = parseInt(levelid.textContent, 10);
                if (level < minzoom || level > maxzoom) {
                    nodesToRemove.push(levelid.parentNode);
                }
            }
            nodesToRemove.forEach((node) => {
                node.parentNode.removeChild(node);
            });
            let formattedFormat = null;
            if (format.substring(0, 3) === 'jpg') {
                formattedFormat = 'JPEG';
            } else {
                formattedFormat = format.toUpperCase();
            }
            doc.getElementsByTagName('CacheTileFormat')[0].textContent =
                formattedFormat;

            fs.writeFile(`${paths.layerPath}/conf.xml`, doc, (error) => {
                if (error) reject(error);
                resolve(paths);
            });
        });
    });
}

function boundsToMercator(bounds) {
    const sphericalmercator = new Sphericalmercator();
    const mercatorBounds = sphericalmercator.convert(bounds, '900913');
    return mercatorBounds;
}

export function writeBounds(bounds, paths) {
    const confPath = path.resolve(templatePath, 'templateConf.cdi');
    return new Promise((resolve, reject) => {
        fs.readFile(confPath, (err, data) => {
            if (err) reject(err);
            const mercatorBounds = boundsToMercator(bounds);
            const doc = new DOMParser().parseFromString(data.toString('utf-8'));
            doc.getElementsByTagName('XMin')[0].textContent = mercatorBounds[0];
            doc.getElementsByTagName('YMin')[0].textContent = mercatorBounds[1];
            doc.getElementsByTagName('XMax')[0].textContent = mercatorBounds[2];
            doc.getElementsByTagName('YMax')[0].textContent = mercatorBounds[3];
            fs.writeFile(`${paths.layerPath}/conf.cdi`, doc, (error) => {
                if (error) reject(error);
                resolve(paths.layerPath);
            });
        });
    });
}

export function writeItemInfo(paths) {
    const itemTemplatePath = path.resolve(templatePath, 'templateItem.pkinfo');
    const itemInfoTemplatePath = path.resolve(templatePath,
                                              'templateItemInfo.xml');
    return new Promise((resolve, reject) => {
        fs.copy(itemTemplatePath, `${paths.esriInfoPath}/item.pkinfo`,
                (err) => {
                    if (err) reject(err);
                    fs.copy(itemInfoTemplatePath,
                            `${paths.esriInfoPath}/iteminfo.xml`,
                            (error) => {
                                if (error) reject(error);
                                resolve(paths);
                            });
                });
    });
}

export function writeJson(minzoom, maxzoom, bounds, paths) {
    const jsonPath = path.resolve(templatePath, 'templateMapServer.json');
    const mercatorBounds = boundsToMercator(bounds);
    return new Promise((resolve, reject) => {
        jsonfile.readFile(jsonPath, (err, file) => {
            if (err) reject(err);
            const obj = file;
            obj.contents.fullExtent.xmin = mercatorBounds[0];
            obj.contents.fullExtent.ymin = mercatorBounds[1];
            obj.contents.fullExtent.xmax = mercatorBounds[2];
            obj.contents.fullExtent.ymax = mercatorBounds[3];

            obj.contents.initialExtent.xmin = mercatorBounds[0];
            obj.contents.initialExtent.ymin = mercatorBounds[1];
            obj.contents.initialExtent.xmax = mercatorBounds[2];
            obj.contents.initialExtent.ymax = mercatorBounds[3];

            const minLod = obj.contents.tileInfo
                .lods.find(lod => lod.level === minzoom);
            obj.contents.minScale = minLod.scale;

            const maxLod = obj.contents.tileInfo
                .lods.find(lod => lod.level === maxzoom);
            obj.contents.maxScale = maxLod.scale;

            jsonfile.writeFile(`${paths.serviceDescPath}/mapserver.json`, obj,
                               (error) => {
                                   if (error) reject(error);
                                   resolve(paths);
                               });
        });
    });
}

export function writeLyrFile(paths) {
    const lyrFilePath = path.resolve(paths.layerPath, '..', 'Layers.lyr');
    const layerTemplatePath = path.resolve(templatePath,
                                              'templateLayers.lyr');
    return new Promise((resolve, reject) => {
        fs.copy(layerTemplatePath, lyrFilePath, null, (err) => {
            if (err) reject(err);
            resolve(paths);
        });
    });
}

export function ziptpk(layerPath) {
    const tmpDirectory = path.resolve(layerPath, '..', '..', '..');
    const name = path.resolve(layerPath, '..', '..');
    const zipFile = path.resolve(tmpDirectory, `${name}.tpk`);
    const output = fs.createWriteStream(zipFile);
    // 0 compression works with ArcGIS online but not Collector
    //const archive = archiver('zip', { store: true });
    const archive = archiver('zip');
    return new Promise((resolve, reject) => {
        archive.on('error', (err) => {
            reject(err);
        });
        archive.pipe(output);
        archive.directory(name, '');
        archive.finalize();
        output.on('close', () => {
            resolve(zipFile);
        });
    });
}

export function generateDirectories(directory) {
    const layerPath = path.resolve(directory, 'v101', 'Layers');
    const serviceDescPath = path.resolve(directory, 'servicedescriptions',
                                         'mapserver');
    const esriInfoPath = path.resolve(directory, 'esriinfo');
    const paths = { layerPath, serviceDescPath, esriInfoPath };
    return new Promise((resolve, reject) => {
        mkdirp(layerPath, (layerPathErr) => {
            if (layerPathErr) reject(layerPathErr);
            mkdirp(serviceDescPath, (serviceDescPathError) => {
                if (serviceDescPathError) reject(serviceDescPathError);
                mkdirp(esriInfoPath, (esriInfoPathError) => {
                    if (esriInfoPathError) reject(esriInfoPathError);
                    resolve(paths);
                });
            });
        });
    });
}

export function deleteTempDirectory(directory, zipFile) {
    return new Promise((resolve, reject) => {
        fs.remove(directory, null, (err) => {
            if (err) reject(err);
            resolve(zipFile);
        });
    });
}

export function copyTiles(bounds, minzoom, maxzoom, service, token, format, layerPath) {
    // Register sources with tilelive
    // Will fail on http without retry true.
    tileliveHttp(tilelive, { retry: true });
    tileliveArcGIS.registerProtocols(tilelive);

    const options = {
        type: 'scanline',
        close: 'true',
        timeout: 100000000,
        bounds,
        minzoom,
        maxzoom
    };
    const httpTemplate = `http://api.tiles.mapbox.com/v4/${service}/{z}/{x}/{y}.${format}?access_token=${token}`;
    const arcgisTemplate = `arcgis://${layerPath}`;
    return new Promise((resolve, reject) => {
        tilelive.copy(httpTemplate, arcgisTemplate, options, (err) => {
            if (err) reject(err);
            resolve(layerPath);
        });
    });
}

export function xyz2tpk(bounds, minzoom, maxzoom, service, token, directory, callback) {
    const format = 'jpg90';
    generateDirectories(directory)
        .then(writeLyrFile)
        .then(writeConf.bind(null, minzoom, maxzoom, format))
        .then(writeItemInfo)
        .then(writeJson.bind(null, minzoom, maxzoom, bounds))
        .then(writeBounds.bind(null, bounds))
        .then(copyTiles.bind(null, bounds, minzoom, maxzoom, service, token, format))
        .then(ziptpk)
        .then(zipFile => callback(null, zipFile))
        .catch(callback);
}

