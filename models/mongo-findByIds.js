export default function findByIds(collection, ids) {
  return collection.find({ _id: { $in: ids } })
    .toArray()
    .then((docs) => {
      const idMap = {};
      docs.forEach((d) => { idMap[d._id] = d; });
      return ids.map(id => idMap[id]);
    });
}
