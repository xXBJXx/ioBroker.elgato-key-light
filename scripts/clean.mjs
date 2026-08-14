import { rm } from 'node:fs/promises';

const paths = ['build', '.test-build', 'admin/admin-assets', 'admin/tab-assets', 'admin/index.html'];

await Promise.all(paths.map(path => rm(path, { force: true, recursive: true })));
