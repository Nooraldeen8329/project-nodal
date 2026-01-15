import Dexie from 'dexie';

export const db = new Dexie('StickyNoteChatBotDB_v2');

db.version(1).stores({
    workspaces: 'id, name, createdAt' // canvas content is stored in the object
});
