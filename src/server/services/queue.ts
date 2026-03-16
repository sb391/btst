export interface JobQueue {
  enqueue<T>(name: string, task: () => Promise<T>): Promise<T>;
}

export class InlineJobQueue implements JobQueue {
  async enqueue<T>(_name: string, task: () => Promise<T>) {
    return task();
  }
}

export const jobQueue = new InlineJobQueue();
