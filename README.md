# OnCheckIn websocket server with YJS

```
npm run start
```

Starting the default script will run the [y-websocket](https://github.com/yjs/y-websocket) server with persistence. A parallel service will backup every document to JSON, retaining the single latest version for each day in which there were document changes.

This runs on [Glitch](https://glitch.com/). As such, all private data files are stored under the `.data` folder.
