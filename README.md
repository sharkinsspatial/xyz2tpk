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

### `xyz2tpk(bounds, minzoom, maxzoom, token, directory, callback)`

* `bounds` {Number} bounds in the form `[w, s, e, n]` in WGS84.
* `minzoom` {Number} minimum zoom.
* `maxzoom` {Number} maximum zoom.
* `token` {String} valid access token for the specified x/y/z tile service.
* `directory` {String} output directory path for the tpk, should be unique.
* `callback` {Function} callback function after .tpk is zipped.

