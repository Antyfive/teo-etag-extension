/**
 * Etag extenstion
 */

'use strict';

const etag = require('etag');
// fixes safari maxage=0, because we need to set 304 if it was not modified
const jumanji = require('jumanji');
const fresh = require('fresh');

function isFresh(req, res) {
  return fresh(req.headers, {
    'etag': res.getHeader('ETag'),
    'last-modified': res.getHeader('Last-Modified')
  })
}

module.exports = {
  extension(app) {
      app.middleware(function* (next) {
        let end = this.res.end;
        let writeHead = this.res.writeHead,
            code,
            headersObj = {};

        this.res.writeHead = (_code, _headersObj) => {
            code = _code;
            headersObj = _headersObj;
        };
        // support jumanji
        this.req.get = (headerName) => {
          return this.req.headers[headerName];
        };

        this.res.end = (body, encoding) => {
          this.res.setHeader('ETag', etag(body, { weak: true }));
          // headersObj['ETag'] = etag(body, { weak: true });
          // check if etag still matches
          if (isFresh(this.req, this.res)) {
             // client has a fresh copy of resource
            code = 304;
            if (code && headersObj) {
              writeHead.call(this.res, code, headersObj);
            }
            end.call(this.res, '', encoding);
          }
          // stale, should send new body
          else {
            if (code && headersObj) {
              writeHead.call(this.res, code, headersObj);
            }
            end.call(this.res, body, encoding);
          }
        };

        yield function(callback) {
          jumanji(this.req, this.res, callback);
        }.bind(this);

        yield next;
      });
  }
};
