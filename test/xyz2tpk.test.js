import test from 'tape';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import xmldom from 'xmldom';
import mkdirp from 'mkdirp';
import { writeBounds, writeConf, ziptpk, generateDirectories, writeJson,
    writeItemInfo }
    from '../src/xyz2tpk';
import box from './testBox';

const DOMParser = xmldom.DOMParser;
const tpkName = 'tpk';
const tpkpath = path.join(__dirname, '/testtmp', tpkName, 'v101', 'Layers');
const serviceDescPath = path.join(__dirname, '/testtmp', tpkName,
                                  'servicedescriptions', 'mapserver');
const esriInfoPath = path.join(__dirname, '/testtmp', tpkName, 'esriinfo');
const testtmp = path.join(__dirname, '/testtmp');

test('generateDirectories', (t) => {
    t.plan(2);
    const outPath = path.resolve(testtmp, tpkName);
    generateDirectories(outPath).then(() => {
        fs.stat(tpkpath, (err) => {
            t.error(err);
        });
        fs.stat(serviceDescPath, (err) => {
            t.error(err);
        });
    });
});

test('setup', (t) => {
    mkdirp.sync(tpkpath);
    mkdirp.sync(serviceDescPath);
    mkdirp.sync(esriInfoPath);
    t.end();
});

test('writeConf', (t) => {
    t.plan(1);
    const minzoom = 2;
    const maxzoom = 4;
    const paths = { layerPath: tpkpath };
    writeConf(minzoom, maxzoom, paths).then(() => {
        const confPath = path.join(tpkpath, 'Conf.xml');
        fs.readFile(confPath, (readErr, data) => {
            const doc = new DOMParser().parseFromString(data.toString('utf-8'));
            const levelids = doc.getElementsByTagName('LevelID');
            t.equals(levelids.length, 3);
        });
    });
});

test('writeJson', (t) => {
    t.plan(1);
    const minzoom = 2;
    const maxzoom = 4;
    const paths = { serviceDescPath };
    writeJson(minzoom, maxzoom, box, paths).then(() => {
        t.ok(true);
    });
});

test('writeBounds', (t) => {
    const xmin = '-13042564.791842049';
    const ymin = '3856936.010241706';
    const xmax = '-13040959.614248065';
    const ymax = '3858273.658236698';
    const paths = { layerPath: tpkpath };

    t.plan(4);
    writeBounds(box, paths).then(() => {
        const confPath = path.join(tpkpath, 'Conf.cdi');
        fs.readFile(confPath, (readErr, data) => {
            const doc = new DOMParser().parseFromString(data.toString('utf-8'));
            t.equals(doc.getElementsByTagName('XMin')[0].textContent, xmin);
            t.equals(doc.getElementsByTagName('YMin')[0].textContent, ymin);
            t.equals(doc.getElementsByTagName('XMax')[0].textContent, xmax);
            t.equals(doc.getElementsByTagName('YMax')[0].textContent, ymax);
        });
    });
});

test('writeItemInfo', (t) => {
    t.plan(2);
    const paths = { esriInfoPath };
    const item = path.resolve(esriInfoPath, 'item.pkinfo');
    const iteminfo = path.resolve(esriInfoPath, 'iteminfo.xml');
    writeItemInfo(paths).then(() => {
        fs.stat(item, (err) => {
            t.error(err);
            fs.stat(iteminfo, (error) => {
                t.error(error);
            });
        });
    });
});

test('ziptpk', (t) => {
    t.plan(1);
    const tpkfile = path.resolve(testtmp, tpkName);
    ziptpk(tpkpath).then(() => {
        fs.stat(tpkfile, (err) => {
            t.error(err);
        });
    });
});

test.onFinish(() => {
    rimraf(testtmp, () => {
    });
});
