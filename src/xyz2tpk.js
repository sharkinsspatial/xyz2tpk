import fs from 'fs';
import path from 'path';
import xmldom from 'xmldom';
import Sphericalmercator from 'sphericalmercator';
import tilelive from 'tilelive';
import tileliveArcGIS from 'tilelive-arcgis';
import tileliveHttp from 'tilelive-http';
import zipFolder from 'zip-folder';

const DOMParser = xmldom.DOMParser;

export function writeConf(minzoom, maxzoom, extension, directory, callback) {
    const confPath = path.resolve(__dirname, '..', 'templateConf.xml');
    fs.readFile(confPath, (err, data) => {
        if (err) callback(err);
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
        fs.writeFile(`${directory}/conf.xml`, doc, (error) => {
            if (error) callback(error);
            callback(null);
        });
    });
}

export function writeBounds(bounds, directory, callback) {
    const confPath = path.resolve(__dirname, '..', 'templateConf.cdi');
    fs.readFile(confPath, (err, data) => {
        if (err) callback(err);
        const sphericalmercator = new Sphericalmercator();
        const mercatorBounds = sphericalmercator.convert(bounds, '900913');
        const doc = new DOMParser().parseFromString(data.toString('utf-8'));
        doc.getElementsByTagName('XMin')[0].textContent = mercatorBounds[0];
        doc.getElementsByTagName('YMin')[0].textContent = mercatorBounds[1];
        doc.getElementsByTagName('XMax')[0].textContent = mercatorBounds[2];
        doc.getElementsByTagName('YMax')[0].textContent = mercatorBounds[3];

        fs.writeFile(`${directory}/conf.cdi`, doc, (error) => {
            if (error) callback(error);
            callback(null);
        });
    });
}

export function xyz2tpk(bounds, minzoom, maxzoom, directory, token, callback) {
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
    const arcgisTemplate = `arcgis://${directory}`;
    const copy = () => {
        tilelive.copy(httpTemplate, arcgisTemplate, options, (err) => {
            if (err) callback(err);
            writeBounds(bounds, directory, callback);
        });
    };
    writeConf(minzoom, maxzoom, extension, directory, copy);
}

export function ziptpk(directory, callback) {
    const tmpDirectory = path.resolve(directory, '..');
    const name = path.basename(directory);
    const zipFile = path.resolve(tmpDirectory, `${name}.tpk`);
    zipFolder(directory, zipFile, (err) => {
        if (err) callback(err);
        callback();
    });
}
