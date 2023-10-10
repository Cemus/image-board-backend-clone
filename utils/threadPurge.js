import { Thread } from "../models/threadModel.js";

const threadPurge = async () => {
  const maxThreads = 16;
  const allThreads = await Thread.find({}).sort({ bumpDate: 1 });

  if (allThreads.length > maxThreads) {
    const threadsToDelete = allThreads.slice(0, allThreads.length - maxThreads);

    const deletedThreads = await Thread.deleteMany({
      _id: { $in: threadsToDelete.map((thread) => thread._id) },
    });

    console.log(`${deletedThreads.deletedCount} threads supprimés.`);
  }
};

export default threadPurge;
