const { ObjectId } = require('mongodb');

function toObjectId(id) {
  if (!id || !ObjectId.isValid(id)) {
    return null;
  }
  return new ObjectId(id);
}

module.exports = { toObjectId };
