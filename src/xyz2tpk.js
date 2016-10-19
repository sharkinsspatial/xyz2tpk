import fs from 'fs';
import xmldom from 'xmldom';
import Sphericalmercator from 'sphericalmercator';

const DOMParser = xmldom.DOMParser;
const sphericalmercator = new Sphericalmercator();

export function xyz2tpk(bounds, minzoom, maxzoom, name) {
}
export function writeConf(minzoom, maxzoom, extension, directory, callback) {
    fs.readFile('./templateConf.xml', (err, data) => {
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
        fs.writeFile(`${directory}/Conf.cdi`, doc, (error) => {
            if (error) callback(error);
            callback(null);
        });
    });
}

export function writeBounds(bounds, directory, callback) {
    fs.readFile('./templateConf.cdi', (err, data) => {
        const mercatorBounds = sphericalmercator.convert(bounds, '900913');
        const doc = new DOMParser().parseFromString(data.toString('utf-8'));
        doc.getElementsByTagName('XMin')[0].textContent = mercatorBounds[0];
        doc.getElementsByTagName('YMin')[0].textContent = mercatorBounds[1];
        doc.getElementsByTagName('XMax')[0].textContent = mercatorBounds[2];
        doc.getElementsByTagName('YMax')[0].textContent = mercatorBounds[3];

        fs.writeFile(`${directory}/Conf.cdi`, doc, (error) => {
            if (error) callback(error);
            callback(null);
        });
    });
}

