
/*!
 * Module dependencies.
 */

var DocoomentArray = require('./array')
  , utils = require('../utils')
  , util = require('util')
  , Document = require('../document')

/**
 * DocumentArray constructor
 *
 * @param {Array} values
 * @param {String} path the path to this array
 * @param {Document} doc parent document
 * @api private
 * @return {DocoomentDocumentArray}
 * @inherits DocoomentArray
 * @see http://bit.ly/f6CnZU
 */

function DocoomentDocumentArray (values, path, doc) {
  var arr = [];

  // Values always have to be passed to the constructor to initialize, since
  // otherwise DocoomentArray#push will mark the array as modified to the parent.
  arr.push.apply(arr, values);
  arr.__proto__ = DocoomentDocumentArray.prototype;

  arr._atomics = {};
  arr.validators = [];
  arr._path = path;

  if (doc) {
    arr._parent = doc;
    arr._schema = doc.schema.path(path);
    arr._handlers = {
      isNew: arr.notify('isNew'),
      save: arr.notify('save')
    }
    doc.on('save', arr._handlers.save);
    doc.on('isNew', arr._handlers.isNew);
  }

  return arr;
};

/*!
 * Inherits from DocoomentArray
 */

DocoomentDocumentArray.prototype.__proto__ = DocoomentArray.prototype;

/**
 * Overrides DocoomentArray#cast
 *
 * @api private
 */

DocoomentDocumentArray.prototype._cast = function (value) {
  if (value instanceof this._schema.casterConstructor) {
    if (!(value.__parent && value.__parentArray)) {
      // value may have been created using array.create()
      value.__parent = this._parent;
      value.__parentArray = this;
    }
    return value;
  }

  // handle cast('string') etc.
  // only objects are permitted so we can safely assume that
  // non-objects are to be interpreted as _id
  if (Buffer.isBuffer(value) || !utils.isObject(value)) {
    value = { id: value };
  }

  return new this._schema.casterConstructor(value, this);
};

/**
 * Searches array items for the first document with a matching _id.
 *
 * ####Example:
 *
 *     var embeddedDoc = m.array.id(some_id);
 *
 * @return {EmbeddedDocument|null} the subdocuent or null if not found.
 * @param {String|Number|Buffer} id
 * @TODO cast to the _id based on schema for proper comparison
 * @api public
 */

DocoomentDocumentArray.prototype.id = function (id) {
  var casted = id
    , sid
    , _id

  for (var i = 0, l = this.length; i < l; i++) {
    _id = this[i].get('id');

    if (_id instanceof Document) {
      sid || (sid = String(id));
      if (sid == _id.id) return this[i];
    } else if (casted == _id) {
      return this[i];
    }
  }

  return null;
};

/**
 * Returns a native js Array of plain js objects
 *
 * ####NOTE:
 *
 * _Each sub-document is converted to a plain object by calling its `#toObject` method._
 *
 * @param {Object} [options] optional options to pass to each documents `toObject` method call during conversion
 * @return {Array}
 * @api public
 */

DocoomentDocumentArray.prototype.toObject = function (options) {
  return this.map(function (doc) {
    return doc && doc.toObject(options) || null;
  });
};

/**
 * Helper for console.log
 *
 * @api public
 */

DocoomentDocumentArray.prototype.inspect = function () {
  return '[' + this.map(function (doc) {
    if (doc) {
      return doc.inspect
        ? doc.inspect()
        : util.inspect(doc)
    }
    return 'null'
  }).join('\n') + ']';
};

/**
 * Creates a subdocument casted to this schema.
 *
 * This is the same subdocument constructor used for casting.
 *
 * @param {Object} obj the value to cast to this arrays SubDocument schema
 * @api public
 */

DocoomentDocumentArray.prototype.create = function (obj) {
  return new this._schema.casterConstructor(obj);
}

/**
 * Creates a fn that notifies all child docs of `event`.
 *
 * @param {String} event
 * @return {Function}
 * @api private
 */

DocoomentDocumentArray.prototype.notify = function notify (event) {
  var self = this;
  return function notify (val) {
    var i = self.length;
    while (i--) {
      if (!self[i]) continue;
      switch(event) {
        // only swap for save event for now, we may change this to all event types later
        case 'save':
          val = self[i];
          break;
        default:
          // NO-OP
          break;
      }
      self[i].emit(event, val);
    }
  }
}

/*!
 * Module exports.
 */

module.exports = DocoomentDocumentArray;
