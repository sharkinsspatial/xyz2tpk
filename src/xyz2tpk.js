import fs from 'fs';
import path from 'path';
import xmldom from 'xmldom';
import Sphericalmercator from 'sphericalmercator';
import tilelive from 'tilelive';
import tileliveArcGIS from 'tilelive-arcgis';
import tileliveHttp from 'tilelive-http';
import archiver from 'archiver';
import mkdirp from 'mkdirp';

const DOMParser = xmldom.DOMParser;

export function writeConf(minzoom, maxzoom, paths) {
    const confPath = path.resolve(__dirname, '..', 'templateConf.xml');
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
            fs.writeFile(`${paths.layerPath}/Conf.xml`, doc, (error) => {
                if (error) reject(error);
                resolve(paths);
            });
        });
    });
}

export function writeBounds(bounds, paths) {
    const confPath = path.resolve(__dirname, '..', 'templateConf.cdi');
    return new Promise((resolve, reject) => {
        fs.readFile(confPath, (err, data) => {
            if (err) reject(err);
            const sphericalmercator = new Sphericalmercator();
            const mercatorBounds = sphericalmercator.convert(bounds, '900913');
            const doc = new DOMParser().parseFromString(data.toString('utf-8'));
            doc.getElementsByTagName('XMin')[0].textContent = mercatorBounds[0];
            doc.getElementsByTagName('YMin')[0].textContent = mercatorBounds[1];
            doc.getElementsByTagName('XMax')[0].textContent = mercatorBounds[2];
            doc.getElementsByTagName('YMax')[0].textContent = mercatorBounds[3];
            fs.writeFile(`${paths.layerPath}/Conf.cdi`, doc, (error) => {
                if (error) reject(error);
                resolve(paths.layerPath);
            });
        });
    });
}

export function ziptpk(layerPath) {
    const tmpDirectory = path.resolve(layerPath, '..', '..', '..');
    const name = path.resolve(layerPath, '..', '..');
    const zipFile = path.resolve(tmpDirectory, `${name}.tpk`);
    const output = fs.createWriteStream(zipFile);
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
    const paths = { layerPath, serviceDescPath };
    return new Promise((resolve, reject) => {
        mkdirp(layerPath, (layerPathErr) => {
            if (layerPathErr) reject(layerPathErr);
            mkdirp(serviceDescPath, (serviceDescPathError) => {
                if (serviceDescPathError) reject(serviceDescPathError);
                resolve(paths);
            });
        });
    });
}
export function copyTiles(bounds, minzoom, maxzoom, token, layerPath) {
    // Register sources with tilelive
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

    const extension = 'png';
    const httpTemplate = `http://api.tiles.mapbox.com/v4/digitalglobe.nal0g75k/{z}/{x}/{y}.${extension}?access_token=${token}`;
    const arcgisTemplate = `arcgis://${layerPath}`;
    return new Promise((resolve, reject) => {
        tilelive.copy(httpTemplate, arcgisTemplate, options, (err) => {
            if (err) reject(err);
            resolve(layerPath);
        });
    });
}

export function xyz2tpk(bounds, minzoom, maxzoom, token, directory, callback) {
    generateDirectories(directory)
        .then(writeConf.bind(null, minzoom, maxzoom))
        .then(writeBounds.bind(null, bounds))
        .then(copyTiles.bind(null, bounds, minzoom, maxzoom, token))
        .then(ziptpk)
        .then(() => callback())
        .catch(callback);
}

