import { Thread } from "../models/threadModel.js";

const threadPurge = async () => {
  const maxThreads = 16;
  const allThreads = await Thread.find({}).sort({ bumpDate: 1 });
  while (allThreads.length > maxThreads) {
    await Thread.findByIdAndDelete(allThreads[0]._id);
  }
};

export default threadPurge;
