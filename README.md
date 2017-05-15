# xyz2tpk
Convert tiles from an HTTP x,y,z tile endpoint into the ESRI .tpk format.

## Install

```bash
npm install
```
To build distribution version.
```bash
npm run build
```
To run tests
```bash
npm test
```
## Usage

### `xyz2tpk(bounds, minzoom, maxzoom, url, format, directory, callback)`

* `bounds` {Number} bounds in the form `[w, s, e, n]` in WGS84.
* `minzoom` {Number} minimum zoom.
* `maxzoom` {Number} maximum zoom.
* `url` {String} url for the http source for the tiles.  Should include token.
* `format` {String} image format for the tiles requested from the http source.
* `directory` {String} output directory path for the tpk, should be unique.
* `callback` {Function} callback function after .tpk is zipped.

