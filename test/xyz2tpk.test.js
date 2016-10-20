import test from 'tape';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import xmldom from 'xmldom';
import { writeBounds, writeConf } from '../src/xyz2tpk';
import box from './testBox';

const DOMParser = xmldom.DOMParser;
const testtemp = path.join(__dirname, '/testtmp');

test('setup', (t) => {
    fs.mkdirSync(testtemp);
    t.end();
});

test('writeBounds', (t) => {
    const xmin = '-13042564.791842049';
    const ymin = '3856936.010241706';
    const xmax = '-13040959.614248065';
    const ymax = '3858273.658236698';

    t.plan(4);
    writeBounds(box, testtemp, () => {
        const confPath = path.join(testtemp, 'Conf.cdi');
        fs.readFile(confPath, (readErr, data) => {
            const doc = new DOMParser().parseFromString(data.toString('utf-8'));
            t.equals(doc.getElementsByTagName('XMin')[0].textContent, xmin);
            t.equals(doc.getElementsByTagName('YMin')[0].textContent, ymin);
            t.equals(doc.getElementsByTagName('XMax')[0].textContent, xmax);
            t.equals(doc.getElementsByTagName('YMax')[0].textContent, ymax);
            rimraf(testtemp, () => {
            });
        });
    });
});

test('writeConf', (t) => {
    t.plan(1);
    const minzoom = 2;
    const maxzoom = 4;
    writeConf(minzoom, maxzoom, null, testtemp, () => {
        const confPath = path.join(testtemp, 'Conf.xml');
        fs.readFile(confPath, (readErr, data) => {
            const doc = new DOMParser().parseFromString(data.toString('utf-8'));
            const levelids = doc.getElementsByTagName('LevelID');
            t.equals(levelids.length, 3);
        });
    });
});

test('teardown', (t) => {
    rimraf(testtemp, () => {
        t.end();
    });
});
